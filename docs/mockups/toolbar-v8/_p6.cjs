const fs=require('fs');const D=__dirname+'/';
const rep=(f,a,b)=>{let s=fs.readFileSync(D+f,'utf8');if(!s.includes(a))throw new Error(f+' miss '+a.slice(0,40));s=s.split(a).join(b);fs.writeFileSync(D+f,s)};
rep('shots8.mjs',"await p.click('#opts .v8ct:has-text(\"Red ink\")');await S('v4-use-toast',160);","if(await p.locator('#opts .v8ct:has-text(\"Red ink\")').count())await p.click('#opts .v8ct:has-text(\"Red ink\")');else await ev(()=>ctUse('ct1'));await S('v4-use-toast',160);");
rep('shots8.mjs',"await p.click('#opts .v8ct:has-text(\"Red ink\")');await p.waitForTimeout(350);await S('v4-edit-sheet');","await ev(()=>ctEdit('ct1'));await p.waitForTimeout(350);await S('v4-edit-sheet');");
console.log('ok');
