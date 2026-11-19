# SST WhatsApp bot: approved fixes and build status

Resume point for whoever continues this work (this account or the original one).
Started 19 November 2026. Update the Status column as each item moves.

## Rules for the build

- Customer side only. Leave every testing switch as found (see the restore list in
  `SST_BOT_CHANGE_LOG.md`).
- Edit workflows as DRAFTS. Do not publish until the draft has been tested with pinned data
  and the owner says to publish.
- Never send a real WhatsApp message while testing. Never print or store secrets.
- Log every change in `SST_BOT_CHANGE_LOG.md`, section 1.
- Evidence and node-level detail for each item: `audit/` folder. Codes in brackets.

## Owner's decisions

1. Documents are never mandatory. Ask firmly, once. If the customer cannot supply them or
   asks for help, confirm the enquiry anyway and forward it. Tell the sales team which
   documents are missing, by name.
2. Export: loading port is Sohar Port, pre-selected, not asked. Import: discharge port can be
   any Oman port.
3. LCL and air: package size and volume both required, but "not sure" is allowed and the
   form says so beside the field.
4. Port wording is always "Sohar Port". No raw codes reach Claude.
5. Export customs clearance is not a separate option. FAQ updated (done).
6. Build form v23 as a draft for review before publishing.
7. Failed AI answer: retry inside the same run after a short wait; keep the watchdog as a
   backstop.
8. Customer nudge and watchdog merge into one run every three hours (to be confirmed: the
   owner wrote "3rd hourly run").

Lists for v23, taken from the 333 quotations in the SST CLAUDE Drive folder:
- Import discharge ports: Sohar Port, Duqm Port, Salalah Port, Port Sultan Qaboos (Muscat),
  Not sure.
- Road borders: Al Wajajah (Hatta), Khatm Al Shikla / Hafeet (Al Ain), Rub' Al Khali
  (Saudi Arabia), Not sure. Al Madina and Khazaen are inland clearance points, not borders.

## Approved items

| Owner's # | What | Where | Audit codes | Status |
|---|---|---|---|---|
| 1, 16 | Always send the forms; pre-fill the service form with what the customer typed; keep the rest as a note; remove the long question list; text route only as fallback, max 3 questions | SST 1 prompt + form v23 | C3, D10, D1 | Not started |
| 2 | Work out required documents in code, record "Documents not supplied: ..." on the lead and the email, never block confirmation | SST 1 "Read Claude answer", prompt; SST 2 email | C1, C2, D6, B4 | Not started |
| 3 | Free components on the two screens at 99 of 100 (merge duplicated blocks), target 90 or fewer | T8 "Form definition" (v23) | C4 | Not started |
| 4 | Add a build check in T8 that refuses a form over any Meta limit | T8 | C4 | Not started |
| 5 | "Which port?" box under "Another port"; named borders instead of "A road border" | T8 (v23); SST 1 "Read message" | C5, C13 | Not started |
| 6 | Check Meta's signature on incoming posts, log-only first, then enforce; watchdog gets its own secret; verify token into a credential | SST 1, SST G | A3, E1 | Not started. Owner must type the app secret into n8n |
| 7 | Retry the lead write three times; on failure email the full lead to the test address and let the watchdog write the row later | SST 2, SST G | E17 | Not started |
| 8 | SST D: error reporting, skip a file already saved for that message, single Drive copy | SST D, SST 1 | A11, A17, E5, E6, E7 | Not started |
| 10 | Merge customer nudge and watchdog into one run every three hours; filter the reads | SST C, SST G | E19, A2 | Not started. Confirm interval first |
| 11 | Prepare the list of test rows for the go-live clear-out (read-only) | Sheets, data tables | E20 | Not started |
| 12 | Fixed thank-you line; cancel and call-back never trigger the 24-hour reset | SST 1 "Build Claude request" | A4, B3 | Not started |
| 13 | Typed "new enquiry" acts like the button; one acknowledgement per burst (max one per 30 min); menu again after a gap; no menu in reply to "Ok/Bye" | SST 1 | D4, A16, A25 | Not started |
| 17 | Claude returns only changed lead fields; code keeps the rest. Replay ten past conversations and confirm identical leads | SST 1 reply format + "Read Claude answer" | B1 | Not started |
| 18 | Greeting, "New enquiry" acknowledgement and details-form acknowledgement sent from code, no Claude call | SST 1 | B2, C14 | Not started |
| Decision 7 | In-run retry for a failed AI answer | SST 1 | A2, A7 | Not started |
| Decision 2 | Export POL fixed to Sohar Port; import POD list of Oman ports | T8 (v23); SST 1 "Read message" | D5, C8 | Not started |
| Decision 3 | LCL/air "not sure" hint; bot stops querying the mismatch | T8 (v23); SST 1 prompt | C7, D9 | Not started |
| Decision 4 | "Sohar Port" everywhere; map raw codes to labels | SST 1 "Read message" | C10 | Not started |

## Waiting on the owner

| Owner's # | What | Question |
|---|---|---|
| 9 | Write four sheet cells as plain text so "+" and country codes survive | Owner raised overseas numbers; the fix keeps all country codes. Awaiting a yes |
| 14 | Keep text typed just before "New enquiry" is tapped | Explained; awaiting approval |
| 15 | Mark messages handled before replying; load chat after the pause | Explained; awaiting approval |

## Build order

1. SST 1 draft, stage A: items 12, 13, 18, Decision 4, Decision 7 (small, contained).
2. SST 1 draft, stage B: items 2, 17, and the prompt side of 1/16 and Decision 3.
3. Test the SST 1 draft with pinned data. Ask the owner before publishing.
4. Form v23 as a draft: items 3, 4, 5, Decisions 2 and 3, pre-fill for 1/16.
5. Items 6, 7, 8, 10, 11.
6. Re-audit after each stage.
