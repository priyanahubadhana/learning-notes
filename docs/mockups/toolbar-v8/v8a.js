/* ============ v8a: M1–M3 and the v7 card system on every remaining surface (V3) ============
   M1 the Box card opens beside the selected box, on the side away from it.
   M2 the text box's own bar loses its second minimise.
   M3 the top-bar Done is gone (build.cjs): notes save by themselves and the bar already says Saved.
   V3 bars, sheets, dialogs, the Layouts card, More and the list menus all use the v7 frame, wells, labels and controls (v8.css). */
const V8={noFb:0,audit:['Box bar','Text selection bar (mini and micro)','Lasso / picture selection bar and its More, Colour, Thickness, Resize, Edit strips','Keyboard bar','Mini keys','Write pad','Reader bar',
 'Box grip menu and every list menu (rows in wells)','More (the all-tools panel)','Layouts card','Toolbar settings sheet','Customise sheet','Help sheet','Reading look sheet','Arrange the menu sheet',
 'Dialogs: New layout, Rename, Delete, Add a picture, New recall card, Handwriting, Link, Save as preset, Save to notes, Screenshot','Elements card tabs','Toast','Tooltip']};
laycard.classList.add('pv');
I.starplus='<path d="M11.5 3.2a.55.55 0 0 1 1 0l2.2 4.6 5 .7a.55.55 0 0 1 .3.95l-1.6 1.6"/><path d="M8 15.9 6.4 20.4a.55.55 0 0 0 .8.6L12 18.4l1.2.6"/><path d="M6.6 14.5 4 11.9a.55.55 0 0 1 .3-.95l5-.7 1-2.1"/><path d="M18 14v6M15 17h6"/>';
I.grip2='<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>';

/* ---- M2: one minimise per screen area. The box bar is small, sits off the box, and goes away when you tap elsewhere ---- */
boxBarHtml=function(){const pro=isPro(),v=curV(),nm=styleName(v);
 const ib=(k,ic,l,cls)=>'<button type="button" data-b="'+k+'" aria-label="'+l+'" data-tip="'+l+'"'+(cls?' class="'+cls+'"':'')+'>'+svg(ic)+(pro?'':'<span>'+l+'</span>')+'</button>';
 return(pro?'<button type="button" class="bbst" data-b="style" aria-label="Style: '+esc(nm)+'" data-tip="Box style: '+esc(nm)+'">'+bprev(v)+'<span>Style</span></button><span class="vs"></span>':'')+
  ib('dup','dup','Duplicate')+(pro?ib('cut','scissors','Cut'):'')+ib('copy','copy','Copy')+ib('del','trash','Delete','dz')+(pro?ib('more','more','More'):'')};
delete MINS.box;ST.min.box=false;document.body.classList.remove('mz-box');

/* ---- M1: beside the box, never over it. Right of the box, else left, else under it, else above it ---- */
function v8Beside(w,h,br,top0){const m=8,g=12,tab=innerWidth<=640?(parseFloat(css('--sh-tabbar'))||56)+12:0,bot=innerHeight-10-tab;
 const A={l:br.left-8,r:br.right+8,t:br.top-52,b:br.bottom+10},yS=Math.max(top0,Math.min(br.top-8,bot-h));
 if(A.r+g+w<=innerWidth-m)return{x:A.r+g,y:yS,max:0,side:'right'};
 if(A.l-g-w>=m)return{x:A.l-g-w,y:yS,max:0,side:'left'};
 const below=bot-(A.b+g),above=(A.t-g)-top0,x=Math.max(m,Math.min(br.left,innerWidth-w-m));
 if(below>=Math.min(h,240)||below>=above)return{x,y:A.b+g,max:Math.max(150,below),side:'below'};
 return{x,y:Math.max(top0,A.t-g-Math.min(h,above)),max:Math.max(150,above),side:'above'}}
const v8BoxFor=el=>{if(el!==acard||!el.classList.contains('show'))return null;const a=V.anchorEl&&V.anchorEl.isConnected&&V.anchorEl.classList.contains('box')?V.anchorEl:null;return a||(V.dd==='box'?curBox():null)};
{const pc8=placeCard;placeCard=function(el){pc8(el);el._v8max=0;const b=v8BoxFor(el);if(!b){if(el===acard)delete el.dataset.side;return}
 const hr=$('#bars').getBoundingClientRect(),p=v8Beside(el.offsetWidth,el.offsetHeight,b.getBoundingClientRect(),opts.getBoundingClientRect().bottom+8);
 el.style.left=Math.round(p.x-hr.left)+'px';el.style.top=Math.round(p.y-hr.top)+'px';el.dataset.arrow='';el.dataset.side=p.side;el._v8max=p.max}}
{const ft8=fitCard;fitCard=function(el){ft8(el);if(!el||!el._v8max)return;const pane=$('.cpane',el);if(!pane)return;
 const lim=el._v8max-(el.offsetHeight-pane.offsetHeight);if(pane.offsetHeight>lim){pane.style.maxHeight=Math.max(120,Math.floor(lim))+'px';v7Fade(pane)}}}
/* the Beginner Box picker is a menu: it steps aside the same way when it would cover the box */
function v8MenuAside(){const b=V.menuFor==='box'?curBox():null;if(!b||!menu.classList.contains('show'))return;const r=menu.getBoundingClientRect(),br=b.getBoundingClientRect();
 if(r.left>br.right+8||r.right<br.left-8||r.top>br.bottom+10||r.bottom<br.top-52)return;
 const p=v8Beside(r.width,r.height,br,opts.getBoundingClientRect().bottom+8);menu.style.left=Math.round(p.x)+'px';menu.style.top=Math.round(p.y)+'px';menu.dataset.arrow='';
 if(p.max){const pane=$('.cpane',menu);if(pane)pane.style.maxHeight=Math.max(120,p.max-(r.height-pane.offsetHeight))+'px'}}

/* ---- V3: wells. Runs of rows become one tonal group with hairlines between (design-study 3.4) ---- */
function v8Wells(root,sel,cls){if(!root)return;[...root.children].forEach(c=>{if(!c.matches(sel)||c.parentElement!==root)return;const prev=c.previousElementSibling;
  if(prev&&prev.classList.contains(cls||'v7grp')&&prev.dataset.v8w){prev.append(c);return}
  const g=document.createElement('div');g.className=cls||'v7grp';g.dataset.v8w='1';c.before(g);g.append(c)})}
/* list menus (box grip menu, selection More, Actions, eraser options): rows sit in wells; Delete reads as danger */
{const om8=openMenu;openMenu=function(items,anchor,title){const r=om8.call(this,items,anchor,title);const pane=$('.cpane',menu);
 if(pane&&menu.dataset.v7==='list'){v8Wells(pane,'.mrow2');$$('.mrow2',pane).forEach(x=>{if(/^Delete/.test(x.textContent.trim()))x.classList.add('dz')})}
 v8MenuAside();if(typeof v8Minis==='function')v8Minis(menu);return r}}
/* More = the all-tools panel */
{const rm8=renderMore;renderMore=function(){rm8();if(!MC.open)return;const pane=$('.cpane',morecard);if(!pane)return;if(typeof v8MoreRows==='function')v8MoreRows(pane);v8Wells(pane,'.mrow');if(typeof v8Minis==='function')v8Minis(morecard);v7Fade(pane)}}
/* Layouts card: manage buttons are actions, not a choice */
{const rl8=renderLay;renderLay=function(){rl8();$$('.chips',laycard).forEach(c=>{if(c.querySelector('[data-ly],[data-l],.dz')||/Rename|Duplicate/.test(c.textContent))c.classList.add('acts')});
 $$('.lyfoot .sq',laycard).forEach(b=>{const ok=b.classList.contains('ok');b.setAttribute('aria-label',b.getAttribute('aria-label')||(ok?'Use this layout':'Cancel'));if(!b.querySelector('svg'))b.innerHTML=svg(ok?'check2':'xmark')})}}

/* ---- V3: sheets and dialogs. Same words where they were right, corrected where the row they named is gone ---- */
const V8TXT=[['Beginner shows a few tools. Professional adds a slim All tools row.','Beginner shows the essentials. Professional adds more choices inside every ▾.'],['Everything + All tools row','Every choice in every ▾'],[' + All tools row',' · more in every ▾'],
 ['<b>Show All tools row</b><span class="muted">The slim tabbed row under the toolbar.</span>','<b>Professional choices</b><span class="muted">More choices inside every ▾. Off keeps the essentials.</span>']];
function v8Sheet(){if(!sheet.classList.contains('show'))return;
 $$('.srow',sheet).forEach(r=>{if(r.querySelector(':scope>.seg')&&r.querySelector(':scope>.seg').children.length>2)r.classList.add('v8tall')});
 $$('.srow',sheet).forEach(r=>{if(r.children.length===1&&r.firstElementChild.classList.contains('t')&&!r.querySelector('button,input,.prev'))r.classList.add('v8head')});
 v8Wells(sheet,'.srow:not(.v8head)','v8well');
 $$('.srow .sq',sheet).forEach(b=>{const t=b.textContent.trim();if(t==='↑'||t==='↓')b.innerHTML=svg(t==='↑'?'up':'down')});
 $$('input[type=range]',sheet).forEach(v7Range);
 if(typeof v8Minis==='function')v8Minis(sheet)}
{const os8=openSheet;openSheet=function(html,foot,fn){V8TXT.forEach(([a,b])=>{html=html.split(a).join(b)});const r=os8(html,foot,fn);v8Sheet();return r}}
sheet.addEventListener('input',e=>{if(e.target&&e.target.type==='range')v7Range(e.target)});
