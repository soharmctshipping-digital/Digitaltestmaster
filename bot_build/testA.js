const { run } = require('./rig.js');
const ago = h => new Date(Date.now()-h*3600e3).toISOString();
const conf = { stage:'confirmed', reference:'SST-261118-ABCD', lead_json: JSON.stringify({name:'Vishnu K', preferred_contact:'WhatsApp', service:'Sea freight – FCL', origin:'Shanghai', destination:'Sohar Port'}), history: JSON.stringify([{role:'user',content:'x'},{role:'assistant',content:'y'}]), language:'en' };
const S = {
 'first Hi': { msg:{content:'Hi'} },
 'first Hi + text (AI)': { msg:{content:'Hi\nNeed rates for 2x40 from Shanghai'} },
 'New enquiry tap, new customer': { msg:{content:'New enquiry', type:'interactive'}, chat:{stage:'greeting', history: JSON.stringify([{role:'user',content:'Hi'},{role:'assistant',content:'Hello'}])} },
 'details form company': { msg:{content:'[The customer filled in their details]\nName: Ravi Kumar\nEnquiry for: A company: Acme LLC (their position: Manager)\nEmail: r@acme.com\nContact by: WhatsApp or call', type:'interactive'}, chat:{stage:'collecting', history:'[]'} },
 'details form individual': { msg:{content:'[The customer filled in their details]\nName: Sara\nEnquiry for: An individual\nContact by: call', type:'interactive'}, chat:{stage:'collecting', history:'[]'} },
 'details form + extra text (AI)': { msg:{content:'[The customer filled in their details]\nName: Sara\nContact by: call\nalso I need it urgently'}, chat:{stage:'collecting', history:'[]'} },
 'thanks 1h after confirm': { msg:{content:'Thank you'}, chat:Object.assign({last_message_at:ago(1)},conf) },
 'thanks 30h after confirm': { msg:{content:'Thanks'}, chat:Object.assign({last_message_at:ago(30)},conf) },
 'cancel 30h after confirm': { msg:{content:'Please cancel my enquiry'}, chat:Object.assign({last_message_at:ago(30)},conf), answer:{reply:'Cancelled SST-261118-ABCD. What was the issue?', language:'en', stage:'support', options:'', cancel_requested:true, lead:{}} },
 'typed new enquiry after confirm': { msg:{content:'I have a new enquiry'}, chat:Object.assign({last_message_at:ago(1)},conf) },
 'typed New enquiry during follow-up': { msg:{content:'New enquiry'}, chat:Object.assign({last_message_at:ago(0.1), menu_state:'followup', menu_at:ago(0.05)},conf) },
 'Hi 7 min into follow-up': { msg:{content:'Hi'}, chat:Object.assign({last_message_at:ago(7/60), menu_state:'followup', menu_at:ago(0.05)},conf) },
 'Hi 2 min into follow-up': { msg:{content:'Hi'}, chat:Object.assign({last_message_at:ago(2/60), menu_state:'followup', menu_at:ago(0.02)},conf) },
 'any update? in follow-up': { msg:{content:'any update?'}, chat:Object.assign({last_message_at:ago(1), menu_state:'followup', menu_at:ago(0.5)},conf) },
 'Ok/Bye after confirm': { msg:{content:'Ok\nBye'}, chat:Object.assign({last_message_at:ago(0.01)},conf) },
};
(async()=>{ for (const pre of ['orig','new']) { console.log('\n######## '+pre); for (const k of Object.keys(S)) { let r; try { r = await run(pre, S[k]); } catch(e){ r={error:e.message}; } delete r.full; delete r.body; console.log('- '+k+': '+JSON.stringify(r).slice(0,420)); } } })();
