// ---------- v8 probes: M1, M3, V1 (feedback), V3 (one premium system everywhere), V4 (custom tools) ----------
{const T=async(name,fn)=>{total++;let r=false,x='';try{r=await fn()}catch(e){x=' ['+String(e.message).split('\n')[0]+']'}if(r)found++;else miss.push('v8 '+name+x)};
 const E=(f,a)=>p.evaluate(f,a);const reset=async()=>{await E(()=>{CT.draft=null;CT.edit=false;closeSheet();closeMenu();closeCards();deselect()});await wait(150)};
 await p.setViewportSize({width:1180,height:820});await p.click('[data-sh-mode=pro]');await wait(400);await reset();
 // M3
 await T('M3: the top-bar Done is gone',async()=>!(await p.locator('#doneBtn').count())&&!/Done/.test(await txt('#sh-top *')));
 // M1: Box card never overlaps the selected box, in both viewports, for a small and a wide box, from the ▾ and from the grip menu
 const overlap=()=>E(()=>{const c=document.querySelector('#acard.show')||document.querySelector('#more.show'),b=document.querySelector('.box.sel');if(!c||!b)return'missing';const r=c.getBoundingClientRect(),q=b.getBoundingClientRect();
  return(r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top)?'overlap '+JSON.stringify([r.left,r.top,r.right,r.bottom,q.left,q.top,q.right,q.bottom].map(Math.round)):(r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1?'offscreen':'')});
 for(const [W,H] of [[1180,820],[820,1180]]){await p.setViewportSize({width:W,height:H});await wait(300);
  for(const mode of ['pro','beg']){await p.click('[data-sh-mode='+mode+']');await wait(350);await tool('text');
   for(const i of [0,1]){await E(i=>{select(document.querySelectorAll('.box')[i]);updateBoxBar()},i);await wait(200);await openDD('box');
    await T('M1: Box card beside the box, not over it ('+mode+' box '+i+' @'+W+')',async()=>(await overlap())==='');await closeAll();
    if(mode==='pro'){await p.click('.box.sel .tab');await wait(300);await p.click('#more .mrow2:has-text("Box style…")');await wait(350);
     await T('M1: Box card from the grip menu beside the box (box '+i+' @'+W+')',async()=>(await overlap())==='');await closeAll()}}
   await E(()=>deselect())}}
 await p.setViewportSize({width:1180,height:820});await p.click('[data-sh-mode=pro]');await wait(400);
 // V3: the premium system on every remaining surface
 const frame=sel=>E(sel=>{const e=document.querySelector(sel);if(!e||!e.getClientRects().length)return'hidden';const cs=getComputedStyle(e),root=getComputedStyle(document.documentElement);const want=root.getPropertyValue('--pv-fill').replace(/\s/g,'');
  const bg=cs.backgroundColor.replace(/\s/g,'');const okBg=bg===want.replace(/(\.\d+)\)/,'$1)')||/rgba\(31,30,38,0\.88\)/.test(bg);return okBg&&parseFloat(cs.borderTopLeftRadius)>=16&&/blur/.test(cs.backdropFilter||cs.webkitBackdropFilter||'')?'':'bg '+bg+' r '+cs.borderTopLeftRadius+' bf '+cs.backdropFilter},sel);
 await tool('text');await E(()=>{select(document.querySelectorAll('.box')[1]);updateBoxBar()});await wait(250);
 await T('V3: box bar uses the card frame',async()=>(await frame('#boxbar'))==='');
 await p.click('.box.sel .tab');await wait(300);
 await T('V3: box grip menu rows sit in wells',async()=>await p.locator('#more.pv .v7grp>.mrow2').count()>=6&&await p.locator('#more .mrow2.dz').count()===1);await closeAll();
 await E(()=>{buildSelbar(false);selbar.hidden=false;selbar.style.top='330px';selbar.style.left='200px'});await wait(200);
 await T('V3: text selection bar uses the card frame',async()=>(await frame('#selbar'))==='');await E(()=>{selbar.hidden=true;deselect()});
 await E(()=>{setTool('lasso');const s=strokes[strokes.length-1];L.ids=new Set(s?[s.id]:[]);L.boxes=s?[]:[document.querySelectorAll('.box')[1]];calcBBox();R.lm={more:true};syncLsel()});await wait(300);
 await T('V3: lasso selection bar (Cut/Copy…) uses the card frame',async()=>(await frame('#lsel .lm2'))==='');
 await T('V3: lasso bar labels are sentence case, actions are tonal tiles',async()=>E(()=>{const h=document.querySelector('#lsel .mh'),a=document.querySelector('#lsel .mb2.lab');return!!h&&getComputedStyle(h).textTransform==='none'&&!!a&&getComputedStyle(a).backgroundColor!=='rgba(0, 0, 0, 0)'&&a.getBoundingClientRect().height>=44}));
 await E(()=>clearLasso());
 await p.click('#tb [data-id=more]');await wait(300);
 await T('V3: More (all-tools panel) rows sit in wells',async()=>await p.locator('#morecard .v7grp>.mrow').count()>=8&&await p.locator('#morecard .cpane>.mrow').count()===0);
 await p.click('#morecard [data-z=lay]');await wait(300);
 await T('V3: Layouts card joins the frame',async()=>(await frame('#laycard'))===''&&await E(()=>getComputedStyle(document.querySelector('#laycard .clab')).textTransform==='none'));
 await p.keyboard.press('Escape');await reset();
 for(const [nm,fn] of [['Toolbar settings','settingsSheet'],['Customise','customiseSheet'],['Help','helpSheet'],['New layout','newLayoutDlg'],['Link','linkSheet'],['Add a picture','pictureSheet'],['New recall card','recallSheet'],['Handwriting','handwritingSheet'],['Arrange the menu','arrangeSheet'],['Save as preset','savePresetSheet']]){
  await E(fn=>window[fn]?window[fn]():eval(fn+'()'),fn);await wait(250);
  await T('V3: sheet "'+nm+'" uses the card frame, 15 px title, round close',async()=>(await frame('#sheet'))===''&&await E(()=>{const s=document.querySelector('#sheet .shd strong'),c=document.querySelector('#sheet .shd .sq');return!!s&&getComputedStyle(s).fontSize==='15px'&&!!c&&c.getBoundingClientRect().width>=44&&getComputedStyle(c).borderRadius==='50%'}));
  await E(()=>closeSheet())}
 await E(()=>settingsSheet());await wait(250);
 await T('V3: settings rows sit in wells, section labels are sentence case, no stale "All tools row"',async()=>E(()=>{const s=document.querySelector('#sheet');return s.querySelectorAll('.v8well>.srow').length>=8&&!s.querySelector(':scope>.srow:not(.v8head)')&&[...s.querySelectorAll('.shead')].every(h=>getComputedStyle(h).textTransform==='none')&&!/All tools row/.test(s.textContent)}));
 await T('V1: every settings switch row has a tiny preview',async()=>E(()=>[...document.querySelectorAll('#sheet [role=switch]')].every(x=>x.closest('.srow').querySelector('.v8pv'))));
 await p.click('#sheet .srow:has-text("Show names under icons") [role=switch]');await wait(250);
 await T('V1: a settings switch answers with a toast and Undo',async()=>/Show names under icons turned on/.test(await txt('#toast'))&&await p.locator('#toast.show .tact').count()===1);
 await p.click('#toast .tact');await wait(250);
 await T('V1: Undo on the toast puts the setting back',async()=>E(()=>ST.names===false));
 await E(()=>closeSheet());
 await E(()=>toastAct('x','Undo',()=>{}));await wait(100);await T('V3: toast uses the card frame',async()=>(await frame('#toast'))==='');
 // V1: previews in every switch row of every card, both modes
 await T('V1: every switch row in every card has a tiny preview (both modes)',async()=>{const bad=await E(async()=>{const bad=[];const w=()=>new Promise(r=>setTimeout(r,140));
   const add=()=>document.querySelectorAll('#acard.show [role=switch],#lcard.show [role=switch],#more.show [role=switch],#morecard.show [role=switch]').forEach(s=>{if(!s.querySelector('.v8pv'))bad.push(v8SwLabel(s))});
   for(const mode of ['pro','beg']){document.querySelector('[data-sh-mode='+mode+']').click();await w();
    for(const t of ['pen','text','eraser','shapes','lasso']){document.querySelector('#tb [data-id='+t+']').click();await w();
     for(const id of [...document.querySelectorAll('#opts [data-dd]')].map(x=>x.dataset.dd)){document.querySelector('[data-dd='+id+']').click();await w();add();
      for(const s of document.querySelectorAll('.pv.show [data-v7seg], .pv.show .ctab')){s.click();await w();add()}closeCards();await w()}}
    document.querySelector('#tb [data-id=more]').click();await w();add();closeCards()}
   document.querySelector('[data-sh-mode=pro]').click();await w();return bad});if(bad.length)throw new Error(bad.join(','));return true});
 await wait(300);await tool('pen');await openDD('feel');await p.click('#acard [data-v7seg$=":aids"]');await wait(250);
 await p.click('#acard [role=switch]:has-text("Circle to lasso")');await wait(200);
 await T('V1: a card switch: row glows, toast "turned on" with Undo',async()=>/Circle to lasso turned on/.test(await txt('#toast'))&&await p.locator('#acard .srw.v8rowglow').count()===1&&await E(()=>PN.c2l===true));
 await p.click('#toast .tact');await wait(250);await T('V1: card switch Undo',async()=>E(()=>PN.c2l===false));
 await p.click('#acard [data-v7seg$=":page"]');await wait(250);await p.click('#acard [data-v7=paper][data-v=dots]');await wait(60);
 await T('V1: the page glows when its style changes',async()=>E(()=>paper.classList.contains('v8flash')&&PN.paper==='dots'));await E(()=>{setPaper('lined');closeCards()});
 await tool('text');await E(()=>{select(document.querySelectorAll('.box')[0]);updateBoxBar()});await wait(200);await openDD('box');await p.click('#acard .ltile >> nth=1');await wait(60);
 await T('V1: the box glows when its look changes',async()=>E(()=>document.querySelector('.box.sel').classList.contains('v8flash')));
 await T('V1: new bars slide in (box bar has an entrance animation)',async()=>E(()=>/v8rise/.test(getComputedStyle(document.querySelector('#boxbar')).animationName)));
 await E(()=>{setStyle({},true)});await reset();
 // V4: custom tools
 await tool('pen');
 for(const t of ['text','pen','eraser','shapes','lasso']){await tool(t);await T('V4: ★ at the end of the '+t+' row (Professional)',async()=>E(()=>{const r=document.querySelector('#opts .v6row'),s=r.querySelector('.v8star');return!!s&&r.lastElementChild===s&&s.getBoundingClientRect().width>=44&&ctNat(V.tab).length===r.querySelectorAll('.v6b').length}))}
 await T('V4: no custom tools on a fresh start',async()=>E(()=>ST.ct.list.length===0&&!document.querySelector('#barbox .v8ct')));
 await tool('pen');await E(()=>{R.pen='Brush';R.size='Bold';R.penCol='#ef7a6f';renderOpts()});await p.click('#opts .v8star');await wait(350);
 await chk('v8 V4: save sheet','#sheet *',['Save as a custom tool','Name','Picture','Live preview','What it sets','Pen','Shape','Eraser','Lasso','Text box','Where it sits','Main bar','Move earlier','Move later','Cancel','Save tool','Brush · Bold · Red']);
 await T('V4: save sheet starts with this row\'s tool ticked, at the end of this row',async()=>E(()=>CT.draft.row==='pen'&&CT.draft.inc.pen&&!CT.draft.inc.eraser&&CT.draft.pos===5&&document.querySelector('#ctName').value==='Brush'));
 await T('V4: live toolbar preview shows the new tool in place',async()=>E(()=>{const c=[...document.querySelectorAll('#ctTbp .r:not(.dim) .c')].map(x=>x.textContent.trim());return c.join('|')==='Pen type|Size|Colour|Feel|Favourites|Brush|'}));
 await p.fill('#ctName','Red brush');await p.click('#ctPos [data-d="-1"]');await p.click('#ctPos [data-d="-1"]');await wait(150);
 await T('V4: name and position update the preview live',async()=>E(()=>[...document.querySelectorAll('#ctTbp .r:not(.dim) .c')].map(x=>x.textContent.trim()).join('|')==='Pen type|Size|Colour|Red brush|Feel|Favourites|'&&/After\s*Colour/.test(document.querySelector('#ctPos .where').textContent)));
 await p.click('#ctParts [data-k=eraser]');await wait(120);await T('V4: any mix across tools (Pen + Eraser)',async()=>E(()=>CT.draft.inc.pen&&CT.draft.inc.eraser));
 await p.click('#ctParts [data-k=eraser]');await p.click('#ctParts [data-k=pen]');await wait(120);await T('V4: a tool needs at least one part',async()=>E(()=>CT.draft.inc.pen===true));
 await p.fill('#ctName','');await wait(80);await T('V4: Save is off without a name',async()=>p.locator('#ctOk').isDisabled());await p.fill('#ctName','Red brush');
 await p.click('#ctIcons [data-v=brush]');await p.click('#ctIcons [data-v=auto]');await p.click('#ctOk');await wait(350);
 await T('V4: saved as a one-tap button with a tiny preview, in the chosen place',async()=>E(()=>{const k=[...document.querySelectorAll('#opts .v6row>.v6b,#opts .v6row>.v8ct')].map(x=>x.dataset.dd||x.dataset.ct);const b=document.querySelector('#opts .v8ct');return k.join(',')==='pentype,size,colour,ct1,feel,fav'&&!!b.querySelector('.v8ctp svg')&&/Red brush/.test(b.textContent)&&b.getBoundingClientRect().height>=38}));
 await T('V4: save answers with a toast and Undo',async()=>/Added .Red brush. to the pen row/.test(await txt('#toast'))&&await p.locator('#toast .tact').count()===1);
 await E(()=>{R.pen='Ball';R.size='Fine';R.penCol='auto';renderOpts()});await p.click('#opts .v8ct');await wait(300);
 await T('V4: one tap brings the setup back',async()=>E(()=>R.pen==='Brush'&&R.size==='Bold'&&R.penCol==='#ef7a6f'&&document.querySelector('#opts .v8ct').classList.contains('used')));
 await p.click('#toast .tact');await wait(300);await T('V4: Undo after using a tool',async()=>E(()=>R.pen==='Ball'&&R.size==='Fine'));
 // a second and a third tool: text box look on the main bar, eraser on its row
 await tool('eraser');await p.click('#opts .v8star');await wait(300);await p.fill('#ctName','Rub');await p.click('#ctRows [data-v=main]');await wait(120);await p.click('#ctOk');await wait(300);
 await T('V4: a tool placed on the main bar',async()=>E(()=>{const g=[...document.querySelectorAll('#tb .v6tools>*')].map(x=>x.dataset.id||x.dataset.ct);return g.join(',')==='text,pen,eraser,shapes,lasso,insert,ct2'}));
 await tool('pen');await p.click('#tb .v8ct');await wait(300);await T('V4: a main-bar tool switches to its tool (eraser setup)',async()=>E(()=>R.tool==='eraser'));
 await tool('pen');await E(()=>{R.pen='Highlighter';renderOpts()});await p.click('#opts .v8star');await wait(300);await p.fill('#ctName','Marker');await p.click('#ctOk');await wait(300);await E(()=>{R.pen='Fountain';renderOpts()});
 // edit mode
 const ctr=sel=>E(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}},sel);
 let c=await ctr('#opts .v8ct[data-ct=ct1]');await p.mouse.move(c.x,c.y);await p.mouse.down();await wait(750);await p.mouse.up();await wait(250);
 await T('V4: hold a custom tool to enter Edit mode',async()=>E(()=>CT.edit&&document.querySelector('#opts .v6row').classList.contains('v8editing')&&!!document.querySelector('#opts .v8done')));
 await T('V4: holding did not fire the tool',async()=>E(()=>R.pen==='Fountain'));
 c=await ctr('#opts .v8ct[data-ct=ct1]');const e2=await ctr('#opts .v8ct[data-ct=ct3]');await p.mouse.move(c.x,c.y);await p.mouse.down();await p.mouse.move(e2.x+60,e2.y,{steps:8});
 await T('V4: a drop line shows while dragging',async()=>E(()=>!document.querySelector('.v8dropline').hidden));await p.mouse.up();await wait(300);
 await T('V4: drag reorders',async()=>E(()=>[...document.querySelectorAll('#opts .v6row>.v6b,#opts .v6row>.v8ct')].map(x=>x.dataset.dd||x.dataset.ct).join(',')==='pentype,size,colour,feel,fav,ct3,ct1'));
 await p.click('#opts .v8ct[data-ct=ct1]');await wait(350);
 await chk('v8 V4: edit sheet','#sheet *',['Edit custom tool','Update to my current setup','Remove this tool','Save changes']);
 await p.fill('#ctName','Big red');await p.click('#ctParts [data-k=shape]');await p.click('#ctOk');await wait(300);
 await T('V4: edit: rename and change contents',async()=>E(()=>{const t=ctGet('ct1');return t.name==='Big red'&&!!t.parts.shape&&!!t.parts.pen&&/Big red/.test(document.querySelector('#opts .v8ct[data-ct=ct1]').textContent)}));
 await p.click('#opts .v8ct[data-ct=ct3] .rm');await wait(300);await T('V4: edit: remove (with Undo)',async()=>E(()=>!ctGet('ct3'))&&/Removed .Marker./.test(await txt('#toast')));
 await p.click('#toast .tact');await wait(300);await T('V4: Undo brings the removed tool back',async()=>E(()=>!!ctGet('ct3')));
 await p.click('#opts .v8done');await wait(250);await T('V4: Done leaves Edit mode',async()=>E(()=>!CT.edit&&!!document.querySelector('#opts .v8star')));
 // manager
 await p.click('#tb [data-id=more]');await wait(300);await T('V4: More has a Custom tools row',async()=>p.locator('#morecard .v7grp>[data-ctx=manager]').count().then(n=>n===1));
 await p.click('#morecard [data-ctx=manager]');await wait(350);
 await chk('v8 V4: manager','#sheet *',['Custom tools','Use','Manage','Big red','Rub','Marker','Main bar','Pen row','earlier','later','Change','Duplicate','Delete','Reorder on the toolbar','Done']);
 await T('V4: manager: use tiles on top, manage rows below',async()=>E(()=>document.querySelectorAll('#sheet .v8tile').length===3&&document.querySelectorAll('#sheet .v8well .v8mrow').length===3));
 await p.fill('#sheet .v8mrow[data-id=ct2] input','Quick rub');await wait(150);await T('V4: manager: rename inline',async()=>E(()=>ctGet('ct2').name==='Quick rub'&&/Quick rub/.test(document.querySelector('#tb .v8ct').getAttribute('aria-label'))));
 await p.click('#sheet .v8mrow[data-id=ct1] [data-ctx=dup]');await wait(250);await T('V4: manager: duplicate',async()=>E(()=>ST.ct.list.length===4));
 await p.click('#sheet .v8mrow[data-id=ct4] [data-ctx=rm]');await wait(250);await T('V4: manager: delete',async()=>E(()=>ST.ct.list.length===3&&!ctGet('ct4')));
 await p.click('#sheet .v8mrow[data-id=ct1] [data-ctx=nudge][data-d="-1"]');await wait(250);await T('V4: manager: move earlier',async()=>E(()=>[...document.querySelectorAll('#opts .v6row>.v6b,#opts .v6row>.v8ct')].map(x=>x.dataset.dd||x.dataset.ct).join(',')==='pentype,size,colour,feel,fav,ct1,ct3'));
 await T('V4: every manager control is a 40 px+ target, delete is danger red',async()=>E(()=>[...document.querySelectorAll('#sheet .v8mrow .acts button')].every(b=>b.getBoundingClientRect().height>=40&&b.getBoundingClientRect().width>=44)&&/239|danger|rgb\(2/.test(getComputedStyle(document.querySelector('#sheet .v8mrow .dz')).color)));
 await E(()=>closeSheet());
 // overflow: never sideways scroll
 await E(()=>{for(let i=0;i<14;i++){const c=JSON.parse(JSON.stringify(ctGet('ct1')));c.id='x'+i;c.name='Pen set '+(i+1);ST.ct.list.push(c)}ctRender()});await wait(300);
 await T('V4: too many tools fold into one "⋯ n" button, the row never scrolls sideways',async()=>E(()=>{const r=document.querySelector('#opts .v6row'),o=r.querySelector('.v8ovf');return!!o&&r.scrollWidth<=r.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#barbox').getBoundingClientRect().height<=98&&o.dataset.ids.split(',').length+r.querySelectorAll('.v8ct').length===16}));
 await p.click('#opts .v8ovf');await wait(300);await T('V4: the fold opens a menu with the hidden tools and Manage',async()=>/Pen set 14/.test(await txt('#more *'))&&/Manage custom tools/.test(await txt('#more *')));
 await T('V4: the fold menu hangs under its button, inside the screen',async()=>E(()=>{const m=document.querySelector('#more').getBoundingClientRect(),o=document.querySelector('#opts .v8ovf').getBoundingClientRect();return m.top>=o.bottom&&m.top<o.bottom+20&&m.right<=innerWidth&&m.left<=o.left&&m.right>=o.right-60}));await closeAll();
 await E(()=>{ST.ct.list=ST.ct.list.filter(t=>!/^x/.test(t.id));save();ctRender()});
 // Beginner: hidden, unlockable
 await p.click('[data-sh-mode=beg]');await wait(400);await tool('pen');
 await T('V4: Beginner: no ★ and no custom tools',async()=>E(()=>!document.querySelector('#barbox .v8star')&&!document.querySelector('#barbox .v8ct')));
 await p.click('#tb [data-id=more]');await wait(300);await T('V4: Beginner: More offers Custom tools as an unlock switch',async()=>p.locator('#morecard [data-ctx=unlock][role=switch][aria-checked=false]').count().then(n=>n===1));
 await p.click('#morecard [data-ctx=unlock]');await wait(300);
 await T('V4: Beginner unlocked: ★ and the tools appear, toast with Undo',async()=>E(()=>!!document.querySelector('#opts .v8star')&&!!document.querySelector('#opts .v8ct')&&ST.ct.unlock)&&/Custom tools turned on/.test(await txt('#toast')));
 await p.click('#toast .tact');await wait(300);await T('V4: Beginner: Undo locks them again',async()=>E(()=>!ST.ct.unlock&&!document.querySelector('#barbox .v8star')));
 await E(()=>{closeCards();ST.ct.list.length=0;ST.ct.unlock=false;save();renderToolbar()});await p.click('[data-sh-mode=pro]');await wait(400);
 await T('v8: no page errors',async()=>errs.length===0);
 await p.click('[data-sh-mode=beg]');await wait(300)}
