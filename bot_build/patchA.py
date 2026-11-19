import sys
def rep(s, old, new, n=1):
    c = s.count(old)
    assert c == n, (c, old[:90])
    return s.replace(old, new)

# ---------- Read message (Decision 4 / C10) ----------
s = open('orig_Read_message.js').read()
s = rep(s, "  const t = k => L[k] || k;\n",
"""  const t = k => L[k] || k;
  // Ports, airports and clearance points always carry their full name ("Sohar Port", never just "Sohar").
  const PLACE = { sohar: 'Sohar Port', duqm: 'Duqm Port', salalah: 'Salalah Port', muscat: 'Port Sultan Qaboos (Muscat)', muscat_air: 'Muscat Airport', salalah_air: 'Salalah Airport', border: 'A road border', wajajah: 'Al Wajajah border (Hatta)', hafeet: 'Khatm Al Shikla / Hafeet border (Al Ain)', rub_al_khali: "Rub' Al Khali border (Saudi Arabia)", other: 'Another port', not_sure: 'Not sure' };
  const place = x => PLACE[x] || t(x);
  const CLEARED = { fcl: 'Full container load (FCL)', reefer: 'Reefer container', lcl: 'Less than container load (LCL)', vehicles: 'Vehicles', breakbulk: 'Break bulk (pieces)', project: 'Project or heavy-lift cargo', air: 'Air cargo' };
  const WHERE = { muscat: 'Muscat (Rusayl)', sohar: 'Sohar', sohar_fz: 'Sohar Free Zone', not_sure: 'Not sure' };
""")
s = rep(s, "add('Reefer set temperature', g('temp'));",
           "{ const tp = g('temp'); add('Reefer set temperature', /^[-+]?\\d+(\\.\\d+)?$/.test(tp) ? tp + '°C' : tp); }")
s = rep(s, "add('Clearance point', pk === 'other' ? v(f['point_other_' + cvia + '_customs']) : t(pk)); }",
           "add('Clearance point', pk === 'other' ? v(f['point_other_' + cvia + '_customs']) : place(pk)); }")
s = rep(s, "add('What is being cleared', t(g('equip')));", "add('What is being cleared', CLEARED[g('equip')] || t(g('equip')));")
s = rep(s, "add('Entering Oman at', t(g('entry')));", "add('Entering Oman at', place(g('entry')));")
s = rep(s, "add('Preferred location', t(g('location')));", "add('Preferred location', WHERE[g('location')] || t(g('location')));")
s = rep(s, "add('Port of call', t(g('port')));", "add('Port of call', g('port') === 'other' ? (g('port_other') || 'Another port (not named)') : place(g('port')));")
open('new_Read_message.js','w').write(s)

# ---------- Build Claude request ----------
s = open('orig_Build_Claude_request.js').read()

# item 13a: a typed "new enquiry" counts as the New enquiry button
s = rep(s, "const tapped = msg.type === 'interactive' ? (Object.keys(MENU).find(k => MENU[k].indexOf(said) >= 0) || '') : '';\n",
"""const GREET = /^(hi+|hello+|hey+|salam|salaam|assalamu? ?alaikum|good (morning|afternoon|evening)|مرحبا|السلام عليكم)[\\s!.,]*$/i;
const saidLines = said.split(NL).map(l => l.trim()).filter(Boolean);
// A typed "new enquiry" (on its own, or after a greeting) counts as tapping the New enquiry button.
const TYPED_NEW = /^((i|we) ?(have|'?ve got|want|need|would like|'?d like)( to (make|place|start|send|raise|submit))? )?(a |an |another |one more )?new (enquiry|inquiry|quote|quotation|request|shipment)( please| pls)?[\\s.!]*$|^(طلب|استفسار) جديد[\\s.!]*$/i;
const typedNew = saidLines.length > 0 && saidLines.some(l => TYPED_NEW.test(l)) && saidLines.every(l => TYPED_NEW.test(l) || GREET.test(l));
const tapped = msg.type === 'interactive' ? (Object.keys(MENU).find(k => MENU[k].indexOf(said) >= 0) || '') : (typedNew ? 'new' : '');
""")
# item 12: fixed thank-you line
s = rep(s, """const quickText = quickKind === 'bye'
  ? (language""", """const quickText = quickKind === 'thanks'
  ? (language === 'ar' ? 'على الرحب والسعة' + (firstQ ? ' يا ' + firstQ : '') + '.' + NL + NL + 'نحن هنا متى احتجت إلينا.' : 'You\\'re welcome' + (firstQ ? ', ' + firstQ : '') + '.' + NL + NL + 'We\\'re here whenever you need us.')
  : quickKind === 'bye'
  ? (language""")
# item 13c: a greeting after a gap brings the menu back
s = rep(s, "let freshStart = false;\n",
"""let freshStart = false;
// A plain greeting more than five minutes after the last message brings the menu back, instead of being passed on silently.
const greetAfterGap = saidLines.length > 0 && saidLines.every(l => GREET.test(l)) && lastMs > 0 && Date.now() - lastMs > 5 * 60000;
""")
s = rep(s, "    if (quickKind !== 'thanks') return [{ json: { route: 'say',", "    return [{ json: { route: 'say',")
s = rep(s, "  } else if (menuFresh && menuState === 'followup') {", "  } else if (menuFresh && menuState === 'followup' && !greetAfterGap) {")
s = rep(s, "  } else if (menuFresh && menuState === 'complaint') {", "  } else if (menuFresh && menuState === 'complaint' && !greetAfterGap) {")
s = rep(s, "  } else if (menuFresh && menuState === 'asked') {", "  } else if (menuFresh && menuState === 'asked' && !greetAfterGap) {")
# item 12: cancel and call-back requests never trigger the 24-hour reset
s = rep(s, "if ((['confirmed', 'support'].indexOf(prevStage) >= 0 && idleHours >= 24) || freshStart) {",
           "if ((['confirmed', 'support'].indexOf(prevStage) >= 0 && idleHours >= 24 && !cancelAsk && !speakAsk) || freshStart) {")
# item 18: fixed replies written in code (no AI call)
s = rep(s, "return [{ json: {\n  route: 'claude', menu_update: menuUpdate,",
"""// Three turns always get the same answer, so they are written here and the AI is not called:
// a first greeting, the "New enquiry" choice, and the details form. Anything with extra text still goes to the AI.
let canned = null;
if (formAllowed) {
  const contentNow = String(msg.content || '').trim();
  const linesNow = contentNow.split(NL).map(l => l.trim()).filter(Boolean);
  const earlyStage = ['new', 'greeting', 'faq'].indexOf(String(prevStage)) >= 0;
  const noFiles = !files.length && !Number(msg.new_files || 0);
  const detailsKnownNow = Boolean(String(lead.name || '').trim() && String(lead.preferred_contact || '').trim());
  const firstK = String(lead.name || '').trim().split(' ')[0];
  const fixed = (reply, stage, options, leadNew) => ({ reply, language: 'en', stage, options, confirmed_now: false, cancel_requested: false, speak_to: { requested: false, person: '' }, new_enquiry: false, notify_sales: false, out_of_scope: false, support: { is_support: false, summary: '' }, escalate: { needed: false, category: '', summary: '' }, lead: leadNew || {}, last_question: '', canned: true });
  if (noFiles && earlyStage && !history.length && !detailsKnownNow && !lead.previous_reference && linesNow.length > 0 && linesNow.length <= 2 && linesNow.every(l => /^(hi+|hello+|hey+|salam|salaam|assalamu? ?alaikum|good (morning|afternoon|evening))[\\s!.,]*$/i.test(l))) {
    canned = fixed('Hello, welcome to Sohar Shipping. How can I help you today?', 'greeting', 'start');
  } else if (noFiles && earlyStage && /^new enquiry$/i.test(contentNow)) {
    canned = detailsKnownNow
      ? fixed((firstK ? 'Sure, ' + firstK + '. ' : '') + 'Pick your service in the form below and I\\'ll take it from there.', 'collecting', 'service_form')
      : fixed('Happy to help. A quick form opens from the button below for your details, then you can pick your service in the next one.', 'collecting', 'details_form');
  } else if (noFiles && linesNow[0] === '[The customer filled in their details]' && ['awaiting_confirmation', 'confirmed', 'support'].indexOf(String(prevStage)) < 0) {
    const got = {};
    let clean2 = true;
    for (const l of linesNow.slice(1)) {
      const mm = l.match(/^(Name|Enquiry for|Email|Contact by): (.*)$/);
      if (!mm) { clean2 = false; break; }
      got[mm[1]] = mm[2].trim();
    }
    if (clean2 && got['Name'] && got['Contact by']) {
      const lf = { name: got['Name'], email: got['Email'] || '', preferred_contact: got['Contact by'] };
      const ef = got['Enquiry for'] || '';
      const cm = ef.match(/^A company: (.*?)(?: \\(their position: (.*)\\))?$/);
      if (cm) { lf.company = cm[1] === '-' ? '' : cm[1]; lf.customer_type = 'company'; if (cm[2]) lf.additional_info = [String(lead.additional_info || '').trim(), 'Position: ' + cm[2]].filter(Boolean).join('; '); }
      else if (ef) { lf.company = 'Individual'; lf.customer_type = 'individual'; }
      canned = fixed('Got it, ' + got['Name'].split(' ')[0] + '. Now pick your service in the next form.', 'collecting', 'service_form', lf);
    }
  }
}
return [{ json: {
  route: 'claude', canned, menu_update: menuUpdate,""")
open('new_Build_Claude_request.js','w').write(s)

# ---------- Read Claude answer ----------
s = open('orig_Read_Claude_answer.js').read()
s = rep(s, "const leadNow = Object.assign({}, base, newLead);", "const leadNow = lead;   // the merged lead: an empty field in the answer never hides a detail already known")
s = rep(s, "let a = parseJson(raw, 'reply');", "let a = ctx.canned ? ctx.canned : parseJson(raw, 'reply');   // a fixed reply written in code needs no AI answer")
open('new_Read_Claude_answer.js','w').write(s)

# ---------- Tell customer they are alerted (item 13b) ----------
s = open('orig_Tell_customer_they_are_alerted.js').read()
s = rep(s, "// otherwise at most once every 4 hours, so a run of messages doesn't get repeated replies.",
           "// otherwise at most once every 30 minutes, so a run of messages gets one acknowledgement and nobody is left in silence.")
s = rep(s, "if (!built.force_ack && !built.ack_text && Date.now() - last < 4 * 3600 * 1000) return [];",
           "if (!built.force_ack && !built.ack_text && Date.now() - last < 30 * 60000) return [];\nconst again = last > 0 && Date.now() - last < 24 * 3600 * 1000;   // already greeted today: a shorter line")
s = rep(s, """  : (ar ? ['مرحبًا' + (first ? ' ' + first : '') + '، سعدنا بتواصلك.', whoAr + '، وسيتواصل معك قريبًا.'].join(NL)""",
"""  : again ? (ar ? ['وصلتنا رسالتك' + (first ? ' يا ' + first : '') + '.', whoAr + '، وسيتواصل معك قريبًا.'].join(NL)
        : ['Got your message' + (first ? ', ' + first : '') + '.', who + ' has been alerted and will be in touch with you shortly.'].join(NL))
  : (ar ? ['مرحبًا' + (first ? ' ' + first : '') + '، سعدنا بتواصلك.', whoAr + '، وسيتواصل معك قريبًا.'].join(NL)""")
open('new_Tell_customer_they_are_alerted.js','w').write(s)
print('ok')
