const fs=require('fs');const D=__dirname+'/';
const rep=(f,a,b)=>{let s=fs.readFileSync(D+f,'utf8');if(!s.includes(a))throw new Error(f+' miss '+a.slice(0,40));s=s.split(a).join(b);fs.writeFileSync(D+f,s)};
rep('v8c.js',"const ctMatch=t=>CTKEYS.every(","const ctMatch=t=>V.tab===ctTab(t)&&CTKEYS.every(");
rep('shots8.mjs',"await p.click('#opts .v8ct[data-ct=ct1]');await S('v4-use-toast',160);","console.log(tag,'ids',await p.evaluate(()=>ST.ct.list.map(t=>t.id+':'+t.name+':'+t.row).join(' | ')));await p.click('#opts .v8ct:has-text(\"Red ink\")');await S('v4-use-toast',160);");
rep('shots8.mjs',"await p.click('#opts .v8ct[data-ct=ct1]');await p.waitForTimeout(350);await S('v4-edit-sheet');","await p.click('#opts .v8ct:has-text(\"Red ink\")');await p.waitForTimeout(350);await S('v4-edit-sheet');");
rep('shots8.mjs',"ST.ct.list.find(t=>t.id==='ct1')","ST.ct.list.find(t=>t.name==='Red ink')");
console.log('ok');
