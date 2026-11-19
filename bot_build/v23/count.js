const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
const out=new Function(src)();
const flow=JSON.parse(out[0].json.flow_json);
const cnt=(ch)=>ch.reduce((a,c)=>a+1+(c.type==='If'?cnt(c.then):0),0);
const leaf=(ch)=>ch.reduce((a,c)=>a+(c.type==='If'?leaf(c.then):1),0);
console.log(out[0].json.name, 'bytes', out[0].json.flow_json.length);
for(const s of flow.screens) console.log(s.id,'all nodes',cnt(s.layout.children),'leaf',leaf(s.layout.children));
