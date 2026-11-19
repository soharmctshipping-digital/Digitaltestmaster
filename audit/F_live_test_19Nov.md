# F. Live test of the WhatsApp enquiry bot (SST 1 – Customer chat), 19 November 2026

Tester run against the published workflow `NTuIx1AbdFxb5chR` with dummy numbers only (prefix 9999900072). Nothing was edited, published or archived. 82 test messages were sent between 09:40 and 10:44 UTC (13:40 to 14:44 Oman time), one at a time.

How results were read: for the first chat and for both confirmations the node "Still the newest?" was read from the execution (gives `fallback`, `trigger_handover`, `interactive`). To keep the output manageable, the other steps were read from the data tables `sst_conversation_log` (what the bot understood, its reply, stage, reference) and `sst_chats` (history with "[Buttons shown …]" / "[… form sent]" markers and `lead_json`). So `fallback: false` was seen directly only on the runs read from the execution (chat 01 steps 1 to 6, chat 02 summary, chat 07 confirmation); for the rest, "no fallback" is inferred from normal replies in the log and from a search that found no error, crashed or stuck execution.

## 1. Result in one paragraph

All 13 service variants reached a summary with the two buttons, none was blocked by missing documents, no form was sent twice, the bot never asked for a phone number, never quoted a price, never wrote "shared container", never let a raw option code through, and always wrote "Sohar Port". Every field sent in the forms appeared in the parsed text. Both planned confirmations worked and all four hand-over runs finished with status success. No High defect was found. The main problems are (a) details shown in the summary that are missing from the lead record sales receive, (b) a typed "ok" at the summary confirming the enquiry, (c) a second reference appearing on cancellation and a hand-over/cancel overlap, (d) a customer who types the shipment first still has to fill the whole service form, and (e) summaries that look different in every chat.

Pass/fail count: 22 checks run, 21 PASS (11 of them with defects noted), 1 FAIL/needs decision (typed "ok" at the summary confirms).

## 2. Table of chats

| # | Dummy number | Service / check | Steps (customer side) | Result |
|---|---|---|---|---|
| 01 | 999990007201 | Sea FCL import; B(1) confirmation; C2 "Thanks" and "I have a new enquiry" | Hi, New enquiry, details form, service form, no documents, Yes confirm, Thanks, I have a new enquiry | PASS. Reference SST-261119-6MMM, `trigger_handover` true, `fallback` false on every step. "Thanks" got "You're welcome, Dry. We're here whenever you need us." New enquiry got "Sure, Dry. Pick your service in the form below and I'll take it from there." Defect D2 (position lost). |
| 02 | 999990007202 | Sea FCL export (reefer, individual) | Hi, New enquiry, details, service, no documents | PASS (summary with buttons). Notes R1, D5. |
| 03 | 999990007203 | Sea LCL import, volume "Not sure", EXW | same 5 steps | PASS. Volume not asked again; summary says "Volume: not sure". Defect D2. |
| 04 | 999990007204 | Sea break bulk import | same 5 steps | PASS. Packing list asked by name once, summary reached. Defects D2, D3. |
| 05 | 999990007205 | Sea RoRo import; C7 "ok" at the summary, then gibberish | 5 steps, then "ok", then "asdf ghjk qwe" | Summary PASS. "ok" CONFIRMED the enquiry (reference SST-261119-LXSQ, hand-over ran): see D1. Gibberish after confirmation gave the Follow-up / New enquiry / Complaint menu (fine). |
| 06 | 999990007206 | Air freight import; C7 "ok" mid-enquiry | Hi, New enquiry, details, service, "ok" | PASS. "ok" in reply to the documents question gave the summary, not a confirmation. Left unconfirmed. |
| 07 | 999990007207 | Land freight into Oman from the GCC, dangerous goods yes; B(2) confirmation; C2 cancel | 5 steps, Yes confirm, "Please cancel my enquiry" | PASS. Invoice, packing list and MSDS asked by name once; confirmation not blocked; reference SST-261119-JXCL; `trigger_handover` true; `lead.additional_info` starts "Documents not supplied: commercial invoice, packing list, MSDS (safety data sheet). …". Cancel reply names the reference. Defects D2, D4. |
| 08 | 999990007208 | Import customs clearance by road, break bulk; C4 | 5 steps | PASS. C4 PASS: "our sales team needs the *commercial invoice* and *packing list*" asked once, summary followed. Notes D9. |
| 09 | 999990007209 | Transit Bayan; C3 typed line right after the details form | Hi, New enquiry, details, "it is urgent", service, no documents | PASS. Urgency carried into the reply and the summary ("Priority: Urgent"). Defects D3, D8. |
| 10 | 999990007210 | Project and heavy-lift import, EXW | 5 steps | PASS. Notes D7, R3. |
| 11 | 999990007211 | Warehousing (temperature-controlled) | 5 steps | PASS. Notes D7, R6. |
| 12 | 999990007212 | Container lease | 5 steps | PASS. Note R7. |
| 13 | 999990007213 | Shipping agency, port of call "Another port", service "Something else" | Hi, New enquiry, details, service, answer (port + bunkering), no documents | PASS. Bot asked for the port and the "something else" in one message, then asked about documents in a separate turn (D10). |
| 14 | 999990007214 | C1 typed first message; C7 gibberish mid-enquiry | "Need rates for 500 kg of spare parts by air from Frankfurt to Muscat", details form, "asdf ghjk qwe" | C1 PASS (noted the shipment, sent the details form, no list of questions). Defect D6 (must re-enter everything in the service form). Gibberish: "Sorry, I couldn't make out your last message…", nothing confirmed, PASS. |
| 15 | 999990007215 | C5 Arabic first message | "السلام عليكم", tap "طلب جديد" | PASS. Arabic reply with Arabic buttons, then Arabic questions and no form. Wording defect D11. |
| 16 | 999990007216 | C6 "Something else" then export clearance question | Hi, Something else, question | PASS. "We handle export clearance as part of shipping your cargo, so you don't need to book it separately. We do clear imports by sea, air and road as a standalone service." |

Check-by-check: A = 13 PASS (01 to 13). B(1) PASS, B(2) PASS. C1 PASS, C2 PASS (three parts), C3 PASS, C4 PASS, C5 PASS, C6 PASS, C7 mid-enquiry PASS (2 probes), C7 at the summary FAIL/decision needed.

### Hand-over workflow `XGdyZLt2Hw0NFS1P`

| Execution | Started (UTC) | Duration | Status | Trigger |
|---|---|---|---|---|
| 1904 | 09:44:00 | 78 s | success | Chat 01 confirmation (SST-261119-6MMM) |
| 1930 | 09:57:12 | 70 s | success | Chat 05 typed "ok" (SST-261119-LXSQ), unplanned |
| 1949 | 10:06:14 | 81 s | success | Chat 07 confirmation (SST-261119-JXCL) |
| 1952 | 10:06:53 | 2 s | success | Chat 07 cancellation; finished while 1949 was still running |

Run times of the chat workflow: every run read took 7 to 16 seconds. None over 90 seconds, none in error. Three of my sends were held back by the test tool before the workflow started (about 3, 2 and 14 minutes: executions 1946, 1962, 1964); the runs themselves were normal. One side finding from that: a message whose timestamp was 14.5 minutes old was still processed, so the stale-message guard allows at least that much.

## 3. Defects

Severity: High = wrong or lost business outcome; Medium = sales or the customer gets something wrong or has to repeat; Low = wording or polish.

**D1. Medium (High if the rule "ok must never confirm" is meant to cover the summary). A typed "ok" at the summary confirms the enquiry and starts the hand-over.**
Evidence, chat 05 step 6: customer "ok" after "Is everything correct? Tap *Yes, confirm*, or tell me what to change." Bot: "Thanks, Tester. Your enquiry reference is SST-261119-LXSQ. Our sales team will be in touch by WhatsApp soon." Stage confirmed; hand-over execution 1930 ran. Mid-enquiry the same word is safe (chat 06: "ok" after the documents question produced the summary only).
Likely cause: the prompt or the confirm guard treats any affirmative at stage `awaiting_confirmation` as a yes.
Suggested fix: decide the rule. If only the button or a clear "yes / confirm / correct" should count, have the guard reject bare "ok", "k", "fine", a thumbs-up and similar, and reply "Please tap *Yes, confirm* to send this to our sales team, or tell me what to change."
Note: this created an unplanned third confirmed lead (see section 6).

**D2. Medium. The customer's position from the details form is lost from the lead.**
Evidence: after the details form `lead.additional_info` is "Position: Logistics Manager" (chat 01). After the next AI turn it is overwritten: chat 01 "Documents not available yet; sales team to follow up"; chat 03 "Supplier: Dummy Textiles Pvt Ltd; collection address: …"; chat 04 "Customer does not have the packing list yet; sales team to follow up"; chat 07 "Documents not supplied: … Supplier: Dummy Paints FZE; number of trucks: 1"; chat 09 and 10 the same pattern. Only chat 11 kept it ("Position: Supply Chain; Storage type: …").
Likely cause: the position has no field of its own, and the model rewrites `additional_info` in full on each turn.
Suggested fix: give the position its own lead field (`position`) set by code from the details form and never rewritten by the model, or have the code re-attach it when the lead is merged.

**D3. Medium. Details shown in the summary are missing from the lead record.**
Evidence: chat 09 (transit) summary shows "*Cargo value:* USD 450,000 (for the customs guarantee)" and "*Priority:* Urgent", but `lead_json` holds neither: `special_needs` is "Transit cargo via Sohar Port to Riyadh; needs our trucks; no dangerous goods" and `additional_info` is "Customer has no documents available now; sales team to follow up". Chat 04 (break bulk) summary shows "heaviest 18 tonnes", but the lead has only `volume_or_dims` "Largest piece 12 x 2.4 x 2.2 m" (chat 10, project, did keep "Heaviest piece: 95 tonnes" in `additional_info`).
Likely cause: no dedicated lead fields for cargo value, heaviest piece or urgency, so they depend on the model remembering to put them in a free-text field, which the "no documents" note then replaces.
Suggested fix: add fields (`cargo_value_usd`, `heaviest_piece`, `priority`) or fill `special_needs` by code from the parsed form; write the documents note by code into its own field rather than `additional_info`.

**D4. Medium. Cancellation shows a second reference, and the cancel run overlapped the lead hand-over.**
Evidence, chat 07 step 7: reply "Tester, your enquiry SST-261119-JXCL has been cancelled. Could you let us know what the issue was? It helps us improve." but the log row for that message carries reference SST-261119-BZLD. Hand-over 1952 (cancellation) ran from 10:06:53 to 10:06:55 while hand-over 1949 (the lead itself) ran from 10:06:14 to 10:07:35.
Likely cause: the support/cancellation branch issues its own case reference and writes it into the same `reference` column; and nothing makes a cancellation wait for a hand-over that is still writing the lead.
Suggested fix: log the case number in a separate column (or as "JXCL / case BZLD"); in the hand-over workflow check the cancelled state just before the final write, or queue the cancellation until the lead row exists. Please check the Leads row for SST-261119-JXCL: it may show as an open lead although the customer was told it was cancelled (I did not open the sheet).

**D5. Medium. The summary has a different layout and different contents in every chat.**
Evidence: chat 01 bold labels with "*Route:*", no name; chat 02 starts "*Name:* Tester Two (individual)" and uses "*From:*/*To:*"; chat 05 has a stray bold line "*Import into Oman*, shipping terms FOB"; chat 06 plain lines with no bold labels ("Frankfurt to Muscat"); chat 07 a dash list; chat 08 "Company: … / Contact: Tester Eight, by call"; chat 04 has no contact line at all. The customer's email is shown only in chats 12 and 13; name and company only in some. In chat 02 the form answer "Customs clearance: Not sure" does not appear in the summary.
Likely cause: the summary is free text from the model with no fixed template.
Suggested fix: build the summary by code from the lead fields with one fixed order (Name, Company, Contact, Email, Service, Route, Cargo, Equipment, Terms, Clearance, Delivery/Collection, Ready date, Documents), or give the prompt an exact template per service.

**D6. Medium. A customer who types the shipment first is still sent the full service form.**
Evidence, chat 14: first message "Need rates for 500 kg of spare parts by air from Frankfurt to Muscat" is noted correctly (lead already has service Air freight, origin Frankfurt, destination Muscat, commodity, 500 kg), then after the details form: "Got it, Tester. Now pick your service in the next form." The service form is opened with payload `{"screen":"SERVICE"}` only (seen in chat 01), so nothing is pre-filled and the customer re-enters service, airports, cargo and weight.
Likely cause: the form step is fixed and takes no data from the lead (same point as C3 in C_forms.md).
Suggested fix: pass known values in `flow_action_payload.data` (mode, direction, origin, destination, commodity, weight) and open on the right screen, or word the message honestly: "I have your route and weight; the form just fills in the rest."

**D7. Low. Text written into the numeric weight field.**
Evidence: chat 10 `weight_kg` "210000 (210 tonnes total)"; chat 11 `weight_kg` "52,000 total (80 pallets x 650 kg)". Other chats give a clean number (48000, 21000, 14000). Also `incoterm` "CIF (default)" (chat 02) and "Not sure (sales team to advise)" (chat 04).
Likely cause: the model fills the field freely.
Suggested fix: compute `weight_kg` by code from the form (unit × value, × quantity where the form asks "per pallet/vehicle") and strip anything that is not a number.

**D8. Low. "it is urgent" right after the details form gets a question it does not need.**
Evidence, chat 09: "Understood, Tester. Can you tell me in a line what is urgent? If it's about a shipment we're already handling, please also share the reference (job number, B/L, container or AWB number). If it's for your new enquiry, just pick your service in the form and I'll make sure our team sees it."
Likely cause: the model does not use the fact that a new-enquiry form is open.
Suggested fix: when the last bot message was a form, treat short remarks as notes for that enquiry: "Noted that it's urgent. Please pick your service in the form above and I'll flag it to our team."

**D9. Low. Customs clearance by road: the border and the origin are never collected.**
Evidence, chat 08: parsed "Clearance point: A road border"; summary "Clearance point: a road border"; lead `origin` empty. The bot did not ask which border or where the cargo comes from.
Likely cause: the form option is generic (the parser already knows Al Wajajah, Hafeet and Rub' Al Khali, but the form does not offer them) and the prompt does not ask.
Suggested fix: list the borders in the form, or let the bot ask one question when the answer is "A road border".

**D10. Low. One extra round where one message would do (agency).**
Evidence, chat 13: after the form the bot asks "which port will she be calling at, and what's the "something else" you need us to help with?", and only in the next turn "Would you like to share any documents for this call…". The documents question could have gone in the first message.
Suggested fix: when a clarifying question is needed, add the documents line to the same message.

**D11. Low to Medium (brand wording, please confirm with the company). Arabic company name.**
Evidence, chat 15: "أهلاً بك في سوهار للشحن". The city and port are written صحار in Arabic, so "سوهار" reads as a transliteration, and "للشحن" may not be the registered Arabic name.
Suggested fix: put the official Arabic company name in the prompt as a fixed string.

**D12. Low. Wording of the "no documents" note differs, and is only in the agreed format after confirmation of a chat with mandatory documents.**
Evidence: chat 07 after confirmation "Documents not supplied: commercial invoice, packing list, MSDS (safety data sheet). …" (correct). Chat 01 after confirmation "Documents not available yet; sales team to follow up"; chat 02 "Customer has no documents available now and will send them later if needed"; chat 04 before confirmation "Customer does not have the packing list yet; sales team to follow up" (with `documents_missing` "packing list" set correctly).
Suggested fix: if the "Documents not supplied: …" line is meant for every lead without files, write it by code at confirmation from `documents_missing` (or "none requested").

**D13. Low. Small points.**
- Gibberish while a form is waiting (chat 14): "Sorry, I couldn't make out your last message. Could you explain a little more in plain words what you need?" does not remind the customer that the service form is open.
- Greeting by first word of the name: "Got it, Dry." for "Dry Run One". Fine for real names, odd for names with a title first (e.g. "Eng. Ahmed" would give "Eng.").
- The log stores "I have a new enquiry" as customer text "New enquiry" (chat 01 step 8): the original wording is lost in `sst_conversation_log`.
- Arabic route asks for name, company and preferred contact but not the email address, which the English details form requires.
- Chat 02: `company` is stored as "Individual" for a private customer.

## 4. Things looked for and not found

- `fallback: true`, errors, runs over 90 seconds: none.
- Bot asking for something the form already collected, the same thing twice, or the phone number: none (the only repeat is D6, caused by the form step).
- Raw option codes in replies or summaries: none. "Sohar" for the port without "Port": none ("Sohar Port" every time; the form value "Sohar, Oman" was turned into "Sohar Port, Oman"). "Shared container": not used. Prices or promises: none ("Our sales team will send you a tailored quotation, as rates depend on the cargo and carrier").
- A form sent twice: none. Buttons missing on a summary: none (13 of 13 had Yes, confirm / Change something). Confirmation blocked by documents: none.
- Form answers ignored by the parser: none. Every field sent appeared in `customer_text`, including supplier phone/email, reefer temperature, cargo value, IMO number and notes.

## 5. Redundant or unnecessary form questions and steps

- R1. Sea export: "Customs clearance by us?" is asked, then the bot says "Export clearance is handled as part of shipping your cargo, so there's nothing extra to book." (chat 02). The question can be hidden for exports (same for air and project exports, and `clearance_export_land`).
- R2. RoRo: "Dangerous goods?" for cars; the summary then prints "Dangerous goods: none" (chat 05). Hide for RoRo or default to No.
- R3. Project cargo: with EXW the form asks "Supplier address" and also "From"; with door delivery it asks "Delivery address" and also "To" (chat 10: both pairs were the same place). Ask "From"/"To" only when no address was given.
- R4. Land freight: "Largest piece size" is required even for a full truck of drums or pallets (chat 07). Make it optional or show it only for flatbed and low-bed.
- R5. LCL and air ask for package size and total CBM, both required, and CBM is a number field, so a real customer cannot answer "not sure" (in this test "Not sure" was injected as text; the bot handled it well and did not ask again). Make CBM optional.
- R6. Warehousing: "Temperature-controlled" has no temperature question, and the bot does not ask either (chat 11). Either add one field or drop the expectation. The documents step ("commercial invoice, packing list or product specification sheet") adds a round trip for a storage enquiry.
- R7. Container sale/lease and shipping agency: the documents question is a full extra turn with nothing useful to send ("Would you like to share any documents that could help our sales team", chat 12). Skip the step for these services and go straight to the summary.
- R8. Shipping agency: "Another port" and "Something else" have no text box in the form answers tested, so the bot has to ask afterwards (chat 13). The parser already reads `port_other_agency`; add the two text fields to the form.
- R9. Customs by road: option "A road border" without naming the border (see D9).
- R10. Details form: "Position" is collected and then lost (D2). Keep it properly or remove the field.
- R11. Step count: every enquiry costs two fixed turns before the forms (Hi, then New enquiry) and one documents turn after. For a customer who opens with a clear request (chat 14) the details form is sent at once, which is good; the service form could be sent in the same way with known values filled in (D6).

## 6. Test data to clear

References issued:
- SST-261119-6MMM: chat 01, planned confirmation (lead written, test email sent by hand-over 1904).
- SST-261119-JXCL: chat 07, planned confirmation (hand-over 1949), then cancelled (hand-over 1952).
- SST-261119-BZLD: chat 07, appeared in the log on the cancellation message (case reference).
- SST-261119-LXSQ: chat 05, NOT planned: issued when the typed "ok" was taken as confirmation (hand-over 1930 ran, so a lead row and a test email exist).

Dummy numbers and message ids (format `wamid.T-<number>-<n>`):

| Number | Message ids | Chat executions (SST 1) |
|---|---|---|
| 999990007201 | -1 to -8 | 1898 to 1903, 1906, 1908 |
| 999990007202 | -1 to -5 | 1909 to 1913 |
| 999990007203 | -1 to -5 | 1914 to 1918 |
| 999990007204 | -1 to -5 | 1919 to 1923 |
| 999990007205 | -1 to -7 | 1924 to 1929, 1932 |
| 999990007206 | -1 to -5 | 1933, 1935 to 1938 |
| 999990007207 | -1 to -7 | 1943 to 1948, 1951 |
| 999990007208 | -1 to -5 | 1955 to 1959 |
| 999990007209 | -1 to -6 | 1960 to 1965 |
| 999990007210 | -1 to -5 | 1966 to 1970 |
| 999990007211 | -1 to -5 | 1971 to 1975 |
| 999990007212 | -1 to -5 | 1976 to 1980 |
| 999990007213 | -1 to -6 | 1981 to 1986 |
| 999990007214 | -1 to -3 | 1987, 1988, 1994 |
| 999990007215 | -1 to -2 | 1989, 1990 |
| 999990007216 | -1 to -3 | 1991 to 1993 |

Rows created by the test: 16 rows in `sst_chats` (phone = the numbers above), 82 rows in `sst_conversation_log` (mobile = "+" and the number), the matching rows in `sst_seen_messages`, entries in `sst_rr_claims` for the references, and the lead rows, emails and any folders the hand-over made for 6MMM, JXCL and LXSQ. Test contact details used: names "Dry Run One", "Tester Two" to "Tester Fourteen", emails of the form dryrunNN@example.com, companies starting "Dummy" or "Test Trading LLC".

Chats left open at the summary (not confirmed): 02, 03, 04, 06, 08, 09, 10, 11, 12, 13. Chat 01 is waiting on a service form after "I have a new enquiry"; chat 14 is waiting on the service form; chat 15 is mid-questions in Arabic; chat 16 is in the FAQ stage. If the workflow sends reminders ("nudges") to stalled chats, these will be picked up, but sends are skipped for 99999 numbers.

## 7. Not covered

- Sending real files (documents received, counted and filed).
- "Existing shipment", "Follow-up" and "Complaint" paths, and the "Change something" button.
- The contents of the Leads sheet and the hand-over email (only the execution status was checked).
- The real WhatsApp forms on a phone: answers were injected as form replies, so screen logic, required fields and labels were not exercised. Region ids for the sea port lists were guessed; the parser accepted them because it reads whatever region id is sent.
- Air and sea exports other than FCL, land "Within Oman" and "Out of Oman", customs by sea and air, bulk (loose), container purchase.
