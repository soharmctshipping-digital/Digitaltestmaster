// No waiting before replying: if the customer sent another message while this reply was being written,
// this run stops and the run for the newest message answers everything together (one reply, nothing lost).
const mine = $('Combine messages').first().json;
const myIds = new Set(mine.message_ids || [mine.message_id]);
const t = r => new Date(r.sent_at || r.createdAt).getTime();
const cutoff = Date.now() - 15 * 60000;
const all = $('Check for newer messages').all().map(i => i.json).filter(r => r && r.message_id);
const me = all.find(r => r.message_id === mine.message_id);
const myT = me ? t(me) : new Date(mine.received_at).getTime();
const myId = me ? Number(me.id) : Infinity;
const newer = all.filter(r => !myIds.has(r.message_id) && r.processed !== true && new Date(r.createdAt).getTime() >= cutoff && (t(r) > myT || (t(r) === myT && Number(r.id) > myId)));
if (newer.length) return [];
// Documents are never a condition for confirming. Here the documents the enquiry needs (worked out in "Build Claude request")
// are compared with the ones the AI identified among the files, and anything missing is named for the sales team.
return $('Read Claude answer').all().map(it => {
  const j = Object.assign({}, it.json);
  const lead = Object.assign({}, j.lead || {});
  const needed = String(lead.documents_needed || '');
  if (needed) {
    const have = String(lead.documents_received || '');
    const missing = needed === 'none' ? [] : needed.split(', ').filter(d => !new RegExp(d.indexOf('invoice') >= 0 ? 'invoice' : d.indexOf('packing') >= 0 ? 'packing' : 'msds|safety data', 'i').test(have));
    lead.documents_missing = missing.join(', ');
    if (j.trigger_handover === true) {
      const rest = String(lead.additional_info || '').replace(/^Documents not supplied: [^.]*\.\s*/, '');
      lead.additional_info = (missing.length ? 'Documents not supplied: ' + missing.join(', ') + '. ' : '') + rest;
    }
    j.lead = lead;
    j.lead_json = JSON.stringify(lead);
  }
  return { json: j, pairedItem: { item: 0 } };
});
