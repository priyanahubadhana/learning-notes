const fs=require('fs');const D=__dirname+'/';
const rep=(f,a,b)=>{let s=fs.readFileSync(D+f,'utf8');if(!s.includes(a))throw new Error(f+' miss '+a.slice(0,50));s=s.split(a).join(b);fs.writeFileSync(D+f,s)};
rep('v8c.js',",inRow=!!el.closest('#opts');",";");
rep('v8c.js',"const a=$(inRow?'#opts .v8ovf':'#tb .v8ovf')||el;","const a=[...document.querySelectorAll('#barbox .v8ovf')].find(x=>x.dataset.ids===ds.ids)||document.querySelector('#barbox .v8ovf')||el;");
console.log('ok');
