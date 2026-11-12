/* ============ v7: premium ▾ cards ============
   Same bars, same ▾ buttons, same features as v6. What changes is every card that opens from a ▾:
   one frame (v7.css), one anchor rule, one motion, one selection language, and visual controls in place of text lists.
   See v7/design-study.md. */
const V7={tok:0,next:null,seg:{feel:'feel',format:'text'},tune:false,rowKey:'',rowHtml:null,view:''};
PNAME.Fountain='Fountain pen'; /* "Pen" next to "Ballpoint" read as the same thing: say which pen it is */
const v7RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const v7ic=n=>I[n]?svg(n):svg('help');
[acard,lcard,elcard,morecard,menu].forEach(e=>e&&e.classList.add('pv'));

/* ---- small visuals ---- */
function v7Sample(k,col,W,H){W=W||66;H=H||22;const N=26,pts=[],f=n=>n.toFixed(1);
 for(let i=0;i<=N;i++){const t=i/N;pts.push([6+t*(W-12),H/2+Math.sin(t*Math.PI*2+.5)*H*.25,t])}
 const line='M'+pts.map(p=>f(p[0])+' '+f(p[1])).join('L');
 const outline=wf=>{const L=[],Rr=[];pts.forEach((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(N,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,w=Math.max(.5,wf(p[2],dy/n))/2;L.push([p[0]-dy/n*w,p[1]+dx/n*w]);Rr.push([p[0]+dy/n*w,p[1]-dx/n*w])});
  return'M'+L.map(q=>f(q[0])+' '+f(q[1])).join('L')+'L'+Rr.reverse().map(q=>f(q[0])+' '+f(q[1])).join('L')+'Z'};
 const ends=t=>Math.min(1,t*7,(1-t)*7),st=(w,cap,op)=>'<path d="'+line+'" style="fill:none;stroke:'+col+';stroke-width:'+w+';stroke-linecap:'+cap+';stroke-linejoin:round;opacity:'+op+'"/>';let b;
 if(k==='pen')b='<path d="'+outline((t,s)=>(1+3.2*Math.abs(s))*ends(t))+'" style="fill:'+col+';stroke:none"/>';
 else if(k==='brush')b='<path d="'+outline(t=>.6+5.4*Math.pow(Math.sin(Math.PI*t),1.3))+'" style="fill:'+col+';stroke:none;opacity:.94"/>';
 else if(k==='ball')b=st(1.6,'round',1);
 else if(k==='pencil')b=st(2.8,'round',.28)+'<path d="'+line+'" style="fill:none;stroke:'+col+';stroke-width:1.4;stroke-linecap:round;stroke-dasharray:2.2 .5;opacity:.85"/>';
 else if(k==='marker')b=st(5,'butt',1);
 else b=st(9,'butt',.5);
 return'<svg class="v7smp" viewBox="0 0 '+W+' '+H+'" aria-hidden="true">'+b+'</svg>'}
const v7Lw=(w,col)=>'<i class="v7lw" style="height:'+Math.max(1.5,w).toFixed(1)+'px;background:'+col+'"></i>';
const v7PenVis=(pen,col)=>'<span class="v7pen">'+penSvg(TYPEK[pen],col)+'</span>'+v7Sample(TYPEK[pen],col);
function v7Prev(){const s=bpStroke(),at=Object.entries(s.o).map(([k,v])=>k+'="'+v+'"').join(' ');
 return'<div class="v7prevw"><svg class="v7prev" viewBox="0 0 300 84" role="img" aria-label="Live preview of your pen"><path class="bpg" d="M10 28h280M10 56h280"/><path class="v7stroke" d="'+s.d+'" '+at+'/></svg></div>'}
function v7PrevApply(){const ps=$$('.v7stroke').filter(p=>!p.closest('.v7ghost'));if(!ps.length)return;const s=bpStroke();
 ps.forEach(p=>{p.setAttribute('d',s.d);['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','stroke-dasharray'].forEach(a=>{if(s.o[a]!=null)p.setAttribute(a,s.o[a]);else p.removeAttribute(a)})})}
const v7Paper=()=>clab('Page style')+'<div class="tiles v7papers" role="radiogroup" aria-label="Page style">'+Object.entries(PAPER_N).map(([k,n])=>'<button type="button" class="tile'+(PN.paper===k?' on':'')+'" role="radio" aria-checked="'+(PN.paper===k)+'" data-v7="paper" data-v="'+k+'" aria-label="'+n+' paper"><i class="v7pp '+k+'"></i><span>'+n+'</span></button>').join('')+'</div>';
const v7Ls=()=>clab('Line style')+'<div class="chips" role="radiogroup" aria-label="Line style">'+Object.entries(LS_N).map(([k,n])=>'<button type="button" class="chip'+(PN.ls===k?' on':'')+'" role="radio" aria-checked="'+(PN.ls===k)+'" data-v7="ls" data-v="'+k+'"><i class="v7lsg '+k+'"></i><span>'+n+'</span></button>').join('')+'</div>';
function v7Segs(key,arr){const cur=arr.some(x=>x[0]===V7.seg[key])?V7.seg[key]:(V7.seg[key]=arr[0][0]),i=arr.findIndex(x=>x[0]===cur);
 return'<div class="v7seg" role="tablist" aria-label="Sections" style="--n:'+arr.length+';--i:'+i+'">'+arr.map(([k,n,al])=>'<button type="button" role="tab" data-v7seg="'+key+':'+k+'" aria-selected="'+(k===cur)+'" aria-label="'+(al||n)+'"'+(k===cur?' class="on"':'')+'>'+n+'</button>').join('')+'</div>'}
const v7Pane=(key,k,h)=>'<div class="v7pane'+(V7.seg[key]===k?' on':'')+'" data-pane="'+k+'" role="tabpanel">'+h+'</div>';

/* ---- one menu builder: rows become tiles, swatches, style samples or switches; the frame and the anchor are shared ---- */
function v7Menu(id,b,items,title,o,force){V7.next=Object.assign({id},o||{});try{ddMenu(id,b,items,title,force)}finally{V7.next=null}}
{const om1=openMenu;openMenu=function(items,anchor,title){const o=V7.next||{};V7.next=null;V7.tok++;const r=om1.call(this,items,anchor,title);v7Dress(items||[],anchor,o);return r}}
function v7Dress(items,anchor,o){const lay=o.lay||'list',pane=$('.cpane',menu),rows=$$('.mrow2',pane),its=items.filter(x=>x&&!x.h),tok=V7.tok;
 menu.classList.add('pv');menu.dataset.v7=lay;menu.style.setProperty('--cols',o.cols||3);
 if(o.pre)pane.insertAdjacentHTML('afterbegin',o.pre);if(o.note)pane.insertAdjacentHTML('beforeend','<p class="enote">'+o.note+'</p>');
 rows.forEach((r,i)=>{const it=o.id?(its[i]||{}):{};
  if(lay==='tiles'||it.vis!=null){const first=r.firstElementChild,v=document.createElement('span');v.className='v7vis';if(it.vis!=null){v.innerHTML=it.vis;first.replaceWith(v)}else{first.replaceWith(v);v.append(first)}}
  if(it.sub)r.dataset.sub=it.sub;if(it.k)r.dataset.k=it.k;if(it.cls)r.classList.add(...it.cls.split(' '));if(it.span)r.style.gridColumn='span '+it.span;
  if(it.sw){r.setAttribute('role','switch');r.setAttribute('aria-checked',!!it.on);r.insertAdjacentHTML('beforeend','<span class="sw2" aria-hidden="true"></span>');r.classList.remove('on')}
  if(o.pick&&!it.stay&&!it.sw&&!r.disabled)r.onclick=()=>{rows.forEach(x=>{x.classList.remove('on','v7pop');x.removeAttribute('aria-current')});r.classList.add('on');if(!v7RM())r.classList.add('v7pop');
   if(it.f)it.f();setTimeout(()=>{if(V7.tok===tok&&menu.classList.contains('show'))closeMenu()},v7RM()?0:190)}});
 const last=pane.lastElementChild;if(last&&last.classList.contains('clab'))last.classList.add('enote');
 if(anchor&&anchor.closest&&anchor.closest('#opts')){const r=anchor.getBoundingClientRect(),top=opts.getBoundingClientRect().bottom+8,w=menu.offsetWidth,left=Math.max(12,Math.min(r.left,innerWidth-w-12));
  pane.style.maxHeight=Math.max(140,innerHeight-top-78)+'px';menu.style.top=Math.round(top)+'px';menu.style.left=Math.round(left)+'px';
  menu.style.setProperty('--ax',Math.max(24,Math.min(w-24,r.left+r.width/2-left))+'px');menu.dataset.arrow='1';anchor.classList.add('open');anchor.setAttribute('aria-expanded','true')}
 else menu.dataset.arrow='';
 v7Fade(pane)}

/* ---- closing: the card fades out where it stood (a copy fades, the real one is already gone) ---- */
function v7Ghost(el,rect){if(v7RM())return;const g=el.cloneNode(true);g.removeAttribute('id');$$('[id]',g).forEach(x=>x.removeAttribute('id'));g.classList.add('v7ghost','show');g.setAttribute('aria-hidden','true');g.inert=true;
 if(rect){if(!rect.width)return;g.style.position='fixed';g.style.left=rect.left+'px';g.style.top=rect.top+'px';g.style.width=rect.width+'px';g.style.margin='0'}
 document.body.append(g);setTimeout(()=>g.remove(),170)}
{let was=false;new MutationObserver(()=>{const on=menu.classList.contains('show');if(was&&!on){v7Ghost(menu);$$('#opts .v6b.open').forEach(c=>{if(c.dataset.dd!==V.dd){c.classList.remove('open');c.setAttribute('aria-expanded','false')}})}was=on}).observe(menu,{attributes:true,attributeFilter:['class']})}
{const ra7=renderAcard;renderAcard=function(){const was=acard.classList.contains('show'),rc=was?acard.getBoundingClientRect():null;ra7();const on=acard.classList.contains('show');
 if(was&&!on)v7Ghost(acard,rc);
 if(on&&was&&V7.view!==acard.dataset.view&&!v7RM()){acard.style.animation='none';void acard.offsetWidth;acard.style.animation=''}
 V7.view=on?acard.dataset.view:''}}
{const rl7=renderLcard;renderLcard=function(){const was=lcard.classList.contains('show'),rc=was?lcard.getBoundingClientRect():null;rl7();if(was&&!lcard.classList.contains('show'))v7Ghost(lcard,rc)}}

/* ---- one anchor rule: the card hangs 8 px under the toolbar, its left edge on the ▾ that opened it, a small arrow on that ▾ ---- */
{const pc7=placeCard;placeCard=function(el){pc7(el);if(!el.classList.contains('show'))return;
 if(V.anchorEl&&ddAnchor()===V.anchorEl){el.dataset.arrow='';return}
 const hr=$('#bars').getBoundingClientRect(),a=ddAnchor(),r=a.getBoundingClientRect(),w=el.offsetWidth,inRow=!!a.closest('#opts');
 el.style.top=Math.round((inRow?opts.getBoundingClientRect().bottom:r.bottom)-hr.top+8)+'px';
 const left=parseFloat(el.style.left)||0,cx=r.left+r.width/2-hr.left-left;el.style.setProperty('--ax',Math.max(24,Math.min(w-24,cx))+'px');el.dataset.arrow=a.closest('#opts,#tb')&&cx>=16&&cx<=w-16?'1':''}}

function v7Fade(p){if(!p)return;p.classList.toggle('v7more',p.scrollHeight-p.clientHeight-p.scrollTop>6);p.classList.toggle('v7top',p.scrollTop>6)}
document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('cpane')&&t.closest('.pv'))v7Fade(t)},true);
{const ft7=fitCard;fitCard=function(el){ft7(el);if(el)v7Fade($('.cpane',el))}}
/* ---- after every card render: slider fills, tonal groups, and a small pop on what just became selected ---- */
function v7Range(r){const mn=+r.min||0,mx=+r.max||100;r.style.setProperty('--p',((+r.value-mn)/((mx-mn)||1)*100).toFixed(1)+'%')}
function v7Group(root){$$('.cpane,.csec,.v7pane',root).forEach(box=>{let grp=null;
  [...box.children].forEach(c=>{if(c.matches('.clab,h5,.v7pane,.csec,.v7prevw,.bxhead,canvas,.bpprev,.ctabs,.track,.v7grp')){grp=null;return}
   if(!grp){grp=document.createElement('div');grp.className='v7grp';c.before(grp)}grp.append(c)});
  $$(':scope>.v7grp',box).forEach(g=>{while(!g.querySelector('.slr')&&g.lastElementChild&&g.lastElementChild.classList.contains('enote'))g.after(g.lastElementChild);
   const k=[...g.children];if(!k.length){g.remove();return}
   if(k.every(x=>x.matches('.chips,.swatches,.tiles,.looks,.crow,.v7favs,.eltiles')))g.classList.add('bare')})})}
function v7Decor(el){$$('input[type=range]',el).forEach(v7Range);const ct=$('.ctabs:not([hidden])',el);if(ct&&el!==elcard)ct.style.setProperty('--n',ct.children.length);
 if(el===acard||el===lcard)v7Group(el)}
const v7Sig=e=>(e.getAttribute('aria-label')||e.textContent.trim())+'|'+(e.dataset.v||'')+'|'+(e.dataset.a||e.dataset.v6||e.dataset.v7||e.dataset.k||e.dataset.l||'');
{const fc7=fillCard;fillCard=function(el,html){const key=el.id+':'+(el.dataset.view||el.dataset.key||''),same=el._v7k===key,before=same?new Set($$('.on,[aria-checked=true]',el).map(v7Sig)):null;
 fc7(el,html);el._v7k=key;v7Decor(el);
 if(before&&!v7RM())$$('.on,[aria-checked=true]',el).forEach(e=>{if(!before.has(v7Sig(e)))e.classList.add('v7pop')})}}
document.addEventListener('input',e=>{const r=e.target;if(r&&r.type==='range'&&r.closest&&r.closest('.pv')){v7Range(r);v7PrevApply()}});

/* ---- the row: a ▾ whose value changed glows once; a ▾ whose menu is open looks open ---- */
{const ro7=renderOpts;renderOpts=function(){const key=V.tab+'|'+isPro(),old=V7.rowKey===key?V7.rowHtml:null;ro7();const now={};
 $$('#opts .v6b[data-dd]').forEach(c=>{const h=c.innerHTML;now[c.dataset.dd]=h;if(old&&old[c.dataset.dd]!=null&&old[c.dataset.dd]!==h&&!v7RM())c.classList.add('v7glow')});
 V7.rowKey=key;V7.rowHtml=now;
 if(menu.classList.contains('show')&&V.menuFor){const c=$dd(V.menuFor);if(c&&c.closest('#opts')){c.classList.add('open');c.setAttribute('aria-expanded','true');menuAnchor=c}}}}

/* ---- section switcher and the few v7 controls ---- */
document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;const s=t.closest('[data-v7seg]');
 if(s){const [key,k]=s.dataset.v7seg.split(':'),card=s.closest('.pv'),bar=s.parentElement;V7.seg[key]=k;bar.style.setProperty('--i',[...bar.children].indexOf(s));
  [...bar.children].forEach(b=>{const on=b===s;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  $$('.v7pane',card).forEach(p=>p.classList.toggle('on',p.dataset.pane===k));const pane=$('.cpane',card);if(pane)pane.scrollTop=0;
  if(card===acard){placeCard(acard);fitCard(acard);placeCard(acard);if(key==='feel'&&k==='feel'&&isPro())drawPreview()}return}
 const b=t.closest('[data-v7]');if(!b||!acard.contains(b))return;const k=b.dataset.v7,v=b.dataset.v;
 if(k==='paper')setPaper(v);else if(k==='ls'){PN.ls=v;save()}else if(k==='tune')V7.tune=!V7.tune;else return;
 renderOpts()});

/* ============ Pen row ============ */
const V7SUB={Fountain:'Thick and thin',Ball:'Even line',Brush:'Soft, bold',Pencil:'Sketchy',Marker:'Broad tip',Highlighter:'See-through'};
function sizeColour(row){const pro=isPro(),isHl=R.pen==='Highlighter',cur=isHl?R.hlSize:R.size,exact=pro&&!isHl&&PN.exact!=null,W=isHl?HLW:SIZES,col=cdot(curCol()),
  px=exact?PN.exact:W[cur],d=Math.max(4,Math.min(16,isHl?px/1.7:px*2.4)).toFixed(0);
 B(row,'size','<span class="v7sz"><i style="width:'+d+'px;height:'+d+'px"></i></span><span>'+(exact?PN.exact+' px':cur)+'</span>','Size: '+(exact?PN.exact+' px':cur),
  (b,force)=>pro?ddCard('size',b,()=>{R.ctab.pen='stroke'}):v7Menu('size',b,[{h:'Size'},...['Fine','Medium','Bold'].map(n=>({t:n,on:cur===n,vis:v7Lw(isHl?W[n]*.55:W[n]*1.5,col),f:()=>{if(isHl)R.hlSize=n;else{R.size=n;PN.exact=null;save()}renderOpts()}}))],'Size',{lay:'tiles',cols:3,pick:1},force),'',pro?'dialog':'menu');
 B(row,'colour','<span class="v7cw" style="--c:'+col+'"></span><span>Colour</span>','Colour',
  (b,force)=>pro?ddCard('colour',b,()=>{R.ctab.pen='colour'}):v7Menu('colour',b,[{h:'Colour'},...(isHl?HLCOL:PENCOL).map(([n,c])=>({t:n,c:cdot(c),on:curCol()===c,f:()=>{if(isHl)R.hlCol=c;else R.penCol=c;renderOpts()}}))],'Colour',{lay:'swatches',cols:6,pick:1},force),'',pro?'dialog':'menu')}
function rowPen(row){const pro=isPro(),k=TYPEK[R.pen],isHl=R.pen==='Highlighter',tc=isHl?R.hlCol:cdot(R.penCol);
 B(row,'pentype','<span class="ptype pmini on">'+penSvg(k,tc)+'</span><span>'+pname(R.pen)+'</span>','Pen type: '+pname(R.pen),
  (b,force)=>v7Menu('pentype',b,[{h:'Pen type'},...PTYPES.map(n=>({t:pname(n),on:R.pen===n,sub:V7SUB[n],vis:v7PenVis(n,n==='Highlighter'?R.hlCol:cdot(R.penCol)),f:()=>{R.pen=n;renderOpts()}}))],'Pen type',{lay:'tiles',cols:3,pick:1},force));
 sizeColour(row);
 B(row,'feel',svg('sliders')+'<span>Feel</span>','Feel',b=>ddCard('feel',b,()=>{R.ctab.pen='feel';BP.view='main'}),'','dialog');
 const favs=isHl?HN.favs:PN.favs;
 B(row,'fav',svg('star')+'<span>Favourites</span>','Favourites',(b,force)=>{
  if(pro){ddCard('fav',b,()=>{R.ctab.pen='colour'});return}
  const applyF=f=>{R.pen=f.pen;if(f.pen==='Highlighter'){R.hlCol=f.col;R.hlSize=f.size}else{R.penCol=f.col;R.size=f.size;PN.exact=f.exact==null?null:f.exact}save();renderOpts()};
  v7Menu('fav',b,[{h:'Favourites'},...favs.map((f,i)=>({t:'Favourite '+(i+1)+': '+pname(f.pen),cls:'sr',sub:pname(f.pen)+' · '+f.size,vis:v7PenVis(f.pen,cdot(f.col)),f:()=>applyF(f)})),
   {t:'Save this pen as a favourite',cls:'sr add',sub:'Save this pen',stay:true,keep:true,vis:svg('plus'),f:()=>{if(favs.length>=6){toast('Up to 6 favourites');return}favs.push({pen:R.pen,col:isHl?R.hlCol:R.penCol,size:isHl?R.hlSize:R.size,exact:PN.exact});save();toast('Saved as a favourite');renderOpts();V.open.fav($dd('fav'),true)}}],
   'Favourites',{lay:'tiles',cols:3,pick:1,note:favs.length?'Tap a favourite to use its pen, colour and size.':'No favourites yet. Save the pen you like and it waits here.'},force)},'',pro?'dialog':'menu')}

/* ============ Shapes row ============ */
function rowShapes(row){const pro=isPro(),L=pro?[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Box','square'],['oval','Oval','oval'],['triangle','Triangle','triangle'],['tape','Tape','tape']]:[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Rectangle','square'],['oval','Circle','oval']];
 const cur=L.find(x=>x[0]===PN.shape)||L[1];
 B(row,'shape',svg(cur[2])+'<span>'+cur[1]+'</span>','Shape: '+cur[1],(b,force)=>v7Menu('shape',b,[{h:'Draw as'},...L.map(([v,n,ic])=>({t:n,on:PN.shape===v,vis:v7ic(ic),f:()=>{PN.shape=v;save();renderOpts();toast(v==='free'?'Pen draws freehand':v==='tape'?'Pen draws Tape now: drag a strip over what you want to hide':'Drag on the page to draw the '+n.toLowerCase())}}))],'Draw as',{lay:'tiles',cols:L.length>6?4:3,pick:1},force));
 sizeColour(row)}

/* ============ Eraser row ============ */
function rowEraser(row){const pro=isPro();
 if(pro){const M={precise:['Precise','crosshair','Exact spot'],standard:['Standard','eraser','Soft edge'],stroke:['Whole stroke','penLine','Whole line']},S=['Thin','Medium','Thick'],D=[10,18,28];
  B(row,'emode',svg(M[E.mode][1])+'<span>'+M[E.mode][0]+'</span>','Eraser mode: '+M[E.mode][0],(b,force)=>v7Menu('emode',b,[{h:'Eraser mode'},...Object.keys(M).map(m=>({t:M[m][0],on:E.mode===m,sub:M[m][2],vis:v7ic(M[m][1]),f:()=>{E.mode=m;saveE();renderOpts()}}))],'Eraser mode',{lay:'tiles',cols:3,pick:1},force));
  B(row,'esize','<span class="v7sz"><i style="width:'+(6+E.size*5)+'px;height:'+(6+E.size*5)+'px"></i></span><span>'+S[E.size]+'</span>','Eraser size: '+S[E.size],(b,force)=>v7Menu('esize',b,[{h:'Size'},...S.map((n,i)=>({t:n,on:E.size===i,vis:'<i class="v7edot" style="width:'+D[i]+'px;height:'+D[i]+'px"></i>',f:()=>{E.size=i;saveE();renderOpts()}}))],'Size',{lay:'tiles',cols:3,pick:1},force));
  const opt=(b,force)=>v7Menu('eopt',b,[{h:'Behaviour'},{t:'Erase highlights only',on:E.hlOnly,sw:true,keep:true,f:()=>{E.hlOnly=!E.hlOnly;saveE();renderOpts();V.open.eopt($dd('eopt'),true)}},
   {t:'Go back to the previous tool after one erase',on:E.ret,sw:true,keep:true,f:()=>{E.ret=!E.ret;saveE();renderOpts();V.open.eopt($dd('eopt'),true)}},{h:'Rubbing in the Magnifier pad also erases on the page.'}],'More eraser options',{lay:'list'},force);
  B(row,'eopt',svg('sliders')+'<span>Options</span>','More eraser options',opt)}
 else{const M={'Whole stroke':['penLine','Whole line'],'Partial':['eraser','Where you rub'],'Highlights only':['hlight','Keeps the ink']};
  B(row,'emode',svg('eraser')+'<span>'+R.eraser+'</span>','Eraser mode: '+R.eraser,(b,force)=>v7Menu('emode',b,[{h:'Eraser mode'},...Object.keys(M).map(n=>({t:n,on:R.eraser===n,sub:M[n][1],vis:v7ic(M[n][0]),f:()=>{R.eraser=n;renderOpts()}}))],'Eraser mode',{lay:'tiles',cols:3,pick:1},force))}}

/* ============ Lasso row ============ */
function rowLasso(row){const pro=isPro();
 if(pro){const sh=LSHAPE.find(x=>x[0]===ST.lasso.shape)||LSHAPE[0];
  B(row,'lsel',svg(sh[1])+'<span>Select</span>','Select: '+sh[2],b=>ddCard('lsel',b,()=>{R.ctab.lasso='select'}),'','dialog');
  B(row,'lmenu',svg('sliders')+'<span>Menu</span>','Selection menu',b=>ddCard('lmenu',b,()=>{R.ctab.lasso='menu'}),'','dialog');
  B(row,'llayers',svg('layers')+'<span>Layers</span>','Layers',b=>ddCard('llayers',b,()=>{R.ctab.lasso='layers'}),'','dialog')}
 else{B(row,'lshape',svg('lasso')+'<span>'+R.lassoMode+'</span>','Lasso shape: '+R.lassoMode,(b,force)=>v7Menu('lshape',b,[{h:'Lasso shape'},...[['Free','lasso','Draw a loop'],['Rectangle','square','Drag a box']].map(([n,ic,sub])=>({t:n,on:R.lassoMode===n,sub,vis:v7ic(ic),f:()=>{R.lassoMode=n;renderOpts()}}))],'Lasso shape',{lay:'tiles',cols:2,pick:1},force));
  B(row,'lact',svg('scan')+'<span>Actions</span>','Actions for the selection',(b,force)=>{const n=selCount();
   v7Menu('lact',b,[{h:'Actions'},{h:n?'Selected':'Draw a loop, then drag the selection or its corner dot.'},...[['Cut','cut'],['Copy','copy'],['Paste','paste'],['Duplicate','dup'],['Delete','del']].map(([t,k])=>({t,dis:!n&&k!=='paste',f:()=>lassoAct(k)})),
    {t:'Colour ▸',dis:!n,keep:true,f:()=>openMenu([{t:'‹ Back',keep:true,f:()=>V.open.lact($dd('lact'),true)},...LCOL.map(c=>({t:c==='auto'?'Automatic':c,c:cdot(c),f:()=>lassoAct('col',c)}))],$dd('lact'),'Colour')},
    {t:'Convert to text',dis:!n,f:()=>lassoAct('conv')},{t:'Screenshot',dis:!n,f:()=>lassoAct('shot')}],'Actions',{lay:'list'},force)})}}

/* ============ Text row ============ */
function rowText(row){const pro=isPro(),v=curV(),nm=styleName(v);
 const sep=()=>row.insertAdjacentHTML('beforeend','<i class="v6sep" aria-hidden="true"></i>');
 B(row,'box',bprev(v)+'<span>Box</span>','Box style: '+nm,(b,force)=>{
  if(pro)ddCard('box',b,()=>{R.ctab.text='box';ensureBox()});
  else v7Menu('box',b,[{h:'Box look'},...['plain','sticky','callout'].map(id=>{const p=PRESETS.find(x=>x[0]===id);return{t:p[1],on:sameV(p[2],curV()),vis:bprev(p[2]),f:()=>{setStyle(p[2],true);if(!curBox())toast('New boxes will be '+p[1]+'. Tap a box to change that box');renderOpts()}}})],'Box',{lay:'tiles',cols:3,pick:1},force)},'',pro?'dialog':'menu');
 sep();
 B(row,'format',svg('palette')+'<span>Format</span>','Format',b=>ddCard('format',b),'','dialog');
 sep();
 if(pro)B(row,'style','<span class="lab">Style:</span><span class="cur">'+nameOfBlock()+'</span>','Style: '+nameOfBlock(),(b,force)=>{const blk=curBlock(),bs=t=>()=>{blockStyle(t);renderOpts()};
  v7Menu('style',b,[{h:'Text style'},{t:'Title',k:'h1',on:blk==='h1',f:bs('h1')},{t:'Heading 1',k:'h2',on:blk==='h2',f:bs('h2')},{t:'Heading 2',k:'h3',on:blk==='h3',f:bs('h3')},{t:'Heading 3',k:'h4',on:blk==='h4',f:bs('h4')},{t:'Body',k:'div',on:blk==='div'||!blk,f:bs('div')},
   {t:'Quote',k:'blockquote',on:blk==='blockquote',f:()=>{TEXTACT.Quote();renderOpts()}},{t:'Code block',k:'pre',on:blk==='pre',f:()=>{TEXTACT['Code block']();renderOpts()}}],'Text style',{lay:'styles',pick:1},force)},'v6w');
 [['B','Bold','b','bold'],['I','Italic','i','italic']].forEach(([t,n,c,f])=>{const b=document.createElement('button');b.type='button';b.className='v6b v6fmt '+c;b.textContent=t;b.dataset.fmt=f;b.setAttribute('aria-label',n);b.setAttribute('aria-pressed','false');b.onclick=e=>{e.stopPropagation();v6Close();v6Sync();fmt(f);updateFmtState()};row.append(b)});
 if(pro)B(row,'list',svg('list')+'<span>List</span>','List',(b,force)=>{const T=(t,a,ic,span)=>({t,span,vis:v7ic(ic),f:()=>TEXTACT[a]()}),W=(t,ic)=>({t,span:3,cls:'wide',stay:true,keep:true,vis:v7ic(ic),f:()=>TEXTACT[t]()});
  v7Menu('list',b,[{h:'List'},T('Bullets','Bullet list','list',2),T('Numbers','Numbered list','olist',2),T('Checklist','Checklist','checks',2),T('Star list','Star list','star',3),T('Toggle list','Toggle list','toglist',3),W('Outdent','outdent'),W('Indent','indent')],'List',{lay:'tiles',cols:6,pick:1},force)})}

/* ---- Format ▾: one card, sections you switch between (no long scroll) ---- */
function formatHtml(){const pro=isPro(),v=curV(),bx=curBox(),ff=v.ff||'inherit',fsNow=parseFloat(bx?bx.style.getPropertyValue('--fs'):ST.boxDef.fs)||1,blk=curBlock();
 const A=(k,val,l,on,ic)=>chip('data-v6="'+k+'" data-v="'+val+'"',l,on,ic);
 const act=(attrs,l,ic)=>'<button type="button" class="chip" '+attrs+'>'+(ic?v7ic(ic):'')+'<span>'+l+'</span></button>',L=(a,l,ic)=>act('data-v6="act" data-v="'+a+'"',l,ic);
 const sec=(name,h)=>'<section class="csec" data-sec="f-'+name.toLowerCase().replace(/\W+/g,'')+'" aria-label="'+name+'">'+h+'</section>';
 const sws=(k,arr,label)=>'<div class="swatches" role="group" aria-label="'+label+'">'+arr.map(([n,c])=>'<button type="button" class="sw" style="background:'+cdot(c)+'" data-v6="'+k+'" data-v="'+c+'" aria-label="'+label+' '+n+'" data-tip="'+n+'"></button>').join('')+'</div>';
 const E=(cmd,g,n,st)=>'<button type="button" class="chip" data-v6="fmt" data-v="'+cmd+'" aria-label="'+n+'"><b style="'+st+'">'+g+'</b></button>';
 const sty=(attr,val,n,on)=>'<button type="button" class="v7sty'+(on?' on':'')+'" role="radio" aria-checked="'+!!on+'" data-v6="'+attr+'" data-v="'+val+'"><span>'+n+'</span>'+svg('check2')+'</button>';
 let T='',S='',P='',X='';
 if(pro)T+=sec('Font & size',clab('Font')+'<div class="chips v7fonts" role="radiogroup" aria-label="Font">'+FONTS.map(([n,fam],i)=>'<button type="button" class="chip'+(ff===fam?' on':'')+'" role="radio" aria-checked="'+(ff===fam)+'" data-v6="font" data-v="'+i+'" aria-label="'+n+'"><b style="font-family:'+fam.replace(/"/g,"'")+'">Aa</b><span>'+n+'</span></button>').join('')+'</div>'+
  clab('Size')+group('Size','five',FSIZES.map(z=>A('fsize',z,Math.round(z*100)+'%',Math.abs(fsNow-z)<.03)).join('')));
 else{const sz=bx?bx.dataset.size:(R.defSize||'body');T+=sec('Font & size',clab('Text size')+group('Text size','',[['Body','body'],['Heading','head'],['Small','small']].map(([n,k])=>A('bsize',k,n,sz===k)).join('')))}
 T+=sec('Emphasis',clab('Emphasis')+'<div class="chips'+(pro?' four':'')+' v7emph" role="group" aria-label="Emphasis">'+E('bold','B','Bold','font-weight:800')+E('italic','I','Italic','font-style:italic')+E('underline','U','Underline','text-decoration:underline')+(pro?E('strikeThrough','S','Strikethrough','text-decoration:line-through'):'')+'</div>'+
  clab('Text colour')+sws('tcol',PENCOL,'Text colour')+clab('Highlight colour')+sws('hcol',HLCOL,'Highlight colour')+
  (pro?clab('Marks')+'<div class="chips two acts" role="group" aria-label="More marks">'+act('data-a="mark" data-v="link"','Link','link')+act('data-a="mark" data-v="key"','Key point','tag')+'</div>':''));
 S+=sec('Style',clab('Style')+'<div class="v7stys" role="radiogroup" aria-label="Style">'+[...(pro?[['Title','h1']]:[]),['Heading 1','h2'],['Heading 2','h3'],['Heading 3','h4'],['Body','div']].map(([n,t])=>sty('blk',t,n,blk===t)).join('')+sty('act','Quote','Quote',blk==='blockquote')+sty('act','Code block','Code block',blk==='pre')+'</div>');
 S+=sec('Lists',clab('Lists')+'<div class="chips'+(pro?' four':'')+' acts" role="group" aria-label="Lists">'+L('Bullet list','Bullets','list')+L('Numbered list','Numbers','olist')+L('Checklist','Checklist','checks')+(pro?L('Star list','Star list','star')+L('Toggle list','Toggle list','toglist')+L('Outdent','Outdent','outdent')+L('Indent','Indent','indent'):'')+'</div>');
 S+=sec('Blocks',clab('Blocks')+'<div class="chips'+(pro?' four':'')+' acts" role="group" aria-label="Blocks">'+(pro?act('data-a="kind" data-v="plain"','Plain block','typeic')+L('Callout','Callout','quote'):'')+L('Divider','Divider','minus')+(pro?L('Inline code','Inline code','code'):'')+'</div>');
 P+=sec('Paragraph',clab('Alignment')+group('Alignment','four',alignCmds.map(([n,cmd,ic])=>A('fmt',cmd,n,false,I[ic]?ic:null)).join(''))+clab('Paragraph spacing')+group('Paragraph spacing','',[['Compact','compact'],['Normal','normal'],['Roomy','roomy']].map(([n,k])=>A('pgap',k,n,(bx&&bx.dataset.pgap||'normal')===k)).join('')));
 if(pro)X=sec('Advanced',clab('Line height')+group('Line height','',LHS_.map(([n,x])=>chip('data-a="lh" data-v="'+(x||'')+'"',n,(v.lh||null)===x)).join(''))+clab('Letter spacing')+group('Letter spacing','',[['Tight','-.02em'],['Normal',''],['Wide','.06em']].map(([n,x])=>A('ls',x||'normal',n,(bx&&bx.style.letterSpacing||'')===x)).join(''))+clab('Custom styles')+abtn('data-v6="savestyle"','Save as a custom style','plus')+clab('Clear')+abtn('data-v6="clear"','Clear formatting','rotcw'));
 const segs=v7Segs('format',[['text','Text'],['style','Style'],['para','Paragraph'],...(pro?[['adv','Advanced']]:[])]);
 return cheadX('Format','data-a="close"')+segs+cpane(v7Pane('format','text',T)+v7Pane('format','style',S)+v7Pane('format','para',P)+(pro?v7Pane('format','adv',X):''))}

/* ============ Pen cards (Professional): Size, Colour, Favourites, Feel ============ */
function colourTop(){const isHl=R.pen==='Highlighter',cur=curCol();
 return clab('Colours')+'<div class="swatches" role="radiogroup" aria-label="Colours">'+(isHl?HLCOL:PENCOL).map(([n,c])=>'<button type="button" class="sw'+(cur===c?' on':'')+'" role="radio" aria-checked="'+(cur===c)+'" style="background:'+cdot(c)+'" data-v6="col" data-v="'+c+'" aria-label="'+n+(isHl?' highlight':' ink')+'" data-tip="'+n+'"></button>').join('')+'</div>'+abtn('data-v6="picker"','Colour picker','palette','Pick from the page')}
function v7Favs(){const isHl=R.pen==='Highlighter',favs=isHl?HN.favs:PN.favs;
 return clab('Saved pens')+'<div class="v7favs">'+favs.map((x,i)=>{const c=cdot(x.col);return'<button type="button" class="fav v7fav" data-a="fav" data-i="'+i+'" aria-label="Favourite '+(i+1)+': '+pname(x.pen)+'"><span class="v7pen">'+penSvg(TYPEK[x.pen],c)+'</span>'+v7Sample(TYPEK[x.pen],c,60,18)+'<span>'+pname(x.pen)+'</span><small>'+(x.exact!=null?x.exact+' px':x.size)+'</small></button>'}).join('')+
  '<button type="button" class="v7fav add" data-a="savefav" aria-label="Save current">'+svg('plus')+'<span>Save current</span></button></div>'+enote('A favourite keeps the pen, colour and size. Tap to use, hold to remove.')}
function penView(view){const tmp=document.createElement('div');tmp.innerHTML=penCardHtml();
 const secEl=k=>tmp.querySelector('.csec[data-sec="'+k+'"]');
 const sec=k=>{const s=secEl(k);if(!s)return'';const c=s.cloneNode(true),h=c.querySelector('h5');if(h)h.remove();return c.innerHTML};
 const isHl=R.pen==='Highlighter',col=cdot(curCol()),fav='<div class="clab">Manage favourites</div>';let title,body='',segs='';
 if(view==='size'){title='Size';const cur=isHl?R.hlSize:R.size,W=isHl?HLW:SIZES;
  body=v7Prev()+clab('Size')+'<div class="chips v7sizes" role="radiogroup" aria-label="Size">'+['Fine','Medium','Bold'].map(n=>{const on=cur===n&&(isHl||PN.exact==null);return'<button type="button" class="chip'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-v6="size" data-v="'+n+'">'+v7Lw(isHl?W[n]*.55:W[n]*1.5,col)+'<span>'+n+'</span></button>'}).join('')+'</div>'+sec('stroke')}
 else if(view==='colour'){title='Colour';const c=sec('colour'),i=c.indexOf(fav);body=colourTop()+(i<0?c:c.slice(0,i)).replace('Your colours join the dots on the pill. Up to 6, newest first.','Keep up to 6 colours of your own. The newest comes first.')}
 else if(view==='fav'){title='Favourites';body=v7Favs()}
 else{title='Feel';const G=[];let g=null;[...secEl('feel').children].forEach(c=>{if(c.tagName==='H5')return;if(c.classList.contains('clab')){g={t:c.textContent,h:''};G.push(g)}else if(g)g.h+=c.outerHTML});
  const pick=ns=>G.filter(x=>ns.includes(x.t)).map(x=>x.t==='Line'?v7Ls():clab(x.t)+x.h).join('');
  const S=(k,l,on)=>swr('data-a="sw" data-o="pn" data-k="'+k+'"',l,on);
  const page=sec('page').replace(/<div class="clab">Page<\/div><button class="abtn pickchip" data-m="paper"[\s\S]*?<\/button>/,'');
  segs=v7Segs('feel',[['feel','Feel','Tip and response'],['aids','Aids','Writing aids'],['math','Math','Math assist'],['page','Page','Paper and layers']]);
  body=v7Pane('feel','feel','<canvas class="prev2" id="prev2" width="600" height="128" aria-label="Preview of the current pen"></canvas>'+pick(['Tip','Response','Line']))+
   v7Pane('feel','aids',pick(['Finger can draw','Gestures']))+
   v7Pane('feel','math',clab('Shape help')+S('hold','Draw and hold for a perfect shape',PN.hold)+S('snap','Snap shapes',PN.snap)+S('fill','Fill closed shapes',PN.fill)+clab('Tools')+swr('data-a="ruler"','Ruler',!$('#ruler').hidden)+swr('data-a="magnifier"','Magnifier',R.pad==='mag'))+
   v7Pane('feel','page',v7Paper()+page)}
 return{title,html:cheadX(title,'data-a="close"')+segs+cpane(body)}}

/* ============ Feel (Beginner): the same four sections, fewer controls in each ============ */
function bpFeel(){const isHl=R.pen==='Highlighter',c=PN,hn=HN;
 const S=(o,k,l,on)=>swr('data-a="sw" data-o="'+o+'" data-k="'+k+'"',l,on);
 let f=bpPreview();
 if(isHl)f+=slr('hop','Strength',20,90,5,hn.op,SLF.hop)+enote('How strongly the highlight covers the page.');
 else f+=slr('press','Pressure',0,100,5,c.pOn?c.press:0,SLF.press)+enote('Press harder for a thicker line.')+slr('smooth','Stabilisation',0,100,5,c.smooth,SLF.smooth)+enote('Smooths out a shaky hand.');
 f+=clab('More')+'<button type="button" class="abtn disc" data-v7="tune" aria-expanded="'+!!V7.tune+'" aria-label="Pen settings">'+svg('sliders')+'<span>Fine-tune</span><small>'+(isHl?'On the page':'Thickness, line, tip')+'</small>'+svg('chevD')+'</button>';
 if(V7.tune){if(isHl)f+=clab('On the page')+S('hn','snap','Snap to text lines',hn.snap)+S('hn','behind','Draw behind ink',hn.behind);
  else f+=clab('Thickness')+slr('exact','Exact thickness',0.5,30,0.5,c.exact!=null?c.exact:SIZES[R.size],SLF.exact)+(c.exact!=null?abtn('data-a="use3"','Use the 3 sizes','sliders'):'')+v7Ls()+
   clab('Tip')+slr('sharp','Tip sharpness',0,100,5,c.sharp,SLF.sharp)+(R.pen==='Fountain'?slr('flat','Flatness',0,100,5,c.flat,SLF.flat):'')+S('pn','tilt','Tilt widens the line',c.tilt)+S('pn','speed','Thickness by speed',c.speed)}
 const aids=clab('Finger can draw')+group('Finger can draw','',[['auto','Automatic'],['always','Always'],['never','Never']].map(([v,n])=>chip('data-a="set" data-o="pn" data-k="finger" data-v="'+v+'"',n,c.finger===v)).join(''))+
  clab('Gestures')+S('pn','scribble','Scribble to erase',c.scribble)+S('pn','c2l','Circle to lasso',c.c2l)+clab('Speed')+S('pn','latency','Reduce latency',c.latency)+enote('Smoother ink on a slower device. It can use more battery.');
 const math=clab('Shape help')+S('pn','hold','Draw and hold for a perfect shape',c.hold)+S('pn','snap','Snap shapes',c.snap)+S('pn','fill','Fill closed shapes',c.fill)+clab('Tools')+swr('data-a="ruler"','Ruler',!$('#ruler').hidden)+swr('data-a="magnifier"','Magnifier',R.pad==='mag');
 const segs=v7Segs('feel',[['feel','Feel'],['aids','Aids','Writing aids'],['math','Math','Math assist'],['page','Page','Page style']]);
 return'<div class="ch"><strong>Feel</strong><button class="sq" data-a="close" aria-label="Close">✕</button></div>'+segs+'<div class="cpane" role="group" aria-label="Feel">'+
  v7Pane('feel','feel',f)+v7Pane('feel','aids',aids)+v7Pane('feel','math',math)+v7Pane('feel','page',v7Paper()+enote('How the page looks behind your notes.'))+'</div>'}
function bpFix(){}
openPenAt=function(tab){if(R.tool!=='pen')setTool('pen');if(V.tab==='shapes')V.tab='pen';renderOpts();const id=tab==='stroke'?'size':tab==='colour'?'colour':'feel',b=$dd(id);
 if(id==='feel')V7.seg.feel=tab==='page'?'page':tab==='shapes'?'math':'feel';R.ctab.pen=tab==='page'?'feel':tab;if(b&&V.open[id])V.open[id](b)};
