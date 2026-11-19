# E – Supporting workflows and data model (read-only audit)

Scope read in full: SST 2, SST 3, SST C, SST D, SST E, SST G, SST L, SST M, SST P, SST R, SST W; skimmed SST T, T2–T7; all 11 data-table schemas; header rows of all 10 tabs of "SST WhatsApp Leads"; sample rows of sst_state, sst_issues, sst_chasers, sst_rr_claims, sst_outbox, sst_documents, sst_seen_messages (unreplied only), sst_quotes (all 11 rows), sst_conversation_log (2 rows); header rows of the Master Index sheet (Index, Confirmed Quotes); a few execution lists. SST 1 was only grepped for how it calls the sub-workflows and writes the shared tables.

Testing switches seen and NOT reported as faults: SST 1 "From the sales team?" forced false and "Send to salesperson" disabled; SST 2 "Prepare WhatsApp for salesperson", "Prepare complaint alert" and "WhatsApp the salesperson (no draft)" have no incoming link, lead emails go to a fixed test address; SST C reminder chain ("Read holidays" … "Find overdue enquiries") has no incoming link; SST L "WhatsApp Aabel (SST W)" disabled; Sales Team tab carries test numbers; SST P and SST M unpublished.

Findings are sorted High → Medium → Low.

---

## High

### E1. The bot webhook accepts any POST: no Meta signature check, and the watchdog relies on that
- Category: Improvement
- Severity: High
- Where: SST G → "Run through the bot again"; SST 1 → "Incoming WhatsApp (POST)"
- Evidence: SST G posts a hand-built payload to `https://sstcwa.app.n8n.cloud/webhook/sst-bot` with no auth header (`entry:[{id:'watchdog', …}]`, `from: g.phone`). The SST 1 webhook node has `{"httpMethod":"POST","path":"sst-bot","options":{"noResponseBody":true…}}`, no authentication, and a grep of SST 1 for `signature` / `x-hub` finds nothing.
- Impact: anyone who learns the URL can inject a message "from" any number. Once the sales gate is restored, a forged message from a Sales Team number runs SST 3 commands (approve, won/lost, stop, pause) and a forged customer message creates leads, consumes Claude tokens and round-robin turns.
- Proposed fix: in SST 1 verify `X-Hub-Signature-256` against the app secret on every POST; let the watchdog call SST 1 through an internal path instead (Execute Workflow, or a second webhook path protected by header auth) rather than the public Meta path.
- Risk of the fix: needs the raw body for the HMAC; the watchdog must be changed in the same release or its retries will be rejected. Does not touch a testing switch.
- Confidence: Confirmed (no check found by search of SST 1; SST 1 internals belong to another reviewer, please cross-check)

### E2. Watchdog runs hourly 08:00–17:00 only, but its own text promises "4 minutes" / "within a few minutes"
- Category: Inconsistency
- Severity: High
- Where: SST G → "Every hour, 08:00-17:00", "Find stuck customers", "Send back through the AI", "Still no reply after retries"; SST L → "Decide whose log" (HOW texts); SST E → "Issue: a step failed"
- Evidence: cron `0 8-17 * * *`; comment "A customer message with no reply 4 minutes after it arrived means a step failed"; SST L: "the bot tries again by itself within a few minutes"; SST E: "The watchdog makes sure the customer still gets a reply". Real run in sst_seen_messages: original 2026-11-18 10:19 UTC → `retry1:` 11:00 → `retry2:` 12:00 → holding reply and issue #18 at 13:00.
- Impact: a customer whose message hit a failure waits up to 1 hour for the first retry and about 3 hours for the holding reply; anything failing after 17:00 Oman time (or after the 17:00 run) is not retried until 08:00 next day. The bot answers customers 24/7 but is only protected 10 hours a day. Staff reading the Issues Log are told it is handled "within a few minutes". SST G has 587 executions since 16 Nov, so the schedule was clearly far more frequent before and the wording was not updated.
- Proposed fix: decide the real target. Either restore a short interval (e.g. every 5 minutes, 24/7, which is cheap because the first node is a filtered data-table read) or keep hourly and correct the three texts and the sticky note. A middle course: every 10 minutes and allow retry 1 and retry 2 in consecutive runs.
- Risk of the fix: more executions on the n8n plan; shorter interval raises the double-reply risk in E12 unless that is fixed too. No testing switch involved.
- Confidence: Confirmed

### E3. Quotation edits beyond the template limits are silently dropped from the PDF
- Category: Improvement
- Severity: High
- Where: SST 3 → "Build edit request", "Turn edit into template fields"; SST 2 → "Build pricing request", "Turn draft into template fields"; SST R template
- Evidence: SST 2 prompt states "LAYOUT LIMITS: up to 4 groups … each with up to 6 lines … up to 8 items in each list". SST 3 edit prompt has no such limit ("You may change anything in the JSON: lines, amounts, basis, groups…", "a new '# section' is a new group"). Both mappers do `(q.groups || []).slice(0, 4)` and `(g.lines || []).slice(0, 6)`; `TERMS … slice(0, 16)`, `not_included … slice(0, 10)`, `PROCEDURE/DOCUMENTS … slice(0, 8)`.
- Impact: a salesperson adds a 7th line to a section or a 5th section (easy with the copy-and-edit charges list). Claude includes it in `quote_json` and in the recalculated total, the charges list shows it, but the rendered PDF omits the line. The customer receives a quotation whose lines do not add up to the total. Nobody is warned.
- Proposed fix: in "Turn edit into template fields" detect overflow (groups > 4, any group lines > 6, lists over their limits) and treat it as a refusal with a clear message ("a section can hold 6 lines; please merge two lines"), and add the same LAYOUT LIMITS sentence to the SST 3 system prompt. Also align the list limits (prompt says 8; code allows 16 terms and 10 exclusions).
- Risk of the fix: some edits that "worked" (with a silently wrong PDF) will now be refused. No testing switch involved.
- Confidence: Confirmed (by reading; not reproduced)

---

## Medium

### E4. SST W sends only the short template to a salesperson who is inside the 24-hour window; the full text is neither sent nor held
- Category: Inconsistency
- Severity: Medium
- Where: SST W → "No template for this message?", "Also send full details?", "Hold full details?", "Log team conversation", sticky note
- Evidence: sticky: "If the salesperson messaged the bot in the last 24 hours: normal message (+ PDF). Otherwise: the approved template". Actual routing: any item with `template_name` goes to the template branch regardless of `in_window`. Free text follows only when `in_window && template_with_pdf`; "Hold full details?" needs `in_window !== true`. The log node writes `how: 'Normal WhatsApp message'` and the full `free_text` whenever `in_window` is true.
- Impact: for every template without a PDF (sst_enquiry_reminder, sst_enquiry_escalation, sst_manager_attention, sst_complaint_alert, sst_lead_no_quote, sst_quote_followup*, sst_daily_digest, sst_weekly_report) an active salesperson gets only the template parameters. The morning digest lists, the complaint summary beyond 700 characters, customer file links and "what to do" text are lost, while the Internal team conversation tab records that the full message was sent.
- Proposed fix: after "Choose channel", route `in_window === true` straight to "PDF to send?" → normal message (as the sticky describes) and use the template only when out of window; or keep the template and add `in_window && !template_with_pdf && free_text` to the "Also send full details?" condition. Fix the `how` expression to say what was really sent.
- Risk of the fix: inside the window two messages may arrive (template + text) if the second option is chosen. Sales side is currently switched off for testing; this is the logic that will run when it is switched on.
- Confidence: Confirmed

### E5. SST D has no error workflow and is called without waiting, so a document that fails to save is invisible
- Category: Improvement
- Severity: Medium
- Where: SST D → workflow settings; SST 1 → "Save customer file", "Name the documents folder"
- Evidence: SST D settings are `{"executionOrder":"v1","availableInMCP":true}` (no `errorWorkflow`, no `timezone`); every other production workflow except SST L and SST E has `"errorWorkflow":"W3TFvtQPxamDCu0q"`. SST 1 calls it with `"waitForSubWorkflow": false` and `onError: continueRegularOutput`. Inside SST D only "Run folder steps" has retries; "List folders", "New ids", "Get file link", "Download file", "Upload file", "Name and file it" have none.
- Impact: a Drive or WhatsApp media hiccup stops the run; no email, no Issues Log entry, no retry. The customer's folder then lacks the file and the Leads `documents_folder` link may be missing.
- Proposed fix: set `errorWorkflow` = SST E and `timezone` = Asia/Muscat on SST D; add `retryOnFail` (3 tries) to the Drive and Graph calls. Also set the error workflow on SST L (it is called without a parent error path from SST 1).
- Risk of the fix: more error emails during testing. No testing switch involved.
- Confidence: Confirmed

### E6. SST D folder logic: files can be skipped silently, large files fail, and one message can be saved twice
- Category: Improvement
- Severity: Medium
- Where: SST D → "Plan folders", "List again", "Choose folder", "Save a file?", "Upload file", "Name and file it", "Record file"
- Evidence: (a) the folder is created, then found again by a Drive search on `appProperties` ("List again"); if the search does not yet return the new folder, `folderId = ''` and "Save a file?" (needs `folder_id` not empty) goes to the false branch with no error. (b) upload uses `uploadType=media` (Drive's simple upload, documented for files up to 5 MB) into My Drive root, then a second call moves it (`addParents=…&removeParents=root`). (c) "Record file" inserts by `message_id` with no prior "already saved?" check. (d) customer folder name is fixed at creation: `clean((chat.name || S.name || 'Customer')) + ' - +' + phone`. (e) file stamp uses `Date.now() + 4 * 3600000` while every other node uses `setZone('Asia/Muscat')`.
- Impact: (a) a file is dropped with a green execution; (b) large scans/PDFs may be rejected, and a failure between upload and move leaves an orphan file in the root of My Drive; (c) a redelivered webhook or a watchdog replay stores the same file again; (d) folders stay named "Customer - +968…" when the first file arrives before the name is known.
- Proposed fix: use the ids already generated in "New ids" directly (`folder_id = custId/enq id` computed in "Plan folders") instead of re-searching; upload with `uploadType=multipart` or resumable and `parents:[folder_id]` in one call; add a "row exists in sst_documents for message_id" guard before "Get file link"; rename the customer folder in the `rename` action when the name is known.
- Risk of the fix: the duplicate-tidy step still needs the second listing; keep it but do not depend on it for the folder id. No testing switch involved.
- Confidence: (a) Likely, (b) Needs checking for the size limit, (c)(d)(e) Confirmed

### E7. Every customer file is downloaded and stored twice, in two different Drive structures
- Category: Redundancy
- Severity: Medium
- Where: SST 1 → "Get file link" / "Download file" / "Save to Customer files"; SST 1 → "Save customer file" → SST D "Get file link" / "Download file" / "Upload file"
- Evidence: SST 1 uploads to folder "Customer files (bot)" (`1NwnCkLsTr0-i-2BkPkkfXA5hQCAcXHlr`) named `phone + ' ' + yyyy-MM-dd HHmm + ' ' + name`; SST D uploads the same media to `ROOT 1gPLrtgk0fsi-iDjsH2xY1DyM0_dN0MLX / <customer> / <reference>` named `yyyy-MM-dd HH-mm - <caption>.<ext>`. The Leads row then carries both `files_received` (" – " + file_links from the first copy) and `documents_folder` (second copy).
- Impact: two Graph media downloads and two Drive uploads per file, two places for staff to look, two naming schemes, and the lead email/WhatsApp lists both.
- Proposed fix: keep SST D as the single store; have SST 1's reading path reuse the binary it already downloaded (pass it to SST D, or let SST D return the link) and drop "Save to Customer files"; build `file_links` from sst_documents.
- Risk of the fix: Claude's file-reading path in SST 1 depends on the first download; change only the storage step. Coordinate with the SST 1 reviewer.
- Confidence: Confirmed

### E8. Status of an enquiry is kept in two places that drift: Leads tab and sst_quotes
- Category: Inconsistency
- Severity: Medium
- Where: SST 3 → "Update lead status", "Close the quote", "Save new version", "Mark quote approved", "Set quote stopped or back", "Decide", "Pick reference"; SST 2 → "Pick salesperson", "Record complaint reference", "Record enquiry without draft"; SST P → "Work out pipeline"
- Evidence: Leads `status` values written: New, Cancelled, Contacted, Quoted, Won, Lost, Approved (plus `job_status` Ongoing/Completed and a separate `stopped` text column). sst_quotes `status` values written: Draft, Support, Manual, Approved, Quoted, Won, Lost, Ongoing, Completed, Stopped. Specific drifts: (1) "contacted" sets Leads = Contacted (even over Approved/Quoted/Won) but never touches sst_quotes; (2) an edit after approval inserts a new row with `status: 'Draft'`, and the pipeline uses the most recently updated row, so the item returns to "Open enquiries" while Leads still says Approved; (3) "Decide" uses the highest-version row for "already approved" and "details" but the latest-updated row for Stopped; (4) Ongoing/Completed live in `status` in the table and in `job_status` on the sheet; (5) Stopped is a status in the table but only a note on the sheet (sample row SST-261116-H3Q9: Leads status "New", `stopped` = "Stopped 2026-11-16 16:55 by Russel"); (6) SST P weekly report tests Leads status against `['New','Manual','']`, but "Manual" is never a Leads status.
- Impact: the sheet (and the dashboard that reads it) and the WhatsApp lists/digests disagree about where an enquiry stands; win-rate and response-time figures depend on which store a node happened to read.
- Proposed fix: make sst_quotes the single status of record with one status per reference (a small `sst_status` table keyed by reference, or always update all rows and copy the status into a new version row instead of 'Draft'); write the same value to Leads in one shared "set status" step; stop "contacted" from overwriting a later stage (only set it when the current status is New).
- Risk of the fix: list/digest grouping in SST 3 and SST P reads `latest.status`; change both together. No testing switch involved.
- Confidence: Confirmed

### E9. Manager cases, callbacks, cancellations and "priced manually" enquiries never leave "Open enquiries"
- Category: Improvement
- Severity: Medium
- Where: SST 3 → "Pick reference" (`stageOf`), "Pipeline stage change?"; SST P → "Work out pipeline" (`stageOf`)
- Evidence: `stageOf` maps anything that is not Stopped/Approved/Quoted/Won/Ongoing/Completed/Lost to `'open'`. Rows are created with `status: 'Support'` (complaints, escalations, callbacks, cancellations) or `'Manual'`. "Pipeline stage change?" updates sst_quotes only for Won, Lost, Quoted, Ongoing, Completed, so "contacted" (the only command suggested for a case) changes nothing in the table.
- Impact: a handled complaint or a cancellation record stays in the salesperson's open list and in every morning digest until someone marks it won/lost/stop, which makes no sense for a complaint. Open counts in the weekly report are inflated.
- Proposed fix: add a "Closed"/"Handled" stage: let `contacted` (or a new `closed` command) on a Support row set sst_quotes status to Closed, and map Closed (and Cancelled) to a non-open stage in both `stageOf` copies.
- Risk of the fix: the 24h quiet window and response-time metric use "contacted"; keep those writes. No testing switch involved.
- Confidence: Confirmed

### E10. "stop" and "pause" act on the customer's phone, not on the enquiry
- Category: Improvement
- Severity: Medium
- Where: SST 3 → "Decide", "Pause or resume bot", "Set quote stopped or back"
- Evidence: reply text: "SST-… is stopped … the bot will not reply to <customer>"; node "Pause or resume bot" updates sst_chats `paused` with filter `phone = customer_phone`. "restart" sets `paused` false unconditionally.
- Impact: stopping or pausing one enquiry silences the bot for everything that customer writes, including a new enquiry. Restarting one enquiry un-pauses the customer even if another salesperson paused them for a different enquiry.
- Proposed fix: store the pause against the reference (e.g. `paused_refs` on the chat row, or a status on sst_quotes) and have SST 1 stay silent only when the conversation is about that reference; at minimum make the reply text say that the whole chat is paused.
- Risk of the fix: touches the pause check in SST 1. Sales side is currently off for testing.
- Confidence: Confirmed

### E11. Quotation date and validity are silently reset by every edit
- Category: Inconsistency
- Severity: Medium
- Where: SST 2 → "Build pricing request", "Turn draft into template fields", "Prepare charges list"; SST 3 → "Turn edit into template fields"
- Evidence: SST 2 puts `VALID_UNTIL: req.valid_until` in the PDF fields only; the saved `quote_json` has no `valid_until` (all 5 drafted rows in sst_quotes: none). SST 3 uses `VALID_UNTIL: q.valid_until || v.toFormat(…)` where `v` = today + 7 business days, and `DATE: now`. SST 2's charges list adds `valid_until` from the request, SST 3's list prints it only `if (q.valid_until)`.
- Impact: a typo fix made five days later moves the quotation date and extends validity by five days without anyone asking; v1's list shows "Valid until", later lists may not. The 7-business-day count skips Fri/Sat but ignores the Holidays tab.
- Proposed fix: save `valid_until` and `date` into `quote_json` in SST 2 ("Turn draft into template fields": `q.valid_until = req.valid_until; q.date = req.date`) and in SST 3 reuse them unless the instruction changes the validity.
- Risk of the fix: none for existing drafts (fallback stays). No testing switch involved.
- Confidence: Confirmed

### E12. Watchdog can answer a message the bot deliberately did not answer, or one that is still being processed
- Category: Improvement
- Severity: Medium
- Where: SST G → "Load unanswered messages", "Find stuck customers", "Mark as taken over", "Still no reply after retries"
- Evidence: selection is `tracked = true, replied = false, held = false`, age 4 min–24 h. Rows from 2026-11-18: text "Sstbot rerun" (a testing code that wipes the chat and sends nothing) was replayed as `retry1:` and `retry2:` (wiping the chat twice more) and ended with the holding reply plus issue #18 "Bot could not reply after automatic retries".
- Impact: any SST 1 path that ends without setting `replied` (intentional silence, blocked number, quiet window, paused chat) is treated as a failure: the message is replayed twice and the customer is then told "A member of our sales team will get back to you shortly", with an alert to the manager. A slow run (Claude retries, file reading) that is still in progress at the top of the hour is also replayed, giving two answers. Media messages are replayed as plain text.
- Proposed fix: in SST 1 mark `replied` (or `tracked = false`) on every deliberate no-reply path; in SST G skip messages whose chat `last_message_at`/a "processing" flag shows a run in progress, or raise the age threshold above the longest possible SST 1 run; do not replay messages whose text is a testing code.
- Risk of the fix: fewer rescues if a path is wrongly marked. Coordinate with the SST 1 reviewer.
- Confidence: Confirmed for the test code; Likely for the other paths (not traced in SST 1)

### E13. Round-robin: turns are burned by failures and retries, and the `order` column it sorts by does not exist
- Category: Improvement
- Severity: Medium
- Where: SST 2 → "Take a turn", "Pick salesperson"; sst_rr_claims; sst_state `rr_pointer`; Sales Team tab
- Evidence: turn = id of a new sst_rr_claims row; person = `(turn - 1 + pointer) % pool.length`. "Take a turn" has `retryOnFail: true` (a retried insert can create two rows) and runs before "Add to Leads sheet". sst_rr_claims has 12 rows, but SST-261117-AUFB, -J5MH and -BVDV (ids 5, 6, 8) have no sst_quotes row. Pool is sorted with `Number(a.order) - Number(b.order)`; the Sales Team header row is `[" ", "name", "whatsapp", "email", "role", "active", "takes_new_leads", "notes"]` (first header is a space, there is no `order`). `rr_next` is computed and never stored; `rr_pointer` = "2", last updated 2026-11-16.
- Impact: any failed or repeated handover skips a salesperson; a replayed confirmation for the same reference takes a second turn and can assign the same reference to someone else (no "reference already claimed" check). Changing `takes_new_leads` for one person re-maps every later turn. The sort is a no-op (NaN), so the order is simply the sheet row order, which works only by accident. Callbacks also consume a turn.
- Proposed fix: before "Take a turn", look up sst_rr_claims by reference and reuse the existing id; name the first Sales Team column `order` (or sort by row position explicitly); remove `rr_next`; remove `retryOnFail` from the insert or make it an upsert on reference.
- Risk of the fix: renaming the header changes the key n8n returns for that column (currently " "); nothing else reads it. No testing switch involved.
- Confidence: Confirmed

### E14. Issues log: the de-duplication row is written before the sheet row, and repeat alerts on the same day are suppressed
- Category: Improvement
- Severity: Medium
- Where: SST L → "Not logged today?", "Give it a number", "Add to Issues Log tab", "Alert Aabel now?"
- Evidence: key = `[issue, phone digits, ref, day].join('|')`; "Give it a number" inserts into sst_issues, then "Add to Issues Log tab" appends (retry, no onError), then the alert. SST L has no `errorWorkflow`.
- Impact: if the sheet append fails, the key already exists, so the issue is never written to the tab and never alerted, and later identical issues that day are dropped too. A second "Bot could not reply after automatic retries" for the same customer on the same day produces no second alert. For "System step failed: <workflow>" the key has no phone or reference, so only the first failure of each workflow per day is logged.
- Proposed fix: append to the sheet first and insert the sst_issues row last (or delete the row on failure); exclude `alert`-level issues from same-day de-duplication, or key them by message id; add the error workflow to SST L.
- Risk of the fix: the issue number comes from the sst_issues row id, so the order change needs a two-step (insert, append, and on append failure mark the row for retry). No testing switch involved.
- Confidence: Confirmed

### E15. Sheets formatting mode differs between nodes: phone numbers lose "+", dates are re-formatted, and free text can be read as a formula
- Category: Inconsistency
- Severity: Medium
- Where: SST 2 → "Add to Quotes sheet"; SST 3 → "Add version to Quotes sheet", "Add to Confirmed Quotes", "Mark lead Approved" (all `cellFormat: USER_ENTERED`); all other sheet writes use `RAW`
- Evidence: Confirmed Quotes tab: mobile shows `[number ending 3824]` although `lead.mobile` is `[number ending 3824]`; `confirmed_at` shows both "2026-10-27 16:42" and "2026-10-28 9:48". `change_request` = the salesperson's raw instruction and `line_items` = Claude text are written with USER_ENTERED.
- Impact: phone format differs between tabs (Leads "+968…", Confirmed Quotes "968…"); timestamps become real dates whose display depends on the sheet locale, so string parsers such as SST C's strict `yyyy-MM-dd HH:mm` would fail on them; an instruction beginning with "=", "+" or "-" becomes a formula or `#NAME?`.
- Proposed fix: switch these four nodes to `RAW` (as everywhere else). If numeric totals are wanted as numbers, write them with `Number(...)` under RAW.
- Risk of the fix: a dashboard that relies on `created_at` in Quotes being a true date would need a `DATEVALUE`. No testing switch involved.
- Confidence: Confirmed

### E16. Approved bot quotations are filed in the Master Index with the customer's free-text service, so they barely match later enquiries
- Category: Inconsistency
- Severity: Medium
- Where: SST 3 → "Add to Master Index", "Add to Confirmed Quotes"; SST 2 → "Find similar quotes"; SST M → "Build classify request"
- Evidence: SST 3 writes `service: lead.service` (e.g. "Air freight", "Land freight (UAE to Oman)", "Sea freight – FCL"). "Find similar quotes" gives `+10` only when `r.service === svc`, where `svc` is one of the fixed categories ("Sea FCL Export", "Air Freight", "Transit / Cross-border", …) used by the existing Index rows and by SST M. Threshold is `score >= 10`.
- Impact: the quotes the team has just approved through the bot, which are the best pricing evidence, usually miss the 10-point service match and are found only if origin, destination and recency happen to reach 10. `file_name` is "REF - Person.pdf", so no route words help either.
- Proposed fix: in SST 2 keep the detected category (`ctx.svc`) in `lead_json` and write that to the Index `service` column on approval; or run the same `detect()` in SST 3 before the append.
- Risk of the fix: none for existing rows. No testing switch involved.
- Confidence: Confirmed

### E17. If the Google Sheet is unavailable, the lead handover and every sales message stop
- Category: Improvement
- Severity: Medium
- Where: SST 2 → "Read sales team", "Add to Leads sheet"; SST W → "Read sales team"; SST C → "Read sales team"; SST L → "Add to Issues Log tab"
- Evidence: these nodes have `retryOnFail` but no `onError`; SST 2 writes sst_quotes only at the very end ("Save quote v1" / "Record enquiry without draft"). SST 1 calls SST 2 with `waitForSubWorkflow: false`.
- Impact: during a Sheets outage or quota error the customer has already been told the enquiry is confirmed, but SST 2 dies at the first sheet node: no Leads row, no sst_quotes row, no salesperson alert; a round-robin turn may already be taken. The enquiry survives only inside sst_chats.lead_json. SST W cannot send anything (it reads the tab on every call). The only trace is the SST E email.
- Proposed fix: write the sst_quotes row (status "Manual", version 0) immediately after "Pick salesperson" and before any sheet call, then update it; keep the Sales Team list in a data table (refreshed from the tab) so SST W/SST 2 do not depend on Sheets at send time; give "Add to Leads sheet" `onError: continueRegularOutput` plus an Issues Log entry so the rest of the handover still runs.
- Risk of the fix: a lead could exist in the table but not on the Leads tab; needs a "re-sync missing Leads rows" step. No testing switch involved.
- Confidence: Confirmed by reading (not reproduced)

### E18. Go-live: reminders promise a "morning brief" that comes from an unpublished workflow, and 6 of the 10 WhatsApp templates have no definition in the instance
- Category: Improvement
- Severity: Medium
- Where: SST C → "Prepare nudge", "Prepare escalation", "Email Aabel", sticky; SST P (unpublished); SST W → "Send template"; SST T7 → "Build template payloads"
- Evidence: SST C texts: "No further reminders will be sent. If it is still untouched tomorrow, it will be in your morning brief." SST P `active: false`. Template names used by callers: sst_new_enquiry, sst_lead_no_quote, sst_complaint_alert, sst_manager_attention, sst_enquiry_reminder, sst_enquiry_escalation, sst_quote_followup, sst_quote_followup_manager, sst_daily_digest, sst_weekly_report (all sent as `en_GB`). T7 now only defines the last four. If a template is refused, SST W falls back to a normal message, which WhatsApp rejects outside the 24h window; that node has `onError: continueRegularOutput`, so nothing is raised.
- Impact: when the sales side is switched on without SST P, an untouched enquiry gets two reminders and then nothing, ever. If any template is unapproved or has a different parameter count, the salesperson receives nothing until they next message the bot (the text sits in sst_outbox and expires after 3 days), and no issue is logged.
- Proposed fix: add to the go-live checklist: publish SST P (and SST M if the nightly index is wanted); verify all 10 templates are approved with the parameter counts the callers send; in SST W, when "Template accepted?" is false and `in_window` is false, call SST L with level alert instead of trying a normal message.
- Risk of the fix: none; these are go-live steps. SST P being unpublished is itself a testing choice; only the dependency is reported.
- Confidence: Confirmed for the dependency; template approval state not checked (T8 belongs to another reviewer)

### E19. Two hourly schedules run 20 mostly empty executions a day and read whole tables
- Category: Token/usage
- Severity: Medium
- Where: SST C → "Every hour, 08:00-17:00", "Read chats"; SST G → "Every hour, 08:00-17:00", "Load chats"; SST 3 → "Load my enquiries", "Load latest quote"; SST P → "Read Leads", "Read quotes"
- Evidence: both crons are `0 8-17 * * *`, every day including Friday and Saturday; recent runs of each last about 2 seconds (nothing to do). SST C "Read chats" is `returnAll` with no filter (each row carries `history` and `lead_json`). SST G "Load chats" reads every chat only to get `language`. SST 3 reads all of sst_quotes ("Load my enquiries", rows of 6–9 KB each) on every salesperson message and then reads the same table again by reference. sst_seen_messages rows older than 24 h that stay `replied = false` are returned to SST G every hour forever.
- Impact: about 600 scheduled executions a month that do nothing, plus table reads that grow with every customer and every quote version. The 08:00 run is before opening (08:30), so for reminders it is always a no-op, and nothing runs between 17:00 and closing at 17:30.
- Proposed fix: one scheduler workflow that runs the watchdog check first and the unfinished-enquiry check second; filter "Read chats" on `stage in (collecting, awaiting_confirmation)` and `nudged_at` empty; in SST G load only the chats for the stuck phones; in SST 3 drop "Load latest quote" (the rows are already in "Load my enquiries") or read only the needed columns; add `createdAt > now-24h` to "Load unanswered messages"; move the reminder cron to `30 8-17 * * 0-4` when the reminder branch is reconnected.
- Risk of the fix: merging schedules couples two functions; keep them as separate branches. The reminder branch is currently cut for testing.
- Confidence: Confirmed

### E20. Test data sits in the stores the live bot learns and reports from
- Category: Improvement
- Severity: Medium
- Where: Master Index → Confirmed Quotes, Index; sst_quotes, sst_chats, sst_issues, sst_chasers, sst_rr_claims, Leads, Unfinished, Issues Log
- Evidence: Confirmed Quotes rows SST-261027-TST3 ("Vishnu (test)", total 38.85), SST-261027-CUQ6 (total 0), SST-261028-PJWG; sst_issues row `placeholder-1` "Reserved: test issue #1 in the old Issues Log"; Unfinished and sst_documents rows for 99999… numbers; all 11 sst_quotes references are tests.
- Impact: if the matching test PDFs are also on the Index tab as "Quotation" rows, SST 2 can pick them as "past quotes" and Claude will price real enquiries from made-up amounts. Weekly figures, lists and round-robin position start from test history.
- Proposed fix: before go-live, remove test rows from Index and Confirmed Quotes and move the test PDFs out of SST CLAUDE; clear or archive the data tables; set `rr_pointer` so turn 1 lands on the intended person.
- Risk of the fix: manual clean-up; export first.
- Confidence: Confirmed for Confirmed Quotes and the tables; Needs checking for the Index tab (only its first 3 rows were read)

---

## Low

### E21. SST E reads the Sales Team tab and never uses it; its sticky note and wording describe behaviour it does not have
- Category: Redundancy
- Severity: Low
- Where: SST E → "Read sales team", "Email the error", sticky, "Issue: a step failed"
- Evidence: sticky: "an email goes to [email] and to the Manager on the Sales Team tab". `sendTo` is the fixed address only; nothing references the "Read sales team" output. Issue text: "The watchdog makes sure the customer still gets a reply"; SST L HOW: "The customer has already been handled by the watchdog."
- Impact: a needless Sheets call on every failure; the manager is not emailed; for failures in SST 2, SST 3, SST D or SST R the watchdog does nothing (it only replays unanswered customer messages), so the reassurance is wrong exactly when a lead may be stuck. There is also no throttle: a burst of failures sends one email each.
- Proposed fix: either add the manager's address (`sendTo` built from the tab) or delete the read node and fix the sticky; make the issue text depend on the failing workflow ("lead handover failed: check SST-… was assigned").
- Risk of the fix: none.
- Confidence: Confirmed

### E22. The same code blocks are copied between workflows
- Category: Redundancy
- Severity: Low
- Where: see evidence
- Evidence: (1) `hoursFor` / `at` / `bizMinutes` office-hours maths: SST C "Find overdue enquiries", SST P "Work out pipeline", SST P "Add untouched enquiries to briefs" (three copies, office hours `08:30`–`17:30` and weekend `[5, 6]` hard-coded in each). (2) Template field mapping (the whole `f = { TITLE … }` block and the group loop): SST 2 "Turn draft into template fields" and SST 3 "Turn edit into template fields". (3) `sheetText` charges list: SST 2 "Prepare charges list" and SST 3 "Charges list for new version". (4) `parseJson`: SST 2, SST 3, SST M. (5) `stageOf`: SST 3 "Pick reference" and SST P. (6) "+7 business days" loop: SST 2 "Build pricing request" and SST 3. (7) manager lookup `role === 'Manager' || name === 'aabel'`: SST 2, C, L, P (twice), W. (8) "untouched enquiry" test: SST C and SST P. (9) lead summary lines: SST 2 "Prepare WhatsApp for salesperson", "Prepare lead without draft", two Gmail nodes, SST 3 "Decide". (10) "Log team conversation" node in SST W and SST 3 (and SST 1); SST 3's version repeats a 7-branch expression twice in one node.
- Impact: a change to office hours, the template, or the pipeline stages must be made in 2–4 places; they have already diverged (E8, E11, E26).
- Proposed fix: move office hours and the manager lookup to sst_state / one small sub-workflow; move the template mapping and charges list into SST R (pass `quote` + `lead`, let SST R build `fields` and return the list text).
- Risk of the fix: SST R is used by SST 2, SST 3 and T3; change its input contract in one release.
- Confidence: Confirmed

### E23. The Sales Team tab is read several times for one event
- Category: Token/usage
- Severity: Low
- Where: SST 1 "Read sales team"; SST 2 "Read sales team"; SST W "Read sales team" (every call); SST L "Read sales team" / "Read sales team (list)"; SST E; SST C; SST P
- Evidence: one confirmed enquiry: SST 1 (1) + SST 2 (1) + SST W for the lead (1) + SST W for the charges list (1) = 4 reads of the same 5-row tab; SST C calls SST W in `mode: each`, so one more read per reminder.
- Impact: avoidable Sheets quota use and latency; each read is also a point of failure (E17).
- Proposed fix: pass the already-resolved recipient (`to`, `name`, `role`) and the manager number into SST W/SST L from the caller, or cache the tab in a data table.
- Risk of the fix: SST W's safety rule "only send to numbers on the Sales Team tab" must be kept (check against the cached list).
- Confidence: Confirmed

### E24. The same facts are stored in two or three places with no single owner
- Category: Redundancy
- Severity: Low
- Where: data model
- Evidence: (1) conversation log: Conversations tab and sst_conversation_log (the table has one extra column, `source`; node note: "Backup copy of the Conversations tab row"); nothing reads the table. (2) issues: sst_issues (key, owner, level, issue) and Issues Log tab (13 columns); resolution exists only on the tab, level is `alert`/`minor` in the table and "Aabel alerted"/"Minor" on the tab (written as "Aabel alerted" even while the alert node is disabled or the manager has no number). (3) quotes: sst_quotes and Quotes tab; the tab has `rate_basis`, `match_count`, `pdf_link` that SST 3's new-version rows never fill. (4) lead details: Leads row, sst_chats.lead_json, and a full copy in sst_quotes.lead_json on every version row (about 1.5–2.5 KB each); "details" and the Master Index use the table copy, so a correction typed into the Leads tab is never seen by the bot. (5) reminder stage: sst_chasers and (for quote chasers) sst_pipeline_log.chase_level. (6) documents folder: Leads `documents_folder`, sst_documents.folder_link, Drive appProperties.
- Impact: staff edits on the sheet do not reach the bot; the stores disagree after partial failures; storage grows on every version.
- Proposed fix: declare the data tables the system of record and the sheet a read-only mirror (say so on the tab), or the reverse for fields staff are meant to edit; stop copying `lead_json` into later version rows (read it from version 1/0).
- Risk of the fix: the dashboard reads the sheet; keep the mirror complete.
- Confidence: Confirmed

### E25. IDs are hard-coded in many nodes while one of them is also kept in sst_state
- Category: Inconsistency
- Severity: Low
- Where: all workflows
- Evidence: sst_state holds only `template_doc_id`, `rr_pointer` and `sales_last_in_<number>`. Hard-coded elsewhere: WhatsApp phone id `1451398948053197` (SST 3 ×8 nodes, SST W ×5, SST C, SST G ×2 plus `display_phone_number: '[number ending 9545]'`, SST T, T4); Leads sheet id (every sheet node); Master Index sheet id (SST 2, 3, M, T2); SST CLAUDE folder `1TP5Nrfm…` (SST 3, SST M, T2); "Quote drafts (bot)" folder `1_xAMVrR…` (SST R); documents root `1gPLrtgk…` (SST D, twice); "Customer files (bot)" `1NwnCkLs…` (SST 1); the template doc id again in T2; webhook URL in SST G; error-alert address in SST E.
- Impact: changing the number, the sheet or a folder means editing dozens of nodes; the single state-driven id gives a false impression that configuration is central.
- Proposed fix: either put all of them in sst_state (one "Load settings" read per workflow) or accept hard-coding and remove `template_doc_id` from sst_state for consistency. At minimum list them in one sticky note.
- Risk of the fix: an extra data-table read per run if centralised.
- Confidence: Confirmed

### E26. Timestamp formats and time zones differ between columns
- Category: Inconsistency
- Severity: Low
- Where: data model
- Evidence: Leads and Quotes: `yyyy-MM-dd HH:mm` Oman time (strings, except E15). Conversations, Internal team conversation, sst_documents.saved_at, sst_conversation_log.timestamp: `yyyy-MM-dd HH:mm:ss` Oman. sst_chasers.last_chased_at: `yyyy-MM-dd HH:mm`. sst_chats (`nudged_at`, `contacted_at`, `first_message_at`), sst_state `sales_last_in_*`, sst_pipeline_log.at: ISO with `+04:00`. sst_seen_messages.sent_at: ISO in UTC (`…Z`). Unfinished tab mixes both in one row: `started_at` "2026-11-17T09:05:29.216+04:00", `last_message_at` "2026-11-17 09:05". SST C and SST P "Add untouched…" parse `alerted_at` with the single strict format `yyyy-MM-dd HH:mm`; SST P "Work out pipeline" has a tolerant `pd()` with six formats.
- Impact: a hand-edited or re-formatted `alerted_at` cell makes the enquiry invisible to reminders with no error; the Unfinished tab is hard to sort.
- Proposed fix: one helper format for sheets (`yyyy-MM-dd HH:mm`) and ISO for tables; format `started_at` in "Find unfinished enquiries"; use the tolerant `pd()` in SST C.
- Risk of the fix: none.
- Confidence: Confirmed

### E27. Phone number formats
- Category: Inconsistency
- Severity: Low
- Where: data model
- Evidence: tables use digits only (sst_chats.phone, sst_quotes.customer_phone/salesperson_phone, sst_documents.phone, sst_outbox.to, sst_seen_messages.phone, sst_state key suffix); sheets use "+digits" (Leads.mobile, Conversations.mobile, Unfinished.mobile, Issues Log.mobile, Internal team conversation.whatsapp). Exceptions: Sales Team.whatsapp is digits without "+"; Confirmed Quotes.mobile lost its "+" (E15); sst_conversation_log.mobile has "+" although it is a table; sst_quotes.lead_json carries both `mobile` ("+…") and `phone` (digits). Every reader normalises with `replace(/[^0-9]/g, '')`, so matching works.
- Impact: cosmetic today; joins done by hand or in the dashboard between Leads and Confirmed Quotes fail.
- Proposed fix: fix E15; document the rule "tables = digits, sheets = +digits".
- Risk of the fix: none.
- Confidence: Confirmed

### E28. `active` on the Sales Team tab is interpreted three different ways
- Category: Inconsistency
- Severity: Low
- Where: SST 2 "Pick salesperson"; SST W "Choose channel"; SST P; SST C "Find overdue enquiries"; SST L "Decide whose log"
- Evidence: SST 2: `String(r.active || '').toUpperCase() === 'Y'` (blank = inactive). SST W: `String(r.active || '').toUpperCase() !== 'N'` and SST P `String(r.active || 'Y')… !== 'N'` (blank = active). SST C and SST L do not look at `active` at all.
- Impact: a row with a blank `active` cell gets no leads but still gets digests; an inactive manager is still chosen by SST C/SST L.
- Proposed fix: one rule everywhere (`=== 'Y'`).
- Risk of the fix: none with the current tab (all "Y").
- Confidence: Confirmed

### E29. Holidays and office-hours parsing is fragile
- Category: Improvement
- Severity: Low
- Where: SST C "Find overdue enquiries"; SST P "Work out pipeline", "Add untouched enquiries to briefs"
- Evidence: column keys are the full header texts `'date (YYYY-MM-DD)'` and `'special_hours (e.g. 09:00-14:00, blank = closed)'`; special hours are parsed with `sp.split('-')` then `parts[1].trim()`; dates are compared as `String(...).slice(0, 10) === ds`. The tab currently has two rows (2026-11-25 and 2026-11-26, "National Day holiday").
- Impact: rewording a header silently turns every holiday into a working day; a value such as "closed" or "9:00 to 14:00" throws and stops the whole reminder run; a date cell shown as 25/11/2026 never matches.
- Proposed fix: read the columns by position (first and third) or rename the headers to `date` and `special_hours` with the hint in a note; guard the split (`if (parts.length !== 2) return null`); add data validation on the tab. Ask the business to confirm the 2026–2027 holiday list before go-live.
- Risk of the fix: the SST 1 holiday reader (other reviewer) uses the same headers; change together.
- Confidence: Confirmed

### E30. Unfinished-enquiry follow-up details
- Category: Improvement
- Severity: Low
- Where: SST C → "Find unfinished enquiries", "Follow up with customer", "Mark followed up", "Log on Unfinished tab", sticky
- Evidence: code comment and check: "between 08:00 and 21:00 Oman time" (`now.hour >= 21`), but the trigger only fires 08:00–17:00. "Mark followed up" runs in parallel with the send, which has `onError: continueRegularOutput`. `new_history` is built from the history read at the start and written back. `first_message_at` is logged raw.
- Impact: the 21:00 limit is dead code; a failed send is still recorded as nudged (the customer never gets the one follow-up); a customer message arriving in the same seconds can be overwritten in `history`; test numbers (99999…) are followed up and logged.
- Proposed fix: chain "Mark followed up" after a successful send; append to history only if `last_message_at` is unchanged; skip `phone.startsWith('99999')`; remove or align the 21:00 check.
- Risk of the fix: none.
- Confidence: Confirmed

### E31. Approve path: the salesperson is told the PDF is saved before it is, and approving twice duplicates everything
- Category: Improvement
- Severity: Low
- Where: SST 3 → "Export final PDF", "Send final PDF", "Save to SST CLAUDE", "Add to Confirmed Quotes", "Add to Master Index"
- Evidence: "Send final PDF" and "Save to SST CLAUDE" are parallel branches; the caption says 'Saved to SST CLAUDE as "…pdf"'. For an already approved quote: `reply = ref + ' was already approved; saving the latest version again.'` and the same chain runs again (same file name, new Drive file, new Confirmed Quotes row, new Index row). The four nodes after the save are `onError: continueRegularOutput`.
- Impact: a failed save still produces the "saved" message; repeated approvals leave duplicate PDFs and rows (the Index de-duplicates by `quote_ref` when matching, Confirmed Quotes does not).
- Proposed fix: send the final PDF after "Mark quote approved"; on re-approval update the existing Drive file and rows (match on reference + version) instead of appending.
- Risk of the fix: slightly later confirmation message.
- Confidence: Confirmed

### E32. SST R: every version leaves a Google Doc behind, and retries at two levels can create duplicates
- Category: Improvement
- Severity: Low
- Where: SST R → "Copy template" (`maxTries: 4`); SST 2 "Render quotation PDF" and SST 3 "Render new version" (`retryOnFail`, `maxTries: 2`)
- Evidence: each call copies the template into "Quote drafts (bot)" as "<ref> v<n> (draft)"; nothing deletes or reuses older drafts; a failure after the copy makes the caller run the whole sub-workflow again, giving a second doc with the same name. The salesperson email links to the Doc (`doc_link`), which is owned by the bot's Google account.
- Impact: the drafts folder grows by one Doc per version and per failed attempt; whether salespeople can open the "Editable draft" link depends on how that folder is shared.
- Proposed fix: remove the caller-level retry (SST R nodes already retry); trash superseded drafts when a new version is saved or when the quote is approved; confirm the folder is shared with the sales team.
- Risk of the fix: "pdf" for an older version would no longer work if drafts are trashed; keep the latest only.
- Confidence: Confirmed for the mechanics; Needs checking for folder sharing

### E33. SST 2 picks the documents folder by phone only
- Category: Improvement
- Severity: Low
- Where: SST 2 → "Find documents folder"; SST D → "Plan folders" (`ref = S.reference || chat.reference`)
- Evidence: "Find documents folder" reads sst_documents with `phone = …`, `limit: 1`, no sort and no reference filter; SST 1 sends `reference: ''` with `action: 'save'`, so SST D falls back to the chat's stored reference.
- Impact: for a returning customer the Leads row and the lead message can show the folder of an earlier enquiry, and new files may be filed under the previous reference until the new one is confirmed.
- Proposed fix: filter on `reference` empty/pending or take the newest row (`sortBy createdAt desc`); have SST D ignore `chat.reference` when the chat stage is "collecting".
- Risk of the fix: depends on when SST 1 clears `reference` on the chat row.
- Confidence: Needs checking (depends on SST 1 behaviour not traced here)

### E34. Cancelling marks the customer's "previous reference" as Lost without checking what it is
- Category: Improvement
- Severity: Low
- Where: SST 2 → "Cancels a confirmed enquiry?", "Mark old enquiry Lost (Leads)", "Mark old enquiry Lost (quotes)"
- Evidence: condition `kind === 'cancellation' && Boolean(lead.previous_reference)`; then Leads `status: 'Lost'` and all sst_quotes rows of that reference `status: 'Lost'`. The same field feeds `returning_customer: 'Y (' + previous_reference + ')'`.
- Impact: if `previous_reference` is simply the customer's last enquiry (for example a job already Won or Ongoing), a cancellation of something else closes the wrong record; `prev_status` is not saved, so it cannot be restored with "restart".
- Proposed fix: only mark Lost when the referenced enquiry's current stage is open or awaiting; otherwise raise an issue for the manager.
- Risk of the fix: none.
- Confidence: Needs checking (meaning of `previous_reference` at cancellation is set in SST 1)

### E35. Claude calls in SST 2, SST 3 and SST M
- Category: Token/usage
- Severity: Low
- Where: SST 2 → "Build pricing request", "Claude drafts the quote"; SST 3 → "Build edit request", "Claude applies the change"; SST M → "Build classify request"
- Evidence: builders set `max_tokens: 6000`, the HTTP nodes override it with `Object.assign({}, $json.body, { max_tokens: 16000 })`. Timeout 180 s with `maxTries: 3`. No `cache_control` on the system blocks. SST 3 sends the whole quotation JSON and asks for the whole JSON back for every one-line change. SST M uses the same large model (`claude-sonnet-5-5`) to classify file names, up to 25 calls a night with an identical system prompt.
- Impact: two places to change one limit; a small edit costs a full quotation of output tokens; classification could run on a smaller model.
- Proposed fix: set the limit once in the builder; for SST M use a small model and mark the system prompt cacheable; optionally let SST 3 return a list of changes for simple edits.
- Risk of the fix: lower limits can truncate long quotations; keep 16000 if drafts approach it.
- Confidence: Confirmed

### E36. Small inconsistencies in SST 2 / SST 3 values
- Category: Inconsistency
- Severity: Low
- Where: SST 2 "Pick salesperson", "Turn draft into template fields"; SST 3 "Turn edit into template fields", "Update lead status", "Read command"
- Evidence: signature name special-cased: `p.salesperson === 'Aabel' ? 'Aabel Joseph' : p.salesperson` (others sign with a first name only); job title derived from role in SST 2 but defaulted to "Sales & Operations" in SST 3; "Update lead status" writes `job_status: ''`, `job_status_updated_at: ''` and `lost_reason` on every status change (a "contacted" after "lost" would send an empty reason); help text names staff ("open-Ron / awaiting-Ginu / jobs-Russel"); the example reference in help is `SST-261020-AB12`; node names "Email Aabel", "Time to tell Aabel? (5h)", "Issue for Aabel".
- Impact: letterhead signature differs by person; a staff change needs code edits; status fields can be blanked.
- Proposed fix: add `full_name` and `title` columns to the Sales Team tab and use them; write only the columns that change in "Update lead status"; build the help examples from the team list.
- Risk of the fix: new tab columns must be filled before use.
- Confidence: Confirmed (whether empty strings overwrite cells in this node version: Needs checking)

### E37. Sticky notes and comments that no longer match the workflow
- Category: Inconsistency
- Severity: Low
- Where: SST 3, SST W, SST E, SST G, SST L, SST T7, SST T2, SST 2
- Evidence: SST 3 sticky: "'list' shows open enquiries" and "The enquiry stays in their open list until they send quoted, won or lost" (list now shows open, awaiting and jobs; approve moves it to Awaiting; stop/restart, ongoing/completed, colleague lists and the charges-list edit are not mentioned). SST W sticky: "Shared by SST 1, SST 2 and SST C" (also SST L and SST P) and the 24h rule (E4); nothing about holding text in sst_outbox or redirecting to the manager. SST E sticky (E21). SST G comment "4 minutes" (E2). SST T7 sticky: "submits the three sales-team templates (sst_new_enquiry with a PDF header, sst_enquiry_reminder, sst_enquiry_escalation)" while the code submits four others and still downloads and uploads a sample PDF that no payload uses. SST T2: node "Read Master Index" reads the Clauses tab; sticky says it checks the "Leads sheet" but reads Sales Team. SST 2 "Pick salesperson" comment says rr_pointer "is now a fixed offset" while still returning `rr_next`.
- Impact: the next person to maintain the bot is misled.
- Proposed fix: update the notes when the fixes above are made.
- Risk of the fix: none.
- Confidence: Confirmed

### E38. Test workflows: obsolete, overlapping, or able to write live data
- Category: Redundancy
- Severity: Low
- Where: SST T, T2, T3, T4, T5, T6, T7
- Evidence: T (send test to a fixed personal number), T2 (Google access) and T6 (Drive download, fixed file id) all check access that the live bot now exercises daily. T5 replays a fixed enquiry (`reference: 'SST-261027-TST3'`) into the real SST 2: it appends to Leads, takes a round-robin turn and inserts into sst_quotes. T4 calls `https://api.facebook.com/…/agent_config/settings` (a different host from every other Graph call) and contains a PUT. T7 submits templates on each run (E37). None has an error workflow; all are unpublished and manual.
- Impact: clutter; an accidental run of T5 or T7 after go-live changes live data or resubmits templates.
- Proposed fix: archive T, T2, T6 and T4; keep T3 (render check); move T5 to a clearly named "writes test data" workflow or point it at a test sheet; fold T7 into the template tool (T8) or archive it.
- Risk of the fix: none (unpublished).
- Confidence: Confirmed

---

## Not covered
- SST 1 internals (chat logic, Claude prompt, form handling) were not reviewed, only grepped for sub-workflow calls, shared table writes and a signature check. E1, E7, E12, E33 and E34 touch SST 1 and should be cross-checked with that reviewer.
- SST F (port search form) and SST T8 were not read.
- Sheet tabs: only header rows and the first 1–3 data rows were read (Sales Team and Holidays in full). Data validation, protected ranges and the Dashboard formulas were not inspected. The Master Index "Clauses" tab and the Index tab beyond its first 3 rows were not read.
- sst_chats, sst_conversation_log and sst_seen_messages were sampled, not read in full.
- WhatsApp template approval status, Drive folder sharing, and the Google Docs template content (placeholders) were not checked.
- No workflow was executed, so findings marked "by reading" were not reproduced.
