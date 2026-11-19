const { run } = require('./rig.js');
const base = { reply:'x', language:'en', stage:'collecting', options:'', confirmed_now:false, cancel_requested:false, speak_to:{requested:false,person:''}, new_enquiry:false, notify_sales:false, out_of_scope:false, support:{is_support:false,summary:''}, escalate:{needed:false,category:'',summary:''}, lead:{}, last_question:'' };
const form = '[The customer filled in the service form]\nService: Land freight\nCargo value (USD, for the customs guarantee): 450000\nHeaviest piece (tonnes): 18\nWhere: Into Oman, from another GCC country\nFrom: Dubai\nTo: Sohar\nCargo: Tiles\nDangerous goods: Yes';
const known = { additional_info:'Position: Manager', name:'Ravi Kumar', company:'Acme LLC', customer_type:'company', preferred_contact:'WhatsApp', email:'r@acme.com' };
(async()=>{
  // 1. service form arrives
  let r = await run('c', { msg:{content:form, type:'interactive'}, chat:{stage:'collecting', history:'[]', lead_json: JSON.stringify(known)}, answer: Object.assign({}, base, { reply:'Please send the commercial invoice, packing list and MSDS.', lead:{ service:'Land freight', origin:'Dubai', destination:'Sohar', commodity:'Tiles', special_needs:'Import; dangerous goods', additional_info:'Customer asked for a quote' } }) });
  console.log('1', JSON.stringify(r.lead)); const dyn = r.full; 
  // 2. customer sends one file; AI identifies packing list; returns only that
  r = await run('c', { msg:{content:'[The customer sent a document (file id 1; type application/pdf; name pl.pdf)]', new_files:1}, chat:{stage:'collecting', history: r.full.history_json, lead_json: r.full.lead_json}, files:[{name:'pl.pdf', mime:'application/pdf', link:'https://d/1'}], answer: Object.assign({}, base, { reply:'Received.', lead:{documents_received:'packing list'} }) });
  console.log('2', JSON.stringify(r.lead));
  // 3. says no more docs -> summary
  r = await run('c', { msg:{content:'I dont have the others, please help'}, chat:{stage:'collecting', history: r.full.history_json, lead_json: r.full.lead_json}, answer: Object.assign({}, base, { reply:'Summary... Is everything correct? Tap *Yes, confirm*, or tell me what to change.', stage:'awaiting_confirmation', options:'confirm' }) });
  console.log('3', r.stage, r.kind, JSON.stringify(r.lead).slice(0,200));
  // 4. confirm
  const r4 = await run('c', { msg:{content:'Yes, confirm', type:'interactive'}, chat:{stage:'awaiting_confirmation', history: r.full.history_json, lead_json: r.full.lead_json}, answer: Object.assign({}, base, { reply:'Thanks, Ravi. Your enquiry reference is {REF}. Our sales team will be in touch by WhatsApp soon.', stage:'confirmed', confirmed_now:true }) });
  console.log('4', r4.handover, r4.reference, r4.reply, '\n  ', JSON.stringify(r4.lead));
  // 5. what the AI is told
  const b = await run('c', { msg:{content:'ok'}, chat:{stage:'collecting', history: r.full.history_json, lead_json: r.full.lead_json} });
  console.log('5', b.body.system[1].text.split('\n').slice(4).join('\n').slice(0,600)); console.log('schema required', b.body.output_config.format.schema.required.length, 'lead required', b.body.output_config.format.schema.properties.lead.required.length, 'max', b.body.max_tokens, 'sys blocks', b.body.system.length, 'static chars', b.body.system[0].text.length);
  // 6. no-doc service: FCL
  const r6 = await run('c', { msg:{content:'[The customer filled in the service form]\nService: Sea freight\nType of shipment: full container load (FCL)\nDangerous goods: No', type:'interactive'}, chat:{stage:'collecting', history:'[]', lead_json: JSON.stringify(known)}, answer: base });
  console.log('6', r6.lead.documents_needed, '|', r6.lead.documents_missing);
})();
