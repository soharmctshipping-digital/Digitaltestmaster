const { run } = require('./rig.js');
const S = {
 'first Hi': { msg:{content:'Hi'} },
 'tap Job enquiry': { msg:{content:'Job enquiry', type:'interactive'}, chat:{stage:'greeting', history: JSON.stringify([{role:'user',content:'Hi'},{role:'assistant',content:'Hello'}])} },
 'typed vacancies': { msg:{content:'Vacancies?'}, chat:{stage:'greeting', history: JSON.stringify([{role:'user',content:'Hi'},{role:'assistant',content:'Hello'}])} },
 'typed long job question (AI)': { msg:{content:'Do you have any openings for a documentation clerk?'} },
 'tap New enquiry': { msg:{content:'New enquiry', type:'interactive'}, chat:{stage:'greeting', history: JSON.stringify([{role:'user',content:'Hi'},{role:'assistant',content:'Hello'}])} },
 'AI job answer passes the guard': { msg:{content:'any jobs available for drivers?'}, answer:{reply:'Thank you for your interest in joining Sohar Shipping. Please visit the careers page on our website to see the vacancies currently open and to apply: https://www.soharshipping.com/career\nIf you would like to ask about a job, you can also call our office on +968 249 55 777.', language:'en', stage:'faq', options:'', lead:{}} },
};
(async()=>{ for (const k of Object.keys(S)) { let r; try { r = await run('e', S[k]); } catch(e){ r={error:e.message}; } const f=r.full; delete r.full; delete r.body; console.log('- '+k+': '+JSON.stringify(r).slice(0,520)); if (f && f.interactive) console.log('    interactive:', JSON.stringify(f.interactive.interactive).slice(0,420), '| guard:', f.guard); else if (f) console.log('    guard:', JSON.stringify(f.guard), 'stage', f.stage); } })();
