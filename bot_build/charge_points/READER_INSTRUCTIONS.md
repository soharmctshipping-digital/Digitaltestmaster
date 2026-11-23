# Charge-point extraction: instructions for each reader

You are one of six readers. Together you re-read every quotation PDF in Sohar Shipping's "SST CLAUDE" Google Drive folder and list EVERY charge line in it (not only customs clearance), plus what shipment facts each quotation needed. Read-only: do not modify anything in Drive. UK English. Do not write customer names, phone numbers or email addresses into your output files (quotation reference numbers are fine).

## Your input
Your batch files are named in your task message: JSON arrays in `/tmp/claude-0/-home-user-Digitaltestmaster/0e914911-9c2a-5e28-9d47-87cdc85a1881/scratchpad/rates/batch_NN.json`, each item has `file_id` and `file_name` (ignore the other keys). Load tools with ToolSearch `select:mcp__Google_Drive__read_file_content`. Read each PDF by `file_id`. If a file cannot be read or is empty, record it in your "unreadable" list and move on. Work through ALL files in your batches; do not sample.

## Output 1: charge lines
Append one JSON object per charge line to `/tmp/claude-0/-home-user-Digitaltestmaster/0e914911-9c2a-5e28-9d47-87cdc85a1881/scratchpad/cp/lines_<YOUR_TAG>.jsonl` with keys:
- `file_id`, `quote_ref`, `quote_date` (YYYY-MM-DD or "")
- `service`: what the quotation is for, one of: "Sea freight FCL", "Sea freight LCL", "Sea freight break bulk / bulk", "Sea freight RoRo", "Air freight", "Land freight (GCC / Oman trucking)", "Import customs clearance", "Transit (through Oman)", "Project / heavy-lift", "Warehousing / 3PL", "Container sale / lease", "Shipping agency", "Other" (if a quotation covers several, use the service of the SECTION the line sits in)
- `direction`: "Import", "Export", "Transit out of Oman", "Transit into Oman", "Within Oman", "Cross-trade", or ""
- `section`: the heading the line sits under in the quotation, verbatim, or ""
- `line_item`: the charge description, verbatim (trim to 160 characters)
- `amount`: number or null; `amount_high`: number or null (for ranges); `currency`: "OMR", "USD", "AED", ... or ""
- `basis`: verbatim unit/remark (per container, per shipment, per kg, per truck, per day, per CBM, per document, % of value ...)
- `treatment`: one of "fixed", "approx", "at actual", "included", "excluded", "to be advised", "if applicable", "percentage"
- `driver`: in a few words, the shipment fact(s) that decide whether this line applies or how big it is, chosen from this vocabulary where possible (combine with "+"): "container size", "container type", "number of containers", "weight", "chargeable weight", "volume (CBM)", "dimensions", "number of packages", "number of trucks", "truck type", "origin", "destination", "port / airport", "border", "carrier / line", "incoterm", "commodity", "dangerous goods", "temperature", "cargo value", "number of HS codes", "number of documents", "storage days", "free time", "vessel size (GRT/LOA)", "number of crew", "lease period", "new or used", "delivery address", "none (flat fee)".
Include lines stated as "at actual", "included" or "excluded", and optional / "if applicable" lines. Do NOT include terms-and-conditions sentences as lines, except where they state a priced charge (e.g. "detention OMR 50 per truck after 4 free hours": include it).

## Output 2: one record per quotation
Append one JSON object per quotation to `.../cp/quotes_<YOUR_TAG>.jsonl` with keys:
- `file_id`, `quote_ref`, `quote_date`, `service` (same vocabulary; a list if several), `direction`
- `details_given`: a list of the LABELS of the shipment-details table or opening paragraph as printed (e.g. ["POL", "POD", "Volume", "Terms of shipment", "Commodity", "Carrier", "Transit time", "Free time", "Chargeable weight", "Cargo dimensions", "Delivery location", "HS code", "Cargo value"]) with labels only where a value was actually filled in
- `inputs_needed`: your judgement, a list from the driver vocabulary above (add free-text items if needed), of the facts the sales team must have had from the customer to produce this quotation
- `assumptions`: a list of short phrases for any assumption or missing information the quotation itself flags (e.g. "subject to final dimensions", "HS code not provided", "delivery address to be confirmed", "MSDS required")
- `documents_required`: list of documents the quotation asks the customer for, if any

## Finish
Write `.../cp/done_<YOUR_TAG>.json`: {"files_total": n, "files_read": n, "unreadable": [file names], "lines": n}. Your final message: those counts, and the five most notable things you saw (charge types that recur, inputs that quotations repeatedly flag as missing or assumed). Use a Python script (`python3 -I`) to append JSON so the files stay valid; never hand-write malformed JSON. If you run short of budget, stop cleanly, write the done file with what you covered, and list the file_ids not yet read.
