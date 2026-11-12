// lists every switch row in every card and sheet, both modes, and marks the ones with no tiny preview: node v8/sw.mjs
import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1180,height:820}});p.on('pageerror',e=>console.log('PE',e.message));
await p.goto('file:///'+D+'v8/toolbar-mock-v8.html');await p.waitForTimeout(600);
const out=await p.evaluate(async()=>{const out=new Set();const w=()=>new Promise(r=>setTimeout(r,160));
 const add=()=>document.querySelectorAll('[role=switch]').forEach(s=>{const c=s.closest(V8SURF);if(!c)return;const host=s.classList.contains('switch')?s.closest('.srow'):s;out.add(c.id+': '+v8SwLabel(s)+(host.querySelector('.v8pv,.ico')?'':'   <<< NO PREVIEW'))});
 for(const mode of ['pro','beg']){document.querySelector('[data-sh-mode='+mode+']').click();await w();
  for(const t of ['pen','text','eraser','shapes','lasso']){document.querySelector('#tb [data-id='+t+']').click();await w();if(t==='text'){select(document.querySelectorAll('.box')[1]);updateBoxBar()}
   for(const id of [...document.querySelectorAll('#opts [data-dd]')].map(x=>x.dataset.dd)){document.querySelector('[data-dd='+id+']').click();await w();add();
    for(const s of document.querySelectorAll('.pv.show [data-v7seg], .pv.show .ctab')){s.click();await w();add()}
    const tu=document.querySelector('#acard.show [data-v7=tune]');if(tu){tu.click();await w();add()}
    const fi=document.querySelector('#acard.show [data-a=fine]');if(fi){fi.click();await w();add()}
    closeCards();await w()}
   if(t==='text')deselect()}
  document.querySelector('#tb [data-id=pen]').click();await w();R.pen='Highlighter';renderOpts();document.querySelector('[data-dd=feel]').click();await w();add();for(const s of document.querySelectorAll('.pv.show [data-v7seg]')){s.click();await w();add()}
  {const f=document.querySelector('#acard [data-v7seg$=":feel"]');if(f){f.click();await w()}const tu=document.querySelector('#acard.show [data-v7=tune]');if(tu){tu.click();await w();add()}}
  closeCards();R.pen='Fountain';renderOpts();
  document.querySelector('#tb [data-id=more]').click();await w();add();closeCards();settingsSheet();await w();add();customiseSheet();await w();add();closeSheet()}
 return [...out].sort().join('\n')});
console.log(out);await b.close();
