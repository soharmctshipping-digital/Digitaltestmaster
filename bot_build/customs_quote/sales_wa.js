// WhatsApp copy for the salesperson whose turn it is: the enquiry and the customs quotation PDF (via SST W).
const NL = String.fromCharCode(10);
const p = $('Pick salesperson').first().json;
const q = $('Turn draft into template fields').first().json;
const res = $input.first();
const r = p.reference;
const cust = p.name + (p.company ? ', ' + p.company : '');
const status = res.json.sent_to_customer ? '✅ Sent to the customer on WhatsApp at ' + res.json.sent_at + '.' : '⚠️ NOT sent to the customer (' + (res.json.send_note || 'unknown reason') + '). Please send it yourself.';
const free = [
  '*Customs clearance enquiry ' + r + '* – your turn',
  status,
  'Customer: ' + cust,
  'Mobile: ' + p.mobile,
  'Email: ' + (p.email || '-'),
  'Prefers: ' + (p.preferred_contact || '-'),
  'Service: ' + p.service,
  'Cargo: ' + [p.commodity, p.container_type_qty, p.packages, p.weight_kg ? p.weight_kg + ' kg' : ''].filter(Boolean).join(', '),
  'Special: ' + (p.special_needs || '-'),
  'Notes: ' + (p.additional_info || '-'),
  p.documents_folder ? '*Documents folder:* ' + p.documents_folder : '',
  '*Quotation total:* ' + q.total_line + ' (fixed rates, incl. 5% VAT on our charges)',
  q.transport_note ? 'Transport to be advised: ' + q.transport_note : '',
  'Please follow up with the customer.',
  r + ' contacted  /  ' + r + ' won  /  ' + r + ' lost, price'
].filter(Boolean).join(NL);
return [{ json: { to: p.salesperson_phone, reference: r, free_text: free, pdf_caption: r + ' – customs quotation' + (res.json.sent_to_customer ? ' (sent to customer)' : ' (NOT sent)'), filename: res.json.file_name, template: { name: 'sst_new_enquiry', params: [r, cust, p.service, q.total_line || 'see PDF'], with_pdf: true } }, binary: res.binary }];
