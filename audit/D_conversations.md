# D. Evidence from real conversations

Sources read in full: Google Sheet tab `Conversations` (222 rows, 16 Nov 14:35 to 19 Nov 10:26), data table `sst_conversation_log` (63 rows, 17 Nov 16:07 to 19 Nov 10:26), `sst_chats` (5 rows), tabs `Leads` (11 rows), `Unfinished` (8 rows), `Issues Log` (8 rows). All times are Oman time. Conversations are referred to by date and last 4 digits of the number. Nearly all traffic is from the team's own test phones (3824, 4730, 5731, 9790); 0708 is an outside business broadcasting adverts.

## Numbers

| Measure | Value | Notes |
|---|---|---|
| Rows in Conversations tab | 222 (200 real, 22 blank) | 18 of the blank rows carry only `language = en` (see D17) |
| Rows in `sst_conversation_log` | 63 | Table only starts 17 Nov 16:07; the 63 rows match the sheet's last 63 rows one for one (sheet stamp is 1-2 s earlier) |
| Numbers seen | 5 in the log (+2 test numbers, 7101 and 0794, seen only in sst_chats / Unfinished / Issues Log) | |
| Conversations (a fresh greeting or a "rerun" wipe starts a new one) | 24 | 3824: 10, 4730: 9, 9790: 3, 5731: 1, 0708: 1 |
| Confirmed enquiries | 9 | H3Q9, RUNS, ZBGF, U6K6, 22UX, GHUA, TPYY, EJRS, HK4H |
| Leads rows / references issued | 11 | 9 enquiries + 2 extra "support" references (7SAE, U2DH) raised about an existing enquiry |
| Bot questions per confirmed enquiry (bot turns asking for something, before the summary) | median 5 (2, 2, 3, 3, 5, 5, 15, 18, 18) | Old one-question-at-a-time chat (16 Nov, 3 enquiries): 15 to 18. Form flow (17-18 Nov, 6 enquiries): 2 to 5, median 3 |
| Conversations with at least one repeated question | 8 of 24 | 3 asked for something already given (D1, D2, D6); 5 re-asked an unanswered or misunderstood question (D3, D4, D5, D8, D9) |
| Most commonly repeated question | Personal details (name / company / contact) | Details form filled 16 times by 3 numbers; inside one chat the worst case is company name and position, asked 4 times in 7 minutes (D1) |
| Question with most drop-offs | "Now pick your service in the next form" | 16 details forms submitted, only 8 followed by a service form. 7 conversations end right there, 1 more stalled 16.5 h, 1 customer typed "Hi" instead (D7) |
| Other drop-off points | Long multi-item list: 3 of 3 abandoned (D10). Dangerous-goods / MSDS questions: 3 (D5, D6). Volume check + documents: 1 | |
| Unfinished tab | 8 rows for 4 numbers | 2 rows have an empty `last_question_asked` |
| Bot replies written by Claude | 171 | median 22 words; longest 96 words |
| Messages "passed to the salesperson" with no reply to the customer | 13 | all on 3824 (D4) |
| Late replies caused by AI retry | 2 seen (5 min and 10 min) | D12 |
| Issues Log entries | 8 | "AI did not answer first time - retrying" 3 · "Customer did not receive a WhatsApp message" 2 · "Bot asked the customer the same question three times" 1 · "AI tried to state a price" 1 · "Bot could not reply after automatic retries" 1. Ids run 5 to 18 with gaps (8, 10, 12-15 missing from the tab) |

---

## High

### D1. Company name and position asked four times in one chat, then a 7-item list; customer left
- Category: Repeated question
- Severity: High
- Where: SST 1 customer chat → Build Claude request (prompt), 16 Nov 4730, 18:12 to 18:19
- Evidence:
  - 18:12:18 bot: "2. Are you enquiring as a company or as an individual? If a company, please give the company name and your position."
  - 18:13:03 customer: "Yes my name is Vishnu, / Company / And you can WhatsApp me" → bot: "what's your company name and your position there? And which service do you need?"
  - 18:13:29 customer taps "Sea freight" → bot: "I still need your company name and your position there, please. Is this shipment an import or an export? And is it a full container load..."
  - 18:19:45 customer: "Nexara / Import / FCL" → bot: "1. Your position at Nexara 2. Shipping terms... 7. Do you need delivery..." (86 words, 7 items). No further reply from the customer.
- Impact: The customer was asked for the same optional detail four times and then given seven questions at once. The chat was abandoned. The Issues Log "same question three times" detector did not fire for it.
- Proposed fix: In the prompt, make "position" optional and never re-asked: ask once, and if it is not given, record blank and move on. Limit any free-text turn to at most 3 questions. (The details form introduced on 17 Nov removes most of this, but the same prompt path is still used when the form is skipped, see D10.)
- Risk of the fix: Fewer leads will have a position recorded. No testing switch touched.
- Confidence: Confirmed

### D2. Customer's first stated need was thrown away, then asked again; "delivery" never reached the lead
- Category: Repeated question
- Severity: High
- Where: SST 1 customer chat → message intake / history save (two messages 7 s apart), 16 Nov 5731; Leads row SST-261116-RUNS
- Evidence:
  - 15:16:54 customer: "I need rates for clearance and delivery" → bot: "May I confirm your name is Vishnu Suvarnan?"
  - 15:17:01 customer taps "New enquiry" → bot: "May I have your full name, please?" (the name question changes form; the stated need is gone)
  - 15:19:48 bot: "Which service do you need for this enquiry?"
  - `sst_chats.history` for this number starts at "[15:16] New enquiry"; the 15:15 "Hi there" and the 15:16 "I need rates for clearance and delivery" turns are not in it.
  - Leads RUNS: service "Customs clearance (import)", special_needs "None". Delivery is nowhere.
- Impact: The customer had to restate the service, and the confirmed lead is missing half of what was asked for (delivery). A salesperson would quote clearance only.
- Proposed fix: Tapping "New enquiry" must not discard turns from the current session; keep the last free-text message and feed it to Claude as context ("customer already said: ..."). If two messages arrive within a few seconds, process them as one turn (the batching that exists later, on 17 Nov, shows this is possible) and make sure the second run reads the history the first run saved.
- Risk of the fix: Carrying text over could pull stale text into a truly new enquiry; limit it to messages from the last few minutes.
- Confidence: Confirmed for the lost text and the repeated question; Likely for the cause (history reset on "New enquiry" or a save race)

### D3. Either/or question sent with a "Yes, confirm" button; two taps later the matter went to a manager and a second Leads row was created
- Category: Repeated question
- Severity: High
- Where: SST 1 customer chat → stage handling / buttons for `awaiting_confirmation`, 17 Nov 4730, 13:01 to 13:02; Leads row SST-261117-U2DH
- Evidence:
  - 13:01:18 customer: "I dont have an enquiry at the moment" → stage logged as `awaiting_confirmation` although no summary was shown.
  - 13:01:55 customer: "Leave that as well" → bot: "do you want to cancel your sea freight enquiry SST-261117-U6K6 as well, or leave it as it is with our sales team?"
  - 13:02:13 customer taps "Yes, confirm" → bot: "Sorry Vishnu, my last question wasn't clear... type *Cancel* ... or *Keep*"
  - 13:02:40 customer taps "Yes, confirm" again → bot: "I've passed it to our manager... Your reference is SST-261117-U2DH."
  - Leads U2DH: enquiry_type "Needs manager (bot could not handle)", "[Enquiry cancellation unclear]".
- Impact: The customer answered twice and was still not understood, because the only button offered ("Yes, confirm") cannot answer a cancel-or-keep question. A needless manager case and a second reference were created for one enquiry.
- Proposed fix: Only set `awaiting_confirmation` (and so only show "Yes, confirm") when the reply contains an enquiry summary. For cancel-or-keep, send two buttons, "Cancel it" and "Keep it". Phrase the question as a yes/no ("Shall I cancel SST-...?") so a "Yes" tap is meaningful.
- Risk of the fix: Low. Check the place that maps stage to buttons so the normal summary still gets its button.
- Confidence: Confirmed

### D4. After an enquiry is confirmed the chat goes silent: typed "New enquiry" and repeated "Hello" get no reply
- Category: Improvement
- Severity: High
- Where: SST 1 customer chat → paused / follow-up branch ("Log message while paused"), 17 Nov 3824
- Evidence:
  - 15:52:07 enquiry GHUA confirmed. 15:52:20 "Ok / Bye" → "(menu sent: Follow-up / New enquiry / Complaint)".
  - 15:57:22 customer taps Follow-up. 15:57:33 customer types "New enquiry" → "(follow-up – passed to the salesperson)".
  - 15:58:27 "Hi", 15:59:35 "Helloooo", 15:59:38 "Helloooo / Please respond", 16:07:48 "Hi": all "(follow-up – passed to the salesperson)", no reply.
  - Same pattern for the first enquiry: 17 Nov 11:33 "Hi", 11:36 "I have a new enquiry", 15:12 "I have a new enquiry": "(bot paused – passed to the salesperson)".
- Impact: A customer who wants to place a second enquiry is ignored for as long as nobody answers by hand. In testing the sales side is off, so nobody does; at go-live it depends on a salesperson noticing. 13 customer messages got no reply this way. The customer wrote "Please respond".
- Proposed fix: In the paused / follow-up branch, (a) treat typed "new enquiry" (and close variants) the same as the New enquiry button; (b) send one acknowledgement per follow-up burst ("Thanks, I've passed this to the team; they will reply here"); (c) if a greeting arrives more than a few minutes after the last message, show the menu again. Also do not send the three-button menu in reply to "Ok / Bye".
- Risk of the fix: An acknowledgement while a salesperson is typing by hand could look odd; limit to one per 30 minutes. This interacts with the testing switch that mutes the sales side, so test with it both on and off.
- Confidence: Confirmed

### D5. The form accepts "Import into Oman" with loading port Sohar and a foreign discharge port; the three follow-up questions lose the customer every time
- Category: Improvement
- Severity: High
- Where: WhatsApp service form (Form definition in T8) and SST 1 → Build Claude request; 17 Nov 3824 17:01 and 18 Nov 3824 08:40
- Evidence:
  - 17:01 form: "Import or export: Import into Oman ... Port of loading: Sohar, Oman / Port of discharge: Shanghai, China ... Dangerous goods: Yes" → bot asks 3 numbered questions (direction; which item is dangerous and its class or UN number; weight and ready date). No answer.
  - 18 Nov 08:25 "Let's start again" → bot asks fresh or keep → 08:26 "Fresh enquiry" → form sent → 08:31 customer again: "Let's start again a fresh enquiry please" → form sent again.
  - 08:40 second form has the same contradiction (Import, Sohar → Jebel Ali, DG yes) → the same 3 questions again. No answer; chat wiped at 14:20.
- Impact: The form lets the customer enter a route that contradicts the direction, so the bot has to ask again by text. Both times the customer gave up at the three-question message. The customer also had to say "start again" three times.
- Proposed fix: In the form, show only Oman ports for "discharge" when Import is chosen and only Oman ports for "loading" when Export is chosen (or drop the import/export question and derive it from the ports). In the prompt: if the ports contradict the direction, ask that one question alone, with two buttons ("Import to Sohar" / "Export from Sohar"), and hold the other questions for the next turn. Treat "start again" as unambiguous: resend the form straight away, without the "fresh or keep" question.
- Risk of the fix: The form change needs a new form version and id in "Build Claude request". Transit or cross-trade shipments (neither port in Oman) need an explicit option.
- Confidence: Confirmed

### D6. Dangerous-goods handling contradicts itself: one enquiry confirmed with no MSDS, the next one refused without it
- Category: Inconsistency
- Severity: High
- Where: SST 1 → Build Claude request (dangerous-goods rule), 18 Nov 4730; Leads row SST-261118-EJRS
- Evidence:
  - 09:03:25 (frozen food, DG yes): summary and "please send the MSDS" in the same message, with "Tap *Yes, confirm*". 09:05:21 confirmed as EJRS; Leads files_received 0, "MSDS requested from customer".
  - 09:36:36 (steel, DG yes): "I'll need the MSDS before I can confirm your enquiry details."
  - 09:40:41 customer: "Can this enquiry be made without that document at the moment" → bot: "I'm afraid not, Vishnu... I can't confirm the enquiry until the MSDS arrives." Customer left; no lead.
  - On 17 Nov 17:01 and 18 Nov 08:40 the bot instead asked for "class or UN number" and no MSDS at all.
- Impact: Same customer, same morning, opposite rules. The stricter version turned away a customer who had given every other detail. Three different dangerous-goods behaviours were seen in four chats.
- Proposed fix: One rule in the prompt: ask for the MSDS once, and if the customer says they do not have it now, go on to the summary and confirm, recording "MSDS to follow" in the lead. Never block confirmation on a document. Add a form hint next to "Dangerous goods" so that "Yes" is not ticked by mistake (furniture, tools, steel and frozen food were all marked dangerous).
- Risk of the fix: Sales receive some dangerous-goods leads without an MSDS; the lead already flags it.
- Confidence: Confirmed

### D7. Half of the customers who complete the details form never complete the service form
- Category: Improvement
- Severity: High
- Where: SST 1 → sending of the service form after the details form ("Got it, X. Now pick your service in the next form.")
- Evidence:
  - 16 details forms submitted; only 8 were followed by a service form.
  - Chats that end at that message: 4730 on 17 Nov 09:10 and 09:48 and 18 Nov 12:05; 3824 on 18 Nov 16:06 and 16:22 and 19 Nov 08:52 and 10:26. 4730 on 17 Nov 16:16 stalled there for 16.5 h.
  - 17 Nov 08:13 details form done; 08:18 customer types "Hi" → bot: "You can open the service form I sent earlier, or just tap the service you need below."
  - Unfinished tab: 3 of 8 rows have last question "Which service do you need?".
- Impact: The second form is the biggest single drop-off point in the log. Much of this is testers stopping early, but the 08:18 "Hi" suggests the second form is easy to miss, and at go-live a real customer who stops here leaves a name and no enquiry.
- Proposed fix: Merge the service choice into the first form (one form, two screens) or send the service form as the first step and collect name / contact last. If they stay separate, nudge sooner when the details form is done and the service form is not opened (for example after 10 minutes, with the form button again).
- Risk of the fix: A new form version and id; the returning-customer path (which already skips the details form) must keep working.
- Confidence: Confirmed for the numbers; Likely for the cause

---

## Medium

### D8. A broadcast advertiser got ten long AI replies, the same closing question each time, and one nonsense "pricing" reply
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Build Claude request (image handling), price guard, 16 Nov 0708, 14:45 to 22:57; Issues Log ids 6 and 7
- Evidence:
  - 10 advert images in 8 hours, each answered with 55 to 82 words describing the poster, 5 of them ending "Is there something you'd like to ship?".
  - 22:54:45 reply to an image: "Our sales team will share the exact pricing with you directly once we have your details." (Issues Log 7: "AI tried to state a price – reply replaced with the standard pricing message").
  - 10 image files saved to Drive (`file_links` in sst_chats).
- Impact: Ten vision calls and ten Drive uploads for spam; a reply about pricing to someone who asked nothing; and the bot keeps answering a sender that will never engage.
- Proposed fix: Before calling Claude, if a chat in `greeting` stage has sent 2 media messages with no text reply to the bot's question, send nothing more for 24 h (or one fixed line) and do not store the files. Make the price guard ignore numbers the model is only reading back from a customer's image, or let it fall back to the previous off-topic line when the chat has no enquiry.
- Risk of the fix: A real customer who only sends photos would be muted after two; the fixed line should tell them to type what they need.
- Confidence: Confirmed

### D9. Volume check bundled with the documents question; customer answered one, bot had to ask again, customer left
- Category: Repeated question
- Severity: Medium
- Where: SST 1 → Build Claude request, 18 Nov 9790, 16:08 to 16:13
- Evidence:
  - 16:08:52 bot: "two packages of 120 x 130 x 100 cm come to about 3.1 CBM, but the form says 22 CBM. Could you confirm the right volume? Also, would you like to upload any documents now..."
  - 16:13:24 customer sends a PDF → bot: "...total 5,855 RO. Let me know once you've finished sending everything. When you reply, please also confirm the correct volume."
  - No reply; nudged 19 Nov 08:00. The same reply read back the invoice total, which the price guard did not catch (compare D8).
- Impact: Two requests in one message; the customer answered the easier one. The enquiry is unfinished over a number the bot could have resolved itself.
- Proposed fix: When package dimensions and count are given, compute the volume and state it in the summary ("Volume: about 3.1 CBM, worked out from your package sizes") instead of asking. Ask the documents question on its own. Do not read back money amounts from customer documents.
- Risk of the fix: If the dimensions were the typo, the computed volume is wrong; the summary shows it so the customer can correct it.
- Confidence: Confirmed

### D10. When the customer states the need in the first message, the bot skips the forms and sends a long list; 3 of 3 abandoned
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Build Claude request (free-text collection path)
- Evidence:
  - 17 Nov 09:05, 7101: "Hi, I want to ship a container from Shanghai to Sohar" → 5 numbered items, about 100 words, asking name, company, position, email, contact, other services, terms, supplier, cargo, packages, weight, volume, size, quantity, date. No reply.
  - 17 Nov 08:18, 4730: taps "Sea freight" → 96-word list of 7 bullets plus 2 more questions. No reply.
  - 16 Nov 18:19, 4730: 7-item list (D1). No reply.
- Impact: Every time the long list was sent, the customer stopped. Customers who went through the forms answered in 2 to 5 bot turns.
- Proposed fix: Always route a new enquiry through the forms, pre-filling what the first message already gave (service, origin, destination). Remove the "send these in one go" list from the prompt, or cap it at 3 items.
- Risk of the fix: Customers on WhatsApp clients that cannot open forms need a fallback; keep the text path only for them.
- Confidence: Confirmed

### D11. A request about an existing enquiry creates a new reference and a new Leads row; the customer was given two references in 22 seconds
- Category: Redundancy
- Severity: Medium
- Where: SST 1 → support / complaint branch; Leads rows SST-261116-7SAE and SST-261117-U2DH
- Evidence:
  - 16 Nov 3824, 14:49:04: "Can we put a rush on this?" → "I have flagged it as urgent under reference SST-261116-H3Q9."
  - 14:49:26: "But I have an urgency" → "Your reference is SST-261116-7SAE."
  - Leads: 7SAE is a second row for the same customer, type "Existing shipment / complaint", assigned to a different person (Aabel) from the enquiry itself (Russel). U2DH (D3) is the same pattern.
- Impact: The customer had to repeat the request and now holds two references for one shipment. Two Leads rows, two owners, and the Leads count overstates enquiries (11 rows, 9 enquiries).
- Proposed fix: For a follow-up on an existing reference, add a note to that row (additional_info and a priority flag) and reply with the existing reference only. Create a new row only for a complaint that has no enquiry.
- Risk of the fix: The manager view that lists support cases would need to read the flag instead of separate rows.
- Confidence: Confirmed

### D12. Two replies arrived 5 and 10 minutes late after an AI retry; the customer had to ask "Hello?"
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Claude call retry path (message ids `retry1:...`); Issues Log ids 11, 16, 17
- Evidence:
  - 17 Nov 3824: Issues Log 15:29 "AI did not answer first time" for "no leave it"; reply logged 15:34:08.
  - 17 Nov 4730: Issues Log 16:03 for "New enquiry"; reply logged 16:13:36 to "New enquiry / Hello?", starting "Hi, I'm here, sorry for the wait."
  - Just before, at 16:02:13, two button taps were merged into one message ("New enquiry / Existing shipment") and the bot replied "I'm not sure which one you meant, as both were selected", then "I couldn't make out that message" to ".".
- Impact: Normal replies take 5 to 10 seconds; these took 5 and 10 minutes with nothing sent in between. The customer sent three more messages while waiting.
- Proposed fix: Retry the Claude call inside the same run after a few seconds (2 quick attempts) before handing over to the slow retry, and send a short holding line if the first attempt fails. When two different button taps arrive together, use the last one.
- Risk of the fix: Longer single executions; a holding line followed by a quick real reply is two messages.
- Confidence: Confirmed for the delays; Likely for the cause

### D13. The bot makes promises that nothing backs up
- Category: Improvement
- Severity: Medium
- Where: SST 1 → Build Claude request (wording rules) and retry-failure message; Issues Log id 18
- Evidence:
  - 18 Nov 3824, 14:30:46, before the enquiry was confirmed or assigned: "I've passed it to the colleague handling your enquiry anyway."
  - Every confirmation: "Our sales team will be in touch by WhatsApp soon." 16 Nov 14:49: "they will contact you soon by WhatsApp and call."
  - Issues Log 18 (18 Nov 17:00, number 5731, ref RUNS): "Customer message: Sstbot rerun. They were told a member of the sales team will get back to them shortly." This exchange is not in the Conversations tab or the data table, and the chat row for 5731 was not wiped.
- Impact: "Passed to the colleague" was untrue at that point. The rerun test command failed for one number and the customer-facing fallback promised a call-back instead. With the sales side switched off for testing, none of these promises is kept; that is expected in testing, but the first and third are wrong in any mode.
- Proposed fix: Prompt rule: say a file is "saved with your enquiry", never that it was passed to a person. Handle the rerun command before the AI path so it cannot fall into the retry / failure message, and log the failure message in the conversation log.
- Risk of the fix: None for wording. The rerun change touches a testing tool only.
- Confidence: Confirmed for the wording and the Issues Log entry; Needs checking for why rerun failed on 5731

### D14. The "same question three times" detector caught the spammer and missed the real loops
- Category: Improvement
- Severity: Medium
- Where: SST L issues log / the repeat check in SST 1; Issues Log id 6
- Evidence:
  - Only entry of this kind: 16 Nov 17:04, the advertiser (D8).
  - Not flagged: company name and position asked 4 times (D1); cancel-or-keep asked 3 times (D3); MSDS asked 3 times in 4 minutes (D6); "pick your service" sent 16 times.
- Impact: The team's own quality signal reports a non-customer and stays quiet on the cases that lose customers.
- Proposed fix: Compare the stored `last_question` across consecutive turns of the same chat (same or near-same text twice in a row with a customer reply in between), and skip chats in `greeting` stage that have sent only media.
- Risk of the fix: More entries in the Issues Log at first.
- Confidence: Confirmed for what was and was not logged; Likely for the cause

### D15. Quick double messages are handled twice: a menu is sent and, seconds later, the same text is passed on as a follow-up
- Category: Improvement
- Severity: Medium
- Where: SST 1 → message batching and menu branch, 17 Nov 3824
- Evidence:
  - 15:24:30 "hi" → "(menu sent...)"; 15:24:35 "hi / I need to talk to aabel" → "(follow-up – passed to the salesperson)".
  - 15:52:20 "Ok / Bye" → menu; 15:52:23 customer_text "Ok / Bye / Ok / Bye / Take csre / Shhshd" (the first two lines repeated); 15:52:27 "Take csre / Shhshd / Jsnsks".
  - 15:57:22 the Follow-up button is logged as customer_text "The customer has a follow-up on their enquiry and is waiting to hear from you." (internal wording, not what the customer wrote).
- Impact: The customer gets a menu they did not ask for and whose answer is then ignored; the log shows text repeated across rows, so anyone reading it (or a salesperson receiving it) sees the message twice.
- Proposed fix: Wait for the batching window to close before choosing between menu and follow-up, and mark messages already included in a batch so they are not included in the next. Log the button title ("Follow-up") as the customer text.
- Risk of the fix: A slightly slower first reply after a confirmed enquiry.
- Confidence: Confirmed for the log rows; Likely for the cause

---

## Low

### D16. Leads values for the same kind of answer are written in different shapes
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Build Claude request (lead_json rules); Leads tab
- Evidence:
  - service: "Sea freight (FCL)", "Ocean freight (FCL)", "Sea freight – FCL".
  - cargo_ready_date: "ASAP", "23 November 2026", "29 November 2026", "2026-12-04".
  - container_type_qty: "1 x 40ft reefer", "1 x 40 ft", "2 x 40ft, standard (dry)", "1 x 20ft standard (dry)", "2 x 40ft, reefer at 18°C".
  - weight_kg: "Not sure" on 16 Nov, blank from 17 Nov, "15000" on 18 Nov. origin: "Sohar", "Sohar, Oman", "China (port to be confirmed)".
- Impact: The Dashboard and any filtering or counting on these columns will split one value into several. The 16 Nov rows come from the older chat flow, but the 17-18 Nov rows still vary.
- Proposed fix: Take service, container size / type / count, ports and date straight from the form answers in code and let Claude fill only the free-text columns; or give fixed formats in the prompt (ISO date, "N x 40ft dry").
- Risk of the fix: Low.
- Confidence: Confirmed

### D17. 22 blank rows in the Conversations tab; the data table log only starts on 17 Nov 16:07
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → "Log conversation" / "Log menu or ignored message" / "Log message while paused"; Conversations tab
- Evidence:
  - Blank rows after 17 Nov 08:18 (8), after 09:10 (8), after 09:48 (2), near 15:28 (1), 15:34 (1), 15:59 (2). 18 of them contain only `en` in the language column.
  - Test numbers 7101 (17 Nov 09:05) and 0794 (17 Nov 16:03) appear in sst_chats / Unfinished / Issues Log but not in the Conversations tab.
  - `sst_conversation_log` row 1 is 17 Nov 16:07:49; 137 earlier sheet rows have no table copy.
- Impact: The two logs cannot be reconciled for the first day and a half, and some exchanges were logged with empty fields or cleared by hand. Counting rows overstates traffic.
- Proposed fix: If the blank rows come from a log node firing with no message data, add a guard (skip when mobile is empty). Decide which log is the record and say so in the sticky note.
- Risk of the fix: None.
- Confidence: Confirmed for the rows; Needs checking for the cause (may be manual deletion of test rows)

### D18. Implausible form values go through without a check, while a small one is queried
- Category: Improvement
- Severity: Low
- Where: SST 1 → Build Claude request (sanity checks)
- Evidence:
  - 18 Nov 09:36: steel, 1 x 40ft, "Total consignment weight (kg): 50". Not questioned.
  - 18 Nov 09:03: "Frozen food" in a "Standard (dry)" container. Noted in additional_info, not asked; confirmed.
  - 17 Nov 15:16: bananas, reefer "set temperature: 18". 17 Nov 10:12: fruits in dry containers. Not questioned.
  - 18 Nov 16:08: "Gen non haz" with an invoice for phones and tablets (lithium batteries), dangerous goods "No". Not questioned.
- Impact: The salesperson gets leads with details that will need a call to correct. Low because the lead notes sometimes mention it.
- Proposed fix: Put these in the summary as a one-line note for the customer ("Frozen food usually needs a reefer; our team will confirm") instead of a question, so there is no extra turn.
- Risk of the fix: A slightly longer summary.
- Confidence: Confirmed

### D19. Fixed steps are worded differently every time, and two different menus exist
- Category: Token/usage
- Severity: Low
- Where: SST 1 → Build Claude request; greeting and menu nodes
- Evidence:
  - The reply to the "New enquiry" tap has at least 9 wordings ("A quick form will open from the button below for your details, then you can pick your service in the next one." / "...so we know who we're speaking with." / "Tap the button below...").
  - Greeting: sometimes "How can I help you today?" alone, sometimes with "Is this a new enquiry, an existing shipment, or something else?".
  - Greeting buttons are "New enquiry / Existing shipment / Something else"; the menu after a confirmed enquiry is "Follow-up / New enquiry / Complaint".
- Impact: A Claude call is spent on turns whose answer is fixed (greeting "Hi", the "New enquiry" tap, the details-form acknowledgement). In the log these are about 60 of the 171 AI replies. Wording drift also makes the bot harder to test.
- Proposed fix: Send fixed text for those three turns without calling Claude when the incoming message is a bare greeting or a known button, and use one menu wording.
- Risk of the fix: Fixed text needs an Arabic version; a greeting that also contains a request must still go to Claude.
- Confidence: Confirmed for the wording; Likely for the call count (workflow not read)

### D20. A stale "Change something" tap after confirmation leaves the chat hanging
- Category: Improvement
- Severity: Low
- Where: SST 1 → handling of buttons after `confirmed`, 16 Nov 5731, 15:30:40
- Evidence:
  - 15:26:54 confirmed as RUNS. 15:30:40 customer taps "Change something" → "Of course, Aabel. What would you like to change?"; stage stays `confirmed`; no further message. `sst_chats.last_question` is still "What would you like to change?".
- Impact: The customer is invited to change an enquiry that has already been handed over; it is unclear whether a change would reach the Leads row.
- Proposed fix: After confirmation, answer a change request with "Tell me the change and I'll add it to SST-..." and append it to the lead's additional_info.
- Risk of the fix: None.
- Confidence: Confirmed for the exchange; Needs checking whether a post-confirmation change updates the lead

---

## What worked (for balance)
- Returning customer, 17 Nov 9790: "Welcome back, Aabel. Pick your service in the next form" reused company, email and preferred contact from SST-261116-ZBGF; no details were re-asked; Leads row TPYY marked "Y (SST-261116-ZBGF)". Confirmed in 3 minutes.
- Corrections at the summary, 17 Nov 3824 15:50 to 15:52: two changes (date, port) were applied correctly and the Leads row GHUA matches.
- For the 8 confirmed enquiries other than RUNS, the Leads route, service, container and date match what the customer entered.
- The form flow cut bot questions per confirmed enquiry from 15-18 to 2-5.

## Not covered
- Workflow nodes were not read (by design for this slice); causes marked "Likely" are inferred from the logs.
- Reply latency cannot be measured exactly: the log has one timestamp per exchange. Normal latency of 5 to 10 s is inferred from `sst_chats.first_message_at` / `last_message_at` against the log time for two chats.
- Whether the many repeated details forms on 4730 (16-17 Nov, 5 times) were caused by a tester wipe or by the bot is unknown; rerun commands were not logged before 17 Nov 15:13 and the rows in between are blank.
- Issues Log ids 8, 10, 12-15 are not on the tab; `sst_issues` was not read.
- Issues Log id 5 (131047 "more than 24 hours" for 0708 at the minute of its first message) could not be explained from the logs.
- No Arabic conversation exists in the log, so Arabic handling is untested by this evidence.
- Tabs Quotes, Internal team conversation, Sales Team, FAQ, Holidays, Dashboard were not read.
