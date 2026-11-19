# C. WhatsApp forms (Flows) and how the bot uses their answers

Scope read in full: SST T8 (7EJgEb3mWFYdoYC2, all 17 nodes), SST F (4WS9cL1ExSBZDEpE, all 6 nodes), SST T7 (IN0jveiTPSE5UJ0I, all 11 nodes); in SST 1 (NTuIx1AbdFxb5chR): "Read message", "Build Claude request", "Read Claude answer", "Combine messages", "Options message", "Send the options", "Reply with buttons", "Show buttons?". sst_conversation_log: all 63 rows. Leads tab header + first 5 rows.

Method note: the "Form definition" code was re-run locally (read-only, nothing sent to Meta) with the port lists shortened, to count components, check names, label lengths and the final payload. Component counts and name checks below come from that run.

## Form v22 as built

Name "SST service form v22 required sizes", id 29363394833300676, Flow JSON 7.0, 4 screens, no endpoint (no data_exchange). 188 payload keys. "req" = required, "opt" = optional. Every radio/dropdown/checkbox is required.

**Screen 1 SERVICE "How can we help?"** (10 components)
- `mode` radio "Choose a service": sea Sea freight · air Air freight · land Land transport · customs Import customs clearance · transit Transit through Oman · project Project and heavy-lift cargo · warehousing Warehousing and 3PL · containers Buy or lease containers · agency Shipping agency (vessels)
- If sea / air / project: `direction_<mode>` radio "Import or export?": import Import into Oman · export Export from Oman
- If land: `direction_land` radio "Where is it going?": import Into Oman · export Out of Oman · oman Within Oman

**Screen 2 BASICS "About your request"** (99 components incl. If blocks and footer)
- sea: subheading "Port of loading"; `pol_region` dropdown "Region" (Middle East [id `export`], Indian subcontinent, East Asia, South East Asia, Europe and Mediterranean, Africa, North America, Central and South America, Other (type the port)); pre-selected from the direction. Per region one If with `pol_sea_<region>` dropdown "Port" (12 / 12 / 38 / 35 / 41 / 12 / 23 / 34 ports; stored value "Port, Country"). If other: `origin_sea` text "Port name" req. Same again for discharge: `pod_region` (Middle East id `import`), `pod_sea_<region>`, `destination_sea`.
- sea: `sea_type` radio "Type of sea shipment": fcl Full container load (FCL) · lcl Less than container load · bulk Break bulk or bulk · roro RoRo (Roll-on/Roll-off)
- project + import: `terms_project` radio "Shipping terms" (EXW, FOB, Not sure); if EXW: `supplier_name_project` req, `supplier_address_project` req, `supplier_contact_project` "Supplier phone/email" opt
- project: `clearance_project` radio "Customs clearance by us?" (Yes/No/Not sure); import: `door_project` "Delivery to your premises?" (Yes/No) → if yes `delivery_address_project` req; export: `collect_project` "Collection from you?" → if yes `pickup_address_project` req
- air: `origin_air` "Airport of origin" req, `destination_air` "Destination airport" req
- land: `truck_land` radio "Type of truck" (Flatbed trailer, Low-bed, Closed box or curtain side, Reefer truck with genset, Not sure); `dunit_land` dropdown "Size unit" (cm/m); `dims_land` "Largest piece size" req
- customs: `via_customs` radio "Arriving by" (Sea/Air/Road); `point_sea_customs` (Sohar Port, Duqm Port, Salalah Port, Somewhere else) / `point_air_customs` (Muscat Airport, Salalah Airport, Somewhere else) / `point_road_customs` (A road border, Somewhere else) "Where is it cleared?"; if other: `point_other_<via>_customs` "Which place?" req
- transit: `entry_transit` "Entering Oman at" (Sohar Port, Duqm Port, Salalah Port, Muscat Airport, A road border); `equip_transit` "What is moving?" (Containers, Vehicles (Roll-on/Roll-off), Break bulk or loose cargo); `trucks_transit` "Do you need our trucks?" (Yes / No, we have our own)
- warehousing: `wtype_warehousing` "Type of storage" (General (indoor dry), Temperature-controlled, Free zone or bonded, Not sure); `location_warehousing` "Preferred location" (Muscat (Rusayl), Sohar Free Zone, Not sure); `duration_warehousing` "How long for?" req
- containers: `action_containers` "Buy or lease?"; if lease `lease_containers` "Lease period" req; `condition_containers` "New or used?" (New/Used/Either)
- agency: `port_agency` "Port of call" (Sohar, Muscat (Sultan Qaboos), Duqm, Salalah, Another port); `services_agency` checkboxes "Services needed" (Port agency / vessel handling, Crew change, Ship chandlery (supplies), Something else), min 1

**Screen 3 DETAILS "A few details"** (99 components)
- sea FCL: `size_fcl` "Container size" (20 feet, 40 feet, Both); `ctype_fcl` "Container type" (Standard (dry), High cube, Reefer (refrigerated), Open top or flat rack, ISO tank, Not sure); if reefer `temp_fcl` "Set temperature (°C)" req; if open top/flat rack `dunit_fcl` + `oog_fcl` "Cargo size" req
- sea bulk: `kind_bulk` "What kind of cargo?" (Break bulk (pieces) / Bulk (loose)); `dunit_bulk` + `dims_bulk` "Largest piece size" req; `hunit_bulk` (kg/t) + `heavy_bulk` "Heaviest piece" req number; if break bulk: note "A packing list is required for break bulk cargo…"
- sea RoRo: `vehicle_roro` (Cars or SUVs, Trucks or buses, Machinery on wheels, A mix); `condition_roro` (New/Used); `running_roro` (Yes/No)
- sea and air (same block each): import → `terms_<m>` (sea: EXW/FOB/Not sure; air: EXW/FCA/Not sure); if EXW supplier name req, address req, phone/email opt; `clearance_<m>` (Yes/No/Not sure); import → `door_<m>` → `delivery_address_<m>` req; export → `collect_<m>` → `pickup_address_<m>` req
- land: import → `terms_land` (EXW/FCA/Not sure), if EXW `supplier_name_land` req (no address/contact); import → `clearance_land`; export → `clearance_export_land`; all → `loading_land` "Loading help needed?" (Yes/No/Not sure)
- project: `dunit_project` + `dims_project` "Largest piece size" req; `hunit_project` + `heavy_project` "Heaviest piece" req
- customs: `equip_customs` "What is being cleared?" (Full container load (FCL), Reefer container, Less than container load (LCL), Vehicles, Break bulk (pieces), Project or heavy-lift cargo, Air cargo); `eta_customs` date opt; `code_customs` "Oman customs code?" (Yes/No/Not sure); road + break bulk: note "…the commercial invoice and the packing list are required…"; sea/air: `delivery_<via>_customs` "Delivery after clearance?" → address req (`delivery_address_customs` for sea, `delivery_address_air_customs` for air); road: `delivery_address_road_customs` "Delivery location" req (always)
- transit + containers: `size_transit`, `ctype_transit` (no ISO tank / Not sure)
- warehousing: `services_warehousing` checkboxes (Handling in and out, Pick and pack, Inventory management, Local delivery, Container offloading), min 1
- containers: `size_containers`, `ctype_containers`, `delivery_containers` "Collection or delivery?" (We collect from your yard / Deliver to our site) → if deliver `delivery_address_containers` req
- agency: `vessel_name_agency` req; `vessel_imo_agency` number opt

**Screen 4 FINAL "Final details"** (87 components)
- FCL: `commodity_fcl` "What is the cargo?" req; `qty_fcl` "How many containers?" req; `wunit_fcl` (kg/t) + `weight_fcl` "Consignment weight" req number
- LCL: commodity; `qty_lcl` "How many packages?"; `dunit_lcl` + `dims_lcl` "Package size"; `wunit_lcl` + `weight_lcl` "Total weight"; `volume_lcl` "Cubic metres (CBM)" number; `stackable_lcl` (Yes/No/Not sure) – all req
- bulk: commodity; `qty_bulk` "How many pieces?"; wunit + `weight_bulk` – all req
- RoRo: `make_roro` "Make and model"; `qty_roro`; wunit + `weight_roro` "Weight per vehicle" – all req
- all sea: `dg_sea` "Dangerous goods?" (No/Yes/Not sure); `ready_sea` "Cargo ready date" req
- air: commodity, qty (packages), dunit + dims (package size), wunit + weight, `volume_air`, stackable, dg, ready – all req
- land: note "The commercial invoice and the packing list are required for road freight…"; `pickup_address_land` req; `delivery_address_land` req; commodity; `qty_land` "How many trucks?"; wunit + weight; dg; ready – all req
- project: `origin_project` "From", `destination_project` "To", commodity, qty (pieces), wunit + weight, dg, ready – all req
- customs: commodity, `qty_customs` "How many?", wunit + weight, dg – all req (no ready date, no origin)
- transit: `origin_transit` "Coming from", `destination_transit` "Final destination", commodity, qty "How many?", wunit + weight req; `value_transit` "Cargo value" opt; dg; ready req
- warehousing: commodity, `qty_warehousing` "How many pallets?", wunit + `weight_warehousing` "Weight per pallet", dg, `ready_warehousing` "Start date" – all req
- containers: `qty_containers`, `ready_containers` "Needed by" – req
- agency: `eta_agency` "Expected arrival" req
- everyone: `notes` "Anything else?" opt

**Meta limits – result of the check**
- Duplicate component names: none (within or across screens, including across If branches).
- `||` conditions: none.
- Text input labels: none over 20; three are exactly 20 ("Supplier phone/email", "Set temperature (°C)", "How many containers?").
- Dropdown labels and option titles: none over the limit; "Less than container load (LCL)" and "Puerto Santo Tomás de Castilla" are exactly 30.
- Components per screen: SERVICE 10, BASICS 99, DETAILS 99, FINAL 87 – see C3.

**Real submissions**: the log holds 7 service-form submissions (17–18 Nov), all made on earlier form versions. T8 was last saved 19 Nov 06:04 UTC and no service form has been submitted since, so v22 has no real submission in the log yet.

---

## Findings

### C1. Mandatory documents and the MSDS rule are enforced only by the prompt, and a real dangerous-goods enquiry was confirmed without an MSDS
- Category: Improvement
- Severity: High
- Where: SST 1 → Build Claude request (FLOW step 4b), Read Claude answer
- Evidence: prompt 4b: "For dangerous goods, never send the summary or set confirmed_now until an MSDS file has arrived". Log id 20 (form said "Dangerous goods: Yes"): the bot sent the full summary, "please send the MSDS", and "Tap *Yes, confirm*" in one message; id 21 "Yes, confirm" → "Your enquiry reference is SST-261118-EJRS". No file was received. In ids 14 and 18 (DG Yes) the bot instead asked for "class or UN number" and never mentioned the MSDS. "Read Claude answer" has no check on `files_received` before `triggerHandover`.
- Impact: the same prompt-only mechanism now carries the new mandatory rules (invoice + packing list for land and road break bulk; packing list for sea break bulk). An enquiry can be confirmed and handed to sales without the documents the business says are required. (The prompt wording at the time of ids 14–21 may have been older than today's.)
- Proposed fix: in "Read Claude answer", work out from the stored form answers which documents are mandatory, and if `confirmed_now` is true while `files_received` is 0 (or the DG/land/break-bulk flag is set with no file), set `confirmed_now = false`, drop the confirm buttons and replace the reply with a fixed "we still need …" line. To do this, "Read message" should also output a small `form_flags` object (service, dg, kind, via, equip) instead of only text.
- Risk of the fix: a customer who genuinely cannot supply a document is held (see C2). Does not touch a testing switch.
- Confidence: Confirmed (log + code)

### C2. No way forward for a customer who does not have a mandatory document, and the rule covers local trucking inside Oman
- Category: Improvement
- Severity: High
- Where: SST 1 → Build Claude request (4b); T8 → Form definition (FINAL, land note)
- Evidence: 4b: "do NOT send the summary until every mandatory document has arrived … if they do not have one yet, ask them to send it as soon as they can and say the team cannot prepare the quote without it" and later "Never ask for documents twice." Form: the land note shows for every `mode == 'land'`, including `direction_land = oman` ("Within Oman"). Log ids 26–29: customer "Can this enquiry be made without that document at the moment" → "I'm afraid not"; the enquiry was never confirmed.
- Impact: an enquiry stuck here never reaches the sales team (no reference, no handover). A domestic truck move, which normally has no commercial invoice, is blocked the same way. The two sentences in 4b ("name each missing document" until all arrive vs "never ask twice") pull in opposite directions.
- Proposed fix: decide the business rule, then state it once: either (a) hand the enquiry over anyway, marked "documents pending", after the customer says they will send them later; or (b) keep the block but exempt "Within Oman". Rewrite 4b as a short table (service → documents) and delete the duplicated sentences.
- Risk of the fix: (a) sales receive enquiries without documents. No testing switch involved.
- Confidence: Confirmed (rule text and one real case for the MSDS variant); the land/break-bulk variants have no log case yet

### C3. A customer who types their shipment details first is asked for all of them again in the form
- Category: Repeated question
- Severity: High
- Where: SST 1 → Build Claude request (FLOW 3, 3a), Read Claude answer (form send)
- Evidence: prompt: "never ask for details in text that a form collects"; 3a always sends the forms when available. "Read Claude answer": `flow_action_payload: … : { screen: 'SERVICE' }` – no data is passed, and the SERVICE screen declares `data: {}`. Only the details form is pre-filled (`name`, `email`).
- Impact: someone who opens with "Need a quote for 2 x 40ft furniture, Shanghai to Sohar, FOB" still has to pick service, direction, region, port, container size, cargo, quantity, weight and date in the form. Nothing in the log shows it yet because every test chat started with "Hi".
- Proposed fix: add to 3a: "if the customer has already given the service and the main shipment details in text, do not send the service form; ask only for what is missing, together, in one message". Longer term, pass `mode` and `direction_*` as initial data to the SERVICE screen (needs a new form version).
- Risk of the fix: fewer structured answers for those customers. No testing switch involved.
- Confidence: Likely (design confirmed in code; no real case in the log)

### C4. BASICS and DETAILS screens each hold 99 of the 100 components Meta allows
- Category: Improvement
- Severity: Medium
- Where: T8 → Form definition
- Evidence: local rebuild: "SCREEN BASICS … COMPONENT COUNT 99", "SCREEN DETAILS … COMPONENT COUNT 99" (If blocks and footer counted), FINAL 87.
- Impact: the next added question or If block on either screen makes Meta reject the form. Several fixes below (C5, C6) need one more component.
- Proposed fix: free space first: on BASICS merge the two `M('containers', …)` blocks and the three `point_other_*` inputs can become one input under a nested If; on DETAILS merge the two `DT('direction_land','import', …)` blocks and the two `DT('via_customs','road', …)` blocks. Or move the project block from BASICS to DETAILS/FINAL.
- Risk of the fix: any change means a new form id and re-publish; names must stay unique.
- Confidence: Confirmed

### C5. Three choices have no follow-up field, so the bot has to ask afterwards
- Category: Repeated question
- Severity: Medium
- Where: T8 → Form definition (BASICS); SST 1 → Read message
- Evidence: `port_agency` option "Another port" → text sent to Claude is "Port of call: Other"; `point_road_customs` "A road border" (description "Wajajah, Khatm Al Shikla, Al Madina and others") and `entry_transit` "A road border" → "Clearance point: A road border" / "Entering Oman at: Road"; `services_agency` "Something else" → no detail. Sea and air customs do have "Which place?".
- Impact: the customer has just finished a four-page form and is then asked "which port?" or "which border?" in chat.
- Proposed fix: add a "Which port?" input under `port_agency == other`, and replace "A road border" with the named borders as options (no extra component). Needs the space from C4.
- Risk of the fix: new form version.
- Confidence: Confirmed (form and mapping); the follow-up question itself is Likely

### C6. Loose bulk cargo must fill in "Largest piece size" and "Heaviest piece"
- Category: Inconsistency
- Severity: Medium
- Where: T8 → Form definition (DETAILS, `DT('sea_type','bulk', …)`)
- Evidence: `kind_bulk` options "Break bulk (pieces)" / "Bulk (loose) – Salt, aggregates, grain and similar", followed in the same block by `dims_bulk` and `heavy_bulk`, both `required: true`. FINAL even says `Write "loose" for bulk cargo` for the piece count.
- Impact: a salt or grain shipper cannot continue without inventing a piece size and a heaviest-piece weight (number only); the invented values go to sales as facts.
- Proposed fix: move the four size/weight components into `F('kind_bulk','breakbulk', …)` next to the packing-list note (no extra component: reuse that If).
- Risk of the fix: new form version.
- Confidence: Confirmed

### C7. Weight, volume and dates are required with no "not sure", and LCL/air must give both package size and CBM
- Category: Inconsistency
- Severity: Medium
- Where: T8 → Form definition (FINAL); SST 1 → Build Claude request (3c)
- Evidence: `weight_*` and `volume_*` are `required: true` with `input-type: 'number'`; `ready_*` is a required date. Prompt 3c asks for "weight, volume or dimensions". Earlier Leads rows show weight "Not sure". Log id 49: form gave "Package size (cm): 120 X 130 X 100 … Total volume (CBM): 22" → bot: "come to about 3.1 CBM, but the form says 22 CBM. Could you confirm"; id 52 asks for the volume again.
- Impact: customers who do not know the weight (vehicles, pallets, FCL) or the date must make one up or abandon the form; asking for the same quantity twice (size and CBM) produces conflicting answers that the bot then queries, twice in the real case.
- Proposed fix: make CBM optional where package size is required (or the reverse), and say in the helper text "leave blank if you don't know". For weight, either make it optional or accept text. Tell Claude in b2 to query a mismatch once only.
- Risk of the fix: fewer complete enquiries for sales; new form version.
- Confidence: Confirmed

### C8. Import/export can contradict the ports chosen, which costs an extra question
- Category: Improvement
- Severity: Medium
- Where: T8 → Form definition (BASICS port blocks)
- Evidence: log id 14: "Import or export: Import into Oman … Port of loading: Sohar, Oman / Port of discharge: Shanghai, China" → bot: "Is it an import from Shanghai to Sohar, or an export from Sohar to Shanghai?"; same in id 18 (Sohar → Jebel Ali). v22 only pre-selects the region (`'init-value': ${data.direction_sea}`); both port lists are still fully open. The Middle East list contains one Omani port, Sohar; Salalah, Duqm and Muscat are only reachable through "Other (type the port)", although the customs and agency sections list them.
- Impact: extra round trip in chat; customers using Salalah or Duqm must type the port.
- Proposed fix: for import show only an "Oman port" dropdown for discharge (Sohar, Salalah, Duqm, Muscat) and for export the same for loading, using `DT('direction_sea', …)`; this also removes about ten components from BASICS (helps C4).
- Risk of the fix: cross-trade enquiries (neither port in Oman) would need "Other"; new form version.
- Confidence: Confirmed (real cases were on an older version; v22 still allows it)

### C9. Tonnes can be written into the `weight_kg` column
- Category: Inconsistency
- Severity: Medium
- Where: T8 → Form definition (`WU` kg/t); SST 1 → Read message; Build Claude request (lead schema); Leads tab column R
- Evidence: Read message: `wu = g('wunit') === 't' ? 'tonnes' : 'kg'` → "Total weight (tonnes): 12". Lead schema and sheet column: `"weight_kg":""`. The prompt says nothing about converting.
- Impact: a 12-tonne load may be stored as "12" under weight_kg (wrong by 1,000) or as "12 tonnes" in a column other steps may treat as kg. The same applies to "Heaviest piece", which has no column at all.
- Proposed fix: convert in "Read message" (`t` → value × 1000) and always output kg, e.g. "Total weight (kg): 12000 (entered as 12 tonnes)".
- Risk of the fix: none for the form; small code change in a live node.
- Confidence: Likely (no tonnes submission in the log to confirm)

### C10. Some answers reach Claude as raw codes or with a different meaning from the label the customer tapped
- Category: Inconsistency
- Severity: Medium
- Where: SST 1 → Read message (table `L`) vs T8 → Form definition
- Evidence: `point_air_customs = salalah_air` has no entry in `L` → "Clearance point: salalah_air". `equip_customs = project` → "What is being cleared: project"; `= air` → "Air" (form: "Air cargo"); `= fcl` → "Full container(s)" (form: "Full container load (FCL)"). "Sohar Port / Duqm Port / Salalah Port" → "Sohar / Duqm / Salalah"; "Muscat (Rusayl)" and "Muscat (Sultan Qaboos)" → "Muscat". Transit "A road border" → "Road". Reefer temperature is passed without "°C".
- Impact: Claude and the sales team see codes or shortened names; "Sohar" for a warehouse or clearance point is ambiguous with the city.
- Proposed fix: add `salalah_air: 'Salalah Airport'`, `project: 'Project or heavy-lift cargo'` and per-field maps for the customs equipment and port options; append "°C" to the temperature line.
- Risk of the fix: none beyond editing a live code node.
- Confidence: Confirmed

### C11. The form describes LCL as "Shared container", which the prompt forbids
- Category: Inconsistency
- Severity: Medium
- Where: T8 → Form definition (`equip_customs`); SST 1 → Build Claude request
- Evidence: form: `['lcl', 'Less than container load (LCL)', 'Shared container, smaller shipments']`. Prompt: "Always call LCL “less than container load”, never “shared container”."
- Impact: the customer sees the banned term in the form.
- Proposed fix: change the description to "Smaller shipments, charged by volume" (as in `sea_type`).
- Risk of the fix: new form version.
- Confidence: Confirmed

### C12. The same service has up to four different names across the form, the prompt, the form-to-text code and the service list
- Category: Inconsistency
- Severity: Medium
- Where: T8 → Form definition (`MODES`); SST 1 → Read message (`MODE`), Build Claude request (OUR SERVICES), Read Claude answer (`SERVICES`)
- Evidence: "Land transport" (form) / "Land freight" (Read message, prompt, list) / "road freight" (form note). "Transit through Oman" / "Transit Bayan". "Warehousing and 3PL" / "Warehousing and distribution" / "Warehousing / 3PL". "Buy or lease containers" / "Container sale or lease" / "Container sale and leasing" / "Container sale / lease". "Full container load (FCL)" / "Full container" / "Full container(s)". "Less than container load" (sea) / "Less than container load (LCL)" (customs).
- Impact: the customer taps "Land transport" and the summary says "Land freight"; the mandatory-document rule in the prompt keys on the words "Land freight" and "Import customs clearance", which only match because "Read message" renames the form's labels.
- Proposed fix: pick one name per service and use it in all four places; keep the names in one constant in "Build Claude request" and reference it from "Read Claude answer".
- Risk of the fix: wording change only; form part needs a new version.
- Confidence: Confirmed

### C13. Land and customs forms give no "from/to", but the prompt tells the bot those are essential
- Category: Repeated question
- Severity: Medium
- Where: SST 1 → Build Claude request (b2), Read message; T8 → Form definition
- Evidence: b2: "If anything important for their service is still missing (for freight: from, to and what the cargo is), ask for all of it together". Land form has only `pickup_address_land` / `delivery_address_land`; "Read message" outputs "Pickup address" and "Delivery address" and no From/To line. Customs has no origin at all. Land EXW collects only "Supplier name", while 3c lists "supplier name, address and contact if EXW".
- Impact: the bot may ask a land customer "where from and to?" straight after they typed both full addresses, or ask for the supplier's address when it is the pickup address.
- Proposed fix: in "Read message" for land, also output "From: <pickup address>" and "To: <delivery address>"; add to b2: "for land freight the pickup and delivery addresses are the from and to; for customs clearance no origin is needed".
- Risk of the fix: none.
- Confidence: Likely (no land or customs submission in the log)

### C14. Two Claude calls per enquiry only produce fixed sentences
- Category: Token/usage
- Severity: Medium
- Where: SST 1 → Build Claude request, Read Claude answer
- Evidence: after "New enquiry" the reply is always a variant of "A quick form will open from the button below for your details" (log ids 12, 24, 32, 36, 43, 47, 54, 58, 62); after the details form it is always "Got it, <name>. Now pick your service in the next form." (ids 3, 13, 25, 33, 37, 44, 48, 55, 59, 63). "Read Claude answer" already forces `optKind` in both cases. Each call sends the full prompt, FAQ and history with `max_tokens: 4000`.
- Impact: roughly two of the five or six Claude calls in a normal enquiry add nothing.
- Proposed fix: in "Build Claude request", handle both cases in code: for the details form, copy name, company, customer_type, email and contact into `lead` directly and return the fixed line with `service_form`; for a tapped "New enquiry" return the fixed line with the right form. Skip "Ask Claude".
- Risk of the fix: loses the small wording variation; the returning-customer greeting ("Welcome back, Aabel") must be kept in the fixed text.
- Confidence: Confirmed

### C15. "Collection or delivery?" answers are written from the customer's side while the rest of the form speaks as Sohar Shipping
- Category: Improvement
- Severity: Low
- Where: T8 → Form definition (`delivery_containers`); SST 1 → Read message
- Evidence: options "We collect from your yard" / "Deliver to our site". Elsewhere "we/us/our" is Sohar Shipping ("Customs clearance by us?", "We collect from your supplier", "Do you need our trucks?"). "Read message" reads the first as "Collect from Sohar Shipping’s yard".
- Impact: a customer can read "We collect from your yard" as Sohar Shipping collecting from them, the opposite of what is recorded.
- Proposed fix: "I will collect from Sohar Shipping’s yard" / "Deliver to my site".
- Risk of the fix: new form version.
- Confidence: Confirmed

### C16. Export shipments are shown an import description under "Customs clearance by us?"
- Category: Inconsistency
- Severity: Low
- Where: T8 → Form definition (`clearance()` inside `importExport`)
- Evidence: `clearance(k)` always carries "Bill of entry and customs formalities in Oman" and is shown under `M(k)` for both directions of sea, air and project. Land has its own export text ("Export declaration and border formalities in Oman").
- Impact: a bill of entry is an import document; exporters see the wrong explanation.
- Proposed fix: use the neutral "Customs formalities in Oman" for sea, air and project (no extra component).
- Risk of the fix: new form version.
- Confidence: Confirmed

### C17. Smaller wording points a customer would notice
- Category: Improvement
- Severity: Low
- Where: T8 → Form definition
- Evidence: "20-foot or 40-foot container" vs "A 20 foot or 40 foot container" vs "20 feet (20ft)". "Pickup address" / "We pick up" beside "Collection from you?". "Delivery address" vs "Delivery location" (road customs). Notes say "I will ask you to upload" while the form says "we/us". "Cubic metres (CBM)" is a unit used as a question; "How many?" (customs, transit) relies on the helper. "Cargo value" is optional but its helper says "needed for the customs guarantee". Australian ports sit under "South East Asia"; "Manzanillo – Mexico / Panama" is one entry for two ports. `equip_customs` offers "Air cargo" when arriving by sea or road. Dimension examples mix scales under one unit picker ("9.2 x 2.9 x 3.7" vs "120 x 80 x 100"). "Anything else?" invites "documents you have..." and the bot then asks about documents again. No non-UK spellings found (the one "Organization" is ISO's official name).
- Impact: small inconsistencies; the Manzanillo entry can send a quote to the wrong country.
- Proposed fix: tidy in the next form version; split Manzanillo into two entries; rename the region "South East Asia and Australia"; label the volume field "Total volume (CBM)".
- Risk of the fix: new form version.
- Confidence: Confirmed

### C18. Stale version notes, old form ids and unused settings around the forms
- Category: Redundancy
- Severity: Low
- Where: T8 → Form definition, Forms to publish, Failed draft ids, Form preview, Reset my test chat; SST 1 → Build Claude request
- Evidence: Form definition header "SST service form v12 … Was v8/v9" but builds v22. Forms to publish comment: "service form v8 1844751193474024" (comment only). Failed draft ids: `['1111626801691691']` with a comment about v6/v7 and "v3 (29168388922814149) is kept as a fallback" – running it would send a DELETE for an old id. Form preview reads `…/2409970049406767`, which is not v22. Build Claude request: "Port search trial: the service form with live port search (v10, still a draft)" although `PORT_SEARCH_FORM.id` is the published v22 and equals `FORM.service`; two consecutive comments contradict each other ("every number except the sales team" / "everyone, including the sales team"); `isStaffNumber`, `FORM.mode`, `FORM.service_mode`, `FORM.testers` (while `live: true`) are computed or set but have no effect. In Form definition the label arguments to `weight()` ("Total weight (kg)", "Weight (tonnes)", "Kg per vehicle") are ignored, and `opts` / `rn` are unused. "Reset my test chat" (deletes sst_chats rows) is not connected to anything. Both forms have a screen called DETAILS. No reference to v9, v15 or v20 ids was found; the only live ids are 29363394833300676 and 1160717989865940.
- Impact: none for customers today; the next person to run "Form preview" or "Run draft cleanup" acts on the wrong form.
- Proposed fix: update the comments, point Form preview at 29363394833300676, empty "Failed draft ids", delete `PORT_SEARCH_FORM` and `isStaffNumber`.
- Risk of the fix: `FORM.testers` and `live` are a testing switch – leave their values alone.
- Confidence: Confirmed

### C19. SST F (port search) is no longer used by the form, and its branches in "Read message" are only reachable from old form messages
- Category: Redundancy
- Severity: Low
- Where: SST F → all nodes; SST 1 → Read message (`listed`)
- Evidence: v22 has no `data_exchange` action or PORT_SEARCH / PORT_PICK screen ("No server needed" in Form definition). SST F is unpublished and carries its own copy of the port list (with aliases) alongside `REGIONS` in T8. "Read message" still handles `typed:` values and a bare `pol_sea` / `pod_sea` key, which v22 cannot produce.
- Impact: two port lists to keep in step; old port-search form messages still sitting in testers' chats would fail to load if reopened.
- Proposed fix: archive SST F once the port-search idea is dropped, and remove the `typed:` handling then; otherwise note in SST F that it is parked.
- Risk of the fix: loses the search endpoint and key pair if the idea returns.
- Confidence: Confirmed

### C20. The details form cannot be rebuilt or checked from the workflows
- Category: Improvement
- Severity: Low
- Where: T8 → Form definition, Forms to publish; SST 1 → Read message, Read Claude answer
- Evidence: Form definition returns one form only (the service form). The details form 1160717989865940 appears only as an id ("Already published: details form 1160717989865940") and through the keys "Read message" expects: `name`, `customer_type`, `company`, `position`, `email`, `contact`.
- Impact: if the details form needs a change (a published form cannot be edited), there is no source to start from, and its labels and limits could not be audited here.
- Proposed fix: add the details form's JSON to T8 as a second code node.
- Risk of the fix: none.
- Confidence: Confirmed (absence in T8, T7, SST F and SST 1)

### C21. SST T7's note and steps do not match the templates it submits
- Category: Inconsistency
- Severity: Low
- Where: T7 → Sticky Note, Build template payloads, Sample quotation PDF / Start upload session / Upload sample PDF
- Evidence: note: "submits the three sales-team templates (sst_new_enquiry with a PDF header, sst_enquiry_reminder, sst_enquiry_escalation)". Code builds four others: `sst_quote_followup`, `sst_quote_followup_manager`, `sst_daily_digest`, `sst_weekly_report`, none with a header, so the downloaded and uploaded sample PDF is never used. T8's disabled test node still uses `sst_enquiry_reminder`.
- Impact: none for customers; a re-run downloads and uploads a file for nothing, and the note misleads.
- Proposed fix: correct the note and remove the three PDF nodes, or restore the header template if it is still wanted.
- Risk of the fix: none (one-off utility).
- Confidence: Confirmed

### C22. For dangerous goods the bot sometimes asks for class or UN number, which neither the form nor the prompt asks for
- Category: Inconsistency
- Severity: Low
- Where: SST 1 → Build Claude request (4b); T8 → Form definition (`dg_*`)
- Evidence: log ids 14 and 18: "Which item is dangerous, and what is its class or UN number, if you know it?"; id 26 (same situation) asks only for the MSDS. The form has a Yes/No/Not sure question only, and "Not sure" has no rule in the prompt.
- Impact: different customers get different questions for the same answer.
- Proposed fix: add to 4b: "do not ask for the class or UN number; the MSDS covers it. If the answer is Not sure, say the sales team will check." 
- Risk of the fix: none.
- Confidence: Confirmed (older form versions; prompt may have changed since)

## Mandatory-document rule: consistency check
- Form: sea + break bulk (pieces) → packing list; customs + road + break bulk → invoice and packing list; land (all three directions) → invoice and packing list. 
- Prompt 4b: the same three cases, same documents. The words it keys on ("Arriving by: Road", "Break bulk (pieces)", "Land freight", "Kind of cargo") are what "Read message" outputs.
- Code: no enforcement anywhere (C1). No other workflow read here mentions the rule.
- Result: form and prompt agree; the gaps are enforcement (C1), the dead end and the Within Oman case (C2).

## Repeated questions seen in the real log
- No case where the bot re-asked a field the form had plainly supplied.
- Nearest cases: volume queried twice after the form gave both size and CBM (ids 49, 52 – C7); direction queried because ports contradicted it (ids 14, 18 – C8); weight and ready date asked after the form (ids 14, 18) because those older versions left them optional – v22 makes them required.
- Returning customer (id 5) correctly skipped the details form.

## Not covered
- The details form itself (id 1160717989865940): its definition is not in any workflow I read, so labels, required flags and limits were not checked (C20).
- The live form on Meta: I did not call Meta. Findings describe what "Form definition" generates; I assumed the published v22 was created from this exact code.
- No v22 submission exists in the log, so v22's text output was checked by reading code only, not against a real payload. How Meta fills payload keys for hidden fields was not observed.
- Land, customs, transit, project, warehousing, containers and agency: no real submissions of any version in the log (only sea FCL ×6 and air ×1).
- Other workflows (SST 2, C, D, G and the rest) were only searched for the form ids and the phrase "packing list" in the copies of SST 2 and SST 3 already saved by other auditors (no hits); SST C, D, G were not read.
- sst_chats lead_json was not read, so how Claude actually stored tonnes or form extras (C9) is unverified.
