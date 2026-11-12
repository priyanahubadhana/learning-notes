const fs=require('fs');const D=__dirname+'/';
const rep=(f,a,b)=>{let s=fs.readFileSync(D+f,'utf8');if(!s.includes(a))throw new Error(f+' miss '+a.slice(0,40));s=s.split(a).join(b);fs.writeFileSync(D+f,s)};
// a row with words only is a heading, not a control: it reads as a label, outside the wells
rep('v8a.js'," v8Wells(sheet,'.srow','v8well');"," $$('.srow',sheet).forEach(r=>{if(r.children.length===1&&r.firstElementChild.classList.contains('t')&&!r.querySelector('button,input,.prev'))r.classList.add('v8head')});\n v8Wells(sheet,'.srow:not(.v8head)','v8well');");
rep('v8.css',"#sheet.cardsheet .v8well{display:flex;","#sheet.cardsheet>.clab{padding:16px 6px 6px!important;font-size:12.5px!important;letter-spacing:0!important;text-transform:none!important;color:var(--ink-soft)!important}\n#sheet.cardsheet .srow.v8head{min-height:0;padding:16px 6px 6px}\n#sheet.cardsheet .srow.v8head b{font-size:12.5px;font-weight:600;color:var(--ink-soft)}\n#sheet.cardsheet .srow.v8head .muted{font-size:12px}\n#sheet.cardsheet .v8well{display:flex;");
console.log('ok');
