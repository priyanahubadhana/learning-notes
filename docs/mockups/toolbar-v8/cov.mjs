// v7: same probes as v6, locations updated for the v7 cards (Feel sections, Fine-tune, Fountain pen). Was: v6: every v5 probe, rewritten to the feature's NEW home (open the ▾ then find the control) + new layout checks.
// Items removed BY DESIGN in v6 (category row, Professional map banner, in-toolbar layout switch, grip, second minimise, Paper chips in More) become "must be gone" probes.
import fs from 'fs';import {MAP,mapMd} from './mapping.mjs';
import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs';
const D='C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(['error','warning'].includes(m.type())&&!/fonts|ERR_/.test(m.text()))errs.push(m.type()+' '+m.text())});
await p.goto('file:///'+D+'v8/toolbar-mock-v8.html');await p.waitForTimeout(500);
await p.click('[data-sh-mode=pro]');await p.waitForTimeout(300);
let ROWP='',ROWB='',BOXBOX='',BOXLAY='',FMT='',FMTB='',BOXMENU='',BEGBOX='';let found=0,total=0;const miss=[];
const txt=sel=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>(e.textContent||'')+' '+(e.getAttribute('aria-label')||'')+' '+(e.dataset.tip||'')+' '+(e.getAttribute('title')||'')).join(' | '),sel);
function chkT(group,t,items){for(const it of items){total++;const re=new RegExp(it,'i');if(re.test(t))found++;else miss.push(group+': '+it)}}
async function chk(group,sel,items){chkT(group,await txt(sel),items)}
async function has(group,name,sel){total++;if(await p.locator(sel).count())found++;else miss.push(group+': '+name)}
async function gone(group,name,sel){total++;if(!(await p.evaluate(s=>[...document.querySelectorAll(s)].some(e=>e.getClientRects().length),sel)))found++;else miss.push(group+': still present: '+name)}
const wait=n=>p.waitForTimeout(n||250);
const tool=async id=>{await p.click('#tb [data-id='+id+']');await wait(200)};
const openDD=async id=>{await p.click('[data-dd='+id+']');await wait(300)};
const closeAll=async()=>{await p.evaluate(()=>closeCards());await wait(120)};
const menuTxt=()=>p.evaluate(()=>{const m=document.querySelector('#more'),h=(m.querySelector('.h')||{}).textContent||'';return[h,...[...m.querySelectorAll('.mrow2,.clab')].map(x=>h+' '+x.textContent.trim()+' | '+x.textContent.trim())].join(' | ')});
const menuOf=async id=>{await openDD(id);const t=await menuTxt();await p.evaluate(()=>closeMenu());await closeAll();return t};
// text of a card, with every section tab clicked and every small ▾ menu in it opened
async function cardTxt(card){let out=await txt(card+' *');const n=await p.locator(card+' .ctab').count();for(let i=0;i<n;i++){await p.locator(card+' .ctab').nth(i).click();await wait(120);out+=' | '+await txt(card+' *')}
 for(const m of await p.locator(card+' [data-m]').evaluateAll(e=>e.map(x=>x.dataset.m))){await p.click(card+' [data-m="'+m+'"]');await wait(200);out+=' | '+await menuTxt();await p.evaluate(()=>closeMenu())}return out}
const cardOf=async(id,card)=>{await openDD(id);const t=await cardTxt(card||'#acard');await closeAll();return t};
async function pickType(n){await openDD('pentype');await p.evaluate(n=>{[...document.querySelectorAll('#more .mrow2')].find(x=>x.textContent.trim()===n).click()},n);await wait(200)}

// ---------------- Pen row ----------------
await tool('pen');
const rowPen=await txt('#opts *')+await txt('#tb *');
const typeT=await menuOf('pentype'),sizeT=await cardOf('size'),colT=await cardOf('colour'),favT=await cardOf('fav'),feelT=await cardOf('feel');
chkT('Pen row',rowPen+typeT+sizeT+colT+favT,['Pen','Ballpoint','Favourites','Brush','Pencil','Marker','Highlighter','Black','Blue','Red','Green','Orange','Purple','Fine','Medium','Bold','Add colour','Feel','Colour','Size','Minimise']);
await gone('Pen row','Move these options (grip is removed)','#opts .pgrip');
await gone('Pen row','More pen options caret is removed','#opts .more');
total++;await openDD('feel');if((await p.textContent('#acard .ch strong')).trim()==='Feel')found++;else miss.push('Feel card: title Feel');await closeAll();
chkT('Pen dropdowns',sizeT+colT+favT+feelT,['Exact thickness','Solid','Dashed','Dotted','Add colour','Custom colours|Pick a custom colour','Favourites','Save current','Tip sharpness','Pressure','Stabilisation','Flatness','Tilt widens','Thickness by speed','Reduce latency','Finger can draw','Automatic','Always','Never','Scribble to erase','Circle to lasso','Layers','Draw here','Add layer','Merge top into second','Blank','Lined','Grid','Dots','Fit page','A4','Letter','Zoom','View as drawn','Preview of the current pen']);
await pickType('Highlighter');
const hS=await cardOf('size'),hC=await cardOf('colour'),hF=await cardOf('feel'),hV=await cardOf('fav');
chkT('Highlighter row',await txt('#opts *')+hS+hC,['Yellow','Green','Blue','Pink','Orange','Purple','Fine','Medium','Bold']);
chkT('Highlighter dropdowns',hS+hC+hF+hV,['Snap to text lines','Draw behind ink','Opacity','Highlight eraser','Save to notes','Favourites','Custom colour']);
await pickType('Fountain pen');
// ---------------- Eraser row ----------------
await tool('eraser');
const eT=await menuOf('emode')+await menuOf('esize')+await menuOf('eopt');
chkT('Eraser',eT+await txt('#opts *'),['Precise','Standard','Whole stroke','Thin','Medium','Thick','Erase highlights only','Go back to the previous tool','Magnifier','More eraser options']);
// ---------------- Lasso row ----------------
await tool('lasso');
const lT=await cardOf('lsel','#lcard')+await cardOf('lmenu','#lcard')+await cardOf('llayers','#lcard');
chkT('Lasso dropdowns',await txt('#opts *')+lT,['Free-hand','Rectangle','Ink','Pictures','Text','Copy','Cut','Duplicate','Convert to text','Colour','Delete','Thickness','Make card','Add to Summary','Name this drawing','Arrange the menu','Layers','Draw here']);

const B=await p.evaluate(()=>{const r=document.querySelector('#paper').getBoundingClientRect();return{x:r.left,y:r.top}});
await p.click('#tb [data-id=pen]');
await p.evaluate(()=>{R.acard=false;renderOpts()});
await p.mouse.move(B.x+700,B.y+300);await p.mouse.down();await p.mouse.move(B.x+800,B.y+340,{steps:6});await p.mouse.up();
await p.evaluate(()=>{R.rec=performance.now()-3000});await p.mouse.move(B.x+720,B.y+400);await p.mouse.down();await p.mouse.move(B.x+800,B.y+420,{steps:6});await p.mouse.up();await p.evaluate(()=>{R.rec=null});
await p.click('#tb [data-id=lasso]');
await p.mouse.move(B.x+660,B.y+280);await p.mouse.down();for(const q of [[860,280],[860,460],[660,460],[662,282]])await p.mouse.move(B.x+q[0],B.y+q[1],{steps:3});await p.mouse.up();await p.waitForTimeout(300);
await p.click('#lsel [data-m=more]');await p.waitForTimeout(150);
await chk('Lasso ink menu','#lsel .lm2 *',['selected','Deselect','Copy','Cut','Duplicate','Convert to text','Colour','Delete','Thickness','Make card','Add to Summary','Name this drawing','Paste|More','Play the recording','Screenshot','Copy as picture','Save as picture']);
await p.evaluate(()=>{L.boxes=[document.querySelectorAll('.box')[1]];calcBBox();syncLsel()});await p.waitForTimeout(150);
await chk('Mixed menu','#lsel .lm2 *',['Copy','Cut','Delete','Screenshot of the selection','Make card','Deselect']);
await p.evaluate(()=>{L.ids=new Set();calcBBox();R.lm={more:true};syncLsel()});await p.waitForTimeout(150);
await chk('Text menu','#lsel .lm2 *',['Copy','Cut','Duplicate','Delete','Colour','Key point','Make card','Add to Summary','Save to notes','Move','Scale','Rotate','Screenshot','Convert to text']);
await p.evaluate(()=>{addInsert('pic');setTool('lasso');const bx=[...document.querySelectorAll('.box')].find(b=>b.dataset.t==='pic');L.ids=new Set();L.boxes=[bx];calcBBox();R.lm={size:true};syncLsel()});await p.waitForTimeout(200);
await chk('Picture bar','#lsel .lm2 *',['Copy','Cut','Duplicate','Delete','Resize','Deselect','Smaller','Bigger','Fit width','Original','Fit to page','Edit picture']);
await p.evaluate(()=>{R.lm={edit:true};syncLsel()});await chk('Edit picture','#lsel .lm2 *',['Crop','Turn','Straighten','Shapes']);
await p.evaluate(()=>clearLasso());
// ---------------- Text row ----------------
await tool('text');
const rowT=await txt('#opts *');
const boxT=await cardOf('box');
await openDD('box');await p.click('#acard .ctab[data-tab=box]');if(!(await p.locator('#acard .fine').count()))await p.click('#acard [data-a=fine]');await wait(150);
BOXBOX=await txt('#acard *');
await p.click('#acard .ctab[data-tab=layout]');await wait(150);BOXLAY=await txt('#acard *');await closeAll();
FMT=await cardOf('format');
const styleT=await menuOf('style'),listT=await menuOf('list');
ROWP=rowT;
// the box grip menu: two new entries on top, they open the SAME cards (same #acard element, same render function)
await p.evaluate(()=>{select(document.querySelectorAll('.box')[1]);updateBoxBar()});await wait(250);
await p.click('.box.sel .tab');await wait(350);
BOXMENU=await menuTxt();
await p.click('#more .mrow2:has-text("Format…")');await wait(350);
chkT('Box menu > Format… opens the Format card in #acard',await txt('#acard.show *'),['Format','Font & size','Emphasis','Advanced']);
total++;if(await p.evaluate(()=>V.dd==='format'&&acard.classList.contains('show')&&V.anchorEl&&V.anchorEl.classList.contains('box')))found++;else miss.push('Box menu > Format… uses the same card, placed next to the box');
await closeAll();
await p.click('.box.sel .tab');await wait(350);await p.click('#more .mrow2:has-text("Box style…")');await wait(350);
chkT('Box menu > Box style… opens the Box card in #acard',await txt('#acard.show *'),['Box','Look','Border','Layout']);
total++;if(await p.evaluate(()=>V.dd==='box'&&acard.classList.contains('show')&&!!V.anchorEl))found++;else miss.push('Box menu > Box style… uses the same card');
await closeAll();await p.evaluate(()=>deselect());
chkT('Text row',rowT+boxT,['Box style','Width','Layout','Format']);
total++;if(await p.locator('#opts .v6b').evaluateAll(x=>x.map(y=>y.dataset.dd||y.getAttribute('aria-label')).join(','))==='box,format,style,Bold,Italic,list')found++;else miss.push('Pro Text row order: Box | Format | Style B I List');
total++;if(!(await p.locator('[data-dd=font]').count()))found++;else miss.push('Font button is removed');
chkT('Text aa row',rowT+styleT+listT+FMT,['Title','Heading 1','Heading 2','Heading 3','Body','Bold','Italic','Underline','Text colour','Highlight colour','Bullet','Number','Checklist','Toggle list','Left','Centre','Right','Justify']);
const TEXTALL=boxT+BOXBOX+BOXLAY+rowT+FMT+styleT+listT;
chkT('Text card',TEXTALL,['Font','Default','Serif','Sans','Dyslexia','Literata','Source Serif','Atkinson','Lexend','Caveat','Kalam','Patrick','Shantell','90%','100%','115%','130%','150%','Line height','Tight','Loose','Plain','Quote','Callout','Code block','Strikethrough','Code','Link','Key point','None','Dark','Lime','Peach','White','Red','Yellow','Blue','Slate','Outlined','Outline','Soft card','Sticky note','Shadow card','My presets','Save this style','Background','Border width','Corner radius','Padding','Shadow','Use for new boxes','Reset box style','No border','Thin border','Medium border','Thick border','Border colour','Square corners','Soft corners','Round corners','Tight padding','Normal padding','Roomy padding','Every change shows on the selected box','One box','Two columns','Narrow-wide','Wide-narrow','Three columns','2×2','2×3','Layout Assist','Equalise']);

await p.evaluate(()=>{const bx=document.querySelectorAll('.box')[1];select(bx);updateBoxBar()});
await chk('Box bar','#boxbar *',['Style','Duplicate','Cut','Copy','Delete','More']);
await gone('Box bar','second minimise on the text box bar (v8 M2)','#boxbar .minb');
await p.evaluate(()=>{buildSelbar(false)});
await chk('Mini toolbar','#selbar *',['Colour','Size','Style','Bold','Italic','Align','List','Highlight','Link','Cut','Copy','Delete','More','Move this bar','Keep this bar','Deselect','Dictate','Minimise']);
await p.evaluate(()=>{buildSelbar(true)});
await chk('Micro bar','#selbar *',['Move this bar','Text colour','Size','Style','Bold','Italic','Align','List','Highlight','More','Dictate','Minimise']);
await chk('Keyboard bar','#kbbar *',['Outdent','Indent','Bullets','Numbers','Checklist','Align','Underline','Strike','Hide keyboard','Minimise']);
await p.evaluate(()=>{buildSelbar(false);selbar.hidden=false;});await p.evaluate(()=>{selbar.style.top='200px';selbar.style.left='200px'});await p.click('#selbar [data-c=more]');await chk('Mini More menu','#more *',['Paste','Make card','Add to Summary','Key point','Save to notes']);
await p.keyboard.press('Escape');
// ---------------- Insert ▾ ----------------
await p.click('#tb [data-dd=insert]');await wait(300);
const insT=await cardTxt('#acard');
chkT('Insert card',insT,['Table','Picture','Callout','Recall card','Text box','Link','Insert','Camera','File or PDF','Write pad','Handwriting','Audio','Divider','Page link','Database','Mind map','Insert template','Save as template','Summary','To Home','Mic']);
await closeAll();
// ---------------- Main bar + More ----------------
await p.click('#tb [data-id=more]');await wait(300);
const moreT=await txt('#morecard *');
chkT('Main bar',await txt('#tb *')+moreT+insT,['Undo','Redo','Text','Pen','Eraser','Lasso','Last tool|Back to','Insert','New line','Backspace','Keyboard','Mic','More']);
chkT('More card',moreT,['View','Reading mode','Focus mode','Write & input','Keyboard stays hidden','Copy & paste','Copy','Cut','Paste','Layout & settings','Toolbar layouts','Customise toolbar','Toolbar settings','Hide toolbar','Help','Where things live','Search']);
await p.click('#morecard [data-z=help]');await wait(300);await chk('Help','#sheet *',['Where things live','Main bar','Insert','Eraser','Lasso','Beginner and Professional']);await p.evaluate(()=>closeSheet());
await gone('More card','Paper style chips (paper style lives only in Feel)','#morecard [data-z=paper]');
await gone('More card','Paper, layers and zoom row (Layers live in Feel)','#morecard [data-z=page]');
await p.keyboard.press('Escape');await p.evaluate(()=>closeCards());

await p.evaluate(()=>settingsSheet());await chk('Settings','#sheet *',['Pencil picks the Pen','Tool bar: finger only','Pencil writes text','Pencil can scroll','Pencil hold time','New line extras','New line hold time']);
await p.evaluate(()=>closeSheet());
await p.evaluate(()=>toggleReading(true));await chk('Reader bar','#rbar *',['Reading look','Full reader','Line focus','Read aloud','Contents','Hide blanks','Find','Lock to reading','Exit']);
await p.evaluate(()=>readSheet());await chk('Read Aa','#sheet *',['Font','Spacing','Margin','Width','Flow','Themes','All settings']);
await p.evaluate(()=>{closeSheet();toggleReading(false)});
await p.click('#tb [data-dd=insert]');await wait(300);await p.click('#acard [data-v=mic]');await wait(250);await chk('Mini keys','#strip *',['Move the keys','Speak to type','Enter','Backspace','Minimise']);await p.evaluate(()=>{toggleStrip()});
await closeAll();
// ---------------- the old All tools row: every item now has a home inside a ▾ or More ----------------
await gone('Removed by design','category row (All tools)','#all');
await gone('Removed by design','Professional map banner','#pmap');
await gone('Removed by design','layout switch inside the toolbar','#layBtn');
await gone('Removed by design','grip on the tool row','.pgrip');
total++;if((await p.locator('.minb').evaluateAll(e=>e.filter(x=>x.closest('#barbox')).length))===1)found++;else miss.push('Removed by design: exactly ONE minimise in the toolbar');
await tool('shapes');const shapeT=await menuOf('shape');
await p.click('#tb [data-id=more]');await wait(300);const MOREALL=await txt('#morecard *');await p.evaluate(()=>closeCards());
const ALL={Text:[['Box style','Box style'],['Plain look','Plain'],['Outline look','Outline'],['Soft card look','Soft card'],['Sticky note look','Sticky note'],['Callout look','Callout'],['Shadow card look','Shadow card'],['Layout','Layout'],['Two columns','Two columns'],['Three columns','Three columns'],['Auto width','Auto'],['Full width','Wide'],['Font','Font'],['Smaller text','90%'],['Larger text','150%'],['Title','Title'],['Heading 1','Heading 1'],['Heading 2','Heading 2'],['Heading 3','Heading 3'],['Body text','Body'],['Bullet list','Bullets'],['Star list','Star list'],['Numbered list','Numbers'],['Checklist','Checklist'],['Toggle list','Toggle list'],['Bold','Bold'],['Italic','Italic'],['Underline','Underline'],['Strikethrough','Strikethrough'],['Text colour','Text colour'],['Highlight','Highlight colour'],['Indent','Indent'],['Outdent','Outdent'],['Align left','Left'],['Align centre','Centre'],['Align right','Right'],['Quote','Quote'],['Callout','Callout'],['Code block','Code block'],['Inline code','Inline code'],['Divider','Divider']],
 Pen:['Pen','Ballpoint','Brush','Pencil','Marker','Highlighter','Black ink','Blue ink','Red ink','Green ink','Orange ink','Purple ink','Custom colours','Favourites','Fine','Medium',['Bold line','Bold'],'Exact thickness','Solid','Dashed','Dotted',['Feel & pressure','Pressure'],['Finger & gestures','Finger can draw'],'Layers',['Blank paper','Blank'],['Lined paper','Lined'],['Grid paper','Grid'],['Dotted paper','Dots'],['Paper size & zoom','Paper size'],'View as drawn'],
 Insert:['Camera','Divider',['File','File or PDF'],['Audio clip','Audio']],
 'Shapes & aids':['Freehand','Line','Arrow','Box','Oval','Triangle','Tape','Draw and hold','Snap shapes','Fill closed shapes','Ruler','Magnifier','Colour picker'],
 View:['Zoom in','Zoom out','Fit width','Grid lines','Dark mode'],Study:['Summary','Quiz me','Flashcards','Mark key term','Review today'],File:['Export PDF','Share','Duplicate page','Move page','Version history']};
const BLOB={Text:TEXTALL,Pen:rowPen+typeT+sizeT+colT+favT+feelT,Insert:insT,'Shapes & aids':shapeT+feelT+colT,View:MOREALL,Study:MOREALL,File:MOREALL};
for(const t of Object.keys(ALL))for(const it of ALL[t]){const [nm,re]=Array.isArray(it)?it:[it,it];chkT('Old All tools > '+t,BLOB[t],[re]);}
// the removed Insert > Drawing items must not be back in the Insert card
total++;if(!/Drawing|Shape|Ruler|Magnifier|Tape/.test(insT))found++;else miss.push('Insert card still has Drawing items');
await tool('text');
await p.click('#tb [data-id=more]');await wait(250);await p.click('#morecard [data-z=lay]');await wait(300);await chk('Layouts card','#laycard *',['Beginner','Professional','New layout','Rename','Duplicate','Reset to default','Delete','Use this layout','Cancel']);await p.keyboard.press('Escape');await p.evaluate(()=>closeCards());


const V4F=found,V4T=total;
// ---------- v5 additions ----------
// Elements (Insert ▾ > Elements)
await p.click('#tb [data-dd=insert]');await wait(250);await chk('Insert (v5)','#acard *',['Elements']);
await p.click('#acard [data-v=elements]');await wait(300);
await chk('Elements card','#elcard *',['Elements','Edit','Search elements','Recent','Study','Arrows','Emoji','Badges','GIFs','Mine','Close']);
const ELN={Study:['Big idea','Warning','Question','Well done','Favourite','Book','Goal','Deadline'],Arrows:['Arrow right','Arrow left','Arrow up','Arrow down','Bent arrow','Curved arrow','Diagonal arrow','Loop arrows'],Emoji:['Smile','Love it','Party','Thumbs up','On fire','Brain','Rocket','Wow'],Badges:['Must know','Revise','Easy','Hard','Exam','New','Mastered','Tricky'],GIFs:['Spinning star','Beating heart','Bouncing ball','Sparkles','Waving hand','Confetti']};
for(const k of Object.keys(ELN)){await p.click('#elcard .ctab[data-cat='+k+']');await wait(100);await chk('Elements '+k,'#elcard .eltile',ELN[k])}
await p.click('#elcard [data-el=edit]');await wait(150);await chk('Elements edit','#elcard *',['Done','Move','Rename','Delete','Add your own']);
await p.click('#elcard [data-el=edit]');
await p.fill('#elQ','arrow');await wait(100);await chk('Elements search','#elcard *',['Clear search','Arrow right','Loop arrows']);
await p.click('#elClr');await p.click('#elcard [data-el=close]');
await p.evaluate(()=>elInsert('el-bulb'));
await p.click('#tb [data-dd=insert]');await wait(250);await p.click('#acard [data-v=elements]');await wait(300);await p.click('#elcard .ctab[data-cat=Recent]');await wait(150);
await chk('Recent elements row','#elcard *',['Recent','Big idea']);
await closeAll();
total++;if(await p.evaluate(()=>typeof ACHIP['See all elements']!=='undefined'))found++;else miss.push('See all elements hook');
// Beginner
await p.click('[data-sh-mode=beg]');await wait(300);
await tool('pen');
const bT=await menuOf('pentype');
await openDD('feel');await wait(200);
chkT('Beginner Feel card',(await txt('#acard *'))+bT+await txt('#opts *'),['Pen type','Pen','Ballpoint','Brush','Pencil','Marker','Highlighter','Pressure','Stabilisation','Settings','Pen settings','Writing aids','Math assist','Page style','Preview of the current pen']);
await p.click('#acard [data-v7=tune]');await wait(200); /* v7: Pen settings = the Fine-tune row in the Feel section; Line style is a 3-way control there */
let lsT='';
chkT('Beginner Pen settings',await txt('#acard *')+lsT,['Exact thickness','Solid','Dashed','Dotted','Tip sharpness','Tilt widens the line','Thickness by speed']);await p.click('#acard [data-v7=tune]');await wait(150);
await p.click('#acard [data-v7seg="feel:aids"]');await wait(250);await chk('Beginner Writing aids','#acard *',['Finger can draw','Automatic','Always','Never','Scribble to erase','Circle to lasso','Reduce latency']);
await p.click('#acard [data-v7seg="feel:math"]');await wait(250);const bMath=await txt('#acard *');await chk('Beginner Math assist','#acard *',['Ruler','Magnifier','Draw and hold']);
await closeAll();
await tool('shapes');const bShape=await menuOf('shape');
chkT('Beginner Shape ▾ (Draw as)',bShape,['Draw as','Freehand','Line','Arrow','Rectangle','Circle']);
chkT('Beginner Draw shape',await txt('#opts *')+bMath+bShape,['Shapes','Draw and hold','Snap shapes','Fill closed shapes','Shape','Ruler']);
chkT('Professional-only shapes (Box, Oval, Triangle, Tape) are inside the Pro Shape ▾',shapeT,['Box','Oval','Triangle','Tape']);
await chk('Beginner main bar','#tb *',['Undo','Redo','Minimise']);
await tool('text');ROWB=await txt('#opts *');FMTB=await cardOf('format');await openDD('box');BEGBOX=await menuTxt();await closeAll();
gone('Beginner Text row','Style/List quick picks hidden in Beginner','[data-dd=style],[data-dd=list]');
await has('Minimise','one minimise at the end of the main bar','#tb .minsep + .minb');
await gone('Minimise','no minimise on the tool row','#opts .minb');

// ---------- mapping.md: one probe per row ----------
const BL={ROWP,ROWB,BOXBOX,BOXLAY,FMT,FMTB,STYLE:styleT,LIST:listT,BOXMENU,BEGBOX};
fs.writeFileSync(D+'v8/mapping.md',mapMd());
const V6M0=found,V6M1=total;
for(const [o,old,nw,k,re] of MAP){total++;if(new RegExp(re,'i').test(BL[k]||''))found++;else miss.push('Mapping: '+o+' -> '+nw+' ('+k+' lacks '+re+')')}
const MAPN=total-V6M1;
// ---------- NEW v6 layout checks ----------
const V5T=found,V5N=total;
async function layoutChecks(W,H,mode){await p.setViewportSize({width:W,height:H});await p.click('[data-sh-mode='+mode+']');await wait(400);
 for(const t of ['text','pen','eraser','shapes','lasso']){await tool(t);
  const r=await p.evaluate(()=>{const bb=document.querySelector('#barbox'),over=[...bb.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).display!=='inline'&&e.clientWidth>0).map(e=>e.className+':'+e.scrollWidth+'>'+e.clientWidth);
   return{over,h:Math.round(bb.getBoundingClientRect().height),sw:document.documentElement.scrollWidth,iw:innerWidth}});
  total++;if(r.over.length===0&&r.sw<=r.iw)found++;else miss.push('No horizontal scroll/overflow ('+mode+' '+t+' @'+W+'): '+JSON.stringify(r));
  total++;if(r.h<=98)found++;else miss.push('Toolbar height <= ~96 ('+mode+' '+t+' @'+W+'): '+r.h)}}
await layoutChecks(1180,820,'beg');await layoutChecks(1180,820,'pro');await layoutChecks(820,1180,'beg');await layoutChecks(820,1180,'pro');
// every dropdown has a close button and 44 px buttons; no control twice across rows + More
await p.setViewportSize({width:1180,height:820});
const DDS={text:['box','format','style','list'],pen:['pentype','size','colour','feel','fav'],eraser:['emode','esize','eopt'],shapes:['shape','size','colour'],lasso:['lsel','lmenu','llayers','lshape','lact']};
for(const mode of ['beg','pro']){await p.click('[data-sh-mode='+mode+']');await wait(400);
 for(const t of Object.keys(DDS)){await tool(t);
  for(const id of DDS[t]){if(!(await p.locator('[data-dd='+id+']').count()))continue;
   await openDD(id);
   const r=await p.evaluate(()=>{const els=['#more','#acard','#lcard','#elcard','#morecard'].map(s=>document.querySelector(s)).filter(e=>e&&e.classList.contains('show'));if(!els.length)return null;const e=els[0];
    const xs=[...e.querySelectorAll('button,[role=switch]')].filter(x=>x.getClientRects().length&&!x.disabled);
    const small=xs.filter(x=>{const q=x.getBoundingClientRect();return q.width>0&&(q.height<43.5||q.width<43.5)}).map(x=>(x.getAttribute('aria-label')||x.textContent.trim()).slice(0,24)+' '+Math.round(x.getBoundingClientRect().width)+'x'+Math.round(x.getBoundingClientRect().height));
    return{id:e.id,close:!!e.querySelector('.ch [data-a=close],.ch [data-l=close],.ch [data-mx],.ch [data-g=x],.ch [data-z=x],.ch [data-el=close]'),small}});
   total++;if(r&&r.close)found++;else miss.push('Dropdown has a close button ('+mode+' '+t+' '+id+')');
   total++;if(r&&r.small.length===0)found++;else miss.push('Dropdown buttons >= 44px ('+mode+' '+t+' '+id+'): '+(r&&r.small.slice(0,4).join('; ')));
   await p.evaluate(()=>closeCards());await wait(100)}
  // no duplicate labels across the row(s) and More
  await p.click('#tb [data-id=more]');await wait(250);
  const dup=await p.evaluate(()=>{const labs=[...document.querySelectorAll('#tb button,#opts button,#morecard button.mrow,#morecard .chip,#morecard .tile')].filter(e=>e.getClientRects().length).map(e=>(e.getAttribute('aria-label')||e.textContent).trim().replace(/:.*$/,'')).filter(Boolean).filter(l=>!['Style','List','Bold','Italic'].includes(l));const c={};labs.forEach(l=>c[l]=(c[l]||0)+1);return Object.entries(c).filter(([k,v])=>v>1).map(([k,v])=>k+'x'+v)});
  total++;if(dup.length===0)found++;else miss.push('No duplicate control labels ('+mode+' '+t+'): '+dup.join(', '));
  await p.evaluate(()=>closeCards())}}
const V8N0=total,V8F0=found;
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

console.log('COVERAGE v8 probes (M1-M3, V1, V3, V4)',(found-V8F0)+'/'+(total-V8N0));
console.log('REMOVED BY DESIGN (verified gone above): category row, Professional map banner, layout switch, grips, extra minimise buttons, Paper chips in More');
console.log('COVERAGE v5-equivalent probes',V5T+'/'+V5N);console.log('COVERAGE new v6 layout probes',(V8F0-V5T)+'/'+(V8N0-V5N));console.log('MAPPING rows',MAPN,'passed',found-V6M0-0);console.log('COVERAGE total',found+'/'+total);console.log('COVERAGE',found+'/'+total);console.log('MISSING:\n'+miss.join('\n'));console.log('ERRORS:\n'+errs.join('\n'));await b.close();
