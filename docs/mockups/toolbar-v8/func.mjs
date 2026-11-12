// Functional checks for toolbar-mock-v7: node v7/func.mjs   (prints PASS/FAIL per check)
// Same checks as v5, moved to the new homes (open the ▾, then find the control) + the new layout rules.
import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/';
const URL='file:///'+D+'v8/toolbar-mock-v8.html';
const b=await chromium.launch();const errs=[];let pass=0,fail=0;
const ok=(n,c,x='')=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x)}};
async function open(w,h,pre){const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(['error','warning'].includes(m.type())&&!/fonts|ERR_/.test(m.text()))errs.push(m.type()+' '+m.text())});
 if(pre)await p.addInitScript(pre);await p.goto(URL);await p.waitForTimeout(450);return p}
const vis=(p,sel)=>p.locator(sel).evaluateAll(es=>es.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').length);
const noScroll=async(p,n)=>{const r=await p.evaluate(()=>({sh:document.documentElement.scrollHeight,ih:innerHeight,bw:document.documentElement.scrollWidth,iw:innerWidth}));ok('no page scroll: '+n,r.sh===r.ih&&r.bw<=r.iw,JSON.stringify(r))};
const wait=n=>new Promise(r=>setTimeout(r,n));
const dd=async(p,id)=>{await p.click('[data-dd='+id+']');await p.waitForTimeout(300)};
const tool=async(p,id)=>{await p.click('#tb [data-id='+id+']');await p.waitForTimeout(220)};
const menuPick=async(p,id,name)=>{await dd(p,id);await p.evaluate(n=>{[...document.querySelectorAll('#more .mrow2')].find(x=>x.textContent.trim()===n).click()},name);await p.waitForTimeout(200)};

for(const [W,H] of [[1180,820],[400,800]]){
 console.log('---- viewport',W,H);
 // stale Professional state from another mock must not leak: fresh load is Beginner
 let p=await open(W,H,"try{localStorage.setItem('ln-shell-v1',JSON.stringify({mode:'pro',min:{}}))}catch(e){}");
 ok(W+' fresh load is Beginner (data-mode)',await p.evaluate(()=>document.getElementById('app').dataset.mode)==='beg');
 ok(W+' Beginner button is on',await p.evaluate(()=>document.querySelector('[data-sh-mode=beg]').classList.contains('on')));
 ok(W+' layout is beginner, new storage key',await p.evaluate(()=>ST.cur==='beginner'&&localStorage.getItem('tbmock.v4')===null));
 ok(W+' Night theme default',await p.evaluate(()=>document.documentElement.dataset.theme==='dark'));
 ok(W+' Undo and Redo are in the main bar (once)',await vis(p,'#tb .hist .ic')===2&&await vis(p,'#sh-top .hist .ic')===0);
 ok(W+' main bar = Text Pen Eraser Shapes Lasso Insert, Undo Redo More, ONE minimise',await p.evaluate(()=>[...document.querySelectorAll('#tb button')].map(x=>x.getAttribute('aria-label')).join(',')==='Text,Pen,Eraser,Shapes,Lasso,Insert,Undo,Redo,More,Minimise'));
 ok(W+' no category row, no map banner, no layout switch, no grip',await vis(p,'#all')===0&&await p.locator('#pmap').count()===0&&await p.locator('#layBtn').count()===0&&await p.locator('.pgrip').count()===0);
 await noScroll(p,'default');
 // ---- Beginner Feel card (was: Beginner Pen card)
 await dd(p,'feel');
 ok(W+' Beginner Feel card is open',await vis(p,'#acard.bpen')===1&&(await p.textContent('#acard .ch strong')).trim()==='Feel');
 ok(W+' preview svg present',await vis(p,'#acard #bpPrev #bpStroke')===1);
 await p.evaluate(()=>closeCards());
 await dd(p,'pentype');
 ok(W+' 6 labelled pen types in Pen ▾',await p.locator('#more .mrow2').evaluateAll(t=>t.length===6&&t.every(x=>x.textContent.trim().length>2)));
 await p.evaluate(()=>closeCards());
 await dd(p,'feel');
 ok(W+' Pressure + Stabilisation sliders',await p.locator('#acard input[data-r=press]').count()===1&&await p.locator('#acard input[data-r=smooth]').count()===1);
 ok(W+' Page style lives here (Feel) and only here',await p.locator('#acard [data-v7=paper]').count()===4&&await p.locator('#morecard [data-z=paper]').count()===0);
 ok(W+' Settings list: Pen settings, Writing aids, Math assist',await p.locator('#acard [data-v7seg],#acard [data-v7=tune]').evaluateAll(r=>r.map(x=>x.getAttribute('aria-label')).join('|')).then(t=>/Pen settings/.test(t)&&/Writing aids/.test(t)&&/Math assist/.test(t)));
 const d0=await p.getAttribute('#bpStroke','d');
 await p.evaluate(()=>{const r=document.querySelector('#acard input[data-r=smooth]');r.value=0;r.dispatchEvent(new Event('input',{bubbles:true}))});
 const d1=await p.getAttribute('#bpStroke','d');ok(W+' preview path changes with Stabilisation',d0!==d1);
 await p.evaluate(()=>{const r=document.querySelector('#acard input[data-r=press]');r.value=95;r.dispatchEvent(new Event('input',{bubbles:true}))});
 const d2=await p.getAttribute('#bpStroke','d');ok(W+' preview path changes with Pressure',d2!==d1);
 const d3=await p.getAttribute('#bpStroke','d');await p.evaluate(()=>closeCards());await menuPick(p,'pentype','Marker');await dd(p,'feel');
 ok(W+' preview follows pen type',(await p.getAttribute('#bpStroke','d'))!==d3||(await p.getAttribute('#bpStroke','stroke-linecap'))!==null);
 await noScroll(p,'beginner feel card');
 for(const [row,title] of [['Pen settings','pen'],['Writing aids','aids'],['Math assist','math']]){
  if(title==='pen'){await p.click('#acard [data-v7=tune]');await p.waitForTimeout(250);ok(W+' row opens pane: '+row,await p.getAttribute('#acard [data-v7=tune]','aria-label')===row&&await p.getAttribute('#acard [data-v7=tune]','aria-expanded')==='true'&&await p.locator('#acard input[data-r=exact]').count()===1);await p.click('#acard [data-v7=tune]');await p.waitForTimeout(200);continue}
  await p.click('#acard [data-v7seg="feel:'+title+'"]');await p.waitForTimeout(300);
  ok(W+' row opens pane: '+row,await p.getAttribute('#acard [data-v7seg].on','aria-label')===row&&await vis(p,'#acard .v7pane.on[data-pane='+title+']')===1);
  await p.click('#acard [data-v7seg="feel:feel"]');await p.waitForTimeout(250)}
 await p.evaluate(()=>closeCards());
 // ---- Draw shape (Shapes row): Shape ▾ + Math assist switches
 await tool(p,'shapes');
 ok(W+' Shapes row: Shape, Size, Colour',await p.locator('#opts .v6b').evaluateAll(x=>x.map(y=>y.dataset.dd).join(','))==='shape,size,colour');
 await dd(p,'shape');ok(W+' Shape ▾ has 5 beginner shapes',await p.locator('#more .mrow2').count()===5);await p.evaluate(()=>closeCards());
 await menuPick(p,'shape','Circle');ok(W+' picking a shape sets the pen',await p.evaluate(()=>PN.shape==='oval'));
 await tool(p,'pen');await dd(p,'feel');await p.click('#acard [data-v7seg="feel:math"]');await p.waitForTimeout(300);
 ok(W+' Math assist: 3 shape switches + Ruler + Magnifier',await vis(p,'#acard [role=switch]')===5);
 await p.click('#acard [data-o=pn][data-k=hold]');ok(W+' main switch toggles',await p.evaluate(()=>PN.hold===true));
 await noScroll(p,'math assist');
 await p.evaluate(()=>closeCards());
 // ---- Elements (Insert ▾ > Elements)
 await dd(p,'insert');
 ok(W+' Beginner Insert ▾ has the everyday items only',await p.locator('#acard .tile').count()===9);
 await p.click('#acard [data-v=elements]');await p.waitForTimeout(300);
 ok(W+' Elements card opens from Insert',await vis(p,'#elcard')===1);
 const tabs=await p.locator('#elcard .ctab').allTextContents();ok(W+' category tabs',tabs.join(',')==='Recent,Study,Arrows,Emoji,Badges,GIFs,Mine',tabs.join(','));
 ok(W+' tabs have a thin track',await p.locator('#elcard .ctabs + .track').count()===1);
 const t1=await p.locator('#elcard .eltile .elname').allTextContents();
 await p.click('#elcard .ctab[data-cat=Arrows]');await p.waitForTimeout(150);
 const t2=await p.locator('#elcard .eltile .elname').allTextContents();ok(W+' category switch works',t2.length>0&&t2.join()!==t1.join()&&/Arrow right/.test(t2.join()),t2.join());
 await p.click('#elcard .ctab[data-cat=GIFs]');await p.waitForTimeout(150);ok(W+' GIFs are animated',await p.evaluate(()=>[...document.querySelectorAll('#elcard .eltile .elprev *')].some(e=>getComputedStyle(e).animationName!=='none')));
 await p.fill('#elQ','heart');await p.waitForTimeout(150);
 ok(W+' search finds Beating heart',(await p.locator('#elcard .eltile .elname').allTextContents()).includes('Beating heart'));
 ok(W+' search clear (x) shown',await vis(p,'#elClr')===1);
 await p.click('#elClr');await p.waitForTimeout(150);ok(W+' clear empties the search',await p.inputValue('#elQ')===''&&await vis(p,'#elClr')===0);
 const nb=await p.locator('.box').count();
 await p.click('#elcard .ctab[data-cat=Study]');await p.click('#elcard .eltile[aria-label="Big idea"]');await p.waitForTimeout(200);
 ok(W+' tap inserts an element on the page',await p.locator('.box .pic.el').count()===1&&await p.locator('.box').count()===nb+1);
 ok(W+' inserted element is a draggable box',await p.evaluate(()=>{const b=document.querySelector('.box:has(.pic.el)');return !!b.querySelector('.tab')&&getComputedStyle(b).position==='absolute'}));
 await p.evaluate(()=>{R.optsOn=true});await dd(p,'insert');await p.click('#acard [data-v=elements]');await p.waitForTimeout(300);
 await p.click('#elcard .ctab[data-cat=Recent]');await p.waitForTimeout(150);
 ok(W+' Recent tab shows it',(await p.locator('#elcard .eltile .elname').allTextContents())[0]==='Big idea');
 // edit mode
 await p.click('#elcard .ctab[data-cat=Study]');await p.click('#elcard [data-el=edit]');await p.waitForTimeout(150);
 ok(W+' Edit shows rows with move, rename, delete',await p.locator('#elcard .elrow').count()>=8&&await p.locator('#elcard .elrow [data-el=del]').count()>=8&&await p.locator('#elcard .elrow [data-el=ren]').count()>=8);
 ok(W+' Edit has Add your own',await vis(p,'#elcard [data-el=add]')===1);
 ok(W+' delete button is danger red',await p.evaluate(()=>{const c=getComputedStyle(document.querySelector('#elcard .elrow .sq.dz')).color;return c!==getComputedStyle(document.querySelector('#elcard .elrow .sq')).color}));
 const n0=await p.locator('#elcard .elrow').count();
 await p.click('#elcard .elrow:nth-child(2) [data-el=up]');await p.waitForTimeout(100);
 ok(W+' reorder moves a row',(await p.locator('#elcard .elrow .elname').first().textContent())==='Warning');
 await p.click('#elcard .elrow:first-child [data-el=del]');await p.waitForTimeout(200);
 ok(W+' delete removes and shows Undo toast',await p.locator('#elcard .elrow').count()===n0-1&&await vis(p,'#toast.show .tact')===1);
 await p.click('#toast .tact');await p.waitForTimeout(150);ok(W+' Undo brings it back',await p.locator('#elcard .elrow').count()===n0);
 await p.click('#elcard .elrow:first-child [data-el=ren]');await p.waitForTimeout(200);
 await p.fill('#sh-ask','Lamp');await p.click('#sh-dialog .btn.pri');await p.waitForTimeout(200);
 ok(W+' rename works',(await p.locator('#elcard .elrow .elname').allTextContents()).includes('Lamp'));
 await p.setInputFiles('#elFile',{name:'my-sketch.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')});await p.waitForTimeout(300);
 ok(W+' Add your own lands in Mine',await p.evaluate(()=>EL.cat==='Mine')&&(await p.locator('#elcard .elrow .elname').allTextContents()).includes('my-sketch'));
 await noScroll(p,'elements card');
 const names=await p.evaluate(()=>[...new Set([...document.querySelectorAll('#elcard .eltile .elname')].map(e=>e.textContent))].length===document.querySelectorAll('#elcard .eltile .elname').length);ok(W+' no duplicate names in a tab',names);
 const allNames=await p.evaluate(()=>{const n=elAll().map(x=>x.name.toLowerCase());return n.length===new Set(n).size});ok(W+' no duplicate element names at all',allNames);
 await p.click('#elcard [data-el=edit]');await p.click('#elcard [data-el=close]');
 await p.close();

 // ---- Professional: same bars, more choices inside
 p=await open(W,H);await p.click('[data-sh-mode=pro]');await p.waitForTimeout(300);
 ok(W+' toggle switches to Professional',await p.evaluate(()=>document.getElementById('app').dataset.mode==='pro'&&isPro()));
 ok(W+' Pro main bar has the very same buttons',await p.evaluate(()=>[...document.querySelectorAll('#tb button')].map(x=>x.getAttribute('aria-label')).join(',')==='Text,Pen,Eraser,Shapes,Lasso,Insert,Undo,Redo,More,Minimise'));
 ok(W+' Pro pen row has the very same buttons as Beginner',await p.locator('#opts .v6b').evaluateAll(x=>x.map(y=>y.dataset.dd).join(','))==='pentype,size,colour,feel,fav');
 await dd(p,'feel');
 ok(W+' Pro Feel dropdown has Feel, Math assist, Paper and layers',(await p.locator('#acard [data-v7seg]').evaluateAll(r=>r.map(x=>x.getAttribute('aria-label')).join(','))).includes('Math assist')&&(await p.locator('#acard [data-v7seg]').evaluateAll(r=>r.map(x=>x.getAttribute('aria-label')).join(','))).includes('Paper and layers'));
 await noScroll(p,'pro feel card');
 await p.evaluate(()=>closeCards());
 await dd(p,'size');ok(W+' Pro Size dropdown: Fine, Medium, Bold + exact thickness',await p.locator('#acard .chip').count()===3&&await p.locator('#acard input[data-r=exact]').count()===1);await p.evaluate(()=>closeCards());
 await dd(p,'insert');ok(W+' Pro Insert ▾ has the extra tiles (File or PDF, Mic, Database...)',await p.locator('#acard .tile').count()===21);
 await p.evaluate(()=>closeCards());
 // ---- one minimise (main bar), the floating context bars keep theirs
 const check=async(label,n,wanted)=>{const r=await p.evaluate(()=>[...document.querySelectorAll('.minb')].filter(b=>b.getClientRects().length&&getComputedStyle(b).visibility!=='hidden'&&!b.closest('[aria-hidden=true]')).map(b=>{const r=b.getBoundingClientRect(),pr=b.previousElementSibling,par=b.parentElement;return{key:b.dataset.min,w:Math.round(r.width),h:Math.round(r.height),sep:!!(pr&&pr.classList.contains('minsep')),last:par.lastElementChild===b,ring:getComputedStyle(b).borderTopColor!==getComputedStyle(b).backgroundColor}}));
  ok(W+' minimise in '+label+' (separator, last, same class)',r.length>=(n||1)&&r.every(x=>(x.key==='main'?x.w>=36&&x.h>=36:x.w===44&&x.h===44)&&x.sep&&x.last&&x.ring),JSON.stringify(r));return r};
 const r1=await check('main bar',1);ok(W+' exactly one minimise in the toolbar',await p.evaluate(()=>[...document.querySelectorAll('#barbox .minb')].length)===1);
 await p.click('#tb [data-id=text]');await p.evaluate(()=>{select(document.querySelectorAll('.box')[1]);updateBoxBar()});await p.waitForTimeout(250);
 const r2=await check('box bar',1);ok(W+' box bar has NO minimise (v8 M2)',!r2.some(x=>x.key==='box')&&await vis(p,'#boxbar')===1&&await vis(p,'#boxbar .minb')===0);
 await p.evaluate(()=>{const t=document.querySelectorAll('.box')[1].querySelector('.txt');t.focus();getSelection().selectAllChildren(t)});await p.waitForTimeout(300);
 const r3=await check('selection bar');ok(W+' selection bar has its minimise',r3.some(x=>x.key==='sel'));
 await p.evaluate(()=>{getSelection().removeAllRanges();document.activeElement.blur();deselect()});
 await dd(p,'insert');await p.click('#acard [data-v=mic]');await p.waitForTimeout(250);const r4=await check('mini keys');ok(W+' mini keys has its minimise',r4.some(x=>x.key==='keys'));
 await p.evaluate(()=>toggleStrip());
 await p.evaluate(()=>{addInsert('pic');setTool('lasso');const bx=[...document.querySelectorAll('.box')].find(b=>b.dataset.t==='pic');L.ids=new Set();L.boxes=[bx];calcBBox();R.lm={size:true};syncLsel()});await p.waitForTimeout(250);
 const r5=await check('picture bar');ok(W+' picture bar has its minimise',r5.some(x=>x.key==='lsel'));
 await p.evaluate(()=>clearLasso());
 await p.evaluate(()=>{setTool('text');R.kbOpen=true;updateStates();updKbBar&&updKbBar();$('#kbbar').hidden=false;syncMin()});await p.waitForTimeout(200);
 await check('keyboard bar');
 await p.evaluate(()=>{R.kbOpen=false;$('#kbbar').hidden=true});
 await p.click('#tb [data-id=pen]');await p.waitForTimeout(200);
 ok(W+' pulse demo hook runs before first use',await p.evaluate(()=>window.__pulseMinimise())>0&&await p.locator('.minb.pulse').count()>0);
 ok(W+' tooltip says Tuck this bar away',await p.evaluate(()=>/Tuck this bar away/.test(document.getElementById('tip').textContent)));
 await p.evaluate(()=>{window.__pulseMinimise()});
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);
 ok(W+' reduced motion: static ring, no animation',await p.evaluate(()=>{const b=document.querySelector('.minb.pulse');return !!b&&getComputedStyle(b).animationName==='none'&&getComputedStyle(b).boxShadow!=='none'}));
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.click('#tb .minb');await p.waitForTimeout(250);
 ok(W+' main bar minimises to a chip (both rows go)',await p.evaluate(()=>!!document.querySelector('#mindock .mchip[data-min=main]'))&&await vis(p,'#opts')===0);
 ok(W+' pulse stops after first use',await p.evaluate(()=>window.__pulseMinimise())===0&&await p.locator('.minb.pulse').count()===0&&await p.evaluate(()=>ST.minUsed===1));
 await p.click('#mindock .mchip[data-min=main]');await p.waitForTimeout(250);ok(W+' chip brings the bar back',await vis(p,'#opts')===1&&await vis(p,'#tb')===1);
 ok(W+' minimise remembered in storage',await p.evaluate(()=>!!JSON.parse(localStorage.getItem('tbmock.v8')).minUsed));
 await noScroll(p,'after minimise');
 await p.close();
}
console.log('FUNC',pass+' passed, '+fail+' failed');console.log('ERRORS:\n'+errs.join('\n'));await b.close();
