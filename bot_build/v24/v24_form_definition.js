// SST service form v24 (23 Nov 2026). Each service has its own pages, so answers from one service never travel with another.
// Air: Muscat Airport fixed for import (destination) and export (origin). New questions from the charge-point review (HS codes left out).
// Was v23: Export: port of loading is Sohar Port and is not asked. Import: port of discharge is an Oman port.
// Named road borders, "Which port?" for agency, "not sure" allowed for sizes and volume, no export-clearance question. Was v22. Page 1: choose a service. Page 2: the main choices for that service.
// Page 3: details that follow from those choices. Page 4: route, cargo and the one "how many" question.
const O = a => a.map(([id, title, d]) => d ? { id, title, description: d } : { id, title });
const radio = (name, label, o, desc) => Object.assign({ type: 'RadioButtonsGroup', name, label, required: true, 'data-source': O(o) }, desc ? { description: desc } : {});
const checks = (name, label, o, desc) => Object.assign({ type: 'CheckboxGroup', name, label, required: true, 'min-selected-items': 1, 'data-source': O(o) }, desc ? { description: desc } : {});
const ti = (name, label, req, itype, helper) => Object.assign({ type: 'TextInput', name, label, 'input-type': itype || 'text', required: req }, helper ? { 'helper-text': helper } : {});
const ta = (name, label, req, helper) => Object.assign({ type: 'TextArea', name, label, required: req }, helper ? { 'helper-text': helper } : {});
const date = (name, label, req) => ({ type: 'DatePicker', name, label, required: !!req });
const D = '$' + '{';
const cond = (src, f, op, v, then) => ({ type: 'If', condition: D + src + '.' + f + '} ' + op + " '" + v + "'", then });
const M = (m, then) => cond('data', 'mode', '==', m, then);          // which service
const DT = (f, v, then) => cond('data', f, '==', v, then);          // a choice made on an earlier page
const F = (f, v, then) => cond('form', f, '==', v, then);           // a choice made on this page
const YN = [['yes', 'Yes'], ['no', 'No']];
const YNS = [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']];
const DIR = [['import', 'Import into Oman'], ['export', 'Export from Oman']];
const EVO = [['no', 'No'], ['electric', 'Electric'], ['hybrid', 'Hybrid'], ['mix', 'A mix']];
const SIZE = [['20', '20 feet (20ft)'], ['40', '40 feet (40ft)'], ['both', 'Both 20 and 40 feet']];
const CTYPE = [['dry', 'Standard (dry)'], ['hc', 'High cube'], ['reefer', 'Reefer (refrigerated)'], ['special', 'Open top or flat rack', 'For oversized cargo']];
const TERMS = {
  sea: [['EXW', 'EXW (Ex Works)', 'We collect from your supplier'], ['FOB', 'FOB (Free on Board)', 'Your supplier delivers to the port of loading'], ['not_sure', 'Not sure']],
  air: [['EXW', 'EXW (Ex Works)', 'We collect from your supplier'], ['FCA', 'FCA (Free Carrier)', 'Your supplier hands the cargo to the airline'], ['not_sure', 'Not sure']],
  land: [['EXW', 'EXW (Ex Works)', 'We collect from your supplier'], ['FCA', 'FCA (Free Carrier)', 'Your supplier loads it on our truck'], ['not_sure', 'Not sure']] };
const clearance = k => radio('clearance_' + k, 'Customs clearance by us?', YNS, 'Bill of entry and customs formalities in Oman');
const dg = k => radio('dg_' + k, 'Dangerous goods?', [['no', 'No'], ['yes', 'Yes', 'Hazardous or classified cargo'], ['not_sure', 'Not sure']]);
const commodity = k => ti('commodity_' + k, 'What is the cargo?', true, 'text', 'For example furniture, steel pipes, frozen food');
const qty = (k, label, helper) => ti('qty_' + k, label, true, 'text', helper);
const WU = [['kg', 'Kilograms (kg)'], ['t', 'Tonnes (t)']];
const DU = [['cm', 'Centimetres (cm)'], ['m', 'Metres (m)']];
const unitDd = (name, label, o, opt) => ({ type: 'Dropdown', name, label, required: !opt, 'data-source': O(o) });
const WL = { fcl: 'Consignment weight', roro: 'Weight per vehicle', warehousing: 'Weight per pallet' };
const weight = (k, label, helper) => [unitDd('wunit_' + k, 'Weight unit', WU), ti('weight_' + k, WL[k] || 'Total weight', true, 'number', helper || 'In the unit chosen above')];
const heavyField = (k, label) => [unitDd('hunit_' + k, 'Weight unit', WU), ti('heavy_' + k, label, true, 'number', 'In the unit chosen above')];
const dimField = (k, label, helper, p, opt) => [unitDd('dunit_' + k, 'Size unit', DU, opt), ti((p || 'dims') + '_' + k, label, !opt, 'text', helper)];
const route = (k, a, b) => [ti('origin_' + k, a, true, 'text'), ti('destination_' + k, b, true, 'text')];
const ready = (k, label) => date('ready_' + k, label || 'Cargo ready date', true);
// Import: terms, the supplier if EXW, customs clearance, then delivery. Export: clearance, then collection. Same order everywhere.
function importExport(k, terms, port, opts) {
  opts = opts || {};
  const out = [];
  const imp = [radio('terms_' + k, 'Shipping terms', TERMS[terms])];
  out.push(DT('direction_' + k, 'import', imp));
  out.push(F('terms_' + k, 'EXW', [ti('supplier_name_' + k, 'Supplier name', true), ta('supplier_address_' + k, 'Supplier address', true, 'Where we collect from: street, city and country'), ti('supplier_contact_' + k, 'Supplier phone/email', false)]));
  out.push(DT('direction_' + k, 'import', [clearance(k)]));   // imports only: export clearance is part of shipping the export
  out.push(DT('direction_' + k, 'import', [radio('door_' + k, 'Delivery to your premises?', YN, 'Transport from the ' + port + ' to your door or site')]));
  out.push(F('door_' + k, 'yes', [ta('delivery_address_' + k, 'Delivery address', true, 'Full address in Oman, with area and city')]));
  out.push(DT('direction_' + k, 'export', [radio('collect_' + k, 'Collection from you?', YN, 'We pick up from your premises and take it to the ' + port)]));
  out.push(F('collect_' + k, 'yes', [ta('pickup_address_' + k, 'Pickup address', true, 'Full address, with area and city')]));
  return out;
}
const MODES = [
  ['sea', 'Sea freight', 'Full container, less than container load, break bulk or RoRo (Roll-on/Roll-off)'],
  ['air', 'Air freight', 'Import or export by air'],
  ['land', 'Land transport', 'Trucks within Oman and across the GCC (Gulf Cooperation Council)'],
  ['customs', 'Import customs clearance', 'Clearance in Oman for cargo arriving by sea, air or road'],
  ['transit', 'Transit through Oman', 'Transit Bayan to another country'],
  ['project', 'Project and heavy-lift cargo', 'Machinery, out-of-gauge and heavy units'],
  ['warehousing', 'Warehousing and 3PL', '3PL (third-party logistics): storage, handling and local delivery'],
  ['containers', 'Buy or lease containers', 'New or used, 20 or 40 feet'],
  ['agency', 'Shipping agency (vessels)', 'Port agency, crew change and chandlery']];
// ---------- page 2: the main choices ----------
// Sea: pick the region first, then the port in that region (PORTS page). No server needed.
const REGIONS = [["gulf","Middle East",[["Abu Dhabi","United Arab Emirates"],["Dammam","Saudi Arabia"],["Hamad Port","Qatar"],["Jebel Ali","United Arab Emirates"],["Jeddah","Saudi Arabia"],["Khalifa Bin Salman (Bahrain)","Bahrain"],["Khor Fakkan","United Arab Emirates"],["Sharjah","United Arab Emirates"],["Shuaiba","Kuwait"],["Shuwaikh","Kuwait"],["Umm Qasr North Port","Iraq"]]],["subc","Indian subcontinent",[["Chattogram","Bangladesh"],["Chennai","India"],["Cochin","India"],["Colombo","Sri Lanka"],["Gangavaram","India"],["Hazira","India"],["Karachi","Pakistan"],["Mundra","India"],["Nhava Sheva","India"],["Port Qasim","Pakistan"],["Tuticorin","India"],["Visakhapatnam","India"]]],["east","East Asia",[["Busan","South Korea"],["Da Chan Bay","China"],["Dalian","China"],["Fuqing","China"],["Fuzhou","China"],["Gunsan","South Korea"],["Gwangyang","South Korea"],["Hakata","Japan"],["Hong Kong","Hong Kong"],["Incheon","South Korea"],["Iwakuni","Japan"],["Kaohsiung","Taiwan"],["Keelung","Taiwan"],["Kobe","Japan"],["Lianyungang","China"],["Moji","Japan"],["Nagoya","Japan"],["Nansha","China"],["Ningbo","China"],["Osaka","Japan"],["Qingdao","China"],["Qinzhou","China"],["Rizhao","China"],["Shanghai","China"],["Shantou","China"],["Shekou","China"],["Shimizu","Japan"],["Taichung","Taiwan"],["Taipei","Taiwan"],["Tokyo","Japan"],["Ulsan","South Korea"],["Xiamen","China"],["Xingang (Tianjin)","China"],["Yangpu","China"],["Yantian","China"],["Yokkaichi","Japan"],["Yokohama","Japan"],["Zhanjiang","China"]]],["sea","South East Asia",[["Bangkok","Thailand"],["Batam","Indonesia"],["Batangas","Philippines"],["Belawan","Indonesia"],["Bintulu","Malaysia"],["Brisbane","Australia"],["Cagayan de Oro","Philippines"],["Cai Mep","Vietnam"],["Cebu","Philippines"],["Da Nang","Vietnam"],["Davao","Philippines"],["General Santos","Philippines"],["Haiphong","Vietnam"],["Ho Chi Minh City","Vietnam"],["Jakarta","Indonesia"],["Kota Kinabalu","Malaysia"],["Kuantan","Malaysia"],["Laem Chabang","Thailand"],["Manila North Port","Philippines"],["Manila South Port","Philippines"],["Melbourne","Australia"],["Muara","Brunei"],["Pasir Gudang","Malaysia"],["Penang","Malaysia"],["Port Klang North Port","Malaysia"],["Port Klang West Port","Malaysia"],["Qui Nhon","Vietnam"],["Semarang","Indonesia"],["Sihanoukville","Cambodia"],["Singapore","Singapore"],["Subic Bay","Philippines"],["Surabaya","Indonesia"],["Sydney","Australia"],["Tanjung Pelepas","Malaysia"],["Yangon","Myanmar"]]],["eur","Europe and Mediterranean",[["Aliaga","Turkey"],["Ancona","Italy"],["Antwerp","Belgium"],["Aqaba","Jordan"],["Ashdod","Israel"],["Barcelona","Spain"],["Bari","Italy"],["Beirut","Lebanon"],["Bremerhaven","Germany"],["Constanta","Romania"],["Derince","Turkey"],["Dunkerque","France"],["Felixstowe","United Kingdom"],["Fos-sur-Mer","France"],["Gdansk","Poland"],["Gemlik","Turkey"],["Genoa","Italy"],["Haifa","Israel"],["Hamburg","Germany"],["Iskenderun","Turkey"],["Istanbul","Turkey"],["Izmit","Turkey"],["Koper","Slovenia"],["La Spezia","Italy"],["Le Havre","France"],["Limassol","Cyprus"],["Marsaxlokk","Malta"],["Mersin","Turkey"],["Piraeus","Greece"],["Poti","Georgia"],["Ravenna","Italy"],["Rijeka","Croatia"],["Rotterdam","Netherlands"],["Southampton","United Kingdom"],["Thessaloniki","Greece"],["Trieste","Italy"],["Valencia","Spain"],["Varna","Bulgaria"],["Venice","Italy"],["Wilhelmshaven","Germany"],["Zeebrugge","Belgium"]]],["afr","Africa",[["Abu Qir","Egypt"],["Alexandria","Egypt"],["Algiers","Algeria"],["Cape Town","South Africa"],["Casablanca","Morocco"],["Dar es Salaam","Tanzania"],["Durban","South Africa"],["Maputo","Mozambique"],["Misurata","Libya"],["Mombasa","Kenya"],["Sokhna Port","Egypt"],["Tangier","Morocco"]]],["nam","North America",[["Altamira","Mexico"],["Baltimore","United States"],["Boston","United States"],["Charleston","United States"],["Ensenada","Mexico"],["Houston","United States"],["Long Beach","United States"],["Los Angeles","United States"],["Lázaro Cárdenas","Mexico"],["Manzanillo","Mexico / Panama"],["Miami","United States"],["Mobile","United States"],["New Orleans","United States"],["New York","United States"],["Norfolk","United States"],["Oakland","United States"],["Prince Rupert","Canada"],["Savannah","United States"],["Seattle","United States"],["Tacoma","United States"],["Tampa","United States"],["Vancouver","Canada"],["Veracruz","Mexico"]]],["sam","Central and South America",[["Acajutla","El Salvador"],["Arica","Chile"],["Balboa","Panama"],["Barranquilla","Colombia"],["Buenaventura","Colombia"],["Buenos Aires","Argentina"],["Caldera","Costa Rica"],["Callao","Peru"],["Cartagena","Colombia"],["Caucedo","Dominican Republic"],["Chancay","Peru"],["Colón Container Terminal","Panama"],["Corinto","Nicaragua"],["Guayaquil","Ecuador"],["Iquique","Chile"],["Itapoá","Brazil"],["Kingston","Jamaica"],["Montevideo","Uruguay"],["Moín","Costa Rica"],["Navegantes","Brazil"],["PSA Panama Intl Terminal","Panama"],["Paranaguá","Brazil"],["Port-au-Prince","Haiti"],["Puerto Cortes","Honduras"],["Puerto Quetzal","Guatemala"],["Puerto Santo Tomás de Castilla","Guatemala"],["Rio Haina","Dominican Republic"],["Rio de Janeiro","Brazil"],["San Antonio","Chile"],["San Juan","Puerto Rico"],["San Lorenzo","Honduras"],["Santa Marta","Colombia"],["Santos","Brazil"],["Valparaiso","Chile"]]]];
const regOpts = REGIONS.map(([id, t]) => ({ id, title: t })).concat([{ id: 'other', title: 'Other (type the port)' }]);
const regPorts = r => r[2].map(([p, c]) => ({ id: p + ', ' + c, title: p.slice(0, 30), description: c }));
const OMAN_PORTS = [['Sohar Port, Oman', 'Sohar Port'], ['Duqm Port, Oman', 'Duqm Port'], ['Salalah Port, Oman', 'Salalah Port'], ['Port Sultan Qaboos (Muscat), Oman', 'Port Sultan Qaboos (Muscat)'], ['Not sure', 'Not sure']];
// One port picker serves both directions (it is the overseas port either way), which keeps this page well inside WhatsApp's limit:
// import = port of loading, export = port of discharge. The answers arrive as far_region / far_sea_<region> / far_port_sea.
const portsKids = [
  DT('direction_sea', 'import', [{ type: 'TextSubheading', text: 'Port of loading' }]),
  DT('direction_sea', 'export', [{ type: 'TextBody', text: 'Port of loading: Sohar Port, Oman.' }, { type: 'TextSubheading', text: 'Port of discharge' }]),
  M('sea', [{ type: 'Dropdown', name: 'far_region', label: 'Region', required: true, 'data-source': regOpts }]),
  ...REGIONS.map(r => F('far_region', r[0], [{ type: 'Dropdown', name: 'far_sea_' + r[0], label: 'Port', required: true, 'data-source': regPorts(r) }])),
  F('far_region', 'other', [ti('far_port_sea', 'Port name', true)]),
  DT('direction_sea', 'import', [{ type: 'Dropdown', name: 'pod_oman_sea', label: 'Arriving at', required: true, 'data-source': O(OMAN_PORTS), 'init-value': 'Sohar Port, Oman' }])];
const dirKids = [F('mode', 'sea', [radio('direction_sea', 'Import or export?', DIR)]), F('mode', 'air', [radio('direction_air', 'Import or export?', DIR)]), F('mode', 'land', [radio('direction_land', 'Where is it going?', [['import', 'Into Oman', 'From another GCC (Gulf Cooperation Council) country'], ['export', 'Out of Oman', 'To another GCC (Gulf Cooperation Council) country'], ['oman', 'Within Oman']])]), F('mode', 'project', [radio('direction_project', 'Import or export?', DIR)])];
const DIRN = (function w(ch, o) { for (const c of ch) { if (c.type === 'If') w(c.then, o); else if (c.name) o.push(c.name); } return o; })(dirKids, []);
const p2 = [
  ...portsKids,
  ...importExport('project', 'sea', 'port'),
  DT('direction_air', 'import', [{ type: 'TextBody', text: 'Arriving at: Muscat Airport, Oman.' }, ti('origin_air', 'Airport of origin', true, 'text', 'City or airport, for example Frankfurt')]),
  DT('direction_air', 'export', [{ type: 'TextBody', text: 'Departing from: Muscat Airport, Oman.' }, ti('destination_air', 'Destination airport', true, 'text', 'City or airport, for example Mumbai')]),
  M('sea', [radio('sea_type', 'Type of sea shipment', [['fcl', 'Full container load (FCL)', 'Your cargo in its own 20-foot or 40-foot container'], ['lcl', 'Less than container load', 'For smaller shipments, charged by volume'], ['bulk', 'Break bulk or bulk', 'Oversized pieces, or loose cargo such as salt'], ['roro', 'RoRo (Roll-on/Roll-off)', 'Cars, trucks, buses and machinery on wheels']])]),
  M('land', [radio('truck_land', 'Type of truck', [['flatbed', 'Flatbed trailer'], ['lowbed', 'Low-bed', 'Heavy or oversized cargo'], ['box', 'Closed box or curtain side'], ['reefer', 'Reefer truck with genset', 'Genset (generator set) for chilled or frozen cargo'], ['not_sure', 'Not sure']]),
    dimField('land', 'Largest piece size', 'Only for oversized cargo: Length x Width x Height', null, true)]),
  M('customs', [radio('via_customs', 'Arriving by', [['sea', 'Sea'], ['air', 'Air'], ['road', 'Road']])]),
  F('via_customs', 'sea', [radio('point_sea_customs', 'Where is it cleared?', [['sohar', 'Sohar Port'], ['duqm', 'Duqm Port'], ['salalah', 'Salalah Port'], ['other', 'Somewhere else']])]),
  F('via_customs', 'air', [radio('point_air_customs', 'Where is it cleared?', [['muscat_air', 'Muscat Airport'], ['salalah_air', 'Salalah Airport'], ['other', 'Somewhere else']])]),
  F('via_customs', 'road', [radio('point_road_customs', 'Where is it cleared?', [['wajajah', 'Al Wajajah (Hatta)'], ['hafeet', 'Khatm Al Shikla / Hafeet', 'Al Ain side'], ['rub_al_khali', 'Rub\' Al Khali', 'Saudi Arabia'], ['not_sure', 'Not sure'], ['other', 'Somewhere else']])]),
  F('point_sea_customs', 'other', [ti('point_other_sea_customs', 'Which place?', true)]),
  F('point_air_customs', 'other', [ti('point_other_air_customs', 'Which place?', true)]),
  F('point_road_customs', 'other', [ti('point_other_road_customs', 'Which place?', true)]),
  M('transit', [radio('entry_transit', 'Entering Oman at', [['sohar', 'Sohar Port'], ['duqm', 'Duqm Port'], ['salalah', 'Salalah Port'], ['muscat_air', 'Muscat Airport'], ['wajajah', 'Al Wajajah border (Hatta)'], ['hafeet', 'Khatm Al Shikla / Hafeet', 'Border on the Al Ain side'], ['rub_al_khali', 'Rub\' Al Khali border', 'Saudi Arabia'], ['not_sure', 'Not sure']]),
    radio('equip_transit', 'What is moving?', [['containers', 'Containers'], ['vehicles', 'Vehicles (Roll-on/Roll-off)'], ['breakbulk', 'Break bulk or loose cargo']])]),
  M('warehousing', [radio('wtype_warehousing', 'Type of storage', [['dry', 'General (indoor dry)'], ['cold', 'Temperature-controlled'], ['bonded', 'Free zone or bonded', 'Duty not yet paid'], ['not_sure', 'Not sure']]),
    radio('location_warehousing', 'Preferred location', [['muscat', 'Muscat (Rusayl)'], ['sohar_fz', 'Sohar Free Zone'], ['not_sure', 'Not sure']]),
    ti('duration_warehousing', 'How long for?', true, 'text', 'For example 3 months')]),
  F('wtype_warehousing', 'cold', [ti('temp_warehousing', 'Temperature (°C)', true, 'text', 'For example +4 or -18')]),
  M('warehousing', [radio('arrive_warehousing', 'Arriving as', [['pallets', 'Pallets'], ['loose', 'Loose cartons or pieces'], ['mix', 'A mix']])]),
  M('containers', [radio('action_containers', 'Buy or lease?', [['buy', 'Buy'], ['lease', 'Lease']])]),
  F('action_containers', 'lease', [ti('lease_containers', 'Lease period', true, 'text', 'For example 6 months')]),
  M('containers', [radio('condition_containers', 'New or used?', [['new', 'New'], ['used', 'Used'], ['either', 'Either']])]),
  M('agency', [radio('port_agency', 'Port of call', [['sohar', 'Sohar Port'], ['muscat', 'Port Sultan Qaboos (Muscat)'], ['duqm', 'Duqm Port'], ['salalah', 'Salalah Port'], ['other', 'Another port']]),
    checks('services_agency', 'Services needed', [['handling', 'Port agency / vessel handling'], ['crew', 'Crew change'], ['chandlery', 'Ship chandlery (supplies)'], ['other', 'Something else']], 'Choose one or more. For anything else, use the notes box at the end')]),
  F('port_agency', 'other', [ti('port_other_agency', 'Which port?', true)])];
// ---------- page 3: details that follow from page 2 ----------
const p3 = [
  // sea: the equipment for the chosen type, then import / export, then clearance
  DT('sea_type', 'fcl', [radio('size_fcl', 'Container size', SIZE), radio('ctype_fcl', 'Container type', CTYPE.concat([['tank', 'ISO tank', 'ISO (International Organization for Standardization) tank for liquids in bulk'], ['not_sure', 'Not sure']]))]),
  F('ctype_fcl', 'reefer', [ti('temp_fcl', 'Set temperature (°C)', true, 'text', 'In degrees Celsius (°C), for example +4 or -18')]),
  F('ctype_fcl', 'special', [dimField('fcl', 'Cargo size', 'Length x Width x Height, for example 9.2 x 2.9 x 3.7', 'oog')]),
  DT('sea_type', 'bulk', [radio('kind_bulk', 'What kind of cargo?', [['breakbulk', 'Break bulk (pieces)', 'Steel, machinery, crates'], ['bulk', 'Bulk (loose)', 'Salt, aggregates, grain and similar']]),
    dimField('bulk', 'Largest piece size', 'Length x Width x Height of the largest piece'), heavyField('bulk', 'Heaviest piece')]),
  F('kind_bulk', 'breakbulk', [{ type: 'TextBody', text: 'Please have the packing list ready for break bulk cargo. After you send this form I will ask you to upload it here in the chat.' }]),
  DT('sea_type', 'roro', [radio('vehicle_roro', 'Type of vehicle', [['car', 'Cars or SUVs'], ['truck', 'Trucks or buses'], ['machinery', 'Machinery on wheels'], ['mixed', 'A mix']]),
    radio('condition_roro', 'New or used?', [['new', 'New'], ['used', 'Used']]), radio('running_roro', 'In running condition?', YN), radio('ev_roro', 'Electric or hybrid?', EVO)]),
  ...importExport('sea', 'sea', 'port'),
  // air
  ...importExport('air', 'air', 'airport'),
  DT('direction_air', 'import', [radio('exhibition_air', 'For an exhibition?', YN, 'Or another temporary import that will be re-exported')]),
  // land
  DT('direction_land', 'import', [radio('terms_land', 'Shipping terms', TERMS.land), clearance('land')]),
  F('terms_land', 'EXW', [ti('supplier_name_land', 'Supplier name', true)]),
  M('land', [radio('loading_land', 'Loading help needed?', YNS, 'Crane, forklift or labour at pickup or delivery')]),
  // project
  M('project', [dimField('project', 'Largest piece size', 'Length x Width x Height, for example 9.2 x 2.9 x 3.7'), heavyField('project', 'Heaviest piece'),
    ti('volume_project', 'Total volume (CBM)', true, 'text', 'Cubic metres for all pieces, or write "not sure"'),
    radio('shipas_project', 'How will it be shipped?', [['breakbulk', 'Break bulk'], ['flatrack', 'Flat rack or open top'], ['not_sure', 'Not sure']]),
    radio('crane_project', 'Crane or offloading at site?', YNS, 'Crane, forklift or labour at the delivery site')]),
  // customs
  M('customs', [radio('equip_customs', 'What is being cleared?', [['fcl', 'Full container load (FCL)', 'A 20 foot or 40 foot container'], ['reefer', 'Reefer container', 'Temperature-controlled (chilled or frozen) cargo'], ['lcl', 'Less than container load (LCL)', 'Smaller shipments, charged by volume'], ['vehicles', 'Vehicles', 'Cars, trucks, buses or machinery on wheels'], ['breakbulk', 'Break bulk (pieces)', 'Steel, machinery, crates and similar'], ['project', 'Project or heavy-lift cargo', 'Oversized or very heavy units'], ['air', 'Air cargo', 'Cleared at an airport']]),
    date('eta_customs', 'ETA (Estimated Time of Arrival)', false),
    radio('code_customs', 'Oman customs code?', YNS, 'Does the importer have one?')]),
  { type: 'If', condition: D + "form.equip_customs} == 'fcl' || " + D + "form.equip_customs} == 'reefer'", then: [radio('size_customs', 'Container size', SIZE)] },
  DT('via_customs', 'sea', [radio('delivery_sea_customs', 'Delivery after clearance?', YN)]),
  DT('via_customs', 'air', [radio('delivery_air_customs', 'Delivery after clearance?', YN)]),
  F('delivery_sea_customs', 'yes', [ta('delivery_address_customs', 'Delivery address', true, 'Full address, with area and city')]),
  F('delivery_air_customs', 'yes', [ta('delivery_address_air_customs', 'Delivery address', true, 'Full address, with area and city')]),
  DT('via_customs', 'road', [F('equip_customs', 'breakbulk', [{ type: 'TextBody', text: 'For break bulk arriving by road, please have the commercial invoice and the packing list ready. After you send this form I will ask you to upload them here in the chat.' }]), ta('delivery_address_road_customs', 'Delivery location', true, 'Full address in Oman, with area and city')]),
  // transit
  DT('equip_transit', 'containers', [radio('size_transit', 'Container size', SIZE), radio('ctype_transit', 'Container type', CTYPE)]),
  DT('equip_transit', 'containers', [radio('return_transit', 'Where does the empty go back?', [['destination', 'Stays at destination'], ['sohar', 'Back to Sohar Port'], ['jebel_ali', 'Jebel Ali'], ['duqm', 'Duqm Port'], ['not_sure', 'Not sure']])]),
  DT('equip_transit', 'vehicles', [radio('ev_transit', 'Electric or hybrid?', EVO)]),
  M('transit', [radio('trucks_transit', 'Do you need our trucks?', [['yes', 'Yes'], ['no', 'No, we have our own']]),
    radio('consignee_transit', 'Consignee at destination?', YNS, 'Someone at the destination who will clear the goods')]),
  // warehousing
  M('warehousing', [checks('services_warehousing', 'Services needed', [['handling', 'Handling in and out'], ['pickpack', 'Pick and pack'], ['inventory', 'Inventory management'], ['delivery', 'Local delivery'], ['offloading', 'Container offloading']], 'Choose any that apply')]),
  // containers
  M('containers', [radio('size_containers', 'Container size', SIZE), radio('ctype_containers', 'Container type', CTYPE),
    radio('delivery_containers', 'Collection or delivery?', [['collect', 'I will collect from your yard'], ['deliver', 'Deliver to my site']])]),
  F('delivery_containers', 'deliver', [ta('delivery_address_containers', 'Delivery address', true, 'Full address, with area and city')]),
  // agency
  M('agency', [ti('vessel_name_agency', 'Vessel name', true), ti('vessel_imo_agency', 'IMO number', false, 'number', 'IMO (International Maritime Organization) number of the vessel'),
    ti('vessel_size_agency', 'Vessel type and size', false, 'text', 'For example bulk carrier, 32,000 GRT or 190 m LOA'),
    ti('days_agency', 'Days in port', true, 'number', 'How many days alongside or at anchor'),
    ti('crew_agency', 'Crew joining/leaving', false, 'text', 'Only for crew change, for example 3 joining, 2 leaving')])];
// ---------- page 4: route, cargo and the one quantity question ----------
const p4 = [
  DT('sea_type', 'fcl', [commodity('fcl'), qty('fcl', 'How many containers?', 'For example 2, or 2 x 20 feet and 1 x 40 feet'), weight('fcl', '', 'Total weight of the whole consignment'),
    Object.assign(radio('freedays_fcl', 'Extra free days at the port?', YN, 'Beyond the shipping line\'s standard free time'), { required: false })]),
  F('freedays_fcl', 'yes', [ti('freedays_n_fcl', 'How many extra days?', true, 'number')]),
  DT('sea_type', 'lcl', [commodity('lcl'), qty('lcl', 'How many packages?', 'Cartons, pallets or crates'), dimField('lcl', 'Package size', 'L x W x H of one package, e.g. 120 x 80 x 100, or write "not sure"'), weight('lcl', 'Total weight (kg)'), ti('volume_lcl', 'Total volume (CBM)', true, 'text', 'Cubic metres for the whole shipment, or write "not sure"'), radio('stackable_lcl', 'Can it be stacked?', YNS)]),
  DT('sea_type', 'bulk', [commodity('bulk'), qty('bulk', 'How many pieces?', 'Write "loose" for bulk cargo'), weight('bulk', 'Weight (tonnes)'), ti('volume_bulk', 'Total volume (CBM)', true, 'text', 'Cubic metres for all pieces, or write "not sure"')]),
  DT('sea_type', 'roro', [ti('make_roro', 'Make and model', true, 'text', 'For example Toyota Land Cruiser 2024'), qty('roro', 'How many vehicles?'), weight('roro', 'Kg per vehicle')]),
  M('sea', [cond('data', 'sea_type', '!=', 'roro', [dg('sea')]), ready('sea')]),
  M('air', [commodity('air'), qty('air', 'How many packages?', 'Cartons, pallets or crates'),
    dimField('air', 'Package size', 'L x W x H of one package, e.g. 120 x 80 x 100, or write "not sure"'), weight('air', 'Total weight (kg)'), ti('volume_air', 'Total volume (CBM)', true, 'text', 'Cubic metres for the whole shipment, or write "not sure"'),
    radio('stackable_air', 'Can it be stacked?', YNS), dg('air'), ready('air')]),
  M('land', [{ type: 'TextBody', text: 'Please have the commercial invoice and the packing list ready for road freight. After you send this form I will ask you to upload them here in the chat.' }, ta('pickup_address_land', 'Pickup address', true, 'Full address, with area, city and country'), ta('delivery_address_land', 'Delivery address', true, 'Full address, with area, city and country'),
    commodity('land'), qty('land', 'How many trucks?', 'Write "not sure" if you don’t know'), weight('land', 'Total weight (kg)'), dg('land'), ready('land')]),
  M('project', [...route('project', 'From', 'To'), commodity('project'), qty('project', 'How many pieces?'), weight('project', 'Total weight (kg)'), dg('project'), ready('project')]),
  M('customs', [commodity('customs')]),
  DT('via_customs', 'road', [ti('trucks_customs', 'How many trucks?', true, 'number')]),
  cond('data', 'via_customs', '!=', 'road', [qty('customs', 'How many?', 'For example 2 x 40 feet, 15 pallets or 3 vehicles')]),
  M('customs', [weight('customs', 'Total weight (kg)'), ti('value_customs', 'Cargo value (USD)', false, 'number', 'Optional, for an estimate of duty and VAT'), dg('customs')]),
  M('transit', [...route('transit', 'Coming from', 'Final destination'), commodity('transit'), qty('transit', 'How many?', 'For example 3 x 40 feet, or 12 vehicles'), weight('transit', 'Total weight (kg)'), ti('value_transit', 'Cargo value (USD)', true, 'number', 'In US dollars, needed for the customs guarantee'), dg('transit'), ready('transit')]),
  M('warehousing', [commodity('warehousing'), qty('warehousing', 'How many pallets?', 'A rough number is fine'), weight('warehousing', 'Kg per pallet'), dg('warehousing'), ready('warehousing', 'Start date'), ta('areas_warehousing', 'Delivery areas', false, 'Only if you need local delivery')]),
  M('containers', [qty('containers', 'How many containers?', 'For example 3, or 3 x 20 feet and 2 x 40 feet'), ready('containers', 'Needed by')]),
  M('agency', [date('eta_agency', 'Expected arrival', true)]),
  ta('notes', 'Anything else?', false, 'Special handling, deadlines, documents you have...')];
const norm = ch => { const o = []; for (const x of ch) { if (Array.isArray(x)) o.push(...norm(x)); else { if (x.type === 'If') x.then = norm(x.then); o.push(x); } } return o; };
const P2 = norm(p2), P3 = norm(p3), P4 = norm(p4);
// ---------- v24: one chain of pages per service ----------
// Each service gets its own pages, so a customer who goes back and picks another service starts on empty pages,
// and each service's "Send" collects only that service's answers.
const SVC = ['sea', 'air', 'land', 'customs', 'transit', 'project', 'warehousing', 'containers', 'agency'];
const SEA_KEYS = ['fcl', 'lcl', 'bulk', 'roro'];
const svcOfField = n => { if (!n || n === 'notes' || n === 'mode') return 'all'; if (/^(sea_type|far_|pod_oman)/.test(n)) return 'sea'; const t = n.split('_').pop(); if (SVC.indexOf(t) >= 0) return t; if (SEA_KEYS.indexOf(t) >= 0) return 'sea'; return 'all'; };
const CRE = /^\$\{(data|form)\.(\w+)\} (==|!=) '(.*)'$/;
const parseCond = c => c.split('||').map(p => p.trim().match(CRE));
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
const serviceScreen = { id: 'SERVICE', title: 'How can we help?', data: {}, layout: { type: 'SingleColumnLayout', children: [
  { type: 'NavigationList', name: 'service_list', 'list-items': SVC.map(m => ({ id: m, 'main-content': { title: TITLE[m], description: SUB[m] }, 'on-click-action': { name: 'navigate', next: { type: 'screen', name: chains[m][0].id }, payload: {} } })) }] } };
const screens = [serviceScreen].concat(...SVC.map(m => chains[m]));
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
return [{ json: { name: 'SST service form v24 own pages per service', categories: ['LEAD_GENERATION'], flow_json: JSON.stringify(flow) } }];
