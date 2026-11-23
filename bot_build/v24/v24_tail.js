const norm = ch => { const o = []; for (const x of ch) { if (Array.isArray(x)) o.push(...norm(x)); else { if (x.type === 'If') x.then = norm(x.then); o.push(x); } } return o; };
const P2 = norm(p2), P3 = norm(p3), P4 = norm(p4);
// ---------- v24: one chain of pages per service ----------
// Each service gets its own pages, so a customer who goes back and picks another service starts on empty pages,
// and each service's "Send" collects only that service's answers.
const SVC = ['sea', 'air', 'land', 'customs', 'transit', 'project', 'warehousing', 'containers', 'agency'];
const SEA_KEYS = ['fcl', 'lcl', 'bulk', 'roro'];
const svcOfField = n => { if (!n || n === 'notes' || n === 'mode') return 'all'; if (/^(sea_type|far_|pod_oman)/.test(n)) return 'sea'; const t = n.split('_').pop(); if (SVC.indexOf(t) >= 0) return t; if (SEA_KEYS.indexOf(t) >= 0) return 'sea'; return 'all'; };
const CRE = /^\$\{(data|form)\.(\w+)\} (==|!=) '(.*)'$/;
const parseCond = c => c.split('||').map(p => p.trim().replace(/^\((.*)\)$/, '$1').match(CRE));
const clone = x => JSON.parse(JSON.stringify(x));
function prune(ch, m) {
  const out = [];
  for (const c of ch) {
    if (c.type === 'If') {
      const ps = parseCond(c.condition);
      if (ps.some(p => !p)) throw new Error('Cannot read condition ' + c.condition);
      if (ps.length === 1 && ps[0][2] === 'mode') { if ((ps[0][3] === '==' && ps[0][4] === m) || (ps[0][3] === '!=' && ps[0][4] !== m)) out.push(...prune(c.then, m)); continue; }
      if (ps.some(p => { const s = svcOfField(p[2]); return s !== 'all' && s !== m; })) continue;
      const t = prune(c.then, m);
      if (t.length) out.push(Object.assign({}, c, { then: t }));
    } else {
      const s = svcOfField(c.name);
      if (c.name && s !== 'all' && s !== m) continue;
      out.push(clone(c));
    }
  }
  return out;
}
const fieldsOf = (ch, o) => { for (const c of ch) { if (c.type === 'If') fieldsOf(c.then, o); else if (c.name) o.push(c.name); } return o; };
const dataRefs = (ch, o) => { for (const c of ch) { if (c.type === 'If') { for (const p of parseCond(c.condition)) if (p[1] === 'data') o.add(p[2]); dataRefs(c.then, o); } } return o; };
const toForm = (ch, own) => ch.map(c => c.type === 'If' ? Object.assign({}, c, { condition: c.condition.replace(/\$\{data\.(\w+)\}/g, (all, f) => own.indexOf(f) >= 0 ? D + 'form.' + f + '}' : all), then: toForm(c.then, own) }) : c);
const DIRF = {}; for (const k of dirKids) { const p = k.condition.match(CRE); DIRF[p[4]] = k.then[0]; }
const SHORT = { sea: 'Sea freight', air: 'Air freight', land: 'Land transport', customs: 'Customs clearance', transit: 'Transit through Oman', project: 'Project cargo', warehousing: 'Warehousing and 3PL', containers: 'Buy or lease containers', agency: 'Shipping agency' };
const SAMPLE = { sea_type: 'fcl', direction_sea: 'import', direction_air: 'import', direction_land: 'import', direction_project: 'import', equip_transit: 'containers', via_customs: 'sea' };
const str = ex => ({ type: 'string', __example__: ex });
const footer = (label, action) => ({ type: 'Footer', label, 'on-click-action': action });
const nav = (next, payload) => ({ name: 'navigate', next: { type: 'screen', name: next }, payload });
const LETTER = ['A', 'B', 'C', 'D'];
const chains = {};
for (const m of SVC) {
  let pages = [prune(P2, m), prune(P3, m), prune(P4, m)].filter(pg => fieldsOf(pg, []).length);
  if (DIRF[m]) pages[0] = [clone(DIRF[m])].concat(pages[0]);
  pages = pages.map(pg => toForm(pg, fieldsOf(pg, [])));
  const ids = pages.map((pg, i) => m.toUpperCase() + '_' + LETTER[i]);
  const own = pages.map(pg => fieldsOf(pg, []));
  const need = pages.map(pg => dataRefs(pg, new Set()));
  for (let i = pages.length - 1; i > 0; i--) for (const x of need[i]) if (own[i - 1].indexOf(x) < 0) need[i - 1].add(x);
  if (need[0].size) throw new Error(m + ': the first page needs ' + [...need[0]].join(', ') + ', which nothing provides');
  const scr = [];
  pages.forEach((pg, i) => {
    const data = {}; for (const x of need[i]) data[x] = str(SAMPLE[x] || 'x');
    const last = i === pages.length - 1;
    let ft;
    if (!last) {
      const pay = {}; for (const x of need[i + 1]) pay[x] = D + (own[i].indexOf(x) >= 0 ? 'form.' : 'data.') + x + '}';
      ft = footer('Continue', nav(ids[i + 1], pay));
    } else {
      const pay = { form: 'service', mode: m };
      pages.forEach((p, j) => { for (const f of own[j]) pay[f] = D + (j === i ? 'form.' : 'screen.' + ids[j] + '.form.') + f + '}'; });
      ft = footer('Send', { name: 'complete', payload: pay });
    }
    const title = i === 0 ? SHORT[m] : (last ? 'Final details' : 'A few details');
    const sc = { id: ids[i], title, data, layout: { type: 'SingleColumnLayout', children: pg.concat([ft]) } };
    if (last) Object.assign(sc, { terminal: true, success: true });
    scr.push(sc);
  });
  chains[m] = scr;
}
const SUB = { sea: 'FCL, LCL, bulk or RoRo', air: 'Import or export by air', land: 'Oman and GCC trucks', customs: 'Sea, air or road', transit: 'Transit Bayan', project: 'Heavy and oversized', warehousing: 'Storage, handling, 3PL', containers: 'New or used', agency: 'Vessels, crew, supplies' };
const TITLE = { sea: 'Sea freight', air: 'Air freight', land: 'Land transport', customs: 'Import customs clearance', transit: 'Transit through Oman', project: 'Project and heavy-lift', warehousing: 'Warehousing and 3PL', containers: 'Buy or lease containers', agency: 'Shipping agency' };
// WhatsApp allows at most 10 next pages from one page, so the four freight services sit behind one "Freight" choice.
const FREIGHT = ['sea', 'air', 'land', 'project'], OTHERS = ['customs', 'transit', 'warehousing', 'containers', 'agency'];
const item = m => ({ id: m, 'main-content': { title: TITLE[m], description: SUB[m] }, 'on-click-action': { name: 'navigate', next: { type: 'screen', name: chains[m][0].id }, payload: {} } });
const serviceScreen = { id: 'SERVICE', title: 'How can we help?', data: {}, layout: { type: 'SingleColumnLayout', children: [
  { type: 'NavigationList', name: 'service_list', 'list-items': [{ id: 'freight', 'main-content': { title: 'Freight', description: 'Sea, air, land, project' }, 'on-click-action': { name: 'navigate', next: { type: 'screen', name: 'FREIGHT' }, payload: {} } }].concat(OTHERS.map(item)) }] } };
const freightScreen = { id: 'FREIGHT', title: 'Freight', data: {}, layout: { type: 'SingleColumnLayout', children: [
  { type: 'NavigationList', name: 'freight_list', 'list-items': FREIGHT.map(item) }] } };
const screens = [serviceScreen, freightScreen].concat(...SVC.map(m => chains[m]));
const flow = { version: '7.0', screens };
// ---------- build check: refuse a form that breaks WhatsApp's limits or mixes services ----------
const LIMITS = { TextInput: ['label', 20], TextArea: ['label', 20], Dropdown: ['label', 20], RadioButtonsGroup: ['label', 30], CheckboxGroup: ['label', 30], DatePicker: ['label', 40], TextSubheading: ['text', 80], Footer: ['label', 35] };
const problems = [];
const check = (sid, ch) => { let n = 0; for (const c of ch) { n += 1;
  if (c.type === 'If') { n += check(sid, c.then); continue; }
  const lim = LIMITS[c.type]; if (lim && String(c[lim[0]] || '').length > lim[1]) problems.push(sid + ': ' + c.type + ' "' + c[lim[0]] + '" is over ' + lim[1] + ' characters');
  if (c['helper-text'] && c['helper-text'].length > 80) problems.push(sid + ': helper text of "' + (c.label || c.name) + '" is over 80 characters');
  if (c.type === 'RadioButtonsGroup' || c.type === 'CheckboxGroup') { if (c['data-source'].length > 20) problems.push(sid + ': "' + c.label + '" has more than 20 options'); }
  if (c.type === 'Dropdown' && c['data-source'].length > 200) problems.push(sid + ': "' + c.label + '" has more than 200 options');
  for (const o of (c['data-source'] || [])) { if (String(o.title).length > 30) problems.push(sid + ': option "' + o.title + '" is over 30 characters'); }
} return n; };
const seenScreen = {};
for (const sc of screens) {
  if (seenScreen[sc.id]) problems.push('screen id ' + sc.id + ' is used twice'); seenScreen[sc.id] = 1;
  const n = check(sc.id, sc.layout.children);
  if (n > 100) problems.push(sc.id + ' has ' + n + ' components (limit 100)');
  if (sc.title.length > 30) problems.push(sc.id + ': screen title is over 30 characters');
  const names = fieldsOf(sc.layout.children, []); const dup = names.filter((x, i) => names.indexOf(x) !== i); if (dup.length) problems.push(sc.id + ': field used twice on one page: ' + dup.join(', '));
}
for (const m of SVC) {
  const lastSc = chains[m][chains[m].length - 1];
  const pay = lastSc.layout.children[lastSc.layout.children.length - 1]['on-click-action'].payload;
  for (const k of Object.keys(pay)) { const s = svcOfField(k); if (k !== 'form' && s !== 'all' && s !== m) problems.push(m + ': the Send button would carry ' + k + ' from another service'); }
  for (const sc of chains[m]) { const vis = fieldsOf(sc.layout.children, []).length; if (!vis) problems.push(sc.id + ' has no questions'); }
}
const size = JSON.stringify(flow).length;
if (size > 1000000) problems.push('the form is ' + size + ' characters, which is too large');
if (problems.length) throw new Error('Form not built. Fix these first: ' + problems.join(' | '));
return [{ json: { name: 'SST service form v24b own pages per service', categories: ['LEAD_GENERATION'], flow_json: JSON.stringify(flow) } }];
