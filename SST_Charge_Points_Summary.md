# Charge points by service, and the inputs the bot needs

Built 23 November 2026 from the quotation PDFs in the SST CLAUDE Drive folder (331 read in full; 2 image-only PDFs could not be read; plus 9 container sale quotations from an earlier pass). Full detail: `SST_Charge_Points_by_Service.xlsx`. Scripts: `bot_build/charge_points/`.

## Gaps in the WhatsApp form (v23)

| Service | Fact | Status | Charges it affects | Proposed question |
|---|---|---|---|---|
| Sea freight FCL | Number of HS codes | Missing | HS codes beyond 10 at OMR 0.250 each (max OMR 40) | Ask only when customs clearance is Yes: "How many different products (HS codes)? Not sure is fine." Or read it from the invoice once uploaded. |
| Sea freight FCL | Free days needed at destination | Missing | Free time extensions are sold per container (USD 25 to 875) | Optional: "Do you need extra free days at Sohar Port? (No / Yes, how many)" |
| Sea freight LCL | Number of HS codes | Missing | HS codes beyond 10 | As for FCL. |
| Sea freight break bulk / bulk | Total volume (CBM) | Missing | Port handling, stevedoring and freight are charged per freight ton (the larger of tonnes and CBM) | Add "Total volume (CBM)", "not sure" accepted, as for LCL. |
| Sea freight break bulk / bulk | Freight tons | Partly |  | Worked out once total volume is asked. |
| Sea freight RoRo | Electric or hybrid | Missing | EV surcharge at Sohar (OMR 1.525 per unit) and EV handling at Duqm | Add "Electric or hybrid?" (No / Electric / Hybrid / Mix). |
| Air freight | Exhibition / temporary import | Partly | Trade licence usage fee (USD 200 to 250), ATA carnet | Add "Is this for an exhibition or temporary import?" (No / Yes). |
| Air freight | Number of HS codes | Missing | HS codes beyond 10 | As for FCL. |
| Land freight (GCC / Oman trucking) | Number of HS codes | Missing | HS codes beyond 10 | As for FCL. |
| Import customs clearance | Container size (20ft / 40ft) | Partly | Scanning, inspection, delivery order, transport and storage differ by size | Add "Container size" (20ft / 40ft / both) when FCL or reefer is chosen. |
| Import customs clearance | Number of trucks (road) | Partly | Oman inspection and UAE truck release are per truck | Rename "How many?" to "How many trucks?" when arriving by road. |
| Import customs clearance | Number of HS codes | Missing | HS codes beyond 10 at OMR 0.250 each | Add "How many different products (HS codes)?", "not sure" accepted. |
| Import customs clearance | Cargo value | Missing | Only needed to estimate duty and VAT | Optional "Cargo value (for a duty estimate)". Not needed while duty is quoted at actual. |
| Transit (through Oman) | Cargo value | Partly | Bank guarantee: 2% of duty and VAT, minimum USD 350 | Make "Cargo value" required (it sets the bank guarantee). |
| Transit (through Oman) | Empty container return location | Missing | The largest transport price difference (one way, back to Sohar, to Jebel Ali or Duqm) | Add "Where does the empty container go back to?" (Stays at destination / Back to Sohar / Jebel Ali / Duqm / Not sure) when containers are moving. |
| Transit (through Oman) | Electric or hybrid vehicles | Missing | EV handling and guarantee at Duqm and Sohar | Add "Electric or hybrid?" when vehicles are moving. |
| Transit (through Oman) | Local consignee or importer of record at destination | Missing | Importer / exporter of record service (USD 260 to 500) when there is no local consignee | Add "Is there a consignee at destination who will clear the goods?" (Yes / No / Not sure). |
| Transit (through Oman) | Number of HS codes | Missing | HS codes beyond 10 | As for FCL. |
| Project / heavy-lift | Total volume (CBM) | Missing | Port handling per freight ton | Add "Total volume (CBM)", "not sure" accepted. |
| Project / heavy-lift | Shipped as break bulk or on flat racks | Missing | Different port tariff and equipment | Add "How is it shipped?" (Break bulk / Flat rack or open top / Not sure). |
| Project / heavy-lift | Crane or offloading at site | Missing | Crane, labour, site survey | Add "Crane or offloading help at site?" (Yes / No / Not sure), as for land freight. |
| Warehousing / 3PL | Arriving palletised or loose | Missing | Handling-in rates differ (seen per pallet and per loose piece) | Add "Arriving as" (Pallets / Loose cartons / Mix). |
| Warehousing / 3PL | Local delivery destinations | Missing | Delivery rate | When "Local delivery" is ticked: "Delivery areas" (text). |
| Shipping agency | Vessel size (GRT / LOA) and type | Missing | Port dues, pilotage, tugs and agency fee scale by vessel size | Add "Vessel type and size (GRT or LOA)", optional; the sales team can look it up from the IMO number. |
| Shipping agency | Days alongside / at anchor | Missing | Berth and anchorage dues | Add "Expected days in port". |
| Shipping agency | Number of crew joining / leaving | Missing | Crew change, visas, transport | When "Crew change" is ticked: "How many crew joining and leaving?" |

## Services with too few quotations to judge

- Shipping agency: no quotations in the folder. The input list is from general practice.
- Warehousing / 3PL: one quotation (free zone).
- Sea freight LCL, break bulk, RoRo and project: 7 to 13 quotations each.
