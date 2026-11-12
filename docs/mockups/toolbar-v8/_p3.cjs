const fs=require('fs');const D=__dirname+'/';
let c=fs.readFileSync(D+'v8.css','utf8');const a=".lm2{max-width:min(92vw,400px,calc(100% - 8px))}\n";if(!c.includes(a))throw new Error('css');c=c.split(a).join('');fs.writeFileSync(D+'v8.css',c);
let s=fs.readFileSync(D+'v8b.js','utf8');const b="m=ic?[0,()=>'']:V8MINI.find(x=>x[0].test(lab));if(!m)return;";if(!s.includes(b))throw new Error('js');
s=s.split(b).join("m=ic?[0,()=>'']:V8MINI.find(x=>x[0].test(lab)&&(x[0].source[0]!=='^'||!/ink|pictures|text/.test(x[0].source)||s.closest('#lcard')));if(!m)return;");fs.writeFileSync(D+'v8b.js',s);console.log('ok');
