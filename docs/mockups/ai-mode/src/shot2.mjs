import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/';
const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:400,height:860}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///'+D+'ai-mode-mock.html');await p.waitForTimeout(300);await p.click('[data-a=demo][data-v=ok]');
await p.click('[data-a=bex][data-i="0"]');await p.click('[data-a=mkplan]');await p.waitForTimeout(200);await p.click('[data-a=brun]');await p.waitForSelector('.pv',{timeout:15000});await p.click('[data-a=bapply]');await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('.saved').scrollIntoView({block:'center'}));await p.screenshot({path:D+'aiv4-done-400x860.png'});
console.log('recs',await p.evaluate(()=>DB.recs.length),'overflow',await p.evaluate(()=>document.querySelector('#main').scrollWidth>document.querySelector('#main').clientWidth),errs);await b.close();
