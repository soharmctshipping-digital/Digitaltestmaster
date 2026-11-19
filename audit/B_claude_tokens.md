# B. Claude brain and token/usage cost

Read-only audit. Sources: SST 1 nodes "Build Claude request", "Ask Claude", "Answer usable?", "Ask Claude again", "Read Claude answer", "Out of Claude credit?", "Combine messages", "Read file contents", "Collect files"; SST 2 "Find similar quotes", "Build pricing request", "Claude drafts the quote", "Turn draft into template fields"; SST 3 "Read command", "Build edit request", "Claude applies the change"; full JSON of SST C, P, M, L, G; FAQ tab; 26 SST 1 executions and 5 SST 2 executions.

## Measured usage

Price weights used for "input-equivalent" (ieq) estimates: uncached input 1, cache write 1.25, cache read 0.1, output 5. These are the usual Anthropic ratios; confirm them for the two model ids on the pricing page before quoting money.

### SST 1 "Ask Claude" (model `claude-sonnet-5-5`, 21 calls sampled, 18–19 Nov)

| Turn type (executions) | Uncached input | Cached system block | Output (of which thinking) |
|---|---|---|---|
| First "Hello" of a chat (1863, 1836, 1804, 1757) | 380–388 | 8,571 / 8,824 **written** | 289–324 (0) |
| "Hello" inside 5 min of another call (1771) | 388 | 8,571 read | 289 (0) |
| "New enquiry" tap (1867, 1841, 1809, 1776, 1760) | 478–492 | read | 293–304 (0) |
| Details form submitted (1872, 1846, 1814, 1781, 1763) | 593–640 | read | 312–330 (0) |
| Service form submitted (1788) | 992 | read | 1,024 (431) |
| File/photo sent (1799, 1733, 1661) | 2,894–3,816 | read | 842–1,382 (299–587) |
| "No more documents" → summary (1738) | 1,493 | read | 931 (182) |
| "Yes, confirm" (1742) | 1,792 | read | 523 (0) |

| Figure | Value |
|---|---|
| Typical call | ~500–600 uncached in, 8,571 cache read, ~300 out |
| Maximum seen | 3,816 uncached in (image turn); 1,382 out (69% of the 2,000 limit) |
| Cached block size | 8,571 tokens (8,824 after a prompt edit on 19 Nov) |
| Cache hits | 17 of 21 calls read the cache; the 4 misses were all the first message after a >5 min gap |
| Claude calls per customer message | 1 when the message reaches the AI, 0 for menu / voice / goodbye / late / blocked routes. 5 further long executions (1858, 1831, 1766, 1791, 1795) made no Claude call |
| "Ask Claude again" (Haiku fallback) | Not used in any of the 26 sampled executions |
| One form-based enquiry (7 AI turns: hello, tap, details form, service form, file, summary, confirm) | ≈ 8,750 uncached in + 8,571 written + 51,400 read + 4,380 out ≈ **46,500 ieq**; output is ~47% of that, the cold cache write ~23%, cache reads ~11% |

### SST 2 "Claude drafts the quote" (`claude-sonnet-5-5`, no caching)

| Execution | Input | Output | of which thinking |
|---|---|---|---|
| 1746 | 11,382 | 4,378 | 2,113 |
| 1129 | 9,963 | 7,047 | 4,499 |
| 384 | 10,693 | 5,815 | 3,486 |
| 290 | 12,891 | 5,090 | 2,599 |
| 156 | 12,289 | 6,731 | 4,005 |
| Typical / max | ~11,400 / 12,891 | ~5,800 / 7,047 | 48–64% of output |

One call per execution; ≈ 40,000 ieq per quote, i.e. roughly the same as the whole customer chat. Only 5 of the 20 SST 2 executions on record called Claude (the other 15 ran 1.5–5 s; not inspected why).

SST 3 "Claude applies the change": 7 executions on record, all under 3 s, none called Claude, so no usage could be measured. SST M: unpublished, not measured. SST C, P, L, G contain no Claude call (G re-posts stuck messages to the SST 1 webhook, so each retry is one normal SST 1 call).

### Request settings as built

| Call | Model | max_tokens (built → sent) | Temperature | Caching | Structured output |
|---|---|---|---|---|---|
| SST 1 Ask Claude | claude-sonnet-5-5 | 4000 → 2000 | not set | `cache_control: ephemeral` on system block 1 only | yes (json_schema) |
| SST 1 Ask Claude again | claude-haiku-5-5 | 4000 → 2000 | not set | same body (separate cache per model) | yes |
| SST 2 drafts the quote | claude-sonnet-5-5 | 6000 → 16000 | not set | none | no |
| SST 3 applies the change | claude-sonnet-5-5 | 6000 → 16000 | not set | none | no |
| SST M classifies it | claude-sonnet-5-5 | 800 | not set | none | no |

SST 1 prompt blocks (characters): static system block ≈ 19,300 of prompt source (services 820, promotional 660, how to write 4,280, out of scope 740, escalate 910, flow 9,000 of which step 4b alone 2,380 and "where things go in lead" 1,100, speak-to 790, cancelling 600, output example 990) + FAQ tab ≈ 3,400 (22 approved rows) + sales-team names; dynamic system block ≈ 450 + the lead JSON; a third system block appended in "Ask Claude" ≈ 690; JSON schema ≈ 2,600. History: last 30 stored messages are sent (40 are kept), not summarised, not cached. Holidays are not sent, only the computed open/closed line. Files: photos ≤ 4.5 MB and PDFs ≤ 20 MB are attached as base64 on that turn only and are not kept in history.

---

## Findings

### B1. Every reply re-writes the whole lead and all flags (output is ~47% of chat cost)
- Category: Token/usage
- Severity: High
- Where: SST 1 → Ask Claude / Ask Claude again (schema), Build Claude request (OUTPUT lines)
- Evidence: schema marks all 14 top-level keys and all 17 `lead` keys as `required`; prompt: `In lead, include every detail known so far, including earlier messages`. Execution 1863 ("Hello"): 289 output tokens for a 12-word reply; 1742 (confirm): 523 output tokens for a one-line thank-you because the lead and a long `additional_info` were echoed again.
- Impact: ~220–450 output tokens per turn carry no new information. Over the 7-turn enquiry that is ≈ 1,500–2,000 output tokens ≈ 7,500–10,000 ieq, about 16–21% of the chat.
- Proposed fix: in the schema keep only `reply`, `language`, `stage`, `options` required; make the flags, `speak_to`, `support`, `escalate`, `last_question` and every `lead` key optional. Change the last prompt line to "In lead, return only details that are new or changed in this message." "Read Claude answer" already merges non-empty values onto `prev_lead` and tests flags with `=== true`, so no parsing change is needed.
- Risk of the fix: the model may omit a correction it should have returned; a lead field can no longer be blanked by returning "" (it cannot today either). Test the confirm, cancel and new-enquiry paths. Does not touch a testing switch.
- Confidence: Confirmed

### B2. Three of the seven turns in a form enquiry need no AI
- Category: Token/usage
- Severity: High
- Where: SST 1 → Build Claude request, Read Claude answer
- Evidence: "Hello" → always `Hello, welcome to Sohar Shipping. How can I help you today?` + start buttons (1863, 1836, 1804, 1771). "New enquiry" tap → always a one-line "form will open" + `details_form` (5 executions). Details form → always `Got it, <name>. Now pick your service in the next form.` (5 executions). Code already forces the outcome: `if (/^new enquiry$/i.test(...)) optKind = detailsKnown ? 'service_form' : 'details_form'` and `if (/^\[The customer filled in their details\]/...) optKind = 'service_form'`.
- Impact: ≈ 1,470 uncached input + 2 cache reads + ≈ 900 output per enquiry ≈ 7,700 ieq (~17% of the chat), plus 2–3 s latency on each of the three turns.
- Proposed fix: in "Build Claude request" add fixed-reply routes (like the existing `say` route) for (a) a greeting-only first message (the `greetingOnly` regex already exists), (b) the "New enquiry" tap, (c) the details form, copying the form answers into the lead in code. Keep the AI for anything with extra text.
- Risk of the fix: wording becomes fixed (less varied); Arabic greeting needs its own fixed line; the details-form field mapping must match "Read message". If the cold-start call moves to the service-form turn the cache write is still paid once. Does not touch a testing switch.
- Confidence: Confirmed

### B3. "Thanks / OK" after a confirmed enquiry goes to Claude, and after 24 h it resets the enquiry
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Build Claude request
- Evidence: comment says `Short goodbyes, thanks and keyboard slips after an enquiry are answered with a fixed line`, but the code only returns for the other kinds: `if (quickKind !== 'thanks') return [{ json: { route: 'say', ...` so a "thanks" falls through to the Claude request. Further down: `if ((['confirmed','support'].indexOf(prevStage) >= 0 && idleHours >= 24) || freshStart) { ... lead = keep; reference = ''; prevStage = 'new';`. `quickText` has no thank-you wording, and the `courtesy` constant is never used.
- Impact: a full Claude call (≈ 2,900 ieq warm, ≈ 12,500 cold) for a courtesy message; if it arrives a day later the stored reference and shipment details are dropped and the customer is treated as starting a new enquiry.
- Proposed fix: add a fixed "You're welcome" line (en/ar) to `quickText` and return the `say` route for `quickKind === 'thanks'` as well; apply the 24 h reset only when the message is not a courtesy line.
- Risk of the fix: low; changes the wording of one reply. Not observed in an execution, read from code only.
- Confidence: Likely

### B4. Document rules contradict each other (ask once vs keep asking)
- Category: Inconsistency
- Severity: Medium
- Where: SST 1 → Build Claude request, FLOW step 4 / 4b
- Evidence: `ask once for documents` … `ask clearly but politely, name each missing document` … `do NOT send the summary until every mandatory document has arrived` … `explain once ... do not repeat the request after that` … `Never ask for documents twice.` Step 4 (summary) is printed before 4b, which opens `this comes BEFORE the summary in step 4`.
- Impact: for mandatory documents or dangerous goods the bot is told both to hold the summary and never to ask again, so a customer who replies without the file can be left with no next step; in other cases it may ask twice. The block is 2,380 characters and repeats "do not send the summary until" three times.
- Proposed fix: renumber as step 4 (documents) and step 5 (summary) and rewrite 4b as three short cases: optional documents (ask once), mandatory documents (ask until received, one reminder per customer message), dangerous goods (MSDS required, same rule). Delete the closing "Never ask for documents twice."
- Risk of the fix: behaviour change on document chasing; retest land freight, break bulk and DG cases.
- Confidence: Confirmed

### B5. "Thank you" rule contradicts five other instructions
- Category: Inconsistency
- Severity: Medium
- Where: SST 1 → Build Claude request, HOW TO WRITE and FLOW
- Evidence: `Say thank you only once: when the enquiry is confirmed.` versus `thank them for each file received`, `thank them briefly, say it has been received`, `thank them again and keep waiting`, `so just thank them briefly`, and step 3b `(no “Thanks”)`.
- Impact: unpredictable tone; observed replies avoid thanks on files ("Received, and saved…"), so the file instructions are being ignored in favour of the style rule.
- Proposed fix: keep the style rule and change the file lines to "acknowledge briefly" (no thanks).
- Risk of the fix: none beyond wording.
- Confidence: Confirmed

### B6. After-confirmation rules are stated twice with different wording, and are mostly unreachable
- Category: Redundancy
- Severity: Medium
- Where: SST 1 → Build Claude request (step 6, step 7, end of 4b) and Ask Claude / Ask Claude again (appended text `g`)
- Evidence: step 6: `tell them briefly that you have passed it to the colleague handling their enquiry`; appended block: `"Got it, I have passed this on to our sales team, who will be in touch soon."`. Step 6 triggers include price/status/asked to be called; the appended block lists only information, change, document or requirement. In code, once the stage is confirmed every message is routed to the menu or forwarded before the AI: `if ((stoppedByTeam || afterConfirm) && !formReply && !inNewEnquiry && ... && !cancelAsk && !speakAsk) {`.
- Impact: ~1,400 characters sent on every call for a situation the AI rarely sees (only courtesy lines, see B3); two wordings for the same reply; the appended block sits after the cache breakpoint so it is billed at full price on every call (~170 tokens).
- Proposed fix: delete the appended AFTER CONFIRMATION paragraph from both HTTP nodes, move the two remaining `g` sentences into `staticText`, and cut step 6 to one line.
- Risk of the fix: if the menu routing is later removed the AI would need step 6 again.
- Confidence: Confirmed

### B9. Past quotes are sent to the pricing call even when the lane does not match
- Category: Token/usage
- Severity: Medium
- Where: SST 2 → Find similar quotes, Build pricing request
- Evidence: `if (r.service === svc) sc += 10;` then `.filter(r => r.score >= 10)`, so any quote of the same service qualifies; up to 3 quotes × `.slice(0, 9000)` characters. Execution 1746 pricing note: `No past quote covers San Juan (Puerto Rico) to Sohar ... neither was used for a rate`, with 11,382 input and 2,113 thinking tokens.
- Impact: roughly 4,000–7,000 input tokens per quote spent on quotes that cannot price the lane, plus the thinking spent rejecting them; the draft still comes back "TBA".
- Proposed fix: require at least one origin or destination word hit for quotes 2 and 3 (keep the single best same-service quote for charge wording), and lower the slice to 6,000 characters.
- Risk of the fix: fewer reference lines for local charges on new lanes; keep one same-service quote to cover that.
- Confidence: Confirmed

### B10. Quote drafting re-types the standard clauses and spends half its output on thinking
- Category: Token/usage
- Severity: Medium
- Where: SST 2 → Build pricing request, Claude drafts the quote
- Evidence: output 4,378–7,047 tokens per quote, thinking 2,113–4,499 (48–64%). The `terms` (8 long items), `not_included`, `documents`, `procedure`, `intro` and `closing_line` in every draft are near-verbatim copies of the Clauses tab text that was sent in.
- Impact: ≈ 800–1,200 output tokens per quote (≈ 4,000–6,000 ieq, ~12–15%) for text code could insert; thinking is ≈ 10,000–22,000 ieq per quote.
- Proposed fix: ask Claude only for the priced part (title, shipment grid, groups, totals, note, pricing_basis, confidence) plus a list of clause changes; fill terms, documents, procedure and closing line in "Turn draft into template fields" from the Clauses row. Separately check in the API docs whether thinking can be limited for this call and test quality before changing it.
- Risk of the fix: clauses would no longer be adapted per shipment unless the "changes" list is used; limiting thinking may hurt arithmetic (VAT, USD conversion). Medium.
- Confidence: Confirmed (figures); Needs checking (thinking control)

### B11. Each salesperson edit sends and returns the whole quotation
- Category: Token/usage
- Severity: Medium
- Where: SST 3 → Read command, Build edit request, Claude applies the change
- Evidence: `let action = 'edit';` is the default for any text not matched by a command; request: `'CURRENT QUOTATION ...' + JSON.stringify(d.quote)`; reply: `"quote": { the full updated quotation JSON }`; `max_tokens: 16000`.
- Impact: a one-word change ("validity 14 days") or a mistyped command ("aprove") costs a full quote in and a full quote out (an SST 2 draft is ≈ 2,300–2,700 tokens without thinking). No SST 3 Claude execution exists to measure.
- Proposed fix: return only the changed keys (`{"refused","message","changes":{...}}`) and merge in "Turn edit into template fields"; apply the "EDIT v" charges list in code since it is already structured; reply with help when the text is one word that is close to a known command.
- Risk of the fix: merge logic for group/line arrays must be exact; totals must still be recalculated. Medium.
- Confidence: Likely

### B12. First message of every chat pays a full cache write
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Build Claude request (`cache_control: { type: 'ephemeral' }`)
- Evidence: 1863, 1836, 1804, 1757: `cache_creation_input_tokens: 8571/8824, cache_read_input_tokens: 0`; all later turns within 5 minutes read it.
- Impact: ≈ 10,700 ieq per cold start, ~23% of an enquiry, and it recurs whenever a customer pauses more than 5 minutes (form filling took 3–5 minutes in the samples).
- Proposed fix: shrink the static block (B4, B6, B8, B13 remove roughly 1,500 tokens ≈ 1,900 ieq per cold start and 150 per warm call). Consider the 1-hour cache option only once traffic is steady above about one chat per hour, as its write costs more.
- Risk of the fix: none for trimming; the 1-hour option costs more at low traffic.
- Confidence: Confirmed

### B7. Being asked to call the customer is handled by two conflicting rules
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Build Claude request, step 6 and SPEAK TO SOMEONE
- Evidence: step 6: `or asks to be called ... set notify_sales = true`; SPEAK TO SOMEONE: `to be called or called back ... set speak_to.requested = true ... do not escalate`.
- Impact: two different flags and two different customer replies for the same request.
- Proposed fix: remove "or asks to be called" from step 6.
- Risk of the fix: none.
- Confidence: Confirmed

### B8. Output format is defined in three places; one omits a stage
- Category: Redundancy
- Severity: Low
- Where: SST 1 → Build Claude request (OUTPUT lines), Ask Claude and Ask Claude again (schema + "IMPORTANT")
- Evidence: prompt: `"stage":"greeting|collecting|awaiting_confirmation|confirmed|support|faq"`; schema enum adds `"promotional"`, which the PROMOTIONAL paragraph requires. The schema and the appended text are copied in full in both HTTP nodes (≈ 4,000 characters each).
- Impact: ~990 characters (≈ 250 tokens) of cached prompt that the schema already enforces; a schema change must be made in two nodes or the fallback diverges.
- Proposed fix: delete the JSON example from `staticText`, keep one sentence on what `last_question` and `options` mean; build the schema once in "Build Claude request" (`body.output_config`) and have both HTTP nodes send `body` with only the model overridden.
- Risk of the fix: low; test that the Haiku fallback still parses.
- Confidence: Confirmed

### B13. Same facts held in several places with different wording
- Category: Redundancy
- Severity: Low
- Where: SST 1 → Build Claude request, Read Claude answer; FAQ tab
- Evidence: services: prompt list (LCL appears twice: `less than container load (LCL)` and `Less than container load (LCL) consolidation`), FAQ row "What services do you offer?", and the `SERVICES` menu in "Read Claude answer". Office hours: prompt step 5 `Sunday to Thursday, 08:30 to 17:30`, `hoursFor()` `['08:30','17:30']`, FAQ row, and the promo reply text. Customs: prompt `Import customs clearance (by sea, air and road)`; FAQ `Yes, for imports and exports by sea, air and road`.
- Impact: the bot can tell a customer export clearance is offered while the service list says import only; a change of hours needs four edits.
- Proposed fix: decide import-only or both and align the FAQ row and prompt; remove the FAQ rows that repeat the prompt (services, hours, company intro, pricing) or remove the prompt copies; build the closed-office sentence from the same constant as `hoursFor`.
- Risk of the fix: none.
- Confidence: Confirmed

### B14. Bot asks for a name although the WhatsApp profile name is supplied
- Category: Repeated question
- Severity: Low
- Where: SST 1 → Build Claude request (ESCALATE, FLOW step 2, dynamic block)
- Evidence: `If you do not know their name, ask for it first (one question), then escalate.` and `their name (only if it is not in DETAILS KNOWN SO FAR)`, while the same request carries `WHATSAPP PROFILE NAME: <name>` outside DETAILS.
- Impact: complaints and escalations get an extra "may I have your name" turn (one more Claude call and a delay before the manager is told).
- Proposed fix: say "use the WhatsApp profile name if no name is known; do not ask for it" for complaints and escalations.
- Risk of the fix: profile names can be nicknames; the salesperson sees the number anyway.
- Confidence: Confirmed (prompt); not observed in an execution

### B15. Start buttons: choices are also written in the text
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Build Claude request ("Tap buttons" rule)
- Evidence: rule: `do NOT list the choices in your text`; execution 1757 reply: `Is this a new enquiry, an existing shipment, or something else?` with `options: "start"`.
- Impact: the question repeats the three buttons shown under it. Disappears if B2 makes the greeting fixed.
- Proposed fix: covered by B2; otherwise add the example greeting without the choices.
- Risk of the fix: none.
- Confidence: Confirmed

### B16. max_tokens set twice with different values
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Build Claude request (`max_tokens: 4000`) vs Ask Claude (`max_tokens: 2000`); SST 2 Build pricing request (`6000`) vs Claude drafts the quote (`16000`); SST 3 the same pair
- Evidence: SST 1 peak output 1,382 of 2,000 on a file turn with 587 thinking tokens; SST 2 peak 7,047, above the 6,000 written in the builder.
- Impact: the builder values are dead and misleading. In SST 1 a long summary plus thinking can reach 2,000; `stop_reason: max_tokens` then fails "Answer usable?" and the whole request is repeated on Haiku.
- Proposed fix: set one value per call in the builder (SST 1: 3000; SST 2/3: 16000) and remove the overrides. Do not lower any of them.
- Risk of the fix: none; limits are caps, not spend.
- Confidence: Confirmed

### B17. No structured output on SST 2, SST 3 and SST M
- Category: Improvement
- Severity: Low
- Where: SST 2 → Claude drafts the quote; SST 3 → Claude applies the change; SST M → Claude classifies it
- Evidence: prompts end `Return ONLY one JSON object, no markdown`; parsers scan for the first `{` that parses; failure text `Claude returned an unreadable draft`. SST 1 already sends `output_config: { format: { type: 'json_schema' ...`.
- Impact: a malformed draft wastes the whole ≈ 40,000 ieq call and the lead goes out "please price manually".
- Proposed fix: add the same header and a schema to these three calls. Also note the prompt says `up to 8 items in each list` while the code keeps `TERMS ... slice(0, 16)` and `not_included ... slice(0, 10)`; align them.
- Risk of the fix: schema must allow "TBA"/"At actual" strings in amounts.
- Confidence: Confirmed

### B18. Master Index classification uses the large model
- Category: Token/usage
- Severity: Low
- Where: SST M → Build classify request
- Evidence: `model: 'claude-sonnet-5-5', max_tokens: 800`, text `.slice(0, 15000)`, up to 25 PDFs a night.
- Impact: up to ~25 × ~4,500 input tokens a night on a nine-field extraction once the workflow is published.
- Proposed fix: use the Haiku model already used as the SST 1 fallback and cut the text to 6,000 characters (first pages carry the header fields).
- Risk of the fix: slightly weaker extraction on scanned or unusual layouts; rows are human-checkable. Workflow is unpublished (testing state left as is).
- Confidence: Confirmed (settings); not measured

### B19. History is carried across enquiries and never cached
- Category: Token/usage
- Severity: Low
- Where: SST 1 → Build Claude request, Read Claude answer
- Evidence: `history.slice(-30)`; stored with `.slice(-40)`; on a new enquiry only `lead`, `reference`, `prevStage` are reset, not `history`. The dynamic system block (with the minute-level time) sits before the messages, so they can never be cached.
- Impact: small today (largest uncached input seen was 3,816 tokens, mostly an image), but a returning customer's old enquiry text is resent with every new message and can make the AI reuse old details.
- Proposed fix: clear `history` when `freshStart` or the 24 h reset fires; cap at 16 messages. Optional: move the dynamic block into the last user message and add a cache breakpoint on the last history message.
- Risk of the fix: the bot loses memory of the earlier enquiry's wording (contact details are kept in `lead`).
- Confidence: Confirmed (code); saving is small

### B20. Temperature is left at default on every call
- Category: Improvement
- Severity: Low
- Where: all five Claude request builders
- Evidence: no `temperature` key in any request body.
- Impact: pricing drafts and classifications vary between runs more than needed.
- Proposed fix: check whether these models accept a temperature with thinking active; if so use a low value for SST 2, SST 3 and SST M.
- Risk of the fix: the API may reject the setting; test on one call first.
- Confidence: Needs checking

### B21. Sheets are read on every message, including ones that never reach the AI
- Category: Token/usage
- Severity: Low
- Where: SST 1 → Read sales team, Read FAQ, Read holidays (all before Build Claude request)
- Evidence: connections `Load chat → Read FAQ → Read holidays → Build Claude request`; menu, voice, goodbye and ignore routes are decided inside Build Claude request.
- Impact: three Google Sheets reads per customer message for content that changes rarely; adds latency and quota use, no token cost.
- Proposed fix: keep FAQ and holidays in workflow static data and refresh every 10–15 minutes.
- Risk of the fix: an FAQ edit takes up to 15 minutes to appear.
- Confidence: Confirmed

### B22. About three in four SST 1 executions are sub-second runs with no customer message
- Category: Token/usage
- Severity: Low
- Where: SST 1 → Incoming WhatsApp (POST)
- Evidence: of the 200 most recent executions, about 47 ran longer than 2 s; the rest finished in 0.05–0.3 s in groups of 3–4 straight after each reply. 1,078 executions in total since 16 Nov.
- Impact: these look like WhatsApp sent/delivered/read status callbacks; they use n8n executions, not Claude tokens.
- Proposed fix: none needed unless the n8n plan's execution count becomes a limit; status callbacks arrive on the same webhook subscription as messages and feed "Failed deliveries".
- Risk of the fix: n/a.
- Confidence: Likely (durations only; contents not opened)

### B23. Stale comments and notes around the Claude request
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Build Claude request, sticky note
- Evidence: `(v10, still a draft) goes only to these numbers` beside `mode: 'published'` (form in use is v22); `// The newest service form goes to every number except the sales team` followed by `// everyone, including the sales team, gets the newest form`; `isStaffNumber` and `courtesy` computed and never used; sticky note `waits 6 s` vs the 2-second wait node, and `If Claude cannot be reached, the manager is emailed` vs the WhatsApp alert node.
- Impact: misleads whoever edits the prompt node next; no token cost (comments are not sent).
- Proposed fix: delete the dead variables and correct the comments and note.
- Risk of the fix: none. `FORM.live`/`testers` is a testing switch and is left alone.
- Confidence: Confirmed

## Not covered
- SST 3 and SST M real usage: no execution that called Claude exists (SST 3) or the workflow is unpublished (SST M).
- Whether "Ask Claude again" has ever fired: only 26 of 1,078 SST 1 executions were opened; none used it.
- Why 15 of 20 SST 2 executions finished without a Claude call, and what the five long SST 1 executions without a Claude call did (only the Claude nodes were requested).
- Actual stored history lengths in `sst_chats` (table not read).
- The Clauses and Master Index tabs (separate spreadsheet) were not read; their size is inferred from SST 2 input totals.
- Thinking and temperature controls for these model ids were not checked against API documentation; B10 and B20 are marked accordingly.
- Money figures: only token counts and relative weights are given.
