def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:100]); return s.replace(old, new)
s = open('v22_form_definition.js').read()
s = rep(s, "// SST service form v12 (live port search for sea). Was v8/v9.", "// SST service form v23 (19 Nov 2026). Export: port of loading is Sohar Port and is not asked. Import: port of discharge is an Oman port.\n// Named road borders, \"Which port?\" for agency, \"not sure\" allowed for sizes and volume, no export-clearance question. Was v22.")
# optional variants of helpers
s = rep(s, "const unitDd = (name, label, o) => ({ type: 'Dropdown', name, label, required: true, 'data-source': O(o) });",
           "const unitDd = (name, label, o, opt) => ({ type: 'Dropdown', name, label, required: !opt, 'data-source': O(o) });")
s = rep(s, "const dimField = (k, label, helper, p) => [unitDd('dunit_' + k, 'Size unit', DU), ti((p || 'dims') + '_' + k, label, true, 'text', helper)];",
           "const dimField = (k, label, helper, p, opt) => [unitDd('dunit_' + k, 'Size unit', DU, opt), ti((p || 'dims') + '_' + k, label, !opt, 'text', helper)];")
# clearance only for imports (export clearance is part of shipping the export, never asked)
s = rep(s, "  out.push(M(k, [clearance(k)]));   // clearance comes before delivery\n",
           "  out.push(DT('direction_' + k, 'import', [clearance(k)]));   // imports only: export clearance is part of shipping the export\n")
s = rep(s, "  DT('direction_land', 'export', [radio('clearance_export_land', 'Customs clearance by us?', YNS, 'Export declaration and border formalities in Oman')]),\n", "")
# sea ports
i = s.index("const portsKids = [];"); j = s.index("const dirKids = ")
ports = r'''const OMAN_PORTS = [['Sohar Port, Oman', 'Sohar Port'], ['Duqm Port, Oman', 'Duqm Port'], ['Salalah Port, Oman', 'Salalah Port'], ['Port Sultan Qaboos (Muscat), Oman', 'Port Sultan Qaboos (Muscat)'], ['Not sure', 'Not sure']];
// One port picker serves both directions (it is the overseas port either way), which keeps this page well inside WhatsApp's limit:
// import = port of loading, export = port of discharge. The answers arrive as far_region / far_sea_<region> / far_port_sea.
const portsKids = [
  DT('direction_sea', 'import', [{ type: 'TextSubheading', text: 'Port of loading' }]),
  DT('direction_sea', 'export', [{ type: 'TextBody', text: 'Port of loading: Sohar Port, Oman.' }, { type: 'TextSubheading', text: 'Port of discharge' }]),
  M('sea', [{ type: 'Dropdown', name: 'far_region', label: 'Region', required: true, 'data-source': regOpts }]),
  ...REGIONS.map(r => F('far_region', r[0], [{ type: 'Dropdown', name: 'far_sea_' + r[0], label: 'Port', required: true, 'data-source': regPorts(r) }])),
  F('far_region', 'other', [ti('far_port_sea', 'Port name', true)]),
  DT('direction_sea', 'import', [{ type: 'Dropdown', name: 'pod_oman_sea', label: 'Arriving at', required: true, 'data-source': O(OMAN_PORTS), 'init-value': 'Sohar Port, Oman' }])];
'''
s = s[:i] + ports + s[j:]
# land: largest piece optional
s = rep(s, "    dimField('land', 'Largest piece size', 'Length x Width x Height of the largest piece')]),",
           "    dimField('land', 'Largest piece size', 'Only for oversized cargo: Length x Width x Height', null, true)]),")
# customs road: named borders
s = rep(s, "[['border', 'A road border', 'Wajajah, Khatm Al Shikla, Al Madina and others'], ['other', 'Somewhere else']]",
           "[['wajajah', 'Al Wajajah (Hatta)'], ['hafeet', 'Khatm Al Shikla / Hafeet', 'Al Ain side'], ['rub_al_khali', 'Rub\\' Al Khali', 'Saudi Arabia'], ['not_sure', 'Not sure'], ['other', 'Somewhere else']]")
s = rep(s, "['muscat_air', 'Muscat Airport'], ['road', 'A road border']]),",
           "['muscat_air', 'Muscat Airport'], ['wajajah', 'Al Wajajah border (Hatta)'], ['hafeet', 'Khatm Al Shikla / Hafeet', 'Border on the Al Ain side'], ['rub_al_khali', 'Rub\\' Al Khali border', 'Saudi Arabia'], ['not_sure', 'Not sure']]),")
# warehousing temperature
s = rep(s, "    ti('duration_warehousing', 'How long for?', true, 'text', 'For example 3 months')]),",
           "    ti('duration_warehousing', 'How long for?', true, 'text', 'For example 3 months')]),\n  F('wtype_warehousing', 'cold', [ti('temp_warehousing', 'Temperature (°C)', true, 'text', 'For example +4 or -18')]),")
# agency: port names and "Which port?"
s = rep(s, "[['sohar', 'Sohar'], ['muscat', 'Muscat (Sultan Qaboos)'], ['duqm', 'Duqm'], ['salalah', 'Salalah'], ['other', 'Another port']]),",
           "[['sohar', 'Sohar Port'], ['muscat', 'Port Sultan Qaboos (Muscat)'], ['duqm', 'Duqm Port'], ['salalah', 'Salalah Port'], ['other', 'Another port']]),")
s = rep(s, "['other', 'Something else']], 'Choose one or more')])];",
           "['other', 'Something else']], 'Choose one or more. For anything else, use the notes box at the end')]),\n  F('port_agency', 'other', [ti('port_other_agency', 'Which port?', true)])];")
# wording
s = rep(s, "['lcl', 'Less than container load (LCL)', 'Shared container, smaller shipments']", "['lcl', 'Less than container load (LCL)', 'Smaller shipments, charged by volume']")
s = rep(s, "[['collect', 'We collect from your yard'], ['deliver', 'Deliver to our site']]", "[['collect', 'I will collect from your yard'], ['deliver', 'Deliver to my site']]")
# LCL and air: size and volume required, "not sure" allowed
for k in ('lcl', 'air'):
    s = rep(s, "dimField('%s', 'Package size', 'Length x Width x Height of one package, for example 120 x 80 x 100')" % k,
               "dimField('%s', 'Package size', 'L x W x H of one package, e.g. 120 x 80 x 100, or write \"not sure\"')" % k)
    s = rep(s, "ti('volume_%s', 'Cubic metres (CBM)', true, 'number', 'Total volume of the whole shipment')" % k,
               "ti('volume_%s', 'Total volume (CBM)', true, 'text', 'Cubic metres for the whole shipment, or write \"not sure\"')" % k)
# dangerous goods is not asked for vehicles (RoRo)
s = rep(s, "  M('sea', [dg('sea'), ready('sea')]),", "  M('sea', [cond('data', 'sea_type', '!=', 'roro', [dg('sea')]), ready('sea')]),")
s = rep(s, "  DT('direction_land', 'import', [radio('terms_land', 'Shipping terms', TERMS.land)]),\n  F('terms_land', 'EXW', [ti('supplier_name_land', 'Supplier name', true)]),\n  DT('direction_land', 'import', [clearance('land')]),\n",
           "  DT('direction_land', 'import', [radio('terms_land', 'Shipping terms', TERMS.land), clearance('land')]),\n  F('terms_land', 'EXW', [ti('supplier_name_land', 'Supplier name', true)]),\n")
s = rep(s, "  DT('via_customs', 'road', [F('equip_customs', 'breakbulk', [{ type: 'TextBody', text: 'For break bulk arriving by road, the commercial invoice and the packing list are required. After you send this form I will ask you to upload both here in the chat.' }])]),\n",
           "")
s = rep(s, "  DT('via_customs', 'road', [ta('delivery_address_road_customs', 'Delivery location', true, 'Full address in Oman, with area and city')]),",
           "  DT('via_customs', 'road', [F('equip_customs', 'breakbulk', [{ type: 'TextBody', text: 'For break bulk arriving by road, please have the commercial invoice and the packing list ready. After you send this form I will ask you to upload them here in the chat.' }]), ta('delivery_address_road_customs', 'Delivery location', true, 'Full address in Oman, with area and city')]),")
s = rep(s, "{ type: 'TextBody', text: 'A packing list is required for break bulk cargo. After you send this form I will ask you to upload it here in the chat.' }", "{ type: 'TextBody', text: 'Please have the packing list ready for break bulk cargo. After you send this form I will ask you to upload it here in the chat.' }")
s = rep(s, "{ type: 'TextBody', text: 'The commercial invoice and the packing list are required for road freight. After you send this form I will ask you to upload both here in the chat.' }", "{ type: 'TextBody', text: 'Please have the commercial invoice and the packing list ready for road freight. After you send this form I will ask you to upload them here in the chat.' }")
# the "A few details" page was empty for transit with vehicles or break bulk: the trucks question moves there, so it never is
s = rep(s, "['breakbulk', 'Break bulk or loose cargo']]),\n    radio('trucks_transit', 'Do you need our trucks?', [['yes', 'Yes'], ['no', 'No, we have our own']])]),",
           "['breakbulk', 'Break bulk or loose cargo']])]),")
s = rep(s, "  // transit\n  DT('equip_transit', 'containers', [radio('size_transit', 'Container size', SIZE), radio('ctype_transit', 'Container type', CTYPE)]),",
           "  // transit\n  DT('equip_transit', 'containers', [radio('size_transit', 'Container size', SIZE), radio('ctype_transit', 'Container type', CTYPE)]),\n  M('transit', [radio('trucks_transit', 'Do you need our trucks?', [['yes', 'Yes'], ['no', 'No, we have our own']])]),")
# build check: no page may be empty for any combination of the choices that decide what is shown
# Meta's preview fills a page opened on its own with these sample values. "x" matched nothing, so the page looked empty there.
s = rep(s, "for (const k of CARRY) { p3data[k] = str('x');", "const SAMPLE = { sea_type: 'fcl', direction_sea: 'import', direction_air: 'import', direction_land: 'import', direction_project: 'import', equip_transit: 'containers', via_customs: 'sea' };\nfor (const k of CARRY) { p3data[k] = str(SAMPLE[k] || 'x');")
# name + build check (item 4)
s = rep(s, "const flow = { version: '7.0', screens };\nreturn [{ json: { name: 'SST service form v22 required sizes', categories: ['LEAD_GENERATION'], flow_json: JSON.stringify(flow) } }];",
r'''const flow = { version: '7.0', screens };
// Build check: refuse to create a form that breaks WhatsApp's limits, instead of finding out after it is sent to Meta.
const LIMITS = { TextInput: ['label', 20], TextArea: ['label', 20], Dropdown: ['label', 20], RadioButtonsGroup: ['label', 30], CheckboxGroup: ['label', 30], DatePicker: ['label', 40], TextSubheading: ['text', 80], Footer: ['label', 35] };
const problems = [];
const seen = {};
const check = (sid, ch) => { let n = 0; for (const c of ch) { n += 1;
  if (c.type === 'If') { n += check(sid, c.then); continue; }
  const lim = LIMITS[c.type]; if (lim && String(c[lim[0]] || '').length > lim[1]) problems.push(sid + ': ' + c.type + ' "' + c[lim[0]] + '" is over ' + lim[1] + ' characters');
  if (c['helper-text'] && c['helper-text'].length > 80) problems.push(sid + ': helper text of "' + (c.label || c.name) + '" is over 80 characters');
  if (c.type === 'RadioButtonsGroup' || c.type === 'CheckboxGroup') { if (c['data-source'].length > 20) problems.push(sid + ': "' + c.label + '" has more than 20 options'); if (c.description && c.description.length > 300) problems.push(sid + ': description of "' + c.label + '" is over 300 characters'); }
  if (c.type === 'Dropdown' && c['data-source'].length > 200) problems.push(sid + ': "' + c.label + '" (' + c.name + ') has more than 200 options');
  for (const o of (c['data-source'] || [])) { if (String(o.title).length > 30) problems.push(sid + ': option "' + o.title + '" is over 30 characters'); if (o.description && o.description.length > 300) problems.push(sid + ': option description of "' + o.title + '" is over 300 characters'); }
  if (c.name) { if (seen[c.name] && seen[c.name] !== sid) problems.push(c.name + ' is used on both ' + seen[c.name] + ' and ' + sid); seen[c.name] = sid; }
} return n; };
const counts = {};
for (const sc of screens) { counts[sc.id] = check(sc.id, sc.layout.children); if (counts[sc.id] > 100) problems.push(sc.id + ' has ' + counts[sc.id] + ' components (limit 100)'); if (sc.title.length > 30) problems.push(sc.id + ': screen title is over 30 characters'); }
// No page may come up empty, whatever the customer chose on the earlier pages.
{
  const vis = (ch, data) => { let n = 0; for (const c of ch) { if (c.type === 'Footer') continue; if (c.type === 'If') { const m = c.condition.match(/^\$\{(data|form)\.(\w+)\} (==|!=) '(.*)'$/); if (!m || m[1] === 'form') continue; const v = data[m[2]]; if (m[3] === '==' ? v === m[4] : v !== m[4]) n += vis(c.then, data); } else n += 1; } return n; };
  const combos = [];
  for (const st of ['fcl', 'lcl', 'bulk', 'roro']) for (const d of ['import', 'export']) combos.push({ mode: 'sea', sea_type: st, direction_sea: d });
  for (const d of ['import', 'export']) combos.push({ mode: 'air', direction_air: d }, { mode: 'project', direction_project: d });
  for (const d of ['import', 'export', 'oman']) combos.push({ mode: 'land', direction_land: d });
  for (const v of ['sea', 'air', 'road']) combos.push({ mode: 'customs', via_customs: v });
  for (const e of ['containers', 'vehicles', 'breakbulk']) combos.push({ mode: 'transit', equip_transit: e });
  combos.push({ mode: 'warehousing' }, { mode: 'containers' }, { mode: 'agency' });
  for (const c of combos) for (const sc of screens) if (sc.id !== 'SERVICE' && vis(sc.layout.children, c) === 0) problems.push(sc.id + ' would be empty for ' + JSON.stringify(c));
}
if (problems.length) throw new Error('Form not built. Fix these first: ' + problems.join(' | '));
return [{ json: { name: 'SST service form v23b Sohar Port and Oman ports', categories: ['LEAD_GENERATION'], flow_json: JSON.stringify(flow) } }];''')
open('v23_form_definition.js', 'w').write(s)
