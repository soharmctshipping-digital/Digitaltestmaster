# Stage C: fixes from the live test of 19 Nov. Applies on top of final_Build_Claude_request.js (stage B) -> c_Build_Claude_request.js
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:90]); return s.replace(old, new)
def repline(s, prefix, newline):
    lines = s.split('\n'); hits = [i for i, l in enumerate(lines) if l.startswith(prefix)]
    assert len(hits) == 1, (len(hits), prefix[:80]); lines[hits[0]] = newline; return '\n'.join(lines)
def q(text): return "  '" + text.replace('\\', '\\\\').replace("'", "\\'") + "',"
s = open('final_Build_Claude_request.js').read()
# keep the raw form answers on the lead, and skip the documents step where documents make no sense
s = rep(s, "    lead.documents_needed = need.length ? need.join(', ') : 'none';\n",
"""    const noDocs = ['Container sale or lease', 'Warehousing and distribution', 'Shipping agency'].indexOf(svc) >= 0;
    lead.documents_needed = need.length ? need.join(', ') : (noDocs ? 'not applicable' : 'none');
    // The form answers are kept word for word, so no detail can be lost between the form and the sales team.
    lead.form_text = txt.slice(at0).split(NL).slice(1).filter(l => l.indexOf(': ') > 0).join(NL).slice(0, 3000);
""")
s = rep(s, "const docsMissing = docsNeeded && docsNeeded !== 'none' ? ", "const docsMissing = docsNeeded && docsNeeded !== 'none' && docsNeeded !== 'not applicable' ? ")
s = rep(s, "JSON.stringify(Object.assign({}, lead, { file_links: undefined }))", "JSON.stringify(Object.assign({}, lead, { file_links: undefined, form_text: undefined }))")
s = repline(s, "  '4. When you have the details, send a short, clear summary",
  q("4. When you have the details, send a short, clear summary and ask: “Is everything correct? Tap *Yes, confirm*, or tell me what to change.” Set options to \"confirm\". (stage awaiting_confirmation) Lay the summary out the same way every time: one item per line as “Label: value”, no bold and no bullet marks, in this order, leaving out any line with nothing to show: Name; Company; Contact by; Service; Import or export; From; To; Cargo; Containers or quantity; Weight; Volume or size; Shipping terms; Ready date; Special needs; Other details; Documents."))
s = rep(s, "4b. Documents (this comes BEFORE the summary in step 4). Documents are asked for firmly but are NEVER a condition for confirming an enquiry. Once the service form details have arrived, ask ONCE: ",
           "4b. Documents (this comes BEFORE the summary in step 4). Documents are asked for firmly but are NEVER a condition for confirming an enquiry. If DOCUMENTS NEEDED below says “not applicable”, skip this step completely and go straight to the summary. Otherwise, once the service form details have arrived, ask ONCE: ")
s = repline(s, "  'In lead, fill in ONLY the fields that are new or have changed",
  q("In lead, fill in ONLY the fields that are new or have changed in this message and return \"\" for every other field: the system keeps everything already in DETAILS KNOWN SO FAR, so do not repeat it. Two exceptions: additional_info and special_needs are running notes, so whenever you change one of them return its FULL text (everything already there plus the new details), never just the new part. weight_kg is the number of kilograms only (for example “21000”), with no words."))
s = repline(s, "  \"- Reply in the customer's language:",
  "  \"- Reply in the customer's language: Arabic if they write in Arabic, otherwise English with UK spelling. In Arabic the city and the port are written صحار (never سوهار); keep the company name in English as “Sohar Shipping”.\",")
open('c_Build_Claude_request.js', 'w').write(s)

open('c_Still_the_newest.js','w').write(r'''// No waiting before replying: if the customer sent another message while this reply was being written,
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
''')
print('ok')
