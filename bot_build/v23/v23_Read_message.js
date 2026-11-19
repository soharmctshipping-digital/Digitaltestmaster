const BOT_PHONE_ID = '1451398948053197';
const MEDIA = ['image', 'document', 'video', 'sticker'];
// Answers from the WhatsApp forms (details form, then service form), turned into plain text the AI reads like a message.
function formText(f) {
  const v = x => { if (Array.isArray(x)) return x.filter(Boolean); const s = String(x === undefined || x === null ? '' : x).trim(); return (s.indexOf('$' + '{') === 0 || s === 'null' || s === 'undefined') ? '' : s; };
  const list = x => { const a = v(x); if (Array.isArray(a)) return a; return a ? a.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean) : []; };
  const L = { import: 'Import into Oman', export: 'Export from Oman', whatsapp: 'WhatsApp', call: 'call', email: 'email', not_sure: 'Not sure', yes: 'Yes', no: 'No',
    dry: 'Standard (dry)', hc: 'High cube', reefer: 'Reefer (refrigerated)', special: 'Open top or flat rack', tank: 'ISO tank',
    car: 'Cars or SUVs', truck: 'Trucks or buses', machinery: 'Machinery on wheels', mixed: 'A mix', new: 'New', used: 'Used', either: 'Either',
    breakbulk: 'Break bulk (pieces)', bulk: 'Bulk (loose)', flatbed: 'Flatbed trailer', lowbed: 'Low-bed', box: 'Closed box or curtain side',
    sea: 'Sea', air: 'Air', road: 'Road', sohar: 'Sohar', muscat_air: 'Muscat Airport', duqm: 'Duqm', salalah: 'Salalah', border: 'A road border', other: 'Other',
    fcl: 'Full container(s)', lcl: 'Less than container load', vehicles: 'Vehicles', cold: 'Temperature-controlled', bonded: 'Free zone or bonded (duty not yet paid)',
    muscat: 'Muscat', sohar_fz: 'Sohar Free Zone', pickpack: 'Pick and pack', inventory: 'Inventory management', delivery: 'Local delivery',
    offloading: 'Container offloading', crew: 'Crew change', chandlery: 'Ship chandlery (supplies)', buy: 'Buy', lease: 'Lease', collect: 'Collect from Sohar Shipping’s yard', deliver: 'Deliver to their site',
    containers: 'Containers', EXW: 'EXW (Ex Works)', FOB: 'FOB (Free on Board)', FCA: 'FCA (Free Carrier)', 20: '20ft', 40: '40ft', both: 'Both 20ft and 40ft' };
  const MODE = { sea: 'Sea freight', air: 'Air freight', land: 'Land freight', customs: 'Import customs clearance', transit: 'Transit Bayan', project: 'Project and heavy-lift cargo', warehousing: 'Warehousing and distribution', containers: 'Container sale or lease', agency: 'Shipping agency' };
  const SHIP = { fcl: 'full container load (FCL)', lcl: 'less than container load (LCL)', bulk: 'break bulk or bulk', roro: 'RoRo (vehicles)' };
  const t = k => L[k] || k;
  // Ports, airports and clearance points always carry their full name ("Sohar Port", never just "Sohar").
  const PLACE = { sohar: 'Sohar Port', duqm: 'Duqm Port', salalah: 'Salalah Port', muscat: 'Port Sultan Qaboos (Muscat)', muscat_air: 'Muscat Airport', salalah_air: 'Salalah Airport', border: 'A road border', wajajah: 'Al Wajajah border (Hatta)', hafeet: 'Khatm Al Shikla / Hafeet border (Al Ain)', rub_al_khali: "Rub' Al Khali border (Saudi Arabia)", other: 'Another port', not_sure: 'Not sure' };
  const place = x => PLACE[x] || t(x);
  const CLEARED = { fcl: 'Full container load (FCL)', reefer: 'Reefer container', lcl: 'Less than container load (LCL)', vehicles: 'Vehicles', breakbulk: 'Break bulk (pieces)', project: 'Project or heavy-lift cargo', air: 'Air cargo' };
  const WHERE = { muscat: 'Muscat (Rusayl)', sohar: 'Sohar', sohar_fz: 'Sohar Free Zone', not_sure: 'Not sure' };
  const dt = x => { const s = v(x); if (/^\d{10,13}$/.test(s)) { const d = new Date(s.length === 10 ? Number(s) * 1000 : Number(s)); return d.toISOString().slice(0, 10); } return s; };
  const lines = [];
  const add = (label, val) => { if (val) lines.push(label + ': ' + val); };
  const isService = v(f.form) === 'service' || Boolean(v(f.mode));
  if (!isService) {
    lines.push('[The customer filled in their details]');
    add('Name', v(f.name));
    const ct = v(f.customer_type);
    if (ct === 'company') add('Enquiry for', 'A company: ' + (v(f.company) || '-') + (v(f.position) ? ' (their position: ' + v(f.position) + ')' : ''));
    else if (ct) add('Enquiry for', 'An individual');
    add('Email', v(f.email));
    const c = list(f.contact).map(t);
    add('Contact by', c.length > 1 ? c.slice(0, -1).join(', ') + ' or ' + c[c.length - 1] : c.join(''));
    return lines.join(String.fromCharCode(10));
  }
  const m = v(f.mode);
  const st = m === 'sea' ? v(f.sea_type) : '';
  const k = st || m;   // the key the last-page fields use
  const g = x => v(f[x + '_' + k]) || v(f[x + '_' + m]) || v(f[x]);
  const gl = x => { for (const s of [k, m]) { const a = list(f[x + '_' + s]); if (a.length) return a; } return list(f[x]); };
  lines.push('[The customer filled in the service form]');
  add('Service', MODE[m] || m);
  add('Type of shipment', SHIP[st] || '');
  const dir = g('direction');
  const du = g('dunit') === 'm' ? 'm' : 'cm', wu = g('wunit') === 't' ? 'tonnes' : 'kg', hu = g('hunit') === 't' ? 'tonnes' : 'kg';
  const cvia = m === 'customs' ? g('via') : '';
  const caddr = m === 'customs' ? (v(f['delivery_address_' + (cvia === 'sea' ? '' : cvia + '_') + 'customs']) || v(f.delivery_address_customs)) : '';
  if (m === 'land') add('Where', ({ import: 'Into Oman, from another GCC country', export: 'Out of Oman, to another GCC country', oman: 'Within Oman' })[dir] || dir);
  else if (dir) add('Import or export', t(dir));
  // equipment
  add('Container size', g('size') ? t(g('size')) : '');
  add('Container type', g('ctype') ? t(g('ctype')) : '');
  { const tp = g('temp'); add(m === 'warehousing' ? 'Storage temperature' : 'Reefer set temperature', /^[-+]?\d+(\.\d+)?$/.test(tp) ? tp + '°C' : tp); }
  add('Out-of-gauge cargo size (' + du + ')', g('oog'));
  add('Kind of cargo', g('kind') ? t(g('kind')) : '');
  add('Type of vehicle', g('vehicle') ? t(g('vehicle')) : '');
  add('New or used', g('condition') ? t(g('condition')) : '');
  add('In running condition', g('running') ? t(g('running')) : '');
  add('Truck type', g('truck') === 'reefer' ? 'Reefer truck with genset' : (g('truck') ? t(g('truck')) : ''));
  if (['bulk', 'project', 'land'].indexOf(k) >= 0) add('Largest piece size (' + du + ')', g('dims'));
  add('Heaviest piece (' + hu + ')', g('heavy'));
  // service-specific
  if (m === 'customs') {
    add('Arriving by', t(cvia)); { const pk = v(f['point_' + cvia + '_customs']); add('Clearance point', pk === 'other' ? v(f['point_other_' + cvia + '_customs']) : place(pk)); }
    add('What is being cleared', CLEARED[g('equip')] || t(g('equip'))); add('Arrival date (ETA)', dt(g('eta'))); add('Has an Oman customs code', t(g('code'))); add('Delivery after clearance', t(v(f['delivery_' + cvia + '_customs'])));
  }
  if (m === 'transit') { add('Entering Oman at', place(g('entry'))); add('What is moving', g('equip') === 'breakbulk' ? 'Break bulk or loose cargo' : t(g('equip'))); add('Needs our trucks', g('trucks') === 'no' ? 'No, they have their own' : t(g('trucks'))); }
  if (m === 'warehousing') { add('Storage type', g('wtype') === 'dry' ? 'General (indoor dry)' : t(g('wtype'))); add('Preferred location', WHERE[g('location')] || t(g('location'))); add('For how long', g('duration')); add('Services needed', gl('services').map(x => x === 'handling' ? 'Handling in and out' : t(x)).join(', ')); }
  if (m === 'containers') { add('Buy or lease', t(g('action'))); add('Lease period', g('lease')); add('Collection or delivery', t(g('delivery'))); }
  if (m === 'agency') { add('Port of call', g('port') === 'other' ? (g('port_other') || 'Another port (not named)') : place(g('port'))); add('Services needed', gl('services').map(x => x === 'handling' ? 'Port agency / vessel handling' : (x === 'other' ? 'Something else' : t(x))).join(', ')); add('Vessel name', g('vessel_name')); add('IMO number', g('vessel_imo')); add('Expected arrival (ETA)', dt(g('eta'))); }
  // terms, supplier, clearance, delivery and collection
  if (dir === 'import') {
    const terms = g('terms');
    add('Shipping terms', terms ? t(terms) : '');
    if (terms === 'EXW') { add('Supplier name', g('supplier_name')); add('Supplier address (collection point)', g('supplier_address')); add('Supplier phone or email', g('supplier_contact')); }
  } else if (dir === 'export') {
    const def = ({ air: 'CIP', land: 'CIP', project: 'CIF or CIP', sea: 'CIF' })[m];
    if (def) add('Shipping terms', def + ' (our default for exports, not asked; the customer can change it)');
  }
  add('Customs clearance by Sohar Shipping', (g('clearance') || g('clearance_export')) ? t(g('clearance') || g('clearance_export')) : '');
  if (dir === 'import') add('Delivery to their premises', g('door') ? t(g('door')) : '');
  if (dir === 'export') add('Collection from their premises', g('collect') ? t(g('collect')) : '');
  if (dir === 'export' || m === 'land') add('Pickup address', g('pickup_address'));
  if (dir === 'import' || ['land', 'customs', 'containers'].indexOf(m) >= 0) add('Delivery address', m === 'customs' ? caddr : g('delivery_address'));
  if (m === 'land') add('Loading or offloading help needed', g('loading') ? t(g('loading')) : '');
  // route and cargo
  const R = { sea: ['Port of loading', 'Port of discharge'], air: ['Airport of origin', 'Destination airport'], project: ['From', 'To'], transit: ['Coming from', 'Final destination'] }[m] || ['From', 'To'];
  const listed = x => { const rg = v(f[x + '_region']); let d = (rg && v(f[x + '_' + m + '_' + rg])) || v(f[x + '_' + m]); if (d && d.indexOf('typed:') === 0) d = d.slice(6).trim() || 'Not sure yet'; return d && d !== 'other' ? d : ''; };   // ports picked from the list or the search (sea)
  // Form v23 (sea): one overseas-port picker. Import = port of loading, with the Oman port of discharge chosen separately;
  // export = port of discharge, and the port of loading is always Sohar Port. Older forms still send pol_ / pod_ fields.
  const far = (() => { const rg = v(f.far_region); let d = (rg && v(f['far_sea_' + rg])) || v(f.far_port_sea); return d && d !== 'other' ? d : ''; })();
  if (m === 'sea' && (far || v(f.far_region) || v(f.pod_oman_sea))) {
    if (dir === 'export') { add(R[0], 'Sohar Port, Oman'); add(R[1], far || 'Not sure yet'); }
    else { add(R[0], far || 'Not sure yet'); add(R[1], v(f.pod_oman_sea) || 'Sohar Port, Oman'); }
  } else { add(R[0], listed('pol') || g('origin')); add(R[1], listed('pod') || g('destination')); }
  add('Cargo', g('commodity'));
  add('Make and model', g('make'));
  add(({ fcl: 'Number of containers', lcl: 'Number of packages', bulk: 'Number of pieces', roro: 'Number of vehicles', air: 'Number of packages', land: 'Number of trucks', project: 'Number of pieces', warehousing: 'Number of pallets', containers: 'Number of containers' })[k] || 'Quantity', g('qty'));
  if (k === 'lcl' || k === 'air') add('Package size (' + du + ')', g('dims'));
  add((({ fcl: 'Total consignment weight', roro: 'Weight per vehicle', warehousing: 'Weight per pallet' })[k] || 'Total weight') + ' (' + wu + ')', g('weight'));
  add('Total volume (CBM, cubic metres)', g('volume'));
  add('Cargo value (USD, for the customs guarantee)', g('value'));
  add('Can be stacked', g('stackable') ? t(g('stackable')) : '');
  add('Dangerous goods', g('dg') ? t(g('dg')) : '');
  add(({ warehousing: 'Start date', containers: 'Needed by' })[m] || 'Cargo ready date', dt(g('ready')));
  add('Notes', v(f.notes));
  return lines.join(String.fromCharCode(10));
}
const out = [];
for (const item of $input.all()) {
  const body = item.json.body || item.json;
  for (const e of body.entry || []) {
    for (const ch of e.changes || []) {
      const v = ch.value || {};
      if (String((v.metadata || {}).phone_number_id || '') !== BOT_PHONE_ID) continue;
      const contacts = v.contacts || [];
      for (const m of v.messages || []) {
        const t = m.type;
        // Emoji reactions and system notices need no reply.
        if (['reaction', 'system', 'ephemeral', 'request_welcome'].indexOf(t) >= 0) continue;
        const c = contacts.find(x => x.wa_id === m.from) || contacts[0] || {};
        let text = '';
        let mediaId = '';
        let caption = '';
        if (t === 'text') text = m.text.body;
        else if (t === 'interactive' && m.interactive.nfm_reply) { let f = {}; try { f = JSON.parse(m.interactive.nfm_reply.response_json || '{}'); } catch (e) { f = {}; } text = formText(f); }
        else if (t === 'interactive') text = (m.interactive.button_reply && m.interactive.button_reply.title) || (m.interactive.list_reply && m.interactive.list_reply.title) || '';
        else if (t === 'button') text = m.button.text;
        else if (MEDIA.indexOf(t) >= 0 || t === 'audio') { mediaId = (m[t] || {}).id || ''; caption = (m[t] || {}).caption || (m[t] || {}).filename || ''; }
        else if (t === 'location') text = '[Location shared: ' + (m.location.name || '') + ' ' + m.location.latitude + ',' + m.location.longitude + ']';
        else if (t === 'contacts') text = '[Contact card shared: ' + (m.contacts || []).map(k => ((k.name && k.name.formatted_name) || '') + ' ' + (k.phones || []).map(p => p.phone).join(', ')).join('; ') + ']';
        let content;
        if (['text', 'interactive', 'button', 'location', 'contacts'].indexOf(t) >= 0) content = text;
        else if (t === 'audio') content = '[The customer sent a voice note. You cannot listen to audio.]';
        else if (t === 'sticker') content = '[The customer sent a sticker.]';
        else if (MEDIA.indexOf(t) >= 0) {
          const f = m[t] || {};
          const fname = String(f.filename || (t + '-' + String(m.id).slice(-6) + '.' + String(f.mime_type || '').split('/').pop().split(';')[0])).replace(/[;()\]\[]/g, ' ');
          content = '[The customer sent a ' + t + (f.caption ? ' with the caption: ' + f.caption : '') + ' (file id ' + mediaId + '; type ' + String(f.mime_type || '') + '; name ' + fname + ')]';
        }
        else content = '[Unsupported message type: ' + t + ']';
        out.push({ json: { phone: m.from, name: (c.profile && c.profile.name) || '', message_id: m.id, type: t, text, content, media_id: mediaId, caption, received_at: new Date(Number(m.timestamp) * 1000).toISOString() } });
      }
    }
  }
}
return out;
