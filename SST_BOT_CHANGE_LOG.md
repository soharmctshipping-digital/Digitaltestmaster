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

SST 1 was edited and published on 19 Nov 2026 with the owner's approval (details below). No
other workflow has been changed. No data table row has been added or changed. No WhatsApp message or email has been sent. No
Meta setting, form or template has been touched. One sheet cell has been changed:

| Date | System | What changed | Why | Asked for by owner? |
|---|---|---|---|---|
| 19 Nov 2026 | Google Sheet "SST WhatsApp Leads", tab FAQ, cell B9 (answer to "Do you do customs clearance?") | Was: "Yes, for imports and exports by sea, air and road." Now: "Yes. We clear imports by sea, air and road as a service on its own. For exports, we handle the export clearance as part of shipping your cargo, so you don't need to book it separately." | The FAQ and the bot's prompt disagreed. The owner confirmed export clearance is done as part of handling the export, not offered as a separate option. | Yes |

### SST 1 changes, PUBLISHED 19 Nov 2026 at 09:14 UTC on the owner's instruction

SST 1 now runs version `c998927d-15d7-467c-9605-17e5fea724c0`. The version before this work
was `1ed21e80-703c-4c40-ad56-9c7d53a36833`; to go back, publish that version from n8n's
version history. The rows below are what changed between the two.

| Date | Step | What changed in the draft | Owner's item |
|---|---|---|---|
| 19 Nov 2026 | "Read message" | Ports and clearance points carry full names ("Sohar Port", "Duqm Port", "Salalah Airport"); customs cargo labels match the form; reefer temperature gets "°C"; warehouse location keeps "Muscat (Rusayl)"; a named port under "Another port" is read if the form sends one | Decision 4, item 5 |
| 19 Nov 2026 | "Tell customer they are alerted" | Acknowledgement at most once per 30 minutes instead of once per 4 hours; a shorter "Got your message" line when the customer was already greeted that day | Item 13 |

| 19 Nov 2026 | New steps "Fixed reply?" and "Fixed reply as AI answer" (between "Bot paused?" and "Ask Claude") | A first greeting, the "New enquiry" choice and the details form are answered from code with no AI call; everything after is unchanged | Item 18 |
| 19 Nov 2026 | "Build Claude request" | Fixed thank-you line; cancel and call-back requests no longer reset a confirmed enquiry after 24 hours; typed "new enquiry" acts like the button; a greeting more than 5 minutes after the last message brings the menu back; documents needed are worked out in code from the service form and are never a condition; prompt: forms always used, at most three questions per message without forms, LCL/air "not sure" accepted, "Sohar Port", export clearance not offered on its own; the AI returns only changed lead fields; the whole AI request, answer format included, is built here; max 2,000 answer tokens | Items 1, 2, 12, 13, 16, 17, 18; Decisions 3, 4, 5 |
| 19 Nov 2026 | "Ask Claude", "Ask Claude again" | Now send the request as built (second one with the model swapped to Haiku). The long duplicated answer format was removed from both | Item 17 |
| 19 Nov 2026 | New steps "Second answer usable?" and "Short wait before last try" | If both AI attempts fail, the run waits 20 seconds and tries once more before giving up | Failed-answer recovery |
| 19 Nov 2026 | "Still the newest?" | Also compares documents needed with documents identified; at confirmation writes "Documents not supplied: ..." at the start of the lead's notes, which SST 2 already shows on the sheet and the email | Item 2 |

"Read Claude answer" is unchanged. Draft version id after these saves: `c998927d-15d7-467c-9605-17e5fea724c0`.

Checks done on the draft: (1) read back from n8n and compared with the tested files: all six
code steps match; (2) offline tests in `bot_build/` (15 message scenarios and a land-freight
enquiry with dangerous goods through to confirmation); (3) one n8n dry run, execution 1891,
with pinned data and the dummy number 999990007101: greeting answered from code, no AI call,
nothing sent to WhatsApp. Not yet checked: real AI answers with the new prompt and answer
format. That needs the draft published and a real test chat.

Test rows created by the dry run (dummy phone 999990007101, safe to delete at go-live):
one row in `sst_chats` (id 17), one in `sst_seen_messages` (message id wamid.DRYRUN-A1) and
one in `sst_conversation_log`.

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
