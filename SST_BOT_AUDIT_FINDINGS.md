# SST WhatsApp bot: audit findings, 19 November 2026

Read-only audit of the customer side of the bot. Nothing was changed. No fix below has been
applied; each needs the owner's approval first.

- Scope: customer's first message, the WhatsApp forms, the chat, a confirmed enquiry landing
  as a lead and going to the test email. The sales side is parked (see the end).
- Five reviewers read: SST 1 in full, the Claude prompts and 26 real runs, form v22, all 222
  logged exchanges, and the supporting workflows and data.
- 134 raw findings, merged here into 40 customer-side items. The codes in brackets (A4, B3,
  ...) point to the detailed write-ups in the `audit/` folder, which hold the evidence and
  the exact node-level change for each.
- Three independent reviewers flagged the same three things: the dangerous-goods rule that
  contradicts itself, Claude being called to produce fixed sentences, and customers hearing
  nothing after an enquiry is confirmed.

Status key: **Confirmed** = seen in a real run or log. **By reading** = traced in the code,
not reproduced.

## Group 1. Customers get no reply, a wrong reply, or lose their enquiry

| # | Problem | Proposed fix | Status | Risk of the fix |
|---|---|---|---|---|
| 1 | "Thanks", a cancel request or "call me" sent a day or more after confirmation wipes the confirmed enquiry and its reference. A cancellation is then logged as "cancelled before confirming". [A4, B3] | In "Build Claude request": give "thanks" a fixed line, and skip the 24-hour reset when the message is a cancel or call-back request. | By reading | Low. One node in SST 1. |
| 2 | After an enquiry is confirmed the chat goes quiet. Typed "New enquiry", "Hello", "Please respond" are only "passed to the salesperson"; 13 customer messages got no reply. [D4, A16, A25, D20] | Recognise a typed "new enquiry" the same as the button, and always send the customer an acknowledgement after confirmation. | Confirmed | Medium. Changes post-confirmation routing in SST 1. |
| 3 | A customer's first stated need is dropped from the history when "New enquiry" is tapped a few seconds later; the bot then asks which service, and the lead is saved without part of the request. [D2] | Keep the held text in the history when a menu tap follows it. | Confirmed | Low. |
| 4 | An either/or question ("cancel or keep?") was sent with only a "Yes, confirm" button. Two taps later it went to a manager and made a second lead row. [D3, D11] | Attach "Yes, confirm" only to the final summary. Give either/or questions two labelled buttons or none. | Confirmed | Low. |
| 5 | Dangerous goods and mandatory documents: the rule lives only in the prompt, contradicts itself ("ask once" against "hold until received"), and leaves a customer without the document no way forward. One enquiry was confirmed with no safety data sheet; another was refused 30 minutes later. [C1, C2, D6, B4, C22] | **Needs your decision** (see Decisions, 1). Then enforce the chosen rule in "Read Claude answer", not just in the prompt. | Confirmed | Medium. |
| 6 | Testers whose number is on the Sales Team tab get no reply at all: the "From the sales team?" gate is forced false, but "Combine messages" still filters them out. The watchdog then retries twice and sends a holding reply. [A1] | In "Combine messages", stop filtering on `is_sales` while the testing gate is on. | Confirmed | Low, but it touches a testing switch and must be reversed at go-live. |
| 7 | If the WhatsApp reply fails to send, the chat is already saved as confirmed and the lead hand-over never runs. [A5] | Run the hand-over before the reply, or let it run when the send fails. | By reading | Medium. Reorders steps in SST 1. |
| 8 | Quick follow-up messages can be answered twice, and after an AI failure a message drops out and is replayed out of order. [A6, A7, D15, A19] | Mark messages as processed before the reply goes out; load the chat row after the pause, not before. | By reading (D15 confirmed) | Medium. Timing changes in SST 1. |
| 9 | A watchdog retry turns a button tap into typed text, so it takes the wrong route. [A8] | Pass the original message type through the retry. | By reading | Low. SST G and SST 1. |
| 10 | A failed AI answer waits up to an hour for the watchdog, or overnight. The notes and the Issues Log promise "a few minutes". A real case took from 10:19 to 13:00. [A2, E2, D12, A27] | **Needs your decision** (see Decisions, 2). | Confirmed | Depends on the option. |
| 11 | The bot says a named salesperson "has been alerted and will be in touch shortly" when nobody is alerted, and makes other promises nothing backs up. [A10, D13] | Neutral wording while testing ("our team will be in touch"), and no time promises outside office hours. | Confirmed | Low. Reverse at go-live if wanted. |
| 12 | A mistyped special-hours cell on the Holidays tab makes "Build Claude request" fail for every customer. [A15, E29] | Guard the parsing so a bad cell is ignored. | By reading | Low. |
| 13 | "Save chat" switches a stopped bot back on after a form answer. [A9] | Leave the paused flag alone unless the customer or team changes it. | By reading | Low. |
| 14 | Menu, fixed-line and voice replies are marked answered even if the send fails; some paths drop a message with no reply. [A18, A25, A29] | Mark answered only on a successful send; give the dropped paths a fallback line. | By reading | Low. |

## Group 2. The forms

Most of these need a new published form (v23). Published forms cannot be edited, so each
change means a new form, a publish, and a switch of the form id in SST 1.

| # | Problem | Proposed fix | Status | Risk of the fix |
|---|---|---|---|---|
| 15 | A customer who types their shipment details first is sent a blank form and asked for everything again, or gets a long list instead of the form and leaves (3 of 3 cases). [C3, D10, D1] | Always send the form, pre-filled with what the customer already said. | D10 confirmed; C3 by reading | Medium. Needs form pre-fill support checked first. |
| 16 | The details form is asked for repeatedly: 16 times by 3 numbers; one chat asked for company and position four times in seven minutes. [D1, B14] | Remember a number's details and skip the details form when they are on file; use the WhatsApp profile name. | Confirmed | Medium. |
| 17 | Half the customers who finish the details form never finish the service form (8 of 16). Mostly testers, but the gap is real. [D7] | Send the service form in the same turn as the details acknowledgement, or merge the two. | Confirmed | Medium. Design choice. |
| 18 | The form accepts "Import into Oman" with loading port Sohar, forcing a three-question follow-up that lost the customer twice. [D5, C8] | Work out import or export from the ports chosen, or block the contradiction in the form. | Confirmed | Needs v23. |
| 19 | "Another port" and "A road border" have no follow-up field; land and customs forms have no from/to although the prompt calls those essential. [C5, C13] | Add the follow-up fields. | By reading | Needs v23, and the two screens are at 99 of Meta's 100 components [C4], so something must be freed first. |
| 20 | Loose bulk cargo must give a largest-piece size and heaviest-piece weight; weight, volume and dates have no "not sure"; LCL and air must give both package size and volume, and the bot then queries the mismatch. [C6, C7, D9, D18] | Make those fields conditional or optional. | C7 confirmed | Needs v23. |
| 21 | Weight entered in tonnes can land in `weight_kg` unconverted. [C9] | Convert in "Read message". | By reading | Low. No new form. |
| 22 | Two answers reach Claude as raw codes, and "Sohar Port" becomes "Sohar". [C10] | Map them to their labels in "Read message". | By reading | Low. No new form. |
| 23 | Wording: the form calls LCL "Shared container", which the prompt bans; services have up to four names across form, prompt and code; exports are shown an import description; smaller wording points. [C11, C12, C15, C16, C17, D16] | One name per service everywhere; fix the labels. | By reading | Labels need v23; code and prompt do not. |

## Group 3. Usage and tokens

| # | Problem | Proposed fix | Estimated saving | Risk |
|---|---|---|---|---|
| 24 | Every reply re-sends all 17 lead fields and every flag, because the reply format marks them all required. Output is about 47% of chat cost. [B1] | Make the fields optional and return only what changed; merge in "Read Claude answer". | 16 to 21% per enquiry | Medium. Touches the reply format and its parser. |
| 25 | Three of the seven turns in a form enquiry (greeting, "New enquiry" tap, details form) get a fixed reply the code already forces, but Claude is still called. [B2, C14, D19] | Skip the Claude call on those turns. | About 17% per enquiry, 2 to 3 seconds faster each | Low. |
| 26 | Three Google Sheets reads on every message before the pause, including messages that never reach Claude; `sst_seen_messages` is read in full three times per message and never trimmed. [A13, B21, A26] | Read after the pause, once; trim old rows. | Fewer calls, faster replies | Low to medium. |
| 27 | Large files are sent to Claude as base64 and re-sent on every retry; every customer file is downloaded twice and stored in two Drive places. [A12, A11, E7] | Send the file once; keep one Drive copy (SST D's). | Fewer tokens on file turns; half the Drive writes | Medium. |
| 28 | About three in four SST 1 runs are sub-second runs with no customer message (delivery-status webhooks), roughly four per bot reply. [A14, B22] | Cannot be removed: Meta sends these on the same subscription. Can be made lighter by exiting at the first step. | Small | Low. |
| 29 | An outside advertiser received ten long image-reading replies. [D8, D14] | Stop replying to a number after repeated off-topic messages; fix the repeat detector, which caught the advertiser but missed the real loops. | Avoids waste on spam | Low. |
| 30 | First message after a five-minute gap pays a full cache write (4 of 21 calls). [B12] | Leave as is; a longer cache costs more than it saves at this volume. | None | n/a |

## Group 4. Security

| # | Problem | Proposed fix | Status | Risk |
|---|---|---|---|---|
| 31 | The bot's webhook accepts any post. There is no check of Meta's signature, and the verify token sits in plain text in a step. A forged post could send WhatsApp messages, spend Claude credit, or wipe a customer's chat with the rerun command. [A3, E1] | Check Meta's signature on every incoming post; give the watchdog its own secret header; move the verify token into a credential. | Confirmed (no check exists) | Medium. A wrong check would block all messages, so it needs a dry run first. You would type the app secret into n8n yourself. |

## Group 5. Prompt contradictions and housekeeping

| # | Problem | Proposed fix | Risk |
|---|---|---|---|
| 32 | The "thank you" rule contradicts five other instructions; call-back requests are covered by two conflicting rules; after-confirmation rules are stated twice with different wording. [B5, B6, B7] | One rule for each, stated once. | Low. Prompt only. |
| 33 | The reply format is defined in three places and one omits a stage; `max_tokens` is set twice with different values; start-button choices are also written in the text. [B8, B16, B15] | Single definition for each. | Low. |
| 34 | Services, office hours and other facts are held in several places with different wording; the FAQ and the prompt disagree on export customs clearance. [B13, E24] | **Needs your answer**: do you offer export customs clearance? Then one source for each fact. | Low. |
| 35 | SST D has no error handling and is called without waiting, so a document that fails to save is invisible; files can be skipped or duplicated; documents sent before a complaint are filed under the wrong case. [A17, E5, E6, A30, E33] | Give SST D the error workflow; tighten the folder logic. | Low to medium. |
| 36 | Four sheet writes let Google reinterpret values: phone numbers lose "+", dates are reformatted, text starting with "=" could become a formula. [E15, E26, E27] | Write those cells as plain text. | Low. Existing rows stay as they are. |
| 37 | If Google Sheets is unavailable, the lead hand-over fails after the customer was told the enquiry is confirmed. [E17] | Retry, and keep the lead in the data table so it can be written later. | Medium. |
| 38 | Sticky notes and comments describe behaviour the steps no longer have; dead variables; the same ids typed in many steps. [A20, A21, A22, A23, B23, C18, E25, E37] | Correct the notes; remove dead code; no behaviour change. | Very low. |
| 39 | SST F is no longer used by the form; T8 holds dead form ids and its "Form preview" points at a form that is not v22; the details form's definition is in no workflow, so it cannot be rebuilt. [C19, C18, C20, C21] | Mark SST F unused; clean T8; save the details form definition into T8. | Very low. |
| 40 | Test rows sit in data the bot learns and reports from. [E20, D17] | Leave until go-live; already on the go-live checklist. | n/a |

## Decisions needed from the owner

1. **A customer has no safety data sheet or mandatory document. What should the bot do?**
   - (a) Confirm the enquiry anyway and mark it "documents pending". Recommended: the lead is
     not lost and sales can chase the document.
   - (b) Refuse to confirm until the document arrives (the stricter of today's two behaviours).
2. **How should a failed AI answer be recovered?**
   - (a) Retry inside the same run after a short wait, and keep the hourly watchdog as a
     backstop. Recommended: no extra scheduled runs.
   - (b) Run the watchdog every 5 minutes, all hours. Simple, but about 8,600 scheduled runs a
     month, which may matter on your n8n plan.
   - (c) Leave the timing and only correct the wording that promises "a few minutes".
3. **Do you offer export customs clearance?** The FAQ and the prompt disagree.
4. **Form v23.** Items 15 to 20 and 23 need a new published form. Approve building it as a
   draft first, for you to review before it is published and switched on?

## Suggested order

1. Group 1 items that are one-node changes in SST 1 (1, 3, 4, 6, 11, 12, 13), then a check.
2. Group 3 items 25 and 24, then a check against real token figures.
3. The rest of Group 1 (2, 5, 7, 8, 9, 10, 14), one at a time, each with a dry run.
4. Group 4 (security), with a dry run before it goes live.
5. Group 2: build form v23 as a draft for review.
6. Group 5 housekeeping.

Every change to SST 1 means saving and republishing the live customer chat. Each batch will
be dry-run with pinned data first, no real WhatsApp message will be sent in testing, and
every change will be written to `SST_BOT_CHANGE_LOG.md`.

## Parked: sales side (not part of this phase)

Kept for the sales-side phase; details are in `audit/E_supporting.md` and
`audit/B_claude_tokens.md`.

- Quotation edits beyond 4 groups of 6 lines stay in the total but vanish from the PDF. [E3]
- SST W sends only the short template inside the 24-hour window; the full text is lost. [E4]
- Enquiry status is held in both the Leads tab and `sst_quotes` and drifts. [E8, E9]
- "stop" and "pause" act on the customer's phone, not the enquiry. [E10]
- Quotation date and validity are reset by every edit. [E11]
- Round-robin turns are lost to failures; the `order` column it sorts by does not exist. [E13]
- Go-live depends on the unpublished SST P, and 6 of 10 WhatsApp templates have no
  definition in the instance. [E18]
- Quote drafting: past quotes are sent even when the route does not match, and half the
  output is thinking. One quote costs about as much as a whole customer chat. [B9, B10, B11]
- Smaller items: E12, E14, E16, E19, E21 to E23, E28, E30 to E32, E34 to E36, E38, B17, B18.

## What the audit could not check

- The details form (id ending 5940): its definition is in no workflow.
- Form v22 against real use: only seven service forms were ever submitted, all on earlier
  versions. v22 was checked by reading the code that builds it.
- The live form on Meta was assumed to match what T8 builds.
- Only 26 of about 1,078 SST 1 runs were opened, so rare paths may have been missed.
- Token savings are estimates from token counts with assumed price weights, not money.
- No live test was run. Items marked "by reading" were not reproduced.
- There are no Arabic conversations in the log.
