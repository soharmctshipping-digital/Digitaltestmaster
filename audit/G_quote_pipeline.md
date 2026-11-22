# G. Quote pipeline as built (SST 2, SST R, SST 3, SST W) and a minimal design for automatic customs clearance quotations

Read-only audit, 22 November 2026. Nothing was modified, published, executed or tested.
Sources: full workflow definitions of SST 1, SST 2, SST R, SST 3 and SST W; SST 2 execution `2198` (child SST R run `2202`, parent SST 1 run `2195`); data tables `sst_state` and the table list; the template Google Doc read through the Docs API.
Phone numbers and email addresses are masked. Not inspected: SST C (chasers), SST G (watchdog), SST L (issues), the document-folder workflows, and the contents of the Sales Team, Clauses and Master Index sheets.

All five workflows are active. SST 2, SST R and SST W: published version = draft. SST 1: the draft differs from the published version, but only in cosmetic parameter normalisation on about a dozen nodes (wait units, data table `resource`/`operation` keys, HTTP parameter order); connections are identical. Any republish of SST 1 would carry those along.

---

## 1. SST 2 – Lead handover & draft quote (`XGdyZLt2Hw0NFS1P`)

### 1.1 Input item from SST 1

The trigger `Start` is an Execute Workflow Trigger with `inputSource: passthrough`, so it receives the whole SST 1 item unchanged. Real shape (run 2198, values shortened):

| Field | Example / meaning |
|---|---|
| `phone` | customer number, digits only, no `+` |
| `whatsapp_name`, `message_id`, `type`, `customer_text` | the confirming message (`"Confirm"`) |
| `reply` | the confirmation text SST 1 sends the customer |
| `stage` | `confirmed` |
| `language` | `en` or `ar` |
| `lead` | object: `name`, `company`, `customer_type`, `email`, `preferred_contact`, `service`, `origin`, `destination`, `commodity`, `weight_kg`, `volume_or_dims`, `packages`, `container_type_qty`, `incoterm`, `cargo_ready_date`, `special_needs`, `additional_info`, `documents_needed`, `documents_missing`, `documents_received`, `files_received`, optionally `file_links`, `previous_reference` |
| `lead_json` | the same object as a string |
| `history_json` | the last 40 chat turns as a JSON string, **including the service form answers word for word** in a user turn that starts `[The customer filled in the service form]` |
| `reference` | `SST-yymmdd-XXXX` |
| `first_message_at`, `after_hours` (`Y`/`N`), `files_received` | timing and file count |
| `mode` | `lead`, `support` or `callback` |
| `support_kind`, `support_summary` | for cases |
| `trigger_handover`, `trigger_support`, `trigger_callback` | which trigger fired |

Important for the customs design: SST 1 (`Still the newest?`) **deletes `lead.form_text`** at handover and only folds form lines that are not already in a lead field into `lead.additional_info` as `From the form: …`. The exact form answers therefore reach SST 2 only inside `history_json`. For an import customs clearance form those lines are (labels from SST 1 `Read message`):

```
Service: Import customs clearance
Arriving by: Sea | Air | Road
Clearance point: Sohar Port | Duqm Port | Salalah Port | Port Sultan Qaboos (Muscat) | Muscat Airport | Salalah Airport | <border name> | Another port | Not sure | <typed text>
What is being cleared: Full container load (FCL) | Reefer container | Less than container load (LCL) | Vehicles | Break bulk (pieces) | Project or heavy-lift cargo | Air cargo
Arrival date (ETA): yyyy-mm-dd
Has an Oman customs code: Yes | No | …
Delivery after clearance: Yes | No | …
Delivery address: …
Container size / Container type / Number of containers / Cargo / Total weight / Cargo value (USD, for the customs guarantee) / Dangerous goods / Notes  (where the form asked them)
```

`lead.service` itself is free text written by Claude (the prompt says "the main service only, for example … 'Customs clearance'"), so it is not a safe single test.

### 1.2 Nodes in execution order

| # | Node | Type | What it does |
|---|---|---|---|
| 1 | `Start` | executeWorkflowTrigger | Passthrough input from SST 1. |
| 2 | `Find documents folder` | dataTable get (`sst_documents`, by phone) | Customer's Drive folder link; continues on error. |
| 3 | `Read sales team` | googleSheets read (`SST WhatsApp Leads` › `Sales Team`) | Run once. |
| 4 | `Get round-robin pointer` | dataTable get (`sst_state`, key `rr_pointer`) | Fixed offset. |
| 5 | `New enquiry (not a case)?` | if | `$('Start').first().json.mode !== 'support'`. True → 6, false → 7. |
| 6 | `Take a turn` | dataTable insert (`sst_rr_claims`) | Row id = turn number. |
| 7 | `Pick salesperson` | code | Round robin (manager for `support`); builds the Leads row and the working item (see 1.3). |
| 8 | `Add to Leads sheet` | googleSheets append (`Leads`, auto-map, extra fields ignored) | Then fans out to 9 and 10. |
| 9 | `Cancels a confirmed enquiry?` | if | `kind === 'cancellation' && lead.previous_reference` → `Mark old enquiry Lost (Leads)` → `Mark old enquiry Lost (quotes)`. |
| 10 | `Existing shipment or complaint?` | if | Left value `mode === 'lead' ? 'lead' : 'support'` equals `support`. True (support **and callback**) → `Record complaint reference` (sst_quotes row, status `Support`, version 0). False → 11. |
| 11 | `Read Master Index` | googleSheets read (`SST CLAUDE – Master Index` › `Index`) | |
| 12 | `Read Clauses` | googleSheets read (same file › `Clauses`) | |
| 13 | `Find similar quotes` | code | Detects a service category (`svc`), picks the clause row, scores past quotations, returns up to 3 (or one item `none: true`). A customs enquiry maps to `svc = 'Customs Clearance'`, clause row `Customs Clearance (FCL import) & Delivery`. |
| 14 | `Found past quotes?` | if | `$json.none` is false → 15, else → 17. |
| 15 | `Download past quote` | googleDrive download | Continues on error. |
| 16 | `Extract quote text` | extractFromFile (pdf, max 6 pages) | |
| 17 | `Build pricing request` | code | Builds the Claude request (1.4). |
| 18 | `Claude drafts the quote` | httpRequest POST `api.anthropic.com/v1/messages` | Anthropic credential; `max_tokens` overridden to 16000; 3 tries; continues on error. |
| 19 | `Turn draft into template fields` | code | Parses the JSON, builds `fields` (1.5). |
| 20 | `Draft ready?` | if | `$json.failed` is false → 21, else → 25. |
| 21 | `Render quotation PDF` | executeWorkflow → SST R, mode `once`, wait = true, 2 tries, continues on error | Passes the item from 19 as is. |
| 22 | `PDF ready?` | if | `Boolean($json.doc_id) && Boolean($binary && $binary.data)`. True → 23 + 24a + 24b in parallel, false → 25. |
| 23 | `Email lead to salesperson` | gmail send | 1.7. |
| 24a | `Save quote v1` | dataTable insert (`sst_quotes`) | 1.6. |
| 24b | `Add to Quotes sheet` | googleSheets append (`Quotes`) | 1.6. |
| 25 | `Prepare lead without draft` | code | Builds the "please price manually" message → 26 + 27. |
| 26 | `Email lead (no draft)` | gmail send | Same table of lead fields, no attachment. |
| 27 | `Record enquiry without draft` | dataTable insert (`sst_quotes`, status `Manual`, version 0, `quote_json` `{}`) | |

### 1.3 `Pick salesperson` output (the item every later node reads by name)

All Leads columns (`reference`, `first_message_at`, `confirmed_at`, `minutes_to_complete`, `after_hours`, `language`, `enquiry_type`, `mobile` (with `+`), `name`, `company`, `customer_type`, `email`, `preferred_contact`, `service`, `origin`, `destination`, `commodity`, `weight_kg`, `volume_or_dims`, `packages`, `container_type_qty`, `incoterm`, `cargo_ready_date`, `special_needs`, `additional_info`, `files_received`, `documents_folder`, `assigned_to`, `alerted_at`, `status` (`New`), `status_updated_at`, `returning_customer`) plus:

```js
mode, kind, phone /* digits only */, lead: L, salesperson, salesperson_phone, salesperson_email,
salesperson_title /* 'Sales & Operations' or 'Business Development – Sales & Operations' */, file_links, rr_next
```

### 1.4 What `Build pricing request` sends to Claude

Model `claude-sonnet-5-5`, one system string and one user message.

System (essential lines):
```
You are the pricing assistant of Sohar Shipping … You prepare ONE proposed quotation for a salesperson to check. It is a draft; a human approves it before anything reaches the customer.
- Price ONLY from the past quotes provided. … Never invent a rate. … set its amount to "TBA" …
- Currency: OMR, 3 decimals … CBO peg 1 OMR = USD 2.6008 …
- VAT: 5% on Oman services; 0% for Transit / Cross-border services. …
- Items normally billed at actual … go in not_included or as "At actual" lines, never in the total.
- Terms, exclusions, procedure and documents must come from the STANDARD CLAUSES provided …
- Validity is fixed: <today + 7 business days, Fri/Sat skipped>. Date: <today>.
LAYOUT LIMITS: up to 4 groups (A., B., C., D.), each with up to 6 lines and an optional sub-total line; up to 8 items in each list; shipment grid has exactly the 12 fields below …
Return ONLY one JSON object … {"title","subtitle","to","attn","salutation_name","intro","shipment":{terms,pickup,pol_label,pol,pod_label,pod,carrier,transit,commodity,packages,dimensions,weight,r5_label,r5,delivery},"groups":[{"title","lines":[{"desc","basis","amount"}],"subtotal":{"label","basis","amount"}}],"total_title","total_line","total_note","note","not_included":[],"procedure":[],"documents":[],"terms":[],"closing_line","total_ex_vat","vat","total","currency","pricing_basis","confidence"}
```

User: `ENQUIRY <reference>`, the lead fields as JSON, `Service category detected: <svc>`, the service clause row (Terms, Not included, Procedure, Documents, Notes, Closing line), the COMMON clause row (Terms, Notes), then up to 3 past quotes (`### PAST QUOTE n: file (ref, dated, age, score)` + up to 9,000 characters of text each) or `NO SIMILAR PAST QUOTES FOUND`.

Node output: `valid_until`, `date`, `match_count`, `matches`, `body`.

### 1.5 What `Turn draft into template fields` outputs

On failure: `{ failed: true, reference, reason }`. Otherwise:

```js
{ failed: false, reference, version: 1, doc_name: reference + ' v1 (draft)', fields: f, quote: q,
  line_items, total_line, pricing_basis, confidence, match_count, matches }
```

`fields` (keys = placeholders in the template):

- Header: `TITLE`, `SUBTITLE`, `QUOTE_REF`, `TO`, `ATTN`, `DATE`, `CURRENCY`, `VALID_UNTIL`, `SALUTATION_NAME`, `INTRO`
- Shipment grid: `SD_TERMS`, `SD_PICKUP`, `SD_POL_LABEL`, `SD_POL`, `SD_POD_LABEL`, `SD_POD`, `SD_CARRIER`, `SD_TRANSIT`, `SD_COMMODITY`, `SD_PACKAGES`, `SD_DIMENSIONS`, `SD_WEIGHT`, `SD_R5_LABEL`, `SD_R5`, `SD_DELIVERY` (default `To be advised`)
- Rate table, for group n = 1..4 and row r = 1..6: `Gn_TITLE`, `Gn_Rr_DESC`, `Gn_Rr_BASIS`, `Gn_Rr_AMT`, `Gn_SUB_LABEL`, `Gn_SUB_BASIS`, `Gn_SUB_AMT` (only keys for groups and lines that exist are set)
- Totals and note: `TOTAL_TITLE`, `TOTAL_LINE`, `TOTAL_NOTE`, `NOTE`
- Lists (arrays): `NOT_INCLUDED_L`, `NOT_INCLUDED_R` (the list split in two halves, max 10), `PROCEDURE` (max 8), `DOCUMENTS` (max 8), `TERMS` (max 16)
- Closing: `CLOSING_LINE`, `SALESPERSON`, `SALES_TITLE`

`quote` is Claude's object unchanged (`groups[].lines[] = {desc, basis, amount}`, `subtotal`, `not_included`, `procedure`, `documents`, `terms`, `total_line`, `total`, `currency`, `pricing_basis`, `confidence`, …). `line_items` is a one-line text summary for the Quotes sheet.

### 1.6 What goes to SST R and what is recorded

- To SST R: the whole item from 1.5. SST R reads only `doc_name`, `fields`, `reference`, `version`.
- `sst_quotes` (`Save quote v1`): `reference`, `version` 1, `quote_json` = `JSON.stringify(quote)`, `lead_json` = `JSON.stringify(<Pick salesperson item>)`, `salesperson`, `salesperson_phone`, `salesperson_email`, `customer_phone`, `doc_id`, `status` `Draft`. (The table also has `prev_status`.)
- `Quotes` sheet: `reference`, `version` 1, `created_at`, `created_by` `Claude`, `salesperson`, `total` (`quote.total`), `currency`, `line_items`, `rate_basis` (`pricing_basis`), `match_count`, `change_request` empty, `doc_link`, `pdf_link` empty, `approved` `N`.

### 1.7 The email

`Email lead to salesperson` (Gmail OAuth, sender name `Sohar Shipping WhatsApp bot`, HTML):

- `sendTo`: a **fixed test address** (`v***@g***`), not `salesperson_email`.
- Subject: `New enquiry <ref> – <name> – <service>`.
- Body: "New enquiry … is assigned to you. The draft quotation is attached (v1)", a table (Customer, Mobile, Email, Prefers, Service, Route, Commodity, Packages, Weight, Volume / dims, Container, Incoterm, Ready, Special needs, Notes, Documents folder, Customer files), then `Draft total … (confidence …)`, `Pricing basis`, a link to the editable Google Doc (`$('Render quotation PDF').first().json.doc_link`) and the WhatsApp edit/approve instructions.
- Attachment: `options.attachmentsUi.attachmentsBinary: [{ property: 'data' }]`, i.e. the PDF binary that SST R returns on the incoming item.

The body reads `$('Turn draft into template fields')` and `$('Render quotation PDF')` by name, so this node cannot be reused from a branch where those two nodes did not run.

### 1.8 Disconnected nodes and testing-phase switches – leave alone

| Node(s) | State | Meaning |
|---|---|---|
| `Prepare WhatsApp for salesperson` → `WhatsApp the salesperson` → `Prepare charges list` → `Send charges list (SST W)` | No incoming connection | WhatsApp lead + PDF + editable charges list to the salesperson is switched off. |
| `WhatsApp the salesperson (no draft)` | No incoming connection | Same, for the manual route. |
| `Prepare complaint alert` → `WhatsApp the manager` + `Email the manager` | No incoming connection | Complaint / escalation / callback alerts are switched off; the case is only recorded. |
| `Email lead to salesperson`, `Email lead (no draft)` | `sendTo` hard-coded to the test address | Go-live switch back to `salesperson_email`. |
| SST 1 `Send to salesperson` | `disabled: true` | Passing customer messages to staff is off. |

So in the present testing state the only outbound messages SST 2 produces are two emails to the test address.

---

## 2. SST R – Render quotation PDF (`DS9f65qyn0x4BjMP`)

### 2.1 Input contract

`Start` (Execute Workflow Trigger, passthrough). Fields used:

| Field | Use |
|---|---|
| `doc_name` | Name of the copied Google Doc and of the PDF (`doc_name + '.pdf'`). |
| `fields` | Object: placeholder name → string or array of strings. |
| `reference`, `version` | Echoed back. |

There is **no template id in the input**.

### 2.2 Steps

1. `Get template id` – dataTable get on `sst_state`, filter `key = template_doc_id` (fixed text). Present value: `1_4xxrUBl33OJNjqiTuMUbTvFQ1lxpvKYU6CylPopQnk`.
2. `Copy template` – Google Drive node, `file: copy`, `fileId = {{ $json.value }}`, name `{{ $('Start').first().json.doc_name }}`, into folder `Quote drafts (bot)` (`1_xAMVrRMa3oL6aKkQ50mRJBA--EYW5RZ`); 4 tries.
3. `Read draft` – HTTP GET `https://docs.googleapis.com/v1/documents/<id>` (Google Docs OAuth).
4. `Build replacements` – code. Walks body, tables (recursively), headers and footers, collects every `{{NAME}}` with the pattern `[A-Z0-9_]+`, and creates one request per placeholder **found in the document**:
   ```js
   let v = fields[k]; if (v === undefined || v === null) v = '';
   if (Array.isArray(v)) v = v.filter(x => String(x).trim() !== '').join(String.fromCharCode(10));
   requests.push({ replaceAllText: { containsText: { text: '{{' + k + '}}', matchCase: true }, replaceText: String(v) } });
   ```
   A placeholder without a field becomes empty text. An array becomes one line per item (in a bulleted paragraph each line becomes its own bullet).
5. `Fill placeholders` – HTTP POST `…/documents/<id>:batchUpdate` with those requests.
6. `Re-read draft` – GET again.
7. `Find empty rows` – code. Builds delete requests, sorted bottom-up:
   - for every body table whose first row text contains `Basis / Remarks` **or starts with `Description`**: `deleteTableRow` for each row (except row 0) whose cells are all empty;
   - `deleteContentRange` for every empty bulleted paragraph (in the body and inside table cells).
8. `Anything to remove?` (`count > 0`) → `Remove empty rows` (batchUpdate) → 9; else straight to 9.
9. `Export PDF` – Google Drive node, `file: download` of the copied doc with `googleFileConversion.docsToFormat = application/pdf`, binary property `data`, file name `<doc_name>.pdf`.
10. `Return PDF` – code:
    ```js
    return [{ json: { doc_id: id, doc_link: 'https://docs.google.com/document/d/' + id + '/edit', reference: s.reference, version: s.version, file_name: s.doc_name + '.pdf' }, binary: $input.first().binary }];
    ```

Rows and groups are therefore **not written with insert requests**. The template already holds every possible row as placeholders; the code only replaces text and deletes what stayed empty.

### 2.3 Output

`doc_id`, `doc_link`, `reference`, `version`, `file_name`, and binary `data` (PDF; 254 kB in run 2198). The Google Doc copy stays in `Quote drafts (bot)` and is the editable draft.

### 2.4 Credentials and node types

Google Drive OAuth2 (`Google Drive account`) on the two Drive nodes; Google Docs OAuth2 (`Google Docs account`) on four HTTP Request nodes; data table node for `sst_state`. Error workflow `W3TFvtQPxamDCu0q`. Run time about 8 seconds.

### 2.5 Can SST R render a different template?

**The rendering code is generic; the template choice is not.**

- Placeholder replacement is discovered from the document itself, so any document with `{{UPPER_CASE}}` placeholders in body, tables, header or footer is filled correctly from `fields`. Nothing in the code knows about `G1_…`, the shipment grid or the number of columns.
- The empty-row clean-up also works for a table headed `Description | Charges | Remarks`, because its first cell starts with `Description`. (Keep that word first in the header row of the new table; keep any other table from starting with it.)
- **But the template id cannot be passed in**: `Get template id` always reads key `template_doc_id`. So "changing only the input" is not enough today. One expression must change in SST R, in a backward-compatible way, e.g. the filter value in `Get template id` from `template_doc_id` to `{{ $('Start').first().json.template_key || 'template_doc_id' }}` plus a new `sst_state` row (for example `template_doc_id_customs`). SST 2 and SST 3 calls without `template_key` behave exactly as now.
- The new template must sit where the `Google Drive account` credential can copy it.
- Limits to remember: fixed maximum number of rows (whatever the template holds); no per-row formatting logic (bold sub-totals etc. must be designed into the template rows); text only.

---

## 3. The present template Google Doc

- Id `1_4xxrUBl33OJNjqiTuMUbTvFQ1lxpvKYU6CylPopQnk`, title `SST_Quotation_Template`, in folder `SST CLAUDE` (`1TP5Nrfm4qTquQpK9nrv0OAj0rQjClSN4`), last modified 27 October 2026, owned by a Gmail account (`n***@g***`). The connector account used for this audit can read but not edit it.
- A4 (595 × 842 pt); margins top 112 pt, bottom 62 pt, left/right 44 pt; custom header/footer margins.
- **Header** (default header, every page): one inline image – the letterhead. No text.
- **Footer**: `{{QUOTE_REF}}  |  Subject to final confirmation; charges at actual billed as per supporting invoices` + tab + `Page n of N` (auto-text).
- **Body**, in order:
  1. `{{TITLE}}`, `{{SUBTITLE}}`
  2. Table 3 × 2: `Ref: {{QUOTE_REF}}` | `Date: {{DATE}}`; `To: {{TO}}` | `Currency: {{CURRENCY}}`; `Attn: {{ATTN}}` | `Valid until: {{VALID_UNTIL}}`
  3. `Dear {{SALUTATION_NAME}},` and `{{INTRO}}`
  4. Heading `SHIPMENT DETAILS`; table 6 × 4 with the 15 `SD_…` placeholders (labels Terms, Pick-up, POL label, POD label, Carrier / Routing, Transit Time | Commodity, Packages, Dimensions, Gross Weight, R5 label, Delivery)
  5. Heading `RATE DETAILS`; table 33 × 3: header row (`Description`, `Basis / Remarks`, `Amount ({{CURRENCY}})`, held in the first cell with tabs), then four blocks of [group title row, 6 line rows `DESC | BASIS | AMT`, sub-total row]
  6. One-cell table: `TOTAL | {{TOTAL_TITLE}}` / `{{TOTAL_LINE}}` / `{{TOTAL_NOTE}}`
  7. One-cell table: `{{NOTE}}`
  8. Table 2 × 3: `CHARGES NOT INCLUDED (PAYABLE AT ACTUAL)` with `{{NOT_INCLUDED_L}}` and `{{NOT_INCLUDED_R}}`; `PROCEDURE` `{{PROCEDURE}}` | `DOCUMENTS REQUIRED` `{{DOCUMENTS}}`
  9. Heading `TERMS & CONDITIONS`; one bulleted paragraph `{{TERMS}}`
  10. One-cell table: `{{CLOSING_LINE}}`
  11. Table 1 × 2: `Best Regards,` / `{{SALESPERSON}}` / `{{SALES_TITLE}}` / `Sohar Shipping, …` | office telephone numbers and email (fixed text)
- 125 distinct placeholders in total (list in 1.5 plus the full `G1…G4` grid).

---

## 4. Sending a PDF on WhatsApp today (SST 3, SST W, SST 1)

### 4.1 SST 3 (`KQaTw1pVt2kcOfuo`) – always to the salesperson who sent the command

Three document sends, all the native **WhatsApp Business Cloud node** (`n8n-nodes-base.whatsApp` v1.1, credential `WhatsApp account`):

```
resource: message, operation: send, phoneNumberId: <bot phone number id>,
recipientPhoneNumber: {{ $('Decide').first().json.phone }}     // the salesperson
messageType: document, mediaPath: useMedian8n, mediaPropertyName: data,
additionalFields: { mediaFilename: …, mediaCaption: … }
```

- `Send new PDF` (after `Render new version` → SST R): caption `<ref> – draft v<n>`.
- `Send latest draft` (after `Export latest draft`, a Drive download of `doc_id` converted to PDF): the `pdf` command.
- `Send final PDF` (after `Export final PDF`): the `approve` command; caption tells the salesperson "Please send it to the client now". The PDF is also uploaded to `SST CLAUDE` as `<ref> - <salesperson>.pdf`, and Confirmed Quotes, Master Index, Leads, `sst_quotes` (`Approved`) and the Quotes tab are updated.

These are free-form document messages (the node uploads the binary as media, then sends it). They work because the salesperson has just messaged the bot. **Nothing in SST 3 sends to the customer**; the approved PDF is forwarded by the salesperson by hand.

SST 3 depends on `sst_quotes`: `edit`, `approve` and `pdf` need the latest row to have `version >= 1` and a `doc_id`. `edit` sends `quote_json` to Claude, rebuilds the standard `fields` (`G1…`, `SD_…`) and calls SST R again.

### 4.2 SST W (`DNxsO2Z0wQncuhhs`) – staff only

Input (passthrough): `to`, `reference`, `free_text`, optional `pdf_caption`, `filename`, `template: { name, params[], with_pdf }`, optional binary `data`.

`Choose channel` only ever sends to numbers on the Sales Team tab:
```js
if (!to || !team.some(r => norm(r.whatsapp) === to)) { if (!manager) continue; redirected = …; to = norm(manager.whatsapp); }
```
Then:
- inside the staff member's 24-hour window (`sales_last_in_<number>` in `sst_state`, under 23 hours) or no template named: `Send PDF as normal message` (WhatsApp node, `messageType: document`, `useMedian8n`, property `data`, filename and caption) then `Send as normal message` (text);
- otherwise an approved template (language `en_GB`): `Upload PDF to WhatsApp` (HTTP POST `graph.facebook.com/v21.0/<phone number id>/media`, multipart, `type=application/pdf`) → `Send template with PDF` (HTTP POST `/messages`, header component `{ type: 'document', document: { id, filename } }`), or `Send template` (body only). If the template is refused it falls back to a normal message. Full details are parked in `sst_outbox` until the person replies.
- Every message is logged to the `Internal team conversation` tab.

**SST W cannot be used for a customer**: a customer number would be redirected to the manager.

### 4.3 SST 1 – nothing sends a document to a customer

Customer-facing sends in SST 1 are text or interactive only: `Reply on WhatsApp`, `Send long text first`, `Send greeting while stopped` (WhatsApp node, text), `Reply with buttons`, `Send the options` (HTTP `/messages`, interactive buttons / list / flow), `Show typing`. No node has `messageType: document`. A customer document send does not exist anywhere yet and must be added.

Other facts that matter:
- `Real customer number?` skips the WhatsApp reply when the phone starts with `99999` (simulated test customers). A new customer send must apply the same test.
- `Read Claude answer` contains a code guard that strips prices, promises and unknown contact details from **bot chat replies**. It does not touch a document sent from SST 2.

### 4.4 The 24-hour window

Handover happens in the same run as the customer's confirming message, so the customer-service window has just been reopened. A free-form document message (the same node configuration as `Send new PDF`, with `recipientPhoneNumber` = the customer) is allowed and needs no template. The window only becomes a concern if the send is delayed by a day (for example a manual re-run of a failed SST 2 execution later on); in that case Meta rejects the message and the flow must fall back to the sales route.

---

## 5. How SST 1 calls SST 2, and what the customer is told

- `AI answered?` (true output) fans out to `Save chat`, `Log conversation`, `Enquiry confirmed or complaint?`, `Pass to salesperson?`, `Real customer number?` (→ the WhatsApp reply), `Reply adjusted?`, `Backup: Log conversation`.
- `Enquiry confirmed or complaint?`: `trigger_handover` OR `trigger_support` OR `trigger_callback`.
- `Hand over to sales`: Execute Workflow → SST 2, no field mapping (the whole item is passed), default mode (once), **`waitForSubWorkflow: false`**. SST 1 does not wait and never sees SST 2's result. It also triggers `Folder rename details` → `Name the documents folder`.
- `trigger_handover = a.confirmed_now === true && prevStage !== 'confirmed' && !cancelNow` – it fires once per enquiry; a later "confirm" on an already confirmed chat does not fire again. A new reference is generated in `Read Claude answer`.
- Confirmation text is written by Claude under these prompt rules, with `{REF}` filled in by code:
  - Office open: "Thanks, [name]. Your enquiry reference is {REF}. Our sales team will be in touch by [preferred contact] soon."
  - Office closed: "Thanks, [name]. Your enquiry reference is {REF}. Our office is closed right now (we are open Sunday to Thursday, 08:30 to 17:30 Oman time), so our sales team will contact you when we open [next opening]."
- The same prompt forbids prices: "Never quote prices, rates, transit times or customs/duty outcomes … say the sales team will send a tailored quotation."
- Timing: the confirmation text leaves SST 1 within a second or two; SST 2 took 49 seconds in run 2198 (Claude pricing). A customs branch with no Claude call needs roughly 10–15 seconds (sheet reads + SST R about 8 s), so the PDF arrives after the confirmation text.

Consequence: SST 1 cannot know at confirmation time whether the enquiry is "straightforward" unless the classification is duplicated there. The safe way to say "your quotation is attached" is in the **caption of the document message sent by SST 2**, leaving SST 1's confirmation wording untouched.

---

## 6. Recommended minimal design

Principles: no change to SST 1, SST 3 or SST W in the first step; one backward-compatible expression change in SST R; one new branch in SST 2 that falls back to today's route on any doubt or failure; every disconnected node and both fixed email addresses stay exactly as they are.

### (a) Decide straightforward vs complicated in code

1. **SST 2 – new Code node `Classify customs enquiry`** between `Existing shipment or complaint?` (false output) and `Read Master Index`. It parses the last `[The customer filled in the service form]` block out of `$('Start').first().json.history_json` into label → value pairs and returns `{ auto: true|false, reason, facts }`. Suggested rule (the owner must confirm the exact list): `auto` only when all hold
   - `mode === 'lead'` and form line `Service` is exactly `Import customs clearance`;
   - `Arriving by`, `Clearance point` and `What is being cleared` are each a value that exists in the rate table (for example Sea + Sohar Port + FCL/LCL); never `Another port`, `Not sure`, typed text, `Reefer container`, `Vehicles`, `Break bulk`, `Project or heavy-lift cargo`;
   - `Dangerous goods` is not `Yes`;
   - quantity (number and size of containers, or packages) parses to a number within the table's range;
   - `Delivery after clearance` is `No`, or the table has a delivery line for that address area;
   - no later customer turn after the form other than documents, "later/skip" and the confirmation (a "Change something" correction makes the form text stale → complicated);
   - the feature switch (see risk 2) allows it.
   Anything missing or unparseable → `auto: false`.
2. **SST 2 – new IF `Straightforward customs?`** (`$json.auto === true`). False → `Read Master Index` (today's route, untouched). True → step 3.

### (b) Build the quotation from a rate table, no Claude call

3. **Rate table**: a new tab (for example `Customs Rates`) in `SST CLAUDE – Master Index`, next to `Clauses`, so the owner edits prices without touching n8n. Suggested columns: `arriving_by`, `clearance_point`, `cargo_type`, `line_no`, `description`, `charge_omr`, `unit` (per shipment / per container / per B/L), `remarks`, `active`. Fixed paragraphs (Documents Required, Customs Authorization Note, Terms & Conditions) live as fixed text in the new template, not in the table.
4. **SST 2 – new Google Sheets node `Read customs rates`** (read, run once, retry on fail, continue on error).
5. **SST 2 – new Code node `Build customs quotation`**. Pure arithmetic: selects the active rows for the classified combination, multiplies per-container lines by quantity, formats OMR to 3 decimals, adds VAT/total lines if the owner wants them, and returns the same envelope SST R and the record nodes expect:
   ```js
   { failed: false, reference, version: 1, doc_name: reference + ' – Customs Clearance Quotation',
     template_key: 'template_doc_id_customs',
     fields: { TITLE: 'CUSTOMS CLEARANCE CHARGES QUOTATION', QUOTE_REF, DATE, VALID_UNTIL, TO, ATTN, SALUTATION_NAME,
               CURRENCY: 'OMR', C_R1_DESC, C_R1_AMT, C_R1_REM, … , TOTAL_LINE, SALESPERSON, SALES_TITLE },
     quote: { layout: 'customs_fixed', title, to, attn, currency: 'OMR',
              groups: [{ title: 'CUSTOMS CLEARANCE CHARGES', lines: [{ desc, basis: <remarks>, amount }] }],
              total_line, total, valid_until, pricing_basis: 'Fixed customs rate table, row set <key>, no AI pricing' },
     line_items, total_line }
   ```
   Keeping `quote.groups[].lines[] = {desc, basis, amount}` means SST 3 `details`, `list`, `pdf` and `approve` keep working on these rows. If no rate rows match, or any amount is not a number, it returns `failed: true`.
6. **SST 2 – new IF `Customs quotation built?`** (`failed` false). False → `Read Master Index` (today's route).

### (c) Render in the new layout

7. **New Google Doc template** made by copying the present template (this keeps the letterhead header image, footer with `{{QUOTE_REF}}` and page numbers, margins and the signature block) and replacing the body with: title, Ref/Date/To/Attn/Valid-until table, greeting, the 3-column table whose header row is `Description | Charges (OMR) | Remarks` followed by N rows `{{C_Rn_DESC}} | {{C_Rn_AMT}} | {{C_Rn_REM}}` (N = the longest rate set plus spare; unused rows are deleted by SST R), an optional total row, then the fixed paragraphs Documents Required, Customs Authorization Note, Terms & Conditions as plain text, then the signature block.
8. **`sst_state`**: one new row `template_doc_id_customs` = the new document id.
9. **SST R – one expression** in `Get template id`: filter value `template_doc_id` → `{{ $('Start').first().json.template_key || 'template_doc_id' }}`. No other SST R change is needed for the PDF. (A separate render workflow is not needed; it would duplicate ten nodes for no gain.)
10. **SST 2 – new Execute Workflow node `Render customs quotation`** → SST R, same settings as `Render quotation PDF` (wait, continue on error), followed by **IF `Customs PDF ready?`** with the same condition as `PDF ready?`. False → `Prepare lead without draft` (existing manual route: the customer gets nothing extra, the salesperson is told to price it).

### (d) Send the PDF to the customer and record it

11. **SST 2 – new IF `Send to this customer?`**: phone does not start with `99999`, and the feature switch allows this number (risk 2). False → skip the send but still do steps 13–16 with `sent_to_customer: false`.
12. **SST 2 – new WhatsApp node `Send quotation to customer`**: same configuration as SST 3 `Send new PDF`, with `recipientPhoneNumber = {{ $('Pick salesperson').first().json.phone }}`, `mediaFilename = {{ $json.file_name }}`, caption by language, for example EN: "Further to your enquiry <ref>, please find attached our customs clearance quotation, valid until <date>. <Salesperson> from our sales team will follow up with you." (Arabic equivalent when `language === 'ar'`). `onError: continueRegularOutput`, **no retry on fail**.
13. **SST 2 – new Code node `Customs send result`**: reads the WhatsApp node output (`messages[0].id` present = sent) and returns `{ sent_to_customer, wa_message_id, … }` with `binary: $('Render customs quotation').first().binary`, so the email can attach the files.
14. **SST 2 – new dataTable insert `Save customs quote`** (`sst_quotes`): same columns as `Save quote v1`; `status` = `Quoted` when sent (SST 3 then lists it under "Awaiting client decision – sent to client" and `won` / `lost` work), otherwise `Draft`.
15. **SST 2 – new Google Sheets append `Add customs quote to Quotes sheet`**: same columns as `Add to Quotes sheet`, with `created_by` = `Rate table`, `rate_basis` = the rate-set key, `approved` = `Auto`, `match_count` = 0.
16. **SST 2 – new Google Sheets append `Log quotation in Conversations`** (`Conversations` tab, same columns as SST 1 `Log conversation`): `message_type` `document`, `bot_reply` `[Quotation PDF <file name> sent to the customer]`, `stage` `confirmed`, `reference`; optionally the same row to data table `sst_conversation_log` (`source` = `SST 2`).

### (e) Keep the salesperson copy on the existing email

17. **SST 2 – new Gmail node `Email customs quote to salesperson`**, a copy of `Email lead to salesperson` (same fixed test `sendTo` for now, same lead table, same `attachmentsBinary` on `data`), with the opening line changed to "Customs clearance quotation <ref> was built from the fixed rate table and sent to the customer on WhatsApp at <time>" (or "…was NOT sent to the customer: <reason>. Please send it yourself"), the total, and the Google Doc link. It must read `$('Build customs quotation')` and `$('Render customs quotation')`, not the Claude-route nodes. The existing email node is left untouched for the complicated route.

### (f) Attach a .docx as well

18. **SST R – two added nodes, opt-in**: after `Export PDF`, an IF `Also Word?` (`$('Start').first().json.also_docx === true`) → Google Drive download `Export DOCX` of the same `documentId` with `docsToFormat = application/vnd.openxmlformats-officedocument.wordprocessingml.document`, binary property `docx`, `onError: continue`; and `Return PDF` changed to return `binary: { data: <PDF>, docx: <DOCX if present> }`. Callers that do not set `also_docx` get exactly today's output.
19. **SST 2**: `Build customs quotation` sets `also_docx: true`; the new email node lists two attachments (`data`, `docx`).
20. Recommended default: the .docx goes **only to the salesperson email**. An editable Word quotation on letterhead in a customer's hands can be altered; if the owner does want the customer to receive it, add a second WhatsApp document node after step 12 (property `docx`), accepting that risk.

### Risks and open points

1. **Sending real quotations during the testing phase.** Today nothing reaches staff by WhatsApp and emails go to a test address, but the new node would message real customers at once. Add a switch before go-live: `sst_state` key such as `customs_auto_quote` = `off` / `test` / `on`, with `test` sending only to an allow-list of tester numbers. Read it in `Classify customs enquiry` or `Send to this customer?`.
2. **Duplicate sends.** `trigger_handover` fires once per enquiry, and the render retry (2 tries) only risks a spare Google Doc copy. The danger is the WhatsApp node: do not enable retry (a timeout after Meta accepted the message would send it twice), and before sending check `sst_quotes` for an existing row for this reference (protects against a manual re-run of the SST 2 execution).
3. **Render or send failure.** Render failure → existing manual route (step 10). Send failure (window closed, media rejected, API error) → the quote is still saved as `Draft` and the email tells the salesperson it was not sent. The customer has by then only received SST 1's "our sales team will be in touch", which remains true.
4. **Mixed message to the customer.** SST 1 says "our sales team will be in touch" (and, out of hours, "when we open"), then a quotation arrives seconds later. The caption in step 12 bridges this. Changing the confirmation text itself needs SST 1 prompt and code changes; not recommended for the first step.
5. **The bot does not know a quotation was sent.** SST 1's chat history (`sst_chats.history`) will not contain it, the prompt still says the sales team will send a quotation, and the price guard removes amounts from replies. If the customer then asks "what is the total?", the bot will defer to sales. Writing a note into `sst_chats` from SST 2 would be a read-modify-write that can race with SST 1's `Save chat` upsert. Better second step: let SST 1 `Build Claude request` read the `sst_quotes` status for the reference and add one line to the dynamic prompt.
6. **SST 3 `edit` on a customs quote.** `edit` asks Claude to change `quote_json` and re-renders with the **standard** fields and, unless told otherwise, the **standard** template, so the layout would switch and Claude would be pricing. `pdf`, `approve`, `details`, `quoted`, `won`, `lost` are unaffected. Until SST 3 is taught about `quote.layout === 'customs_fixed'` (pass `template_key` and build `C_Rn_…` fields, or refuse edits), tell staff not to use `change` on these references, or save them with a status SST 3 treats as closed for editing.
7. **`Quoted` status and other workflows.** SST C (chasers) and SST G (watchdog) were not inspected. Check how they treat a row that is `Quoted` at version 1 with no `Approved` step, and whether the Leads tab `status` (written as `New` by `Add to Leads sheet`) should also be updated.
8. **Stale or missing form data.** Classification relies on the form block in `history_json` (last 40 turns). Very long chats can push it out; an Arabic chat never gets the form (`details_form`/`service_form` are disabled when `isAr`). Both cases fall to the complicated route, which is the safe direction. If more reliability is wanted later, SST 1 `Still the newest?` can pass `form_text` as a top-level field before deleting it from `lead` (one line).
9. **Language.** The template and fixed paragraphs are English. An Arabic-speaking customer would get an Arabic caption with an English document unless an Arabic template is added (a second `sst_state` key works with the same SST R change). In practice risk 8 means Arabic chats will rarely qualify.
10. **WhatsApp media limits.** Cloud API documents may be up to 100 MB; the present PDFs are about 0.25 MB with the letterhead image, so size is not a concern. The file name shown to the customer is `mediaFilename`; use a clean name (for example `Sohar Shipping – Customs Clearance Quotation <ref>.pdf`), not `… v1 (draft).pdf`.
11. **Wrong price sent with no human check.** This is the first flow in which a price reaches a customer without approval. Keep the straightforward rule narrow, validate every amount as a number in code, put the validity date and "charges at actual" wording in the fixed paragraphs, and consider a first week in `test` mode with the email copy reviewed daily.
12. **VAT, duty and at-actual items.** The rate table must state whether charges are shown with or without 5% VAT and how duty, Bill of Entry and port charges are worded; the COMMON clause row already holds agreed wording (for example "based on a maximum of 10 HS codes; additional HS codes OMR 0.250 each").
13. **Template safety.** The new table's header row must start with `Description`; placeholders must be upper-case letters, digits and underscores only; the letterhead must stay in the header. The new template has to be in the Drive of the `Google Drive account` credential. If the `sst_state` row is missing, SST R returns nothing and the flow drops to the manual route.
14. **Email node expressions.** Do not route the customs branch into the existing `Email lead to salesperson`, `Save quote v1` or `Add to Quotes sheet`: they read `$('Turn draft into template fields')` / `$('Render quotation PDF')`, which will not have run, and would error.
15. **Round robin and Leads row are unaffected.** The branch starts after `Add to Leads sheet`, so the salesperson is assigned and the lead is logged exactly as today.
16. **Callback mode.** `Existing shipment or complaint?` sends `callback` to the support branch, so only `mode === 'lead'` can reach the classifier; keep the explicit `mode` test anyway.
