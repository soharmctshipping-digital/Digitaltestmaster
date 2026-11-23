# CCRO and port release charges: which rates are fixed

Checked 23 Nov 2026 against:
- all 339 quotations in the SST CLAUDE Drive folder (the charge-point extraction, `SST_Charge_Points_by_Service.xlsx`);
- the rates workbook `SST_Customs_Clearance_and_Container_Rates.xlsx`;
- the uploaded quotation templates (`Clearance_Charges_Quotation_LATEST.docx` and the others).

"Fixed" here means the same published tariff figure appears again and again across different quotations and dates (Jul to Oct 2026). These are port or customs tariff items, so the quotation should still say "at actual". Sohar Shipping passes them on at cost, and the port can change its tariff.

## 1. Fixed: safe for the bot to put in a quotation

### Sohar Port, container terminal (OICT / Hutchison Ports Sohar): FCL import clearance

| Charge (as printed in our template) | Rate | Basis | How often seen |
|---|---|---|---|
| CCRO Charges | **OMR 10.770** (≈ USD 28.01) | per shipment (per B/L / customs declaration) | 54 of 67 quotations that priced it |
| Port Container Release Order | **OMR 4.300** (≈ USD 11.18) | per container | 42 of 47 |
| Port Weighment | **OMR 4.300** | per container (import laden) | 55 of 70 |
| Port Documentation | **OMR 0.640** (≈ USD 1.66) | per container | 55 of 64 |

How the bot adds them up:
- **CCRO total** = 10.770 + (4.300 + 4.300 + 0.640) × number of containers.
- 1 container = **OMR 20.010**; 2 = 29.250; 3 = 38.490.
- The past quotations that printed a CCRO total of OMR 34.010 are this sum for one container plus scanning (OMR 14.000).

### Sohar Port, container terminal: fixed amount, charged only if it happens

| Charge | Rate | Basis | How often seen |
|---|---|---|---|
| Container Scanning Service Fee | **OMR 14.000 (20ft)**, **OMR 20.800 (40ft / 40HQ)** | per container, at actual | 57 of 71 (40ft figure in 13) |
| Port Container Inspection | **OMR 29.420 (20ft)**, **OMR 58.840 (40ft)** | per container, if applicable | 25 of 72 (40ft figure in 9) |

Our LATEST template prints both of these lines with exactly these figures.

### Sohar Port, general cargo berths (C. Steinweg Oman, CSO tariff from 1 April 2026)

| Charge | Rate | Basis | Used for |
|---|---|---|---|
| CRO / cargo release order | **OMR 10.500** (≈ USD 27.31) | per B/L, tariff clause 10.6.3 (A) | break bulk, RoRo, project cargo (10 quotations) |

### Port Sultan Qaboos (Muscat)

| Charge | Rate | Basis |
|---|---|---|
| CCRO / certificate charge | **OMR 10.000** (≈ USD 26.01) | per B/L / document, PSQ tariff item 831 (6 quotations) |

## 2. Seen often, but confirm before the bot uses them

These are consistent figures, but they appear only in some quotations, so it isn't clear whether they always apply:

| Charge | Figure seen | Basis | Note |
|---|---|---|---|
| Radioactive Detection Service | OMR 2.000 | per container | in 20 quotations, always this figure |
| Enhanced Security Charge | OMR 6.460 | per container | 10 of 44 quotations with a security line |
| Shifting Container for Inspection | OMR 26.930 | per container, if applicable | 10 quotations |
| Truck loading at port (laden) | OMR 5.000 (20ft) / 10.000 (40ft) | per container | 7 quotations |

## 3. Not fixed: the bot should not quote these as set figures

- **Port Handling / CCRO lump sums per container** on transit quotes (USD 174, 177, 190, 200, 213): approximate totals that change with the box, line and port.
- **One-off CCRO totals** (OMR 23.49, 29.71, 43.17, 48.17; USD 88.45, 112.26, 125.27, 383.32): sums that mixed in other items for a specific shipment.
- **Duqm:** only a few, differing figures (USD 26.01, USD 35). Not enough to call a rate fixed.
- **Salalah:** no CCRO figure found in any quotation.
- **Sea freight FCL (shipping-line quotes):** CCRO is shown as "not included" or "at actual as per the OICT tariff", with no figure.
- Odd single figures (OMR 10.61, OMR 11.00, OMR 18.10 per hour): not a pattern.

## 4. How the bot puts them in the quotation (owner's rule, 23 Nov 2026)

The figure before "/ at actual" is also the billed amount, so it goes in the Amount column. Example for 1 x 40ft at Sohar container terminal:

| Description | Basis / Remarks | Amount (OMR) |
|---|---|---|
| CCRO Charges | OMR 10.770 / at actual, per shipment | 10.770 |
| Port Container Release Order | OMR 4.300 / at actual, per container | 4.300 |
| Port Weighment | OMR 4.300 / at actual, per container | 4.300 |
| Port Documentation | OMR 0.640 / at actual, per container | 0.640 |
| Container Scanning Service Fee | OMR 20.800 / 40ft, at actual, if applicable | 20.800 |
| Port Container Inspection | OMR 58.840 / 40ft, at actual, if applicable | 58.840 |

Rules:
- **Amount = rate x quantity:** per container x number of containers; per shipment once.
- **Container size:** use the 20ft or 40ft figure that matches each box.
- **Fixed lines** (CCRO, release order, weighment, documentation) go into the total.
- **"If applicable" lines** (scanning, inspection) show their amount too, but are kept out of the total and marked "if applicable", unless the owner decides otherwise.
- **Example totals:** for the example above, the total is OMR 20.010, and with scanning and inspection it would be OMR 99.650.
- **Amounts with 3 decimals**, as OMR is written.

The machine-readable version is in `bot_build/ccro_rates.json`.
