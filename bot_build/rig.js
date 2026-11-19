const fs = require('fs'); const { DateTime } = require('luxon');
const AF = Object.getPrototypeOf(async function(){}).constructor;
function load(f){ return new AF('$input','$','DateTime','$getWorkflowStaticData', fs.readFileSync(f,'utf8')); }
const node = (items, executed=true) => ({ all: () => items.map(j=>({json:j})), first: () => ({json: items[0]}), isExecuted: executed });
async function run(prefix, sc) {
  const build = load(prefix+'_Build_Claude_request.js'), read = load(prefix+'_Read_Claude_answer.js');
  const nodes = {
    'Combine messages': node([Object.assign({ phone:'96800000001', name:'Tester', message_id:'m1', type:'text', received_at:new Date().toISOString(), new_files:0 }, sc.msg)]),
    'Load chat': node(sc.chat ? [Object.assign({phone:'96800000001'}, sc.chat)] : []),
    'Read FAQ': node([{question:'Q1',answer:'A1','approved (Y/N)':'Y'}]),
    'Read holidays': node([]),
    'Read sales team': node([{name:'Ron',whatsapp:'96899999999',active:'Y',role:'Sales'}]),
    'Collect files': node([{files: sc.files||[]}], Boolean(sc.files)),
  };
  const $ = n => { if(!nodes[n]) throw new Error('no node '+n); return nodes[n]; };
  const b = await build(node([]), $, DateTime, ()=>({}));
  const bj = b[0].json;
  if (bj.route !== 'claude') return { route: bj.route, text: bj.text, reason: bj.reason, menu_update: bj.menu_update, forward_text: bj.forward_text };
  nodes['Build Claude request'] = node([bj]);
  let input;
  if (bj.canned) input = node((await load(prefix+'_Fixed_reply_as_answer.js')(node([]), $, DateTime, ()=>({}))).map(x=>x.json));
  else if (sc.answer) input = node([{ content:[{type:'text', text: JSON.stringify(sc.answer)}] }]);
  else return { route:'claude', needsAI:true, content: bj.customer_text, prev_stage: bj.prev_stage, lead: bj.prev_lead, body: bj.body };
  let r = (await read(input, $, DateTime, ()=>({})))[0].json;
  if (prefix==='final') { nodes['Read Claude answer'] = node([r]); nodes['Check for newer messages'] = node([]); r = (await load('final_Still_the_newest.js')(node([]), $, DateTime, ()=>({})))[0].json; }
  return { route:'claude', canned: Boolean(bj.canned), reply:r.reply, stage:r.stage, lead:r.lead, kind: r.interactive && r.interactive.interactive.type, flow: r.interactive && r.interactive.interactive.action && r.interactive.interactive.action.parameters && r.interactive.interactive.action.parameters.flow_cta, reference:r.reference, handover:r.trigger_handover, support:r.trigger_support, full:r };
}
module.exports = { run };
