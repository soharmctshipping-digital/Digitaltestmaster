const fs=require('fs');
let src=fs.readFileSync('testF.js','utf8'); src=src.slice(0,src.indexOf('const cases'));
eval(src.replace("const fs = require('fs');",''));
const T={commodity:'Office furniture',qty:'2',weight:'18000',dims:'120 x 80 x 100',volume:'14',origin:'Dubai',destination:'Muscat',supplier_name:'Al Noor Trading',supplier_address:'Jebel Ali Free Zone, Dubai, UAE',supplier_contact:'',delivery_address:'Al Khuwair, Muscat',pickup_address:'Sohar Industrial Estate, Sohar',make:'Toyota Hilux 2025',temp:'+4',duration:'6 months',lease:'6 months',vessel_name:'MV Test Star',vessel_imo:'9123456',port_other:'Shinas',oog:'9.2 x 2.9 x 3.7',heavy:'12',far_port:'Busan',areas:'Muscat and Sohar',notes:''};
const realistic=p=>{for(const k of Object.keys(p)){const v=p[k];if(typeof v==='string'&&v.startsWith('sample ')){const base=k.replace(/_(sea|air|land|customs|transit|project|warehousing|containers|agency|fcl|lcl|bulk|roro)$/,'').replace(/^delivery_address_(air|road)$/,'delivery_address');p[k]=T[base]!==undefined?T[base]:(T[base.split('_')[0]]||'Test value');}if(/^ready_|^eta_/.test(k))p[k]='2026-12-10';}return p;};
const cases=[
 ['sea',{direction_sea:'export',far_region:'east',far_sea_east:'Shanghai, China',sea_type:'fcl',freedays_fcl:'yes',freedays_n_fcl:'7'}],
 ['air',{direction_air:'import',origin_air:'Frankfurt',exhibition_air:'yes',terms_air:'FCA'}],
 ['land',{direction_land:'export',terms_land:'FCA'}],
 ['customs',{via_customs:'road',point_road_customs:'wajajah',equip_customs:'breakbulk',trucks_customs:'3',size_customs:'none',value_customs:'25000'}],
 ['transit',{equip_transit:'containers',return_transit:'jebel_ali',value_transit:'450000',consignee_transit:'no',origin_transit:'Jebel Ali, UAE',destination_transit:'Riyadh, Saudi Arabia'}],
 ['project',{direction_project:'import',terms_project:'FOB',shipas_project:'flatrack',crane_project:'yes',volume_project:'85',origin_project:'Hamburg, Germany',destination_project:'Duqm'}],
 ['warehousing',{arrive_warehousing:'loose',areas_warehousing:'Muscat and Sohar'}],
 ['containers',{action_containers:'lease',condition_containers:'used'}],
 ['agency',{vessel_size_agency:'Bulk carrier 32,000 GRT',days_agency:'3',crew_agency:'2 joining, 2 leaving'}]];
const out=cases.map(([s,c],i)=>{const p=realistic(fill(s,c));
 // leak probe: a stray answer from another service, as an old form could send
 p[s==='sea'?'commodity_air':'commodity_fcl']='LEAK SHOULD NOT APPEAR';
 const phone='99999000724'+i, ts=String(Math.floor(Date.now()/1000));
 const det={name:'Test '+s,customer_type:'company',company:'Test Co '+s,email:'test@example.com',contact:['whatsapp']};
 const m=(id,rj,t)=>({from:phone,id:'wamid.v24test'+i+id,timestamp:t,type:'interactive',interactive:{type:'nfm_reply',nfm_reply:{name:'flow',body:'Sent',response_json:JSON.stringify(rj)}}});
 return {svc:s,phone,body:{object:'whatsapp_business_account',entry:[{id:'4774852509502622',changes:[{field:'messages',value:{messaging_product:'whatsapp',metadata:{display_phone_number:'x',phone_number_id:'1451398948053197'},contacts:[{wa_id:phone,profile:{name:'Test '+s}}],messages:[m('a',det,ts),m('b',p,ts)]}}]}]}};});
fs.writeFileSync('live24.json',JSON.stringify(out));
out.forEach(o=>console.log(o.svc,o.phone,JSON.stringify(o.body).length));
