# Stage B: applies on top of the stage A output (new_*.js) and writes final_*.js
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:90]); return s.replace(old, new)
def repline(s, prefix, newline):
    lines = s.split('\n'); hits = [i for i, l in enumerate(lines) if l.startswith(prefix)]
    assert len(hits) == 1, (len(hits), prefix[:80]); lines[hits[0]] = newline; return '\n'.join(lines)
def q(text):  # one prompt line as a JS single-quoted string element
    return "  '" + text.replace('\\', '\\\\').replace("'", "\\'") + "',"

s = open('new_Build_Claude_request.js').read()

# --- item 2: which documents this enquiry needs, worked out in code from the service form ---
s = rep(s, "const filesReceived = Number(lead.files_received || 0) + Number(msg.new_files || 0);\n",
"""const filesReceived = Number(lead.files_received || 0) + Number(msg.new_files || 0);
// Documents the sales team needs, worked out here from the service form (never by the AI). They are asked for firmly
// but are never a condition: a missing document is reported to the sales team by name when the enquiry is confirmed.
{
  const txt = String(msg.content || '');
  const at0 = txt.lastIndexOf('[The customer filled in the service form]');
  if (at0 >= 0) {
    const fv = {};
    for (const l of txt.slice(at0).split(NL)) { const i = l.indexOf(': '); if (i > 0 && !(l.slice(0, i) in fv)) fv[l.slice(0, i).trim()] = l.slice(i + 2).trim(); }
    const svc = String(fv['Service'] || '');
    const need = [];
    const bb = x => /^break bulk/i.test(String(x || ''));
    if (svc === 'Land freight' || (svc === 'Import customs clearance' && fv['Arriving by'] === 'Road' && bb(fv['What is being cleared']))) need.push('commercial invoice', 'packing list');
    else if (svc === 'Sea freight' && bb(fv['Kind of cargo'])) need.push('packing list');
    if (/^yes/i.test(String(fv['Dangerous goods'] || ''))) need.push('MSDS (safety data sheet)');
    lead.documents_needed = need.length ? need.join(', ') : 'none';
  }
}
const docsNeeded = String(lead.documents_needed || '');
const docsHave = String(lead.documents_received || '');
const docsMissing = docsNeeded && docsNeeded !== 'none' ? docsNeeded.split(', ').filter(d => !new RegExp(d.indexOf('invoice') >= 0 ? 'invoice' : d.indexOf('packing') >= 0 ? 'packing' : 'msds|safety data', 'i').test(docsHave)) : [];
""")

# --- prompt changes ---
s = repline(s, "  'Always call LCL “less than container load”",
  q("Always call LCL “less than container load”, never “shared container”. Do not list or offer cargo insurance; if a customer asks about it, say the sales team will advise with their quotation.") + "\n" +
  q("Export customs clearance is not a separate service: we handle it as part of shipping an export, so never offer it on its own. When you mean the port, always write “Sohar Port”, never just “Sohar”."))
s = repline(s, "  '3. New enquiry. Never ask questions one at a time",
  q("3. New enquiry. When ENQUIRY FORMS below says available, ALWAYS use the two forms, even when the customer has already typed some or all of their details: copy what they typed into lead (anything without a field of its own goes in additional_info, so nothing they wrote is lost), say in a few words that you have noted it, and send the form. Never ask in text for details that a form collects."))
s = repline(s, "  '   b2) When a message starts with “[The customer filled in the service form]”",
  q("   b2) When a message starts with “[The customer filled in the service form]”, copy everything into lead. If anything important for their service is still missing (for freight: from, to and what the cargo is), ask for all of it together in ONE short message; otherwise go on to the documents (step 4b) and then the summary (step 4). For less than container load (LCL) and air freight, accept the package size and the volume exactly as given, including “not sure”: never query a difference between them and never ask for them again. Send each form at most once per enquiry unless the customer asks for it again."))
s = repline(s, "  '   c) Without the forms (Arabic,",
  q("   c) Only when the forms cannot be used (Arabic, ENQUIRY FORMS says not available, or the customer says they cannot open the form): ask for what is still missing in short messages of at most THREE questions each, skipping anything already known, in this order: who they are (name; company or individual; how they would like to be contacted: WhatsApp, call or email); what they need (service; import or export; for imports the shipping terms: sea EXW or FOB, air or land EXW or FCA); then the shipment (from, to, cargo, quantity, weight, volume or dimensions, cargo-ready date). Ask for the supplier’s name and address only if the terms are EXW, and about door delivery only if it matters for their service."))
s = repline(s, "  '4b. Documents (this comes BEFORE the summary in step 4)",
  q("4b. Documents (this comes BEFORE the summary in step 4). Documents are asked for firmly but are NEVER a condition for confirming an enquiry. Once the service form details have arrived, ask ONCE: if DOCUMENTS NEEDED below names any documents, ask for exactly those by name, as PDF or photo files in this chat, and say the sales team needs them to prepare an accurate quotation; if it says none, ask once, warmly, whether they would like to share any documents (for example the commercial invoice or packing list). If the customer says they do not have them, will send them later, asks for help with them, or just carries on without sending them, accept that in one short sentence (the sales team will follow it up with them) and go straight to the summary in step 4. When a file arrives, say briefly that it has been received and saved; if DOCUMENTS STILL TO COME below names something, mention it once, otherwise ask them to let you know when they have finished sending. When they say they have finished (done, that is all, no more) or decline, send the summary. Never ask for the same document twice, and never hold back the summary or the confirmation because a document is missing: the system tells the sales team which documents were not supplied. In lead.documents_received, list every document you can clearly identify among the files sent in this enquiry so far (for example “commercial invoice, packing list, MSDS”); \"\" if there are none. Files that arrive after the enquiry is confirmed are saved automatically, so just thank them briefly."))
s = repline(s, "  'OUTPUT: return ONLY one JSON object",
  q("OUTPUT: return ONLY one JSON object, with no text before or after it:"))
s = rep(s, '"additional_info":""},"last_question":"the question you just asked, if any"}\',',
           '"additional_info":"","documents_received":""},"last_question":"the question you just asked, if any"}\',')
s = repline(s, "  'In lead, include every detail known so far",
  q("In lead, fill in ONLY the fields that are new or have changed in this message and return \"\" for every other field: the system keeps everything already in DETAILS KNOWN SO FAR, so do not repeat it.") + "\n" +
  q("") + "\n" +
  q("IMPORTANT: You have no tools. Never write <invoke>, XML or function calls. Your whole answer is one JSON object that starts with { and ends with }.") + "\n" +
  q("AFTER CONFIRMATION: whenever the customer sends any additional information, change, document or requirement after their enquiry was confirmed, put it in lead, set notify_sales = true and reply briefly in their language, for example: \"Got it, I have passed this on to our sales team, who will be in touch soon.\" Do not set it for greetings or thanks, and never for a request to cancel (that is handled by CANCELLING with cancel_requested).") + "\n" +
  q("Never mention technical problems, errors, systems or AI to the customer.")[:-1])
s = rep(s, "  'ENQUIRY FORMS: ' + (formAllowed ? 'available' : 'not available (ask in grouped messages)'),\n",
"""  'ENQUIRY FORMS: ' + (formAllowed ? 'available' : 'not available (ask in short messages, see step 3c)'),
  'DOCUMENTS NEEDED: ' + (docsNeeded ? docsNeeded : 'not worked out yet (no service form so far)'),
  'DOCUMENTS STILL TO COME: ' + (docsNeeded ? (docsMissing.length ? docsMissing.join(', ') : 'none') : 'not known'),
""")
# --- the whole request is built here (answer format included), so the three "Ask Claude" steps only send it ---
s = rep(s, "const system = [{ type: 'text', text: staticText, cache_control: { type: 'ephemeral' } }, { type: 'text', text: dynamicText }];\n",
"""const system = [{ type: 'text', text: staticText, cache_control: { type: 'ephemeral' } }, { type: 'text', text: dynamicText }];
// Answer format. Every field is required (optional fields make the format too complex for the API), but the AI returns "" for
// lead fields that have not changed and "Read Claude answer" keeps what is already known.
const str = { type: 'string' }, bool = { type: 'boolean' };
const obj = (props, required) => ({ type: 'object', additionalProperties: false, required, properties: props });
const LEAD_KEYS = ['name', 'company', 'customer_type', 'email', 'preferred_contact', 'service', 'origin', 'destination', 'commodity', 'weight_kg', 'volume_or_dims', 'packages', 'container_type_qty', 'incoterm', 'cargo_ready_date', 'special_needs', 'additional_info', 'documents_received'];
const leadProps = {}; for (const k of LEAD_KEYS) leadProps[k] = str;
const schema = obj({
  reply: str, language: { type: 'string', enum: ['en', 'ar'] }, stage: { type: 'string', enum: ['greeting', 'collecting', 'awaiting_confirmation', 'confirmed', 'support', 'faq', 'promotional'] }, options: str,
  confirmed_now: bool, cancel_requested: bool, speak_to: obj({ requested: bool, person: str }, ['requested', 'person']), new_enquiry: bool, notify_sales: bool, out_of_scope: bool,
  support: obj({ is_support: bool, summary: str }, ['is_support', 'summary']), escalate: obj({ needed: bool, category: str, summary: str }, ['needed', 'category', 'summary']),
  lead: obj(leadProps, LEAD_KEYS), last_question: str
}, ['reply', 'language', 'stage', 'options', 'confirmed_now', 'cancel_requested', 'speak_to', 'new_enquiry', 'notify_sales', 'out_of_scope', 'support', 'escalate', 'lead', 'last_question']);
""")
s = rep(s, "  body: { model: 'claude-sonnet-5-5', max_tokens: 4000, system, messages: apiMsgs }\n",
           "  body: { model: 'claude-sonnet-5-5', max_tokens: 2000, system, messages: apiMsgs, output_config: { format: { type: 'json_schema', schema } } }\n")
open('final_Build_Claude_request.js', 'w').write(s)

import shutil
shutil.copy('orig_Read_Claude_answer.js', 'final_Read_Claude_answer.js'); shutil.copy('new_Read_message.js', 'final_Read_message.js'); shutil.copy('new_Tell_customer_they_are_alerted.js', 'final_Tell_customer_they_are_alerted.js')
print('ok')
