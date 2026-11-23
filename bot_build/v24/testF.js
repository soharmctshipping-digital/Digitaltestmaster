// Fills each v24 chain the way a customer would (first option of every choice, sample text), sends it through "Read message".
const fs = require('fs');
const out = new Function(fs.readFileSync('../v24/v24_form_definition.js', 'utf8'))();
const flow = JSON.parse(out[0].json.flow_json);
const reader = new Function('$input', fs.readFileSync('v24_Read_message.js', 'utf8'));
const read = rj => reader({ all: () => [{ json: { body: { entry: [{ changes: [{ value: { metadata: { phone_number_id: '1451398948053197' }, contacts: [{ wa_id: '1', profile: { name: 'x' } }], messages: [{ from: '1', id: 'a', timestamp: '1795085662', type: 'interactive', interactive: { nfm_reply: { response_json: JSON.stringify(rj) } } }] } }] }] } } }] })[0].json.content;
const S = Object.fromEntries(flow.screens.map(s => [s.id, s]));
function fill(svc, choose) {
  const first = S.SERVICE.layout.children[0]['list-items'].find(i => i.id === svc)['on-click-action'].next.name;
  let id = first, data = {}, answers = {}, payload;
  for (let guard = 0; guard < 6; guard++) {
    const sc = S[id]; const form = {};
    const walk = ch => { for (const c of ch) {
      if (c.type === 'If') { const ok = c.condition.split('||').some(p => { const m = p.trim().match(/^\$\{(data|form)\.(\w+)\} (==|!=) '(.*)'$/); const val = (m[1] === 'data' ? data : form)[m[2]]; return m[3] === '==' ? val === m[4] : val !== m[4]; }); if (ok) walk(c.then); continue; }
      if (!c.name || c.type === 'Footer') continue;
      if (choose[c.name] !== undefined) form[c.name] = choose[c.name];
      else if (c['data-source']) form[c.name] = c.type === 'CheckboxGroup' ? [c['data-source'][0].id] : (c['init-value'] || c['data-source'][0].id);
      else form[c.name] = c['input-type'] === 'number' ? '12' : 'sample ' + c.name;
    } };
    walk(sc.layout.children);
    answers[id] = form;
    const ft = sc.layout.children[sc.layout.children.length - 1]['on-click-action'];
    const sub = v => typeof v !== 'string' ? v : v.replace(/^\$\{form\.(\w+)\}$/, (a, f) => form[f]).replace(/^\$\{data\.(\w+)\}$/, (a, f) => data[f]).replace(/^\$\{screen\.(\w+)\.form\.(\w+)\}$/, (a, s2, f) => (answers[s2] || {})[f]);
    const pay = Object.fromEntries(Object.entries(ft.payload).map(([k, v]) => [k, sub(v)]));
    if (ft.name === 'complete') { payload = pay; break; }
    data = pay; id = ft.next.name;
  }
  return payload;
}
const cases = [
  ['sea', { direction_sea: 'export', far_region: 'east', far_sea_east: 'Shanghai, China', sea_type: 'fcl', freedays_fcl: 'yes', freedays_n_fcl: '7' }],
  ['sea', { direction_sea: 'import', sea_type: 'roro', ev_roro: 'electric' }],
  ['sea', { direction_sea: 'import', sea_type: 'bulk', volume_bulk: 'not sure' }],
  ['air', { direction_air: 'import', origin_air: 'Frankfurt', exhibition_air: 'yes' }],
  ['air', { direction_air: 'export', destination_air: 'Mumbai' }],
  ['customs', { via_customs: 'sea', equip_customs: 'fcl', size_customs: '40', value_customs: '25000' }],
  ['customs', { via_customs: 'road', point_road_customs: 'wajajah', equip_customs: 'breakbulk', trucks_customs: '3' }],
  ['transit', { equip_transit: 'containers', return_transit: 'jebel_ali', value_transit: '450000', consignee_transit: 'no' }],
  ['transit', { equip_transit: 'vehicles', ev_transit: 'hybrid', value_transit: '90000' }],
  ['project', { shipas_project: 'flatrack', crane_project: 'yes', volume_project: '85' }],
  ['warehousing', { arrive_warehousing: 'loose', areas_warehousing: 'Muscat and Sohar' }],
  ['agency', { vessel_size_agency: 'Bulk carrier 32,000 GRT', days_agency: '3', crew_agency: '2 joining, 2 leaving' }],
  ['land', {}], ['containers', {}],
];
for (const [svc, ch] of cases) { const p = fill(svc, ch); console.log('=== ' + svc + ' ' + JSON.stringify(ch).slice(0, 80) + '\n' + read(p)); }
// leak test: an old-style payload holding answers from two services
console.log('=== leak test (sea answers + air chosen)\n' + read({ form: 'service', mode: 'air', direction_air: 'import', origin_air: 'Doha', commodity_air: 'Phones', qty_air: '3', direction_sea: 'export', commodity_fcl: 'SHOULD NOT APPEAR', far_region: 'east', far_sea_east: 'SHOULD NOT APPEAR' }));
