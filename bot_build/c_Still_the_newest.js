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
// Safety net for the lead record, written in code so it never depends on the AI:
// 1. notes already on the lead are never lost when the AI rewrites them;
// 2. documents are never a condition for confirming, and anything missing is named for the sales team;
// 3. at confirmation, any form answer that appears nowhere on the lead is added to the notes.
let prev = {};
try { prev = $('Build Claude request').first().json.prev_lead || {}; } catch (e) { prev = {}; }
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '');
return $('Read Claude answer').all().map(it => {
  const j = Object.assign({}, it.json);
  if (j.fallback === true) return { json: j, pairedItem: { item: 0 } };
  const lead = Object.assign({}, j.lead || {});
  const sameEnquiry = String(lead.previous_reference || '') === String(prev.previous_reference || '');
  if (sameEnquiry) {
    for (const k of ['additional_info', 'special_needs']) {
      const now = String(lead[k] || ''), was = String(prev[k] || '');
      if (!was || now === was) continue;
      const lost = was.split(/;\s*|\n+/).map(x => x.trim()).filter(x => x && !/^Documents not supplied:/.test(x) && norm(now).indexOf(norm(x)) < 0);
      if (lost.length) lead[k] = [now].concat(lost).filter(Boolean).join('; ');
    }
  }
  const needed = String(lead.documents_needed || '');
  let missing = [];
  if (needed) {
    const have = String(lead.documents_received || '');
    missing = (needed === 'none' || needed === 'not applicable') ? [] : needed.split(', ').filter(d => !new RegExp(d.indexOf('invoice') >= 0 ? 'invoice' : d.indexOf('packing') >= 0 ? 'packing' : 'msds|safety data', 'i').test(have));
    lead.documents_missing = missing.join(', ');
  }
  if (j.trigger_handover === true) {
    let notes = String(lead.additional_info || '').replace(/^Documents not supplied: [^.]*\.\s*/, '');
    if (lead.form_text) {
      const exact = new Set(Object.keys(lead).filter(k => k !== 'form_text').map(k => norm(lead[k])));
      const hay = norm(Object.keys(lead).filter(k => k !== 'form_text').map(k => String(lead[k])).join(' ') + ' ' + notes);
      const extra = String(lead.form_text).split('\n').map(l => l.trim()).filter(Boolean).filter(l => {
        const i = l.indexOf(': '); const label = l.slice(0, i), val = l.slice(i + 2);
        const v = norm(val);
        if (!v) return false;
        if (v.length >= 6) return hay.indexOf(v) < 0;
        const key = norm(label.split(' (')[0]).slice(0, 9);
        return key.length >= 5 && hay.indexOf(key) < 0 && !exact.has(v);
      });
      if (extra.length) notes = [notes, 'From the form: ' + extra.join('; ')].filter(Boolean).join(notes && !/[.;]\s*$/.test(notes) ? '; ' : ' ');
    }
    lead.additional_info = (missing.length ? 'Documents not supplied: ' + missing.join(', ') + '. ' : '') + notes;
    delete lead.form_text;
  }
  j.lead = lead;
  j.lead_json = JSON.stringify(lead);
  return { json: j, pairedItem: { item: 0 } };
});
