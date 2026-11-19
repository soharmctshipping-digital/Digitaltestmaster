# A. SST 1 structure and logic (with SST D and SST G)

Scope read: SST 1 `NTuIx1AbdFxb5chR` (all 100 nodes and all 88 connection rows, published version = draft `1ed21e80…`), SST G `lKX0nZBPSSf6CRus` (12 nodes), SST D `BONxnz7uR0rWlOCw` (20 nodes), data table column lists, header rows of the Holidays / Sales Team / FAQ / Conversations tabs, unreplied rows of `sst_seen_messages`, and executions 1710 and 1751 of SST 1. Read-only; nothing was changed.

Branch order facts used below (n8n execution order v1, confirmed in execution 1710 by `executionIndex`): from "New message only" the order is Remember message id → Show typing → the whole main flow → Customer sent a file? (SST D last). From "AI answered?" the order is Save chat → Real customer number? (the reply) → Log conversation → Reply adjusted? → Backup log → Enquiry confirmed or complaint? (hand-over) → Pass to salesperson?. "One row per message → Mark messages answered" runs after all of those.

## Claude API calls per inbound message (asked for explicitly)

| Situation | Calls |
|---|---|
| Fixed routes (menu, say, voice, reset, ignore, paused/forward, late delivery, promo_blocked) | 0 |
| Message superseded at "Combine messages" or at "Still the newest (early)?" | 0 |
| Normal AI reply | 1 ("Ask Claude", Sonnet) |
| "Ask Claude" HTTP error or 45 s timeout | up to 3 attempts (retry 3, 5 s apart) |
| Answer unusable (error after 3 tries, `stop_reason = max_tokens`, or no `"reply":`) | plus "Ask Claude again" (Haiku), up to 2 attempts. Worst case 5 HTTP attempts in one run, about 4 minutes |
| Customer sends another message while Claude is writing | the finished answer is thrown away at "Still the newest?" and the newer run calls Claude again (1 wasted call per overlap) |
| Both nodes fail | SST G re-posts the message at the next hourly run, up to 2 times, each a full new run (up to 5 attempts each). Worst case 15 attempts for one message |
| "thanks" / "ok" after a confirmed enquiry (not stopped) | 1 call (see A4) even though the code comment says fixed line |

Attached photos/PDFs (base64) are sent again on every one of these attempts.

---

## High

### A1. Testers whose number is on the Sales Team tab get no reply at all
- Category: Inconsistency
- Severity: High
- Where: SST 1 → From the sales team? / Combine messages; SST G
- Evidence: IF is forced `={{ false && $json.is_sales }}` with the note "every number, including staff numbers, is treated as a customer", but Combine messages still has `const mine = $('Who sent it?').all().map(i => i.json).filter(m => !m.is_sales); if (!mine.length) return [];`. Execution 1751: Who sent it? → `is_sales: true, sales_name: "Aabel"`, Combine messages output `[]`. `sst_seen_messages` rows id 211, 220, 221 ("Sstbot rerun", then `retry1:`, `retry2:`) all `replied: false`. The Sales Team tab has the same test number on all four rows.
- Impact: Any message from the Sales Team test number is silently dropped, then SST G retries it twice an hour apart, then sends the "A member of our sales team will get back to you shortly" holding reply and raises an alert. Testing from that phone looks like the bot is broken.
- Proposed fix: In Combine messages change the filter to `const mine = $('Who sent it?').all().map(i => i.json);` while the testing switch is on (restore `!m.is_sales` together with the IF at go-live), or put a number on the Sales Team tab that nobody tests with.
- Risk of the fix: Touches the testing switch; must be reverted in the same step as the IF node at go-live.
- Confidence: Confirmed

### A2. A failed AI answer waits up to an hour, or overnight, for the watchdog
- Category: Improvement
- Severity: High
- Where: SST G → Every hour, 08:00-17:00; SST 1 → Read Claude answer, Issue: AI did not answer, Out of Claude credit?
- Evidence: SST G cron `0 8-17 * * *`. SST 1 comment: "the watchdog (SST G) runs the message through the AI again in a few minutes"; issue text "AI did not answer first time – retrying automatically"; credit alert says "answered by the hourly check". Nothing is sent to the customer on fallback.
- Impact: When Claude fails, the customer hears nothing for up to 60 minutes; after 17:00 Oman time nothing is retried until 08:00 (up to 15 hours), which is exactly when a bot is the only one answering. Three failures in a row mean about 2 to 3 hours before the generic holding reply.
- Proposed fix: Change the SST G trigger to every 5 minutes, all hours (`*/5 * * * *`); the 4-minute age filter in "Find stuck customers" already prevents early retries. Correct the "few minutes" comments if the schedule stays hourly.
- Risk of the fix: More SST G executions (288 a day, each about 2 s and one table read). The alert to the manager could then fire at night; SST L may need a quiet-hours rule.
- Confidence: Confirmed

### A3. The incoming webhook accepts anything; the verify token is in plain text
- Category: Improvement
- Severity: High
- Where: SST 1 → Incoming WhatsApp (POST), Verify token correct?; SST G → Run through the bot again
- Evidence: POST webhook has "No credentials required" and no node checks Meta's `X-Hub-Signature-256` header. The verify token is typed as the right-hand value of the IF node (value not repeated here). SST G itself posts a hand-made payload to `https://sstcwa.app.n8n.cloud/webhook/sst-bot`, which proves forged payloads are processed as real.
- Impact: Anyone who learns the URL can post a fake message "from" any phone: it sends real WhatsApp messages to that number, spends Claude credit, and `Sstbot rerun` deletes that customer's `sst_chats` row (history, reference, lead).
- Proposed fix: Add a Code/Crypto check after the webhook that compares the HMAC-SHA256 of the raw body (app secret from a credential) with `X-Hub-Signature-256`; let SST G pass with its own shared-secret header. Move the verify token to a credential or variable.
- Risk of the fix: Needs the webhook "Raw body" option on; if the HMAC check is wrong every customer message is rejected, so test with the test URL first. SST G must be changed in the same release.
- Confidence: Confirmed (no check exists); exploitability Likely

### A4. "Thanks", a cancel request or "call me" 24 hours after confirmation wipes the confirmed enquiry
- Category: Improvement
- Severity: High
- Where: SST 1 → Build Claude request, Read Claude answer, Save chat
- Evidence: `quickKind === 'thanks'` has no return (`if (quickKind !== 'thanks') return …say…`), and `cancelAsk` / `speakAsk` skip the menu block. All three then reach `if ((['confirmed','support'].indexOf(prevStage) >= 0 && idleHours >= 24) || freshStart) { lead = keep; reference = ''; prevStage = 'new'; … }`. Read Claude answer then builds `'Customer cancelled ' + (reference ? 'enquiry ' + reference : 'their enquiry before confirming it')`. Save chat writes the empty reference and the new stage.
- Impact: A customer who writes "thank you" the next day loses the confirmed state: the next "any update?" is treated as a brand-new chat, not as a follow-up for their salesperson. A cancellation sent a day later is logged as "cancelled before confirming it" with no enquiry reference and no shipment details. "Please call me" a day later opens a new callback case instead of going to the assigned salesperson. Before 24 hours, each "thanks/ok" still costs one Claude call although the comment says such messages get a fixed line.
- Proposed fix: In Build Claude request, (1) return a fixed thank-you line for `quickKind === 'thanks'` (route `say`) instead of falling through; (2) skip the 24-hour reset when `cancelAsk || speakAsk` (change the condition to `(afterConfirm && idleHours >= 24 && !cancelAsk && !speakAsk) || freshStart`).
- Risk of the fix: Low. "Thanks" plus real content on another line is classed `other` and is unaffected.
- Confidence: Confirmed (by reading the code path; not seen in an execution)

## Medium

### A5. If the WhatsApp send fails, the chat is already saved and the hand-over never happens
- Category: Improvement
- Severity: Medium
- Where: SST 1 → AI answered? fan-out; Save chat, Reply on WhatsApp, Enquiry confirmed or complaint?, Hand over to sales
- Evidence: Canvas order (y): Save chat 592, Real customer number? 704, Log conversation 784, Enquiry confirmed or complaint? 992. "Reply on WhatsApp" has `retryOnFail: true` but no `onError`, so a failure stops the run.
- Impact: On the "Yes, confirm" message a send failure leaves `stage = confirmed` and a reference saved, but SST 2 is never called (no lead row, no salesperson) and nothing is logged to Conversations. SST G then re-posts "Yes, confirm", which now meets stage `confirmed` and shows the Follow-up / New enquiry / Complaint menu. The lead is lost.
- Proposed fix: Move "Enquiry confirmed or complaint?" above the reply branch (lower y than 704), or set Reply on WhatsApp to `onError: continueErrorOutput` and wire the error output to "Log issue (SST L)" so the rest of the run completes.
- Risk of the fix: Handing over before the customer sees the confirmation is harmless. With continue-on-error the message stays `replied = false`, so SST G still retries: check that a second run does not hand over twice (it will not: stage is already `confirmed`).
- Confidence: Confirmed (structure); the failure itself was not observed (0 failed executions found)

### A6. A message sent just after the reply can be answered twice; chat state is loaded before the pause
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Load chat, Pause for more messages, Still the newest?, One row per message / Mark messages answered, Combine messages
- Evidence: Combine messages batches every row with `r.processed !== true` from the last 15 minutes. `processed` is set by the last branch of the run: in execution 1710 the reply went out at executionIndex 23 and "Mark messages answered" ran at index 31, about 3 seconds later (after the Google Sheets log). Load chat runs before the 2-second pause, not after it.
- Impact: A customer who answers within those seconds (typically "thanks" right after the confirmation) starts a run whose batch contains the already-answered message again: for example "Yes, confirm\nThanks" at stage `confirmed` → the menu "What can we help you with today?" straight after the confirmation, with "Yes, confirm" stored as held text. Also, a run that loaded the chat row before the earlier run saved it overwrites that run's history.
- Proposed fix: (1) Give "One row per message" a higher canvas position than "AI answered?" on the "Still the newest?" output so messages are marked processed before the reply is sent; do the same on the "Bot paused?" and "Ask what they need?" fan-outs. (2) Move "Pause for more messages → Check for newer messages (early) → Still the newest (early)?" to directly after "Combine messages", before files, Load chat, FAQ and holidays.
- Risk of the fix: (2) changes which node "Still the newest (early)?" returns (`$('Build Claude request')` must become a pass-through of Combine messages). See A7 for the interaction with fallbacks.
- Confidence: Confirmed (ordering and timings); the double answer itself is Likely

### A7. After an AI failure the customer's message drops out of the conversation and is replayed out of order
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Still the newest? → One row per message → Mark messages answered; SST G → Find stuck customers
- Evidence: "Still the newest?" feeds both "AI answered?" and "One row per message", so `processed: true` is written even when `fallback` is true; Save chat is skipped, so the message is not in `history`. SST G later re-posts every `replied = false` row between 4 minutes and 24 hours old.
- Impact: Customer sends the shipment details, the AI call fails, customer sends "hello?" two minutes later: Claude sees only "hello?" (the earlier message is neither in the batch nor in the history). Up to an hour later the watchdog replays the old message and the customer gets a second, out-of-context reply.
- Proposed fix: Route "One row per message" from the true output of "AI answered?" (not from "Still the newest?"), so a failed message stays unprocessed and is batched with the next one; in SST G "Find stuck customers" skip a phone that has any newer row with `replied = true`.
- Risk of the fix: An unprocessed failed message is re-batched for 15 minutes only; older ones still rely on SST G.
- Confidence: Confirmed (by reading)

### A8. A watchdog retry turns a button tap into typed text, so it takes the wrong route
- Category: Inconsistency
- Severity: Medium
- Where: SST G → Send back through the AI; SST 1 → Build Claude request
- Evidence: SST G always posts `type: 'text', text: { body: text }`. SST 1: `const tapped = msg.type === 'interactive' ? (…MENU match…) : '';`.
- Impact: If the run for a tapped "New enquiry" or "Complaint" fails and is retried, the retry is not recognised as a tap. With `menu_state = 'asked'` it is forwarded as a follow-up with the text "New enquiry" or "Complaint", and the customer is told their salesperson has been alerted.
- Proposed fix: In Build Claude request accept the exact menu labels whatever the type: `const tapped = Object.keys(MENU).find(k => MENU[k].indexOf(said) >= 0) || '';` limited to when `menuState === 'asked'` or the type is `interactive`.
- Risk of the fix: A customer who types exactly "Complaint" after the menu is treated as having tapped it, which is the intended meaning.
- Confidence: Confirmed (by reading)

### A9. Save chat switches a stopped bot back on, and overwrites fields other workflows own
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Save chat, Build Claude request
- Evidence: Save chat: `paused: ={{ $json.keep_paused === true }}`; `keep_paused` is true only for complaint cases. Form answers skip the stopped-chat block (`… && !formReply && …`). Save chat also rewrites `stage`, `reference`, `lead_json`, `nudged_at`, `history` from values loaded several seconds earlier.
- Impact: If a salesperson has stopped the bot and the customer submits a form that was already on their screen, Claude answers and `paused` is set back to false without anyone asking. At go-live, a "stop" command (SST 3) or a nudge stamp (SST C) written while a Claude call is in flight is overwritten by the older values.
- Proposed fix: In Build Claude request pass `keep_paused: stoppedByTeam` for every `claude` route except the tapped "New enquiry" (which already un-pauses through `menu_update`); remove `nudged_at` from Save chat unless SST 1 changes it.
- Risk of the fix: The bot stays stopped after a form answer while stopped; decide whether the form answer should be forwarded to the salesperson instead.
- Confidence: Confirmed (SST 1 side); the SST 3 / SST C writers were not read (Needs checking)

### A10. "Has been alerted and will be in touch shortly" is sent when nobody is alerted, and ignores office hours
- Category: Inconsistency
- Severity: Medium
- Where: SST 1 → Tell customer they are alerted, Send to salesperson (disabled), Read Claude answer (speak-to wording), Prepare message for salesperson
- Evidence: "Send to salesperson" is disabled (testing) but "Tell customer they are alerted" still sends `'Got it. ' + who + ' has been alerted and will be in touch with you shortly.'`. The speak-to reply says "I have let X know, and they will get in touch with you right away." and also depends on the disabled node unless it is a callback. The alerted text has no office-hours branch, unlike the speak-to text (`ctx.office_open ? 'right away.' : 'as soon as we open …'`).
- Impact: During testing every follow-up, complaint follow-up and cancellation reason is acknowledged as passed on although nothing is sent (this is the testing switch, flagged only because the customer wording is false). After go-live a customer writing on Friday night is still told "shortly". If "Prepare message for salesperson" finds no number it returns `[]`: no acknowledgement, the message is never marked replied, and SST G replays it.
- Proposed fix: Add the office-hours wording to "Tell customer they are alerted" (reuse `open` / `nextOpening` by passing them in the `paused` route output). For the testing phase either enable SST W to the test number or change the wording to a neutral "noted".
- Risk of the fix: Enabling SST W touches a testing switch.
- Confidence: Confirmed

### A11. Every photo or document is downloaded twice and stored in two unrelated Drive places
- Category: Redundancy
- Severity: Medium
- Where: SST 1 → Get file link / Download file / Save to Customer files; SST 1 → Customer sent a file? / Save customer file; SST D → Get file link / Download file / Upload file
- Evidence: Main flow saves to folder "Customer files (bot)" (`1NwnCkLsTr0-i-2BkPkkfXA5hQCAcXHlr`) and puts those links in `lead.file_links`. SST D downloads the same `media_id` again and files it under root `1gPLrtgk0fsi-iDjsH2xY1DyM0_dN0MLX` / customer / enquiry, recording it in `sst_documents` and on the Leads row. "Customer sent a file?" accepts only `["image","document"]`; the main flow also handles `video`.
- Impact: Two copies of every file, two link sets (the salesperson's message shows one, the Leads row the other), videos only in the flat folder. The main-flow download runs before the debounce checks, so three photos sent together can be saved up to six times in the flat folder (each superseded run saves its batch again).
- Proposed fix: Keep SST D as the only store. In the main flow keep "Get file link / Download file / Read file contents" only for Claude's base64, delete "Save to Customer files", and take the links from `sst_documents` (or have SST D return them). Add `video` to "Customer sent a file?".
- Risk of the fix: `lead.file_links` and the held-files text rely on the flat-folder links today; SST D runs last in the run, so links would have to be read later (for example in SST 2).
- Confidence: Confirmed

### A12. Large files are sent to Claude as base64, repeated on every retry
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Read file contents, Build Claude request, Ask Claude, Ask Claude again
- Evidence: "Photos over 4.5 MB and PDFs over 20 MB are saved but not read"; up to 5 files per reply; `timeout: 45000`; Ask Claude `maxTries 3`, Ask Claude again `maxTries 2`; the body is rebuilt with `JSON.stringify` inside an expression.
- Impact: Five 20 MB PDFs are about 130 MB of base64 in one request (the API limit is about 32 MB), and a single 20 MB PDF is unlikely to finish in 45 s. The request then fails five times in a row, each time uploading the file again, and the customer waits for the watchdog. Large bodies also load n8n cloud memory.
- Proposed fix: In "Read file contents" cap PDFs at about 5 MB and the total at about 15 MB per reply (larger files become "could not be read here; saved for the team"); raise the Ask Claude timeout to 90 s when files are attached.
- Risk of the fix: Fewer large documents are read by the AI; they are still saved and passed on.
- Confidence: Likely (limits read from the nodes; not tested with a large file)

### A13. Three Google Sheets reads on every message, before the debounce, and a failed read is silent
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Read sales team, Read FAQ, Read holidays
- Evidence: All three run for every inbound message (Read sales team even for messages that are then dropped at Combine messages); each has `retry 5 × 5 s` and `onError: continueRegularOutput`. Execution 1710 (a fixed reply, no AI) took 7.3 s from webhook to send.
- Impact: Slower replies, and Sheets quota use grows with traffic. When a read fails after retries the run continues with an empty FAQ (Claude can no longer answer FAQs and the cached prompt changes), default office hours (holidays ignored), or the hard-coded BACKUP staff list, with no issue logged.
- Proposed fix: Cache the three tabs in `sst_state` (refresh every 10 to 15 minutes by a small scheduled workflow) and read the cache; or at least move the reads after "Still the newest (early)?" and log an issue when a read returns an error item.
- Risk of the fix: FAQ or holiday edits take up to the cache interval to apply.
- Confidence: Confirmed

### A14. Each bot reply causes about four extra SST 1 executions (delivery status webhooks)
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Incoming WhatsApp (POST), Read message, Failed deliveries
- Evidence: Executions 1711 to 1714, 1716 to 1719 and 1721 to 1724 are 60 to 250 ms runs that follow each real run (1710, 1715, 1720): sent / delivered / read statuses. Only `status === 'failed'` is used.
- Impact: Roughly five n8n executions per customer message instead of one, which counts against the n8n cloud execution allowance and clutters the execution list.
- Proposed fix: None is possible on the Meta side (statuses come with the `messages` field). If the plan's execution count matters, put a tiny separate workflow or an early-exit IF first, or set "Save successful executions" off for status-only runs; otherwise accept and budget for it.
- Risk of the fix: None for accepting; splitting the webhook needs Meta to point at a new URL.
- Confidence: Confirmed

### A15. A badly typed special-hours cell can stop every reply
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Build Claude request (`hoursFor`)
- Evidence: `const parts = sp.split('-'); return [parts[0].trim(), parts[1].trim()];` with no try/catch; the node has no `onError`. Header in the sheet: "special_hours (e.g. 09:00-14:00, blank = closed)".
- Impact: A value such as "09:00–14:00" (Sheets often autocorrects the hyphen to a dash), "9 to 2" or "half day" makes the node throw for every customer on that day (and on closed days before it, when it is the next opening). No one gets a reply until the cell is fixed; watchdog retries fail the same way.
- Proposed fix: `const m = sp.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/); return m ? [m[1], m[2]] : null;`
- Risk of the fix: A malformed cell is treated as closed all day instead of crashing.
- Confidence: Confirmed (by reading); the tab currently has no special hours

### A16. The returning-customer menu makes most of the "after confirmation" AI logic unreachable
- Category: Redundancy
- Severity: Medium
- Where: SST 1 → Build Claude request (menu block), Read Claude answer (`notify`, `quiet`, `new_enquiry`, `toManager`), Ask Claude / Ask Claude again (appended "AFTER CONFIRMATION" text), prompt steps 6 and 7
- Evidence: Once the stage is `confirmed` or `support`, every message returns from the menu block unless it is a form answer, a "thanks", a cancel/speak request, or inside a fresh "New enquiry"/complaint. The Claude-side rules for the same situation remain: prompt steps 6 and 7, the "AFTER CONFIRMATION…" paragraph added in both HTTP nodes, `a.new_enquiry === true && DONE.indexOf(prevStage) >= 0 && differs`, and the 24-hour `quiet` holding reply.
- Impact: Two generations of the same behaviour. The older one is paid for in prompt tokens on every call and can still fire in the few paths that reach Claude (for example "thanks" during the 24 hours after "contacted" gets the `quiet` holding reply and a forward to the salesperson).
- Proposed fix: Decide which layer owns post-confirmation messages. If the menu does, delete the "AFTER CONFIRMATION" paragraph from both HTTP nodes, prompt steps 6 and 7, and the `new_enquiry` / `quiet` branches.
- Risk of the fix: The prompt reviewers should agree; form answers after confirmation still reach Claude and need one clear rule.
- Confidence: Confirmed

### A17. SST D failures are invisible, and a main-flow error skips the document save
- Category: Improvement
- Severity: Medium
- Where: SST D → settings, List again / Choose folder / Save a file?; SST 1 → Save customer file, Name the documents folder
- Evidence: SST D settings have no `errorWorkflow` (SST 1 and SST G both have `W3TFvtQPxamDCu0q`). SST 1 calls it with `waitForSubWorkflow: false` and `onError: continueRegularOutput`. "Save a file?" needs `folder_id`, which comes from a Drive search ("List again") made immediately after the folder is created. "Customer sent a file?" is the last branch of the SST 1 run.
- Impact: If the Drive search does not yet return the new folder, `folder_id` is empty and the file is silently not saved to the customer folder. If anything in the main SST 1 flow throws, the SST D branch never runs, and the watchdog retry is a text message with no `media_id`, so the document never reaches the customer folder.
- Proposed fix: Set SST D's error workflow to SST E; in "Choose folder" fall back to the id created in "Plan folders" (`ids[0]` / `ids[1]`) when the search does not return it; move "Customer sent a file?" above "Read sales team" on the canvas so it runs first.
- Risk of the fix: SST D would run before the chat row is updated, so a file sent with the first message of a new enquiry would be filed by the previous reference; keep the order and accept the skip if that matters more.
- Confidence: Confirmed (settings and order); the Drive search timing is Needs checking (4 production runs so far, all successful)

## Low

### A18. Menu, fixed-line and voice replies are marked as answered even if the send fails
- Category: Improvement
- Severity: Low
- Where: SST 1 → Send the options, Ignored message ids, Mark ignored as replied, Save menu choice
- Evidence: "Send the options": `retryOnFail: false`, `onError: continueRegularOutput`; "Mark ignored as replied" runs on a parallel branch whatever the result; `menu_state: 'asked'` is saved before the send.
- Impact: One failed Graph call means no menu, no retry, no watchdog, and the customer's next message is treated as a follow-up to a menu they never saw.
- Proposed fix: Turn on retry (2 tries) on "Send the options" and chain "Ignored message ids" after it from the success output only.
- Risk of the fix: Route `ignore` has no send, so it must keep its own path to "Ignored message ids".
- Confidence: Confirmed

### A19. Menu state is saved, and taps are read, before the batch is final
- Category: Improvement
- Severity: Low
- Where: SST 1 → Menu state to save? / Save menu choice, Still the newest?, Build Claude request
- Evidence: "Save menu choice" runs after the early check but before Claude; a run superseded at "Still the newest?" has already cleared `held_text` and set `menu_state: 'new'`. `tapped` needs `said` to equal the label exactly, and `type` is taken from the last message of the batch. Typing after the 4-hour menu window stores `held_text: said.slice(0, 1500)` (replacing the earlier text) while `held_files` is appended.
- Impact: Tap "New enquiry" and type a line a few seconds later: the first run is dropped after wiping the held text; the second run is not a tap, so `freshStart` is false and Claude continues with the old confirmed lead and reference. Tap "Complaint" plus a typed line in one batch is routed as a follow-up.
- Proposed fix: Detect a tap from any message in the batch (keep per-message types in Combine messages) and move "Menu state to save?" to after "Still the newest?" for the `claude` route.
- Risk of the fix: The menu update for non-AI routes must still be saved on their own path.
- Confidence: Confirmed (by reading)

### A20. Sticky note and comments describe behaviour the nodes no longer have
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Sticky Note 2250785f; comments in Still the newest?, Failed deliveries, Build Claude request, Issue: AI did not answer
- Evidence: Sticky: "waits 6 s" (Wait node is 2 s); "If Claude cannot be reached, the manager is emailed" (no email node: an issue is logged and Vishnu gets a WhatsApp only for no credit); "their messages go to SST 3" and "passed to the assigned salesperson (SST W)" (both switched off). "Still the newest?": "No waiting before replying". "Failed deliveries": "Email the manager". Build Claude request: "Port search trial … (v10, still a draft) goes only to these numbers" and "goes to every number except the sales team", next to "everyone, including the sales team, gets the newest form". The only sticky note covers 100 nodes; files, menu, cancel, rerun, watchdog and SST D are not described.
- Impact: The next person editing the workflow is misled.
- Proposed fix: Rewrite the sticky note and those five comments to match; add one sticky per area.
- Risk of the fix: None.
- Confidence: Confirmed

### A21. The same values are typed in many nodes
- Category: Redundancy
- Severity: Low
- Where: SST 1 (many nodes), SST G, SST D
- Evidence: Phone number id `1451398948053197` 12 times in SST 1 (6 WhatsApp nodes, 3 URLs, Read message, Failed deliveries, sticky) plus 2 in SST G; sheet id 7 times in SST 1 plus SST D; `graph.facebook.com/v21.0` 4 times plus 2 in SST D; office hours `08:30`/`17:30` in `hoursFor`, the prompt and the promo reply, while SST G's cron uses 8 to 17; office phone twice; the alert/tester number `[number ending 3824]` three times; models `claude-sonnet-5-5` (Build Claude request) and `claude-haiku-5-5` (Ask Claude again); the 3.3 KB schema and guard text duplicated in "Ask Claude" and "Ask Claude again"; the 15-minute cutoff in 3 nodes; the form id in both `FORM.service` and `PORT_SEARCH_FORM.id`; `max_tokens: 4000` in Build Claude request overridden to `2000` in both HTTP nodes.
- Impact: A change of phone number, Graph API version, hours or model has to be made in many places and one will be missed.
- Proposed fix: One "Settings" Set/Code node at the start (phone id, graph base URL, sheet id, hours, numbers, models, form ids) referenced by expressions; build the schema and guard text once in Build Claude request and let both HTTP nodes send `body` with only the model overridden.
- Risk of the fix: Many small edits in the live workflow; do it in one tested release.
- Confidence: Confirmed

### A22. Dead variables and conditions (not testing switches)
- Category: Redundancy
- Severity: Low
- Where: SST 1 → Build Claude request, Read Claude answer, Remember message id; SST G → Send back through the AI
- Evidence: `courtesy` and `isStaffNumber` are computed and never used; `FORM.mode`, `FORM.service_mode`, `FORM.testers`, `PORT_SEARCH_FORM.testers` and `/^999990007/` cannot change anything while `live: true`; `if (optKind === 'form')` (not a value the prompt offers); history is stored with `.slice(-40)` but only `.slice(-30)` is sent; `tracked` is always written `true` and only ever tested for true; SST G strips a `[[retry]] ` prefix that nothing adds.
- Impact: Noise that hides the real rules.
- Proposed fix: Delete them; store `.slice(-30)`.
- Risk of the fix: None found.
- Confidence: Confirmed

### A23. Chat state gaps: a column written but not read, and routes that leave no trace
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Save chat, Build Claude request; table `sst_chats`
- Evidence: All 20 `sst_chats` columns are used somewhere, but `last_question` is written by Save chat and read by nothing in SST 1, D or G; `contacted_at` is read but never written here (owner: SST 3, not checked). `last_message_at` and `history` are updated only on the Claude route: the menu, fixed lines, voice reply, forwards and their customer messages are not added.
- Impact: Claude later has no record of what the customer said during a follow-up or what the bot told them; the 24-hour idle test and the late-delivery test measure time since the last AI reply, not the last message.
- Proposed fix: Update `last_message_at` in "Save menu choice" / "Note greeting time"; append a one-line note to `history` for forwarded messages; drop `last_question` if SST C does not read it.
- Risk of the fix: Check SST C before removing `last_question`.
- Confidence: Confirmed for SST 1, D, G; other workflows not read

### A24. Testing leftovers every customer can reach at go-live
- Category: Improvement
- Severity: Low
- Where: SST 1 → Build Claude request, Options message, Wipe chat (rerun), Real customer number?, Blocked number?, Out of Claude credit?
- Evidence: `/^sst ?bot rerun[.!]*$/i` works for any number and replies "This conversation has ended. To begin testing again, just text *hi*."; numbers starting `99999` never get a reply; the blocked list is one number typed in the IF (`['[number ending 0708]']`); the credit alert goes to a personal number.
- Impact: A go-live checklist is needed; the rerun code deletes a chat's reference and history for whoever types it.
- Proposed fix: Limit the rerun code to a tester list; move the blocked numbers to `sst_state` or a sheet tab; send the credit alert through SST L.
- Risk of the fix: Touches testing aids, not the documented switches.
- Confidence: Confirmed

### A25. Paths where a customer message is dropped with no reply and no hand-off
- Category: Improvement
- Severity: Low
- Where: SST 1 → Build Claude request (`ignore` routes), Read Claude answer (promo), Blocked number?
- Evidence: `promo_blocked` is permanent (`return [{ json: { route: 'ignore' … } }]` on every later message; only the rerun code clears it); "late delivery" is ignored when the chat moved on and the message is 15+ minutes old; after a cancellation any next message within 24 hours is taken as the reason (`if (cancelPending && !formReply)`), including "ok" or a new request.
- Impact: A business flagged as promotional twice can never make a real enquiry on this number; a late-delivered message is discarded without being shown to anyone; "ok thanks" is sent to the manager as the cancellation reason.
- Proposed fix: Let `promo_blocked` expire after 30 days; forward late messages to the salesperson instead of ignoring; skip the cancel-reason capture when `quickKind` is set.
- Risk of the fix: Slightly more AI runs from promoters after the expiry.
- Confidence: Confirmed (by reading)

### A26. `sst_seen_messages` is read in full three times per message and never trimmed
- Category: Token/usage
- Severity: Low
- Where: SST 1 → Load recent messages, Check for newer messages (early), Check for newer messages; SST G → Load unanswered messages; "Backup:" log nodes
- Evidence: All three reads filter on `phone` only with `returnAll: true`; the 15-minute cutoff is applied afterwards in code. SST G loads every `tracked / not replied / not held` row with no date filter. No delete on this table exists in SST 1, D or G. The three "Backup:" nodes write every conversation row to `sst_conversation_log` as well as the sheet, always, not only when the sheet fails.
- Impact: Reads grow with each customer's lifetime message count; the table and the backup log grow without limit.
- Proposed fix: Add `createdAt gt now − 20 minutes` to the three reads (as "Load held messages" already does with 3 days); add a nightly delete of rows older than 7 days.
- Risk of the fix: The duplicate check ("New message only") must keep at least as many days as Meta retries (7 is safe).
- Confidence: Confirmed for SST 1, D, G; a cleanup in another workflow was not checked

### A27. Watchdog timing edges
- Category: Improvement
- Severity: Low
- Where: SST G → Find stuck customers, Send holding reply
- Evidence: A message counts as stuck at `age >= 4` minutes; the worst-case SST 1 run is about 4 minutes (3 × 45 s + 2 × 45 s plus waits). Retries are an hour apart and rows up to 24 hours old are picked up.
- Impact: A run still retrying at the top of the hour can be re-posted, giving two replies; a holding reply for a message 23+ hours old can fall outside WhatsApp's 24-hour window and fail (the node continues on error, the alert still goes out).
- Proposed fix: Raise the threshold to 6 minutes; cap the age for the holding reply at 23 hours.
- Risk of the fix: None found.
- Confidence: Likely

### A28. Payloads with more than one message are only partly handled
- Category: Improvement
- Severity: Low
- Where: SST 1 → Load recent messages (`executeOnce`), Combine messages, File details
- Evidence: "Load recent messages" uses the first item's phone while Combine messages uses `mine[mine.length - 1]`; File details uses `$input.first()` only.
- Impact: If Meta batches two messages in one webhook call (it can under load), the second sender may be skipped and only the first file goes to SST D.
- Proposed fix: Loop per sender, or split the items per phone before "Load recent messages"; remove `.first()` from File details.
- Risk of the fix: Low.
- Confidence: Needs checking (no batched payload was seen)

### A29. When the buttons or form cannot be sent, the plain-text fallback points at a form that never arrives
- Category: Improvement
- Severity: Low
- Where: SST 1 → Reply with buttons (error output) → Plain text instead; Read Claude answer (history)
- Evidence: Fallback sends the same reply text ("a quick form opens from the button…"); history has already been saved with `[Details form sent]` / `[Service form sent]`, and the prompt says to send each form at most once.
- Impact: The customer is told to use a form that is not there, and Claude believes it was sent.
- Proposed fix: In "Plain text instead", for `_form` options, replace the reply with a line asking the customer to type their details, and log an issue.
- Risk of the fix: None found.
- Confidence: Confirmed (by reading)

### A30. Documents sent before a complaint or callback are filed under that case, not the enquiry
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Enquiry confirmed or complaint? → Folder rename details → SST D → Plan folders
- Evidence: The rename runs for `trigger_handover`, `trigger_support` and `trigger_callback` alike; SST D renames the "Pending" folder to whatever reference it is given. The later enquiry gets a new reference and no folder (`have` is empty, `save` is false). "Folder link on Leads row" updates by reference and may run before SST 2 has added the row.
- Impact: Files uploaded while collecting an enquiry end up under a callback or complaint reference; the enquiry's Leads row has no documents link.
- Proposed fix: Call the rename only when `trigger_handover` is true.
- Risk of the fix: Complaint cases keep their files in "Pending" until an enquiry is confirmed.
- Confidence: Likely (logic read; the SST 2 timing was not checked)

### A31. Smaller items
- Category: Improvement
- Severity: Low
- Where: SST 1 → New message only / Remember message id; Mark held message sent; Read Claude answer
- Evidence: (a) Duplicate check is "row not exists" followed by a separate insert, so two deliveries of the same message within a few hundred milliseconds both pass. (b) "Mark held message sent" filter is `{"conditions":[{"keyValue":"={{ $('Load held messages').item.json.id }}"}]}` with no column name (dormant sales-side branch; will matter when the switch is restored). (c) The reference is 4 random characters with no collision check.
- Impact: (a) rare double reply; (b) held messages may be re-sent or the update may fail at go-live; (c) negligible.
- Proposed fix: (a) make `message_id` the upsert key and continue only when the row was created; (b) set `keyName: id`; (c) leave.
- Risk of the fix: (b) is inside the switched-off branch; test before restoring it.
- Confidence: (a) Likely, (b) Needs checking, (c) Confirmed

## Not covered
- The wording and size of the Claude prompt and the form definition (excluded by the brief). The `formText` field mapping in "Read message" was read but not checked against the form.
- SST 2, SST 3, SST C, SST E, SST L and SST W were not opened; statements about what they read or write in `sst_chats` are marked "not checked".
- No live test was run. Findings marked "by reading" were traced in the node code and connections, not reproduced.
- Whether the model ids `claude-sonnet-5-5` and `claude-haiku-5-5` are the intended ones was not assessed (recent runs succeed).
- To read the 172 KB SST 1 definition I parsed the saved tool result locally with jq/python (read-only); the extracts are in the scratchpad folder `audit/A_work/`.
