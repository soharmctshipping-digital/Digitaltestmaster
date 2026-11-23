# SST WhatsApp bot: change log from the second Claude account

Purpose: a running record of everything done to the Sohar Shipping WhatsApp bot from this
Claude account, so the original account can pick up exactly where things stand.

- Bot: Sohar Shipping WhatsApp enquiry bot, n8n instance `sstcwa.app.n8n.cloud`
- Route: A (same n8n, same Google files, same Meta app; only the builder seat changed)
- Standing rule from the owner: make no change that affects the workflows unless told to
- Log started: 19 November 2026

## How to read this

- **Section 1** lists changes to the live bot (n8n, Google Sheets the bot uses, Drive, Meta).
  This is the part the other account must know about.
- **Section 2** lists things created alongside the bot that the bot does not depend on.
- **Section 3** lists read-only checks, for context.
- **Section 4** lists open questions.

Each entry has a date, what was done, where, and why. Newest entries go at the bottom of
each section.

## 1. Changes to the live bot

SST 1 was edited, published and rolled back on 19 Nov 2026 (details below); the corrected version is live. No other workflow has been changed. No data table row has been added or changed. No WhatsApp message or email has been sent. No
Meta setting, form or template has been touched. One sheet cell has been changed:

| Date | System | What changed | Why | Asked for by owner? |
|---|---|---|---|---|
| 19 Nov 2026 | Google Sheet "SST WhatsApp Leads", tab FAQ, cell B9 (answer to "Do you do customs clearance?") | Was: "Yes, for imports and exports by sea, air and road." Now: "Yes. We clear imports by sea, air and road as a service on its own. For exports, we handle the export clearance as part of shipping your cargo, so you don't need to book it separately." | The FAQ and the bot's prompt disagreed. The owner confirmed export clearance is done as part of handling the export, not offered as a separate option. | Yes |

### SST 1 changes: published, rolled back, corrected and published again

Timeline on 19 Nov 2026 (UTC):

- 09:14 Published version `c998927d-15d7-467c-9605-17e5fea724c0` on the owner's instruction.
- 09:17 and 09:18 Two test runs with dummy numbers (executions 1892 and 1893), each with a
  real AI call. Both stalled at the AI step.
- 09:20 Rolled back: version `1ed21e80-703c-4c40-ad56-9c7d53a36833` (the one from before
  this work) was published again. **That is the live version now.**
- Cause, read from execution 1892: Claude answered "Schema is too complex". Making the 18
  lead fields optional in the answer format is what did it. The requests first timed out at
  45 seconds each, then returned that error.
- Fix in the draft: every field is required again, as in the published version, and the AI
  returns an empty value for lead fields that have not changed. Not yet published.

- 09:32 Corrected draft saved and read back: version `93636f64-ec55-4682-968f-b2f826cb64fd`.
  It is NOT published. A second publish needs the owner's fresh go-ahead.
- About 09:35 One more dummy run (execution 1896, phone 999990007104, message id
  wamid.DRYRUN-D1) went through the live, earlier version by mistake of ordering: it was
  meant to follow the publish, which did not happen. It made one real AI call on the old
  version, sent nothing to WhatsApp, and left test rows like the others.

- 09:38 The owner approved again ("build, publish it and test it heavily"). Version
  `93636f64-ec55-4682-968f-b2f826cb64fd` was published. **This is the live version now.**
  A real AI test straight after (execution 1897, dummy phone 999990007105) was answered in
  8 seconds: typed shipment details noted, "Sohar Port" used, details form sent.
- From 09:40 A full live test of every service with dummy numbers 9999900072xx is running;
  results go to `audit/F_live_test_19Nov.md`. Two of those chats are confirmed on purpose, so
  two test leads and two emails to the test address are expected.

- 09:40 to 10:50 Live test of every service on the 09:38 version: 82 messages on 16 dummy
  numbers, 13 service variants, all reached a summary. Report: `audit/F_live_test_19Nov.md`.
  No errors and no repeated questions; several medium defects, fixed next.
- 10:54 Version `f0bdb21b-df95-49de-988e-e07851f60bdb` published. **This is the live SST 1
  version now.** It adds: item 15 (pause before loading the chat, messages marked handled
  before the reply, new step "Carry answer on"); notes on the lead are never lost when the AI
  rewrites them; at confirmation any form answer missing from the lead is added to the notes
  ("From the form: ..."); a fixed summary layout; the documents step is skipped for container,
  warehousing and agency enquiries; weight as a plain number; Arabic spelling of Sohar.
  To go back one step publish `93636f64-...`; to go back to before all of today's work
  publish `1ed21e80-...`.
- 10:54 to 11:00 Re-test on dummy numbers 999990007301 to ...303: smoke test passed; a
  transit enquiry taken to confirmation (reference SST-261119-VD75) kept the position, the
  cargo value and "urgent" on the lead and used the fixed summary layout.
- SST 3 published with item 9 (version `b9994a9c-84dc-4748-8d0a-1d937cc0145a`).
- SST 2 published with item 9 on the owner's instruction (version
  `386fb9f1-50d0-49eb-82b0-c5f996fd3384`; before: `f0c84462-...`). No testing switch touched.

### Form v23 (in progress, 19 Nov 2026)

Owner's go-ahead: "start v23". Source and patch: `bot_build/v23/`. Not yet created in Meta,
not published, not sent to anyone. Customers still get v22 (`29363394833300676`).

What v23 changes against v22:
- Sea export: port of loading is Sohar Port, shown as text, not asked. Only the port of
  discharge is picked.
- Sea import: port of loading is picked as before; port of discharge is a list of Oman ports
  (Sohar Port pre-selected, Duqm Port, Salalah Port, Port Sultan Qaboos (Muscat), Not sure).
- One shared overseas-port picker for both directions. New answer fields: `far_region`,
  `far_sea_<region>`, `far_port_sea`, `pod_oman_sea` (the old `pol_*` / `pod_*` are gone).
- Road borders by name (Al Wajajah, Khatm Al Shikla / Hafeet, Rub' Al Khali, Not sure) for
  customs and transit, in place of "A road border".
- Agency: full port names and a "Which port?" box under "Another port".
- LCL and air: package size and volume are required but "not sure" is accepted (volume is now
  a text box) and the helper text says so.
- "Customs clearance by us?" is asked for imports only (sea, air, land, project).
- "Dangerous goods?" is no longer asked for RoRo.
- Land freight: "Largest piece size" is optional.
- Temperature-controlled storage asks for the temperature.
- Wording: "Smaller shipments, charged by volume" (no "shared container"); "I will collect
  from your yard" / "Deliver to my site"; document notes say "please have ... ready", not
  "required".
- Build check in T8 "Form definition": stops with a clear message if a screen has more than
  100 components or a label, option or helper text is over WhatsApp's length limits.
- Component counts (limit 100): BASICS 88 (was 99), DETAILS 95 (was 99), FINAL 88 (was 87).

Not in v23: pre-filling the form from what the customer typed. That needs data passed into
the form from "Read Claude answer" and through every screen; left for a later version.

Status at 11:11 UTC, 19 Nov:
- T8 "Form definition" holds the v23 code (T8 version `407e9243-...`, T8 is unpublished as before).
- v23 exists in Meta as a DRAFT form, id `990727460359037`, created by T8 "Run form setup"
  (execution 2007). Meta returned no validation errors. T8 "Form preview" now points at it.
- 11:18 The owner found the third page ("A few details") empty. Cause: Transit with Vehicles
  or Break bulk had no question on that page (v22 has the same gap). Fixed as v23b: "Do you
  need our trucks?" moved from page 2 to page 3, and the build check now refuses a form in
  which any page could be empty. New draft form in Meta: `1400138701949428` (execution 2009,
  no validation errors). **This is the v23 to review and publish.** T8 "Form definition" is at
  T8 version `5f0e02d7-...`.
- The first draft, `990727460359037`, is superseded and can be deleted (T8 "Failed draft
  ids" + "Run draft cleanup"). Left in place until the owner says so.
- 11:25 **Form v23 PUBLISHED in Meta** on the owner's instruction ("publish it"): form id
  `1400138701949428` (T8 "Run form publish", execution 2012, Meta answered success). A
  published form cannot be edited; any change means a new form.
- A rebuild with realistic sample values for Meta's page preview (so a page opened on its own
  is not blank) was refused by Meta because the name was already taken (execution 2011). It
  was not needed: sample values only affect the preview. T8 "Form definition" holds that
  latest source; give the next build a new name.
- 11:29 **SST 1 published as version `c9e84b8f-0203-4b5c-9eff-200f117124c0`. This is the live
  version now.** It sends form v23 (`1400138701949428`), reads the v23 answers ("Read
  message" still reads v22 answers too), and the summary ends "Tap Yes, confirm (or just
  reply yes or okay), or tell me what to change." To go back to v22: publish SST 1 version
  `f0bdb21b-...` (it sends form `29363394833300676`, which is still published in Meta).
- 11:29 to 11:31 Tests on dummy numbers 999990007401 and ...402, all passed: the bot sends
  form id 1400138701949428; a v23 sea export reads as "Port of loading: Sohar Port, Oman /
  Port of discharge: Shanghai, China" with no port question; a v23 sea LCL import reads as
  Hamburg to Duqm Port with "not sure" for size and volume accepted and not queried; the
  summary uses the fixed layout and the new closing line. Neither chat was confirmed, so no
  new test lead.
- Not tested: the v23 screens on a real phone (answers were injected). The owner should run
  one enquiry from a phone.
- SST 1 has a draft (version `e2bb7ee6-...`, not live) in which "Read message" reads the v23
  answers as well as v22.
- To finish after the owner's review: publish the form with T8 "Run form publish" (set the id
  in "Forms to publish"; a published form cannot be edited), set the new id in SST 1
  "Build Claude request" (`FORM.service` / `PORT_SEARCH_FORM.id`), change the summary's closing
  line to allow a typed "yes" or "okay", publish SST 1, test with a dummy number and a phone.
- To drop the draft form instead: put its id in T8 "Failed draft ids" and run "Run draft cleanup".

### "Job enquiry" option (22 Nov 2026): LIVE

Owner's instruction (22 Nov): add a "Job enquiry" choice beside New enquiry, Existing
shipment and Something else; it should point to the careers page
(https://www.soharshipping.com/career) and give the office number +968 249 55 777.

In the SST 1 draft (version after these saves is newer than `22ba01bb-...`; the live version
is still `c9e84b8f-...`):
- "Read Claude answer" (first change ever made to this step): the first question is sent as a
  WhatsApp list with four rows, because WhatsApp allows only three tap buttons. Arabic has the
  same four. No menu is added under the careers answer.
- "Build Claude request": tapping "Job enquiry", or typing "job enquiry", "vacancies" or
  "careers", gets the fixed careers reply from code (no AI call). The prompt tells the AI to
  give the same answer to longer job questions and no longer escalates job applications.
- The two wait steps state "seconds" explicitly again (see note below).
- Source: `bot_build/patchE.py`, test `bot_build/testE.js`.

Checked: offline tests; stored code read back and matched; two pinned dry runs in n8n
(executions 2212 and 2213, dummy phone 999990007501): "Hi" gets the four-choice list, and
"Job enquiry" gets the careers reply with no AI call and stage "faq". Nothing sent.

PUBLISHED on 22 Nov 2026 at about 08:49 UTC on the owner's instruction ("publish it"):
SST 1 version `67cb73a4-2809-4b89-b2dd-7e1ca1ce7281`. **This is the live version now.**
To go back to three buttons, publish version `c9e84b8f-...`.

Live checks straight after, dummy phones 999990007502 and ...503, both passed: a typed
question about a job opening got the careers page and office number from the AI (stage
"faq", not escalated, no price or contact guard triggered); "Hi" got the greeting with the
four-choice list. Not tested: how the list looks on a real phone.

Note: before these edits the SST 1 draft already differed from the live version. Every step
had a new canvas position and 12 steps had lost values that equal n8n's defaults (for example
`mode`, `resource`, `unit`). That is what n8n's editor does when the workflow is opened and
saved by hand; behaviour is the same. Connections were identical. Publishing the draft will
carry those cosmetic differences along.

### Automatic import customs quotations: PARKED by the owner on 22 Nov 2026

Nothing was built in n8n. Saved for later: decisions and plan in `SST_BOT_FIX_PLAN.md`,
templates in `bot_build/quote_templates/`, transport rates in
`SST_Inland_Transport_Rate_List.md` and `bot_build/transport_rates.json`, pipeline review in
`audit/G_quote_pipeline.md`. Open questions for the owner are listed in the plan.

No real customer wrote in during the six minutes the new version was live; the only runs in
that window were the two dummy ones.

Lesson for whoever continues: any change to the AI answer format must be tested with one real
AI call (a dummy number through the published workflow, or a separate test workflow) before
the owner tests from a phone. n8n's pinned-data test does not call the AI.

The rows below are the changes held in the draft.

| Date | Step | What changed in the draft | Owner's item |
|---|---|---|---|
| 19 Nov 2026 | "Read message" | Ports and clearance points carry full names ("Sohar Port", "Duqm Port", "Salalah Airport"); customs cargo labels match the form; reefer temperature gets "°C"; warehouse location keeps "Muscat (Rusayl)"; a named port under "Another port" is read if the form sends one | Decision 4, item 5 |
| 19 Nov 2026 | "Tell customer they are alerted" | Acknowledgement at most once per 30 minutes instead of once per 4 hours; a shorter "Got your message" line when the customer was already greeted that day | Item 13 |

| 19 Nov 2026 | New steps "Fixed reply?" and "Fixed reply as AI answer" (between "Bot paused?" and "Ask Claude") | A first greeting, the "New enquiry" choice and the details form are answered from code with no AI call; everything after is unchanged | Item 18 |
| 19 Nov 2026 | "Build Claude request" | Fixed thank-you line; cancel and call-back requests no longer reset a confirmed enquiry after 24 hours; typed "new enquiry" acts like the button; a greeting more than 5 minutes after the last message brings the menu back; documents needed are worked out in code from the service form and are never a condition; prompt: forms always used, at most three questions per message without forms, LCL/air "not sure" accepted, "Sohar Port", export clearance not offered on its own; the AI returns only changed lead fields; the whole AI request, answer format included, is built here; max 2,000 answer tokens | Items 1, 2, 12, 13, 16, 17, 18; Decisions 3, 4, 5 |
| 19 Nov 2026 | "Ask Claude", "Ask Claude again" | Now send the request as built (second one with the model swapped to Haiku). The long duplicated answer format was removed from both | Item 17 |
| 19 Nov 2026 | New steps "Second answer usable?" and "Short wait before last try" | If both AI attempts fail, the run waits 20 seconds and tries once more before giving up | Failed-answer recovery |
| 19 Nov 2026 | "Still the newest?" | Also compares documents needed with documents identified; at confirmation writes "Documents not supplied: ..." at the start of the lead's notes, which SST 2 already shows on the sheet and the email | Item 2 |

| 19 Nov 2026 | Pause, early check, "Load chat", new step "Carry answer on" (DRAFT, not yet live) | Item 15: the chat is loaded after the 2-second pause, and messages are marked handled before the reply is sent, so two runs cannot answer the same text | Item 15 |

Item 9, in the DRAFTS of SST 2 and SST 3 (not yet live): four sheet writes changed from
"let Google format" to "as typed", so phone numbers keep their + and country code. SST 2
"Add to Quotes sheet"; SST 3 "Add version to Quotes sheet", "Add to Confirmed Quotes",
"Mark lead Approved". Versions before the change: SST 2 `f0c84462-f15f-4ac4-8dc2-0fd87b5cf9ba`,
SST 3 `0786558d-8ea8-43df-bdb1-8a6df5216411`. No testing switch was touched.

"Read Claude answer" is unchanged. Draft version id after these saves: `c998927d-15d7-467c-9605-17e5fea724c0`.

Checks done on the draft: (1) read back from n8n and compared with the tested files: all six
code steps match; (2) offline tests in `bot_build/` (15 message scenarios and a land-freight
enquiry with dangerous goods through to confirmation); (3) one n8n dry run, execution 1891,
with pinned data and the dummy number 999990007101: greeting answered from code, no AI call,
nothing sent to WhatsApp. Not yet checked: real AI answers with the new prompt and answer
format. That needs the draft published and a real test chat.

Test leads created on purpose or by the tests (all on dummy numbers, to clear at go-live):
SST-261119-6MMM (sea FCL), SST-261119-JXCL (land freight, then cancelled as SST-261119-BZLD),
SST-261119-LXSQ (RoRo, confirmed by a typed "ok"), SST-261119-VD75 (transit re-test). Each
has a Leads row and an email at the test address. Dummy numbers used: 999990007101 to ...105,
999990007201 to ...216, 999990007301 to ...303.

Test rows created by the dry runs (dummy phones 999990007101, ...102 and ...103, safe to
delete at go-live): `sst_chats` id 17; `sst_seen_messages` message ids wamid.DRYRUN-A1, -B1
and -C1 (B1 and C1 are unanswered, so the watchdog may try them once); one row in
`sst_conversation_log`; and possibly "AI did not answer" entries in the Issues Log from the
two failed runs.

The code for every draft change is kept as patch scripts in `bot_build/`, with an offline
test rig. Plan and status: `SST_BOT_FIX_PLAN.md`.

### Decisions the owner has made (19 Nov 2026), not yet built

1. Documents are never mandatory. The bot asks for them firmly, once. If the customer cannot
   supply them or asks for help, the enquiry is still confirmed and forwarded, and the sales
   team is told which documents are missing, by name.
2. Export: the loading port is Sohar Port, pre-selected, not asked. Import: the discharge
   port can be any port in Oman.
3. LCL and air: package size and volume are both required, but the customer may enter
   "not sure". The form says so beside the field.
4. Anything port-related says "Sohar Port", never "Sohar". No raw codes reach Claude.
5. Export customs clearance is not offered as a separate option (FAQ updated above).
6. Form v23 may be built as a draft for review before it is published.

### Writes made by the owner through the dashboard (not by Claude)

| Date | System | What changed | Note |
|---|---|---|---|
| 18 Nov 2026 | Google Sheet "SST WhatsApp Leads", tab Issues Log, columns I to K | At least one issue was marked resolved from the SST Sales Pipeline dashboard | The dashboard's only write. It runs when someone picks "Yes, resolved" or "No, back to pending". It writes `resolved`, `resolved_by` and `resolved_at` on that issue's row. |

## 2. Created alongside the bot (the bot does not depend on these)

| Date | What | Where | Note |
|---|---|---|---|
| 18 Nov 2026 | SST Sales Pipeline dashboard | Claude artifact, private to the owner | Reads the Leads sheet live (Leads, Dashboard, Sales Team, Issues Log, Quotes, Unfinished, Conversations, Internal team conversation). Three views: Sales pipeline, Customers and bot, Conversations (WhatsApp-style reader). Read-only apart from the issue resolve above. |
| 18 Nov 2026 | Customs Clearance Rate Card | Claude document, private | Built from 49 past quotations. Not yet updated from the full set. |
| 18 Nov 2026 | `SST_Customs_Clearance_and_Container_Rates.xlsx` | This repository, and a Claude Sheet of the same name | 3,002 priced clearance lines from 333 quotations, a container sales sheet, and a "Fixed rates" sheet of 136 charge points (added 19 Nov). |
| 19 Nov 2026 | Claude Code cloud environment "Digitaltestmaster" | Claude Code settings | Allows the host `assets-proxy.anthropic.com`. Created while trying to open a share link. Has no effect on the bot. Safe to delete. |
| 19 Nov 2026 | This change log | This repository | |

Nothing in Google Drive was created, moved, renamed or deleted. The quotation PDFs, tariffs
and the Master Index were only read.

## 3. Read-only checks (no effect on the bot)

19 November 2026, dry run to prove access:

- n8n: listed all 21 workflows. SST 1 (`NTuIx1AbdFxb5chR`), SST 2 (`XGdyZLt2Hw0NFS1P`) and
  SST D (`BONxnz7uR0rWlOCw`) are published; T8 (`7EJgEb3mWFYdoYC2`) is unpublished.
- n8n: listed all 11 data tables and their columns. All match the migration notes.
- n8n: read the `sst_state` table (5 rows: `template_doc_id`, `rr_pointer`, three
  `sales_last_in_*` timestamps).
- n8n: read the SST W workflow definition.
- Google Sheets: read the Leads header row (40 columns, A to AN, `documents_folder` in AN)
  and the Sales Team tab.
- A fuller read-only audit of the testing-phase switches across SST 1, 2, 3, C, D, E, G, L
  and P was started on 19 November. Results to be added below when it finishes.

### Testing-phase audit, 19 November 2026 (read-only)

All of SST 1, 2, 3, C, D, E, G, L, P and W were read in full. Nothing was run or changed.
Phone numbers and email addresses are left out of this file on purpose; they are in the
workflows and on the Sales Team tab.

**Verdict.** No WhatsApp message can reach a salesperson's real number, and no email can
reach a real salesperson's address. Every published route into SST W is cut.

How each route is cut (this is the list to reverse at go-live):

| Workflow | Node | State now | To restore |
|---|---|---|---|
| SST 1 | "Send to salesperson" (calls SST W) | Disabled, with a note "TESTING PHASE" | Enable |
| SST 1 | "From the sales team?" | Condition forced to `false && $json.is_sales`, so staff numbers are treated as customers | Set back to `$json.is_sales` |
| SST 1 | "Build Claude request" | `FORM.live` is true, so every English-speaking customer gets the forms; a testers list also exists | Review |
| SST 2 | "Prepare WhatsApp for salesperson" | No incoming connection | Reconnect from "PDF ready?", true output. **Confirmed** from execution 384 (16 Nov) |
| SST 2 | "Prepare complaint alert" | No incoming connection, so "WhatsApp the manager" and "Email the manager" are dead | Reconnect from "Existing shipment or complaint?", true output. **Confirmed** from executions 181, 1187 and 1233. "WhatsApp the manager" and "Email the manager" both hang off it |
| SST 2 | "WhatsApp the salesperson (no draft)" | No incoming connection | Reconnect, probably from "Prepare lead without draft". **Not confirmed**: this step never ran in any stored execution |
| SST 2 | "Email lead to salesperson", "Email lead (no draft)" | Recipient hard-coded to the test address | Point back at the salesperson's email from "Pick salesperson" |
| SST C | "Read holidays" (start of the reminder chain) | No incoming connection; the schedule only feeds "Read chats" | Reconnect "Every hour, 08:00-17:00" to "Read holidays". **Confirmed** by the restore note saved on the SST C version |
| SST L | "WhatsApp Aabel (SST W)" | Disabled | Enable |
| SST P | whole workflow | Unpublished; fully wired otherwise | Publish |
| Sales Team tab | WhatsApp and email columns | Test values; real ones in the notes column | Restore real values |

How the wiring was confirmed (19 Nov, read-only): n8n keeps only the latest version of each
workflow, so version history could not show the old links. The stored executions from before
the lockdown could: each step records which step fed it. The lockdown itself was the version
named "TESTING: record leads only, send nothing", published 17 Nov at 10:15 UTC.

One link is still a guess: "WhatsApp the salesperson (no draft)". It did not run in any
execution n8n still holds. Its sibling "Email lead (no draft)" is still connected, and the
step feeding that is the most likely source. Check it against the restore doc or the
12 November backup before go-live.

What still sends during testing:

- Customers get the full flow from SST 1 (replies, buttons, forms), the SST C follow-up
  nudge for unfinished enquiries, and the SST G holding reply.
- SST 1 "WhatsApp Vishnu: credit out" messages one fixed personal number if the Claude
  credit runs out. It does not go through SST W.
- SST 2 lead emails go to the test address.
- SST E "Email the error" goes to a fixed company Gmail address on any workflow failure.
  This is not the test address.

Things to know:

- SST C being published is consistent with testing: its only live path is the customer
  nudge. The salesperson and manager reminders in it are disconnected, so `sst_chasers` is
  not being updated.
- Complaints, escalations and callbacks currently raise no notification at all, not even to
  the test address. They are only written to the Leads sheet.
- SST 1 "Tell customer they are alerted" is still live, so some customers are told a named
  salesperson has been alerted when nothing was sent.
- `sst_outbox` holds two unsent rows from 16 November addressed to a real salesperson's
  number. They are older than the 3-day pickup window and the sender is gated off.
- SST 1 "Who sent it?" contains a backup list of the four real staff numbers, used only if
  the Sales Team tab reads empty. Inert while the gate above is false.
- SST P would send to whatever the Sales Team tab holds if published or run by hand.
- SST 1 form id in use: `29363394833300676` (published). Blocked number list has one entry.
  Webhook path: `sst-bot`.

### Full customer-side audit, 19 November 2026 (read-only)

Five reviewers read SST 1 in full, the Claude prompts and 26 real runs, form v22, all 222
logged exchanges, and the supporting workflows and data. Nothing was changed, run or sent.

- Merged list of 40 customer-side items, with proposed fixes and the decisions needed:
  `SST_BOT_AUDIT_FINDINGS.md`
- Detailed write-ups with evidence and node-level changes: the `audit/` folder
  (phone numbers and emails redacted)
- Sales-side findings are parked at the end of the findings file.
- No fix has been applied. Each waits for the owner's approval.

## 4. Open questions for the owner

1. **Restore doc and migration doc not found.** Nothing in Google Drive or Docs under this
   account matches them. They may live only in the original Claude account's project.
2. **SST C is published.** The setup notes say SST C and SST M stay unpublished until
   go-live. SST M is unpublished; SST C is live and running. Left as found.
3. **SST P and SST F are unpublished.** Possibly intended. Left as found.
4. **Route A steps 2 to 5** were missing from the setup notes that were pasted in.
5. **Sales Team tab is in test mode.** All four salespeople point at one test WhatsApp
   number and one test email; the real ones are parked in the notes column. Whether any
   WhatsApp message can still reach a real salesperson is being checked (see section 3).

## 23 Nov 2026 — Form v24c draft accepted by Meta (not published)

- T8 "Form definition" replaced with the v24c source (T8 version `5a9122a8-d3a2-4b28-99f4-ca6798ae44bf`); verified identical to `bot_build/v24/v24_form_definition.js`.
- SST 1 draft "Read message" replaced with the v24 reader (draft version `9f2ffcac-b79b-4fab-bf11-a897cae0270d`). **Live SST 1 is unchanged** (`67cb73a4-2809-4b89-b2dd-7e1ca1ce7281`).
- Meta draft form `2709352036165185` ("SST service form v24c one page per service"): **0 validation errors**. T8 "Form preview" now points at it.
- Not yet done (waiting for the owner's approval after the preview): publish the form, switch SST 1 to the new form id, publish SST 1, live tests with dummy numbers.
- Failed drafts still to delete with approval: 990727460359037, 1742576754540913, 1822013712443489.

## 23 Nov 2026 — Form v24d (fixes v24c preview errors; not published)

- The v24c preview showed red errors on the first page: four service descriptions were over Meta's 20-character limit. Meta's draft check had not reported them.
- Shortened: Sea "FCL, LCL, bulk, RoRo", Air "Import or export", Warehousing "Storage and handling", Agency "Vessels and crew". The build now refuses descriptions over 20 characters and titles over 30.
- New Meta draft `1479400180965410` ("SST service form v24d one page per service"): 0 validation errors. T8 "Form preview" points at it.
- v24c draft `2709352036165185` is now unused; add it to the drafts to delete (with approval).

## 23 Nov 2026: Form v24d LIVE (owner said "publish it, and yes delete the drafts")

- **Form v24d published** on Meta (id `1479400180965410`). Published forms can't be edited; any change needs a new form.
- **Drafts deleted** (owner approved): 990727460359037, 1742576754540913, 1822013712443489, 2709352036165185.
- **SST 1 published**, version `e50e8895-ecc3-4348-94ab-558656245f1b` (was `67cb73a4-2809-4b89-b2dd-7e1ca1ce7281`). Changes against the old live version:
  - "Read message": v24 reader. Keeps only the chosen service's answers, adds the new questions, fixes Muscat Airport for air, and leaves out "Not in containers".
  - "Build Claude request": the service form id changed to v24d in `FORM` and `PORT_SEARCH_FORM`, plus its note. Checked line by line against the old live version: only those 3 lines differ. This file is not in the repo because it holds staff phone numbers.
- **Rollback:** republish `67cb73a4-2809-4b89-b2dd-7e1ca1ce7281`. The v23 form stays published, so the rollback works straight away.
- **Live tests:** 9 runs (executions 2342 to 2350), one per service, on dummy numbers 999990007240 to 999990007248. No WhatsApp messages were sent. The script is `bot_build/v24/live24.js`.
  - Each run sent the details form and the service form together. Each service form also carried a stray "LEAK SHOULD NOT APPEAR" answer from another service.
  - All 9 succeeded, and the stray answer was dropped every time.
  - Checked: sea export shows Sohar Port as the port of loading and extra free days; air import shows Muscat Airport as the destination and the exhibition question; customs by road shows the number of trucks, no container size and the duty-estimate value; transit shows the empty return and the consignee; project shows "shipped as" and the crane; warehousing shows "arriving as" and delivery areas; agency shows vessel size, days and crew.
  - Test artefact: because both forms arrived in one go, the bot also attached the service-form button to its reply. Real customers send the forms one after the other.
- **Test chats to clear** in sst_chats: phones 999990007240 to 999990007248.

## 23 Nov 2026: Staff numbers were silently ignored (fix saved as a draft, not yet published)

- **Problem:** the owner's test number listed in the Sales Team sheet got no reply after 16 Nov. "Who sent it?" marks that number as staff.
  - Staff commands are switched off ("From the sales team?" is always false), so staff messages go down the customer path.
  - But "Combine messages" still filtered out staff messages (`!m.is_sales`). The run ended there with no reply and no error.
- **Fix (owner approved):** removed that filter from "Combine messages". Draft version `5d593dce-3a5d-4ca2-b3fb-954d14cc5ea0`.
  - Checked with a local simulation: before the fix, a staff-number message was dropped; after it, the message goes through.
  - No other customer-path step checks for staff. "Issues command" and "Log team conversation" are only on the staff branch, which is switched off.
- **Published** after the owner said "publish it": SST 1 live version is now `5d593dce-3a5d-4ca2-b3fb-954d14cc5ea0`. To roll back, republish `e50e8895-ecc3-4348-94ab-558656245f1b`.
- **Check:** a "Hi" from dummy number 999990007250 (execution 2360) still gets the normal welcome and buttons, so ordinary customers are unaffected. Test chat to clear: 999990007250.

## 23 Nov 2026: Automatic import customs clearance quotations (SST 2 draft, NOT published)

Owner's decisions (23 Nov):
- **Scope:** Sohar FCL + LCL + Muscat air only; everything else goes to sales as before.
- **Delivery:** priced when the area is on the transport list, otherwise "to be advised by our sales team".
- **Rollout:** test mode first.
- **Total:** fixed amounts + 5% VAT on our service charges. "If applicable" and "at actual" lines show their amount but stay out of the total.

What was built in SST 2 (draft only; live is still `386fb9f1-50d0-49eb-82b0-c5f996fd3384`):

- **New "Customs auto quote" (Code) and "Straightforward customs?" (IF)**, between "Existing shipment or complaint?" and "Read Master Index".
  - Reads the service form from `history_json`.
  - Quotes only for: English; Import customs clearance; Sea + Sohar Port + FCL (one size, clear number of containers), or Sea + Sohar Port + LCL, or Air + Muscat Airport + Air cargo; dangerous goods "No"; and nothing changed after the form.
  - Lines come from the fixed rates in `SST_CCRO_Fixed_Rates.md`, plus Bill of Entry 15, Documentation 25, PRO 10, transport lanes and VAT 5% on our charges.
  - Fills the standard quotation template, so SST R and the SST 3 commands keep working.
  - Anything else goes to the existing Claude / sales route.
- **"Turn draft into template fields":** two lines at the top pass a ready customs quote straight on. The rest is unchanged.
- **New nodes after "PDF ready?":** "Auto customs quote?", "Send to this customer?", "Send quotation to customer" (WhatsApp document, no retry), "Customs send result", "Sales WhatsApp for customs?", "Prepare customs WhatsApp for salesperson" and "WhatsApp the salesperson (customs)" (SST W). Classic quotes follow the old path unchanged.
- **Records and email:**
  - "Email lead to salesperson" has customs wording for automatic quotes; `sendTo` is unchanged (test address).
  - "Save quote v1" status is `Quoted` when sent, otherwise `Draft`.
  - "Add to Quotes sheet" sets `created_by` to `Rate table`, and `approved` to `Auto` when sent.
- **Test mode** (`MODE = 'test'` in "Customs auto quote"):
  - The PDF and the salesperson WhatsApp go only for the owner's tester numbers. Dummy 99999 numbers never get WhatsApp messages.
  - Real customers' customs quotes are built and emailed to the test address, marked "NOT sent (test mode)".
  - Go live = set `MODE = 'live'`.
- **Tests:**
  - Local: 18 cases (8 quoted, 10 sent to sales), sums checked by hand.
  - Draft run 2403 (dummy 2 x 40ft, delivery to Rusayl): total OMR 385.500, 2-page PDF on letterhead, email to the test address, WhatsApp skipped.
- **Test residue to clear:** `sst_quotes` row id 21 (SST-261123-TCQ1), its Google Doc in Quote drafts (bot), and the test email.
- **Code copies:** `bot_build/customs_quote/` (tester numbers removed).

## 23 Nov 2026: Automatic customs quotations PUBLISHED (test mode)

- **Published** after the owner said "publish it": SST 2 version `825360be-c1e1-476b-bbfe-2f920a88c2ac`.
- **Fix, then republished:** SST 2 version `1dabb7bc-c8e9-4fd7-91db-104986e5b83e` (live). The after-form check now only sends an enquiry to sales for new numbers or change words. "I'll send them later", "that's correct", "ok thanks" and file messages are fine, and time stamps are stripped line by line.
- **Rollback:** republish `386fb9f1-50d0-49eb-82b0-c5f996fd3384`.
- **Live end-to-end test** on dummy number 999990007262: details and customs form, then "I'll send them later", then "Yes, confirm".
  - Reference SST-261123-HLYF. SST 1 executions 2405 to 2407, SST 2 execution 2408.
  - Quoted automatically: 1 x 20ft, Sohar Port, delivery to Sohar Industrial Estate. Total OMR 124.260 = port 20.010 + customs 50.000 + transport 50.000 + VAT 4.250.
  - PDF rendered and email sent to the test address. Round robin picked the next salesperson.
  - WhatsApp to the customer and to the salesperson skipped (dummy number), as designed.
- **Test residue to clear:**
  - sst_chats phone 999990007262.
  - sst_quotes rows SST-261123-TCQ1 (id 21) and SST-261123-HLYF.
  - The Leads and Quotes sheet rows for SST-261123-HLYF.
  - Two Google Docs in Quote drafts (bot).
  - Two test emails.
  - The test used one round-robin turn.
- **Still in test mode** (`MODE = 'test'`): the customer PDF and the salesperson WhatsApp go only for the owner's tester numbers. Go live = `MODE = 'live'`.

## 23 Nov 2026: Customs auto quotes LIVE for every number

- **Owner:** "let any number that text the number get quotes as well for import customs clearance".
- **Change:** "Customs auto quote" `MODE` is now `'live'`; nothing else changed (checked with the version diff). SST 2 version `1176a1a4-2804-4779-af91-c6242049f79a` published.
- **Now:**
  - Every real customer with a straightforward import customs enquiry gets the quotation PDF on WhatsApp.
  - The salesperson whose turn it is gets the WhatsApp copy, through SST W, at the number in the Sales Team sheet.
  - The salesperson email still goes to the fixed test address. That is the testing-phase switch for sales emails, unchanged until "go live".
  - Dummy `99999` numbers never get WhatsApp messages.
- **Rollback to test mode:** republish `1dabb7bc-c8e9-4fd7-91db-104986e5b83e`. Off entirely: `386fb9f1-50d0-49eb-82b0-c5f996fd3384`.
