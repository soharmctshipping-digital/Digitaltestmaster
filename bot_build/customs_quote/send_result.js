// After the customs quotation PDF: did it reach the customer on WhatsApp? Passes the PDF on for the email and records.
const q = $('Turn draft into template fields').first().json;
const r = $('Render quotation PDF').first();
let sent = false, id = '', note = q.send_block || '';
try {
  if ($('Send quotation to customer').isExecuted) {
    const o = $('Send quotation to customer').first().json || {};
    id = (o.messages && o.messages[0] && o.messages[0].id) || '';
    sent = Boolean(id);
    note = sent ? '' : ('WhatsApp did not accept it: ' + String((o.error && (o.error.message || JSON.stringify(o.error))) || o.message || 'no message id').slice(0, 200));
  }
} catch (e) { sent = false; }
const at = DateTime.now().setZone('Asia/Muscat').toFormat('HH:mm');
return [{ json: Object.assign({}, r.json, { sent_to_customer: sent, wa_message_id: id, send_note: note, sent_at: sent ? at : '' }), binary: r.binary }];
