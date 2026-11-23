// Automatic import customs clearance quotation (owner's decisions, 23 Nov 2026).
// Straightforward enquiries are priced here from fixed rates, with no AI pricing:
// sea FCL at Sohar Port (dry / high cube, 20ft or 40ft), sea LCL through Sohar, air at Muscat Airport, not dangerous goods.
// Anything else, or anything unclear, returns auto: false and goes to the sales team exactly as before.
// MODE 'test': the PDF goes only to the testers below. MODE 'live': to every real customer. Switch at "go live".
const MODE = 'live';
const TESTERS = []; // owner's test numbers are set in n8n only, not in the repo
const NL = String.fromCharCode(10);
const p = $('Pick salesperson').first().json;
const s = $('Start').first().json;
const no = reason => [{ json: { auto: false, reason } }];
if (p.mode !== 'lead' || p.kind !== 'lead') return no('not a new enquiry');
if (String(p.language || 'en') !== 'en') return no('not English');

// The service form answers, word for word, from the chat history (the last form the customer sent).
let hist = [];
try { hist = JSON.parse(s.history_json || '[]'); } catch (e) { hist = []; }
let at = -1;
for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].role === 'user' && String(hist[i].content).indexOf('[The customer filled in the service form]') >= 0) { at = i; break; } }
if (at < 0) return no('no service form in the chat');
const block = String(hist[at].content);
const form = {};
for (const l of block.slice(block.lastIndexOf('[The customer filled in the service form]')).split(NL)) { const k = l.indexOf(': '); if (k > 0 && !(l.slice(0, k).trim() in form)) form[l.slice(0, k).trim()] = l.slice(k + 2).trim(); }
if (form['Service'] !== 'Import customs clearance') return no('not import customs clearance');
// Anything the customer changed or added after the form makes the form out of date: the sales team prices it.
const strip = c => String(c).replace(/^\[[^\]]*Oman time\]\s*/, '').trim();
for (let i = at + 1; i < hist.length; i++) {
  if (hist[i].role !== 'user') continue;
  for (const l of String(hist[i].content).split(NL).map(strip).filter(Boolean)) {
    if (/^\[The customer sent a /.test(l) || /^\[File /.test(l)) continue;
    // Replies about documents, thanks, yes / no are fine. New numbers or words that change something are not.
    if (/\d/.test(l) || /\b(change|changed|wrong|instead|actually|update|different|mistake|edit|correction|should be|make it|not .* but|also|add|plus|extra|another|more containers?|now it|sorry)\b/i.test(l)) return no('the customer added or changed details after the form');
  }
}
const via = form['Arriving by'] || '', point = form['Clearance point'] || '', what = form['What is being cleared'] || '';
let kind = '';
if (via === 'Sea' && point === 'Sohar Port' && what === 'Full container load (FCL)') kind = 'fcl';
else if (via === 'Sea' && point === 'Sohar Port' && what === 'Less than container load (LCL)') kind = 'lcl';
else if (via === 'Air' && point === 'Muscat Airport' && what === 'Air cargo') kind = 'air';
if (!kind) return no('outside the fixed-rate scope: ' + [via, point, what].join(' / '));
if (form['Dangerous goods'] !== 'No') return no('dangerous goods not "No"');
const qtyText = form['Quantity'] || '';
const size = form['Container size'] || '';
let n = 1, sz = '';
if (kind === 'fcl') {
  sz = size === '20ft' ? '20' : size === '40ft' ? '40' : '';
  if (!sz) return no('container size not a single 20ft or 40ft');
  const m = qtyText.match(/^\s*(\d{1,2})\b/);
  if (!m || /\b20\b.*\b40\b|\b40\b.*\b20\b/.test(qtyText)) return no('number of containers unclear: ' + qtyText);
  n = Number(m[1]);
  if (!(n >= 1 && n <= 20)) return no('number of containers out of range: ' + qtyText);
}
const address = form['Delivery address'] || '';
if (form['Delivery after clearance'] === 'Yes' && !address) return no('delivery wanted but no address');
// Weight in kg (air transport lanes depend on it).
let kg = 0;
for (const k of Object.keys(form)) { const m = k.match(/^Total weight \((kg|tonnes)\)$/); if (m) { const v = Number(String(form[k]).replace(/,/g, '')); if (v > 0) kg = m[1] === 'tonnes' ? v * 1000 : v; } }

// ---------- rates ----------
const f3 = x => Number(x).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const SUBJ = ' (subject to change due to certain conditions)';
// Transport lanes in OMR from the SST CLAUDE quotations (SST_Inland_Transport_Rate_List.md). Longest matching name wins.
const LANES = {
  fcl: [
    { to: 'Sohar Industrial Area', names: ['sohar industrial area', 'sohar industrial estate', 'sohar industrial city', 'falaj al qabail', 'madayn sohar'], rate: 50, sizes: ['20', '40'] },
    { to: 'Sohar town', names: ['sohar'], rate: 70, sizes: ['20', '40'] },
    { to: 'Saham', names: ['saham', 'magaisa'], rate: 125, sizes: ['20'] },
    { to: 'Barka', names: ['barka'], rate: 140, sizes: ['20', '40'] },
    { to: 'Seeb / Mabelah / Al Hail', names: ['seeb', 'mabelah', 'mabela', 'mabailah', "ma'belah", 'al hail'], rate: 150, sizes: ['20'] },
    { to: 'Rusayl', names: ['rusayl', 'rusail'], rate: 145, sizes: ['20', '40'] },
    { to: 'Muscat city', names: ['muscat', 'ghala', 'bausher', 'al khuwair', 'khuwair', 'ruwi', 'wadi kabir', 'muttrah', 'qurum', 'azaiba', 'ghubrah', 'madinat sultan qaboos'], rate: 140, sizes: ['20', '40'] },
    { to: 'Al Amerat', names: ['amerat', 'al amrat'], rate: 160, sizes: ['40'] }],
  lcl: [
    { to: 'Sohar town', names: ['sohar'], rate: 60 },
    { to: 'Seeb / Mabelah / Al Hail', names: ['seeb', 'mabelah', 'mabela', "ma'belah", 'al hail'], rate: 60 },
    { to: 'Rusayl', names: ['rusayl', 'rusail'], rate: 70 },
    { to: 'Muscat city', names: ['muscat', 'ghala', 'bausher', 'ruwi', 'muttrah', 'madinat sultan qaboos', 'ghubrah', 'al khuwair', 'khuwair'], rate: 60 },
    { to: 'Samail', names: ['samail', 'sumail'], rate: 160 },
    { to: 'Salalah', names: ['salalah'], rate: 350 }],
  air: [
    { to: 'Muscat city limits', names: ['muscat', 'seeb', 'mabelah', 'al hail', 'rusayl', 'rusail', 'ghala', 'bausher', 'ruwi', 'wadi kabir', 'muttrah', 'al khuwair', 'khuwair', 'qurum', 'azaiba', 'ghubrah'], rate: 50, maxKg: 2200 },
    { to: 'Saham', names: ['saham', 'magaisa'], rate: 80, maxKg: 2000 }]
};
const FROM = { fcl: 'Sohar Port', lcl: 'Sohar CFS', air: 'Muscat Airport' };
let lane = null, transportNote = '';
if (form['Delivery after clearance'] === 'Yes') {
  const a = ' ' + address.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  let best = 0;
  // A specific area beats a city name: "Seeb, Muscat" is Seeb, "Sohar Industrial Estate" is not Sohar town.
  const GENERIC = ['muscat', 'sohar'];
  for (const L of LANES[kind]) for (const nm of L.names) { const sc = GENERIC.indexOf(nm) >= 0 ? 1 : nm.length; if (a.indexOf(' ' + nm + ' ') >= 0 && sc > best) { best = sc; lane = L; } }
  if (lane && kind === 'fcl' && lane.sizes.indexOf(sz) < 0) { transportNote = 'no fixed ' + sz + 'ft rate to ' + lane.to; lane = null; }
  if (lane && kind === 'air' && (!kg || kg > lane.maxKg)) { transportNote = kg ? 'weight over the fixed-rate limit' : 'weight not given'; lane = null; }
  if (!lane && !transportNote) transportNote = 'delivery area not on our transport list';
}

// ---------- lines ----------
const rows = []; // { g, desc, basis, amount (number or text), inTotal, vat }
const add = (g, desc, basis, amount, inTotal, vat) => rows.push({ g, desc, basis, amount, inTotal: !!inTotal, vat: !!vat });
const xN = n > 1 ? ' x ' + n : '';
if (kind === 'fcl') {
  const G = 'A. PORT CHARGES – SOHAR PORT';
  add(G, 'CCRO Charges', 'OMR 10.770 / at actual, per shipment', 10.77, true);
  add(G, 'Port Container Release Order', 'OMR 4.300 / at actual, per container' + xN, 4.3 * n, true);
  add(G, 'Port Weighment', 'OMR 4.300 / at actual, per container' + xN, 4.3 * n, true);
  add(G, 'Port Documentation', 'OMR 0.640 / at actual, per container' + xN, 0.64 * n, true);
  const scan = sz === '20' ? 14 : 20.8, insp = sz === '20' ? 29.42 : 58.84;
  add(G, 'Container Scanning Service Fee', 'OMR ' + f3(scan) + ' / ' + sz + 'ft, at actual, per container' + xN + ' – if applicable, not in total', scan * n, false);
  add(G, 'Port Container Inspection', 'OMR ' + f3(insp) + ' / ' + sz + 'ft, at actual, per container' + xN + ' – if applicable, not in total', insp * n, false);
}
const C = kind === 'fcl' ? 'B. CUSTOMS CLEARANCE' : 'A. CUSTOMS CLEARANCE';
add(C, 'Delivery Order Charges', 'At actual, per shipment', 'At actual', false);
if (kind === 'lcl') add(C, 'CFS Charges', 'At actual, per shipment', 'At actual', false);
if (kind === 'air') add(C, 'Airport Handling Charges', 'At actual, per shipment', 'At actual', false);
add(C, 'Bill of Entry', 'OMR 15.000 / at actual, per shipment', 15, true);
let dutyBasis = 'At actual: approx. 5% customs duty on CIF value + 5% VAT';
const usd = Number(String(form['Cargo value (USD, for a duty estimate)'] || '').replace(/[, ]/g, ''));
if (usd > 0) { const omr = usd / 2.6008, duty = omr * 0.05, vat = (omr + duty) * 0.05; dutyBasis += '. On your declared value of USD ' + usd.toLocaleString('en-GB') + ': duty approx. OMR ' + f3(duty) + ', VAT approx. OMR ' + f3(vat) + ' (final as assessed by customs)'; }
add(C, 'Customs Duty + VAT', dutyBasis, 'At actual', false);
add(C, 'Documentation', 'Per shipment', 25, true, true);
add(C, 'PRO Inspection', 'Per shipment', 10, true, true);
const T = kind === 'fcl' ? 'C. TRANSPORTATION' : 'B. TRANSPORTATION';
if (form['Delivery after clearance'] === 'Yes') {
  if (lane) add(T, 'Transportation', FROM[kind] + ' to ' + lane.to + (kind === 'fcl' ? ', OMR ' + f3(lane.rate) + ' per container' + xN : ', per trip') + SUBJ, lane.rate * (kind === 'fcl' ? n : 1), true, true);
  else add(T, 'Transportation', FROM[kind] + ' to ' + address + ': to be advised by our sales team', 'TBA', false);
}
const vatBase = rows.filter(r => r.vat).reduce((t, r) => t + r.amount, 0);
const V = kind === 'fcl' ? (rows.some(r => r.g === T) ? 'D. VAT' : 'C. VAT') : (rows.some(r => r.g === T) ? 'C. VAT' : 'B. VAT');
add(V, 'VAT 5%', '5% on documentation, PRO inspection' + (lane ? ' and transportation' : '') + ' (OMR ' + f3(vatBase) + ')', vatBase * 0.05, true);
for (const r of rows) if (typeof r.amount === 'number' && !(isFinite(r.amount) && r.amount >= 0)) return no('an amount did not compute');
const total = rows.filter(r => r.inTotal).reduce((t, r) => t + r.amount, 0);
if (!(total > 0)) return no('total did not compute');

// ---------- quotation in the standard template's fields ----------
const now = DateTime.now().setZone('Asia/Muscat');
let v = now, k7 = 0;
while (k7 < 7) { v = v.plus({ days: 1 }); if ([5, 6].indexOf(v.weekday) < 0) k7++; }
const amt = a => typeof a === 'number' ? f3(a) : String(a);
const groupNames = [...new Set(rows.map(r => r.g))];
const groups = groupNames.map(g => {
  const lines = rows.filter(r => r.g === g).map(r => ({ desc: r.desc, basis: r.basis, amount: amt(r.amount) }));
  const sub = rows.filter(r => r.g === g && r.inTotal && typeof r.amount === 'number').reduce((t, r) => t + r.amount, 0);
  const many = rows.filter(r => r.g === g).length > 1;
  return { title: g, lines, subtotal: many && sub > 0 ? { label: 'Sub-total', basis: 'Fixed charges in this section', amount: f3(sub) } : {} };
});
const TITLES = { fcl: 'Import FCL clearance – Sohar Port', lcl: 'Import LCL clearance – Sohar', air: 'Import air cargo clearance – Muscat Airport' };
const first = String(p.name || '').trim().split(' ')[0];
const delivery = form['Delivery after clearance'] === 'Yes' ? address : 'Not required (collection by you)';
const terms = [
  'Quotation is based on per commercial document / per shipment basis unless otherwise stated.',
  'Rates are based on the details provided in the enquiry, invoice, packing list, and supporting documents. Any change in cargo details may result in revised charges.',
  'Rates are subject to truck availability and customs / port system acceptance.',
  'Free time for loading / offloading is 4 hours unless otherwise stated. Detention after free time will be charged at applicable rates.',
  'Customs clearance charges are based on a maximum of 10 HS codes. Additional HS codes will be charged at OMR 0.250 per HS code, subject to maximum applicable document charges.',
  'Any customs duty, VAT, deposits, fines, inspection charges, storage, demurrage, detention, or other government / third-party charges shall be billed at actual.',
  'The shipper / consignee is responsible for ensuring that all import / export documentation and product requirements comply with applicable regulations.',
  'Cargo insurance is not included and shall be arranged by shipper / consignee if required.',
  'Execution of the shipment shall be considered acceptance of this quotation and its terms and conditions.',
  'Any confidential information shared shall be used only for the purpose of providing the quoted services and shall not be disclosed to third parties unless required by law.'];
const documents = [kind === 'air' ? 'Air Waybill' : 'Bill of Lading', 'Commercial Invoice', 'Packing List', 'Certificate of Origin'];
const notIncluded = ['Customs duty and VAT (at actual)', 'Delivery order charges (at actual)', kind === 'lcl' ? 'CFS charges (at actual)' : kind === 'air' ? 'Airport handling charges (at actual)' : 'Container scanning / inspection, if applied', 'Storage, demurrage and detention', 'Customs fines, deposits and amendments', 'Additional HS codes over 10 (OMR 0.250 each)', 'Cargo insurance'];
const procedure = ['Authorise us in Bayan (customs code C00002210)', 'Send the original commercial invoice, packing list, certificate of origin and ' + documents[0], 'We collect the delivery order and file the Bill of Entry', 'Customs duty and VAT are paid against the Bill of Entry', form['Delivery after clearance'] === 'Yes' ? 'Cargo is released and delivered to your premises' : 'Cargo is released for your collection'];
const note = ['CUSTOMS AUTHORIZATION NOTE: Clearance shall be processed through our customs clearance agency, SEA LINK CLEARING & LOGISTICS LLC. Customs code for Bayan authorization: C00002210. Kindly authorize us in Bayan to proceed with customs formalities.',
  'As per the Directorate General of Customs, with effect from 1 August 2022, all import shipments must have the original commercial invoice, packing list, and certificate of origin. If any document is unavailable or only a copy is submitted, additional duty of 2% on CIF value may apply.',
  'Any other charges levied by port, customs, carrier, airline, CFS, terminal, or any third-party authority shall be charged at actual with your approval, wherever applicable.'].join(NL);
const totalLine = 'OMR ' + f3(total);
const fields = {
  TITLE: 'CUSTOMS CLEARANCE CHARGES QUOTATION', SUBTITLE: TITLES[kind], QUOTE_REF: p.reference, TO: p.company && p.company !== 'Individual' ? 'M/s. ' + p.company : p.name, ATTN: p.name || '-',
  DATE: now.toFormat('dd LLLL yyyy'), CURRENCY: 'OMR', VALID_UNTIL: v.toFormat('dd LLLL yyyy'), SALUTATION_NAME: first || 'Sir / Madam',
  INTRO: 'Greetings of the day, and thank you for your enquiry. With reference to your request, we are pleased to offer the following for your kind consideration:',
  SD_TERMS: 'Import – customs clearance', SD_PICKUP: 'Not applicable', SD_POL_LABEL: 'Arriving by', SD_POL: via, SD_POD_LABEL: 'Clearance point', SD_POD: point,
  SD_CARRIER: 'As per ' + documents[0], SD_TRANSIT: 'Not applicable', SD_COMMODITY: form['Cargo'] || 'To be advised',
  SD_PACKAGES: kind === 'fcl' ? n + ' x ' + sz + 'ft' : (qtyText || 'To be advised'), SD_DIMENSIONS: kind === 'fcl' ? sz + 'ft container' : 'To be advised',
  SD_WEIGHT: kg ? f3(kg).replace(/\.000$/, '') + ' kg' : 'To be advised', SD_R5_LABEL: 'ETA', SD_R5: form['Arrival date (ETA)'] || 'To be advised', SD_DELIVERY: delivery,
  TOTAL_TITLE: 'TOTAL FIXED CHARGES (incl. 5% VAT on our service charges)', TOTAL_LINE: totalLine,
  TOTAL_NOTE: 'Charges marked "at actual" with no amount, and items marked "if applicable", are not included in the total and will be billed as per supporting invoices.',
  NOTE: note, PROCEDURE: procedure, DOCUMENTS: documents, TERMS: terms,
  CLOSING_LINE: 'We trust our offer meets your requirements and look forward to your valued confirmation.',
  SALESPERSON: p.salesperson === 'Aabel' ? 'Aabel Joseph' : p.salesperson, SALES_TITLE: p.salesperson_title
};
const half = Math.ceil(notIncluded.length / 2);
fields.NOT_INCLUDED_L = notIncluded.slice(0, half); fields.NOT_INCLUDED_R = notIncluded.slice(half);
groups.forEach((g, gi) => {
  const G = 'G' + (gi + 1);
  fields[G + '_TITLE'] = g.title;
  g.lines.forEach((l, li) => { fields[G + '_R' + (li + 1) + '_DESC'] = l.desc; fields[G + '_R' + (li + 1) + '_BASIS'] = l.basis; fields[G + '_R' + (li + 1) + '_AMT'] = l.amount; });
  fields[G + '_SUB_LABEL'] = g.subtotal.label || ''; fields[G + '_SUB_BASIS'] = g.subtotal.basis || ''; fields[G + '_SUB_AMT'] = g.subtotal.amount || '';
});
if (groups.length > 4 || groups.some(g => g.lines.length > 6)) return no('layout over the template limits');
const quote = { layout: 'customs_fixed', title: fields.TITLE, subtitle: fields.SUBTITLE, to: fields.TO, attn: fields.ATTN, salutation_name: fields.SALUTATION_NAME, intro: fields.INTRO,
  shipment: { terms: fields.SD_TERMS, pickup: fields.SD_PICKUP, pol_label: fields.SD_POL_LABEL, pol: fields.SD_POL, pod_label: fields.SD_POD_LABEL, pod: fields.SD_POD, carrier: fields.SD_CARRIER, transit: fields.SD_TRANSIT, commodity: fields.SD_COMMODITY, packages: fields.SD_PACKAGES, dimensions: fields.SD_DIMENSIONS, weight: fields.SD_WEIGHT, r5_label: fields.SD_R5_LABEL, r5: fields.SD_R5, delivery: fields.SD_DELIVERY },
  groups, total_title: fields.TOTAL_TITLE, total_line: totalLine, total_note: fields.TOTAL_NOTE, note, not_included: notIncluded, procedure, documents, terms, closing_line: fields.CLOSING_LINE,
  total_ex_vat: f3(total - vatBase * 0.05), vat: f3(vatBase * 0.05), total: f3(total), currency: 'OMR',
  pricing_basis: 'Fixed customs rates (' + kind.toUpperCase() + ', ' + point + '), no AI pricing' + (transportNote ? '; transport to be advised: ' + transportNote : ''), confidence: 'Fixed rates' };
const phone = String(p.phone || '');
const sendAllowed = !phone.startsWith('99999') && (MODE === 'live' || TESTERS.indexOf(phone) >= 0);
const caption = 'Dear ' + (first || 'Sir / Madam') + ', further to your enquiry ' + p.reference + ', please find attached our customs clearance quotation, valid until ' + fields.VALID_UNTIL + '. ' + fields.SALESPERSON + ' from our sales team will follow up with you.';
const envelope = { failed: false, reference: p.reference, version: 1, doc_name: p.reference + ' – Sohar Shipping Customs Clearance Quotation', fields, quote,
  line_items: groups.map(g => g.title + ': ' + g.lines.map(l => l.desc + ' ' + l.amount).join('; ')).join(' | '), total_line: totalLine, pricing_basis: quote.pricing_basis, confidence: 'Fixed rates',
  match_count: 0, matches: [], auto_customs: true, customs_kind: kind, customs_mode: MODE, send_allowed: sendAllowed,
  send_block: sendAllowed ? '' : (phone.startsWith('99999') ? 'test number' : 'test mode: not a tester number'), caption, transport_note: transportNote };
return [{ json: { auto: true, reason: 'fixed-rate ' + kind, envelope } }];
