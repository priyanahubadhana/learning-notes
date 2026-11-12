import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/';
const b=await chromium.launch();const errs=[];let fails=0;
const ok=(c,l)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+l)};
for(const [w,h] of [[1180,820],[820,1180],[400,860]]){
 const tag=w+'x'+h,ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
 p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(tag+' '+m.text())});p.on('pageerror',e=>errs.push(tag+' '+e.message));
 const shot=n=>p.screenshot({path:D+`aiv4-${n}-${tag}.png`});
 const fit=async l=>{const r=await p.evaluate(()=>({s:document.scrollingElement.scrollWidth,w:innerWidth,m:document.querySelector('#main').scrollWidth,mc:document.querySelector('#main').clientWidth}));ok(!(r.s>r.w||r.m>r.mc),tag+' no sideways scroll: '+l)};
 const ev=f=>p.evaluate(f);
 await p.goto('file:///'+D+'ai-mode-mock.html');await p.waitForTimeout(400);
 /* Build: plan, validation, fix */
 await p.click('[data-a=bex][data-i="0"]');await p.click('[data-a=mkplan]');await p.waitForTimeout(350);
 ok(await ev(()=>document.querySelectorAll('.pr').length)===7,tag+' plan has 7 steps');
 ok(await ev(()=>!document.querySelector('.sh-toast.on')),tag+' no toast over the plan title (A2)');
 ok(await ev(()=>!!document.querySelector('.vsum.ok')&&!document.querySelector('[data-a=brun]').disabled),tag+' valid plan can run');
 await fit('plan');await shot('plan');
 /* untick the notebook step: dependants unticked; then remove notes page → error + fix */
 await p.click('.pr:nth-child(2) [data-a=prm]');await p.waitForTimeout(150);
 ok(await ev(()=>document.querySelectorAll('.pr.bad').length>0&&document.querySelector('[data-a=brun]').disabled),tag+' removing "Write notes page" blocks Run with errors');
 await ev(()=>document.querySelector('#main').scrollTop=0);await shot('invalid');
 await p.click('[data-a=pfix] >> nth=0');await p.waitForTimeout(150);
 ok(await ev(()=>!document.querySelector('.pr.bad')&&!document.querySelector('[data-a=brun]').disabled),tag+' one-tap fix makes the plan valid');
 await p.click('[data-sh-hist=undo]');await p.click('[data-sh-hist=undo]');await p.waitForTimeout(100);
 ok(await ev(()=>document.querySelectorAll('.pr').length)===7&&await ev(()=>!document.querySelector('.pr.bad')),tag+' undo restores the plan');
 /* run with a failing step */
 await ev(()=>document.querySelector('[data-a=brun]').scrollIntoView({block:'center'}));await shot('runbar');
 const nb0=await ev(()=>DB.nbs.length);
 await p.click('[data-a=brun]');await p.waitForTimeout(2900);
 ok(await ev(()=>!!document.querySelector('.jst li.retry, .jst li.run')),tag+' auto retry in progress');await shot('retrying');
 await p.waitForSelector('.jst li.fail',{timeout:9000});
 ok(await ev(()=>!!document.querySelector('[data-a=jretry]')&&!!document.querySelector('[data-a=jskip]')),tag+' failed step shows Retry and Skip');
 ok(await ev(()=>DB.recs.length===0&&DB.nbs.length)===nb0,tag+' nothing written while failed');
 await ev(()=>document.querySelector('.jst li.fail').scrollIntoView({block:'center'}));await fit('failed');await shot('failed');
 await p.click('[data-a=jskip]');await p.waitForSelector('.pv',{timeout:9000});await p.waitForTimeout(250);
 ok(await ev(()=>S.B.job.steps.filter(s=>s.state==='skip').length===1&&S.B.job.state==='preview'),tag+' skip → preview without that step');
 ok(await ev(()=>![...document.querySelectorAll('.mtabs button')].some(b=>b.textContent==='Mind map')),tag+' preview has no Mind map tab after skip');
 await p.click('[data-a=bedit]');await p.waitForTimeout(100);
 /* run again: retry path */
 await p.click('[data-a=brun]');await p.waitForSelector('.jst li.fail',{timeout:12000});
 await p.click('[data-a=jretry]');await p.waitForSelector('.pv',{timeout:9000});await p.waitForTimeout(250);
 ok(await ev(()=>S.B.job.steps.every(s=>s.state==='done')),tag+' Retry → every step done');
 await ev(()=>document.querySelector('#main').scrollTop=0);await fit('preview');await shot('preview');
 await p.click('[data-a=bapply]');await p.waitForTimeout(250);
 ok(await ev(()=>DB.recs.length===7&&DB.nbs.length)===nb0+1,tag+' Apply wrote 7 records + 1 notebook in one go');
 await ev(()=>{const j=S.B.job;j.applied=false;Engine.commit(j);});ok(await ev(()=>DB.recs.length)===7,tag+' applying twice makes no copies (idempotent)');
 await ev(()=>document.querySelector('#main').scrollTop=0);await fit('done');await shot('done');
 await p.click('[data-a=bundo]');await p.waitForTimeout(200);
 ok(await ev(()=>DB.recs.length===0&&DB.nbs.length)===nb0&&await ev(()=>S.B.stage==='preview'),tag+' Undo restored everything');
 await p.click('[data-sh-hist=redo]');await p.waitForTimeout(150);ok(await ev(()=>DB.recs.length)===7,tag+' Redo re-applied');
 /* Activity: steps + undo from there */
 await p.click('[data-sh-pt=activity]');await p.waitForTimeout(150);await p.click('.al li:first-child [data-a=open]');await p.waitForTimeout(100);await fit('activity');await shot('activity');
 await p.click('.al li:first-child [data-a=actundo]');await p.waitForTimeout(150);ok(await ev(()=>DB.recs.length)===0,tag+' Undo from Activity');
 await p.click('.al li:first-child [data-a=actundo]');await p.waitForTimeout(150);ok(await ev(()=>DB.recs.length)===7,tag+' Redo from Activity');
 await p.waitForTimeout(2700);
 /* offline */
 await p.click('[data-sh-pt=build]');await p.click('[data-a=bnew]');await p.click('[data-a=bex][data-i="2"]');await p.click('[data-a=mkplan]');await p.waitForTimeout(200);
 await p.click('[data-a=demo][data-v=off]');await p.click('[data-a=brun]');await p.waitForTimeout(300);
 ok(await ev(()=>S.B.job.state==='offline'&&!!document.querySelector('.attn.off')),tag+' offline: job waits');await ev(()=>document.querySelector('#main').scrollTop=0);await shot('offline');
 await p.click('[data-a=demo][data-v=ok]');await p.waitForSelector('.pv',{timeout:12000});ok(true,tag+' back online: job ran to preview');
 await p.click('[data-a=bdiscard]');await p.waitForTimeout(3000);
 /* Studio multi-select (A3) */
 await p.click('[data-sh-pt=ask]');await p.waitForTimeout(150);
 if(w<=960){await p.click('[data-a=pane][data-v=studio]');await p.waitForTimeout(100)}
 for(const k of ['notes','map','cards'])await p.click(`[data-a=stsel][data-k=${k}]`);
 await p.waitForTimeout(350);await fit('studio');await shot('studio');
 await p.click('[data-a=stdest][data-v=nb]');await p.waitForTimeout(100);ok(await ev(()=>!!document.querySelector('#stnb')&&!!document.querySelector('#stsec')),tag+' Studio: existing notebook + section picker');
 await p.selectOption('#stsec','Videos');await p.waitForTimeout(100);
 await p.click('[data-a=mksel]');await p.waitForTimeout(350);
 ok(await ev(()=>S.tab==='build'&&S.B.plan.map(s=>s.t).join()==='pg_add,map_new,cards_new'&&S.B.dest.kind==='nb'),tag+' Make selected → one plan of catalog steps in Build');
 ok(await ev(()=>[...document.querySelectorAll('.plc')].map(e=>e.textContent).join('|')==='Habits and focus › Videos › Notes tab|Habits and focus › Videos › Mind map tab|Habits and focus › Videos › Cards deck'),tag+' placement per output');
 await ev(()=>document.querySelector('#main').scrollTop=0);await fit('studio plan');await shot('studio-plan');
 /* Jobs (A1) */
 await p.click('[data-sh-pt=jobs]');await p.waitForTimeout(150);await fit('jobs');
 await ev(()=>document.querySelector('.runbar.jr').scrollIntoView({block:'center'}));
 const ov=await ev(()=>{const k=[...document.querySelectorAll('.runbar.jr .path,.runbar.jr .chip,.runbar.jr .est,.runbar.jr .btn.pri,.sw-row.rem .g,.sw-row.rem .sw')].map(e=>e.getBoundingClientRect());for(let i=0;i<k.length;i++)for(let j=i+1;j<k.length;j++){const a=k[i],c=k[j];if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1)return[i,j]}return null});
 ok(!ov,tag+' Jobs run row: nothing overlaps (A1) '+JSON.stringify(ov));await shot('jobs');
 /* Workflows (A4) */
 await p.click('[data-sh-pt=workflows]');await p.waitForTimeout(150);
 ok(/8 workflows/.test(await p.textContent('.cnt')),tag+' count 8');
 await p.click('[data-a=wtags]');await p.waitForTimeout(250);await p.click('#fpop input[data-v=video]');await p.click('#fpop input[data-v=notes]');await p.waitForTimeout(100);
 ok(/3 of 8/.test(await p.textContent('.cnt')),tag+' tags Any: 3 of 8 '+await p.textContent('.cnt'));await shot('wf-tags');
 await p.click('#fpop [data-a=tmode][data-v=all]');await p.waitForTimeout(100);ok(/1 of 8/.test(await p.textContent('.cnt')),tag+' tags All: 1 of 8');
 await p.click('#fpop .ff [data-a=fpx]');await p.click('[data-a=wclear]');await p.waitForTimeout(100);
 await p.click('[data-a=wmore]');await p.click('[data-a=wjt][data-v=Video]');await p.click('[data-a=wstar][data-v="4"]');await p.waitForTimeout(100);
 ok(/2 of 8/.test(await p.textContent('.cnt'))&&await ev(()=>!!document.querySelector('.tag.v.on')),tag+' More filters: 2 of 8 and it matches the saved view');
 await p.fill('#wq','cards');await p.waitForTimeout(150);ok(/1 of 8/.test(await p.textContent('.cnt')),tag+' search narrows: 1 of 8');
 ok(await ev(()=>!!document.querySelector('[data-a=wsave]')),tag+' Save this view offered');
 await ev(()=>document.querySelector('#main').scrollTop=0);await fit('workflows');await shot('workflows');
 await p.click('[data-a=wclear]');await p.click('[data-a=wsort]');await p.waitForTimeout(200);await p.click('[data-a=sortpick][data-v=used]');await p.waitForTimeout(100);
 ok((await p.textContent('.rr:not(.hd) .nm b'))==='Video to notes with frames',tag+' sort Most used');
 /* catalog details */
 await p.click('[data-sh-pt=build]');await p.click('[data-a=bedit]').catch(()=>{});await p.click('[data-a=padd]');await p.waitForTimeout(150);await p.click('[data-k=tdcards_new]');await p.waitForTimeout(100);
 await ev(()=>document.querySelector('.tdet').scrollIntoView({block:'center'}));await fit('catalog');await shot('catalog');
 /* quick panel through the engine */
 await p.click('[data-a=cback] >> nth=0');await p.click('[data-sh-ai]');await p.waitForTimeout(250);await p.click('[data-a=qchip][data-i="3"]');await p.waitForTimeout(150);
 const r0=await ev(()=>DB.recs.length);await p.click('[data-a=qrun]');await p.waitForTimeout(1500);
 ok(await ev(()=>QP.stage==='done'&&DB.recs.length)===r0+1,tag+' quick panel: runs through the engine and saves');await shot('quick');
 await p.click('[data-a=qundo]');await p.waitForTimeout(150);ok(await ev(()=>DB.recs.length)===r0,tag+' quick panel Undo');
 await ctx.close();
}
console.log('console errors/warnings:',errs.length,errs.slice(0,8));console.log(fails?'FAILS: '+fails:'ALL PASS');
await b.close();
