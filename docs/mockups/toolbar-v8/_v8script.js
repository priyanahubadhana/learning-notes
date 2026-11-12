
/* ==== shell.js · the ONE shared app shell for every mock-up (12 Nov 2026) ====
   Paste this whole file first in a mock's <script>. See shell-spec.md.
   Needs in the page:  <nav id="sh-rail">  <header id="sh-top">  (optional: <aside id="sh-side">, <aside id="sh-panel">, .sh-main)
   Everything else (tab bar, scrim, sheet, dialog, pop, toast, chip dock) is created here.

   UNIVERSAL AI BAR (13 Nov 2026): every top bar gets ONE "AI" button (before the page's own actions). It opens an AI bar
   (a small panel under the button; a bottom sheet at 640 px and below) holding every AI action: Copy prompt, Paste the answer,
   Suggest tags, Summarise, Make cards, Send to Claude (Claude through the connector is the default AI source; nothing is sent in a mock).
   API (all optional; with none of it the bar still works with honest demo toasts):
     Shell.ai.page({
       context:()=>({title:'Atomic Habits', text:'the text the AI should read', prompt:'optional instruction that replaces the default'}),
       handlers:{copy, tags, summarise, cards, send: ctx=>{}, paste:(answerText,ctx)=>{}},   // override a built-in action
       actions:[{id:'x', label:'Auto-tag everything', desc:'one line', icon:'tag', run:ctx=>{}}]  // page-specific rows under "On this page"
     })                                  // call again whenever the page changes: it REPLACES the previous registration. Shell.ai.page(null) clears it.
     Shell.ai.open(anchor?) / .close() / .toggle() / .isOpen()
     Shell.top({ai:false}) or Shell.mount({ai:false}) hides the button on a page that must not have it.
   The bar closes before a handler runs, so a handler can call Shell.toast / Shell.dialog freely. Esc, the scrim and the close button dismiss it. */
const Shell=(()=>{
 const $=s=>document.querySelector(s);
 const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 /* ---- the icon set: 24 grid, 1.6 stroke, round caps (Lucide style). One name = one drawing. ---- */
 const I={
  /* rail: kept */
  home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon:'<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  gear:'<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
  /* rail: redesigned (U2). A = the pick, B = the alternative. */
  libraryA:'<path d="M3 20.5h18"/><rect x="4" y="5" width="4" height="12.5" rx="1"/><rect x="8" y="8" width="4" height="9.5" rx="1"/><path d="m13.6 7.4 3.5-1 3 10.2-3.5 1z"/>',
  libraryB:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  notebooksA:'<path d="M12.5 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5.5"/><path d="M3 7.5h4M3 12h4M3 16.5h4"/><path d="m14.3 20.7.6-2.7 4.8-4.8a1.45 1.45 0 0 1 2.05 2.05L17 20.1z"/>',
  notebooksB:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7.5h4M3 12h4M3 16.5h4"/><path d="M11 8h5M11 12h5M11 16h3"/>',
  reviewA:'<rect x="3" y="7.5" width="14.5" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10.5"/><path d="m7 14.2 2.4 2.4 4.4-5"/>',
  reviewB:'<path d="M20.5 11A8.5 8.5 0 0 0 5.6 6.4L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M3.5 13a8.5 8.5 0 0 0 14.9 4.6l2.1-2.1"/><path d="M20.5 20.5v-5h-5"/><rect x="9" y="9.5" width="6" height="5" rx="1"/>',
  /* top bar + chrome */
  sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  panel:'<rect x="3" y="4" width="5" height="4" rx="1"/><rect x="3" y="10" width="5" height="4" rx="1"/><rect x="3" y="16" width="5" height="4" rx="1"/><path d="M12 6h9M12 12h9M12 18h6"/>',
  back:'<path d="m15 18-6-6 6-6"/>',fwd:'<path d="m9 18 6-6-6-6"/>',chev:'<path d="m9 18 6-6-6-6"/>',chevL:'<path d="m15 18-6-6 6-6"/>',
  up:'<path d="m18 15-6-6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',
  search:'<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  sliders:'<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
  minim:'<path d="M5 12h9"/><path d="m10 8 4 4-4 4"/><path d="M19 5v14"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',check:'<path d="M20 6 9 17l-5-5"/>',plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  grip:'<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  save:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/><path d="M10 11v5M14 11v5"/>',
  device:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.2 9a3 3 0 0 1 5.6 1c0 2-3 2.3-3 4"/><path d="M12 17h.01"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'
 };
 const warned=new Set();
 const ic=(n,cls)=>{if(!I[n]){if(!warned.has(n)){warned.add(n);console.warn('[shell] missing icon "'+n+'"')}n='help'}return'<svg viewBox="0 0 24 24"'+(cls?' class="'+cls+'"':'')+' aria-hidden="true">'+I[n]+'</svg>'};
 /* AI bar icons (added only when a page has not already defined the same name) */
 {const A={sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',copy:'<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',paste:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',send:'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',article:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h6"/><path d="M8 13h8M8 17h5"/>',layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'};for(const k in A)if(!I[k])I[k]=A[k]}
 /* ---- persisted shell state (one key for every mock) ---- */
 const KEY='ln-shell-v1';
 let st={theme:null,mode:'beg',min:{},hpos:{},tabs:{},minUsed:false};
 try{Object.assign(st,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(_){}st.hpos=st.hpos||{};st.tabs=st.tabs||{};st.custom=st.custom||{};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}};
 /* ---- spaces: the ONE order ---- */
 const SPACES=[['home','Home'],['library','Library'],['notebooks','Notebooks'],['review','Review']];
 /* owner-chosen rail icons: Library A, Notebooks B, Review B (everything else A). A page may override with Shell.rail({icons:{library:'B'}}). */
 const ICONSET={library:'A',notebooks:'B',review:'B'};
 const spaceIcon=k=>k==='home'?'home':k+((cfg.icons&&cfg.icons[k])||ICONSET[k]||'A');
 let cfg={space:'notebooks',due:0,hidden:[],onSpace:null,onCorner:null,corner:null,onChange:null};
 const el=(tag,id,cls,attrs)=>{let n=document.getElementById(id);if(!n){n=document.createElement(tag);n.id=id;if(cls)n.className=cls;document.body.appendChild(n)}if(attrs)for(const k in attrs)n.setAttribute(k,attrs[k]);return n};
 /* ---- theme ---- */
 const themeName=()=>{const t=document.documentElement.dataset.theme;return t==='light'?'Day':t==='sepia'?'Sepia':t==='dark'?'Night':(matchMedia('(prefers-color-scheme: light)').matches?'Day':'Night')};
 function setTheme(n){document.documentElement.dataset.theme=n==='Day'?'light':n==='Sepia'?'sepia':'dark';st.theme=n;save();renderRail();if(cfg.onChange)cfg.onChange('theme',n)}
 /* ---- mode: 'beg' | 'pro' (the only two spellings) ---- */
 function setMode(m){st.mode=m==='pro'?'pro':'beg';save();const a=$('.sh-wrap');if(a)a.dataset.mode=st.mode;document.querySelectorAll('[data-sh-mode]').forEach(b=>b.classList.toggle('on',b.dataset.shMode===st.mode));if(cfg.onChange)cfg.onChange('mode',st.mode)}
 /* ---- rail + phone tab bar ---- */
 function railBtn(k,n,phone){const on=cfg.space===k;return'<button type="button" class="ib'+(on?' on':'')+'" data-sh-space="'+k+'" aria-label="'+n+'" title="'+n+'"'+(on?' aria-current="page"':'')+'>'+ic(spaceIcon(k))+(phone?'<span class="lbl">'+n+'</span>':'')+(k==='review'&&cfg.due?'<span class="bd">'+cfg.due+'</span>':'')+'</button>'}
 function renderRail(){const vis=SPACES.filter(s=>s[0]==='notebooks'||!cfg.hidden.includes(s[0]));const night=themeName()==='Night';
  const r=$('#sh-rail');if(r)r.innerHTML='<div class="mk" aria-hidden="true">L</div>'+vis.map(s=>railBtn(s[0],s[1])).join('')+'<span class="grow"></span><button type="button" class="ib" data-sh-theme aria-label="Switch to '+(night?'Day':'Night')+'" title="Day / Night">'+ic(night?'sun':'moon')+'</button><button type="button" class="ib" data-sh-corner aria-label="Settings and more" title="Settings and more" aria-haspopup="menu">'+ic('gear')+'</button>';
  const t=el('nav','sh-tabbar','sh-tabbar glass',{'aria-label':'Spaces'});t.innerHTML=vis.map(s=>railBtn(s[0],s[1],true)).join('')+'<button type="button" class="ib" data-sh-corner aria-label="Settings and more" aria-haspopup="menu">'+ic('gear')+'<span class="lbl">More</span></button>'}
 /* ---- top bar ---- */
 let top={crumbs:[],saved:'',actions:'',side:false,panel:false,nav:true};
 let aiOn=false,aiPaste=false,aiFrom=null;
 function renderTop(o){Object.assign(top,o||{});const t=$('#sh-top');if(!t)return;const c=top.crumbs;
  t.innerHTML=(top.side?'<button type="button" class="ib" data-sh-toggle="side" aria-label="Show or hide the sidebar" title="Sidebar">'+ic('sidebar')+'</button>':'')+
   (top.panel?'<button type="button" class="ib" data-sh-toggle="panel" aria-label="Show or hide the page panel" title="Pages · Outline · Resources">'+ic('panel')+'</button>':'')+
   (top.nav?'<button type="button" class="ib sm" data-sh-nav="back" aria-label="Back">'+ic('back')+'</button><button type="button" class="ib sm" data-sh-nav="fwd" aria-label="Forward">'+ic('fwd')+'</button>':'')+
   '<nav class="sh-crumbs" aria-label="Where you are">'+c.map((x,i)=>i<c.length-1?'<button type="button" data-sh-crumb="'+i+'">'+esc(x)+'</button>'+ic('chev'):'<b>'+esc(x)+'</b>').join('')+'</nav>'+
   (top.saved?'<span class="sh-saved">'+esc(top.saved)+'</span>':'')+
   '<button type="button" class="ib" data-sh-search aria-label="Search (Ctrl K)" title="Search (Ctrl K)">'+ic('search')+'</button>'+
   (top.ai===false||cfg.ai===false?'':'<button type="button" class="ib sh-aib'+(aiOn?' on':'')+'" data-sh-ai aria-label="AI" title="AI: copy a prompt, paste the answer, suggest tags" aria-haspopup="dialog" aria-expanded="'+aiOn+'">'+ic('sparkle')+'<span>AI</span></button>')+(top.actions||'')}
 /* ---- side columns: 'dock' | 'over' | 'hidden' ---- */
 function col(which,state){const n=$('#sh-'+which);if(!n)return null;if(state){n.dataset.state=state;syncScrim()}return n.dataset.state||'dock'}
 const isPhone=()=>innerWidth<=640;
 function toggleCol(which){const s=col(which);if(isPhone()||s==='over'){col(which,s==='over'?'hidden':'over');return}col(which,s==='dock'?'hidden':'dock')}
 function syncScrim(){const any=['side','panel'].some(w=>{const n=$('#sh-'+w);return n&&n.dataset.state==='over'});const hi=sheetOn||dialogOn;const s=el('div','sh-scrim','sh-scrim');s.classList.toggle('on',any||hi);s.classList.toggle('hi',hi)}
 /* ---- toast: one at a time, pill, bottom centre; Undo keeps it 6 s ---- */
 let tT=null,tUndo=null;
 function toast(msg,undo){const t=el('div','sh-toast','sh-toast',{role:'status','aria-live':'polite'});clearTimeout(tT);tUndo=undo||null;t.innerHTML='<span>'+esc(msg)+'</span>'+(undo?'<button type="button" data-sh-undo>Undo</button>':'');t.classList.toggle('on',true);tT=setTimeout(()=>t.classList.remove('on'),undo?6000:2600)}
 /* ---- pop menu, anchored to a button ---- */
 function pop(anchor,html){const p=el('div','sh-pop','sh-pop',{role:'menu'});p.innerHTML=html;p.hidden=false;const r=anchor.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';p.style.top=Math.max(8,Math.min(innerHeight-h-8,r.bottom+4))+'px';p._a=anchor;return p}
 function closePop(){const p=$('#sh-pop');if(p)p.hidden=true}
 /* ---- the More sheet: fixed place, full height, header + picker + tabs stay put, only the body scrolls ---- */
 let sheetOn=false,sh=null;
 function sheetOpen(o){sh=Object.assign({title:'More',sub:'',picker:null,tabs:[],tab:null,body:()=>'',hint:'Changes apply when you tap ✓',onClose:null},o);if(!sh.tab&&sh.tabs.length)sh.tab=sh.tabs[0][0];sheetOn=true;sheetDraw(true);el('div','sh-sheet','sh-sheet').classList.add('on');syncScrim()}
 function sheetDraw(full){const s=el('div','sh-sheet','sh-sheet',{role:'dialog','aria-modal':'true','aria-label':sh.title});const tabs=typeof sh.tabs==='function'?sh.tabs():sh.tabs;if(!tabs.some(t=>t[0]===sh.tab))sh.tab=tabs[0]?tabs[0][0]:null;
  if(full||!s.querySelector('.sh-sbody')){s.innerHTML='<div class="sh-shd"><span class="ib on" style="cursor:default" aria-hidden="true">'+ic('sliders')+'</span><div class="gr"><h3></h3><p></p></div><button type="button" class="ib" data-sh-sheet="cancel" aria-label="Close without saving">'+ic('x')+'</button></div><div class="sh-spick"></div><div class="sh-stabs"><div class="utabs scrollx" role="tablist"></div><div class="track"><i></i></div></div><div class="sh-sbody" tabindex="-1"></div><div class="sh-sft"><span class="gr"></span><button type="button" class="btn" data-sh-sheet="cancel">Cancel</button><button type="button" class="btn pri" data-sh-sheet="apply">'+ic('check')+'Done</button></div>'}
  s.querySelector('h3').textContent=sh.title;s.querySelector('.sh-shd p').textContent=typeof sh.sub==='function'?sh.sub():sh.sub;s.querySelector('.sh-sft .gr').textContent=sh.hint;
  const pk=s.querySelector('.sh-spick');const keepX=pk.firstElementChild?pk.firstElementChild.scrollLeft:0;pk.innerHTML=sh.picker?sh.picker():'';pk.hidden=!sh.picker;if(pk.firstElementChild)pk.firstElementChild.scrollLeft=keepX;
  const tb=s.querySelector('.utabs');const tx=tb.scrollLeft;tb.innerHTML=tabs.map(t=>'<button type="button" role="tab" aria-selected="'+(t[0]===sh.tab)+'" data-sh-tab="'+t[0]+'" class="'+(t[0]===sh.tab?'on':'')+'">'+esc(t[1])+'</button>').join('');tb.scrollLeft=tx;track(tb,s.querySelector('.sh-stabs .track'));
  const b=s.querySelector('.sh-sbody');const y=full?0:b.scrollTop;b.innerHTML=sh.body(sh.tab);b.scrollTop=y;if(sh.after)sh.after()}
 function sheetClose(commit){if(!sheetOn)return;sheetOn=false;const s=$('#sh-sheet');if(s)s.classList.remove('on');syncScrim();const f=sh&&sh.onClose;if(f)f(!!commit)}
 /* ---- small dialogs (ask a name, confirm): centred, content-sized ---- */
 let dialogOn=false;
 function dialog(html,wire){const d=el('div','sh-dialog','sh-dialog',{role:'dialog','aria-modal':'true'});d.innerHTML=html+'<button type="button" class="ib sh-dx" data-sh-dx aria-label="Close" title="Close">'+ic('x')+'</button>';d.classList.add('on');dialogOn=true;syncScrim();if(wire)wire(d)}
 function dialogClose(){const was=dialogOn;const d=$('#sh-dialog');if(d)d.classList.remove('on');dialogOn=false;syncScrim();if(was)document.dispatchEvent(new Event('sh-dialog-closed'))}
 function ask(title,val,cb){dialog('<h3>'+esc(title)+'</h3><input class="inp" id="sh-ask" value="'+esc(val)+'" aria-label="'+esc(title)+'"><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn pri" data-ok>Done</button></div>',d=>{const i=d.querySelector('#sh-ask');i.focus();i.select();const ok=()=>{const v=i.value.trim();dialogClose();cb(v)};d.querySelector('[data-ok]').onclick=ok;d.querySelector('[data-x]').onclick=dialogClose;i.onkeydown=e=>{if(e.key==='Enter')ok()}})}
 function confirmBox(msg,okLabel,cb,note){dialog('<h3>'+esc(msg)+'</h3><p class="mini" style="margin:0">'+esc(note||'You can undo this.')+'</p><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn dng" data-ok>'+esc(okLabel)+'</button></div>',d=>{d.querySelector('[data-x]').onclick=dialogClose;d.querySelector('[data-ok]').onclick=()=>{dialogClose();cb()}})}
 /* ---- floating bars + minimise chips ---- */
 const bars={};
 function bar(key,o){bars[key]=Object.assign({label:key,icon:'sliders',html:'',show:true},o);drawBars()}
 function drawBars(){const host=$('.sh-main')||document.body;const dock=el('div','sh-mdock','sh-mdock');
  for(const k in bars){const b=bars[k];let n=document.getElementById('sh-fbar-'+k);if(!n){n=document.createElement('div');n.id='sh-fbar-'+k;n.className='sh-fbar glass';n.setAttribute('role','toolbar');host.appendChild(n)}
   n.setAttribute('aria-label',b.label);const min=!!st.min[k];n.hidden=!b.show||min;n.innerHTML=b.html+'<span class="sep"></span><button type="button" class="ib minb" data-sh-min="'+k+'" aria-label="Minimise '+esc(b.label)+'" title="Minimise to the edge">'+ic('minim')+'</button>';
   handle('bar-'+k,b.show&&min?{icon:b.icon,label:b.label,onTap:()=>{st.min[k]=false;save();drawBars()}}:null)}
  dock.innerHTML='';document.documentElement.style.setProperty('--sh-bar',Object.keys(bars).some(k=>bars[k].show&&!st.min[k])?'60px':'0px')}
 /* ---- thin scroll track under any sideways row ---- */
 function track(sc,tr){if(!sc||!tr)return;const i=tr.querySelector('i');const up=()=>{const r=sc.clientWidth/Math.max(1,sc.scrollWidth);tr.classList.toggle('off',r>=.999);i.style.width=r*100+'%';i.style.left=(sc.scrollLeft/Math.max(1,sc.scrollWidth)*100)+'%'};sc.onscroll=up;up()}
 /* ---- minimise button: pulse gently every few minutes until it has been used once ---- */
 let pulseT=null;
 function pulse(){document.querySelectorAll('.minb').forEach(b=>{b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')})}
 function minUsed(){if(st.minUsed)return;st.minUsed=true;save();clearInterval(pulseT);document.querySelectorAll('.minb.pulse').forEach(b=>b.classList.remove('pulse'))}
 function startPulse(){if(st.minUsed)return;setTimeout(()=>{if(!st.minUsed)pulse()},45000);pulseT=setInterval(()=>{if(!st.minUsed)pulse()},180000)}
 /* ---- edge handle: a minimised bar shown as a small handle on the left/right edge; drag anywhere, tap restores ---- */
 const clampY=y=>Math.max(64,Math.min(innerHeight-80,y));
 function placeHandle(h,key){const p=st.hpos[key]||{side:'r',y:Math.round(innerHeight*.35)+64*Math.max(0,[...document.querySelectorAll('.sh-handle')].indexOf(h))};h.dataset.side=p.side;h.style.top=clampY(p.y)+'px';h.style.left=p.side==='l'?'0px':'auto';h.style.right=p.side==='r'?'0px':'auto'}
 function handle(key,o){let h=document.getElementById('sh-h-'+key);
  if(!o){if(h)h.remove();return}
  if(!h){h=document.createElement('button');h.type='button';h.id='sh-h-'+key;h.className='sh-handle';document.body.appendChild(h);let d=null;
   h.addEventListener('pointerdown',e=>{if(e.button)return;try{h.setPointerCapture(e.pointerId)}catch(_){}const r=h.getBoundingClientRect();d={id:e.pointerId,ox:e.clientX-r.left,oy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,moved:false}});
   h.addEventListener('pointermove',e=>{if(!d||e.pointerId!==d.id)return;if(!d.moved&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<6)return;d.moved=true;h.classList.add('drag');h.style.right='auto';h.style.left=(e.clientX-d.ox)+'px';h.style.top=(e.clientY-d.oy)+'px'});
   const end=e=>{if(!d||e.pointerId!==d.id)return;const m=d.moved;d=null;h.classList.remove('drag');
    if(m){const r=h.getBoundingClientRect();st.hpos[key]={side:r.left+r.width/2<innerWidth/2?'l':'r',y:Math.round(clampY(r.top))};save();h.dataset.side=st.hpos[key].side;placeHandle(h,key);return}
    if(e.type==='pointerup'&&h._o&&h._o.onTap)h._o.onTap()};
   h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
   h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(h._o&&h._o.onTap)h._o.onTap()}})}
  h._o=o;h.innerHTML=ic(o.icon||'sliders');h.setAttribute('aria-label','Show '+o.label+' (drag to move)');h.title='Show '+o.label+' · drag to move';placeHandle(h,key)}
 addEventListener('resize',()=>document.querySelectorAll('.sh-handle').forEach(h=>placeHandle(h,h.id.slice(5))));
 /* ---- tabs: ONE customisable tab row for every space (+ add, edit, remove, reorder) ----
    Shell.tabs(key,{host:'#ptabs',catalog:[{id,label,icon?,pro?}],defaults:[ids],cur:()=>id,onPick:id=>{},onChange:()=>{},utabs:true (underline style for a stand-alone row)}) -> {draw,list,add,remove,reset,move,rename} */
 const tabSets={};
 function tabs(key,o){const T=tabSets[key]=Object.assign({key,catalog:[],defaults:[]},o);
  const cus=()=>(st.custom[key]||[]);
  const cat=id=>{const c=T.catalog.find(c=>c.id===id);if(c)return c;const u=cus().find(c=>c.id===id);return u?Object.assign({custom:true,icon:'star'},u):null};
  const ok=id=>{const c=cat(id);return c&&!(c.pro&&st.mode!=='pro')};
  const raw=()=>{let l=st.tabs[key];if(!Array.isArray(l)||!l.length)l=T.defaults.map(id=>({id}));return l.filter(x=>cat(x.id))};
  T.list=()=>raw().filter(x=>ok(x.id)).map(x=>({id:x.id,label:x.label||cat(x.id).label,icon:cat(x.id).icon,custom:!!cat(x.id).custom,src:cat(x.id).src}));
  const put=l=>{st.tabs[key]=l;save()};
  T.add=id=>{const l=raw();if(!l.some(x=>x.id===id)){l.push({id});put(l)}T.draw();if(T.onChange)T.onChange('add',id)};
  T.remove=id=>{const l=raw();if(T.list().length<=1)return false;put(l.filter(x=>x.id!==id));if(cus().some(c=>c.id===id)){st.custom[key]=cus().filter(c=>c.id!==id);save()}T.draw();if(T.onChange)T.onChange('remove',id);return true};
  T.reset=()=>{delete st.tabs[key];delete st.custom[key];save();T.draw();if(T.onChange)T.onChange('reset')};
  T.rename=(id,label)=>{const l=raw();const x=l.find(y=>y.id===id);const cu=cus().find(y=>y.id===id);if(cu){const v=String(label||'').trim().slice(0,24);if(v){cu.label=v;save();T.draw();if(T.onChange)T.onChange('rename',id)}return}if(x){const v=String(label||'').trim().slice(0,24);if(v&&v!==cat(id).label)x.label=v;else delete x.label;put(l);T.draw()}};
  /* Create your own tab: Shell.tabs(key,{sources:()=>[{kind:'filter',title:'Saved filters',items:[{id,label}]},...], onCustom:tab=>{}}). A custom tab points at ONE source 'kind:id'. */
  T.srcList=()=>typeof T.sources==='function'?T.sources().filter(g=>g.items&&g.items.length):[];
  T.addCustom=(label,src)=>{label=String(label||'').trim().slice(0,24);if(!label||!src)return null;const id='cu'+Date.now().toString(36)+Math.floor(Math.random()*1e3);(st.custom[key]=cus()).push({id,label,src});const l=raw();l.push({id});put(l);T.draw();if(T.onChange)T.onChange('add',id);return id};
  T.setSrc=(id,src)=>{const c=cus().find(x=>x.id===id);if(c){c.src=src;save();if(T.onChange)T.onChange('src',id)}};
  T.move=ids=>{const l=raw();const by=Object.fromEntries(l.map(x=>[x.id,x]));const vis=ids.map(i=>by[i]).filter(Boolean);const hid=l.filter(x=>!ids.includes(x.id));put(vis.concat(hid));T.draw();if(T.onChange)T.onChange('move')};
  T.draw=()=>{const h=typeof T.host==='string'?$(T.host):T.host;if(!h)return;const cur=T.cur?T.cur():null;const old=h.querySelector('.sh-tscroll');const kx=old?old.scrollLeft:0;
   h.classList.add('sh-tabs');h.dataset.tabkey=key;
   h.innerHTML='<div class="sh-trow"><div class="sh-tscroll" role="presentation">'+T.list().map(t=>'<button type="button" role="tab" aria-selected="'+(t.id===cur)+'" data-sh-pt="'+t.id+'" class="'+(t.id===cur?'on':'')+'">'+esc(t.label)+'</button>').join('')+'</div><button type="button" class="sh-tplus" data-sh-tplus="'+key+'" aria-label="Add or edit tabs" title="Add or edit tabs" aria-haspopup="menu">'+ic('plus')+'</button></div><div class="track"><i></i></div>';if(T.utabs)h.querySelector('.sh-trow').classList.add('utabs');
   const sc=h.querySelector('.sh-tscroll');sc.scrollLeft=kx;const on=sc.querySelector('.on');if(on){const l=on.offsetLeft,r=l+on.offsetWidth;if(l<sc.scrollLeft)sc.scrollLeft=l-8;else if(r>sc.scrollLeft+sc.clientWidth)sc.scrollLeft=r-sc.clientWidth+8}track(sc,h.querySelector('.track'))};
  T.pick=id=>{const c=cat(id);if(c&&c.custom&&T.onCustom)T.onCustom({id,label:c.label,src:c.src});else if(T.onPick)T.onPick(id)};
  T.menu=btn=>{const have=new Set(T.list().map(t=>t.id));const rest=T.catalog.filter(c=>ok(c.id)&&!have.has(c.id));
   const p=pop(btn,'<div class="lbl">Add a tab</div>'+(rest.length?rest.map(c=>'<button type="button" class="mi" role="menuitem" data-sh-tadd="'+key+':'+c.id+'">'+ic(c.icon||'plus')+esc(c.label)+(c.desc?'<small>'+esc(c.desc)+'</small>':'')+'</button>').join(''):'<div class="mini" style="padding:6px 10px">All tabs are already here.</div>')+'<hr><button type="button" class="mi" role="menuitem" data-sh-tedit="'+key+'">'+ic('sliders')+'Edit tabs…</button>');p.classList.add('sh-tpop')};
  const srcOpts=cur=>{const gs=T.srcList();let h=gs.map(g=>'<optgroup label="'+esc(g.title)+'">'+g.items.map(i=>{const v=g.kind+':'+i.id;return'<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(i.label)+'</option>'}).join('')+'</optgroup>').join('');if(cur&&!gs.some(g=>g.items.some(i=>g.kind+':'+i.id===cur)))h='<option value="'+esc(cur)+'" selected>Source missing</option>'+h;return h};
  T.create=()=>{const gs=T.srcList();dialog('<h3>Create your own tab</h3><p class="mini" style="margin:0 0 8px">Name it, then point it at one thing to show.</p><label class="sh-flab">Name<input class="inp" id="sh-cn" maxlength="24" placeholder="For example, Exam prep" aria-label="Tab name"></label><label class="sh-flab">Shows<select class="inp" id="sh-cs" aria-label="Source">'+srcOpts('')+'</select></label><p class="mini" id="sh-ce" style="color:var(--danger);margin:6px 0 0;min-height:1.2em" role="alert"></p><div class="ft"><button type="button" class="btn" data-cm="back">Back</button><button type="button" class="btn pri" data-cm="ok">'+ic('check')+'Create tab</button></div>',d=>{
    const n=d.querySelector('#sh-cn'),s=d.querySelector('#sh-cs'),er=d.querySelector('#sh-ce');setTimeout(()=>n.focus(),60);
    const go=()=>{const nm=n.value.trim();if(!nm){er.textContent='Give the tab a name.';n.focus();return}if(!s.value){er.textContent='Pick what the tab shows.';return}if(T.list().some(t=>t.label.toLowerCase()===nm.toLowerCase())){er.textContent='A tab with this name already exists.';n.focus();return}const id=T.addCustom(nm,s.value);if(id){T.edit();toast('Tab "'+nm+'" added')}};
    d.addEventListener('click',e=>{const b=e.target.closest('[data-cm]');if(!b)return;if(b.dataset.cm==='back')T.edit();else go()});n.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go()}})})};
  T.edit=()=>{const rows=()=>T.list().map((t,i,a)=>'<div class="sh-trw" data-id="'+t.id+'"><button type="button" class="ib sm gp" data-gp aria-label="Drag to reorder '+esc(t.label)+'" title="Drag to reorder">'+ic('grip')+'</button><input value="'+esc(t.label)+'" maxlength="24" aria-label="Tab name" data-tn="'+t.id+'"><button type="button" class="ib sm" data-tm="up:'+t.id+'" aria-label="Move up"'+(i?'':' disabled')+'>'+ic('up')+'</button><button type="button" class="ib sm" data-tm="dn:'+t.id+'" aria-label="Move down"'+(i<a.length-1?'':' disabled')+'>'+ic('down')+'</button><button type="button" class="ib sm rm" data-tm="rm:'+t.id+'" aria-label="Remove tab"'+(a.length>1?'':' disabled')+'>'+ic('trash')+'</button>'+(t.custom?'<label class="sh-tsrc"><span>Shows</span><select data-ts="'+t.id+'" aria-label="What '+esc(t.label)+' shows">'+srcOpts(t.src)+'</select></label>':'')+'</div>').join('');
   dialog('<h3>Edit tabs</h3><p class="mini" style="margin:0 0 6px">Rename, reorder with the handle or arrows, remove. Use + to add more.</p><div class="sh-tedit" id="sh-tedit">'+rows()+'</div>'+(T.srcList().length?'<button type="button" class="btn sh-tcreate" data-tm="create">'+ic('plus')+'Create your own tab</button>':'')+'<div class="ft"><button type="button" class="btn" data-tm="reset">Reset to default</button><button type="button" class="btn pri" data-tm="done">Done</button></div>',d=>{
    const box=d.querySelector('#sh-tedit');const redo=()=>{box.innerHTML=rows()};
    d.addEventListener('click',e=>{const b=e.target.closest('[data-tm]');if(!b)return;const [k,id]=b.dataset.tm.split(':');
     if(k==='done'){dialogClose();return}if(k==='create'){T.create();return}if(k==='reset'){T.reset();redo();return}
     const ids=T.list().map(t=>t.id),i=ids.indexOf(id);
     if(k==='up'&&i>0){ids.splice(i-1,0,ids.splice(i,1)[0]);T.move(ids);redo()}
     else if(k==='dn'&&i<ids.length-1){ids.splice(i+1,0,ids.splice(i,1)[0]);T.move(ids);redo()}
     else if(k==='rm'){if(T.remove(id))redo()}});
    box.addEventListener('change',e=>{if(e.target.dataset.tn)T.rename(e.target.dataset.tn,e.target.value);else if(e.target.dataset.ts)T.setSrc(e.target.dataset.ts,e.target.value)});
    box.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.tn)e.target.blur()});
    let dr=null;box.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-gp]');if(!g)return;e.preventDefault();const row=g.closest('.sh-trw');dr={row,id:e.pointerId};g.setPointerCapture(e.pointerId);row.classList.add('drag')});
    box.addEventListener('pointermove',e=>{if(!dr||e.pointerId!==dr.id)return;const sib=[...box.children].filter(r=>r!==dr.row);let before=null;for(const r of sib){const b=r.getBoundingClientRect();if(e.clientY<b.top+b.height/2){before=r;break}}box.insertBefore(dr.row,before)});
    const end=e=>{if(!dr||e.pointerId!==dr.id)return;dr.row.classList.remove('drag');dr=null;T.move([...box.children].map(r=>r.dataset.id));redo()};
    box.addEventListener('pointerup',end);box.addEventListener('pointercancel',end)})};
  T.draw();return T}
 /* ---- history: ONE Undo / Redo for every mock (buttons, Ctrl Z / Ctrl Y / Ctrl Shift Z, enabled state) ----
    const H=Shell.history({undo:fn,redo:fn,can:()=>[canUndo,canRedo]});  H.html() -> the two top-bar icon buttons;  H.sync() after every change.
    Own buttons already in the page: pass els:()=>({undo:el,redo:el}), click:false (page wires the click), keys:false, disCls:'dis'. */
 function history(o){const H=Object.assign({keys:true,click:true,disCls:''},o);
  const els=()=>H.els?H.els():{undo:document.querySelector('[data-sh-hist=undo]'),redo:document.querySelector('[data-sh-hist=redo]')};
  H.html=()=>{const c=H.can();return['undo','redo'].map((k,i)=>{const l=k==='undo'?'Undo':'Redo',key=k==='undo'?'Ctrl Z':'Ctrl Y';return'<button type="button" class="ib" data-sh-hist="'+k+'" aria-label="'+l+' ('+key+')" title="'+l+' ('+key+')"'+(c[i]?'':' disabled')+'>'+ic(k)+'</button>'}).join('')};
  H.sync=()=>{const c=H.can(),e=els();['undo','redo'].forEach((k,i)=>{const b=e[k];if(!b)return;const d=!c[i];if(b.classList.contains('ib'))b.disabled=d;b.setAttribute('aria-disabled',d);if(H.disCls)b.classList.toggle(H.disCls,d)})};
  hists.push(H);return H}
 const hists=[];
 document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase(),t=e.target;
  if(t&&(t.isContentEditable||(/^(input|textarea|select)$/i.test(t.tagName)&&!/^(range|checkbox|radio|button)$/.test(t.type||''))))return;
  const H=hists.find(h=>h.keys);if(!H)return;
  if(k==='z'&&!e.shiftKey){e.preventDefault();H.undo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();H.redo()}},true);
 /* ---- clear (x) button: ONE for every text field. Shell.clearable(root,ok) wraps now; Shell.autoClear(ok) keeps wrapping new fields.
    ok(input) -> false to skip. Opt out in markup with data-noclr. The button shows only while the field has text (:placeholder-shown), so
    changing .value from code needs nothing. Clearing fires input + change, then refocuses. ---- */
 const CSEL='input:not([type=range]):not([type=time]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]):not([type=color]):not([readonly]),textarea';
 function clearable(root,ok){(root||document.body).querySelectorAll(CSEL).forEach(i=>{if(i.closest('.sh-clr,[data-noclr]')||(ok&&!ok(i)))return;
  const act=document.activeElement===i;let s=null,e=null;try{s=i.selectionStart;e=i.selectionEnd}catch(_){}
  const w=document.createElement('span');w.className='sh-clr'+(i.tagName==='TEXTAREA'?' ta':'');i.parentNode.insertBefore(w,i);w.appendChild(i);if(!i.getAttribute('placeholder'))i.setAttribute('placeholder',' ');
  const b=document.createElement('button');b.type='button';b.className='ib sm sh-clrb';b.setAttribute('aria-label','Clear '+(i.getAttribute('aria-label')||'field'));b.title='Clear';b.innerHTML=ic('x');w.appendChild(b);
  if(act){i.focus();try{if(s!=null)i.setSelectionRange(s,e)}catch(_){}}})}
 let acOk=null,acQ=0;
 function autoClear(ok){acOk=ok||null;clearable(document.body,acOk);if(autoClear.on)return;autoClear.on=true;
  new MutationObserver(()=>{if(acQ)return;acQ=requestAnimationFrame(()=>{acQ=0;clearable(document.body,acOk)})}).observe(document.body,{childList:true,subtree:true})}
 document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.sh-clrb');if(!b)return;const i=b.parentNode.querySelector('input,textarea');if(!i)return;i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));i.focus()});
 /* ---- the quiet corner (gear): the same list everywhere ---- */
 function cornerHTML(){return'<div class="lbl">Settings and more</div>'+[['settings','gear','Settings'],['save','save','Save &amp; restore'],['trash','trash','Trash'],['device','device','Device mode'],['help','help','Help']].map(x=>'<button type="button" class="mi" role="menuitem" data-sh-q="'+x[0]+'">'+ic(x[1])+x[2]+'</button>').join('')+'<hr><div style="padding:4px 6px"><div class="seg sm" role="group" aria-label="Theme">'+['Day','Night','Sepia'].map(t=>'<button type="button" data-sh-th="'+t+'" class="'+(themeName()===t?'on':'')+'">'+t+'</button>').join('')+'</div></div>'}
 /* ---- universal AI bar: one button in every top bar, one panel (bottom sheet on phones) ---- */
 const AI={ctx:null,h:{},extra:[]};
 function aiPage(o){o=o||{};AI.ctx=o.context||null;AI.h=o.handlers||{};AI.extra=o.actions||[];if(aiOn)aiDraw()}
 const aiCtx=()=>{let c={};try{c=(AI.ctx&&AI.ctx())||{}}catch(_){}return Object.assign({title:'',text:'',prompt:''},c)};
 const AI_ASK={copy:'Read the text below and help me learn from it.',tags:'Suggest 3 to 5 short tags for the text below. Reply with one tag per line.',summarise:'Summarise the text below in 5 bullet points, in plain words.',cards:'Write 8 short question-and-answer cards from the text below.'};
 const aiPromptText=(kind,c)=>(c.prompt||AI_ASK[kind]||AI_ASK.copy)+'\n\n'+(c.title?c.title+'\n\n':'')+c.text;
 const AI_ROWS=[['copy','copy','Copy prompt','A ready prompt with this page’s text, for any AI tool.'],['paste','paste','Paste the answer','Bring the AI’s answer back here.'],['tags','tag','Suggest tags','Ideas you can accept or dismiss.'],['summarise','article','Summarise','A short summary in plain words.'],['cards','layers','Make cards','Question cards from the key ideas.'],['send','send','Send to Claude','Through your Claude connector. Uses your own plan.']];
 const aiRow=(id,icon,label,desc)=>'<button type="button" class="sh-ai-row" data-sh-ai-act="'+esc(id)+'"'+(id==='paste'?' aria-expanded="'+aiPaste+'"':'')+'>'+ic(icon)+'<span><b>'+esc(label)+'</b>'+(desc?'<small>'+esc(desc)+'</small>':'')+'</span></button>';
 function aiHTML(){const c=aiCtx();
  return'<div class="sh-ai-grip" aria-hidden="true"></div><div class="sh-ai-hd"><span class="sh-ai-mk">'+ic('sparkle')+'</span><div class="sh-ai-tt"><b>AI</b><small>Claude, through your connector</small></div><button type="button" class="ib sm" data-sh-ai-x aria-label="Close the AI bar" title="Close">'+ic('x')+'</button></div>'+
  (c.title?'<div class="sh-ai-ctx">Working on <b>'+esc(c.title)+'</b></div>':'')+
  '<div class="sh-ai-body"><div class="sh-ai-list">'+AI_ROWS.map(r=>aiRow(r[0],r[1],r[2],r[3])).join('')+'</div>'+
  (AI.extra.length?'<div class="sh-ai-g">On this page</div><div class="sh-ai-list">'+AI.extra.map(x=>aiRow('x:'+x.id,x.icon||'sparkle',x.label,x.desc||'')).join('')+'</div>':'')+
  (aiPaste?'<div class="sh-ai-paste"><label for="sh-ai-ta">Paste the AI answer</label><textarea id="sh-ai-ta" class="inp" rows="4" placeholder="Paste the answer here…"></textarea><div class="ft"><button type="button" class="btn" data-sh-ai-act="paste">Cancel</button><button type="button" class="btn pri" data-sh-ai-use>Use answer</button></div></div>':'')+
  '<p class="sh-ai-foot">Nothing is sent until you choose. Any other AI can be added later.</p></div>'}
 function aiDraw(){const p=$('#sh-ai');if(!p)return;const keep=$('#sh-ai-ta');const v=keep?keep.value:'';p.innerHTML=aiHTML();const t=$('#sh-ai-ta');if(t&&v)t.value=v}
 function aiPlace(a){const p=$('#sh-ai');if(!p)return;if(innerWidth<=640){p.style.left=p.style.top=p.style.right='';return}
  const r=(a||document.querySelector('[data-sh-ai]')||document.body).getBoundingClientRect(),w=Math.min(380,innerWidth-16);p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';p.style.top=Math.max(8,r.bottom+6)+'px'}
 function aiOpen(a){const p=el('aside','sh-ai','sh-ai',{role:'dialog','aria-label':'AI'});el('div','sh-ai-sc','sh-ai-sc');closePop();aiFrom=a||document.querySelector('[data-sh-ai]');aiOn=true;aiPaste=false;aiDraw();aiPlace(aiFrom);void p.offsetWidth;p.classList.add('on');$('#sh-ai-sc').classList.add('on');syncAiBtn();setTimeout(()=>{const f=p.querySelector('.sh-ai-row');if(f&&aiOn)f.focus()},60)}
 function aiClose(quiet){if(!aiOn)return;aiOn=false;const p=$('#sh-ai'),s=$('#sh-ai-sc');if(p)p.classList.remove('on');if(s)s.classList.remove('on');syncAiBtn();const f=aiFrom;aiFrom=null;if(!quiet&&f&&f.isConnected)try{f.focus()}catch(_){}}
 function aiToggle(a){aiOn?aiClose():aiOpen(a)}
 function syncAiBtn(){document.querySelectorAll('[data-sh-ai]').forEach(b=>{b.classList.toggle('on',aiOn);b.setAttribute('aria-expanded',aiOn)})}
 function aiCopy(t){try{navigator.clipboard.writeText(t).catch(()=>{})}catch(_){}}
 function aiRun(id){const c=aiCtx();
  if(id==='paste'){aiPaste=!aiPaste;aiDraw();if(aiPaste)setTimeout(()=>{const t=$('#sh-ai-ta');if(t)t.focus()},30);return}
  if(id.indexOf('x:')===0){const x=AI.extra.find(y=>y.id===id.slice(2));aiClose(true);if(x&&x.run)x.run(c);return}
  const f=AI.h[id];aiClose(true);if(f){f(c);return}
  if(id==='copy'){aiCopy(aiPromptText('copy',c));toast('Prompt copied. Paste it into your AI tool.');return}
  if(id==='send'){toast('Sent to Claude through the connector (demo). The answer will come back here.');return}
  toast('This page does not use “'+({tags:'Suggest tags',summarise:'Summarise',cards:'Make cards'}[id]||id)+'” yet.')}
 function aiUse(){const t=$('#sh-ai-ta'),v=t?t.value.trim():'';if(!v){toast('Paste the answer first');if(t)t.focus();return}const c=aiCtx(),f=AI.h.paste;aiClose(true);if(f)f(v,c);else toast('Answer received (demo). This page does not use it yet.')}
 addEventListener('resize',()=>{if(aiOn)aiPlace(aiFrom)});
 /* ---- one delegated listener for the whole shell ---- */
 document.addEventListener('click',e=>{const T=e.target;if(!T.closest)return;let b;
  if(T.closest('.minb'))minUsed();
  if((b=T.closest('[data-sh-ai]'))){aiToggle(b);return}
  if(T.closest('[data-sh-ai-x]')){aiClose();return}
  if((b=T.closest('[data-sh-ai-act]'))){aiRun(b.dataset.shAiAct);return}
  if(T.closest('[data-sh-ai-use]')){aiUse();return}
  if(T.id==='sh-ai-sc'){aiClose();return}
  if(T.closest('[data-sh-dx]')){dialogClose();return}
  if((b=T.closest('[data-sh-pt]'))){const h=b.closest('[data-tabkey]'),S=h&&tabSets[h.dataset.tabkey];if(S){S.pick(b.dataset.shPt);S.draw()}return}
  if((b=T.closest('[data-sh-tplus]'))){const S=tabSets[b.dataset.shTplus];if(S)S.menu(b);return}
  if((b=T.closest('[data-sh-tadd]'))){const [k,id]=b.dataset.shTadd.split(':'),S=tabSets[k];closePop();if(S){S.add(id);S.pick(id);S.draw()}return}
  if((b=T.closest('[data-sh-tedit]'))){const S=tabSets[b.dataset.shTedit];closePop();if(S)S.edit();return}
  if((b=T.closest('[data-sh-space]'))){const k=b.dataset.shSpace;if(cfg.onSpace&&cfg.onSpace(k)===false)return;cfg.space=k;renderRail();return}
  if(T.closest('[data-sh-theme]')){setTheme(themeName()==='Night'?'Day':'Night');return}
  if((b=T.closest('[data-sh-corner]'))){pop(b,cornerHTML());return}
  if((b=T.closest('[data-sh-th]'))){setTheme(b.dataset.shTh);b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));return}
  if((b=T.closest('[data-sh-q]'))){closePop();if(cfg.onCorner)cfg.onCorner(b.dataset.shQ);return}
  if((b=T.closest('[data-sh-toggle]'))){toggleCol(b.dataset.shToggle);if(cfg.onChange)cfg.onChange('col',b.dataset.shToggle);return}
  if((b=T.closest('[data-sh-mode]'))){setMode(b.dataset.shMode);return}
  if((b=T.closest('[data-sh-min]'))){st.min[b.dataset.shMin]=true;save();drawBars();return}
  if((b=T.closest('[data-sh-unmin]'))){st.min[b.dataset.shUnmin]=false;save();drawBars();return}
  if((b=T.closest('[data-sh-hist]'))){const H=hists.find(h=>h.click);if(H)H[b.dataset.shHist]();return}
  if(T.closest('[data-sh-undo]')){const u=tUndo;tUndo=null;$('#sh-toast').classList.remove('on');if(u)u();return}
  if((b=T.closest('[data-sh-tab]'))&&sh){sh.tab=b.dataset.shTab;sheetDraw(false);$('#sh-sheet .sh-sbody').scrollTop=0;return}
  if((b=T.closest('[data-sh-sheet]'))){sheetClose(b.dataset.shSheet==='apply');return}
  if(T.id==='sh-scrim'){if(dialogOn)return;if(sheetOn){sheetClose(false);return}['side','panel'].forEach(w=>{if(col(w)==='over')col(w,'hidden')});return}
 });
 document.addEventListener('pointerdown',e=>{if(aiOn&&!e.target.closest('#sh-ai,[data-sh-ai],#sh-pop,#sh-dialog'))aiClose(true);const p=$('#sh-pop');if(p&&!p.hidden&&!e.target.closest('#sh-pop')&&!(p._a&&p._a.contains(e.target)))closePop()},true);
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(aiOn&&!($('#sh-pop')&&!$('#sh-pop').hidden)&&!dialogOn){aiClose();return}const p=$('#sh-pop');if(p&&!p.hidden){closePop();return}if(dialogOn){dialogClose();return}if(sheetOn){sheetClose(false);return}['side','panel'].forEach(w=>{if(col(w)==='over')col(w,'hidden')})});
 function mount(o){Object.assign(cfg,o||{});if(st.theme)document.documentElement.dataset.theme=st.theme==='Day'?'light':st.theme==='Sepia'?'sepia':'dark';el('div','sh-scrim','sh-scrim');el('div','sh-toast','sh-toast',{role:'status','aria-live':'polite'});const p=el('div','sh-pop','sh-pop');p.hidden=true;el('div','sh-sheet','sh-sheet');el('div','sh-dialog','sh-dialog');el('div','sh-mdock','sh-mdock');renderRail();renderTop();startPulse();const a=$('.sh-wrap');if(a)a.dataset.mode=st.mode;document.querySelectorAll('[data-sh-mode]').forEach(b=>b.classList.toggle('on',b.dataset.shMode===st.mode))}
 return{I,ic,esc,SPACES,mount,
  rail:o=>{Object.assign(cfg,o||{});renderRail()},top:renderTop,col,toggleCol,isPhone,
  toast,pop,closePop,ask,confirm:confirmBox,dialog,dialogClose,
  sheet:{open:sheetOpen,draw:()=>{if(sheetOn)sheetDraw(false)},close:sheetClose,isOpen:()=>sheetOn,tab:t=>{if(t&&sh){sh.tab=t}return sh&&sh.tab}},
  ai:{page:aiPage,open:aiOpen,close:aiClose,toggle:aiToggle,isOpen:()=>aiOn},
  history,clearable,autoClear,
  bar,drawBars,isMin:k=>!!st.min[k],track,tabs,handle,pulse,minUsed,setMin:(k,v)=>{st.min[k]=!!v;save();drawBars()},cornerHTML,
  theme:themeName,setTheme,mode:()=>st.mode,setMode,
  /* legacy: older mocks call Shell.icons('A'). The owner-chosen per-space rail icons win, so this only reports them. */
  icons:()=>Object.assign({},ICONSET,cfg.icons||{})};
})();
/* ==== end shell.js ==== */

/* ==== toolbar mock v4 on the shared shell: rail (new icons), top bar, gear menu, theme. The mock's own script follows. ==== */
let shellReady=false;
Shell.mount({space:'notebooks',due:17,
 onSpace:k=>{if(k!=='notebooks')toast(Shell.SPACES.find(s=>s[0]===k)[1]+' would open (mock)');return false},
 onCorner:k=>{if(k==='settings')settingsSheet();else toast('Would open: '+({save:'Save & restore',trash:'Trash',device:'Device mode',help:'Help'}[k]||k)+' (mock)')},
 onChange:(w,val)=>{if(w==='theme'&&shellReady){redraw();renderOpts();if(R.tool==='lasso')drawOverlay()}
  if(w==='mode'&&shellReady&&(val==='pro')!==isPro()&&(val==='pro'||ST.cur==='pro'||getLayout(ST.cur).all)){ST.cur=val==='pro'?'pro':'beginner';save();renderToolbar();renderOpts();if(typeof renderAll==='function')renderAll()}}});
Shell.top({crumbs:['Library','Reading','How to read books'],saved:'Saved',nav:true,actions:'<button class="lay danger" id="recBtn" hidden></button>'});
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-sh-search],[data-sh-nav],[data-sh-crumb]');if(!t||!shellReady)return;toast(t.matches('[data-sh-search]')?'Search would open (mock)':t.matches('[data-sh-nav]')?'Would go '+(t.dataset.shNav==='back'?'back':'forward')+' (mock)':'Would open '+t.textContent+' (mock)')});

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
let uidn=0;const uid=()=>'i'+Date.now().toString(36)+(uidn++);
const I={
undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/>',
text:'<path d="m15 16 2.536-7.328a1.02 1.02 1 0 1 1.928 0L22 16"/><path d="M15.697 14h5.606"/><path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16"/><path d="M3.304 13h6.392"/>',
pen:'<path d="m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18"/><path d="M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z"/><path d="m3 3 6.586 6.586"/><circle cx="11" cy="11" r="2"/>',
crosshair:'<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
penLine:'<path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
pencil:'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
scissors:'<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
trash:'<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
sliders:'<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
anchor:'<path d="M12 6v16"/><path d="m19 13 2-1a9 9 0 0 1-18 0l2 1"/><path d="M9 11h6"/><circle cx="12" cy="4" r="2"/>',
xmark:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
clipboard:'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
square:'<rect width="18" height="18" x="3" y="3" rx="2"/>',
scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
rotcw:'<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
typeic:'<path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>',
music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
eraser:'<path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/>',
lasso:'<path d="M3.704 14.467a10 8 0 1 1 3.115 2.375"/><path d="M7 22a5 5 0 0 1-2-3.994"/><circle cx="5" cy="16" r="2"/>',
insert:'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
newline:'<path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/>',
back:'<path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/>',
kb:'<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
kboff:'<path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m3 21 18-18"/>',
more:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
read:'<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
last:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
search:'<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
layout:'<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
img:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
table:'<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
chevU:'<path d="m18 15-6-6-6 6"/>',
minus:'<path d="M5 12h14"/>',
grid:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
moon:'<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
eye:'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
file:'<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>',
bold:'<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
italic:'<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
underline:'<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/>',
list:'<path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13"/>',
olist:'<path d="M11 5h10M11 12h10M11 19h10"/><path d="M4 4h1v5M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/>',
quote:'<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
h1:'<path d="M4 12h8M4 18V6M12 18V6"/><path d="m17 12 3-2v8"/>',
code:'<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
camera:'<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
mic:'<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
hlight:'<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
ruler:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
shapes:'<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
palette:'<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/>',
zin:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>',
zout:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>',
fit:'<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
focus:'<circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>',
stack:'<path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"/><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"/><rect width="8" height="8" x="14" y="14" rx="2"/>',
ftext:'<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5M10 9H8M16 13H8M16 17H8"/>',
tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
fdown:'<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5M12 18v-6m-3 3 3 3 3-3"/>',
share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
printer:'<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
dup:'<path d="M15 12v6M12 15h6"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
move:'<path d="M12 2v20"/><path d="m15 19-3 3-3-3M19 9l3 3-3 3M2 12h20M5 9l-3 3 3 3M9 5l3-3 3 3"/>',
chevL:'<path d="m15 18-6-6 6-6"/>',chevR:'<path d="m9 18 6-6-6-6"/>',
house:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
library:'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
notebook:'<path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M16 2v20"/>',
brain:'<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4"/><path d="M17.707 6.294A3 3 0 1012 5a3 3 0 10-5.707 1.294"/><path d="M17.996 5.125a4 4 0 012.526 5.77"/><path d="M18 18a4 4 0 002-7.465"/><path d="M19.967 17.482a4 4 0 11-7.967.517 4 4 0 11-7.967-.517"/><path d="M6 18a4 4 0 01-2-7.465"/><path d="M6.004 5.125a4 4 0 00-2.526 5.77"/>',
chevD:'<path d="m6 9 6 6 6-6"/>',
eyeOff:'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
unlock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
up:'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
down:'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
layers:'<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
star:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
play:'<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
strike:'<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><path d="M4 12h16"/>',
indent:'<path d="M21 12H11"/><path d="M21 18H11"/><path d="M21 6H11"/><path d="m3 8 4 4-4 4"/>',
outdent:'<path d="M21 12H11"/><path d="M21 18H11"/><path d="M21 6H11"/><path d="m7 8-4 4 4 4"/>',
alignL:'<path d="M15 12H3"/><path d="M17 18H3"/><path d="M21 6H3"/>',
alignC:'<path d="M17 12H7"/><path d="M19 18H5"/><path d="M21 6H3"/>',
alignR:'<path d="M21 12H9"/><path d="M21 18H7"/><path d="M21 6H3"/>',
alignJ:'<path d="M3 12h18"/><path d="M3 18h18"/><path d="M3 6h18"/>',
checks:'<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
pin:'<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
tape:'<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M8 7v10M16 7v10"/>',
merge:'<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/>',
cstop:'<circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
wand:'<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>',
dots9:'<circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="18" r="1"/>',
lines:'<path d="M4 6h16M4 12h16M4 18h16"/>',
database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
mindmap:'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
fplus:'<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M9 15h6"/><path d="M12 18v-6"/>',
info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
volume:'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
wave:'<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
home2:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
bookopen:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
ball:'<circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6"/>',
brush:'<path d="m11 10 3 3"/><path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z"/><path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031"/>',
cross2:'<path d="M3 3l18 18M21 3 3 21"/>',
speaker:'<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
arrow:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
triangle:'<path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>',
oval:'<ellipse cx="12" cy="12" rx="10" ry="7"/>',
diagonal:'<path d="M5 19 19 5"/>',
type2:'<path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>',
check2:'<path d="M20 6 9 17l-5-5"/>',
gear:'<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>'};
/* Missing icon names fall back to a default icon and warn once, so a chip never shows blank. */
const warned=new Set();
I.minim='<path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/>';
const svg=n=>{if(!I[n]){if(!warned.has(n)){warned.add(n);console.warn('[mock] missing icon "'+n+'", using the fallback icon')}n='help'}return'<svg viewBox="0 0 24 24" aria-hidden="true">'+I[n]+'</svg>'};
/* Pen-type drawings (Apple tool picker style): one shared barrel standing tip-up; only the nib differs.
   The colour band and the tip take the current ink colour c (the highlighter's are translucent). */
function penSvg(k,c){
 const f='style="fill:'+c+(k==='hl'?';fill-opacity:.6':'')+'"';
 const nib={
 pen:'<path class="pg" d="M6 16 9.6 8.6h4.8L18 16z"/><path class="pm" d="M9.6 8.6l1.9-5.4a.52.52 0 0 1 1 0l1.9 5.4z"/><path d="M11 4.9l.6-1.7a.42.42 0 0 1 .8 0l.6 1.7z" style="fill:'+c+';stroke:none"/>',
 ball:'<path class="pg" d="M6 16l2.6-5.4h6.8L18 16z"/><path class="pm" d="M10.2 10.6l1-3.2h1.6l1 3.2z"/><circle cx="12" cy="5.6" r="2" style="fill:'+c+';stroke:none"/>',
 brush:'<path class="pg" d="M6 16l2.2-4.6h7.6L18 16z"/><path d="M8.6 11.4c0-4.2 1.6-7 3.4-8.6 1.8 1.6 3.4 4.4 3.4 8.6z" style="fill:'+c+'"/>',
 pencil:'<path class="pw" d="M6 16 11.5 3.5a.55.55 0 0 1 1 0L18 16z"/><path d="M10.15 6.6 11.5 3.5a.55.55 0 0 1 1 0l1.35 3.1z" '+f+'/>',
 marker:'<path class="pg" d="M6 16v-2.2l2.6-3.3h6.8l2.6 3.3V16z"/><path d="M9.3 10.5V5.7a2.7 2.7 0 0 1 5.4 0v4.8z" '+f+'/>',
 hl:'<path class="pg" d="M6 16v-2.2l1.2-3.3h9.6l1.2 3.3V16z"/><path d="M7.6 10.5V7l8.8-4v7.5z" '+f+'/>'}[k];
 return '<svg viewBox="0 0 24 36" aria-hidden="true"><path class="pb" d="M6 16h12v16.3a2.2 2.2 0 0 1-2.2 2.2H8.2A2.2 2.2 0 0 1 6 32.3z"/><path d="M6 19.6h12v3.8H6z" '+f+'/><path class="ph" d="M8.5 25.8v6.2"/><path class="ps" d="M15.5 25.8v6.2"/>'+nib+'</svg>'}

/* ---------- tools, layouts, storage ---------- */
const TOOLS={undo:['Undo',1],redo:['Redo',1],text:['Text',2],pen:['Pen',2],eraser:['Eraser',2],lasso:['Lasso',3],last:['Last tool',3],insert:['Insert',4],layout:['Layout',4],newline:['New line',5],back:['Backspace',5],kb:['Keyboard',5],mic:['Mic',5],search:['Search',6],read:['Reading mode',6],more:['More',7]};
const MODES=['text','pen','eraser','lasso','insert'];
const ALLIDS=Object.keys(TOOLS);
function builtin(id){
 if(id==='pro')return{name:'Professional',ids:[...ALLIDS],hidden:['read'],all:true};
 return{name:'Beginner',ids:[...ALLIDS],hidden:['last','layout','search','read','mic'],all:false}}
const KEY='tbmock.v8';
const store={get(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}},set(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}};
let ST=Object.assign({cur:'beginner',ov:{},own:{},kbHidden:true,names:false,keepOpen:true},store.get()||{});
function fix(l){if(!l||!Array.isArray(l.ids))return;l.ids=l.ids.filter(i=>TOOLS[i]);ALLIDS.forEach(i=>{if(!l.ids.includes(i))l.ids.push(i)});l.hidden=(l.hidden||[]).filter(i=>TOOLS[i]);if(!l.hidden)l.hidden=[]}
ST.eraser=Object.assign({mode:'standard',size:1,hlOnly:false,ret:false},ST.eraser||{});if(!['precise','standard','stroke'].includes(ST.eraser.mode))ST.eraser.mode='standard';if(![0,1,2].includes(ST.eraser.size))ST.eraser.size=1;
const ROWACT=['copy','cut','duplicate','convert','colour','delete','thickness','makeCard','summary','label'];
const ROWNAME={copy:'Copy',cut:'Cut',duplicate:'Duplicate',convert:'Convert to text',colour:'Colour',delete:'Delete',thickness:'Thickness',makeCard:'Make card',summary:'Add to Summary',label:'Name this drawing'};
ST.lasso=Object.assign({shape:'free',ink:true,pictures:true,text:true,row:['copy','cut','duplicate','convert','colour']},ST.lasso||{});if(!['free','rect'].includes(ST.lasso.shape))ST.lasso.shape='free';ST.lasso.row=(Array.isArray(ST.lasso.row)?ST.lasso.row:[]).filter(a=>ROWACT.includes(a));
ST.presets=ST.presets||[];ST.boxDef=ST.boxDef||{v:{},fs:''};ST.ov=ST.ov||{};ST.own=ST.own||{};Object.values(ST.ov).forEach(fix);Object.values(ST.own).forEach(fix);
const save=()=>store.set(ST);
const isBuiltin=id=>id==='beginner'||id==='pro';
const getLayout=id=>ST.own[id]||ST.ov[id]||(isBuiltin(id)?builtin(id):null);
if(!getLayout(ST.cur))ST.cur='beginner';
const layoutName=id=>{const l=getLayout(id);return l.name+(ST.ov[id]?' (this device)':'')};
const layoutIds=()=>['beginner','pro',...Object.keys(ST.own)];
function editLayout(fn){const id=ST.cur;if(isBuiltin(id)&&!ST.ov[id])ST.ov[id]=clone(builtin(id));fn(getLayout(id));save();renderToolbar();updateStates()}
function resetLayout(id){if(isBuiltin(id))delete ST.ov[id];else if(ST.own[id]){Object.assign(ST.own[id],clone(ST.own[id].orig))}save()}

/* ---------- session state ---------- */
const R={lassoMode:'Free',clip:null,tool:'pen',prevTool:'text',pen:'Fountain',size:'Medium',hlSize:'Medium',layers:[{name:'Layer 1',show:true,lock:false}],la:0,penCol:'#a48df5',hlCol:'#f5d76e',eraser:'Whole stroke',defSize:'body',txtCol:null,kbOpen:false,reading:false,tbHidden:false,optsOn:true,allTab:'Text',sel:null,last:null,hadSel:false,restoring:false};
const SIZES={Fine:1.5,Medium:3,Bold:5};
const paper=$('#paper'),tb=$('#tb'),opts=$('#opts'),all=$('#all'),menu=$('#more'),sheet=$('#sheet'),bg=$('#bg'),tip=$('#tip'),lmenu=$('#lmenu'),ring=$('#ring');
const cvH=$('#cvH'),cv=$('#cv'),cvO=$('#cvO'),cxH=cvH.getContext('2d'),cx=cv.getContext('2d'),cxO=cvO.getContext('2d');
let strokes=[];
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('act');t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1900)}
const pt=e=>{const r=paper.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};

/* ---------- history ---------- */
let hist=[],hi=-1,ct;
const ser=b=>({id:b.dataset.id,t:b.dataset.t,k:b.dataset.k||'',rot:b.dataset.rot||'',x:parseFloat(b.style.left)||0,y:parseFloat(b.style.top)||0,w:b.style.width,size:b.dataset.size,st:b.dataset.st,h:b.querySelector('.txt').innerHTML,fs:b.style.getPropertyValue('--fs'),mh:b.style.minHeight,sty:getV(b)});
const snap=()=>JSON.stringify({b:$$('.box',paper).map(ser),s:strokes,ly:R.layers,la:R.la});
function commit(){if(R.restoring)return;const s=snap();if(hist[hi]===s){updateStates();return}hist.length=hi+1;hist.push(s);if(hist.length>120)hist.shift();hi=hist.length-1;updateStates()}
function flush(){clearTimeout(ct);commit()}
function restore(s){R.restoring=true;const d=JSON.parse(s),selId=R.sel&&R.sel.dataset.id;
 $$('.box',paper).forEach(b=>b.remove());R.sel=null;R.last=null;clearLasso(true);
 d.b.forEach(x=>{const b=makeBox(x);if(x.id===selId&&R.tool==='text'){b.classList.add('sel');R.sel=b}});
 strokes=d.s;if(d.ly){R.layers=d.ly;R.la=Math.min(d.la||0,d.ly.length-1)}R.restoring=false;redraw();drawOverlay();renderOpts();updateStates()}
function undo(){flush();if(hi>0){hi--;restore(hist[hi])}}
function redo(){flush();if(hi<hist.length-1){hi++;restore(hist[hi])}}

/* ---------- canvases / ink ---------- */
function sizeCv(){const w=paper.clientWidth,h=paper.clientHeight,d=Math.min(window.devicePixelRatio||1,2);[cvH,cv,cvO].forEach(c=>{c.width=Math.round(w*d);c.height=Math.round(h*d)});[cxH,cx,cxO].forEach(x=>x.setTransform(d,0,0,d,0,0));redraw();drawOverlay()}
let rq=0;function redraw(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;paint()})}
function mid(a,b){return[(a[0]+b[0])/2,(a[1]+b[1])/2]}
function smoothPath(c,p){c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length-1;i++){const m=mid(p[i],p[i+1]);c.quadraticCurveTo(p[i][0],p[i][1],m[0],m[1])}const l=p[p.length-1];c.lineTo(l[0],l[1])}
const prs=e=>e.pointerType==='pen'&&e.pressure>0?e.pressure:.5;

/* ---------- eraser ---------- */
/* Beginner: the simple pill (Whole stroke / Partial / Highlights only), 14 px radius.
   Professional: the app's eraser (Precise / Standard / Whole stroke, 3 sizes, highlights-only switch, go-back switch, detail card). */
const ER=14,ERS=[8,18,32],E=ST.eraser,STD_REACH=1.35,STD_MIN=1.5;
const isPro=()=>!!(getLayout(ST.cur)||{}).all;
const erR=()=>isPro()?ERS[E.size]/2:ER;
function erCfg(){if(isPro())return{m:{precise:'precise',standard:'standard',stroke:'whole'}[E.mode],r:ERS[E.size]/2,hl:E.hlOnly,pro:true};
 return{m:R.eraser==='Partial'?'precise':'whole',r:ER,hl:R.eraser==='Highlights only',pro:false}}
function segDist(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((px-a[0])*dx+(py-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy)}
function hitStroke(s,x,y,r){const p=s.pts;r+=s.w/2;if(s.k==='tape'){const a=p[0],b=p[1]||a;return x>=Math.min(a[0],b[0])-r&&x<=Math.max(a[0],b[0])+r&&y>=Math.min(a[1],b[1])-r&&y<=Math.max(a[1],b[1])+r}if(p.length===1)return Math.hypot(x-p[0][0],y-p[0][1])<=r;for(let i=1;i<p.length;i++)if(segDist(x,y,p[i-1],p[i])<=r)return true;return false}
const dPath=(x,y,P)=>P.length===1?Math.hypot(x-P[0][0],y-P[0][1]):segDist(x,y,P[0],P[1]);
/* erase along the segment (fx,fy)->(x,y); runs live while dragging. Returns true if anything changed. */
function eraseAt(x,y,fx,fy){const c=erCfg(),P=fx==null?[[x,y]]:[[fx,fy],[x,y]],out=[];let ch=false;
 const reach0=c.r*(c.m==='standard'?STD_REACH:1);
 strokes.forEach(s=>{if((c.hl&&s.k!=='hl')||!lyEdit(s)){out.push(s);return}
  if(s.k==='tape'){if(P.some(q=>hitStroke(s,q[0],q[1],reach0)))ch=true;else out.push(s);return}
  const reach=reach0+s.w/2,p=s.pts,hit=q=>dPath(q[0],q[1],P)<=reach;
  const touched=p.some(hit)||p.some((q,i)=>i&&hit(mid(p[i-1],q)));
  if(!touched){out.push(s);return}ch=true;
  if(c.m==='whole')return;
  const runs=[];let run=[];p.forEach(q=>{if(hit(q)){if(run.length)runs.push(run);run=[]}else run.push(q)});if(run.length)runs.push(run);
  const minLen=c.m==='standard'?c.r*STD_MIN:0;
  runs.forEach(r=>{if(c.pro){if(r.length<2&&p.length>1)return;if(minLen){let n=0;for(let i=1;i<r.length;i++)n+=Math.hypot(r[i][0]-r[i-1][0],r[i][1]-r[i-1][1]);if(n<minLen)return}}
   out.push({id:uid(),k:s.k,color:s.color,w:s.w,pts:r})})});
 if(ch){strokes=out;redraw()}
 if(c.pro&&c.hl&&eraseTextHl(x,y,fx==null?x:fx,fy==null?y:fy,c.r))ch=true;
 return ch}
/* "Erase highlights only" also takes the highlighter off typed text under the eraser */
function eraseTextHl(x,y,fx,fy,r){const pr=paper.getBoundingClientRect(),x0=Math.min(x,fx)-r+pr.left,x1=Math.max(x,fx)+r+pr.left,y0=Math.min(y,fy)-r+pr.top,y1=Math.max(y,fy)+r+pr.top;let ch=false;
 $$('.txt [style*="background"]',paper).forEach(el=>{if([...el.getClientRects()].some(b=>b.right>=x0&&b.left<=x1&&b.bottom>=y0&&b.top<=y1)){el.style.backgroundColor='';ch=true}});return ch}
const saveE=()=>save();
const ECOPY={precise:['Precise','Rubs out only what the tip touches, to the pixel.'],standard:['Standard','Rubs out a small area around the tip.'],stroke:['Whole stroke','Removes the whole line you touch.']};
const ESIZE=['Thin','Medium','Thick'];
/* ---- shared card plumbing (eraser card + lasso card sit under the pill) ---- */
const ecard=$('#ecard'),lcard=$('#lcard');
const swRow=(attrs,label)=>'<button class="srw" role="switch" '+attrs+'><span>'+label+'</span><span class="sw2" aria-hidden="true"></span></button>';
const setChecked=(el,on)=>el.setAttribute('aria-checked',!!on);
ecard.addEventListener('click',e=>{const b=e.target.closest('[data-e]');if(!b)return;const k=b.dataset.e;
 if(k==='close')R.ecard=false;else if(k==='mode')E.mode=b.dataset.v;else if(k==='size')E.size=+b.dataset.v;else if(k==='hl')E.hlOnly=!E.hlOnly;else if(k==='ret')E.ret=!E.ret;
 saveE();renderOpts()});
/* a pill button in the app's style: pressed = soft tint + accent + short underline; tapping the chosen one again opens its card */
function pillBtn(html,on,f,label){const b=document.createElement('button');b.className='opt pp'+(on?' on':'');b.innerHTML=html;b.dataset.tip=label;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',!!on);b.onclick=f;opts.append(b);return b}
function proEraser(){const ic={precise:'crosshair',standard:'eraser',stroke:'penLine'};
 Object.keys(ECOPY).forEach(m=>pillBtn(svg(ic[m]),E.mode===m,()=>{if(E.mode===m)R.ecard=!R.ecard;else{E.mode=m;saveE()}renderOpts()},ECOPY[m][0]));
 ESIZE.forEach((n,i)=>{const d=Math.min(22,Math.max(4,ERS[i]/3*1.4));pillBtn('<span class="sdot" style="width:'+d.toFixed(1)+'px;height:'+d.toFixed(1)+'px"></span>',E.size===i,()=>{if(E.size===i)R.ecard=!R.ecard;else{E.size=i;saveE()}renderOpts()},n)});
 pillBtn(svg('hlight'),E.hlOnly,()=>{E.hlOnly=!E.hlOnly;saveE();renderOpts()},'Erase highlights only');caret('ecard','More eraser options',opts)}
/* ---- Professional lasso pill + card (shape, what it picks, which actions sit in the menu row) ---- */
const LSHAPE=[['free','lasso','Free-hand'],['rect','square','Rectangle']],LFILT=[['ink','pen','Ink'],['pictures','img','Pictures'],['text','typeic','Text']];
function proLasso(){LSHAPE.forEach(([k,ic,n])=>pillBtn(svg(ic),ST.lasso.shape===k,()=>{if(ST.lasso.shape===k)R.lcard=!R.lcard;else{ST.lasso.shape=k;save()}renderOpts()},n));
 LFILT.forEach(([k,ic,n])=>pillBtn(svg(ic),ST.lasso[k],()=>{ST.lasso[k]=!ST.lasso[k];save();renderOpts()},n));caret('lcard','More lasso options',opts)}
lcard.addEventListener('click',e=>{if(layerClick(e))return;const b=e.target.closest('[data-l]');if(!b)return;const k=b.dataset.l,v=b.dataset.v;
 if(k==='arrange'){arrangeSheet();return}
 if(k==='close')R.lcard=false;else if(k==='shape')ST.lasso.shape=v;else if(k==='f')ST.lasso[v]=!ST.lasso[v];
 else if(k==='row'){const r=ST.lasso.row.filter(a=>a!==v);ST.lasso.row=ST.lasso.row.includes(v)?r:[...r,v]}
 save();renderOpts();if(k==='row')syncLsel()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&(R.ecard||R.lcard||R.acard)){R.ecard=R.lcard=R.acard=false;renderEcard();renderLcard();renderAcard()}});

/* ---------- lasso ---------- */
const L={ids:new Set(),boxes:[],bbox:null,drag:null,rz:null};let lz=null;
function inPoly(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c}return c}
function sbox(s){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;s.pts.forEach(q=>{x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1])});const m=s.w*(s.k==='hl'?.6:s.k==='tape'?0:1.5)+2;return{x0:x0-m,y0:y0-m,x1:x1+m,y1:y1+m}}
function bboxOf(b){return{x0:b.offsetLeft,y0:b.offsetTop,x1:b.offsetLeft+b.offsetWidth,y1:b.offsetTop+b.offsetHeight}}
function calcBBox(){const rs=[...strokes.filter(s=>L.ids.has(s.id)).map(sbox),...L.boxes.map(bboxOf)];if(!rs.length){L.bbox=null;return}
 L.bbox={x0:Math.min(...rs.map(r=>r.x0))-6,y0:Math.min(...rs.map(r=>r.y0))-6,x1:Math.max(...rs.map(r=>r.x1))+6,y1:Math.max(...rs.map(r=>r.y1))+6}}
function clearLasso(silent){L.ids.clear();L.boxes.forEach(b=>b.classList.remove('lsel'));L.boxes=[];L.bbox=null;L.drag=null;L.rz=null;lz=null;lmenu.hidden=true;$('.lcol',lmenu).hidden=true;R.lm={};syncLsel();if(!silent)drawOverlay()}
const selCount=()=>L.ids.size+L.boxes.length;
const LCOL=['auto','#a48df5','#ef7a6f','#4cc38a','#5aa9ff','#f0b94a'];
(function(){const r=$('.lcol',lmenu);LCOL.forEach(c=>{const d=document.createElement('button');d.className='dot';d.dataset.col=c;d.style.background=c==='auto'?'var(--ink)':c;d.setAttribute('aria-label','Colour '+c);r.append(d)})})();
function drawOverlay(){const w=paper.clientWidth,h=paper.clientHeight;cxO.clearRect(0,0,w,h);const ac=css('--accent');cxO.save();cxO.strokeStyle=ac;cxO.lineWidth=1.5;cxO.setLineDash([6,5]);
 if(lz&&lz.length>1){cxO.beginPath();lz.forEach((q,i)=>i?cxO.lineTo(q[0],q[1]):cxO.moveTo(q[0],q[1]));
  if(isPro()){/* the app's loop: accent line with a soft halo and a light tint */cxO.setLineDash([]);cxO.lineJoin='round';cxO.lineCap='round';cxO.fillStyle=ac;cxO.globalAlpha=.1;cxO.save();cxO.closePath();cxO.fill();cxO.restore();cxO.globalAlpha=.55;cxO.strokeStyle=css('--surface-0');cxO.lineWidth=5;cxO.stroke();cxO.globalAlpha=1;cxO.strokeStyle=ac;cxO.lineWidth=2.5;cxO.stroke()}
  else{if(lassoRect()){cxO.closePath();cxO.fillStyle=ac;cxO.globalAlpha=.07;cxO.fill();cxO.globalAlpha=1}cxO.stroke()}}
 if(L.bbox&&!isPro()){strokes.filter(s=>L.ids.has(s.id)).forEach(s=>{const r=sbox(s);cxO.globalAlpha=.55;cxO.strokeRect(r.x0,r.y0,r.x1-r.x0,r.y1-r.y0)});cxO.globalAlpha=1;const b=L.bbox;cxO.strokeRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
  cxO.setLineDash([]);cxO.fillStyle=ac;cxO.strokeStyle=css('--surface-0');cxO.lineWidth=2;cxO.beginPath();cxO.arc(b.x1,b.y1,7,0,7);cxO.fill();cxO.stroke()}
 cxO.restore();
 if(isPro()){lmenu.hidden=true;syncLsel()}
 else if(L.bbox&&!L.drag&&!L.rz&&!lz){lmenu.hidden=false;const mw=lmenu.offsetWidth,mh=lmenu.offsetHeight;lmenu.style.left=Math.max(4,Math.min(L.bbox.x0,paper.clientWidth-mw-4))+'px';let t=L.bbox.y0-mh-10;if(t<4)t=Math.min(L.bbox.y1+12,paper.clientHeight-mh-4);lmenu.style.top=Math.max(4,t)+'px'}else lmenu.hidden=true}
/* "any overlap" catch: a point inside, the loop passing near ink, or edges crossing */
function segX(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0}
function polyHitsRect(p,r){if(p.some(q=>q[0]>=r.x0&&q[0]<=r.x1&&q[1]>=r.y0&&q[1]<=r.y1))return true;
 const cs=[[r.x0,r.y0],[r.x1,r.y0],[r.x1,r.y1],[r.x0,r.y1]];if(cs.some(c=>inPoly(c[0],c[1],p)))return true;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];for(let k=0;k<4;k++)if(segX(a,b,cs[k],cs[(k+1)%4]))return true}return false}
function polyHitsStroke(p,s){if(s.k==='tape')return polyHitsRect(p,sbox(s));if(s.pts.some(q=>inPoly(q[0],q[1],p)))return true;if(p.some(q=>hitStroke(s,q[0],q[1],8)))return true;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];for(let j=1;j<s.pts.length;j++)if(segX(a,b,s.pts[j-1],s.pts[j]))return true}return false}
function finishLasso(){const p=lz;lz=null;const rect=lassoRect();
 /* the app: a tap on a stroke selects it */
 if(isPro()&&!rect&&p&&p.length<5&&ST.lasso.ink){const q=p[0];let hitS=null;for(let i=strokes.length-1;i>=0&&!hitS;i--)if(lyEdit(strokes[i])&&hitStroke(strokes[i],q[0],q[1],10))hitS=strokes[i];
  if(hitS){L.ids.clear();L.boxes.forEach(b=>b.classList.remove('lsel'));L.boxes=[];L.ids.add(hitS.id);calcBBox();drawOverlay();lassoUi();return}}
 if(!p||(!rect&&p.length<5)||(rect&&Math.abs((p[2][0]-p[0][0])*(p[2][1]-p[0][1]))<100)){drawOverlay();return}
 L.ids.clear();L.boxes.forEach(b=>b.classList.remove('lsel'));L.boxes=[];
 strokes.forEach(s=>{if((!isPro()||ST.lasso.ink)&&lyEdit(s)&&polyHitsStroke(p,s))L.ids.add(s.id)});
 $$('.box',paper).forEach(b=>{if(boxPickable(b)&&polyHitsRect(p,bboxOf(b))){L.boxes.push(b);b.classList.add('lsel')}});
 calcBBox();if(!L.bbox)toast(isPro()&&!(ST.lasso.ink||ST.lasso.pictures||ST.lasso.text)?'Turn on Ink, Pictures or Text to pick something':'Nothing inside that loop');drawOverlay();lassoUi()}
const lassoRect=()=>isPro()?ST.lasso.shape==='rect':R.lassoMode==='Rectangle';
const boxPickable=b=>!isPro()||(b.dataset.t==='pic'?ST.lasso.pictures:ST.lasso.text);
function lassoUi(){if(R.tool==='lasso')renderOpts()}
function lassoMove(dx,dy){strokes.forEach(s=>{if(L.ids.has(s.id))s.pts.forEach(q=>{q[0]+=dx;q[1]+=dy})});if(mvBoxes())L.boxes.forEach(b=>setBoxPos(b,b.offsetLeft+dx,b.offsetTop+dy));calcBBox();redraw();drawOverlay()}
function lassoScale(r,ax,ay){strokes.forEach(s=>{if(!L.ids.has(s.id))return;s.pts.forEach(q=>{q[0]=ax+(q[0]-ax)*r;q[1]=ay+(q[1]-ay)*r});s.w=Math.max(.8,s.w*r)});
 L.boxes.forEach(b=>{const l=b.offsetLeft,t=b.offsetTop,w=b.offsetWidth*r;b.style.width=w+'px';const fs=Math.max(.4,Math.min(4,(parseFloat(b.style.getPropertyValue('--fs'))||1)*r));b.style.setProperty('--fs',fs);setBoxPos(b,ax+(l-ax)*r,ay+(t-ay)*r)});calcBBox();redraw();drawOverlay()}
function lcopy(){calcBBox();R.clip={s:strokes.filter(s=>L.ids.has(s.id)).map(clone),b:L.boxes.map(ser),n:0}}
function ldel(){strokes=strokes.filter(s=>!L.ids.has(s.id));L.boxes.forEach(b=>{if(R.sel===b)R.sel=null;b.remove()});clearLasso(true);redraw();drawOverlay()}
function lpaste(){const c=R.clip;if(!c){toast('Nothing copied yet');return}c.n++;const o=24*c.n;clearLasso(true);
 const ns=c.s.map(x=>{const k=clone(x);k.id=uid();k.pts.forEach(q=>{q[0]+=o;q[1]+=o});return k});strokes.push(...ns);
 const nb=c.b.map(d=>{const e=clone(d);e.id=uid();e.x+=o;e.y+=o;return makeBox(e)});
 L.ids=new Set(ns.map(x=>x.id));L.boxes=nb;nb.forEach(b=>b.classList.add('lsel'));calcBBox();redraw();drawOverlay();commit();lassoUi();toast('Pasted')}
function lassoAct(a,arg){
 if(a==='paste'){lpaste();return}
 if(!selCount()){toast('Select something with the lasso first');return}
 if(a==='copy'){lcopy();toast('Copied')}
 else if(a==='cut'){lcopy();ldel();commit();lassoUi();toast(isPro()?'Cut. Paste it from the ⋯ menu of a selection.':'Cut')}
 else if(a==='del'){ldel();commit();lassoUi();toast('Deleted')}
 else if(a==='dup'){lcopy();const keep=R.clip;lpaste();R.clip=keep;toast('Duplicated')}
 else if(a==='col'){strokes.forEach(x=>{if(L.ids.has(x.id))x.color=arg});
  L.boxes.forEach(b=>{b.querySelectorAll('*').forEach(el=>{if(el.style)el.style.color='';el.removeAttribute('color')});b.querySelector('.txt').style.color=arg==='auto'?'':arg});redraw();commit();toast('Colour changed')}
 else if(a==='thick'){strokes.forEach(x=>{if(L.ids.has(x.id))x.w=arg});calcBBox();redraw();drawOverlay();commit();toast('Thickness changed')}
 else if(a==='label'){const tx=String(arg||'').trim().slice(0,80);strokes.forEach(x=>{if(L.ids.has(x.id)){if(tx)x.label=tx;else delete x.label}});commit();toast(tx?'Name saved':'Name removed')}
 else if(a==='card')toast('A recall card would be made from this selection (demo)');
 else if(a==='sum')toast('Added to the Summary (demo)');
 else if(a==='conv')convertDemo();
 else if(a==='shot')screenshot();
 else if(a==='copyPng')pngOut('copy');
 else if(a==='savePng')pngOut('save')}
lmenu.addEventListener('click',e=>{const c=e.target.closest('[data-col]');if(c){lassoAct('col',c.dataset.col);return}
 const a=e.target.closest('button');if(!a)return;
 if(a.dataset.a==='col'){const r=$('.lcol',lmenu);r.hidden=!r.hidden;return}
 lassoAct(a.dataset.a)});

/* ---- Lasso selection: picture of the selection, and a labelled demo of "Convert to text" ---- */
function wrapText(x,text,maxW){const out=[];String(text).split('\n').forEach(par=>{let line='';par.split(/\s+/).forEach(w=>{const t=line?line+' '+w:w;if(line&&x.measureText(t).width>maxW){out.push(line);line=w}else line=t});out.push(line)});return out}
function drawBoxTo(x,b){const pr=paper.getBoundingClientRect(),rr=b.getBoundingClientRect(),bx=rr.left-pr.left,by=rr.top-pr.top,tx=b.querySelector('.txt'),ff=getComputedStyle(document.body).fontFamily;x.save();
 if(b.dataset.t==='pic'){x.setLineDash([6,4]);x.strokeStyle=css('--line-strong');x.lineWidth=1.5;x.strokeRect(bx+1,by+1,rr.width-2,rr.height-2);x.setLineDash([]);x.fillStyle=css('--muted');x.font='14px '+ff;x.textAlign='center';x.textBaseline='middle';x.fillText('Picture',bx+rr.width/2,by+rr.height/2)}
 else if(b.dataset.t==='table'){x.strokeStyle=css('--line-strong');x.lineWidth=1;x.fillStyle=css('--ink');x.font='15px '+ff;x.textBaseline='middle';$$('td',b).forEach(td=>{const r=td.getBoundingClientRect();x.strokeRect(r.left-pr.left,r.top-pr.top,r.width,r.height);x.fillText(td.textContent,r.left-pr.left+8,r.top-pr.top+r.height/2)})}
 else if(tx){const cs=getComputedStyle(tx),tr=tx.getBoundingClientRect(),px=parseFloat(cs.paddingLeft)||0,lh=parseFloat(cs.lineHeight)||32;
  if(cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'){x.fillStyle=cs.backgroundColor;x.beginPath();x.roundRect?x.roundRect(tr.left-pr.left,tr.top-pr.top,tr.width,tr.height,parseFloat(cs.borderTopLeftRadius)||0):x.rect(tr.left-pr.left,tr.top-pr.top,tr.width,tr.height);x.fill()}
  x.fillStyle=cs.color;x.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;x.textBaseline='middle';x.textAlign='left';
  wrapText(x,tx.innerText,tr.width-px*2).forEach((l,i)=>x.fillText(l,tr.left-pr.left+px,tr.top-pr.top+(parseFloat(cs.paddingTop)||0)+lh*(i+.5)))}
 x.restore()}
function selSnapshot(scale){calcBBox();if(!L.bbox)return null;scale=scale||2;const b=L.bbox,w=Math.max(8,b.x1-b.x0),h=Math.max(8,b.y1-b.y0),c=document.createElement('canvas');c.width=Math.ceil(w*scale);c.height=Math.ceil(h*scale);
 const x=c.getContext('2d'),fg=css('--ink'),mine=strokes.filter(s=>L.ids.has(s.id));x.scale(scale,scale);x.fillStyle=css('--surface-0');x.fillRect(0,0,w,h);x.translate(-b.x0,-b.y0);
 mine.filter(s=>s.k==='hl').forEach(s=>drawStroke(x,s,fg));L.boxes.forEach(bx=>drawBoxTo(x,bx));mine.filter(s=>s.k!=='hl').forEach(s=>drawStroke(x,s,fg));return c}
function screenshot(){const c=selSnapshot(2);if(!c){toast('Select something with the lasso first');return}R.shotC=c;
 openSheet('<h3>Screenshot of the selection</h3><p class="muted">A picture of just what you looped, ready to copy or save.</p><div class="shotbox"><img alt="Screenshot of the selection" src="'+c.toDataURL('image/png')+'"></div>','<button class="lay" data-act="close">Close</button><button class="lay" data-act="shotcopy">Copy picture</button><button class="lay primary" data-act="shotsave">Save PNG</button>')}
function pngOut(how,c){c=c||selSnapshot(2);if(!c){toast('Select something with the lasso first');return}
 if(how==='save'){const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='selection.png';document.body.append(a);a.click();a.remove();toast('Picture saved');return}
 try{c.toBlob(b=>{navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(()=>toast('Picture copied'),()=>toast('Copy is blocked here: use Save as picture'))})}catch(_){toast('Copy is blocked here: use Save as picture')}}
const DEMOTXT=['Remember to review chapter 3','Key idea: spaced repetition beats cramming','Active recall beats re-reading','Read, recall, repeat'];
function convertDemo(){const mine=strokes.filter(s=>L.ids.has(s.id));if(!mine.length){toast('Loop some handwriting first');return}
 const keep=L.boxes.slice(),c=(function(){const ob=L.boxes;L.boxes=[];const r=selSnapshot(1);L.boxes=ob;return r})();calcBBox();
 R.convTxt=DEMOTXT[(mine.length+Math.round(L.bbox.x0/40))%DEMOTXT.length];
 openSheet('<h3>Convert to text<span class="badge2">Demo</span></h3><p class="muted">This is a demo: the real handwriting reader comes later, so the text below is a stand-in. The replace step is real, one Undo brings your ink back.</p><div class="shotbox"><img alt="Your handwriting" src="'+c.toDataURL('image/png')+'"></div><label class="muted" for="cvTxt" style="display:block;margin-top:12px">Result (demo text, you can edit it)</label><input class="field" id="cvTxt" maxlength="120" value="'+esc(R.convTxt)+'" autocomplete="off">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="convok">Replace ink with text</button>')}
function convertApply(){const tx=($('#cvTxt').value.trim()||R.convTxt).slice(0,120),ids=new Set(L.ids);calcBBox();const b=L.bbox;if(!b)return;
 strokes=strokes.filter(s=>!ids.has(s.id));clearLasso(true);redraw();const nb=makeBox(newDef({x:Math.max(2,b.x0),y:Math.max(40,Math.round(b.y0/32)*32+32),h:esc(tx)}));resolveOverlap(nb);commit();drawOverlay();toast('Converted (demo)')}

/* ---- Professional lasso: selection box, 8 handles, turn handle, the app's menu ---- */
const lsel=$('#lsel');let lwrap,lbox,lline,lhs={},lm2;
const LHS=[['tl','both',0,0,'nwse'],['tr','both',1,0,'nesw'],['bl','both',0,1,'nesw'],['br','both',1,1,'nwse'],['t','y',.5,0,'ns'],['b','y',.5,1,'ns'],['l','x',0,.5,'ew'],['r','x',1,.5,'ew']];
const MIN_EDGE=110;
function buildLsel(){lsel.innerHTML='<div class="lwrap"><div class="lbox"></div><div class="lline"></div></div>';lwrap=$('.lwrap',lsel);lbox=$('.lbox',lsel);lline=$('.lline',lsel);
 LHS.forEach(h=>{const b=document.createElement('button');b.type='button';b.tabIndex=-1;b.className='lh h-'+h[0]+' '+h[4]+(h[1]==='both'?'':' e');b.setAttribute('aria-label','Resize');b.innerHTML='<i></i>';b.addEventListener('pointerdown',e=>startTf('scale',h,e));lwrap.append(b);lhs[h[0]]=b});
 const r=document.createElement('button');r.type='button';r.tabIndex=-1;r.className='lh rot';r.setAttribute('aria-label','Turn');r.innerHTML='<i>'+svg('rotcw')+'</i>';r.addEventListener('pointerdown',e=>startTf('rot',null,e));lwrap.append(r);lhs.rot=r;
 lm2=document.createElement('div');lm2.className='lm2';lm2.setAttribute('role','toolbar');lm2.setAttribute('aria-label','Selected drawing');lsel.append(lm2);
 lm2.addEventListener('pointerdown',e=>e.stopPropagation());lm2.addEventListener('click',lmClick)}
function syncLsel(){if(!lsel)return;const on=isPro()&&R.tool==='lasso'&&!!L.bbox&&!R.reading;lsel.classList.toggle('on',on);if(!on)return;if(!lm2)buildLsel();
 const b=L.bbox,w=b.x1-b.x0,h=b.y1-b.y0,hasInk=L.ids.size>0;
 lbox.style.cssText='left:'+b.x0+'px;top:'+b.y0+'px;width:'+w+'px;height:'+h+'px';
 LHS.forEach(([id,ax,fx,fy])=>{const el=lhs[id];const show=ax==='both'||(hasInk&&(ax==='y'?h>=MIN_EDGE:w>=MIN_EDGE));el.hidden=!show;el.style.left=(b.x0+w*fx)+'px';el.style.top=(b.y0+h*fy)+'px'});
 const above=b.y0>=44,ry=above?b.y0-34:b.y1+34,cx=b.x0+w/2;lhs.rot.hidden=!hasInk;lhs.rot.style.left=cx+'px';lhs.rot.style.top=ry+'px';lline.hidden=!hasInk;lline.style.cssText='left:'+cx+'px;top:'+(above?b.y0-30:b.y1)+'px;height:30px';
 const busy=!!(L.drag||L.rz||lz||R.tf);lm2.hidden=busy;if(!busy)renderLmenu()}
const selLabel=()=>{const l=[...new Set(strokes.filter(s=>L.ids.has(s.id)).map(s=>s.label||''))];return l.length===1?l[0]:''};
document.addEventListener('submit',e=>{const f=e.target.closest&&e.target.closest('form[data-m=labelform]');if(!f)return;e.preventDefault();const v=$('#lbName',f).value;(R.lm||(R.lm={})).label=false;lassoAct('label',v);syncLsel()});
/* turn / resize handles: work from a snapshot taken at the start, so nothing drifts */
function startTf(how,h,e){e.preventDefault();e.stopPropagation();const el=e.currentTarget;try{el.setPointerCapture(e.pointerId)}catch(_){}
 const b={...L.bbox},T=R.tf={how,h,b,cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2,p0:pt(e),pid:e.pointerId,moved:false,
  s:strokes.filter(s=>L.ids.has(s.id)).map(s=>({s,pts:s.pts.map(q=>q.slice()),w:s.w})),
  bx:(mvBoxes()?L.boxes:[]).map(bx=>({bx,l:bx.offsetLeft,t:bx.offsetTop,w:bx.offsetWidth,fs:parseFloat(bx.style.getPropertyValue('--fs'))||1}))};
 syncLsel();
 const mv=ev=>{if(ev.pointerId!==T.pid)return;ev.stopPropagation();tfMove(T,pt(ev))},up=ev=>{if(ev.pointerId!==T.pid)return;ev.stopPropagation();el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);tfEnd(T)};
 el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
const clampN=(v,a,z)=>Math.max(a,Math.min(z,v));
function tfMove(T,p){T.moved=true;const b=T.b;
 if(T.how==='rot'){let a=Math.atan2(p.y-T.cy,p.x-T.cx)-Math.atan2(T.p0.y-T.cy,T.p0.x-T.cx);const q90=Math.round(a/(Math.PI/2))*Math.PI/2;if(Math.abs(a-q90)<.07)a=q90;T.a=a;const cs=Math.cos(a),sn=Math.sin(a);
  T.s.forEach(o=>o.s.pts.forEach((q,i)=>{const dx=o.pts[i][0]-T.cx,dy=o.pts[i][1]-T.cy;q[0]=T.cx+dx*cs-dy*sn;q[1]=T.cy+dx*sn+dy*cs}));
  lwrap.style.transformOrigin=T.cx+'px '+T.cy+'px';lwrap.style.transform='rotate('+a+'rad)';redraw();return}
 const [,axis,fx,fy]=T.h,ax=fx===0?b.x1:fx===1?b.x0:(b.x0+b.x1)/2,ay=fy===0?b.y1:fy===1?b.y0:(b.y0+b.y1)/2,hx=b.x0+(b.x1-b.x0)*fx,hy=b.y0+(b.y1-b.y0)*fy;let sx=1,sy=1;
 if(axis==='both'){const dx=hx-ax,dy=hy-ay;sx=sy=clampN(((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy),.25,4)}
 else if(axis==='x')sx=clampN((p.x-ax)/(hx-ax),.2,5);else sy=clampN((p.y-ay)/(hy-ay),.2,5);
 T.sx=sx;T.sy=sy;
 T.s.forEach(o=>{o.s.pts.forEach((q,i)=>{q[0]=ax+(o.pts[i][0]-ax)*sx;q[1]=ay+(o.pts[i][1]-ay)*sy});if(axis==='both')o.s.w=Math.max(.8,o.w*sx)});
 if(axis==='both')T.bx.forEach(o=>{o.bx.style.width=(o.w*sx)+'px';o.bx.style.setProperty('--fs',clampN(o.fs*sx,.4,4));setBoxPos(o.bx,ax+(o.l-ax)*sx,ay+(o.t-ay)*sx)});
 L.bbox={x0:ax+(b.x0-ax)*sx,x1:ax+(b.x1-ax)*sx,y0:ay+(b.y0-ay)*sy,y1:ay+(b.y1-ay)*sy};redraw();syncLsel()}
function tfEnd(T){R.tf=null;if(T.how==='rot')lwrap.style.transform='';if(T.how==='rot'||L.boxes.length)calcBBox();if(T.moved)commit();redraw();syncLsel()}

/* ---------- boxes ---------- */
function edRoot(n){if(!n)return null;if(n.nodeType===3)n=n.parentElement;return n&&n.closest?n.closest('.txt[contenteditable="true"],td[contenteditable="true"]'):null}
function setBoxPos(b,x,y){b.style.left=x+'px';b.style.top=y+'px';b.style.maxWidth=b.style.width?'none':'calc(100% - '+(x+14)+'px)'}
function applyIM(root){$$('.txt[contenteditable],td[contenteditable]',root||paper).forEach(e=>{e.setAttribute('inputmode',ST.kbHidden?'none':'text')})}
function setEditable(){$$('.box',paper).forEach(b=>{const tx=b.querySelector('.txt');if(b.dataset.t==='text')tx.contentEditable=!R.reading;$$('td',b).forEach(td=>td.contentEditable=!R.reading)});applyIM()}
function makeBox(d){const b=document.createElement('div');b.className='box';b.dataset.id=d.id||uid();b.dataset.t=d.t;b.dataset.size=d.size||'body';b.dataset.st=d.st||'none';if(d.k)b.dataset.k=d.k;if(d.rot){b.dataset.rot=d.rot;b.style.transform='rotate('+d.rot+'deg)'}
 b.innerHTML='<div class="tab nofocus" aria-label="Move box or open box menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="9" r="1.7"/><circle cx="12" cy="9" r="1.7"/><circle cx="17" cy="9" r="1.7"/><circle cx="7" cy="15" r="1.7"/><circle cx="12" cy="15" r="1.7"/><circle cx="17" cy="15" r="1.7"/></svg></div><div class="txt"></div><i class="rh tl" data-c="tl"></i><i class="rh t" data-c="t"></i><i class="rh tr" data-c="tr"></i><i class="rh r" data-c="r"></i><i class="rh br" data-c="br"></i><i class="rh b" data-c="b"></i><i class="rh bl" data-c="bl"></i><i class="rh l" data-c="l"></i>';
 const tx=b.querySelector('.txt');tx.innerHTML=d.h||'';if(d.t==='text'){tx.contentEditable=!R.reading;tx.setAttribute('role','textbox')}
 if(d.w)b.style.width=d.w;if(d.fs)b.style.setProperty('--fs',d.fs);if(d.sty)applyV(b,d.sty);if(d.mh)b.style.minHeight=d.mh;setBoxPos(b,d.x,d.y);paper.append(b);$$('td',b).forEach(td=>td.contentEditable=!R.reading);applyIM(b);return b}
function select(b){if(R.sel===b)return;if(R.sel)R.sel.classList.remove('sel');R.sel=b||null;if(b)b.classList.add('sel');renderOpts();updateBoxBar()}
function deselect(){const a=document.activeElement;if(edRoot(a))a.blur();select(null);R.last=null;hideSel()}
function curBox(){return R.sel&&R.sel.isConnected?R.sel:null}
function firstEdit(b){return b.querySelector('.txt[contenteditable="true"],td[contenteditable="true"]')}
function freeSpot(){let m=24;$$('.box',paper).forEach(b=>{m=Math.max(m,b.offsetTop+b.offsetHeight)});let y=Math.round((m+16)/32)*32;if(y>paper.clientHeight-150)y=64;return{x:34,y:Math.max(48,y)}}
/* ---- box style model: presets, defaults, bar ---- */
const SKEYS=['bd','bdc','bg','rad','pad','tc','sh','ff','lh'];
const getV=b=>{const o={};SKEYS.forEach(k=>{const v=b.style.getPropertyValue('--'+k);if(v)o[k]=v.trim()});return o};
function applyV(b,v){SKEYS.forEach(k=>b.style.removeProperty('--'+k));Object.entries(v||{}).forEach(([k,x])=>b.style.setProperty('--'+k,x))}
const newDef=o=>Object.assign({t:'text',size:'body',h:'',sty:{...ST.boxDef.v},fs:ST.boxDef.fs||''},o);
const sameV=(a,b)=>{const ka=Object.keys(a).filter(k=>k!=='ff'&&k!=='lh'),kb=Object.keys(b).filter(k=>k!=='ff'&&k!=='lh');return ka.length===kb.length&&ka.every(k=>a[k]===b[k])};
const curV=()=>{const b=curBox();return b?getV(b):ST.boxDef.v};
function setFs(d){const b=curBox();const cur=parseFloat(b?b.style.getPropertyValue('--fs'):ST.boxDef.fs)||1;const n=Math.max(.6,Math.min(2.5,Math.round((cur+d)*10)/10));
 if(b){b.style.setProperty('--fs',n);resolveOverlap(b);flush();updateBoxBar()}ST.boxDef.fs=String(n);save()}
function setWidth(k){const b=curBox();if(!b){toast('Tap a box first');return}
 if(k==='auto')b.style.width='';else if(k==='wide')b.style.width=Math.max(120,paper.clientWidth-b.offsetLeft-24)+'px';else b.style.width=k+'px';
 setBoxPos(b,b.offsetLeft,b.offsetTop);resolveOverlap(b);flush();updateBoxBar()}
const rectOf=b=>({x0:b.offsetLeft,y0:b.offsetTop,x1:b.offsetLeft+b.offsetWidth,y1:b.offsetTop+b.offsetHeight});
/* no overlap: boxes under a dropped/grown box slide aside (down) */
function resolveOverlap(m){const seen=new Set([m]),q=[m],all=$$('.box',paper);
 while(q.length){const a=q.shift(),ra=rectOf(a);all.forEach(o=>{if(seen.has(o))return;const r=rectOf(o);if(r.x0<ra.x1-1&&r.x1>ra.x0+1&&r.y0<ra.y1-1&&r.y1>ra.y0+1){o.style.top=(ra.y1+8)+'px';seen.add(o);q.push(o)}})}}
/* Notion-style grip: tap or ~400 ms hold opens this menu; moving past 8 px is a normal drag */
function boxMenu(b,anchor){R.menuAt=performance.now();
 const cv=getV(b);
 openMenu([{t:'Duplicate',f:()=>{dupBox(b);toast('Duplicated')}},{t:'Copy',f:()=>{R.boxClip=ser(b);toast('Copied')}},
  {t:'Cut',f:()=>{R.boxClip=ser(b);select(null);b.remove();flush();toast('Cut')}},{t:'Delete',f:()=>{select(null);b.remove();flush();toast('Deleted')}},
  {h:'Turn into'},...PRESETS.map(([id,n,pv])=>({t:n,on:sameV(pv,cv),f:()=>{select(b);setStyle(pv,true)}})),...ST.presets.map(p=>({t:p.name,on:sameV(p.v,cv),f:()=>{select(b);setStyle(p.v,true)}})),
  {h:'More'},{t:'Colour ▸',keep:true,f:()=>colourMenu(b,anchor)},{t:'Layout…',f:()=>{select(b);layoutPopup()}}],anchor);R.boxMenuFor=b}
function colourMenu(b,anchor){R.menuAt=performance.now();
 openMenu([{t:'‹ Back',keep:true,f:()=>boxMenu(b,anchor)},{h:'Fill colour'},...[['None',null],['Yellow','#f3dc7a'],['Pink','#ffd6e0'],['Mint','#d4f1e4'],['Sky','#d6e6ff'],['Lavender','#e6dcff']].map(([n,c])=>({t:n,f:()=>{select(b);setStyle(c?{bg:c,tc:'#2a2410'}:{bg:null,tc:null,sh:null})}}))],anchor);R.boxMenuFor=b}
const boxbar=$('#boxbar');
function dupBox(b){const d=ser(b);d.id=uid();d.y=b.offsetTop+b.offsetHeight+8;const n=makeBox(d);resolveOverlap(n);select(n);flush();return n}
boxbar.addEventListener('click',e=>{const k=e.target.closest('button')&&e.target.closest('button').dataset.b,b=curBox();if(!k||!b)return;
 if(k==='style'){openBoxStyle()}
 else if(k==='dup'){dupBox(b);toast('Duplicated')}
 else if(k==='copy'){R.boxClip=ser(b);toast('Copied')}
 else if(k==='cut'){R.boxClip=ser(b);select(null);b.remove();flush();toast('Cut')}
 else if(k==='del'){select(null);b.remove();flush();toast('Deleted')}
 else if(k==='more')openMenu([{t:'Paste box',dis:!R.boxClip,f:()=>{const d=clone(R.boxClip);d.id=uid();d.x+=24;d.y+=24;const n=makeBox(d);resolveOverlap(n);select(n);flush()}},{t:'Layout…',f:layoutPopup},{t:'Box style…',f:()=>openBoxStyle()}],e.target.closest('button'))});
/* full-screen Layout pop-up (mock): big preview, width and alignment; X cancels, tick applies */
function layoutPopup(){const b=curBox();if(!b){toast('Tap a box first');return}
 const pw=paper.clientWidth,ph=paper.clientHeight,k=Math.min(1,(innerWidth-32)/pw,(innerHeight*.5)/ph),dr={w:b.offsetWidth,x:b.offsetLeft};
 const ov=document.createElement('div');ov.className='layfull';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Layout');
 ov.innerHTML='<div class="lfh"><button class="sq" data-k="x" aria-label="Cancel">✕</button><span>Layout</span><button class="sq ok" data-k="ok" aria-label="Apply">✓</button></div><div class="lfb"><div class="lfpage" style="width:'+pw*k+'px;height:'+ph*k+'px"><div class="lfscale" style="width:'+pw+'px;height:'+ph+'px;transform:scale('+k+')"></div></div><div class="lfctl"><label class="muted" for="lfw">Width</label><input id="lfw" type="range" min="80" max="'+Math.max(120,pw-24)+'" value="'+dr.w+'"><div class="seg"><button data-al="l">Left</button><button data-al="c">Centre</button><button data-al="r">Right</button></div></div></div>';
 const cl=b.cloneNode(true);cl.classList.remove('sel','lsel');$$('.tab,.rh',cl).forEach(n=>n.remove());$$('[contenteditable]',cl).forEach(n=>n.removeAttribute('contenteditable'));cl.style.transition='none';cl.style.width=dr.w+'px';setBoxPos(cl,dr.x,b.offsetTop);$('.lfscale',ov).append(cl);
 const place=()=>{cl.style.width=dr.w+'px';setBoxPos(cl,dr.x,b.offsetTop)};
 const done=ok=>{if(ok){b.style.width=dr.w+'px';setBoxPos(b,dr.x,b.offsetTop);resolveOverlap(b);flush();updateBoxBar()}document.removeEventListener('keydown',esc);ov.remove()};
 const esc=e=>{if(e.key==='Escape')done(false)};document.addEventListener('keydown',esc);
 ov.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.k)done(t.dataset.k==='ok');else if(t.dataset.al){dr.x=t.dataset.al==='l'?24:t.dataset.al==='r'?pw-dr.w-24:(pw-dr.w)/2;place()}});
 $('#lfw',ov).addEventListener('input',e=>{dr.w=+e.target.value;place()});
 document.body.append(ov)}
/* ---- box interactions ---- */
let drag=null;
const glPool=[];
function showLines(ls){glPool.forEach(d=>d.style.display='none');ls.forEach((l,i)=>{let d=glPool[i];if(!d){d=document.createElement('div');d.className='gl';paper.append(d);glPool[i]=d}d.style.display='block';d.style.left=Math.round(l.x)+'px';d.style.top=Math.round(l.y)+'px';d.style.width=(l.w||1)+'px';d.style.height=(l.h||1)+'px'})}
function hideGuides(){showLines([])}
/* smart guides: edge/centre alignment (line joins dragged box and matched object), page centre, equal spacing marks */
function smart(b,nx,ny){const w=b.offsetWidth,h=b.offsetHeight,pw=paper.clientWidth,ph=paper.clientHeight,T=6,L=[],others=$$('.box',paper).filter(o=>o!==b).map(rectOf);
 if(Math.abs(nx+w/2-pw/2)<T){nx=pw/2-w/2;L.push({x:pw/2,y:0,h:ph})}
 else{outer:for(const r of others)for(const [a,t] of [[nx,r.x0],[nx+w,r.x1],[nx+w/2,(r.x0+r.x1)/2]])if(Math.abs(a-t)<T){nx+=t-a;const y0=Math.min(ny,r.y0),y1=Math.max(ny+h,r.y1);L.push({x:t,y:y0,h:y1-y0});break outer}}
 outer2:for(const r of others)for(const [a,t] of [[ny,r.y0],[ny+h,r.y1],[ny+h/2,(r.y0+r.y1)/2]])if(Math.abs(a-t)<T){ny+=t-a;const x0=Math.min(nx,r.x0),x1=Math.max(nx+w,r.x1);L.push({y:t,x:x0,w:x1-x0});break outer2}
 const ov=(a0,a1,b0,b1)=>a0<b1&&a1>b0,rowO=others.filter(r=>ov(ny,ny+h,r.y0,r.y1)),colO=others.filter(r=>ov(nx,nx+w,r.x0,r.x1));
 const lft=rowO.filter(r=>r.x1<=nx+2).sort((a,b)=>b.x1-a.x1)[0],rgt=rowO.filter(r=>r.x0>=nx+w-2).sort((a,b)=>a.x0-b.x0)[0];
 if(lft&&rgt){const gl=nx-lft.x1,gr=rgt.x0-(nx+w);if(Math.abs(gl-gr)<T*2){nx+=(gr-gl)/2;const g=(rgt.x0-lft.x1-w)/2,ym=ny+h/2;
  L.push({x:lft.x1,y:ym,w:g},{x:lft.x1,y:ym-4,h:8},{x:lft.x1+g,y:ym-4,h:8},{x:nx+w,y:ym,w:g},{x:nx+w,y:ym-4,h:8},{x:rgt.x0,y:ym-4,h:8})}}
 const up=colO.filter(r=>r.y1<=ny+2).sort((a,b)=>b.y1-a.y1)[0],dn=colO.filter(r=>r.y0>=ny+h-2).sort((a,b)=>a.y0-b.y0)[0];
 if(up&&dn){const gu=ny-up.y1,gd=dn.y0-(ny+h);if(Math.abs(gu-gd)<T*2){ny+=(gd-gu)/2;const g=(dn.y0-up.y1-h)/2,xm=nx+w/2;
  L.push({x:xm,y:up.y1,h:g},{x:xm-4,y:up.y1,w:8},{x:xm-4,y:up.y1+g,w:8},{x:xm,y:ny+h,h:g},{x:xm-4,y:ny+h,w:8},{x:xm-4,y:dn.y0,w:8})}}
 return[nx,ny,L]}
paper.addEventListener('mousedown',e=>{if(e.target.closest('.tab,.rh'))e.preventDefault()});
paper.addEventListener('pointerdown',e=>{
 if(R.reading||e.target.closest('.ruler button,.magbox'))return;
 if(drag&&e.pointerId!==drag.id){e.preventDefault();return} /* a palm or second finger never takes over a drag */
 const tab=e.target.closest('.tab'),rh=nearRh(e.target.closest('.rh'),e);
 if(tab||rh){e.preventDefault();const b=e.target.closest('.box');
  const ed=edRoot(document.activeElement);if(ed){const kr=R.restoring;R.restoring=true;ed.blur();R.restoring=kr}try{getSelection().removeAllRanges()}catch(_){}R.kbOpen=false;R.last=null;hideSel();updateStates();
  select(b);hideSel();const sw=b.style.width,smh=b.style.minHeight;b.style.width='min-content';const minW=Math.max(64,b.offsetWidth);b.style.width=sw;b.style.minHeight='';const minH=b.offsetHeight;b.style.minHeight=smh;
  const wasOpen=menu.classList.contains('show')&&R.boxMenuFor===b;
  drag={mode:tab?'pend':'size',tab,wasOpen,held:false,c:rh&&rh.dataset.c,b,sx:e.clientX,sy:e.clientY,x0:b.offsetLeft,y0:b.offsetTop,w0:b.offsetWidth,h0:b.offsetHeight,minW,minH,id:e.pointerId};
  if(tab){drag.timer=setTimeout(()=>{if(drag&&drag.mode==='pend'&&!drag.held){drag.held=true;b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),300);if(!drag.wasOpen)boxMenu(b,tab)}},400)}else{b.classList.add('dragging');paper.classList.add('dragging')}
  updateBoxBar();if(rh){drag.rh=rh;drag.t0=performance.now();rh.classList.add('arm');drag.arm=setTimeout(()=>{if(drag&&drag.rh===rh){rh.classList.remove('arm');rh.classList.add('grab')}},150)}try{(rh||paper).setPointerCapture(e.pointerId)}catch(_){}return}
 const t=R.tool;
 if(t==='text'){const b=e.target.closest('.box');R.hadSel=!!R.sel&&!b;if(b)select(b);holdStart(e);return}
 if(e.target.closest('#lmenu')||e.button>0)return;
 if(t==='pen'||t==='eraser'||t==='lasso'){e.preventDefault();try{paper.setPointerCapture(e.pointerId)}catch(_){}const p=pt(e);R.pid=e.pointerId;
  if(t==='pen')startPen(e,p);
  else if(t==='eraser'){R.erasing=true;R.ep=[p.x,p.y];R.erCh=eraseAt(p.x,p.y)}
  else{ if(!isPro()&&L.bbox&&Math.hypot(p.x-L.bbox.x1,p.y-L.bbox.y1)<=22){L.rz={bx:{...L.bbox},prev:1};lmenu.hidden=true}else if(L.bbox&&p.x>L.bbox.x0&&p.x<L.bbox.x1&&p.y>L.bbox.y0&&p.y<L.bbox.y1){L.drag={x:p.x,y:p.y,moved:false};lmenu.hidden=true;if(isPro())syncLsel()}else{const had=selCount();clearLasso(true);R.lstart=[p.x,p.y];lz=[[p.x,p.y]];drawOverlay();if(had)lassoUi()}}}
});
paper.addEventListener('pointermove',e=>{
 if(drag&&e.pointerId===drag.id){const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy,b=drag.b,pw=paper.clientWidth,ph=paper.clientHeight;
  if(drag.mode==='pend'){if(Math.hypot(dx,dy)<=8)return;clearTimeout(drag.timer);drag.mode='move';if(R.boxMenuFor){closeMenu()}b.classList.add('dragging');paper.classList.add('dragging');updateBoxBar();hideSel()}
  if(drag.mode==='move'){let nx=Math.max(0,Math.min(drag.x0+dx,pw-30)),ny=Math.max(40,Math.min(drag.y0+dy,ph-30));const r=smart(b,nx,ny);nx=r[0];ny=r[1];showLines(r[2]);setBoxPos(b,nx,ny)}
  else{if(!drag.live){if(performance.now()-drag.t0<150)return; /* hold window: let go now and nothing happens */
    if(drag.bx==null){drag.bx=e.clientX;drag.by=e.clientY}if(Math.hypot(e.clientX-drag.bx,e.clientY-drag.by)<4)return; /* 4 px dead-zone against wobble */
    drag.live=true;drag.sx=e.clientX;drag.sy=e.clientY;return}
   const c=drag.c;let x=drag.x0,y=drag.y0,w=drag.w0,h=drag.h0;
   if(c.includes('l')){w=drag.w0-dx;x=drag.x0+dx}else if(c.includes('r'))w=drag.w0+dx;
   if(c.includes('t')){h=drag.h0-dy;y=drag.y0+dy}else if(c.includes('b'))h=drag.h0+dy;
   if(w<drag.minW){w=drag.minW;if(c.includes('l'))x=drag.x0+drag.w0-w}
   if(c.includes('l')&&x<0){x=0;w=drag.x0+drag.w0}if(c.includes('r'))w=Math.min(w,pw-x-6);
   if(h<drag.minH){h=drag.minH;if(c.includes('t'))y=drag.y0+drag.h0-h}
   if(c.length===2||c==='l'||c==='r')b.style.width=w+'px';
   b.style.minHeight=(c.includes('t')||c.includes('b'))&&h>drag.minH+.5?h+'px':'';setBoxPos(b,x,Math.max(40,y))}
  return}
 const t=R.tool,p=pt(e);holdMove(e);
 if(t==='eraser'){const rr=erR();ring.classList.toggle('real',isPro());ring.style.display='block';ring.style.left=p.x+'px';ring.style.top=p.y+'px';ring.style.width=ring.style.height=(rr*2)+'px';ring.style.margin=(-rr)+'px 0 0 '+(-rr)+'px';
  if(R.erasing&&e.pointerId===R.pid){const ev=(e.getCoalescedEvents&&e.getCoalescedEvents().length)?e.getCoalescedEvents():[e];ev.forEach(q=>{const c=pt(q);if(eraseAt(c.x,c.y,R.ep[0],R.ep[1]))R.erCh=true;R.ep=[c.x,c.y]})}}
 if(R.cur&&e.pointerId===R.pid)penMove(e);
 if(t==='lasso'&&e.pointerId===R.pid){if(L.rz){const w0=L.rz.bx.x1-L.rz.bx.x0,f=Math.max(.25,Math.min(4,(p.x-L.rz.bx.x0)/w0));lassoScale(f/L.rz.prev,L.rz.bx.x0,L.rz.bx.y0);L.rz.prev=f}else if(L.drag){const dx=p.x-L.drag.x,dy=p.y-L.drag.y;L.drag.x=p.x;L.drag.y=p.y;L.drag.moved=true;lassoMove(dx,dy)}else if(lz){if(lassoRect()){const a=R.lstart;lz=[[a[0],a[1]],[p.x,a[1]],[p.x,p.y],[a[0],p.y]]}else lz.push([p.x,p.y]);drawOverlay()}}
});
function endPtr(e){holdEnd();
 if(drag&&e.pointerId===drag.id){const d=drag,b=d.b;drag=null;clearTimeout(d.timer);clearTimeout(d.arm);if(d.rh)d.rh.classList.remove('grab','arm');R.swallow=performance.now();
  if(d.mode==='pend'){if(!d.held){if(d.wasOpen)closeMenu();else boxMenu(b,d.tab)}updateBoxBar();return}
  b.classList.remove('dragging');paper.classList.remove('dragging');hideGuides();fitBox(b);resolveOverlap(b);commit();updateBoxBar();return}
 if(R.cur&&e.pointerId===R.pid){endPen();afterAction()}
 if(R.erasing&&e.pointerId===R.pid){R.erasing=false;if(R.erCh)commit();R.erCh=false;if(isPro()&&E.ret&&R.tool==='eraser')setTool(R.prevTool)}
 if(R.tool==='lasso'&&e.pointerId===R.pid){if(L.rz){L.rz=null;commit();drawOverlay()}else if(L.drag){const mv=L.drag.moved;L.drag=null;if(mv)commit();drawOverlay()}else if(lz)finishLasso()}
}
paper.addEventListener('pointerup',endPtr);paper.addEventListener('pointercancel',endPtr);
paper.addEventListener('pointerleave',()=>{ring.style.display='none'});
paper.addEventListener('mousedown',e=>{if(e.detail>1&&R.tool==='text'&&edRoot(e.target))e.preventDefault()});
paper.addEventListener('click',e=>{
 if(performance.now()-(R.swallow||0)<350)return;
 if(R.tool==='text'&&!R.reading&&e.detail>1){const r=edRoot(e.target);if(r){if(document.activeElement!==r)r.focus({preventScroll:true});const sl=getSelection();const rg=document.caretRangeFromPoint?document.caretRangeFromPoint(e.clientX,e.clientY):null;if(rg&&r.contains(rg.startContainer)){sl.removeAllRanges();sl.addRange(rg)}
  const d=Math.min(e.detail,4);if(d===2){sl.modify('move','backward','word');sl.modify('extend','forward','word')}else if(d===3){sl.modify('move','backward','lineboundary');sl.modify('extend','forward','lineboundary')}else sl.selectAllChildren(r);return}}
 if(R.tool!=='text'||R.reading)return;if(e.target.closest('.box,.tab,.rh'))return;
 if(R.hadSel){R.hadSel=false;deselect();return}
 const p=pt(e);newBoxAt(p.x-6,p.y-16);afterAction();
});
paper.addEventListener('focusin',e=>{const b=e.target.closest('.box');if(b&&R.tool==='text'){select(b);updateBoxBar()}});
paper.addEventListener('focusout',e=>{const b=e.target.closest('.box');if(!b||R.restoring)return;if(e.relatedTarget&&b.contains(e.relatedTarget))return;clearTimeout(ct);hideSel();setTimeout(updateBoxBar,0);
 if(b.dataset.t==='text'&&!b.querySelector('.txt').textContent.trim()){if(R.sel===b)select(null);b.remove()}commit()});
paper.addEventListener('input',e=>{clearTimeout(ct);ct=setTimeout(commit,600);const b=e.target.closest&&e.target.closest('.box');if(b)requestAnimationFrame(()=>resolveOverlap(b))});
paper.addEventListener('paste',e=>{const r=edRoot(e.target);if(!r)return;e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,t)});
paper.addEventListener('drop',e=>{if(edRoot(e.target))e.preventDefault()});

/* ---------- text commands ---------- */
function target(){const r=edRoot(document.activeElement);if(r)return r;if(R.last&&R.last.root.isConnected&&!R.reading)return R.last.root;const b=curBox();return b?firstEdit(b):null}
function focusTarget(){const t=target();if(!t)return null;
 if(edRoot(document.activeElement)!==t){t.focus({preventScroll:true});const s=getSelection(),lr=R.last&&R.last.root===t&&R.last.range;
  if(lr&&t.contains(lr.commonAncestorContainer)){s.removeAllRanges();s.addRange(lr)}else{s.selectAllChildren(t);s.collapseToEnd()}}
 return t}
function fmt(cmd,val){const t=focusTarget();if(!t){toast('Tap a text box first');return}const s=getSelection();let whole=false;
 if((!s.rangeCount||s.isCollapsed)&&t.textContent.trim()){s.selectAllChildren(t);whole=true}
 document.execCommand('styleWithCSS',false,true);document.execCommand(cmd,false,val||null);if(whole)s.collapseToEnd();updateFmtState();flush()}
function updateFmtState(){['bold','italic','underline'].forEach(c=>{const el=opts.querySelector('[data-fmt="'+c+'"]');if(!el)return;let on=false;try{on=!!edRoot(document.activeElement)&&document.queryCommandState(c)}catch(_){}el.classList.toggle('on',on)})}
function doNewline(){const t=focusTarget();if(!t){toast('Tap a text box first');return}if(!document.execCommand('insertLineBreak'))document.execCommand('insertHTML',false,'<br>')}
function doBack(){const t=focusTarget();if(!t){toast('Tap a text box first');return}document.execCommand('delete')}
function typeKey(ch){const t=focusTarget();if(!t){toast('Tap a text box first');return}document.execCommand('insertText',false,ch)}
/* selection bar */
const selbar=$('#selbar');
function hideSel(){if(R.selPin&&isPro())return;selbar.hidden=true}
function showSel(r,compact){buildSelbar(!!compact);selbar.classList.toggle('compact',!!compact);const rc=r.getBoundingClientRect();if(!rc.width&&!rc.height){hideSel();return}selbar.hidden=false;const w=selbar.offsetWidth;let top=compact?rc.bottom+10:rc.top-58;if(!compact&&top<8)top=rc.bottom+10;selbar.style.top=top+'px';selbar.style.left=Math.max(8,Math.min(rc.left+rc.width/2-w/2,innerWidth-w-8))+'px'}
document.addEventListener('selectionchange',()=>{const s=getSelection();if(!s.rangeCount){hideSel();return}const r=s.getRangeAt(0),root=edRoot(r.commonAncestorContainer);
 if(root){R.last={root,range:r.cloneRange()};if(R.reading||drag)hideSel();else if(!s.isCollapsed)showSel(r,false);else showSel(root.closest('.box'),true);updateFmtState()}else hideSel()});
addEventListener('scroll',hideSel,{passive:true});
selbar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const c=b.dataset.c;if(isPro()&&proSel(c,b,e))return;
 if(c==='mic'){dictate();return}
 if(c==='aa'){R.optsOn=true;if(ST.min.opts)setMin('opts',false);renderOpts();return}
 if(c==='hl'){document.execCommand('styleWithCSS',false,true);if(!document.execCommand('hiliteColor',false,'rgba(245,215,110,.6)'))document.execCommand('backColor',false,'rgba(245,215,110,.6)');flush()}
 else if(c==='copy'){const tx=getSelection().toString();const fb=()=>{try{document.execCommand('copy')}catch(_){}toast('Copied')};try{navigator.clipboard.writeText(tx).then(()=>toast('Copied'),fb)}catch(_){fb()}}
 else if(c==='del'){document.execCommand('delete');flush();hideSel()}
 else{document.execCommand(c);flush()}});

/* ---------- tools ---------- */
function setTool(t,quiet){if(R.tool!==t){R.ecard=false;R.lcard=false;R.acard=false;R.prevTool=R.tool;deselect();clearLasso();ring.style.display='none'}R.tool=t;R.optsOn=true;paper.dataset.tool=R.reading?'read':t;updateStates();renderOpts();applyOpts()}
function afterAction(){if(!ST.keepOpen&&R.optsOn){R.optsOn=false;applyOpts()}}
function toggleReading(on){R.reading=on===undefined?!R.reading:on;if(R.reading){deselect();clearLasso()}document.body.classList.toggle('reading',R.reading);$('#readpill').hidden=!R.reading||isPro();refreshReader();paper.dataset.tool=R.reading?'read':R.tool;setEditable();if(R.reading){R.kbOpen=false}updateStates()}
function setTbHidden(h){R.tbHidden=h;document.body.classList.toggle('tbhidden',h);$('#showtb').hidden=!h;if(h)R.kbOpen=false;updateStates()}
function toggleKb(){
 // Real system keyboard only (no mock keys). With "stays hidden" on, the
 // button lets the real keyboard up for the focused box; tap again to put it away.
 const t=target();
 if(R.kbOpen||edRoot(document.activeElement)&&!ST.kbHidden){R.kbOpen=false;if(t){if(ST.kbHidden)t.setAttribute('inputmode','none');t.blur()}updateStates();return}
 if(!t){toast('Tap a text box first');updateStates();return}
 t.setAttribute('inputmode','text');R.kbOpen=ST.kbHidden;t.focus();
 t.addEventListener('blur',()=>{if(ST.kbHidden)t.setAttribute('inputmode','none');R.kbOpen=false;updateStates()},{once:true});
 updateStates()}
function updateStates(){
 $$('#tb .ic').forEach(b=>{const id=b.dataset.id;let on=false;
  if(MODES.includes(id))on=R.tool===id;else if(id==='kb')on=R.kbOpen;else if(id==='read')on=R.reading;else if(id==='mic')on=!$('#strip').hidden;
  b.classList.toggle('on',on);
  if(id==='kb')b.firstElementChild.innerHTML=I[ST.kbHidden?'kboff':'kb'];
  if(id==='last'){const nm='Back to '+TOOLS[R.prevTool][0];b.innerHTML=svg(R.prevTool)+'<span class="badge">'+svg('undo')+'</span><span class="name">'+nm+'</span>';b.dataset.tip=nm;b.setAttribute('aria-label',nm)}
  if(id==='undo'||id==='redo'){const d=id==='undo'?hi<=0:hi>=hist.length-1;b.classList.toggle('dis',d);b.setAttribute('aria-disabled',d)}
  if(MODES.includes(id)||id==='kb'||id==='read'||id==='mic')b.setAttribute('aria-pressed',on)});
 $$('#laySeg button').forEach(b=>b.classList.toggle('on',b.dataset.l===ST.cur));
 const lb=$('#layBtn');if(lb)lb.textContent=layoutName(ST.cur)+' ▾';
 $('#kb').classList.remove('show');updKbBar();document.body.classList.toggle('kbopen',R.kbOpen&&!R.tbHidden&&!R.reading);
 moveUl();placeOpts()}

/* ---------- toolbar render ---------- */
function act(id,b){
 if(id==='undo'){undo();return}if(id==='redo'){redo();return}
 if(MODES.includes(id)){if(R.reading)return;toolPress(id);return}
 if(id==='last'){setTool(R.prevTool);return}
 if(id==='layout'){layoutMenu(b);return}
 if(id==='newline'){doNewline();return}
 if(id==='kb'){toggleKb();return}if(id==='mic'){toggleStrip();return}
 if(id==='search'){toast('Search would open here (mock)');return}
 if(id==='read'){toggleReading();return}
 if(id==='more'){moreMenu(b);return}}
const PINNED=['undo','redo','more'];
function mkIc(id){const name=TOOLS[id][0];const b=document.createElement('button');b.className='ic'+(id==='newline'?' acc':'');b.dataset.id=id;b.dataset.tip=name;b.setAttribute('aria-label',name);
 b.innerHTML=svg(id==='kb'&&ST.kbHidden?'kboff':id)+'<span class="name">'+name+'</span>';
 if(id==='back'){b.dataset.hold='1';hold(b,doBack,doBackWord)}else b.onclick=()=>{if(b.classList.contains('dis'))return;act(id,b)};if(id==='newline')nlExtras(b);return b}
function renderToolbar(){const l=getLayout(ST.cur);tb.className='bar nofocus'+(ST.names?' names':'');tb.innerHTML='';
 const vis=l.ids.filter(i=>!l.hidden.includes(i));
 const hist=document.createElement('div');hist.className='hist';hist.setAttribute('role','group');hist.setAttribute('aria-label','History');
 ['undo','redo'].forEach(i=>{if(vis.includes(i))hist.append(mkIc(i))});if(hist.children.length)tb.append(hist);
 const bs=document.createElement('div');bs.className='bs';
 bs.innerHTML='<div class="tools"></div><button class="cue s" tabindex="-1" hidden></button><button class="cue e" tabindex="-1" hidden></button><div class="track" role="scrollbar" aria-label="Scroll the toolbar" hidden><i></i><b></b></div>';
 const tools=$('.tools',bs);let g=null,lg=null;
 vis.filter(i=>!PINNED.includes(i)).forEach(id=>{const grp=TOOLS[id][1];if(g===null||grp!==lg){if(g!==null){const d=document.createElement('span');d.className='div';tools.append(d)}g=document.createElement('div');g.className='grp';tools.append(g)}lg=grp;g.append(mkIc(id))});
 const ul=document.createElement('span');ul.className='ul';tools.append(ul);
 tb.append(bs);
 const lb=document.createElement('button');lb.className='lay';lb.id='layBtn';lb.onclick=()=>layoutMenu(lb);tb.append(lb);
 if(vis.includes('more'))tb.append(mkIc('more'));
 refreshNote();all.hidden=!l.all;renderAll();setupScroll(bs);updateStates();renderOpts();if(R.tool==='lasso')drawOverlay()}
let scrollObs;
function setupScroll(bs){const sc=$('.tools',bs),cs=$('.cue.s',bs),ce=$('.cue.e',bs),tr=$('.track',bs),th=tr.lastElementChild;
 cs.innerHTML=svg('chevL');ce.innerHTML=svg('chevR')+'<span class="n"></span>';
 const kids=()=>$$('.ic',sc);
 function measure(){const over=sc.scrollWidth>sc.clientWidth+2,l=sc.scrollLeft,r=l+sc.clientWidth;
  const st=over&&l>2,en=over&&r<sc.scrollWidth-2;
  const hs=kids().filter(k=>k.offsetLeft+k.offsetWidth<=l+2).length,he=kids().filter(k=>k.offsetLeft>=r-2).length;
  cs.hidden=!st;ce.hidden=!en;cs.setAttribute('aria-label','Scroll back, '+hs+' tools out of sight');ce.setAttribute('aria-label','Scroll for more, '+he+' tools out of sight');
  const n=$('.n',ce);n.textContent=he;n.hidden=he<1;
  const f=28,m=over?'linear-gradient(to right,'+(st?'transparent':'#000')+' 0,#000 '+f+'px,#000 calc(100% - '+f+'px),'+(en?'transparent':'#000')+' 100%)':'';
  sc.style.maskImage=m;sc.style.webkitMaskImage=m;
  tr.hidden=!over;if(over){const w=sc.clientWidth/sc.scrollWidth,mx=sc.scrollWidth-sc.clientWidth;th.style.width=(w*100)+'%';th.style.left=((mx?l/mx*(1-w):0)*100)+'%'}
  placeOpts()}
 sc.addEventListener('scroll',measure,{passive:true});
 sc.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>=Math.abs(e.deltaY)||sc.scrollWidth<=sc.clientWidth+2)return;sc.scrollLeft+=e.deltaY;e.preventDefault()},{passive:false});
 const slide=d=>sc.scrollBy({left:d*sc.clientWidth*.7,behavior:'smooth'});
 cs.onclick=()=>slide(-1);ce.onclick=()=>slide(1);
 let dr=false;const toP=e=>{const b=tr.getBoundingClientRect(),w=sc.clientWidth/sc.scrollWidth,r=(e.clientX-b.left)/b.width;sc.scrollLeft=Math.max(0,Math.min(1,(r-w/2)/(1-w)))*(sc.scrollWidth-sc.clientWidth)};
 tr.onpointerdown=e=>{e.preventDefault();e.stopPropagation();dr=true;try{tr.setPointerCapture(e.pointerId)}catch(_){}toP(e)};
 tr.onpointermove=e=>{if(dr)toP(e)};tr.onpointerup=tr.onpointercancel=()=>{dr=false};
 if(scrollObs)scrollObs.disconnect();
 if(typeof ResizeObserver!=='undefined'){scrollObs=new ResizeObserver(measure);scrollObs.observe(sc);kids().forEach(k=>scrollObs.observe(k))}
 measure()}
function moveUl(){const ul=$('.ul',tb);if(!ul)return;const b=!R.reading&&MODES.includes(R.tool)?$('.tools .ic[data-id="'+R.tool+'"]',tb):null;
 if(!b){ul.style.opacity=0;return}
 ul.style.opacity=1;ul.style.transform='translateX('+(b.offsetLeft+b.offsetWidth/2-8)+'px)';
 if(!ul.classList.contains('ready'))requestAnimationFrame(()=>requestAnimationFrame(()=>ul.classList.add('ready')))}
const ALLTABS={Text:['Heading 1','Heading 2','Heading 3','Bullet list','Numbered list','Checklist','Toggle list','Bold','Italic','Underline','Strikethrough','Indent','Outdent','Align left','Align centre','Align right','Quote','Callout','Code block','Inline code','Divider'],Insert:['Camera','Divider','File','Audio clip'],'Shapes & aids':['Shapes','Ruler','Tape','Magnifier','Colour picker'],View:['Zoom in','Zoom out','Fit width','Grid lines','Dark mode'],Study:['Summary','Quiz me','Flashcards','Mark key term','Review today'],File:['Export PDF','Share','Duplicate page','Move page','Version history']};
const TABICON={Text:'text',Insert:'insert','Shapes & aids':'shapes',View:'eye',Study:'brain',File:'file'};
const TOOLICON={'Bold':'bold','Italic':'italic','Underline':'underline','Bullet list':'list','Numbered list':'olist','Quote':'quote','Heading 1':'h1','Code block':'code','Picture':'img','Camera':'camera','Table':'table','Divider':'minus','Link':'link','File':'file','Audio clip':'mic','Drawing':'pen','Pen':'pen','Pencil':'pencil','Highlighter':'hlight','Ruler':'ruler','Shapes':'shapes','Lasso':'lasso','Colour picker':'palette','Zoom in':'zin','Zoom out':'zout','Fit width':'fit','Reading mode':'read','Grid lines':'grid','Focus mode':'focus','Dark mode':'moon','Make card':'stack','Summary':'ftext','Quiz me':'help','Flashcards':'stack','Mark key term':'tag','Review today':'clock','Export PDF':'fdown','Share':'share','Print':'printer','Duplicate page':'dup','Move page':'move','Version history':'last'};
// All tools row: tabs (icon + label, gliding underline); a soft panel slides open under the tapped tab and tucks away after one use.
/* Shared sideways-scroll treatment (edge fades, chevron cue with hidden count, wheel and swipe): the row itself never moves, only its content scrolls. */
function hscroll(host,sc){
 const mk=c=>{const b=document.createElement('button');b.className='cue '+c;b.tabIndex=-1;b.hidden=true;host.append(b);return b};
 const cs=mk('s'),ce=mk('e');cs.innerHTML=svg('chevL');ce.innerHTML=svg('chevR')+'<span class="n"></span>';
 const kids=()=>[...sc.children].filter(k=>k.matches('.tab,.atool,.opt'));
 function measure(){const over=sc.scrollWidth>sc.clientWidth+2,l=sc.scrollLeft,r=l+sc.clientWidth,st=over&&l>2,en=over&&r<sc.scrollWidth-2;
  const hs=kids().filter(k=>k.offsetLeft+k.offsetWidth<=l+2).length,he=kids().filter(k=>k.offsetLeft>=r-2).length;
  cs.hidden=!st;ce.hidden=!en;cs.setAttribute('aria-label','Scroll back, '+hs+' out of sight');ce.setAttribute('aria-label','Scroll for more, '+he+' out of sight');
  const n=$('.n',ce);n.textContent=he;n.hidden=he<1;
  const f=28,m=over?'linear-gradient(to right,'+(st?'transparent':'#000')+' 0,#000 '+f+'px,#000 calc(100% - '+f+'px),'+(en?'transparent':'#000')+' 100%)':'';
  sc.style.maskImage=m;sc.style.webkitMaskImage=m}
 sc.addEventListener('scroll',measure,{passive:true});
 sc.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>=Math.abs(e.deltaY)||sc.scrollWidth<=sc.clientWidth+2)return;sc.scrollLeft+=e.deltaY;e.preventDefault()},{passive:false});
 const slide=d=>sc.scrollBy({left:d*sc.clientWidth*.7,behavior:'smooth'});cs.onclick=()=>slide(-1);ce.onclick=()=>slide(1);
 if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(measure);ro.observe(sc);ro.observe(host)}
 host._m=measure;measure();addTrack(sc,t=>host.append(t))}
function renderAll(){const tabs=$('#allTabs'),ch=$('#allChips'),row=$('.row',ch),chev=$('#allChev');
 if(!tabs.dataset.built){tabs.dataset.built='1';tabs.setAttribute('role','tablist');tabs.innerHTML='<span class="tul"></span>';
  Object.keys(ALLTABS).forEach(t=>{const b=document.createElement('button');b.className='tab';b.dataset.t=t;b.setAttribute('role','tab');b.innerHTML=svg(TABICON[t])+'<span>'+t+'</span>';b.onclick=()=>{R.allOpen=!(R.allOpen&&R.allTab===t);R.allTab=t;renderAll()};tabs.append(b)});
  chev.innerHTML=svg('chevU');chev.onclick=()=>{R.allOpen=false;renderAll()};
  hscroll(tabs.parentElement,tabs);hscroll(row.parentElement,row)}
 $$('.tab',tabs).forEach(b=>{const on=R.allOpen&&R.allTab===b.dataset.t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
 chev.classList.toggle('show',!!R.allOpen);
 if(ch.dataset.t!==R.allTab){ch.dataset.t=R.allTab;row.innerHTML='';row.scrollLeft=0;ALLTABS[R.allTab].forEach(n=>allChip(n,row))}
 ch.classList.toggle('open',!!R.allOpen);
 const ul=$('.tul',tabs),cur=$('.tab[data-t="'+R.allTab+'"]',tabs);
 if(R.allOpen&&cur&&cur.offsetWidth){if(cur.offsetLeft<tabs.scrollLeft+8||cur.offsetLeft+cur.offsetWidth>tabs.scrollLeft+tabs.clientWidth-8)tabs.scrollTo({left:Math.max(0,cur.offsetLeft-40),behavior:'smooth'});
  ul.style.width=(cur.offsetWidth-24)+'px';ul.style.transform='translate('+(cur.offsetLeft+12)+'px,'+(cur.offsetTop+cur.offsetHeight-4)+'px)';ul.style.opacity=1;if(!ul.classList.contains('ready'))requestAnimationFrame(()=>requestAnimationFrame(()=>ul.classList.add('ready')))}else ul.style.opacity=0;
 tabs.parentElement._m&&tabs.parentElement._m();row.parentElement._m&&row.parentElement._m()}

/* ---------- options strip ---------- */

/* ---------- menus ---------- */
let menuAnchor=null;
function openMenu(items,anchor){menuAnchor=anchor;R.menuAt=performance.now();menu.innerHTML='';
 items.forEach(it=>{if(it.h){const h=document.createElement('div');h.className='h';h.textContent=it.h;menu.append(h);return}
  const b=document.createElement('button');b.textContent=it.t;if(it.c){const i=document.createElement('i');i.className='mdot';i.style.background=it.c;b.prepend(i);b.classList.add('hasdot')}if(it.on)b.classList.add('on');if(it.dis)b.disabled=true;
  b.onclick=()=>{if(!it.keep)menu.classList.remove('show');it.f&&it.f()};menu.append(b)});
 const r=anchor.getBoundingClientRect();menu.classList.add('show');menu.style.maxHeight=(innerHeight-r.bottom-18)+'px';const w=menu.offsetWidth;menu.style.top=(r.bottom+6)+'px';menu.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+'px'}
function closeMenu(){menu.classList.remove('show');R.boxMenuFor=null}
function layoutItems(){
 const items=layoutIds().map(id=>({t:layoutName(id),on:ST.cur===id,f:()=>{ST.cur=id;save();renderToolbar()}}));
 items.push({t:'+ New layout…',f:newLayoutDlg},{t:'Rename…',f:renameDlg},{t:'Reset this layout to original',f:()=>{resetLayout(ST.cur);renderToolbar();toast('Layout reset to original')}});
 if(!isBuiltin(ST.cur))items.push({t:'Delete this layout…',f:deleteDlg});return items}
function layoutMenu(a){openMenu([{h:'Switch layout'},...layoutItems()],a)}
function moreMenu(a){openMenu([
 {t:'Reading mode',on:R.reading,f:()=>toggleReading()},
 {t:'Copy & paste ▸',keep:true,f:()=>copyMenu(a)},
 {t:ST.kbHidden?'Keyboard stays hidden: On':'Keyboard stays hidden: Off',f:()=>{ST.kbHidden=!ST.kbHidden;R.kbOpen=false;save();applyIM();updateStates();toast(ST.kbHidden?'Real keyboard will not pop up':'Normal keyboard behaviour')}},
 {h:'Layout'},...layoutItems(),{h:'Toolbar'},
 {t:'Customise toolbar…',f:customiseSheet},{t:'Toolbar settings…',f:settingsSheet},{t:'Hide toolbar',f:()=>setTbHidden(true)}],a)}
function copyMenu(a){openMenu([{t:'‹ Back',keep:true,f:()=>moreMenu(a)},{h:'Copy & paste'},
 {t:'Copy',f:()=>{focusTarget();let ok=false;try{ok=document.execCommand('copy')}catch(_){}toast(ok?'Copied':'Select some text first')}},
 {t:'Cut',f:()=>{focusTarget();let ok=false;try{ok=document.execCommand('cut')}catch(_){}flush();toast(ok?'Cut':'Select some text first')}},
 {t:'Paste',f:()=>{focusTarget();try{navigator.clipboard.readText().then(t=>{document.execCommand('insertText',false,t);flush()},()=>toast('Paste is blocked here: use Cmd/Ctrl+V'))}catch(_){toast('Paste is blocked here: use Cmd/Ctrl+V')}}},
 {t:'Select all in box',f:()=>{const t=focusTarget();if(t){const s=getSelection();s.selectAllChildren(t)}else toast('Tap a text box first')}}],a)}
document.addEventListener('click',e=>{if(R.menuAt&&performance.now()-R.menuAt<350)return;if(menu.classList.contains('show')&&!menu.contains(e.target)&&!e.target.closest('.ic,#layBtn,.boxbar'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeSheet()}});

/* ---------- sheets / dialogs ---------- */
function openSheet0(html,foot,fn){const keep=R.sheetFn===fn&&sheet.classList.contains('show')?sheet.scrollTop:0;R.sheetFn=fn||null;
 sheet.innerHTML=html+'<div class="foot">'+(foot||'<button class="lay" data-act="close">Done</button>')+'</div>';sheet.classList.add('show');bg.classList.add('show');sheet.scrollTop=keep;const f=sheet.querySelector('input');if(f&&!keep)setTimeout(()=>{f.focus();f.select()},30)}
function closeSheet(){sheet.classList.remove('show');bg.classList.remove('show');R.sheetFn=null}
bg.onclick=closeSheet;
const sw=(on,act,extra,dis)=>'<button class="switch'+(on?' on':'')+'" role="switch" aria-checked="'+on+'" data-act="'+act+'" '+(extra||'')+(dis?' disabled':'')+'></button>';
function miniCard(id){const l=getLayout(id),n=l.ids.filter(i=>!l.hidden.includes(i)).length;return'<button class="mini'+(ST.cur===id?' on':'')+'" data-act="lay" data-id="'+id+'"><div class="mb a"></div><div class="mb" style="width:'+Math.min(100,n*6)+'%"></div><div class="mb" style="width:'+(l.all?'90%':'30%')+'"></div><strong>'+esc(layoutName(id))+'</strong><span>'+n+' tools'+(l.all?' + All tools row':'')+'</span></button>'}
function settingsSheet(){
 const own=Object.keys(ST.own).map(i=>esc(ST.own[i].name)).join(', ')||'none yet';
 openSheet('<h3>Toolbar &amp; layout</h3><p class="muted">Pick how much you see. You can change it any time.</p>'+
 '<div class="srow"><div class="t"><b>Layout</b><span class="muted">Beginner shows a few tools. Professional adds a slim All tools row.</span><div class="prev">'+layoutIds().map(miniCard).join('')+'</div></div></div>'+
 '<div class="srow"><div class="t"><b>Your layouts</b><span class="muted">'+own+' · up to 3</span></div><button class="lay" data-act="new">New…</button></div>'+
 '<div class="srow"><div class="t"><b>Keyboard stays hidden until I ask</b><span class="muted">Writing with the Pencil never pops up the keyboard or extra bars.</span></div>'+sw(ST.kbHidden,'sw','data-k="kbHidden"')+'</div>'+
 '<div class="srow"><div class="t"><b>Show names under icons</b><span class="muted">Off: hover or long-press an icon to see its name.</span></div>'+sw(ST.names,'sw','data-k="names"')+'</div>'+
 '<div class="srow"><div class="t"><b>Tool options stay open</b><span class="muted">Off: the strip hides after one action. Tap the tool again to bring it back.</span></div>'+sw(ST.keepOpen,'sw','data-k="keepOpen"')+'</div>'+
 devRows()+'<div class="srow"><div class="t"><b>Customise toolbar…</b><span class="muted">Show, hide and reorder tools.</span></div><button class="lay" data-act="cust">Open</button></div>'+
 '<div class="srow"><div class="t"><b>Reset this layout</b><span class="muted">Back to its original. Your notes are not touched.</span></div><button class="lay" data-act="resetcur">Reset</button></div>'+
 '<div class="srow"><div class="t"><b>Reset all layouts</b><span class="muted">Every layout back to the original.</span></div><button class="lay danger" data-act="resetall">Reset all</button></div>',null,settingsSheet)}
function nbr(l,id,s){let j=l.ids.indexOf(id);if(PINNED.includes(id))return -1;do{j+=s}while(l.ids[j]&&PINNED.includes(l.ids[j]));return l.ids[j]?j:-1}
function canMove(l,id,s){return nbr(l,id,s)>=0}
function customiseSheet(){const l=getLayout(ST.cur);
 openSheet('<h3>Customise toolbar</h3><p class="muted">Editing: <b>'+esc(layoutName(ST.cur))+'</b>. Changes apply live. Undo, Redo and More stay in place.</p>'+
 '<div class="srow"><div class="t"><b>Show All tools row</b><span class="muted">The slim tabbed row under the toolbar.</span></div>'+sw(l.all,'allrow')+'</div>'+
 l.ids.map((id,i)=>'<div class="srow"><span class="ico">'+svg(id)+'</span><div class="t"><b>'+TOOLS[id][0]+'</b></div><button class="sq" data-act="up" data-id="'+id+'" aria-label="Move '+TOOLS[id][0]+' up"'+(!canMove(l,id,-1)?' disabled':'')+'>↑</button><button class="sq" data-act="down" data-id="'+id+'" aria-label="Move '+TOOLS[id][0]+' down"'+(!canMove(l,id,1)?' disabled':'')+'>↓</button>'+sw(!l.hidden.includes(id),'vis','data-id="'+id+'" aria-label="Show '+TOOLS[id][0]+'"',id==='more')+'</div>').join(''),null,customiseSheet)}
let NL={from:'beginner'};
function newLayoutDlg(){closeMenu();if(Object.keys(ST.own).length>=3){toast('Up to 3 layouts of your own: delete one first');return}
 const n=Object.keys(ST.own).length+1;
 openSheet('<h3>New layout</h3><p class="muted">Start from:</p><div class="prev" id="nlFrom">'+[['blank','Blank','Just the basics'],['beginner','Beginner','A few tools'],['pro','Professional','Everything + All tools row']].map(([k,t,d])=>'<button class="mini'+(NL.from===k?' on':'')+'" data-act="from" data-k="'+k+'"><div class="mb a"></div><div class="mb"></div><strong>'+t+'</strong><span>'+d+'</span></button>').join('')+'</div>'+
 '<label class="muted" for="nlName" style="display:block;margin-top:14px">Name</label><input class="field" id="nlName" maxlength="24" value="My layout '+n+'" autocomplete="off"><p class="muted">Up to 3 layouts of your own. Each device keeps its own copy when you change it.</p>',
 '<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="create">Create</button>',null)}
function renameDlg(){closeMenu();if(isBuiltin(ST.cur)){openSheet('<h3>Rename</h3><p class="muted">Built-in layouts keep their names. Make your own with + New layout… and name it anything.</p>');return}
 openSheet('<h3>Rename layout</h3><input class="field" id="rnName" maxlength="24" value="'+esc(ST.own[ST.cur].name)+'" autocomplete="off">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="rename">Save</button>')}
function confirmDlg(title,msg,label,fn){R.pend=fn;openSheet('<h3>'+title+'</h3><p class="muted">'+msg+'</p>','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="ok">'+label+'</button>')}
function deleteDlg(){closeMenu();const id=ST.cur;confirmDlg('Delete this layout?','“'+esc(ST.own[id].name)+'” will be removed. Built-in layouts are not affected.','Delete',()=>{delete ST.own[id];ST.cur='beginner';save();renderToolbar();toast('Layout deleted')})}
function rerender(){const f=R.sheetFn;if(f)f()}
sheet.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a)return;const d=a.dataset,act=d.act;if(sheetExtra(act,d,a))return;
 if(act==='close')closeSheet();
 else if(act==='ok'){const f=R.pend;R.pend=null;closeSheet();f&&f()}
 else if(act==='sw'){ST[d.k]=!ST[d.k];if(d.k==='kbHidden'){R.kbOpen=false;applyIM()}save();renderToolbar();rerender()}
 else if(act==='lay'){ST.cur=d.id;save();renderToolbar();rerender()}
 else if(act==='new')newLayoutDlg();
 else if(act==='cust')customiseSheet();
 else if(act==='resetcur'){resetLayout(ST.cur);renderToolbar();rerender();toast('Layout reset to original')}
 else if(act==='resetall')confirmDlg('Reset all layouts?','Every layout goes back to its original. Your notes are not touched.','Reset all',()=>{ST.ov={};Object.keys(ST.own).forEach(id=>resetLayout(id));save();renderToolbar();toast('All layouts reset')});
 else if(act==='allrow'){editLayout(l=>{l.all=!l.all});rerender()}
 else if(act==='vis'){editLayout(l=>{const i=l.hidden.indexOf(d.id);if(i>=0)l.hidden.splice(i,1);else l.hidden.push(d.id)});rerender()}
 else if(act==='up'||act==='down'){editLayout(l=>{const i=l.ids.indexOf(d.id),j=nbr(l,d.id,act==='up'?-1:1);if(j>=0){[l.ids[i],l.ids[j]]=[l.ids[j],l.ids[i]]}});rerender()}
 else if(act==='from'){NL.from=d.k;$$('#nlFrom .mini').forEach(m=>m.classList.toggle('on',m.dataset.k===d.k))}
 else if(act==='create'){const name=($('#nlName').value.trim()||'My layout').slice(0,24);const id='c'+Date.now().toString(36);
  const base=NL.from==='blank'?{ids:[...ALLIDS],hidden:ALLIDS.filter(i=>!['undo','redo','text','pen','more'].includes(i)),all:false}:clone(builtin(NL.from));
  ST.own[id]={name,ids:base.ids,hidden:base.hidden,all:base.all,orig:clone({ids:base.ids,hidden:base.hidden,all:base.all})};ST.cur=id;save();renderToolbar();closeSheet();toast('Layout “'+name+'” created')}
 else if(act==='savepreset'){const nm=($('#pName').value.trim()||'My style').slice(0,20);const v={...curV()};delete v.ff;ST.presets.push({id:uid(),name:nm,v});save();closeSheet();renderOpts();toast('Preset saved')}
 else if(act==='shotcopy')pngOut('copy',R.shotC);
 else if(act==='shotsave')pngOut('save',R.shotC);
 else if(act==='convok'){closeSheet();convertApply()}
 else if(act==='rename'){const v=($('#rnName').value.trim()||ST.own[ST.cur].name).slice(0,24);ST.own[ST.cur].name=v;save();renderToolbar();closeSheet();toast('Renamed')}});
sheet.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input')){const b=sheet.querySelector('[data-act=create],[data-act=rename],[data-act=savepreset],[data-act=convok]');if(b)b.click()}});

/* ---------- top controls ---------- */

$$('#laySeg button').forEach(b=>b.onclick=()=>{ST.cur=b.dataset.l;save();renderToolbar()});
$('#showtb').onclick=()=>setTbHidden(false);
$('#readpill').onclick=()=>toggleReading(false);
document.addEventListener('mousedown',e=>{if(e.target.closest('.nofocus'))e.preventDefault()});

/* ---------- tooltips (hover, or long-press for touch/pen) ---------- */
let lp,lpFired=false;
function showTip(b){if(ST.names)return;tip.textContent=b.dataset.tip;tip.hidden=false;const r=b.getBoundingClientRect();tip.style.top=(r.bottom+6)+'px';tip.style.left=Math.max(8,Math.min(r.left+r.width/2-tip.offsetWidth/2,innerWidth-tip.offsetWidth-8))+'px'}
document.addEventListener('pointerover',e=>{const b=e.target.closest('[data-tip]');if(b&&e.pointerType==='mouse')showTip(b)});
document.addEventListener('pointerout',e=>{if(e.target.closest('[data-tip]')&&e.pointerType==='mouse')tip.hidden=true});
document.addEventListener('pointerdown',e=>{lpFired=false;const b=e.target.closest('[data-tip]');if(b&&e.pointerType!=='mouse'&&!b.dataset.hold){lp=setTimeout(()=>{lpFired=true;showTip(b)},450)}});
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,()=>{clearTimeout(lp);if(!tip.hidden)setTimeout(()=>{tip.hidden=true},900)}));
document.addEventListener('click',e=>{if(lpFired&&e.target.closest('[data-tip]')){e.stopPropagation();e.preventDefault();lpFired=false}},true);
tb.addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- fake keyboard ---------- */
(function(){const kbEl=$('#kb');let shift=false;const rows=['qwertyuiop','asdfghjkl','zxcvbnm'];const keys=[];
 const mk=(t,cls,fn,rep)=>{const b=document.createElement('button');b.className='k'+(cls?' '+cls:'');b.textContent=t;b.setAttribute('aria-label',t);if(rep)hold(b,fn);else{b.addEventListener('pointerdown',e=>{e.preventDefault();fn()});b.addEventListener('click',e=>{if(e.detail===0)fn()})}return b};
 const label=()=>keys.forEach(k=>k.textContent=shift?k.dataset.c.toUpperCase():k.dataset.c);
 const typeCh=c=>{typeKey(shift?c.toUpperCase():c);if(shift){shift=false;sh.classList.remove('on');label()}};
 let sh;
 rows.forEach((r,ri)=>{const row=document.createElement('div');row.className='row';
  if(ri===2){sh=mk('⇧','w',()=>{shift=!shift;sh.classList.toggle('on',shift);label()});row.append(sh)}
  [...r].forEach(c=>{const b=mk(c,'',()=>typeCh(c));b.dataset.c=c;keys.push(b);row.append(b)});
  if(ri===2)row.append(mk('⌫','w',doBack,true));kbEl.append(row)});
 const last=document.createElement('div');last.className='row';
 [',','.','?'].forEach(c=>last.append(mk(c,'',()=>typeKey(c))));
 last.append(mk('space','sp',()=>typeKey(' ')));last.append(mk('return','w',doNewline));last.append(mk('⌄ hide','w',()=>{R.kbOpen=false;updateStates()}));kbEl.append(last)})();

/* ============================================================
   v2 additions. Everything below the original mock code:
   data, pen engine (types, shapes, ruler, tape, layers, gestures),
   Professional cards (the ▾ on a pill), lasso menus, insert, text.
   ============================================================ */
const PENCOL=[['Black','auto'],['Blue','#5aa9ff'],['Red','#ef7a6f'],['Green','#4cc38a'],['Orange','#f0b94a'],['Purple','#a48df5']];
const HLCOL=[['Yellow','#f5d76e'],['Green','#8de0b0'],['Blue','#9cc8ff'],['Pink','#f2a1c5'],['Orange','#f7b98a'],['Purple','#c9b6f5']];
const HLW={Fine:10,Medium:16,Bold:26};
const PTYPES=['Fountain','Ball','Brush','Pencil','Marker','Highlighter'];
const TYPEK={Fountain:'pen',Ball:'ball',Brush:'brush',Pencil:'pencil',Marker:'marker',Highlighter:'hl'};
const DEFPN={exact:null,ls:'solid',shape:'free',sharp:35,pOn:true,press:55,smooth:40,flat:0,tilt:true,speed:false,latency:false,hold:false,snap:false,fill:false,finger:'auto',scribble:false,c2l:false};
const DEFHN={snap:false,behind:true,op:50};
ST.pen2=Object.assign({},DEFPN,{cust:[],favs:[],paper:'lined',psize:'fit'},ST.pen2||{});
ST.hl2=Object.assign({},DEFHN,{cust:[],favs:[]},ST.hl2||{});
ST.dev=Object.assign({pencilPicks:false,fingerBars:false,scribbleTxt:false,pencilScroll:false,holdMs:1500,nlTrig:'hold',nlMs:600},ST.dev||{});
const PN=ST.pen2,HN=ST.hl2,DEV=ST.dev;
const pc=()=>isPro()?PN:Object.assign({},DEFPN),hcf=()=>isPro()?HN:DEFHN;
const hexA=(c,a)=>{c=c==='auto'?'#888888':c;const n=parseInt(c.slice(1),16);return'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+(a==null?.55:a)+')'};

/* ---------- layers (max 2): show/hide, lock, order ---------- */
const ly=s=>Math.min(s.layer||0,R.layers.length-1);
const lyShow=i=>!isPro()||(R.layers[i]||R.layers[0]).show;
const lyLock=i=>isPro()&&(R.layers[i]||R.layers[0]).lock;
const lyEdit=s=>{const i=ly(s);return lyShow(i)&&!lyLock(i)};
function paint(){const w=paper.clientWidth,h=paper.clientHeight;cxH.clearRect(0,0,w,h);cx.clearRect(0,0,w,h);const fg=css('--ink');
 R.layers.forEach((_,li)=>{if(!lyShow(li))return;strokes.forEach(s=>{if(ly(s)!==li)return;let q=s;if(R.vad!=null){const n=Math.max(0,Math.min(s.pts.length,Math.round(R.vad.left)));R.vad.left-=s.pts.length;if(n<1)return;if(n<s.pts.length)q={...s,pts:s.pts.slice(0,n)}}drawStroke((s.k==='hl'&&s.beh!==false)?cxH:cx,q,fg)})})}
function viewAsDrawn(){const tot=strokes.reduce((a,s)=>a+s.pts.length,0);if(!tot){toast('Draw something first');return}R.acard=false;renderOpts();const t0=performance.now(),dur=Math.min(5000,1500+tot*8);
 paper.classList.add('vad');const step=()=>{const f=Math.min(1,(performance.now()-t0)/dur);R.vad={left:tot*f};paint();if(f<1)requestAnimationFrame(step);else{R.vad=null;paper.classList.remove('vad');paint()}};step();toast('Replaying your ink as you drew it')}

/* ---------- stroke drawing: Fountain, Ball, Brush, Pencil, Marker, Highlighter, Tape ---------- */
function polyPath(c,p,closed){c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);if(closed)c.closePath()}
function drawStroke(c,s,fg){const p=s.pts;if(!p.length)return;const col=s.color==='auto'?fg:s.color;
 if(s.k==='tape'){const a=p[0],b=p[1]||a,x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),w=Math.abs(b[0]-a[0]),h=Math.abs(b[1]-a[1]);c.save();c.fillStyle=c.strokeStyle=col;c.globalAlpha=s.peel?.2:1;c.fillRect(x,y,w,h);if(s.peel){c.globalAlpha=.8;c.setLineDash([5,4]);c.lineWidth=1.2;c.strokeRect(x,y,w,h)}c.restore();return}
 c.save();c.lineCap=s.k==='hl'?'square':'round';c.lineJoin='round';c.strokeStyle=col;c.fillStyle=col;
 const W={pen:s.w,ball:s.w,brush:s.w*1.5,pencil:s.w*.85,marker:s.w*2.8,hl:s.w}[s.k],A={pen:1,ball:1,brush:1,pencil:.72,marker:.92,hl:s.op||.5}[s.k];
 const dash=s.ls==='dashed'?[W*3,W*2.4]:s.ls==='dotted'?[.01,W*2.4]:null;
 if(p.length<2){c.globalAlpha=A;c.beginPath();c.arc(p[0][0],p[0][1],W/2,0,7);c.fill();c.restore();return}
 if((s.k==='pen'||s.k==='brush')&&!dash&&!s.sh){
  const n=p.length,pk=(s.pr||0)/100*(s.k==='brush'?1.5:1),tl=Math.max(.01,(s.sp||0)/100*Math.min(n*.45,16));
  for(let i=1;i<n;i++){const a=i===1?p[0]:mid(p[i-2],p[i-1]),b=i===n-1?p[i]:mid(p[i-1],p[i]);
   let f=1+(p[i-1][2]-.5)*1.8*pk;
   if(s.sp)f*=.3+.7*Math.min(1,(Math.min(i,n-i)+.2)/tl);
   if(s.fl){const th=Math.atan2(b[1]-a[1],b[0]-a[0]);f*=1-s.fl/100*.65*Math.abs(Math.sin(th+.7854))}
   c.lineWidth=Math.max(.4,W*f);c.beginPath();c.moveTo(a[0],a[1]);c.quadraticCurveTo(p[i-1][0],p[i-1][1],b[0],b[1]);c.stroke()}}
 else{c.globalAlpha=A;c.lineWidth=W;if(dash)c.setLineDash(dash);
  if(s.sh)polyPath(c,p,s.closed);else smoothPath(c,p);
  if(s.fill&&s.closed){c.save();c.globalAlpha=A*.2;c.fill();c.restore()}
  c.stroke();
  if(s.k==='pencil'&&!dash){c.globalAlpha=.4;c.lineWidth=W*.5;c.setLineDash([1.2,2.6]);c.translate(.6,.5);smoothPath(c,p);c.stroke()}}
 c.restore()}
function addPt(s,x,y,pr,q){const l=s.pts[s.pts.length-1];
 if(s.rl){const o=projRl(s.rl,x,y);x=o[0];y=o[1]}
 else if(l){const a=1-.85*(s.sm||0)/100;x=l[0]+(x-l[0])*a;y=l[1]+(y-l[1])*a}
 if(l){const d=Math.hypot(x-l[0],y-l[1]);if(d<.8)return;const now=performance.now();
  if(s.spd){const dt=Math.max(1,now-(s.tl||s.t0));pr*=Math.max(.35,1-Math.min(1,d/dt/2.2)*.65)}
  s.tl=now;
  if(s.tilt&&q&&q.pointerType==='pen'&&q.tiltX!=null)pr=Math.min(1,pr*(1+Math.hypot(q.tiltX,q.tiltY)/90*.8));
  if(d>5){const n=Math.ceil(d/4);for(let i=1;i<n;i++)s.pts.push([l[0]+(x-l[0])*i/n,l[1]+(y-l[1])*i/n,pr])}}
 s.pts.push([x,y,pr])}

/* ---------- shapes ("Draw as"), tape, hold-for-perfect-shape ---------- */
function densify(poly,closed){const out=[],n=poly.length,m=closed?n:n-1;for(let i=0;i<m;i++){const a=poly[i],b=poly[(i+1)%n],d=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(d/4));for(let j=0;j<k;j++)out.push([a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k,.5])}
 const e=closed?poly[0]:poly[n-1];out.push([e[0],e[1],.5]);return out}
function shapePts(kind,a,b,snap){let x0=a[0],y0=a[1],x1=b[0],y1=b[1];
 if(kind==='tape')return[[x0,y0,.5],[x1,y1,.5]];
 if(kind==='line'||kind==='arrow'){if(snap){const ang=Math.atan2(y1-y0,x1-x0),r=Math.hypot(x1-x0,y1-y0),q=Math.round(ang/(Math.PI/4))*Math.PI/4;if(Math.abs(ang-q)<.14){x1=x0+Math.cos(q)*r;y1=y0+Math.sin(q)*r}}
  const poly=[[x0,y0],[x1,y1]];
  if(kind==='arrow'){const ang=Math.atan2(y1-y0,x1-x0),hl=Math.min(18,Math.hypot(x1-x0,y1-y0)*.4);poly.push([x1-Math.cos(ang-.5)*hl,y1-Math.sin(ang-.5)*hl],[x1,y1],[x1-Math.cos(ang+.5)*hl,y1-Math.sin(ang+.5)*hl])}
  return densify(poly,false)}
 let w=x1-x0,h=y1-y0;
 if(snap&&(kind==='box'||kind==='oval')){const aw=Math.abs(w),ah=Math.abs(h),m=Math.max(aw,ah);if(m>0&&Math.abs(aw-ah)<.14*m){w=Math.sign(w||1)*m;h=Math.sign(h||1)*m;x1=x0+w;y1=y0+h}}
 if(kind==='box')return densify([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],true);
 if(kind==='triangle')return densify([[(x0+x1)/2,y0],[x1,y1],[x0,y1]],true);
 const cx0=(x0+x1)/2,cy0=(y0+y1)/2,rx=Math.abs(w)/2,ry=Math.abs(h)/2,o=[];for(let i=0;i<=48;i++){const t=i/48*Math.PI*2;o.push([cx0+Math.cos(t)*rx,cy0+Math.sin(t)*ry,.5])}return o}
function setShape(s,c,snap){s.p1=[c.x,c.y];s.pts=shapePts(s.shape,s.p0,[c.x,c.y],snap||pc().snap);s.closed=['box','oval','triangle'].includes(s.shape)}
function bboxPts(p){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;p.forEach(q=>{x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1])});return{x0,y0,x1,y1,w:x1-x0,h:y1-y0}}
function perfect(s){if(R.cur!==s||s.shape||s.frozen)return;const p=s.pts;if(p.length<8)return;const bb=bboxPts(p),ext=Math.max(bb.w,bb.h);if(ext<24)return;
 const a=p[0],b=p[p.length-1],chord=Math.hypot(b[0]-a[0],b[1]-a[1]);let kind=null,pts=null;
 const nx=(b[1]-a[1])/(chord||1),ny=-(b[0]-a[0])/(chord||1);let dev=0;p.forEach(q=>{dev=Math.max(dev,Math.abs((q[0]-a[0])*nx+(q[1]-a[1])*ny))});
 if(chord>ext*.8&&dev<Math.max(6,chord*.07))pts=shapePts('line',[a[0],a[1]],[b[0],b[1]],true);
 else if(chord<ext*.3){let ar=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];ar+=q[0]*r[1]-r[0]*q[1]}ar=Math.abs(ar)/2/((bb.w*bb.h)||1);
  kind=ar>.88?'box':ar<.65?'triangle':'oval';pts=shapePts(kind,[bb.x0,bb.y0],[bb.x1,bb.y1],true)}
 if(!pts)return;s.pts=pts;s.sh=true;s.shape='hold';s.closed=!!kind;s.frozen=true;redraw();toast(kind?'Perfect '+(kind==='box'?'box':kind):'Perfect line')}

/* ---------- ruler ---------- */
function rulerSnap(x,y){const r=R.rl;if(!r||$('#ruler').hidden)return null;const ux=Math.cos(r.a),uy=Math.sin(r.a),dx=x-r.x,dy=y-r.y,lx=dx*ux+dy*uy,lyy=-dx*uy+dy*ux;
 if(Math.abs(lx)>r.len/2+14)return null;
 for(const sg of[-1,1]){const ey=sg*40;if(Math.abs(lyy-ey)<26)return{ox:r.x-uy*ey,oy:r.y+ux*ey,ux,uy,t0:-r.len/2,t1:r.len/2}}return null}
function projRl(rl,x,y){const t=Math.max(rl.t0,Math.min(rl.t1,(x-rl.ox)*rl.ux+(y-rl.oy)*rl.uy));return[rl.ox+rl.ux*t,rl.oy+rl.uy*t]}
function placeRuler(){const r=R.rl,el=$('#ruler');if(!r)return;el.style.left=r.x+'px';el.style.top=r.y+'px';el.style.transform='rotate('+r.a+'rad)';$('.lab',el).textContent=Math.round(((r.a*180/Math.PI)%360+360)%360)+'°'}
function toggleRuler(on){const el=$('#ruler');on=on===undefined?el.hidden:on;if(on&&!R.rl)R.rl={x:Math.round(paper.clientWidth/2),y:240,a:0,len:340};el.hidden=!on;if(on)placeRuler();renderOpts()}

/* ---------- pen strokes ---------- */
function startPen(e,p){
 if(e.pointerType==='pen')R.penSeen=true;
 const c=pc(),h=hcf();
 if(e.pointerType==='touch'&&(c.finger==='never'||(c.finger==='auto'&&R.penSeen)))return;
 const li=R.la;if(!lyShow(li)){toast('This layer is hidden: show it to draw');return}if(lyLock(li)){toast('This layer is locked');return}
 const k=TYPEK[R.pen],isHl=k==='hl';
 const s={id:uid(),k,color:isHl?R.hlCol:R.penCol,w:isHl?HLW[R.hlSize]:(c.exact!=null?c.exact:SIZES[R.size]),layer:li,pts:[[p.x,p.y,prs(e)]],ls:c.ls,sp:k==='brush'?Math.max(c.sharp,45):c.sharp,pr:c.pOn?c.press:0,fl:k==='pen'?c.flat:0,sm:c.smooth,spd:c.speed,tilt:c.tilt,t0:performance.now(),fill:c.fill};
 if(isHl){s.op=h.op/100;s.beh=h.behind}
 if(R.rec!=null)s.rec=Math.round((performance.now()-R.rec)/1000);
 if(c.shape!=='free'){s.shape=c.shape;s.p0=[p.x,p.y];s.sh=true;if(c.shape==='tape'){s.k='tape';s.w=2}}
 else{const rl=rulerSnap(p.x,p.y);if(rl){s.rl=rl;const o=projRl(rl,p.x,p.y);s.pts[0][0]=o[0];s.pts[0][1]=o[1]}}
 R.cur=s;strokes.push(s);redraw()}
function penMove(e){const s=R.cur;if(!s||s.frozen)return;const ev=(e.getCoalescedEvents&&e.getCoalescedEvents().length)?e.getCoalescedEvents():[e];
 ev.forEach(q=>{const c=pt(q);if(s.shape)setShape(s,c,q.shiftKey);else addPt(s,c.x,c.y,prs(q),q)});
 clearTimeout(R.holdT);if(pc().hold&&!s.shape&&!s.rl&&s.pts.length>6)R.holdT=setTimeout(()=>perfect(s),600);
 redraw()}
const tapeAt=(x,y)=>{for(let i=strokes.length-1;i>=0;i--)if(strokes[i].k==='tape'&&lyEdit(strokes[i])&&hitStroke(strokes[i],x,y,0))return strokes[i];return null};
function scribbleOut(s){const p=s.pts;if(p.length<14)return false;const bb=bboxPts(p);let rev=0,dir=0,ax=p[0][0];
 p.forEach(q=>{const dx=q[0]-ax;if(Math.abs(dx)>7){const d=Math.sign(dx);if(dir&&d!==dir)rev++;dir=d;ax=q[0]}});
 if(rev<4||bb.w>180||bb.h>140)return false;
 const gone=strokes.filter(o=>o!==s&&lyEdit(o)&&p.some(q=>hitStroke(o,q[0],q[1],6)));
 strokes=strokes.filter(o=>o!==s&&!gone.includes(o));redraw();toast(gone.length?'Scribbled out':'Scribble removed');return true}
function circleLasso(s){const p=s.pts;if(p.length<12)return false;const bb=bboxPts(p);if(bb.w<50||bb.h<50)return false;const a=p[0],b=p[p.length-1];if(Math.hypot(b[0]-a[0],b[1]-a[1])>Math.max(bb.w,bb.h)*.3)return false;
 const poly=p.map(q=>[q[0],q[1]]);
 const inside=strokes.filter(o=>o!==s&&lyEdit(o)&&o.pts.every(q=>inPoly(q[0],q[1],poly)));
 const bxs=$$('.box',paper).filter(bx=>{const r=bboxOf(bx);return inPoly(r.x0,r.y0,poly)&&inPoly(r.x1,r.y1,poly)});
 if(!inside.length&&!bxs.length)return false;
 strokes=strokes.filter(o=>o!==s);setTool('lasso',true);L.ids=new Set(inside.map(o=>o.id));L.boxes=bxs;bxs.forEach(bx=>bx.classList.add('lsel'));calcBBox();redraw();drawOverlay();lassoUi();toast('Circled: now in Lasso');return true}
/* Snap to text lines: a highlighter stroke over words becomes a real highlight mark on the text */
function hlSnap(s){if(R.reading)return;const p=s.pts,bb=bboxPts(p),y=(bb.y0+bb.y1)/2;if(bb.h>s.w*3||bb.w<12)return;
 const pr=paper.getBoundingClientRect();let did=false;
 $$('.txt',paper).forEach(tx=>{const wk=document.createTreeWalker(tx,NodeFilter.SHOW_TEXT);let first=null,last=null,n;
  while((n=wk.nextNode())){for(let i=0;i<n.length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const rc=r.getBoundingClientRect();if(!rc.width)continue;const cx0=rc.left+rc.width/2-pr.left,cy0=rc.top+rc.height/2-pr.top;if(cx0>=bb.x0&&cx0<=bb.x1&&Math.abs(cy0-y)<rc.height*.8){if(!first)first=[n,i];last=[n,i+1]}}}
  if(first){const rg=document.createRange();rg.setStart(first[0],first[1]);rg.setEnd(last[0],last[1]);if(!rg.toString().trim())return;
   tx.focus({preventScroll:true});const sl=getSelection();sl.removeAllRanges();sl.addRange(rg);document.execCommand('styleWithCSS',false,true);document.execCommand('hiliteColor',false,hexA(s.color));sl.removeAllRanges();tx.blur();did=true}});
 if(did){strokes=strokes.filter(o=>o!==s);redraw();toast('Snapped to the text as a highlight')}}
function endPen(){const s=R.cur;R.cur=null;clearTimeout(R.holdT);if(!s)return;const c=pc();
 if(s.shape&&!s.frozen){const a=s.p0,b=s.p1||s.p0;if(Math.hypot(b[0]-a[0],b[1]-a[1])<4){strokes=strokes.filter(x=>x!==s);
   if(s.k==='tape'){const t=tapeAt(s.p0[0],s.p0[1]);if(t){t.peel=!t.peel;toast(t.peel?'Tape peeled off':'Tape stuck back')}}
   redraw();commit();return}}
 if(!s.shape&&!s.frozen&&s.k!=='tape'){
  if(c.scribble&&scribbleOut(s)){commit();return}
  if(c.c2l&&circleLasso(s)){commit();return}
  if(s.k==='hl'&&hcf().snap)hlSnap(s)}
 commit()}

/* ---------- Magnifier and Write pad (a bottom pad) ---------- */
const padEl=$('#pad');let padCv=null,padCx=null;
function closePad(){padEl.hidden=true;$('#magbox').hidden=true;R.pad=null;updateStates()}
function togglePad(kind){if(R.pad===kind){closePad();return}openPad(kind)}
function openPad(kind){R.pad=kind;padEl.hidden=false;
 if(kind==='mag'){setTool('pen',true);const s=freeSpot();R.mg=R.mg||{z:3,er:false};R.mg.bx=s.x;R.mg.by=s.y;}
 buildPad();updateStates()}
function buildPad(){const kind=R.pad;if(!kind)return;const mg=R.mg;
 padEl.innerHTML='<div class="ph"><strong>'+(kind==='mag'?'Magnifier':'Write pad')+'</strong>'+
  (kind==='mag'?[2,2.5,3,4].map(z=>'<button class="opt'+(mg.z===z?' on':'')+'" data-p="z" data-v="'+z+'" aria-label="Zoom '+z+' times">'+z+'×</button>').join('')+'<button class="opt" data-p="space">Space</button><button class="opt" data-p="next">Next line</button><button class="opt'+(mg.er?' on':'')+'" data-p="er" aria-pressed="'+!!mg.er+'">'+svg('eraser')+'&nbsp;Eraser</button>':'<button class="opt" data-p="conv">Insert as text (demo)</button><button class="opt" data-p="clear">Clear</button>')+
  '<span style="flex:1"></span>'+minHtml('pad','opt')+'<button class="opt" data-p="close" aria-label="Close">'+svg('xmark')+'</button></div><canvas id="padCv" aria-label="'+(kind==='mag'?'Magnifier pad: write small here':'Write pad')+'"></canvas>';
 padCv=$('#padCv');const d=Math.min(devicePixelRatio||1,2);padCv.width=Math.round(padCv.clientWidth*d);padCv.height=Math.round(150*d);padCx=padCv.getContext('2d');padCx.setTransform(d,0,0,d,0,0);
 const mb=$('#magbox');if(kind==='mag'){mb.hidden=false;placeMagbox()}else mb.hidden=true;
 const pp=e=>{const r=padCv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 padCv.onpointerdown=e=>{e.preventDefault();padCv.setPointerCapture(e.pointerId);const q=pp(e);R.pc={last:q,ch:false};
  if(kind==='mag'&&mg.er){R.pc.er=true;padErase(q,q);return}
  if(kind==='mag'){if(!lyShow(R.la)||lyLock(R.la)){toast('This layer is hidden or locked');R.pc=null;return}const k=TYPEK[R.pen],isHl=k==='hl',w0=isHl?HLW[R.hlSize]:SIZES[R.size];
   const s={id:uid(),k,color:isHl?R.hlCol:R.penCol,w:Math.max(.8,w0/mg.z*1.2),layer:R.la,pts:[mapPad(q)],ls:'solid',sp:0,pr:0,sm:0,t0:performance.now()};if(isHl){s.op=.5;s.beh=true}if(R.rec!=null)s.rec=Math.round((performance.now()-R.rec)/1000);R.pc.s=s;strokes.push(s);redraw()}
  else R.pc.w=true;
  padCx.beginPath();padCx.arc(q.x,q.y,1.2,0,7);padCx.fillStyle=padInk();padCx.fill()};
 padCv.onpointermove=e=>{if(!R.pc||!(e.buttons||e.pressure>0))return;const q=pp(e),l=R.pc.last;
  if(R.pc.er){padErase(l,q);R.pc.last=q;return}
  padCx.strokeStyle=padInk();padCx.lineWidth=2.2;padCx.lineCap='round';padCx.beginPath();padCx.moveTo(l.x,l.y);padCx.lineTo(q.x,q.y);padCx.stroke();
  if(R.pc.s){const m=mapPad(q);R.pc.s.pts.push([m[0],m[1],.5]);redraw()}R.pc.last=q};
 padCv.onpointerup=padCv.onpointercancel=()=>{if(R.pc&&(R.pc.s||R.pc.ch))commit();R.pc=null};
 padEl.onclick=e=>{const b=e.target.closest('[data-p]');if(!b)return;const k=b.dataset.p;
  if(k==='close')closePad();else if(k==='z'){mg.z=+b.dataset.v;buildPad()}
  else if(k==='er'){mg.er=!mg.er;buildPad()}
  else if(k==='space'){mg.bx+=padCv.clientWidth/mg.z*.4;clearPad();placeMagbox()}
  else if(k==='next'){mg.bx=34;mg.by+=32;clearPad();placeMagbox()}
  else if(k==='clear')clearPad();
  else if(k==='conv'){const s=freeSpot();setTool('text',true);const b2=makeBox(newDef({x:s.x,y:s.y,h:esc(DEMOTXT[Math.floor(Math.random()*DEMOTXT.length)])}));select(b2);commit();clearPad();toast('Converted (demo text)')}}}
const padInk=()=>R.pen==='Highlighter'?R.hlCol:(R.penCol==='auto'?css('--ink'):R.penCol);
const clearPad=()=>{if(padCx)padCx.clearRect(0,0,padCv.clientWidth,150)};
const mapPad=q=>[R.mg.bx+q.x/R.mg.z,R.mg.by+q.y/R.mg.z,.5];
function padErase(a,b){const m0=mapPad(a),m1=mapPad(b);if(eraseAt(m1[0],m1[1],m0[0],m0[1])){R.pc.ch=true}}
function placeMagbox(){const mb=$('#magbox'),mg=R.mg,w=padCv.clientWidth/mg.z,h=150/mg.z;mb.style.cssText='left:'+mg.bx+'px;top:'+mg.by+'px;width:'+w+'px;height:'+h+'px'}
(function(){const mb=$('#magbox');let d=null;mb.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();mb.setPointerCapture(e.pointerId);d={x:e.clientX,y:e.clientY,bx:R.mg.bx,by:R.mg.by}});
 mb.addEventListener('pointermove',e=>{if(!d)return;R.mg.bx=Math.max(0,d.bx+e.clientX-d.x);R.mg.by=Math.max(40,d.by+e.clientY-d.y);placeMagbox()});mb.addEventListener('pointerup',()=>{d=null})})();


/* ---------- text data: fonts, sizes, box styles ---------- */
const FONTS=[['Default','inherit'],['Serif','Georgia,serif'],['Sans','Inter,system-ui,sans-serif'],['Dyslexia',"'OpenDyslexic','Comic Sans MS','Atkinson Hyperlegible',sans-serif"],['Literata','Literata,Georgia,serif'],['Source Serif',"'Source Serif 4',Georgia,serif"],['Atkinson',"'Atkinson Hyperlegible',sans-serif"],['Lexend','Lexend,sans-serif'],['Caveat','Caveat,cursive'],['Kalam','Kalam,cursive'],['Patrick',"'Patrick Hand',cursive"],['Shantell',"'Shantell Sans',cursive"]];
const FSIZES=[0.9,1,1.15,1.3,1.5];
const LHS_=[['Default',null],['Tight','.8'],['Loose','1.3']];
const BOXSW=[['None',{bg:null,tc:null,bd:null,bdc:null,sh:null}],['Dark',{bg:'#1d1c23',tc:'#ecebf2'}],['Lime',{bg:'#d9f27a',tc:'#232a0a'}],['Peach',{bg:'#ffd9bf',tc:'#2a1a0e'}],['White',{bg:'#ffffff',tc:'#18171c'}],['Red',{bg:'#ffc9c4',tc:'#3a0f0b'}],['Yellow',{bg:'#f3dc7a',tc:'#2a2410'}],['Blue',{bg:'#cfe2ff',tc:'#0e2240'}],['Slate',{bg:'#3b4252',tc:'#eceff4'}],['Outlined',{bg:null,bd:'1.5px',bdc:'var(--accent)'}]];
const PRESETS=[['plain','Plain',{}],['outline','Outline',{bd:'1.5px',bdc:'var(--ink-soft)',rad:'8px',pad:'12px'}],['soft','Soft card',{bg:'var(--surface-2)',rad:'12px',pad:'14px',sh:'0 1px 3px rgba(0,0,0,.25)'}],['sticky','Sticky note',{bg:'#f3dc7a',tc:'#2a2410',rad:'8px',pad:'12px',sh:'0 6px 14px rgba(0,0,0,.25)'}],['callout','Callout',{bg:'var(--accent-soft)',bd:'1.5px',bdc:'var(--accent)',rad:'8px',pad:'12px'}],['shadow','Shadow card',{bg:'var(--surface-2)',rad:'12px',pad:'14px',sh:'0 8px 24px rgba(0,0,0,.35)'}]];
const MAXMY=8;

/* ---------- the options pill ---------- */
function caret(flag,label,toHost){const b=document.createElement('button');b.className='opt more'+(R[flag]?' open':'');b.innerHTML=svg('chevD');b.setAttribute('aria-label',label);b.setAttribute('aria-expanded',!!R[flag]);b.dataset.tip=label;b.onclick=()=>{R[flag]=!R[flag];renderOpts()};toHost.append(b);return b}
function curBlock(){try{return(document.queryCommandValue('formatBlock')||'').replace(/[<>]/g,'').toLowerCase()}catch(_){return''}}
function blockStyle(tag){fmt('formatBlock',tag)}
function listCmd(k){const t=focusTarget();if(!t){toast('Tap a text box first');return}
 if(k==='tog'){const s=getSelection(),tx=(s.toString()||'Toggle').trim();document.execCommand('insertHTML',false,'<details open><summary>'+esc(tx)+'</summary><div>Hidden details</div></details><div><br></div>');flush();return}
 fmt(k==='num'?'insertOrderedList':'insertUnorderedList');
 const sl=getSelection();let n=sl.anchorNode;n=n&&(n.nodeType===3?n.parentElement:n);const ul=n&&n.closest?n.closest('ul,ol'):null;if(ul){ul.classList.toggle('chk',k==='chk')}flush()}
function wrapSel(tag,cls){const t=focusTarget();if(!t){toast('Tap a text box first');return}const s=getSelection();if(s.isCollapsed&&t.textContent.trim())s.selectAllChildren(t);const tx=s.toString();if(!tx){toast('Select some text first');return}
 document.execCommand('insertHTML',false,'<'+tag+(cls?' class="'+cls+'"':'')+'>'+esc(tx)+'</'+tag+'>');flush()}
function linkSheet(){openSheet('<h3>Link</h3><p class="muted">Make the selected text a link.</p><input class="field" id="lkUrl" maxlength="200" value="https://" autocomplete="off" inputmode="url">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="linkok">Add link</button>')}
function setFsAbs(v){const b=curBox();if(b){b.style.setProperty('--fs',v);resolveOverlap(b);flush();updateBoxBar()}ST.boxDef.fs=String(v);save();renderOpts()}
const alignCmds=[['Left','justifyLeft','alignL'],['Centre','justifyCenter','alignC'],['Right','justifyRight','alignR'],['Justify','justifyFull','alignJ']];

function applyOpts(){const show=R.optsOn&&!R.reading&&!R.tbHidden;opts.classList.toggle('show',show);opts.setAttribute('aria-hidden',!show);placeOpts();renderEcard();renderLcard();renderAcard()}

/* box style helpers (setStyle gets a quiet mode so a slider drag does not rebuild the card) */
function setStyle(patch,whole,quiet){const b=curBox();let v=whole?{...patch}:{...curV()};
 if(!whole)Object.entries(patch).forEach(([k,x])=>{if(x===null||x==='')delete v[k];else v[k]=x});
 if(whole&&curV().ff)v.ff=curV().ff;
 if(b){applyV(b,v);resolveOverlap(b);if(quiet)clearTimeout(ct),ct=setTimeout(commit,500);else flush();updateBoxBar()}
 if(!b||ST.useNew)ST.boxDef.v=v;if(!quiet)save();if(!quiet)renderOpts()}
function savePresetSheet(){if(ST.presets.length>=MAXMY){toast('Up to '+MAXMY+' own presets: delete one first');return}openSheet('<h3>Save as preset</h3><p class="muted">Saves this box style (border, fill, corners, padding).</p><input class="field" id="pName" maxlength="20" value="My style" autocomplete="off">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="savepreset">Save</button>')}

/* ============ the ▾ cards ============ */
const acard=$('#acard');
const chip=(attrs,label,on,ic)=>'<button class="chip'+(on?' on':'')+'" role="radio" aria-checked="'+!!on+'" '+attrs+'>'+(ic?svg(ic):'')+'<span>'+label+'</span></button>';
const abtn=(attrs,label,ic,sm,dis)=>'<button class="abtn'+(dis?' dis':'')+'" '+attrs+(dis?' aria-disabled="true"':'')+'>'+svg(ic)+'<span>'+label+'</span>'+(sm?'<small>'+sm+'</small>':'')+'</button>';
const slr=(id,label,min,max,step,val,fmt0)=>'<div class="slr"><span>'+label+'</span><b id="sv-'+id+'">'+fmt0(val)+'</b><input type="range" data-r="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" aria-label="'+label+'"></div>';
const swr=(attrs,label,on)=>'<button class="srw" role="switch" aria-checked="'+!!on+'" '+attrs+'><span>'+label+'</span><span class="sw2" aria-hidden="true"></span></button>';
const clab=t=>'<div class="clab">'+t+'</div>';
const chead=t=>'<div class="ch"><strong>'+t+'</strong><button class="sq" data-a="close" aria-label="Close">✕</button></div>';
const enote=t=>'<p class="enote">'+t+'</p>';
const SLF={exact:v=>v+' px',sharp:v=>v+'%',press:v=>v+'%',smooth:v=>v+'%',flat:v=>v+'%',hop:v=>v+'%',bw:v=>v+' px',rad:v=>v+' px',padd:v=>v+' px',mgsz:v=>v};
const cdot=c=>c==='auto'?'var(--ink)':c;

function layersHtml(){const Ls=R.layers;let h=clab('Layers');
 for(let i=Ls.length-1;i>=0;i--){const l=Ls[i];h+='<div class="lyrow"><button class="lyd'+(i===R.la?' on':'')+'" data-ly="draw" data-i="'+i+'" role="radio" aria-checked="'+(i===R.la)+'">Draw here</button><span class="lyn">'+esc(l.name)+'</span>'+
  '<button class="sq" data-ly="vis" data-i="'+i+'" aria-label="'+(l.show?'Hide ':'Show ')+esc(l.name)+'">'+svg(l.show?'eye':'eyeOff')+'</button>'+
  '<button class="sq'+(l.lock?' on':'')+'" data-ly="lock" data-i="'+i+'" aria-label="'+(l.lock?'Unlock ':'Lock ')+esc(l.name)+'">'+svg(l.lock?'lock':'unlock')+'</button>'+
  '<button class="sq" data-ly="up" data-i="'+i+'" aria-label="Move '+esc(l.name)+' up"'+(i>=Ls.length-1?' disabled':'')+'>'+svg('up')+'</button>'+
  '<button class="sq" data-ly="down" data-i="'+i+'" aria-label="Move '+esc(l.name)+' down"'+(i<=0?' disabled':'')+'>'+svg('down')+'</button>'+
  '<button class="sq" data-ly="del" data-i="'+i+'" aria-label="Delete '+esc(l.name)+'"'+(Ls.length<2?' disabled':'')+'>'+svg('trash')+'</button></div>'}
 h+='<div class="lyact"><button class="chip" data-ly="add"'+(Ls.length>=2?' disabled':'')+'>'+svg('plus')+'<span>Add layer</span></button><button class="chip" data-ly="merge"'+(Ls.length<2?' disabled':'')+'>'+svg('merge')+'<span>Merge top into second</span></button></div>';
 return h}
function layerClick(e){const b=e.target.closest('[data-ly]');if(!b||b.disabled)return false;const k=b.dataset.ly,i=+b.dataset.i,Ls=R.layers;
 if(k==='draw')R.la=i;
 else if(k==='vis'){Ls[i].show=!Ls[i].show;if(!Ls[i].show)clearLasso()}
 else if(k==='lock')Ls[i].lock=!Ls[i].lock;
 else if(k==='up'||k==='down'){const j=k==='up'?i+1:i-1;if(j<0||j>=Ls.length)return true;[Ls[i],Ls[j]]=[Ls[j],Ls[i]];strokes.forEach(s=>{const l=ly(s);if(l===i)s.layer=j;else if(l===j)s.layer=i});if(R.la===i)R.la=j;else if(R.la===j)R.la=i}
 else if(k==='del'){if(Ls.length<2)return true;strokes=strokes.filter(s=>ly(s)!==i);strokes.forEach(s=>{if(ly(s)>i)s.layer=ly(s)-1});Ls.splice(i,1);R.la=Math.min(R.la,Ls.length-1);toast('Layer deleted. Undo brings it back.')}
 else if(k==='add'){if(Ls.length>=2){toast('Two layers is the most');return true}Ls.push({name:'Layer 2',show:true,lock:false});R.la=1}
 else if(k==='merge'){if(Ls.length<2){toast('Add a second layer first');return true}
  confirmDlg('Merge the top layer into the second?','Everything on the top layer moves onto the layer below. You can undo this.','Merge',()=>{strokes.forEach(s=>s.layer=0);R.layers=[R.layers[0]];R.layers[0].name='Layer 1';R.la=0;redraw();commit();renderOpts();syncLsel()});return true}
 Ls.forEach((l,n)=>l.name='Layer '+(n+1));redraw();commit();renderOpts();syncLsel();return true}
function setPaper(k){PN.paper=k;paper.dataset.paper=k;save()}
function setPsize(k){PN.psize=k;const dims={a4:[794,1123],letter:[816,1056]}[k];paper.classList.toggle('sized',!!dims);paper.style.maxWidth=dims?dims[0]+'px':'';paper.style.height=dims?dims[1]+'px':'';save()}

function drawPreview(){const cv0=$('#prev2');if(!cv0)return;const x=cv0.getContext('2d'),w=300,h=64;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,w,h);
 const isHl=R.pen==='Highlighter',c=pc(),hn=hcf(),k=TYPEK[R.pen],pts=[];
 for(let i=0;i<=60;i++){const t=i/60;pts.push([14+t*(w-28),h/2+Math.sin(t*Math.PI*2.2)*h*.26,.5+.42*Math.sin(t*Math.PI)])}
 const s={k,color:isHl?R.hlCol:R.penCol,w:isHl?HLW[R.hlSize]:(c.exact!=null?c.exact:SIZES[R.size]),pts,ls:c.ls,sp:k==='brush'?Math.max(c.sharp,45):c.sharp,pr:c.pOn?c.press:0,fl:k==='pen'?c.flat:0,op:hn.op/100};
 if(c.shape!=='free'&&c.shape!=='tape'){s.pts=shapePts(c.shape,[24,12],[w-24,h-12],true);s.sh=true;s.closed=['box','oval','triangle'].includes(c.shape);s.fill=c.fill}
 if(c.shape==='tape'){s.k='tape';s.pts=[[24,16],[w-24,h-16]]}
 drawStroke(x,s,css('--ink'))}

function sliderSet(id,v){
 if(id==='exact')PN.exact=v;else if(['sharp','press','smooth','flat'].includes(id))PN[id]=v;else if(id==='hop')HN.op=v;
 else if(id==='bw')setStyle({bd:v?v+'px':null,bdc:v?(curV().bdc||'var(--ink-soft)'):null},false,true);
 else if(id==='rad')setStyle({rad:v+'px'},false,true);else if(id==='padd')setStyle({pad:v+'px'},false,true);
 const l=$('#sv-'+id,acard);if(l)l.textContent=SLF[id](v);if(R.tool==='pen')drawPreview()}
acard.addEventListener('input',e=>{const r=e.target.closest('[data-r]');if(r){sliderSet(r.dataset.r,+r.value);return}if(e.target.id==='custCol')R.custCol=e.target.value});
acard.addEventListener('change',e=>{if(e.target.closest('[data-r]')){save();if(e.target.dataset.r==='exact'||e.target.dataset.r==='sharp')renderOpts()}});
let favT=null;
acard.addEventListener('pointerdown',e=>{const f=e.target.closest('[data-a=fav]');if(!f)return;R.favFired=false;favT=setTimeout(()=>{R.favFired=true;const isHl=R.pen==='Highlighter',arr=isHl?HN.favs:PN.favs,i=+f.dataset.i,gone=arr.splice(i,1)[0];save();renderOpts();toastAct('Favourite removed','Undo',()=>{arr.splice(i,0,gone);save();renderOpts()})},600)});
['pointerup','pointercancel','pointerleave'].forEach(n=>acard.addEventListener(n,()=>clearTimeout(favT)));
function toastAct(msg,label,fn){const t=$('#toast');t.innerHTML=esc(msg)+'<button class="tact">'+esc(label)+'</button>';t.classList.add('show','act');$('.tact',t).onclick=()=>{fn();t.classList.remove('show','act')};clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show','act'),4500)}
acard.addEventListener('click',e=>{if(layerClick(e))return;const b=e.target.closest('[data-a]');if(!b||b.getAttribute('aria-disabled')==='true')return;const k=b.dataset.a,v=b.dataset.v,isHl=R.pen==='Highlighter';
 if(k==='fav'&&R.favFired){R.favFired=false;return}
 const O=b.dataset.o==='hn'?HN:PN;
 if(k==='close')R.acard=false;
 else if(k==='use3')PN.exact=null;
 else if(k==='set'){O[b.dataset.k]=v;if(b.dataset.k==='shape'&&v!=='free'&&R.pen==='Highlighter'){}}
 else if(k==='sw')O[b.dataset.k]=!O[b.dataset.k];
 else if(k==='cust'){if(isHl)R.hlCol=v;else R.penCol=v}
 else if(k==='addcol'){const c=($('#custCol',acard)||{}).value||'#4f8cff',arr=isHl?HN.cust:PN.cust,i=arr.indexOf(c);if(i>=0)arr.splice(i,1);arr.unshift(c);arr.length=Math.min(arr.length,6);if(isHl)R.hlCol=c;else R.penCol=c;R.custCol=c}
 else if(k==='savefav'){const arr=isHl?HN.favs:PN.favs;if(arr.length>=6){toast('Up to 6 favourites: hold one to remove it');return}arr.push({pen:R.pen,col:isHl?R.hlCol:R.penCol,size:isHl?R.hlSize:R.size,exact:PN.exact});toast('Saved as a favourite')}
 else if(k==='fav'){const f=(isHl?HN.favs:PN.favs)[+b.dataset.i];if(f){R.pen=f.pen;if(f.pen==='Highlighter'){R.hlCol=f.col;R.hlSize=f.size}else{R.penCol=f.col;R.size=f.size;PN.exact=f.exact==null?null:f.exact}}}
 else if(k==='hlEraser'){E.hlOnly=true;saveE();setTool('eraser');toast('Eraser limited to highlights')}
 else if(k==='saveNotes'){saveHighlights();return}
 else if(k==='vad'){viewAsDrawn();return}
 else if(k==='paper')setPaper(v);else if(k==='psize')setPsize(v);
 else if(k==='zoom'){toast('Zoom '+v+'% would apply here (demo). Pinch zooms the real page.');return}
 else if(k==='ruler'){toggleRuler();R.acard=true;renderOpts();return}
 else if(k==='magnifier'){togglePad('mag');renderOpts();return}
 else if(k==='ins'){insertAct(v);return}
 else if(tcardClick(k,v,b))return;
 save();renderOpts()});
function saveHighlights(){const t=[...$$('.txt [style*="background"]',paper)].map(el=>el.textContent.trim()).filter(Boolean);
 openSheet('<h3>Save to notes</h3><p class="muted">Copies your highlighted passages to the Highlights page of this notebook.</p>'+(t.length?'<div class="shotbox" style="text-align:left">'+t.map(x=>'<p style="margin:4px 0">“'+esc(x)+'”</p>').join('')+'</div>':'<p class="muted">Nothing highlighted yet. Turn on Snap to text lines and highlight some words.</p>'),'<button class="lay primary" data-act="close">Done</button>')}


/* ============ Text ▾ card ============ */
const KINDS=[['plain','Plain'],['quote','Quote'],['callout','Callout'],['code','Code block']];
const LAYOUTS=[['one','One box'],['two','Two columns'],['nw','Narrow-wide'],['wn','Wide-narrow'],['three','Three columns'],['g22','2×2'],['g23','2×3']];
function tcardClick(k,v,b){const bx=curBox();
 if(k==='fine'){R.fine=!R.fine;renderOpts();return true}
 if(k==='place'){layoutPopup();return true}
 if(k==='font'){setStyle({ff:v==='inherit'?null:v});return true}
 if(k==='fsize'){setFsAbs(+v);return true}
 if(k==='lh'){setStyle({lh:v||null});return true}
 if(k==='kind'){if(!bx){toast('Tap a box first');return true}if(v==='plain')delete bx.dataset.k;else bx.dataset.k=v;flush();renderOpts();return true}
 if(k==='mark'){if(v==='strike')fmt('strikeThrough');else if(v==='code')wrapSel('code');else if(v==='link')linkSheet();else wrapSel('mark','kp');return true}
 if(k==='swatch'){const pv=BOXSW.find(x=>x[0]===v)[1];setStyle(pv);return true}
 if(k==='preset'){setStyle(PRESETS.find(p=>p[0]===v)[2],true);return true}
 if(k==='myuse'){setStyle(ST.presets.find(p=>p.id===v).v,true);return true}
 if(k==='mydel'){ST.presets=ST.presets.filter(p=>p.id!==v);save();renderOpts();return true}
 if(k==='myren'){const p=ST.presets.find(x=>x.id===v);openSheet('<h3>Rename preset</h3><input class="field" id="mpName" maxlength="20" value="'+esc(p.name)+'" autocomplete="off">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="myrenok" data-id="'+v+'">Save</button>');return true}
 if(k==='mysave'){savePresetSheet();return true}
 if(k==='shadow'){setStyle({sh:curV().sh?null:'0 6px 16px rgba(0,0,0,.28)'});return true}
 if(k==='usenew'){ST.useNew=!ST.useNew;if(ST.useNew){ST.boxDef.v={...curV()};const f=bx?bx.style.getPropertyValue('--fs'):'';if(f)ST.boxDef.fs=f}else ST.boxDef={v:{},fs:''};save();renderOpts();toast(ST.useNew?'New boxes will start with this style':'New boxes will start plain');return true}
 if(k==='bd'){setStyle(v?{bd:v,bdc:curV().bdc||'var(--ink-soft)'}:{bd:null,bdc:null});return true}
 if(k==='bdc'){setStyle({bdc:v,bd:curV().bd||'1.5px'});return true}
 if(k==='rad'){setStyle({rad:v});return true}
 if(k==='pad'){setStyle({pad:v});return true}
 if(k==='resetbox'){const bb=curBox();const nv={};if(bb){applyV(bb,nv);bb.style.removeProperty('--fs');delete bb.dataset.k;flush()}ST.boxDef={v:{},fs:''};save();renderOpts();toast('Box style reset');return true}
 if(k==='layout'){applyLayout(v);return true}
 if(k==='assist'){layoutAssist();return true}
 if(k==='equal'){equalise();return true}
 return false}
acard.addEventListener('input',e=>{const el=e.target;if(el.id==='bgc'){setStyle({bg:el.value,tc:null},false,true)}else if(el.id==='bdcc'){setStyle({bdc:el.value,bd:curV().bd||'1.5px'},false,true)}});
acard.addEventListener('change',e=>{if(e.target.id==='bgc'||e.target.id==='bdcc'){save();renderOpts()}});
function applyLayout(kind){const b=curBox();if(!b){toast('Tap a box first');return}
 const spec={one:[[1],1],two:[[1,1],1],nw:[[1,2],1],wn:[[2,1],1],three:[[1,1,1],1],g22:[[1,1],2],g23:[[1,1,1],2]}[kind],cols=spec[0],rows=spec[1],gap=12,pw=paper.clientWidth-68,sum=cols.reduce((a,c)=>a+c,0),unit=(pw-gap*(cols.length-1))/sum;
 const y0=b.offsetTop,rh=Math.max(b.offsetHeight,48)+gap;let n=0;
 for(let r=0;r<rows;r++){let x=34;cols.forEach((c,ci)=>{const w=unit*c;let cell;if(n===0)cell=b;else{cell=makeBox(newDef({x,y:y0+r*rh,h:'Box '+(n+1)}))}
  cell.style.width=Math.round(w)+'px';setBoxPos(cell,Math.round(x),y0+r*rh);x+=w+gap;n++})}
 resolveOverlap(b);flush();updateBoxBar();toast(kind==='one'?'One box':n+' boxes in a grid')}
function layoutAssist(){const bs=$$('.box',paper).sort((a,b)=>a.offsetTop-b.offsetTop);if(!bs.length)return;let y=48;bs.forEach(b=>{b.style.transition='top 150ms';setBoxPos(b,34,y);y+=b.offsetHeight+16});flush();toast('Layout Assist tidied the boxes')}
function equalise(){const b=curBox();if(!b){toast('Tap a box first');return}const row=$$('.box',paper).filter(o=>Math.abs(o.offsetTop-b.offsetTop)<14).sort((a,c)=>a.offsetLeft-c.offsetLeft);if(row.length<2){toast('Only one box in this row');return}
 const gap=12,pw=paper.clientWidth-68,w=(pw-gap*(row.length-1))/row.length;row.forEach((o,i)=>{o.style.width=Math.round(w)+'px';setBoxPos(o,Math.round(34+i*(w+gap)),o.offsetTop)});flush();toast('Columns made equal')}

/* ============ Insert ============ */
function insertAct(k){
 if(k==='pic')return pictureSheet();
 if(k==='table'||k==='box'||k==='link'||k==='callout'||k==='file'||k==='divider')return addInsert(k);
 if(k==='recall')return recallSheet();
 if(k==='camera'){toast('The camera would open here (demo)');return addInsert('pic')}
 if(k==='writepad'){togglePad('write');return renderOpts()}
 if(k==='handwriting')return handwritingSheet();
 if(k==='audio'){toggleRec();return renderOpts()}
 if(k==='shape'||k==='tape'){PN.shape=k==='tape'?'tape':(PN.shape==='free'||PN.shape==='tape'?'box':PN.shape);save();setTool('pen');R.ctab.pen='shapes';R.acard=true;renderOpts();toast(k==='tape'?'Pen draws Tape now: drag a strip over what you want to hide':'Pen draws shapes now: pick the shape in Draw as');return}
 if(k==='ruler'){setTool('pen');R.ctab.pen='shapes';toggleRuler(true);return}
 if(k==='magnifier'){openPad('mag');return renderOpts()}
 if(k==='pagelink'){addInsert('pagelink');return}
 if(k==='database'){addInsert('database');return}
 if(k==='mindmap'){addInsert('mindmap');return}
 if(k==='summary'){addInsert('summary');return}
 if(k==='instemplate'){toast('Pick a template to insert (demo)');return}
 if(k==='savetemplate'){toast('This page would be saved as a template (demo)');return}
 if(k==='tohome'){toast('Would jump to Home (demo)');return}}
function addInsert(kind){const s=freeSpot();let b;setTool('text',true);
 if(kind==='pic')b=makeBox({t:'pic',x:s.x,y:s.y,w:'200px',size:'body',st:'none',h:'<div class="pic">'+svg('img')+'</div>'});
 else if(kind==='file')b=makeBox({t:'file',x:s.x,y:s.y,w:'260px',size:'body',st:'none',h:'<div class="pic file">'+svg('file')+'<span>Study-notes.pdf</span></div>'});
 else if(kind==='divider')b=makeBox({t:'divider',x:s.x,y:s.y,w:'320px',size:'body',st:'none',h:'<hr style="border:0;border-top:1.5px solid var(--line-strong);margin:14px 0">'});
 else if(kind==='table'||kind==='database'){let h='<table><tbody>';for(let r=0;r<3;r++){h+='<tr>';for(let c=0;c<3;c++)h+='<td contenteditable="true">'+(kind==='database'&&r===0?['Name','Tag','Done'][c]:'')+'</td>';h+='</tr>'}b=makeBox({t:'table',x:s.x,y:s.y,size:'body',st:'none',h:h+'</tbody></table>'})}
 else if(kind==='link')b=makeBox(newDef({x:s.x,y:s.y,h:'<u style="color:'+css('--accent')+'">https://example.com</u>'}));
 else if(kind==='pagelink')b=makeBox(newDef({x:s.x,y:s.y,h:'<u style="color:'+css('--accent')+'">↗ Linked page</u>'}));
 else if(kind==='callout')b=makeBox(newDef({x:s.x,y:s.y,k:'callout',h:'Callout'}));
 else if(kind==='mindmap')b=makeBox(newDef({x:s.x,y:s.y,k:'callout',h:'Central idea<br>├ Branch one<br>└ Branch two'}));
 else if(kind==='summary')b=makeBox(newDef({x:s.x,y:s.y,size:'head',h:'Summary'}));
 else b=makeBox(newDef({x:s.x,y:s.y}));
 select(b);const e=firstEdit(b);if(e)e.focus();commit();toast(({link:'Link added (dummy)',pagelink:'Page link added (demo)',database:'Database added (demo)',mindmap:'Mind map added (demo)',summary:'Summary added (demo)'})[kind]||'Added');afterAction()}
function pictureSheet(){openSheet('<h3>Add a picture</h3><p class="muted">Choose where it comes from.</p><div class="prev">'+[['photos','Photos','img'],['files','Files','ftext'],['camera','Camera','camera'],['paste','Paste','clipboard']].map(([k,n,ic])=>'<button class="mini" data-act="picsrc" data-k="'+k+'"><div class="mb a"></div><strong>'+n+'</strong></button>').join('')+'</div>','<button class="lay" data-act="close">Cancel</button>')}
function recallSheet(){let tx='';try{tx=getSelection().toString().trim()}catch(_){}if(!tx&&R.last&&R.last.range)tx=R.last.range.toString().trim();if(!tx){const b=curBox();tx=b?b.querySelector('.txt').textContent.trim().slice(0,120):''}
 openSheet('<h3>New recall card</h3><p class="muted">A card from your selection. Front is the question, back is the answer.</p><label class="muted" for="rcF" style="display:block;margin-top:8px">Front</label><input class="field" id="rcF" maxlength="120" value="'+esc(tx)+'" autocomplete="off"><label class="muted" for="rcB" style="display:block;margin-top:8px">Back</label><input class="field" id="rcB" maxlength="200" autocomplete="off" placeholder="The answer">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="recallok">Make card</button>')}
function handwritingSheet(){openSheet('<h3>Handwriting</h3><p class="muted">Three ways to turn writing into text.</p><div class="prev">'+[['pad','Write pad','Write in a pad'],['convert','Convert ink','Loop ink with the Lasso'],['scribble','Scribble','Write anywhere with the Pencil']].map(([k,n,d])=>'<button class="mini" data-act="hw" data-k="'+k+'"><div class="mb a"></div><strong>'+n+'</strong><span>'+d+'</span></button>').join('')+'</div>','<button class="lay" data-act="close">Cancel</button>')}
function toggleRec(){const b=$('#recBtn');if(R.rec==null){R.rec=performance.now();b.hidden=false;R.recT=setInterval(updRec,500);updRec();toast('Recording. Ink you write is tied to the sound.')}else{clearInterval(R.recT);const sec=Math.round((performance.now()-R.rec)/1000);R.rec=null;b.hidden=true;toast('Recording saved ('+sec+' s, demo)')}}
function updRec(){const b=$('#recBtn'),s=Math.floor((performance.now()-R.rec)/1000);b.innerHTML='● '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+' · Stop'}
$('#recBtn').onclick=toggleRec;

/* ============ Lasso selection menus (Professional) ============ */
const mvBoxes=()=>!isPro()||L.ids.size===0;
function selKind(){const ink=L.ids.size>0,bx=L.boxes.length>0;if(ink&&bx)return'mixed';if(ink)return'ink';return L.boxes.every(b=>b.dataset.t==='pic')?'pic':'text'}
const selHasRec=()=>strokes.some(s=>L.ids.has(s.id)&&s.rec!=null);
function lmClick(e){const el=e.target.closest('[data-m]');if(!el)return;const m=el.dataset.m,S=R.lm||(R.lm={});
 if(el.getAttribute('aria-disabled')==='true'){toast('Coming later');return}
 const hasInk=L.ids.size>0,needInk=()=>{if(!hasInk){toast('Needs handwriting in the selection');return true}return false};
 if(m==='labelform')return;
 if(m==='desel'){clearLasso();return}
 if(m==='more'){S.more=!S.more}
 else if(m==='copy'){lcopy();toast('Copied')}
 else if(m==='cut')return lassoAct('cut');
 else if(m==='duplicate')return lassoAct('dup');
 else if(m==='delete')return lassoAct('del');
 else if(m==='paste')return lassoAct('paste');
 else if(m==='convert'){if(!hasInk)return convertBoxes();return lassoAct('conv')}
 else if(m==='shot')return lassoAct('shot');
 else if(m==='copyPng')return lassoAct('copyPng');
 else if(m==='savePng')return lassoAct('savePng');
 else if(m==='makeCard')return lassoAct('card');
 else if(m==='summary'){if(hasInk&&!selLabel()){toast('Name this drawing first, then add it to the Summary');S.label=true;S.more=true;syncLsel();return}return lassoAct('sum')}
 else if(m==='saveNotes'){const t=L.boxes.map(b=>b.querySelector('.txt').textContent.trim()).filter(Boolean);openSheet('<h3>Saved to notes</h3><p class="muted">Copied to the Highlights page of this notebook.</p><div class="shotbox" style="text-align:left">'+(t.length?t.map(x=>'<p style="margin:4px 0">“'+esc(x)+'”</p>').join(''):'<p class="muted">(a picture)</p>')+'</div>','<button class="lay primary" data-act="close">Done</button>');return}
 else if(m==='keypoint'){L.boxes.forEach(b=>{const t=b.querySelector('.txt');if(b.dataset.t==='text'&&!t.querySelector('mark.kp'))t.innerHTML='<mark class="kp">'+t.innerHTML+'</mark>'});commit();toast('Key point added');return}
 else if(m==='play'){const r=strokes.filter(s=>L.ids.has(s.id)&&s.rec!=null).map(s=>s.rec);toast('Playing the recording from 0:'+String(Math.min(...r)).padStart(2,'0')+' (demo)');return}
 else if(m==='colour'){S.col=!S.col;S.thick=false;S.label=false}
 else if(m==='thickness'){if(needInk())return;S.thick=!S.thick;S.col=false;S.label=false}
 else if(m==='label'){if(needInk())return;S.label=!S.label;S.col=false;S.thick=false}
 else if(m==='move'){S.move=!S.move;S.scale=S.rot=false}
 else if(m==='scale'){S.scale=!S.scale;S.move=S.rot=false}
 else if(m==='rotate'){S.rot=!S.rot;S.move=S.scale=false}
 else if(m==='nudge'){const p=el.dataset.p,dx=p==='l'?-16:p==='r'?16:0,dy=p==='u'?-16:p==='d'?16:0;L.boxes.forEach(b=>setBoxPos(b,Math.max(0,b.offsetLeft+dx),Math.max(40,b.offsetTop+dy)));L.boxes.forEach(resolveOverlap);calcBBox();commit();syncLsel();return}
 else if(m==='bscale'){const f=+el.dataset.p;L.boxes.forEach(b=>{b.style.width=Math.max(60,b.offsetWidth*f)+'px';b.style.setProperty('--fs',Math.max(.4,Math.min(4,(parseFloat(b.style.getPropertyValue('--fs'))||1)*f)));setBoxPos(b,b.offsetLeft,b.offsetTop);resolveOverlap(b)});calcBBox();commit();syncLsel();return}
 else if(m==='brot'){const a=+el.dataset.p;L.boxes.forEach(b=>{const n=a===0?0:(+b.dataset.rot||0)+a;b.dataset.rot=n;b.style.transform=n?'rotate('+n+'deg)':''});commit();syncLsel();return}
 else if(m==='resize'){S.size=!S.size;S.edit=false}
 else if(m==='editpic'){S.edit=!S.edit;S.size=false}
 else if(m==='pedit'){toast(el.dataset.p+' would open in the picture editor (demo)');return}
 else if(m==='psz'){const p=el.dataset.p,pw=paper.clientWidth-68;L.boxes.forEach(b=>{const w=b.offsetWidth;b.style.width=Math.round(p==='smaller'?w*.8:p==='bigger'?w*1.25:p==='orig'?200:pw)+'px';if(p==='fitw'||p==='fitpage')setBoxPos(b,34,b.offsetTop);resolveOverlap(b)});calcBBox();commit();syncLsel();return}
 else if(m==='col'){S.col=false;lassoAct('col',el.dataset.c);syncLsel();return}
 else if(m==='thk'){S.thick=false;lassoAct('thick',+el.dataset.px);return}
 syncLsel();if(S.label){const f=$('#lbName',lm2);if(f)f.focus()}}
function convertBoxes(){const pics=L.boxes.filter(b=>b.dataset.t==='pic');if(!pics.length){toast('That is already text');return}
 openSheet('<h3>Convert to text<span class="badge2">Demo</span></h3><p class="muted">Reads the writing in the picture. The text below is a stand-in; the real reader comes later.</p><input class="field" id="cvTxt" maxlength="120" value="'+esc(DEMOTXT[0])+'" autocomplete="off">','<button class="lay" data-act="close">Cancel</button><button class="lay primary" data-act="convpic">Replace picture with text</button>')}
function saveSelNotes(){const t=[];try{const s=getSelection();if(s.rangeCount&&!s.isCollapsed)t.push(s.toString().trim());else if(R.last&&R.last.range&&!R.last.range.collapsed)t.push(R.last.range.toString().trim())}catch(_){}
 L.boxes.forEach(b=>t.push(b.querySelector('.txt').textContent.trim()));const x=t.filter(Boolean);
 openSheet('<h3>Saved to notes</h3><p class="muted">Copied to the Highlights page of this notebook.</p><div class="shotbox" style="text-align:left">'+(x.length?x.map(s=>'<p style="margin:4px 0">“'+esc(s)+'”</p>').join(''):'<p class="muted">Select some text first.</p>')+'</div>','<button class="lay primary" data-act="close">Done</button>')}
function arrangeSheet(){const row=ST.lasso.row;
 openSheet('<h3>Arrange the menu</h3><p class="muted">Order of the actions in the selection menu row.</p>'+row.map((a,i)=>'<div class="srow"><div class="t"><b>'+ROWNAME[a]+'</b></div><button class="sq" data-act="arr" data-d="-1" data-i="'+i+'" aria-label="Move '+ROWNAME[a]+' up"'+(i===0?' disabled':'')+'>↑</button><button class="sq" data-act="arr" data-d="1" data-i="'+i+'" aria-label="Move '+ROWNAME[a]+' down"'+(i===row.length-1?' disabled':'')+'>↓</button></div>').join('')+(row.length?'':'<p class="muted">No actions in the row. Turn some on in the Lasso card.</p>'),null,arrangeSheet)}

/* ============ selection bar: mini toolbar (selection) and micro bar (caret) ============ */
$('#selbar').insertAdjacentHTML('beforeend',selExtra());const SELBAR0=$('#selbar').innerHTML;
function proSel(c,b,e){
 const items=(arr,f)=>arr.map(([t,v])=>({t,f:()=>f(v)}));
 if(c==='grip')return true;
 if(c==='mic'){dictate();return true}
 if(c==='colour'){openMenu(items(PENCOL,v=>fmt('foreColor',v==='auto'?css('--ink'):v)),b);return true}
 if(c==='size'){openMenu(items(FSIZES.map(z=>[Math.round(z*100)+'%',z]),setFsAbs),b);return true}
 if(c==='style'){openMenu(items([['Title','h1'],['Heading 1','h2'],['Heading 2','h3'],['Heading 3','h4'],['Body','div']],blockStyle),b);return true}
 if(c==='align'){openMenu(items(alignCmds.map(a=>[a[0],a[1]]),cmd=>fmt(cmd)),b);return true}
 if(c==='list'){openMenu(items([['Bullets','bul'],['Numbers','num'],['Checklist','chk'],['Toggle','tog']],listCmd),b);return true}
 if(c==='link'){linkSheet();return true}
 if(c==='cut'){focusTarget();try{document.execCommand('cut')}catch(_){}flush();hideSel();return true}
 if(c==='pin'){R.selPin=!R.selPin;b.classList.toggle('on',R.selPin);toast(R.selPin?'Bar stays where it is':'Bar follows the text again');return true}
 if(c==='desel'){R.selPin=false;selbar.hidden=true;const a=document.activeElement;if(a&&a.blur)a.blur();getSelection().removeAllRanges();return true}
 if(c==='more'){openMenu([{t:'Paste',f:()=>{focusTarget();try{navigator.clipboard.readText().then(t=>{document.execCommand('insertText',false,t);flush()},()=>toast('Paste is blocked here: use Cmd/Ctrl+V'))}catch(_){toast('Paste is blocked here: use Cmd/Ctrl+V')}}},{t:'Make card',f:()=>recallSheet()},{t:'Add to Summary',f:()=>toast('Added to the Summary (demo)')},{t:'Key point',f:()=>wrapSel('mark','kp')},{t:'Save to notes',f:()=>saveSelNotes()}],b);return true}
 return false}
(function(){let d=null;selbar.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-c=grip]');if(!g||!isPro())return;e.preventDefault();g.setPointerCapture(e.pointerId);const r=selbar.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top};R.selPin=true});
 selbar.addEventListener('pointermove',e=>{if(!d)return;selbar.style.left=Math.max(4,Math.min(e.clientX-d.dx,innerWidth-selbar.offsetWidth-4))+'px';selbar.style.top=Math.max(4,e.clientY-d.dy)+'px'});
 selbar.addEventListener('pointerup',()=>{d=null})})();

/* ============ hold menu (hold still 1.5 s under Text), keyboard bar, mini keys strip ============ */
function holdStart(e){if(!isPro()||R.tool!=='text'||e.button>0)return;holdEnd();R.hm={x:e.clientX,y:e.clientY,t:setTimeout(()=>{const x=R.hm.x,y=R.hm.y;R.swallow=performance.now();R.menuAt=performance.now();
  const anchor={getBoundingClientRect:()=>({left:x,right:x,top:y,bottom:y,width:0,height:0})};
  openMenu([{t:'Paste',f:()=>{focusTarget();try{navigator.clipboard.readText().then(t=>{document.execCommand('insertText',false,t);flush()},()=>toast('Paste is blocked here: use Cmd/Ctrl+V'))}catch(_){toast('Paste is blocked here: use Cmd/Ctrl+V')}}},{t:'Select',f:()=>{const t=focusTarget();if(t){const s=getSelection();s.modify('move','backward','word');s.modify('extend','forward','word')}else toast('Tap a text box first')}},{t:'Select all',f:()=>{const t=focusTarget();if(t)getSelection().selectAllChildren(t);else toast('Tap a text box first')}},{t:'Cut',f:()=>{focusTarget();try{document.execCommand('cut')}catch(_){}flush()}},{t:'Copy',f:()=>{focusTarget();try{document.execCommand('copy')}catch(_){}toast('Copied')}},{h:'Insert'},{t:'Picture',f:()=>pictureSheet()},{t:'Line',f:()=>addInsert('divider')}],anchor)},1500)}}
function holdMove(e){if(R.hm&&Math.hypot(e.clientX-R.hm.x,e.clientY-R.hm.y)>8)holdEnd()}
function holdEnd(){if(R.hm){clearTimeout(R.hm.t);R.hm=null}}
paper.addEventListener('pointerleave',holdEnd);
const kbbar=$('#kbbar');
(function(){const ib=(c,ic,l)=>'<button class="opt" data-k="'+c+'" aria-label="'+l+'" data-tip="'+l+'">'+svg(ic)+'</button>';
 kbbar.innerHTML=ib('outdent','outdent','Outdent')+ib('indent','indent','Indent')+ib('bul','list','Bullets')+ib('num','olist','Numbers')+ib('chk','checks','Checklist')+ib('align','alignL','Align (cycles)')+ib('u','underline','Underline')+ib('strike','strike','Strike')+ib('hide','kboff','Hide keyboard')+minHtml('kb','opt');
 let ai=0;kbbar.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k;
  if(k==='outdent'||k==='indent'){focusTarget();document.execCommand(k);flush()}
  else if(k==='bul'||k==='num'||k==='chk')listCmd(k);
  else if(k==='align'){ai=(ai+1)%4;fmt(alignCmds[ai][1]);toast('Align '+alignCmds[ai][0])}
  else if(k==='u')fmt('underline');else if(k==='strike')fmt('strikeThrough');
  else if(k==='hide'){R.kbOpen=false;const a=document.activeElement;if(a&&a.blur)a.blur();updateStates()}})})();
function updKbBar(){const on=isPro()&&R.tool==='text'&&!R.reading&&!R.tbHidden&&(R.kbOpen||(!ST.kbHidden&&!!edRoot(document.activeElement)));kbbar.hidden=!on;
 if(on&&window.visualViewport){const vv=visualViewport;kbbar.style.bottom=Math.max(0,innerHeight-vv.height-vv.offsetTop)+'px'}}
if(window.visualViewport){visualViewport.addEventListener('resize',updKbBar);visualViewport.addEventListener('scroll',updKbBar)}
document.addEventListener('focusin',()=>setTimeout(updKbBar,0));document.addEventListener('focusout',()=>setTimeout(updKbBar,0));
const strip=$('#strip');
(function(){strip.innerHTML='<button class="opt grip" data-s="grip" aria-label="Move the keys">'+svg('move')+'</button><button class="opt" data-s="speak" aria-label="Speak to type">'+svg('mic')+'<span>Speak</span></button><button class="opt" data-s="enter" aria-label="Enter">'+svg('newline')+'</button><button class="opt" data-s="back" aria-label="Backspace">'+svg('back')+'</button>'+minHtml('keys','opt');
 hold($('[data-s=back]',strip),doBack,doBackWord);
 strip.addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;if(b.dataset.s==='speak')dictate();else if(b.dataset.s==='enter')doNewline()});
 let d=null;strip.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-s=grip]');if(!g)return;e.preventDefault();g.setPointerCapture(e.pointerId);const r=strip.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top};strip.style.transition='none'});
 strip.addEventListener('pointermove',e=>{if(!d)return;strip.style.right='auto';strip.style.bottom='auto';strip.style.left=(e.clientX-d.dx)+'px';strip.style.top=(e.clientY-d.dy)+'px'});
 strip.addEventListener('pointerup',()=>{if(!d)return;d=null;strip.style.transition='';const r=strip.getBoundingClientRect(),m=12,dl=r.left,dr=innerWidth-r.right,db=innerHeight-r.bottom,mn=Math.min(dl,dr,db);
  if(mn===db)strip.style.top=(innerHeight-r.height-m)+'px';else if(mn===dl)strip.style.left=m+'px';else strip.style.left=(innerWidth-r.width-m)+'px';
  strip.style.left=Math.max(m,Math.min(parseFloat(strip.style.left),innerWidth-r.width-m))+'px'})})();
function toggleStrip(){strip.hidden=!strip.hidden;updateStates()}
function doBackWord(){const t=focusTarget();if(!t)return;const s=getSelection();s.modify('extend','backward','word');document.execCommand('delete')}
function hold(el,fn,wfn){let t,iv,t0=0;const stop=()=>{clearTimeout(t);clearInterval(iv)};
 el.addEventListener('pointerdown',e=>{if(e.button)return;e.preventDefault();fn();stop();t0=performance.now();t=setTimeout(()=>{iv=setInterval(()=>{if(wfn&&isPro()&&performance.now()-t0>1500)wfn();else fn()},70)},380)});
 ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,stop));el.addEventListener('click',e=>{if(e.detail===0)fn()})}
function nlExtras(b){let t,fired=false,last=0;
 const menu0=()=>openMenu([{h:'Add a special line'},{t:'Heading',f:()=>{doNewline();blockStyle('h2')}},{t:'Checklist',f:()=>{doNewline();listCmd('chk')}},{t:'Divider',f:()=>{focusTarget();document.execCommand('insertHorizontalRule');flush()}}],b);
 b.addEventListener('pointerdown',()=>{fired=false;if(!isPro()||DEV.nlTrig!=='hold')return;t=setTimeout(()=>{fired=true;menu0()},DEV.nlMs)});
 ['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,()=>clearTimeout(t)));
 b.addEventListener('click',e=>{if(fired){e.stopImmediatePropagation();e.preventDefault();fired=false;return}
  if(isPro()&&DEV.nlTrig==='dbl'){const n=performance.now();if(n-last<320){last=0;e.stopImmediatePropagation();menu0();return}last=n}},true)}
function toggleStripFor(){}

/* ============ Reader (Professional) ============ */
const rbar=$('#rbar'),lfocus=$('#lfocus');
const RB=[['aa','Aa','Reading look','type2'],['full','Full reader','Full reader','fit'],['lf','Line focus','Line focus','focus'],['aloud','Read aloud','Read aloud','volume'],['toc','Contents','Contents','list'],['blanks','Hide blanks','Hide blanks','eyeOff'],['find','Find','Find','search'],['lock','Lock to reading','Lock to reading','lock'],['exit','Exit','Exit reading','xmark']];
function refreshReader(){const on=R.reading&&isPro();rbar.hidden=!on;if(!on){lfocus.hidden=true;R.lf=false;try{speechSynthesis.cancel()}catch(_){}R.aloud=false;return}
 rbar.innerHTML=RB.map(([k,n,l,ic])=>'<button class="opt'+((k==='lf'&&R.lf)||(k==='aloud'&&R.aloud)||(k==='blanks'&&paper.classList.contains('hideblank'))||(k==='lock'&&R.rlock)?' on':'')+((k==='exit'&&R.rlock)?' dis':'')+'" data-r="'+k+'" aria-label="'+l+'" data-tip="'+l+'">'+svg(k==='lock'&&!R.rlock?'unlock':ic)+'<span>'+n+'</span></button>').join('');
 lfocus.hidden=!R.lf}
rbar.addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(!b)return;const k=b.dataset.r;
 if(k==='exit'){if(R.rlock){toast('Unlock first (Lock to reading)');return}toggleReading(false);return}
 if(k==='lock'){R.rlock=!R.rlock;toast(R.rlock?'Locked: taps cannot leave reading':'Unlocked')}
 else if(k==='lf')R.lf=!R.lf;
 else if(k==='blanks')paper.classList.toggle('hideblank');
 else if(k==='full')toast('The full-screen reader would open here (demo)');
 else if(k==='aloud'){R.aloud=!R.aloud;try{speechSynthesis.cancel();if(R.aloud){const u=new SpeechSynthesisUtterance($$('.txt',paper).map(x=>x.textContent).join('. '));u.onend=()=>{R.aloud=false;refreshReader()};speechSynthesis.speak(u)}}catch(_){toast('Read aloud is not available here');R.aloud=false}}
 else if(k==='toc'){const hs=$$('.box',paper).filter(b=>b.dataset.size==='head'||b.querySelector('h1,h2,h3'));openMenu([{h:'Contents'},...(hs.length?hs:$$('.box',paper)).slice(0,8).map(b=>({t:b.textContent.trim().slice(0,32)||'Box',f:()=>{b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),300);b.scrollIntoView({block:'center',behavior:'smooth'})}}))],b);return}
 else if(k==='find'){openSheet('<h3>Find</h3><input class="field" id="fdQ" maxlength="60" placeholder="Find in this page" autocomplete="off">','<button class="lay" data-act="close">Close</button><button class="lay primary" data-act="findgo">Find next</button>');return}
 else if(k==='aa'){readSheet();return}
 refreshReader()});
document.addEventListener('pointermove',e=>{if(R.lf)lfocus.style.setProperty('--fy',e.clientY+'px')});
function readSheet(){const th=document.documentElement.dataset.theme||'auto';
 openSheet('<h3>Reading look</h3>'+
 '<div class="clab" style="padding:8px 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Font</div><div class="prev">'+FONTS.map(([n,x])=>'<button class="mini" style="width:auto;min-width:88px" data-act="rfont" data-v="'+esc(x)+'"><strong style="font-family:'+x.replace(/"/g,"'")+'">Aa</strong><span>'+n+'</span></button>').join('')+'</div>'+
 '<div class="srow"><div class="t"><b>Layout</b><span class="muted">Spacing, margin, width, flow</span></div></div>'+
 '<label class="muted" for="rsp">Spacing</label><input id="rsp" type="range" min="0.8" max="1.6" step="0.1" value="'+(R.rsp||1)+'" style="width:100%;accent-color:var(--accent);min-height:36px">'+
 '<label class="muted" for="rmg">Margin</label><input id="rmg" type="range" min="0" max="120" step="10" value="'+(R.rmg||0)+'" style="width:100%;accent-color:var(--accent);min-height:36px">'+
 '<label class="muted" for="rwd">Width</label><input id="rwd" type="range" min="480" max="1060" step="20" value="'+(R.rwd||1060)+'" style="width:100%;accent-color:var(--accent);min-height:36px">'+
 '<div class="prev">'+[['scroll','Scroll'],['pages','Pages (demo)']].map(([k,n])=>'<button class="mini'+((R.flow||'scroll')===k?' on':'')+'" style="width:auto" data-act="rflow" data-v="'+k+'"><strong>'+n+'</strong><span>Flow</span></button>').join('')+'</div>'+
 '<div class="srow"><div class="t"><b>Themes</b></div></div><div class="prev">'+[['light','Day'],['sepia','Sepia'],['dark','Night']].map(([k,n])=>'<button class="mini'+(th===k?' on':'')+'" style="width:auto" data-act="rtheme" data-v="'+k+'"><strong>'+n+'</strong></button>').join('')+'</div>'+
 '<div class="srow"><div class="t"><b>More</b><span class="muted">Reading ruler is Line focus. Hide blanks is on the bar.</span></div><button class="lay" data-act="rall">All settings</button></div>',null,readSheet)}
sheet.addEventListener('input',e=>{const id=e.target.id;if(id==='rsp'){R.rsp=+e.target.value;paper.style.setProperty('--lhm',R.rsp);$$('.box',paper).forEach(b=>b.style.setProperty('--lh',R.rsp))}else if(id==='rmg'){R.rmg=+e.target.value;paper.style.paddingInline=R.rmg+'px'}else if(id==='rwd'){R.rwd=+e.target.value;$('.wrap').style.maxWidth=R.rwd+'px'}});

/* ============ settings: pencil and finger, new-line extras ============ */
document.addEventListener('pointerdown',e=>{R.lastPtr=e.pointerType},true);
$('#bars').addEventListener('click',e=>{if(DEV.fingerBars&&R.lastPtr==='pen'){e.stopPropagation();e.preventDefault()}},true);

/* ============ sheet extras ============ */
function sheetExtra(act,d,a){
 if(act==='linkok'){const u=($('#lkUrl').value||'').trim();closeSheet();if(u){fmt('createLink',u)}return true}
 if(act==='myrenok'){const p=ST.presets.find(x=>x.id===d.id);if(p)p.name=($('#mpName').value.trim()||p.name).slice(0,20);save();closeSheet();renderOpts();return true}
 if(act==='convpic'){const tx=($('#cvTxt').value.trim()||DEMOTXT[0]).slice(0,120);closeSheet();L.boxes.filter(b=>b.dataset.t==='pic').forEach(b=>{const x=b.offsetLeft,y=b.offsetTop;b.remove();makeBox(newDef({x,y,h:esc(tx)}))});clearLasso(true);commit();toast('Converted (demo)');return true}
 if(act==='picsrc'){closeSheet();if(d.k==='camera')toast('The camera would open here (demo)');else if(d.k==='paste')toast('Pasted a picture (demo)');addInsert('pic');return true}
 if(act==='recallok'){const f=$('#rcF').value.trim();closeSheet();toast(f?'Card made: “'+f.slice(0,28)+'” (demo)':'Card made (demo)');return true}
 if(act==='hw'){closeSheet();if(d.k==='pad'){togglePad('write');renderOpts()}else if(d.k==='convert'){setTool('lasso');toast('Loop your handwriting, then tap Convert to text')}else{DEV.scribbleTxt=true;save();toast('Scribble is on (demo): write with the Pencil in a text box')}return true}
 if(act==='arr'){const i=+d.i,j=i+(+d.d),r=ST.lasso.row;if(j>=0&&j<r.length){[r[i],r[j]]=[r[j],r[i]]}save();syncLsel();rerender();return true}
 if(act==='dsw'){DEV[d.k]=!DEV[d.k];save();rerender();return true}
 if(act==='dopt'){DEV[d.k]=isNaN(+d.v)?d.v:+d.v;save();rerender();return true}
 if(act==='findgo'){const q=($('#fdQ').value||'').trim();closeSheet();if(q&&!window.find(q))toast('Not found');return true}
 if(act==='rfont'){$$('.box',paper).forEach(b=>b.style.setProperty('--ff',d.v));return true}
 if(act==='rflow'){R.flow=d.v;rerender();if(d.v==='pages')toast('Pages flow is a demo');return true}
 if(act==='rtheme'){document.documentElement.dataset.theme=d.v;rerender();redraw();return true}
 if(act==='rall'){settingsSheet();return true}
 return false}

/* ============ the "What's in Professional" note ============ */
/* ============ boot hooks ============ */
function v2Boot(){
 paper.dataset.paper=PN.paper;if(PN.psize!=='fit')setPsize(PN.psize);
 (function(){const el=$('#ruler');el.innerHTML='<span class="tk"></span><span class="lab"></span><button class="rm" aria-label="Move the ruler">'+svg('move')+'</button><button class="rt" aria-label="Turn the ruler (snaps every 15 degrees)">'+svg('rotcw')+'</button><button class="rx" aria-label="Hide the ruler">'+svg('xmark')+'</button>';
  const drag=(btn,fn)=>btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();btn.setPointerCapture(e.pointerId);const mv=ev=>fn(pt(ev)),up=()=>{btn.removeEventListener('pointermove',mv);btn.removeEventListener('pointerup',up)};btn.addEventListener('pointermove',mv);btn.addEventListener('pointerup',up)});
  drag($('.rm',el),p=>{R.rl.x=p.x;R.rl.y=p.y;placeRuler()});
  drag($('.rt',el),p=>{let a=Math.atan2(p.y-R.rl.y,p.x-R.rl.x);const st=Math.PI/12;R.rl.a=Math.round(a/st)*st;placeRuler()});
  $('.rx',el).addEventListener('click',e=>{e.stopPropagation();toggleRuler(false)})})();
}

/* ---------- v3: names people know ---------- */
const PNAME={Fountain:'Pen',Ball:'Ballpoint'},pname=n=>PNAME[n]||n;
I.toglist='<path d="m3 10 2.5-2.5L3 5"/><path d="m3 19 2.5-2.5L3 14"/><path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h11"/>';
const TSTYLES=[['Title','h1'],['Heading 1','h2'],['Heading 2','h3'],['Heading 3','h4'],['Body','div']];

/* ---------- the options pill (Beginner as in v2; Professional = essentials + one caret) ---------- */
/* ============ v3: one card for every tool ============
   Header (name + close), then section tabs when the card has more than one page, then one pane.
   Sections always run in the same order: the main job, the look, the feel, extras, the page. */
R.ctab={pen:'stroke',text:'text',lasso:'select'};
const CTABS={pen:[['stroke','Stroke'],['colour','Colour'],['feel','Feel'],['shapes','Shapes & aids'],['page','Layers & paper']],
 text:[['text','Text'],['box','Box'],['layout','Layout']],
 lasso:[['select','Select'],['menu','Menu'],['layers','Layers']]};
const cheadX=(t,attr)=>'<div class="ch"><strong>'+t+'</strong><button class="sq" '+attr+' aria-label="Close">✕</button></div>';
const ctabs=t=>'<div class="ctabs" role="tablist" aria-label="Sections">'+CTABS[t].map(([k,n])=>'<button class="ctab'+(R.ctab[t]===k?' on':'')+'" role="tab" aria-selected="'+(R.ctab[t]===k)+'" data-tab="'+k+'">'+n+'</button>').join('')+'</div>';
const cpane=h=>'<div class="cpane'+(R.tabIn?' in':'')+'" role="tabpanel">'+h+'</div>';
function fillCard(el,html){const p0=$('.cpane',el),t0=$('.ctabs',el),keep=p0&&!R.tabIn?p0.scrollTop:0,kt=t0?t0.scrollLeft:0;el.innerHTML=html;
 const p=$('.cpane',el),tb2=$('.ctabs',el);if(p)p.scrollTop=keep;
 if(tb2){tb2.scrollLeft=kt;const on=$('.ctab.on',tb2);if(on&&(on.offsetLeft<tb2.scrollLeft+8||on.offsetLeft+on.offsetWidth>tb2.scrollLeft+tb2.clientWidth-8))tb2.scrollLeft=Math.max(0,on.offsetLeft-32)}}
$('#bars').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(!t||!CTABS[R.tool])return;R.ctab[R.tool]=t.dataset.tab;if(R.tool==='text'&&t.dataset.tab==='box')ensureBox();R.tabIn=true;renderOpts();R.tabIn=false});
const tile=(v,l,ic,on)=>'<button class="tile'+(on?' on':'')+'" data-a="ins" data-v="'+v+'" aria-label="'+l+'"'+(on?' aria-pressed="true"':'')+'>'+svg(ic)+'<span>'+l+'</span></button>';
const group=(label,cls,inner)=>'<div class="chips'+(cls?' '+cls:'')+'" role="radiogroup" aria-label="'+label+'">'+inner+'</div>';

/* ---- Eraser ▾ : Mode · Size · Behaviour (one page) ---- */
function renderEcard(){const on=R.ecard&&R.tool==='eraser'&&isPro()&&R.optsOn&&!R.reading&&!R.tbHidden;
 ecard.classList.toggle('show',!!on);ecard.setAttribute('aria-hidden',!on);if(!on)return;
 const ic={precise:'crosshair',standard:'eraser',stroke:'penLine'};
 fillCard(ecard,cheadX('Eraser','data-e="close"')+cpane(
  clab('Mode')+group('Eraser mode','',Object.keys(ECOPY).map(m=>chip('data-e="mode" data-v="'+m+'"',ECOPY[m][0],E.mode===m,ic[m])).join(''))+enote(ECOPY[E.mode][1])+
  clab('Size')+group('Eraser size','',ESIZE.map((n,i)=>chip('data-e="size" data-v="'+i+'"',n,E.size===i)).join(''))+
  clab('Behaviour')+swr('data-e="hl"','Erase highlights only',E.hlOnly)+swr('data-e="ret"','Go back to the previous tool after one erase',E.ret)+
  enote('Rubbing in the Magnifier pad also erases on the page.')));
 placeCard(ecard)}

/* ---- Lasso ▾ : Select · Menu · Layers ---- */
function renderLcard(){const on=R.lcard&&R.tool==='lasso'&&isPro()&&R.optsOn&&!R.reading&&!R.tbHidden;
 lcard.classList.toggle('show',!!on);lcard.setAttribute('aria-hidden',!on);if(!on)return;
 const tab=R.ctab.lasso;let h='';
 if(tab==='select')h=clab('Shape')+group('Lasso shape','two',LSHAPE.map(([k,ic,n])=>chip('data-l="shape" data-v="'+k+'"',n,ST.lasso.shape===k,ic)).join(''))+
  clab('What it picks')+LFILT.map(([k,ic,n])=>swr('data-l="f" data-v="'+k+'"',n,ST.lasso[k])).join('')+
  enote('After you select, a menu appears by the selection. Drag inside the box to move; the dots resize and the turn dot rotates.');
 else if(tab==='menu')h=clab('Actions in the menu row')+ROWACT.map(a=>swr('data-l="row" data-v="'+a+'"',ROWNAME[a],ST.lasso.row.includes(a))).join('')+
  enote('Actions you switch off stay one tap away, under More.')+abtn('data-l="arrange"','Arrange the menu…','sliders');
 else h=layersHtml()+enote('The same layers as in Pen. A hidden or locked layer cannot be selected.');
 fillCard(lcard,cheadX('Lasso','data-l="close"')+ctabs('lasso')+cpane(h));
 placeCard(lcard)}

/* ============ Lasso selection menu (Professional): icons in the row, names under More ============ */
function renderLmenu(){const S=R.lm||(R.lm={}),n=selCount(),b=L.bbox,kind=selKind(),row=ST.lasso.row,more=ROWACT.filter(a=>!row.includes(a));
 const IC={copy:'copy',cut:'scissors',duplicate:'dup',convert:'typeic',colour:'palette',delete:'trash',thickness:'sliders',makeCard:'stack',summary:'anchor',label:'pencil'};
 const pr=on=>on===undefined?'':' aria-pressed="'+!!on+'"';
 const B=(id,ic,label,on)=>'<button type="button" class="mb2" data-m="'+id+'" aria-label="'+label+'" data-tip="'+label+'"'+pr(on)+'>'+svg(ic)+'</button>';
 const N=(id,ic,label,on,short)=>'<button type="button" class="mb2 lab" data-m="'+id+'" aria-label="'+label+'"'+pr(on)+'>'+svg(ic)+'<span>'+(short||label)+'</span></button>';
 const st=a=>a==='colour'?S.col:a==='thickness'?S.thick:a==='label'?S.label:undefined;
 const A=a=>B(a,IC[a],ROWNAME[a],st(a)),AN=a=>N(a,IC[a],ROWNAME[a],st(a));
 const mh=t=>'<div class="mh">'+t+'</div>';
 const shot=N('shot','scan','Screenshot of the selection',undefined,'Screenshot');
 let h='<div class="lrow"><span class="cnt">'+n+' selected</span>'+B('desel','xmark','Deselect');
 if(kind==='ink'){h+=row.map(A).join('')+B('more','more','More',S.more)+'</div>';
  if(S.more){const extra=more.map(AN).join('')+(R.clip?N('paste','clipboard','Paste'):'')+(selHasRec()?N('play','play','Play the recording from here',undefined,'Play the recording'):'');
   h+='<div class="more2">'+(extra?mh('More actions')+extra:'')+mh('As a picture')+shot+N('copyPng','img','Copy as picture')+N('savePng','fdown','Save as picture')+'</div>'}}
 else if(kind==='mixed'){h+=B('copy','copy','Copy')+B('cut','scissors','Cut')+B('delete','trash','Delete')+B('shot','scan','Screenshot of the selection')+B('makeCard','stack','Make card')+'</div>'}
 else if(kind==='text'){h+=B('copy','copy','Copy')+B('cut','scissors','Cut')+B('duplicate','dup','Duplicate')+B('delete','trash','Delete')+B('colour','palette','Colour',S.col)+B('more','more','More',S.more)+'</div>';
  if(S.more)h+='<div class="more2">'+mh('Study')+N('keypoint','tag','Key point')+N('makeCard','stack','Make card')+N('summary','anchor','Add to Summary')+N('saveNotes','fdown','Save to notes')+
   mh('Arrange')+N('move','move','Move',S.move)+N('scale','fit','Scale',S.scale)+N('rotate','rotcw','Rotate',S.rot)+
   mh('Other')+shot+N('convert','typeic','Convert to text')+'</div>';
  if(S.move)h+='<div class="picstrip">'+[['l','← Left'],['u','↑ Up'],['d','↓ Down'],['r','→ Right']].map(([k,nm])=>'<button type="button" class="thk" data-m="nudge" data-p="'+k+'">'+nm+'</button>').join('')+'</div>';
  if(S.scale)h+='<div class="picstrip">'+[['.8','Smaller'],['1.25','Bigger']].map(([k,nm])=>'<button type="button" class="thk" data-m="bscale" data-p="'+k+'">'+nm+'</button>').join('')+'</div>';
  if(S.rot)h+='<div class="picstrip">'+[['-15','Turn left 15°'],['15','Turn right 15°'],['0','Straighten']].map(([k,nm])=>'<button type="button" class="thk" data-m="brot" data-p="'+k+'">'+nm+'</button>').join('')+'</div>'}
 else{h+=B('copy','copy','Copy')+B('cut','scissors','Cut')+B('duplicate','dup','Duplicate')+B('delete','trash','Delete')+B('resize','fit','Resize',S.size)+B('editpic','wand','Edit picture',S.edit)+'</div>';
  if(S.size)h+='<div class="picstrip">'+[['smaller','Smaller'],['bigger','Bigger'],['fitw','Fit width'],['orig','Original'],['fitpage','Fit to page']].map(([k,nm])=>'<button type="button" class="thk" data-m="psz" data-p="'+k+'">'+nm+'</button>').join('')+'</div>';
  if(S.edit)h+='<div class="picstrip">'+['Crop','Turn','Straighten','Shapes'].map(nm=>'<button type="button" class="thk" data-m="pedit" data-p="'+nm+'">'+nm+'</button>').join('')+'</div>'}
 if(S.label&&kind==='ink')h+='<form class="sub2" data-m="labelform"><input class="field" id="lbName" maxlength="80" autocomplete="off" aria-label="Drawing name" placeholder="Name it, so Search finds it" value="'+esc(selLabel())+'"><button class="lay primary" type="submit">Save name</button></form>';
 if(S.thick&&kind==='ink')h+='<div class="sub2">'+[['Thin',1.5],['Medium',3],['Thick',6]].map(([nm,px])=>'<button type="button" class="thk" data-m="thk" data-px="'+px+'"><i style="height:'+Math.max(2,px)+'px"></i>'+nm+'</button>').join('')+'</div>';
 if(S.col)h+='<div class="sub2">'+LCOL.map(c=>'<button type="button" class="swc" data-m="col" data-c="'+c+'" aria-label="Colour '+(c==='auto'?'automatic':c)+'" style="background:'+(c==='auto'?'var(--ink)':c)+'"></button>').join('')+'</div>';
 const keep=document.activeElement&&document.activeElement.id==='lbName'?document.activeElement.value:null;
 lm2.innerHTML=h;{const lr=$('.lrow',lm2);if(lr)lr.insertAdjacentHTML('beforeend',minHtml('lsel','mb2'))}if(keep!==null){const f=$('#lbName',lm2);if(f){f.value=keep;f.focus()}}
 const mw=lm2.offsetWidth,mh2=lm2.offsetHeight,W=paper.clientWidth,Hh=paper.clientHeight;
 lm2.style.left=Math.max(4,Math.min(b.x0+(b.x1-b.x0)/2-mw/2,W-mw-4))+'px';
 let t=b.y0-mh2-(b.y0>=44?52:12);if(t<4)t=Math.min(b.y1+(b.y0>=44?20:64),Hh-mh2-4);lm2.style.top=Math.max(4,t)+'px'}

/* ============ settings: grouped under plain headings ============ */
function devRows(){if(!isPro())return'';
 const row=(t,d,a)=>'<div class="srow"><div class="t"><b>'+t+'</b><span class="muted">'+d+'</span></div>'+a+'</div>';
 const ds=k=>'<button class="switch'+(DEV[k]?' on':'')+'" role="switch" aria-checked="'+!!DEV[k]+'" data-act="dsw" data-k="'+k+'"></button>';
 const chips=(k,arr)=>'<div class="seg">'+arr.map(([v,n])=>'<button class="'+(String(DEV[k])===String(v)?'on':'')+'" data-act="dopt" data-k="'+k+'" data-v="'+v+'">'+n+'</button>').join('')+'</div>';
 const sh=t=>'<div class="shead">'+t+'</div>';
 return sh('Pencil and finger')+row('Pencil picks the Pen','A Pencil touch on a tool bar selects the Pen. Demo: no Pencil here.',ds('pencilPicks'))+
  row('Tool bar: finger only','The tool bars ignore Pencil taps. Works with a real Pencil.',ds('fingerBars'))+
  row('Pencil writes text (Scribble)','Handwriting in a text box turns into type. Demo.',ds('scribbleTxt'))+
  row('Pencil can scroll','The Pencil drags the page instead of drawing. Demo.',ds('pencilScroll'))+
  row('Pencil hold time','How long you hold before a Pencil action.',chips('holdMs',[[1000,'1.0 s'],[1500,'1.5 s'],[2000,'2.0 s']]))+
  sh('New line')+row('New line extras','Heading, Checklist and Divider on New line.',chips('nlTrig',[['hold','Hold'],['dbl','Double-tap'],['off','Off']]))+
  row('New line hold time','Only for Hold.',chips('nlMs',[[400,'0.4 s'],[600,'0.6 s'],[800,'0.8 s'],[1000,'1.0 s']]))+sh('Toolbar')}

/* ============ the Professional map (collapsible, for review) ============ */
const tabNames=t=>CTABS[t].map(x=>x[1]);
const PMAP=[
 ['Pen','pen','Pen type (Pen, Ballpoint, Brush, Pencil, Marker, Highlighter) · Colour · Size',[
  ['One page','All five sections sit on one scrolling page; the tabs jump. On the pill: tap the chosen size again for Exact thickness, the chosen colour again (or +) for Custom colours; favourites join the end of the pill.'],
  ['Stroke','Exact thickness, Use the 3 sizes, Line style. Highlighter: Opacity, Snap to text lines, Draw behind ink, Highlight eraser, Save to notes.'],
  ['Colour','Custom colours, Favourites.'],
  ['Feel','Tip sharpness, Flatness (Pen), Stabilisation · Pressure, Tilt, Thickness by speed, Reduce latency · Finger can draw · Scribble to erase, Circle to lasso.'],
  ['Shapes and aids','Not here: they live only in All tools > Shapes & aids. While a shape is chosen, a chip on the pill takes you back to freehand.'],
  ['Layers & paper','Layers (draw here, show, lock, order, add, merge) · Paper style and size · Zoom, View as drawn. With two layers, a layer chip on the pill jumps here.']]],
 ['Eraser','eraser','Mode · Size · Highlights only',[
  ['Mode','Precise, Standard, Whole stroke.'],['Size','Thin, Medium, Thick.'],['Behaviour','Erase highlights only, Go back to the previous tool after one erase.']]],
 ['Lasso','lasso','Shape · What it picks',[
  ['Select','Free-hand or Rectangle · picks Ink, Pictures, Text.'],
  ['Menu','Which actions sit in the selection menu row, Arrange the menu.'],
  ['Layers','The same Layers panel as Pen (a shortcut).']]],
 ['Selection menu','scan','Shows only after a Lasso selection. Row = your chosen actions; More = the rest, with names.',[
  ['Handwriting','Copy, Cut, Duplicate, Convert to text, Colour, Delete, Thickness, Make card, Add to Summary, Name this drawing, Paste, Play the recording · As a picture: Screenshot, Copy as picture, Save as picture.'],
  ['Text box','Copy, Cut, Duplicate, Delete, Colour · Study: Key point, Make card, Add to Summary, Save to notes · Arrange: Move, Scale, Rotate · Screenshot, Convert to text.'],
  ['Picture','Copy, Cut, Duplicate, Delete · Resize (Smaller, Bigger, Fit width, Original, Fit to page) · Edit picture (Crop, Turn, Straighten, Shapes).'],
  ['Mixed','Copy, Cut, Delete, Screenshot, Make card.']]],
 ['Text','text','Box style (shows the current style) · Width ▾ · Layout · Aa',[
  ['Aa row','Text style, Bold, Italic, Underline, Text colour, Highlight colour, Bullets, Numbers, Checklist, Toggle list, Align.'],
  ['Text','Font, Size, Line height, Block type (Plain, Quote, Callout, Code block), More marks (Strikethrough, Code, Link, Key point).'],
  ['Box','Live preview · Look (Plain, Outline, Soft card, Sticky note, Callout, Shadow card) · Fill · Border (width, colour) · Corners · Padding · Shadow · Fine-tune (exact colours and sizes) · My presets · Use for new boxes (switch), Reset. Opens from Box style on the pill or Style on the box bar.'],
  ['Layout','Columns (One box to 2×3), Equalise columns · Layout Assist · Width and position.']]],
 ['Insert','insert','Table · Picture · Callout · Recall card · Text box · Link',[
  ['Media and handwriting','Camera, File or PDF, Audio, Write pad, Handwriting.'],
  ['Page','Divider, Page link, Database, Mind map, Summary, Insert template, Save as template, To Home.']]],
 ['While you type','kb','These appear by themselves, in context.',[
  ['Box bar','Style (with a preview of the current style), Duplicate, Cut, Copy, Delete, More. On a selected box.'],
  ['Mini toolbar','On selected text: Colour, Size, Style, Bold, Italic, Align, List, Highlight, Link, Dictate, Cut, Copy, Delete, More, move, pin.'],
  ['Micro bar','At the caret: the short version.'],
  ['Keyboard bar','Outdent, Indent, lists, Align, Underline, Strike, Hide keyboard.'],
  ['Hold menu','Hold still 1.5 s: Paste, Select, Select all, Cut, Copy, Insert.']]],
 ['Main bar and More','more','Undo, Redo · tools · Back to last tool · New line, Backspace, Keyboard, Mic · Search',[
  ['New line','Hold or double-tap for Heading, Checklist, Divider.'],
  ['Mic','Mini keys: Speak to type, Enter, Backspace.'],
  ['Reading','Reader bar: Reading look, Full reader, Line focus, Read aloud, Contents, Hide blanks, Find, Lock.'],
  ['Settings','Layout · Keyboard · Pencil and finger · New line · Toolbar.'],
  ['All tools row','Only what the bars above do not offer. Text: every text option (box style, layout, font, headings, lists, style, paragraph, blocks) · Pen: every pen option · Insert: Camera, Divider, File, Audio clip · Shapes & aids (the only home): Draw as, Shape help, Ruler, Magnifier, Colour picker · View · Study · File.'],
  ['Every bar','Ends in › to minimise it to a chip at the right edge. The options pill drags by its grip and snaps to an edge.']]]];
function refreshNote(){const n=$('#pmap'),p=isPro();n.hidden=!p;if(!p||n.dataset.built)return;n.dataset.built='1';
 $('#pmapBody').innerHTML='<p class="pmr"><b>One pattern for every tool.</b> The pill holds the everyday options. The ▾ at its end opens one card. A card’s sections always run in the same order: the main job, the look, the feel, extras, the page. Menus for a selection show only once something is selected.</p><div class="pmg">'+
  PMAP.map(([name,ic,pill,secs])=>'<section class="pmc"><h4>'+svg(ic)+name+'</h4><p class="pl"><b>'+(CTABS[ic]||['pen','eraser','insert'].includes(ic)?'Pill: ':'')+'</b>'+pill+'</p><dl>'+secs.map(([s,d])=>'<dt>'+s+'</dt><dd>'+d+'</dd>').join('')+'</dl></section>').join('')+'</div>'}

/* ============ v4: pill in its own gap, drag + snap, minimise on every bar, dictation, box bar ============ */
I.grip='<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>';
ST.min=ST.min||{};if(ST.useNew===undefined)ST.useNew=false;if(ST.pill===undefined)ST.pill=null;

/* ---- box style: one name and one preview, used by the pill, the box bar and the card ---- */
function styleName(v){const p=PRESETS.find(x=>sameV(x[2],v));if(p)return p[1];const m=ST.presets.find(x=>sameV(x.v,v));return m?m.name:'Custom'}
function prevCss(v){v=v||{};const bd=v.bd&&parseFloat(v.bd)>0?'border:'+Math.min(2.5,parseFloat(v.bd))+'px solid '+(v.bdc||'var(--ink-soft)'):(v.bg?'border:1px solid transparent':'border:1px dashed var(--line-strong)');
 const r=v.rad==null?6:parseFloat(v.rad)||0;
 return bd+';background:'+(v.bg||'transparent')+';color:'+(v.tc||'var(--ink)')+';border-radius:'+Math.min(10,Math.round(r*.7))+'px'+(v.sh?';box-shadow:0 2px 6px rgba(0,0,0,.3)':'')}
const bprev=v=>'<i class="bprev" style="'+prevCss(v)+'">Aa</i>';
/* a style change must be seen on a box: pick the newest text box when none is selected */
function ensureBox(){if(curBox())return curBox();const b=$$('.box',paper).filter(x=>x.dataset.t==='text').pop();if(b)select(b);return b||null}
function openBoxStyle(){if(R.tool!=='text')setTool('text');ensureBox();R.optsOn=true;if(ST.min.opts)setMin('opts',false);
 if(isPro()){R.ctab.text='box';R.acard=true;R.tabIn=true;renderOpts();R.tabIn=false}else renderOpts()}
function openPenAt(tab){R.ctab.pen=tab;R.acard=true;R.tabIn=true;renderOpts();R.tabIn=false}

/* ---- minimise: every bar folds into a chevron chip at the right edge of the page; remembered ---- */
function minHtml(key){return'<i class="sep minsep" aria-hidden="true"></i><button type="button" class="minb" data-min="'+key+'" aria-label="Minimise" data-tip="Tuck this bar away">'+svg('minim')+'</button>'}
const MINS={
 opts:{on:()=>opts.classList.contains('show'),label:()=>TOOLS[R.tool][0]+' options',ic:()=>R.tool,sh:()=>TOOLS[R.tool][0]},
 box:{on:()=>!boxbar.hidden,label:()=>'Box bar',ic:()=>'square',sh:()=>'Box'},
 sel:{on:()=>!selbar.hidden,label:()=>'Text bar',ic:()=>'typeic',sh:()=>'Text bar'},
 lsel:{on:()=>isPro()&&$('#lsel').classList.contains('on'),label:()=>'Selection menu',ic:()=>'scan',sh:()=>'Selection'},
 keys:{on:()=>!$('#strip').hidden,label:()=>'Mini keys',ic:()=>'mic',sh:()=>'Keys'},
 kb:{on:()=>!$('#kbbar').hidden,label:()=>'Keyboard bar',ic:()=>'kb',sh:()=>'Keyboard'}};
function syncMin(){const dock=$('#mindock');if(!dock)return;let h='';
 Object.keys(MINS).forEach(k=>{const m=!!ST.min[k];document.body.classList.toggle('mz-'+k,m);
  if(m&&MINS[k].on()){const l='Show '+MINS[k].label().toLowerCase();h+='<button type="button" class="mchip" data-min="'+k+'" aria-label="'+l+'" data-tip="'+l+'"><svg class="c" viewBox="0 0 24 24" aria-hidden="true">'+I.chevL+'</svg>'+svg(MINS[k].ic())+'<span>'+MINS[k].sh()+'</span></button>'}});
 if(dock.dataset.h!==h){dock.dataset.h=h;dock.innerHTML=h}
 const hr=$('#bars').getBoundingClientRect(),pr=paper.getBoundingClientRect();dock.style.top=Math.round(pr.top-hr.top+10)+'px'}
function setMin(key,on){ST.min[key]=!!on;save();
 if(key==='opts'){if(on){R.acard=false;R.ecard=false;R.lcard=false}applyOpts()}
 syncMin();
 if(on&&!ST.minTip){ST.minTip=1;save();toast('Minimised. Tap the chip at the right edge to bring it back')}}
(function(){const d=document.createElement('div');d.id='mindock';d.className='nofocus';$('#bars').append(d);
 document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.minb,.mchip');if(!b)return;e.preventDefault();e.stopPropagation();setMin(b.dataset.min,b.classList.contains('minb'))},true);
 document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('.minb,.mchip');if(b)e.preventDefault()},true);
 if(typeof MutationObserver!=='undefined'){const mo=new MutationObserver(()=>syncMin());[opts,boxbar,selbar,$('#lsel'),$('#strip'),$('#kbbar')].forEach(el=>el&&mo.observe(el,{attributes:true,attributeFilter:['class','hidden']}))}})();
function toolPress(t){if(R.tool===t){if(ST.min.opts&&R.optsOn){setMin('opts',false);return}R.optsOn=!R.optsOn;applyOpts();return}setTool(t)}

/* ---- where the pill sits: an edge of the page and how far along it (the real app's pillPlace) ---- */
const pillEdge=()=>(ST.pill&&ST.pill.edge)||'top';
function pillRoom(){const hr=$('#bars').getBoundingClientRect(),pr=paper.getBoundingClientRect(),bb=$('#barbox').getBoundingClientRect();
 return{hr,hw:hr.width,x0:pr.left-hr.left,x1:pr.right-hr.left,yg:bb.bottom-hr.top+4,y0:pr.top-hr.top,y1:pr.bottom-hr.top}}
function placeOpts(){const host=$('#bars');if(!host)return;const edge=pillEdge(),v=edge==='left'||edge==='right';
 host.classList.toggle('gap',edge==='top');
 if(R.pdrag)return;
 opts.classList.toggle('vert',v);opts.dataset.edge=edge;
 const rm=pillRoom(),mh=Math.round((rm.y1-rm.y0)*.6);opts.style.maxHeight=v?mh+'px':'';opts.style.setProperty('--pmax',mh+'px');
 $$('.bs2',opts).forEach(h=>h._m&&h._m());
 const w=opts.offsetWidth,h=opts.offsetHeight,al=ST.pill?ST.pill.along:.5,m=8;let x,y;
 if(v){x=edge==='left'?rm.x0+m:rm.x1-w-m;y=rm.y0+m+Math.max(0,rm.y1-rm.y0-2*m-h)*al}
 else{if(ST.pill)x=rm.x0+m+Math.max(0,rm.x1-rm.x0-2*m-w)*al;
  else{const b=!R.reading?$('.tools .ic[data-id="'+R.tool+'"]',tb):null;let cx=rm.hw/2;if(b){const r=b.getBoundingClientRect(),sr=b.closest('.tools').getBoundingClientRect();cx=Math.max(sr.left,Math.min(r.left+r.width/2,sr.right))-rm.hr.left}x=cx-w/2}
  y=edge==='top'?rm.yg:rm.y1-h-m}
 x=Math.max(8,Math.min(x,rm.hw-w-8));R.opL=x;R.opT=y;opts.style.left=Math.round(x)+'px';opts.style.top=Math.round(y)+'px';
 placeCard(ecard);placeCard(lcard);placeCard(acard);syncMin()}
/* the card sits next to its pill: under a top pill, over a bottom pill, beside a side pill. In Text > Box it steps aside so the box stays in view. */
function placeCard(el){if(!el.classList.contains('show'))return;const rm=pillRoom(),edge=pillEdge(),w=el.offsetWidth,pl=R.opL||0,pt=R.opT||0,pw=opts.offsetWidth,ph=opts.offsetHeight,g=6;let x,y,h=el.offsetHeight;
 if(edge==='top'){x=pl+pw/2-w/2;y=pt+ph+g}
 else if(edge==='bottom'){const pane=$('.cpane',el),over=h-(pt-g-rm.yg);if(pane&&over>0){pane.style.maxHeight=Math.max(120,pane.offsetHeight-over)+'px';h=el.offsetHeight}x=pl+pw/2-w/2;y=Math.max(rm.yg,pt-h-g)}
 else{x=edge==='left'?pl+pw+g:pl-w-g;y=Math.max(rm.yg,Math.min(pt,rm.y1-h-8))}
 x=Math.max(8,Math.min(x,rm.hw-w-8));
 const b=el===acard&&R.tool==='text'&&R.ctab.text==='box'?curBox():null;
 if(b&&edge!=='left'&&edge!=='right'){const bx0=rm.x0+b.offsetLeft-8,bx1=rm.x0+b.offsetLeft+b.offsetWidth+8,by0=rm.y0+b.offsetTop-48,by1=rm.y0+b.offsetTop+b.offsetHeight+8;
  if(x<bx1&&x+w>bx0&&y<by1&&y+h>by0){if(bx1+8+w<=rm.hw-8)x=bx1+8;else if(bx0-8-w>=8)x=bx0-8-w;else x=rm.hw-w-8}}
 el.style.left=Math.round(x)+'px';el.style.top=Math.round(y)+'px'}

/* ---- drag the pill by its grip; it snaps to the nearest edge (top gap, left, right, bottom) ---- */
(function(){let d=null;const host=$('#bars'),zones=document.createElement('div');zones.id='pzones';zones.hidden=true;zones.innerHTML=['top','left','right','bottom'].map(e=>'<i data-e="'+e+'"></i>').join('');host.append(zones);
 const box=()=>{const rm=pillRoom();return{rm,l:rm.x0,t:rm.yg,w:rm.x1-rm.x0,h:rm.y1-rm.yg}};
 /* the finger decides: the edge nearest the pointer (a wide pill is always near both sides, so its own sides cannot) */
 const nearest=(e,b)=>{const px=Math.max(b.l,Math.min(e.clientX-b.rm.hr.left,b.l+b.w)),py=Math.max(b.t,Math.min(e.clientY-b.rm.hr.top,b.t+b.h)),ds={top:py-b.t,bottom:b.t+b.h-py,left:px-b.l,right:b.l+b.w-px};/* a standing pill is tall: on a tie its own kind of edge wins */return(opts.classList.contains('vert')?['left','right','top','bottom']:['top','bottom','left','right']).reduce((a,e)=>ds[e]<ds[a]?e:a)};
 const layZones=b=>{const T=56,z={top:[b.l,b.t,b.w,T],bottom:[b.l,b.t+b.h-T,b.w,T],left:[b.l,b.rm.y0,T,b.rm.y1-b.rm.y0],right:[b.l+b.w-T,b.rm.y0,T,b.rm.y1-b.rm.y0]};
  $$('i',zones).forEach(i=>{const q=z[i.dataset.e];i.style.cssText='left:'+q[0]+'px;top:'+q[1]+'px;width:'+q[2]+'px;height:'+q[3]+'px'})};
 const hot=e=>$$('i',zones).forEach(i=>i.classList.toggle('hot',i.dataset.e===e));
 const at=e=>{const b=box(),w=opts.offsetWidth,h=opts.offsetHeight;return{b,w,h,x:Math.max(b.l,Math.min(e.clientX-b.rm.hr.left-d.dx,b.l+b.w-w)),y:Math.max(b.t,Math.min(e.clientY-b.rm.hr.top-d.dy,b.t+b.h-h))}};
 opts.addEventListener('pointerdown',e=>{const g=e.target.closest('.pgrip');if(!g||e.button>0)return;e.preventDefault();try{g.setPointerCapture(e.pointerId)}catch(_){}
  const r=opts.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top,sx:e.clientX,sy:e.clientY,moved:false}});
 opts.addEventListener('pointermove',e=>{if(!d)return;
  if(!d.moved){if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<5)return;d.moved=true;R.acard=false;R.ecard=false;R.lcard=false;renderEcard();renderLcard();renderAcard();closeMenu();R.pdrag=true;opts.classList.add('drag');layZones(box());zones.hidden=false}
  const p=at(e);opts.style.left=Math.round(p.x)+'px';opts.style.top=Math.round(p.y)+'px';hot(nearest(e,p.b))});
 const end=e=>{if(!d)return;const was=d;if(!was.moved){d=null;return}const p=at(e);d=null;
  const edge=nearest(e,p.b),v=edge==='left'||edge==='right',m=8,rm=p.b.rm;
  const along=v?(p.y-rm.y0-m)/Math.max(1,rm.y1-rm.y0-2*m-p.h):(p.x-rm.x0-m)/Math.max(1,rm.x1-rm.x0-2*m-p.w);
  ST.pill={edge,along:Math.max(0,Math.min(1,along))};save();R.pdrag=false;zones.hidden=true;opts.classList.remove('drag');opts.classList.add('snap');
  renderOpts();setTimeout(()=>opts.classList.remove('snap'),280);
  toast(edge==='top'?'Options sit above the page':'Options snapped to the '+edge+' edge. Double-tap the grip to put them back')};
 opts.addEventListener('pointerup',end);opts.addEventListener('pointercancel',end);
 opts.addEventListener('dblclick',e=>{if(!e.target.closest('.pgrip'))return;ST.pill=null;save();opts.classList.add('snap');renderOpts();setTimeout(()=>opts.classList.remove('snap'),280);toast('Options are back above the page')});
 opts.addEventListener('keydown',e=>{if(!e.target.closest('.pgrip'))return;const k=e.key;if(k==='Home'){e.preventDefault();ST.pill=null}
  else if(/^Arrow/.test(k)){e.preventDefault();const p=ST.pill||{edge:'top',along:.5},v=p.edge==='left'||p.edge==='right',st=.1,c=n=>Math.max(0,Math.min(1,n));
   if(v&&k==='ArrowUp')p.along=c(p.along-st);else if(v&&k==='ArrowDown')p.along=c(p.along+st);else if(!v&&k==='ArrowLeft')p.along=c(p.along-st);else if(!v&&k==='ArrowRight')p.along=c(p.along+st);
   else p.edge={ArrowUp:'top',ArrowDown:'bottom',ArrowLeft:'left',ArrowRight:'right'}[k];ST.pill={edge:p.edge,along:p.along}}
  else return;save();opts.classList.add('snap');renderOpts();setTimeout(()=>opts.classList.remove('snap'),280);const g=$('.pgrip',opts);if(g)g.focus()})})();

/* ---- dictation (T8): the browser's speech recognition where it exists, a short demo where it does not ---- */
function dictMark(on){$$('[data-c=mic],[data-s=speak]').forEach(b=>b.classList.toggle('rec',on))}
function dictEnd(){R.dict=null;dictMark(false)}
function dictate(){if(R.dict){try{R.dict.stop()}catch(_){}dictEnd();toast('Dictation stopped');return}
 if(!focusTarget()){toast('Tap a text box first');return}
 const put=tx=>{if(!focusTarget())return;const s=getSelection();if(s.rangeCount&&!s.isCollapsed)s.collapseToEnd();document.execCommand('insertText',false,tx);flush()};
 const demo=()=>{toast('Listening… (demo: this browser has no dictation)');const t=setTimeout(()=>{put('This sentence was dictated. ');dictEnd();toast('Dictation added')},1300);R.dict={stop(){clearTimeout(t)}};dictMark(true)};
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){demo();return}
 let got=false,failed=false;
 try{const rec=new SR();rec.lang=navigator.language||'en-US';rec.interimResults=false;rec.continuous=false;
  rec.onresult=e=>{const tx=[...e.results].map(r=>r[0].transcript).join(' ').trim();if(tx){got=true;put(tx+' ')}};
  rec.onerror=e=>{failed=true;const er=e&&e.error;if(er==='not-allowed'){dictEnd();toast('The microphone is blocked. Allow it in the browser to dictate')}else if(er==='aborted'||er==='no-speech'){dictEnd();if(er==='no-speech')toast('Heard nothing. Tap the mic and speak')}else{dictEnd();demo()}};
  rec.onend=()=>{if(R.dict===rec){dictEnd();if(got)toast('Dictation added')}};
  R.dict=rec;dictMark(true);rec.start();toast('Listening… tap the mic again to stop')}
 catch(_){dictEnd();if(!failed)demo()}}
function selExtra(){return'<button data-c="mic" aria-label="Dictate" data-tip="Dictate">'+svg('mic')+'</button>'+minHtml('sel')}

/* ---- selection bars (Professional): Dictate joins the row, Minimise ends it ---- */
function buildSelbar(compact){if(!isPro()){if(selbar.dataset.pro){selbar.innerHTML=SELBAR0;delete selbar.dataset.pro}return}
 selbar.dataset.pro='1';const ib=(c,ic,l,on)=>'<button data-c="'+c+'" aria-label="'+l+'" data-tip="'+l+'"'+(on?' class="on"':'')+'>'+svg(ic)+'</button>';
 const grip=ib('grip','move','Move this bar'),mic=ib('mic','mic','Dictate'),bi='<button data-c="bold" aria-label="Bold"><b>B</b></button><button data-c="italic" aria-label="Italic"><i>I</i></button>';
 selbar.innerHTML=compact?
  grip+ib('colour','palette','Text colour')+ib('size','zin','Size')+ib('style','h1','Style')+bi+ib('align','alignL','Align')+ib('list','list','List')+ib('hl','hlight','Highlight')+mic+ib('aa','more','More (opens Text options)')+minHtml('sel')
  :grip+ib('colour','palette','Colour')+ib('size','zin','Size')+ib('style','h1','Style')+bi+ib('align','alignL','Align')+ib('list','list','List')+ib('hl','hlight','Highlight')+ib('link','link','Link')+mic+'<span class="vs"></span>'+ib('cut','scissors','Cut')+ib('copy','copy','Copy')+ib('del','trash','Delete')+ib('more','more','More')+'<span class="vs"></span>'+ib('pin','pin','Keep this bar here',R.selPin)+ib('desel','xmark','Deselect')+minHtml('sel');
 if(R.dict)dictMark(true)}

/* ---- box bar: icons, the current style on its first button, same family as the selection menu ---- */
function boxBarHtml(){const pro=isPro(),v=curV(),nm=styleName(v);
 const ib=(k,ic,l,cls)=>'<button type="button" data-b="'+k+'" aria-label="'+l+'" data-tip="'+l+'"'+(cls?' class="'+cls+'"':'')+'>'+svg(ic)+(pro?'':'<span>'+l+'</span>')+'</button>';
 return(pro?'<button type="button" class="bbst" data-b="style" aria-label="Style: '+esc(nm)+'" data-tip="Box style: '+esc(nm)+'">'+bprev(v)+'<span>Style</span></button><span class="vs"></span>':'')+
  ib('dup','dup','Duplicate')+(pro?ib('cut','scissors','Cut'):'')+ib('copy','copy','Copy')+ib('del','trash','Delete','dz')+(pro?ib('more','more','More'):'')+minHtml('box')}
function updateBoxBar(){const b=curBox(),ae=document.activeElement,typing=b&&edRoot(ae)&&b.contains(ae);
 if(!b||typing||drag||R.tool!=='text'||R.reading){boxbar.hidden=true;return}
 const hh=boxBarHtml();if(boxbar.dataset.h!==hh){boxbar.dataset.h=hh;boxbar.innerHTML=hh}
 boxbar.hidden=false;const w=boxbar.offsetWidth,h=boxbar.offsetHeight;let t=b.offsetTop-76-h-6;if(t<4)t=b.offsetTop+b.offsetHeight+34;
 boxbar.style.left=Math.max(4,Math.min(b.offsetLeft,paper.clientWidth-w-4))+'px';boxbar.style.top=t+'px'}

/* ---- T7: a new box always has room for a line: it starts left of a tap that is too close to the right margin ---- */
function newBoxAt(x,y){const W=paper.clientWidth,room=Math.min(360,Math.round(W*.6));
 x=Math.max(2,Math.min(x,W-room-14));y=Math.max(40,Math.min(Math.round(y/32)*32,paper.clientHeight-40));
 const b=makeBox(newDef({x,y}));select(b);b.querySelector('.txt').focus();return b}

/* ---- All tools: only what the main bar and the pills do not already offer ---- */
function allAct(n){const m={Shapes:'shape',Ruler:'ruler',Tape:'tape',Magnifier:'magnifier'};if(m[n])insertAct(m[n]);else toast('Would do: '+n)}

/* ============ the options pill ============ */
function renderOpts(){opts.innerHTML='';opts.classList.remove('col');let host=opts;const pro=isPro();
 const sep=()=>{const s=document.createElement('span');s.className='sep';host.append(s)};
 const opt=(html,on,f,cls,extra,label,keep)=>{const b=document.createElement('button');b.className='opt'+(on?' on':'')+(cls?' '+cls:'');b.innerHTML=html;if(extra)Object.assign(b.dataset,extra);if(label){b.setAttribute('aria-label',label);b.dataset.tip=label}b.setAttribute('aria-pressed',!!on);b.onclick=()=>{f(b);if(!keep)afterAction()};host.append(b);return b};
 const dots=(arr,cur,f,lab,again)=>arr.forEach(c0=>{const c=Array.isArray(c0)?c0[1]:c0,nm=Array.isArray(c0)?c0[0]:(c==='auto'?'automatic':c);const d=document.createElement('button');d.className='dot'+(cur===c?' on':'');d.style.background=c==='auto'?'var(--ink)':c;d.setAttribute('aria-label',(lab||'Colour')+' '+nm);d.dataset.tip=(lab||'Colour')+' '+nm;d.onclick=()=>{if(again&&cur===c){again();return}f(c);afterAction()};host.append(d)});
 const grip=h=>{const b=document.createElement('button');b.className='opt pgrip';b.innerHTML=svg('grip');b.setAttribute('aria-label','Move these options');b.dataset.tip='Drag to an edge';h.append(b)};
 const minb=h=>h.insertAdjacentHTML('beforeend',minHtml('opts','opt'));
 const t=R.tool;
 if(t==='pen'){const isHl=R.pen==='Highlighter',tip=k=>k==='hl'?R.hlCol:(R.penCol==='auto'?'var(--ink)':R.penCol),was=renderOpts.pen;renderOpts.pen=R.pen;
  grip(host);
  if(pro&&R.layers.length>1){const ln=R.layers[R.la].name;opt(svg('layers')+'<span>'+esc(ln)+'</span>',false,()=>openPenAt('page'),'row',null,'Layers: drawing on '+ln,1);sep()}
  if(PN.shape&&PN.shape!=='free'){const sn={line:'Line',arrow:'Arrow',box:'Box',oval:'Oval',triangle:'Triangle',tape:'Tape'}[PN.shape]||'Shape';opt(svg('shapes')+'<span>'+sn+'</span>',true,()=>{PN.shape='free';save();renderOpts();if(typeof begMark==='function')begMark();toast('Pen draws freehand')},'row shp',null,'Drawing '+sn+': tap for freehand',1);sep()}
  PTYPES.forEach(n=>{const k=TYPEK[n];opt(penSvg(k,tip(k)),R.pen===n,()=>{R.pen=n;renderOpts()},'ptype'+(was&&was!==R.pen?(n===R.pen?' rise':n===was?' fall':''):''),null,pname(n))});
  sep();
  const cust=pro?(isHl?HN.cust:PN.cust):[],setC=c=>{if(isHl)R.hlCol=c;else R.penCol=c;renderOpts()},cur=isHl?R.hlCol:R.penCol,again=pro?()=>openPenAt('colour'):null;
  dots(isHl?HLCOL:PENCOL,cur,setC,null,again);
  if(cust.length)dots(cust.map(c=>['custom '+c,c]),cur,setC,null,again);
  if(pro)opt(svg('plus'),false,()=>openPenAt('colour'),'addc',null,'Add a colour',1);
  sep();
  [['Fine',1.5],['Medium',3],['Bold',5.5]].forEach(([n,w])=>{const on=(isHl?R.hlSize:R.size)===n&&(isHl||!pro||PN.exact==null);
   opt('<svg class="ln" viewBox="0 0 24 24"><path d="M4 12h16" style="stroke-width:'+(isHl?w*1.7:w)+'"/></svg>',on,()=>{if(pro&&on){openPenAt('stroke');return}if(isHl)R.hlSize=n;else{R.size=n;PN.exact=null;save()}renderOpts()},'',null,n,pro&&on)});
  if(pro){const favs=isHl?HN.favs:PN.favs;
   if(favs.length){sep();favs.forEach((f,i)=>opt('<i style="background:'+cdot(f.col)+'"></i>'+pname(f.pen),false,()=>{R.pen=f.pen;if(f.pen==='Highlighter'){R.hlCol=f.col;R.hlSize=f.size}else{R.penCol=f.col;R.size=f.size;PN.exact=f.exact==null?null:f.exact}save();renderOpts()},'favp',null,'Favourite '+(i+1)+': '+pname(f.pen)))}
   sep();caret('acard','More pen options',host)}
  else caret('acard','More pen options',host);
  minb(host)}
 else if(t==='text'){opts.classList.add('col');
  const v=curV(),b0=curBox(),main=document.createElement('div'),subr=document.createElement('div');
  if(R.sub!=='width'&&R.sub!=='aa')R.sub=null;
  const tg=k=>()=>{R.sub=R.sub===k?null:k;renderOpts()};
  host=main;grip(main);
  if(pro){const bon=R.acard&&R.ctab.text==='box',nm=styleName(v);
   opt(bprev(v)+'<span class="bl"><small>Box style</small><b>'+esc(nm)+'</b></span>',bon,()=>{if(bon){R.acard=false;renderOpts()}else openBoxStyle()},'bst chev',null,'Box style: '+nm,1);
   sep();opt('Width',R.sub==='width',tg('width'),'chev',null,'Width',1);
   const lon=R.acard&&R.ctab.text==='layout';opt('Layout',lon,()=>{R.ctab.text='layout';R.acard=!lon;R.tabIn=true;renderOpts();R.tabIn=false},'',null,'Layout',1);
   sep();opt('Aa',R.sub==='aa',tg('aa'),'',null,'Text options',1);
   sep();caret('acard','More text options',main);minb(main);
   host=subr;const blk=curBlock();
   if(R.sub==='width'){[['Auto','auto'],['Narrow',160],['Medium',280],['Wide','wide']].forEach(([n,x])=>opt(n,false,()=>setWidth(x),'',null,null,1))}
   else if(R.sub==='aa'){
    const cur=(TSTYLES.find(x=>x[1]===blk)||TSTYLES[4])[0];
    opt(cur,false,b=>openMenu([{h:'Text style'},...TSTYLES.map(([n,tag])=>({t:n,on:blk===tag,f:()=>{blockStyle(tag);renderOpts()}}))],b),'chev',null,'Text style',1);sep();
    opt('B',false,()=>fmt('bold'),'b',{fmt:'bold'},'Bold',1);opt('I',false,()=>fmt('italic'),'i',{fmt:'italic'},'Italic',1);opt('U',false,()=>fmt('underline'),'u',{fmt:'underline'},'Underline',1);sep();
    opt(svg('palette'),false,b=>openMenu([{h:'Text colour'},...PENCOL.map(([n,c])=>({t:n,c:c==='auto'?'var(--ink)':c,f:()=>fmt('foreColor',c==='auto'?css('--ink'):c)}))],b),'chev',null,'Text colour',1);
    opt(svg('hlight'),false,b=>openMenu([{h:'Highlight colour'},...HLCOL.map(([n,c])=>({t:n,c,f:()=>fmt('hiliteColor',hexA(c))}))],b),'chev',null,'Highlight colour',1);sep();
    opt(svg('list'),false,()=>listCmd('bul'),'',null,'Bullets',1);opt(svg('olist'),false,()=>listCmd('num'),'',null,'Numbers',1);opt(svg('checks'),false,()=>listCmd('chk'),'',null,'Checklist',1);opt(svg('toglist'),false,()=>listCmd('tog'),'',null,'Toggle list',1);sep();
    opt(svg('alignL'),false,b=>openMenu([{h:'Align'},...alignCmds.map(([n,cmd])=>({t:n,f:()=>fmt(cmd)}))],b),'chev',null,'Align',1)}}
  else{
   /* Beginner: one calm row. Three box looks you can see, three sizes, B I U, colour. Everything else lives in Professional. */
   const lab=tx=>{const s=document.createElement('span');s.className='plab';s.textContent=tx;host.append(s)};
   lab('Box');
   ['plain','sticky','callout'].forEach(id=>{const p=PRESETS.find(x=>x[0]===id);opt(bprev(p[2])+'<span>'+p[1]+'</span>',sameV(p[2],v),()=>{setStyle(p[2],true);if(!curBox())toast('New boxes will be '+p[1]+'. Tap a box to change that box')},'look',null,p[1]+' box',1)});
   sep();const sz=b0?b0.dataset.size:(R.defSize||'body');
   [['Body','body'],['Heading','head'],['Small','small']].forEach(([n,k])=>opt(n,sz===k,()=>{const b=curBox();if(!b){toast('Tap a text box first');return}b.dataset.size=k;resolveOverlap(b);flush();renderOpts();updateBoxBar()},'',null,n+' text',1));
   sep();opt('B',false,()=>fmt('bold'),'b',{fmt:'bold'},'Bold',1);opt('I',false,()=>fmt('italic'),'i',{fmt:'italic'},'Italic',1);opt('U',false,()=>fmt('underline'),'u',{fmt:'underline'},'Underline',1);
   sep();dots(PENCOL,null,c=>fmt('foreColor',c==='auto'?css('--ink'):c),'Text colour');
   minb(main)}
  const wrap=row=>{const h=document.createElement('div');h.className='bs2';row.className='prow'+(row===subr?' psub':'');h.append(row);opts.append(h);return h};
  const hm=wrap(main);hscroll(hm,main);if(pro&&R.sub){const hs=wrap(subr);hscroll(hs,subr)}
  updateFmtState()}
 else if(t==='eraser'){grip(host);if(pro)proEraser();else ['Whole stroke','Partial','Highlights only'].forEach(v=>opt(v,R.eraser===v,()=>{R.eraser=v;renderOpts()}));minb(host)}
 else if(t==='lasso'&&pro){grip(host);proLasso();minb(host)}
 else if(t==='lasso'){grip(host);['Free','Rectangle'].forEach(v=>opt(v,R.lassoMode===v,()=>{R.lassoMode=v;renderOpts()}));sep();
  if(selCount()){[['Cut','cut'],['Copy','copy'],['Paste','paste'],['Duplicate','dup'],['Delete','del']].forEach(([n,k])=>opt(n,false,()=>lassoAct(k)));sep();dots(LCOL,null,c=>lassoAct('col',c));sep();opt('Convert to text',false,()=>lassoAct('conv'));opt('Screenshot',false,()=>lassoAct('shot'))}
  else{opt('Paste',false,()=>lassoAct('paste'));const m=document.createElement('span');m.className='muted';m.style.padding='0 12px';m.style.whiteSpace='nowrap';m.textContent='Draw a loop, then drag the selection or its corner dot.';opts.append(m)}
  minb(host)}
 else if(t==='insert'){grip(host);[['Table','table','table'],['Picture','pic','img'],['Callout','callout','quote'],['Recall card','recall','stack'],['Text box','box','text'],['Link','link','link'],['Elements','elements','sticker']].forEach(([n,k,ic])=>opt(svg(ic)+'<span>'+n+'</span>',false,()=>insertAct(k),'row',null,n));
  if(pro){sep();caret('acard','More to insert',host)}minb(host)}
 if(!opts.classList.contains('col')){const row=document.createElement('div'),hh=document.createElement('div');hh.className='bs2';row.className='prow';while(opts.firstChild)row.append(opts.firstChild);hh.append(row);opts.append(hh);opts.classList.add('col');hscroll(hh,row)}
 pinMore();applyOpts()}
/* the bar grows when All tools opens: the pill, its card and the chips follow it */
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(!R.pdrag)placeOpts()}).observe($('#barbox'));
/* ---- More: first thing after the grip on every Professional pill, pinned, with a name. Minimise has its own icon. ---- */
function caret(flag,label,toHost){const b=document.createElement('button');b.className='opt more'+(R[flag]?' open':'');b.innerHTML=svg('sliders')+'<span>More</span>';b.setAttribute('aria-label',label);b.setAttribute('aria-expanded',!!R[flag]);b.dataset.tip=label;b.onclick=()=>{R[flag]=!R[flag];renderOpts()};toHost.append(b);return b}
function pinMore(){const mo=$('.opt.more',opts),gr=$('.pgrip',opts);if(!mo||!gr)return;const row=gr.parentElement;gr.after(mo);const s=document.createElement('span');s.className='sep';mo.after(s);
 /* tidy the separators the move left behind */
 [...row.children].forEach(el=>{if(!el.classList.contains('sep')||el.classList.contains('minsep')||el===s)return;const n=el.nextElementSibling;if(!n||n.classList.contains('sep')||n.classList.contains('minb'))el.remove()})}
function nearRh(rh,e){if(!rh)return rh;let best=rh,bd=1e9;$$('.rh',rh.closest('.box')).forEach(h=>{const q=h.getBoundingClientRect(),d=Math.hypot(e.clientX-q.left-q.width/2,e.clientY-q.top-q.height/2);if(d<bd){bd=d;best=h}});return best}
/* ---- the thin track of the main bar, under every row that scrolls sideways (shown only when the row overflows) ---- */
function addTrack(sc,put){const tr=document.createElement('div');tr.className='track tk';tr.setAttribute('role','scrollbar');tr.setAttribute('aria-label','Scroll this row');tr.hidden=true;tr.innerHTML='<i></i><b></b>';put(tr);const th=tr.lastElementChild;
 const m=()=>{const over=sc.scrollWidth>sc.clientWidth+2&&sc.clientWidth>0;if(tr.hidden===over){tr.hidden=!over;if(tr.closest('#opts'))requestAnimationFrame(()=>{if(!R.pdrag)placeOpts()})}
  if(over){const w=sc.clientWidth/sc.scrollWidth,mx=sc.scrollWidth-sc.clientWidth;th.style.width=(w*100)+'%';th.style.left=((mx?sc.scrollLeft/mx*(1-w):0)*100)+'%'}};
 sc.addEventListener('scroll',m,{passive:true});if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(m);ro.observe(sc);[...sc.children].forEach(k=>ro.observe(k))}
 let dr=false;const toP=e=>{const b=tr.getBoundingClientRect(),w=sc.clientWidth/sc.scrollWidth,r=(e.clientX-b.left)/b.width;sc.scrollLeft=Math.max(0,Math.min(1,(r-w/2)/(1-w)))*(sc.scrollWidth-sc.clientWidth)};
 tr.onpointerdown=e=>{e.preventDefault();e.stopPropagation();dr=true;try{tr.setPointerCapture(e.pointerId)}catch(_){}toP(e)};tr.onpointermove=e=>{if(dr)toP(e)};tr.onpointerup=tr.onpointercancel=()=>{dr=false};
 m();return tr}
/* card section tabs get the track too */
function fillCard(el,html){const p0=$('.cpane',el),t0=$('.ctabs',el),keep=p0&&!R.tabIn?p0.scrollTop:0,kt=t0?t0.scrollLeft:0;el.innerHTML=html;
 const p=$('.cpane',el),tb2=$('.ctabs',el);if(p)p.scrollTop=keep;
 if(tb2){tb2.scrollLeft=kt;const on=$('.ctab.on',tb2);if(on&&(on.offsetLeft<tb2.scrollLeft+8||on.offsetLeft+on.offsetWidth>tb2.scrollLeft+tb2.clientWidth-8))tb2.scrollLeft=Math.max(0,on.offsetLeft-32);addTrack(tb2,t=>tb2.after(t))}}
/* ---- T7: an auto-width box that starts to wrap with too little room slides left, so words wrap only at the page margin ---- */
function boxLines(b){const t=b.querySelector('.txt'),rg=document.createRange();rg.selectNodeContents(t);return new Set([...rg.getClientRects()].filter(q=>q.width>0).map(q=>Math.round(q.top/8))).size}
function fitBox(b){if(!b||!b.isConnected||b.dataset.t!=='text')return;const W=paper.clientWidth,room=Math.min(320,Math.round(W*.6)),x=b.offsetLeft;
 if(b.style.width){const w=parseFloat(b.style.width);if(w<64)b.style.width='64px';return}
 if(W-x-14>=room||boxLines(b)<2)return;const tr=b.style.transition;b.style.transition='none';setBoxPos(b,Math.max(2,W-room-14),b.offsetTop);void b.offsetWidth;b.style.transition=tr}
paper.addEventListener('input',e=>{const b=e.target.closest&&e.target.closest('.box');if(b)fitBox(b)});

/* ============ v4 cards ============ */
/* ---- Pen ▾ : one page, nothing hidden. The section tabs jump; scrolling moves the tab. ---- */
const PSECS=[['stroke','Stroke'],['colour','Colour'],['feel','Feel'],['shapes','Shapes & aids'],['page','Layers & paper']];
function penCardHtml(){const isHl=R.pen==='Highlighter',c=PN,hn=HN,cur=isHl?R.hlCol:R.penCol,cust=isHl?hn.cust:c.cust,favs=isHl?hn.favs:c.favs;
 const S=(o,k,l,on)=>swr('data-a="sw" data-o="'+o+'" data-k="'+k+'"',l,on);
 const pset=(k,arr,label,cls)=>group(label,cls,arr.map(([v,n,ic])=>chip('data-a="set" data-o="pn" data-k="'+k+'" data-v="'+v+'"',n,c[k]===v,ic)).join(''));
 const sec=(k,h)=>{const n=PSECS.find(x=>x[0]===k)[1];return'<section class="csec" data-sec="'+k+'" aria-label="'+n+'"><h5>'+n+'</h5>'+h+'</section>'};
 let a='',b='',f='',s='',p='';
 if(isHl)a+=clab('Strength')+slr('hop','Opacity',20,90,5,hn.op,SLF.hop);
 else{a+=clab('Thickness')+slr('exact','Exact thickness',0.5,30,0.5,c.exact!=null?c.exact:SIZES[R.size],SLF.exact);if(c.exact!=null)a+=abtn('data-a="use3"','Use the 3 sizes','sliders')}
 
 if(isHl)a+=clab('On the page')+S('hn','snap','Snap to text lines',hn.snap)+S('hn','behind','Draw behind ink',hn.behind)+clab('Your highlights')+abtn('data-a="hlEraser"','Highlight eraser','eraser')+abtn('data-a="saveNotes"','Save to notes','fdown');
 b+=clab('Custom colours')+'<div class="crow" aria-label="Custom colours">'+cust.map(cc=>'<button class="sw'+(cur===cc?' on':'')+'" style="background:'+cc+'" data-a="cust" data-v="'+cc+'" aria-label="Custom colour '+cc+'"></button>').join('')+'<input type="color" id="custCol" value="'+(R.custCol||'#4f8cff')+'" aria-label="Pick a custom colour"><button class="lay" data-a="addcol">Add colour</button></div>'+enote('Your colours join the dots on the pill. Up to 6, newest first.');
 b+=clab('Manage favourites')+'<div class="crow">'+favs.map((x,i)=>'<button class="fav" data-a="fav" data-i="'+i+'" aria-label="Favourite '+(i+1)+': '+pname(x.pen)+'"><i style="background:'+cdot(x.col)+'"></i>'+pname(x.pen)+'</button>').join('')+'<button class="lay" data-a="savefav">Save current</button></div>'+enote('A favourite keeps the type, colour and size, and joins the end of the pill. Tap to use, hold to remove.');
 if(!isHl)f+=clab('Tip')+slr('sharp','Tip sharpness',0,100,5,c.sharp,SLF.sharp)+(R.pen==='Fountain'?slr('flat','Flatness',0,100,5,c.flat,SLF.flat):'')+slr('smooth','Stabilisation',0,100,5,c.smooth,SLF.smooth);
 f+=clab('Response')+(isHl?'':S('pn','pOn','Pressure',c.pOn)+(c.pOn?slr('press','Pressure strength',0,100,5,c.press,SLF.press):''))+S('pn','tilt','Tilt widens the line',c.tilt)+S('pn','speed','Thickness by speed',c.speed)+S('pn','latency','Reduce latency',c.latency);
 f+=clab('Finger can draw')+pset('finger',[['auto','Automatic'],['always','Always'],['never','Never']],'Finger can draw');
 f+=clab('Gestures')+S('pn','scribble','Scribble to erase',c.scribble)+S('pn','c2l','Circle to lasso',c.c2l);f+=clab('Line')+mchip('ls','Line style',LS_N[c.ls]||'Solid','minus');
 s+=clab('Draw as')+pset('shape',[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Box','square'],['oval','Oval','oval'],['triangle','Triangle','triangle'],['tape','Tape','tape']],'Draw as','four');
 s+=clab('Shape help')+S('pn','hold','Draw and hold for a perfect shape',c.hold)+S('pn','snap','Snap shapes',c.snap)+S('pn','fill','Fill closed shapes',c.fill);
 s+=clab('Aids')+swr('data-a="ruler"','Ruler',!$('#ruler').hidden)+swr('data-a="magnifier"','Magnifier',R.pad==='mag');
 p+=layersHtml();
 p+=clab('Page')+mchip('paper','Page style',PAPER_N[c.paper]||'Lined','file')+
  clab('Paper size')+group('Paper size','',[['fit','Fit page'],['a4','A4'],['letter','Letter']].map(([k,n])=>chip('data-a="psize" data-v="'+k+'"',n,c.psize===k)).join(''))+
  clab('View')+group('Zoom','five',[100,150,200,300,400].map(z=>chip('data-a="zoom" data-v="'+z+'"',z+'%',z===100)).join(''))+enote('Zoom is a demo here: pinch zooms the real page.')+
  abtn('data-a="vad"','View as drawn','play','Replay');
 return cheadX(pname(R.pen),'data-a="close"')+ctabs('pen')+'<canvas class="prev2" id="prev2" width="600" height="128" aria-label="Preview of the current pen"></canvas>'+
  '<div class="cpane" role="group" aria-label="Pen options">'+sec('stroke',a)+sec('colour',b)+sec('feel',f)+sec('shapes',s)+sec('page',p)+'</div>'}
function penJump(flash){const pane=$('.cpane',acard),sc=pane&&$('.csec[data-sec="'+R.ctab.pen+'"]',pane);if(!sc)return;R.spyHold=performance.now();pane.scrollTop=sc.offsetTop;
 if(flash){sc.classList.remove('flash');void sc.offsetWidth;sc.classList.add('flash')}}
acard.addEventListener('scroll',e=>{if(R.tool!=='pen'||!e.target.classList||!e.target.classList.contains('cpane'))return;if(performance.now()-(R.spyHold||0)<300)return;
 const pane=e.target,secs=$$('.csec',pane);let cur=secs[0];
 if(pane.scrollTop>=pane.scrollHeight-pane.clientHeight-2)cur=secs[secs.length-1];else secs.forEach(s=>{if(s.offsetTop<=pane.scrollTop+28)cur=s});
 if(!cur||cur.dataset.sec===R.ctab.pen)return;R.ctab.pen=cur.dataset.sec;
 $$('.ctab',acard).forEach(t=>{const on=t.dataset.tab===R.ctab.pen;t.classList.toggle('on',on);t.setAttribute('aria-selected',on)});
 const tb2=$('.ctabs',acard),on=$('.ctab.on',tb2);if(on&&(on.offsetLeft<tb2.scrollLeft+8||on.offsetLeft+on.offsetWidth>tb2.scrollLeft+tb2.clientWidth-8))tb2.scrollLeft=Math.max(0,on.offsetLeft-32)},true);

/* ---- Text ▾ : Text · Box · Layout. Box is the whole box style: preview first, looks you can see, then the details. ---- */
const BDW=[['None',''],['Thin','1px'],['Medium','2px'],['Thick','3.5px']],BDC=[['Grey','var(--ink-soft)'],['Accent','var(--accent)'],['Red','#ef7a6f'],['Green','#4cc38a'],['Blue','#5aa9ff'],['Amber','#f0b94a']],
 RADS=[['Square','0px'],['Soft','8px'],['Round','18px']],PADS=[['Tight','6px'],['Normal','12px'],['Roomy','20px']];
function textCardHtml(){const v=curV(),b=curBox(),fsNow=parseFloat(b?b.style.getPropertyValue('--fs'):ST.boxDef.fs)||1,kind=b?(b.dataset.k||'plain'):'plain',ff=v.ff||'inherit',tab=R.ctab.text;
 const num=(s,d)=>{const m=String(s||'').match(/[\d.]+/);return m?+m[0]:d};
 let h='';
 if(tab==='text'){
  h+=clab('Line height')+group('Line height','',LHS_.map(([n,x])=>chip('data-a="lh" data-v="'+(x||'')+'"',n,(v.lh||null)===x)).join(''));
  h+=clab('Block type')+group('Block type','four',KINDS.filter(([k])=>k!=='callout').map(([k,n])=>chip('data-a="kind" data-v="'+k+'"',n,kind===k)).join(''));
  h+=clab('More marks')+'<div class="chips four">'+chip('data-a="mark" data-v="link"','Link',false,'link')+chip('data-a="mark" data-v="key"','Key point',false,'tag')+'</div>'}
 else if(tab==='box'){const hasB=!!v.bd&&parseFloat(v.bd)>0,eq=(k,x)=>String(v[k]||'')===x;
  const cg=st=>'<i class="cg" style="'+st+'"></i>';
  const vchip=(a,val,on,label,glyph,n)=>'<button class="chip'+(on?' on':'')+'" role="radio" aria-checked="'+!!on+'" data-a="'+a+'" data-v="'+val+'" aria-label="'+label+'">'+glyph+'<span>'+n+'</span></button>';
  h+='<div class="bxhead"><div class="bxp" id="bxp" style="'+prevCss(v)+'">Sample</div><div class="bxm"><b id="bxn">'+esc(styleName(v))+'</b><span>'+(b?'Every change shows on the selected box straight away.':'No box yet: this sets how new boxes look.')+'</span></div></div>';
  h+=clab('Look')+'<div class="looks" role="radiogroup" aria-label="Box look">'+PRESETS.map(([id,n,pv])=>'<button class="ltile'+(sameV(pv,v)?' on':'')+'" role="radio" aria-checked="'+sameV(pv,v)+'" data-a="preset" data-v="'+id+'" aria-label="'+n+'">'+bprev(pv)+'<span>'+n+'</span></button>').join('')+'</div>';
  h+=clab('Fill')+'<div class="swatches" role="radiogroup" aria-label="Box colour">'+BOXSW.map(([n,pv])=>'<button class="sw'+((n==='None'?(!v.bg&&!v.bd):n==='Outlined'?(!v.bg&&!!v.bd):(pv.bg&&v.bg===pv.bg))?' on':'')+'" style="background:'+(pv.bg||'transparent')+';'+(pv.bd?'border:2px solid '+pv.bdc+';':'')+'" data-a="swatch" data-v="'+n+'" aria-label="Box colour '+n+'" data-tip="'+n+'"></button>').join('')+'</div>';
  h+=clab('Border')+group('Border','four',BDW.map(([n,w])=>vchip('bd',w,w?hasB&&eq('bd',w):!hasB,w?n+' border':'No border',cg(w?'border-width:'+Math.max(1,parseFloat(w))+'px;border-radius:3px':'border:1px dashed var(--line-strong);border-radius:3px'),n)).join(''))+
   '<div class="crow" role="radiogroup" aria-label="Border colour">'+BDC.map(([n,cc])=>'<button class="bdot'+(hasB&&eq('bdc',cc)?' on':'')+'" style="background:'+cc+'" data-a="bdc" data-v="'+cc+'" aria-label="Border colour '+n+'" data-tip="'+n+' border"></button>').join('')+'</div>';
  h+=clab('Corners')+group('Corners','',RADS.map(([n,x])=>vchip('rad',x,eq('rad',x),n+' corners',cg('border-width:2px 0 0 2px;border-top-left-radius:'+Math.min(12,parseFloat(x))+'px'),n)).join(''));
  h+=clab('Padding')+group('Padding','',PADS.map(([n,x],i)=>vchip('pad',x,eq('pad',x),n+' padding',cg('border-width:1px;border-radius:3px;box-shadow:inset 0 0 0 '+(2+i*2)+'px var(--pressed)'),n)).join(''));
  h+=swr('data-a="shadow"','Shadow',!!v.sh);
  h+=clab('Exact values')+'<button class="abtn disc" data-a="fine" aria-expanded="'+!!R.fine+'">'+svg('sliders')+'<span>Fine-tune</span>'+svg('chevD')+'</button>';
  if(R.fine)h+='<div class="fine"><div class="crow"><label class="muted" for="bgc">Background</label><input type="color" id="bgc" data-a="bgc" value="'+(/^#/.test(v.bg||'')?v.bg:'#f3dc7a')+'" aria-label="Background colour"><label class="muted" for="bdcc">Border</label><input type="color" id="bdcc" data-a="bdcc" value="'+(/^#/.test(v.bdc||'')?v.bdc:'#7f7d8c')+'" aria-label="Border colour"></div>'+
   slr('bw','Border width',0,3,.5,num(v.bd,0),SLF.bw)+slr('rad','Corner radius',0,16,1,num(v.rad,0),SLF.rad)+slr('padd','Padding',0,16,1,num(v.pad,6),SLF.padd)+'</div>';
  h+=clab('My presets')+(ST.presets.length?ST.presets.map(p=>'<div class="myp">'+bprev(p.v)+'<span style="margin-left:8px">'+esc(p.name)+'</span><button class="sq" data-a="myuse" data-v="'+p.id+'" aria-label="Use '+esc(p.name)+'">'+svg('check2')+'</button><button class="sq" data-a="myren" data-v="'+p.id+'" aria-label="Rename '+esc(p.name)+'">'+svg('pencil')+'</button><button class="sq" data-a="mydel" data-v="'+p.id+'" aria-label="Delete '+esc(p.name)+'">'+svg('trash')+'</button></div>').join(''):'')+abtn('data-a="mysave"','Save this style','plus',ST.presets.length+' of '+MAXMY);
  h+=clab('New boxes')+swr('data-a="usenew"','Use for new boxes',!!ST.useNew)+enote(ST.useNew?'On: a new box starts with the style you used last.':'Off: a new box starts plain.')+abtn('data-a="resetbox"','Reset box style','rotcw')}
 else{
  h+=clab('Columns')+group('Columns','four',LAYOUTS.map(([k,n])=>chip('data-a="layout" data-v="'+k+'"',n,false)).join(''))+abtn('data-a="equal"','Equalise columns','layout');
  h+=clab('Tidy the page')+abtn('data-a="assist"','Layout Assist','wand','Ctrl/Cmd+Alt+L');
  h+=clab('This box')+abtn('data-a="place"','Width and position…','fit')+enote('Grid dividers: drag to resize, double-tap to make equal (demo: use Equalise columns).')}
 return cheadX('Text','data-a="close"')+ctabs('text')+cpane(h)}
/* while a slider or colour well moves, the header preview follows without rebuilding the card */
function bxLive(){const p=$('#bxp'),n=$('#bxn');if(p)p.style.cssText=prevCss(curV());if(n)n.textContent=styleName(curV())}
acard.addEventListener('input',()=>{if(R.tool==='text')requestAnimationFrame(bxLive)});

/* ---- Insert ▾ : one page. Shapes, Tape, Ruler and Magnifier live in Pen ▾ and in All tools, not here. ---- */
function insertCardHtml(){
 const T=(l,arr)=>clab(l)+'<div class="tiles">'+arr.map(a=>tile(a[0],a[1],a[2],a[3])).join('')+'</div>';
 return cheadX('Insert','data-a="close"')+cpane(
  T('Media and handwriting',[['camera','Camera','camera'],['file','File or PDF','ftext'],['audio',R.rec!=null?'Stop audio':'Audio','mic',R.rec!=null],['writepad','Write pad','pencil',R.pad==='write'],['handwriting','Handwriting','wave']])+
  T('Page',[['divider','Divider','minus'],['pagelink','Page link','link'],['database','Database','database'],['mindmap','Mind map','mindmap'],['summary','Summary','ftext'],['instemplate','Insert template','fplus'],['savetemplate','Save as template','file'],['tohome','To Home','house']]))}

function renderAcard(){const t=R.tool,on=R.acard&&(isPro()||t==='text')&&(t==='pen'||t==='text'||t==='insert')&&R.optsOn&&!R.reading&&!R.tbHidden;
 acard.classList.toggle('show',!!on);acard.setAttribute('aria-hidden',!on);if(!on){acard.dataset.open='';return}
 if(acard.dataset.for!==t){acard.dataset.for=t;acard.innerHTML=''}
 const fresh=!acard.dataset.open||!$('.cpane',acard);acard.dataset.open='1';
 const pane0=$('.cpane',acard),keep=pane0?pane0.scrollTop:0;
 fillCard(acard,t==='pen'?penCardHtml():t==='text'?textCardHtml():insertCardHtml());
 if(t==='pen'){const pane=$('.cpane',acard);if(R.tabIn||fresh)penJump(R.tabIn&&!fresh);else if(pane)pane.scrollTop=keep;drawPreview()}
 placeCard(acard)}

/* ============ v4: Layouts card (replaces the text menu). Same card pattern as Pen / Eraser / Lasso. ============
   Top: a tile per layout with a mini picture of its toolbar. Manage: actions for the chosen layout. Footer: tick switches, cross cancels. */
const LC={open:false,sel:null,ren:false,a:null};
const laycard=document.createElement('div');laycard.id='laycard';laycard.className='pop col ecard laycard glass blur nofocus anim';laycard.setAttribute('role','dialog');laycard.setAttribute('aria-label','Layouts');laycard.setAttribute('aria-hidden','true');document.body.append(laycard);
function layoutMenu(a){closeMenu();if(LC.open){layClose();return}LC.open=true;LC.a=a;LC.sel=ST.cur;LC.ren=false;renderLay()}
function layClose(){LC.open=false;laycard.classList.remove('show');laycard.setAttribute('aria-hidden','true')}
function layTile(id){const l=getLayout(id),vis=l.ids.filter(i=>!l.hidden.includes(i)&&I[i]),on=LC.sel===id,nm=l.name;
 return'<button class="lyt'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-y="pick" data-id="'+id+'" aria-label="'+esc(nm)+(ST.cur===id?', in use':'')+'"><span class="lyp" aria-hidden="true"><span class="lyr">'+vis.map(i=>svg(i)).join('')+'</span>'+(l.all?'<span class="lya"><i></i><i></i><i></i><i></i></span>':'')+'</span><span class="lyn">'+esc(nm)+(ST.cur===id?'<i class="lyc" aria-hidden="true"></i>':'')+'</span></button>'}
function renderLay(){if(!LC.open)return;if(!getLayout(LC.sel))LC.sel=ST.cur;const id=LC.sel,own=!isBuiltin(id),l=getLayout(id);
 const mb=(k,ic,n,dis,cls,tip)=>'<button class="chip'+(cls?' '+cls:'')+(dis?' dis':'')+'" data-y="'+k+'" aria-label="'+n+'"'+(dis?' disabled aria-disabled="true"':'')+(tip?' data-tip="'+tip+'"':'')+'>'+svg(ic)+'<span>'+n+'</span></button>';
 let h='<div class="ch"><strong>Layouts</strong></div><div class="cpane">'+clab('Layouts')+'<div class="lytiles" role="radiogroup" aria-label="Layouts">'+layoutIds().map(layTile).join('')+
  '<button class="lyt new" data-y="new" aria-label="New layout"><span class="lyp" aria-hidden="true">'+svg('plus')+'</span><span class="lyn">New layout</span></button></div>'+clab('Manage');
 if(LC.ren)h+='<form class="lyren" data-y="renform"><input class="field" id="lyName" maxlength="24" autocomplete="off" aria-label="Layout name" value="'+esc(l.name)+'"><button class="lay primary" type="submit">Save</button><button class="lay" type="button" data-y="renx">Cancel</button></form>';
 else h+='<div class="chips four" role="group" aria-label="Manage '+esc(l.name)+'">'+mb('ren','pencil','Rename',!own,'',own?'':'Built-in layouts keep their names')+mb('dup','dup','Duplicate')+mb('reset','rotcw','Reset to default')+mb('del','trash','Delete',!own,'dz',own?'':'Built-in layouts cannot be deleted')+'</div>';
 h+='</div><div class="lyfoot"><span>'+(id===ST.cur?'In use: ':'Switch to: ')+'<b>'+esc(l.name)+'</b></span><button class="sq" data-y="x" aria-label="Cancel" data-tip="Cancel">✕</button><button class="sq ok" data-y="ok" aria-label="Use this layout" data-tip="Use this layout">✓</button></div>';
 laycard.innerHTML=h;laycard.classList.add('show');laycard.setAttribute('aria-hidden','false');
 if(!LC.a||!LC.a.isConnected)LC.a=$('#layBtn')||$('#tb [data-id=layout]')||$('#tb [data-id=more]');
 const r=LC.a.getBoundingClientRect(),w=laycard.offsetWidth,top=Math.max(8,Math.min(r.bottom+6,innerHeight-laycard.offsetHeight-8));
 laycard.style.top=top+'px';laycard.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px';
 if(LC.ren){const f=$('#lyName',laycard);f.focus();f.select()}}
laycard.addEventListener('submit',e=>{e.preventDefault();const o=ST.own[LC.sel];if(o){o.name=($('#lyName',laycard).value.trim()||o.name).slice(0,24);save();if(ST.cur===LC.sel)renderToolbar();toast('Renamed')}LC.ren=false;renderLay()});
laycard.addEventListener('click',e=>{const b=e.target.closest('[data-y]');if(!b||b.disabled||b.tagName==='FORM')return;const k=b.dataset.y,id=LC.sel;
 if(k==='pick'){LC.sel=b.dataset.id;LC.ren=false;renderLay()}
 else if(k==='new'){layClose();newLayoutDlg()}
 else if(k==='ren'){LC.ren=true;renderLay()}
 else if(k==='renx'){LC.ren=false;renderLay()}
 else if(k==='dup'){if(Object.keys(ST.own).length>=3){toast('Up to 3 layouts of your own: delete one first');return}
  const s=getLayout(id),nid='c'+Date.now().toString(36),base={ids:[...s.ids],hidden:[...s.hidden],all:!!s.all};ST.own[nid]=Object.assign({name:(s.name+' copy').slice(0,24)},clone(base),{orig:clone(base)});save();LC.sel=nid;renderLay();toast('Duplicated')}
 else if(k==='reset'){resetLayout(id);if(ST.cur===id)renderToolbar();renderLay();toast(getLayout(id).name+' is back to its default')}
 else if(k==='del'){const gone=ST.own[id];if(!gone)return;const was=ST.cur;delete ST.own[id];if(was===id){ST.cur='beginner';renderToolbar()}save();LC.sel=ST.cur;renderLay();
  toastAct(gone.name+' deleted','Undo',()=>{ST.own[id]=gone;if(was===id)ST.cur=id;save();renderToolbar();if(LC.open){LC.sel=id;renderLay()}})}
 else if(k==='ok'){if(ST.cur!==id){ST.cur=id;save();renderToolbar();toast('Layout: '+getLayout(id).name)}layClose()}
 else if(k==='x')layClose()});
document.addEventListener('pointerdown',e=>{if(!LC.open)return;const t=e.target;if(laycard.contains(t)||(t.closest&&t.closest('#layBtn,#tb [data-id=layout],#toast')))return;if(!(t.closest&&t.closest(UISEL)))return; /* a tap on the page: the shared rule closes and swallows it */layClose()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&LC.open){if(LC.ren){LC.ren=false;renderLay()}else layClose()}});
addEventListener('resize',()=>{if(LC.open)renderLay()});

/* ============ v4: More card (replaces the text menu). Same card pattern as Pen / Eraser / Lasso / Layouts. ============
   Sections by purpose. Every row: icon, short name, one line on what it does. Toggles are switches, choices are tiles.
   One home per item: Layouts stays on its toolbar button, Mic and Keyboard stay on the bar, paper / layers / zoom stay in Pen > Layers & paper (linked from here). */
const MC={open:false,a:null};
const morecard=document.createElement('div');morecard.id='morecard';morecard.className='pop col ecard laycard morecard glass blur nofocus anim';morecard.setAttribute('role','dialog');morecard.setAttribute('aria-label','More');morecard.setAttribute('aria-hidden','true');document.body.append(morecard);
function moreMenu(a){closeMenu();if(MC.open){moreClose();return}if(LC.open)layClose();MC.open=true;MC.a=a;renderMore()}
function moreClose(){MC.open=false;morecard.classList.remove('show');morecard.setAttribute('aria-hidden','true')}
function renderMore(){if(!MC.open)return;const l=getLayout(ST.cur),onBar=id=>l.ids.includes(id)&&!l.hidden.includes(id),pro=isPro();
 const row=(k,ic,n,d,end)=>'<button class="mrow" data-z="'+k+'"'+(end==='sw-on'||end==='sw-off'?' role="switch" aria-checked="'+(end==='sw-on')+'"':'')+' aria-label="'+n+'">'+svg(ic)+'<span class="mt"><b>'+n+'</b><i>'+d+'</i></span>'+(end==='go'?svg('chevR'):end?'<span class="sw2" aria-hidden="true"></span>':'')+'</button>';
 const sw=on=>on?'sw-on':'sw-off';
 let h='<div class="ch"><strong>More</strong><button class="sq" data-z="x" aria-label="Close">✕</button></div><div class="cpane">';
 h+=clab('View')+(onBar('read')?'':row('read','read','Reading mode','Hides the tools so you can just read.',sw(R.reading)))+row('focus','focus','Focus mode','Dims everything except the box you are in.',sw(R.focusMode));
 h+=clab('Write & input')+row('kbh','kboff','Keyboard stays hidden','The on-screen keyboard will not pop up. The Keyboard button brings it when you want it.',sw(ST.kbHidden))+
  '<div class="mlab">'+svg('clipboard')+'<span class="mt"><b>Copy & paste</b><i>Works on the text you selected.</i></span></div><div class="chips" role="group" aria-label="Copy and paste">'+chip('data-z="copy"','Copy',false,'copy').replace('role="radio" aria-checked="false" ','')+chip('data-z="cut"','Cut',false,'scissors').replace('role="radio" aria-checked="false" ','')+chip('data-z="paste"','Paste',false,'clipboard').replace('role="radio" aria-checked="false" ','')+'</div>';
 h+=clab('Page')+(pro?row('page','layers','Paper, layers and zoom','Opens Pen options at Layers & paper.','go'):'')+'<div class="mlab">'+svg('file')+'<span class="mt"><b>Paper style</b><i>How the page looks behind your notes.</i></span></div><div class="chips four" role="group" aria-label="Paper style">'+[['blank','Blank','file'],['lined','Lined','lines'],['grid','Grid','grid'],['dots','Dots','dots9']].map(([k,n,ic])=>chip('data-z="paper" data-v="'+k+'"',n,PN.paper===k,ic).replace('role="radio" ','role="radio" ')).join('')+'</div>';
 h+=clab('Layout & settings')+row('cust','sliders','Customise toolbar','Choose which tools show, and their order.','go')+row('sett','gear','Toolbar settings','Keyboard, Pencil and New line behaviour.','go')+row('hide','eyeOff','Hide toolbar','Tucks the toolbar away. A small button brings it back.','go');
 h+='</div>';
 const p0=$('.cpane',morecard),keep=p0?p0.scrollTop:0;morecard.innerHTML=h;$('.cpane',morecard).scrollTop=keep;morecard.classList.add('show');morecard.setAttribute('aria-hidden','false');
 if(!MC.a||!MC.a.isConnected)MC.a=$('#tb [data-id=more]')||$('#layBtn');
 const r=MC.a.getBoundingClientRect(),w=morecard.offsetWidth,top=Math.max(8,Math.min(r.bottom+6,innerHeight-morecard.offsetHeight-8));
 morecard.style.top=top+'px';morecard.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'}
morecard.addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(!b)return;const k=b.dataset.z;
 const paste=()=>{focusTarget();try{navigator.clipboard.readText().then(t=>{document.execCommand('insertText',false,t);flush()},()=>toast('Paste is blocked here: use Cmd/Ctrl+V'))}catch(_){toast('Paste is blocked here: use Cmd/Ctrl+V')}};
 if(k==='x')moreClose();
 else if(k==='read'){moreClose();toggleReading()}
 else if(k==='focus'){R.focusMode=!R.focusMode;document.body.classList.toggle('focusmode',R.focusMode);renderMore();toast(R.focusMode?'Focus mode on':'Focus mode off')}
 else if(k==='kbh'){ST.kbHidden=!ST.kbHidden;R.kbOpen=false;save();applyIM();updateStates();renderMore();toast(ST.kbHidden?'Real keyboard will not pop up':'Normal keyboard behaviour')}
 else if(k==='copy'){focusTarget();let ok=false;try{ok=document.execCommand('copy')}catch(_){}toast(ok?'Copied':'Select some text first')}
 else if(k==='cut'){focusTarget();let ok=false;try{ok=document.execCommand('cut')}catch(_){}flush();toast(ok?'Cut':'Select some text first')}
 else if(k==='paste')paste();
 else if(k==='paper'){setPaper(b.dataset.v);renderMore()} else if(k==='page'){moreClose();setTool('pen');openPenAt('page')}
 else if(k==='cust'){moreClose();customiseSheet()}
 else if(k==='sett'){moreClose();settingsSheet()}
 else if(k==='hide'){moreClose();setTbHidden(true)}});
document.addEventListener('pointerdown',e=>{if(!MC.open)return;const t=e.target;if(morecard.contains(t)||(t.closest&&t.closest('#tb [data-id=more],#toast')))return;if(!(t.closest&&t.closest(UISEL)))return;moreClose()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&MC.open)moreClose()});
addEventListener('resize',()=>{if(MC.open)renderMore()});
{const lm0=layoutMenu;layoutMenu=function(a){if(MC.open)moreClose();return lm0(a)}}

/* ---- the 6-dot grip never types: while a box is dragged or its menu is open, keys go nowhere ---- */
['keydown','keypress','beforeinput'].forEach(n=>document.addEventListener(n,e=>{const busy=!!drag||(R.boxMenuFor&&menu.classList.contains('show'));if(!busy)return;
 if(n==='keydown'&&(e.key==='Escape'||(!drag&&['ArrowUp','ArrowDown','Enter','Tab',' '].includes(e.key))))return;e.preventDefault();e.stopImmediatePropagation()},true));

/* ============ v4: every menu, popover and sheet uses the one card pattern ============
   Menus: glass card, a title row with a close button, section labels, rows with an icon and a name.
   Sheets: the same title row with close. The write / magnifier pad (a panel that stays) also minimises. */
const MICON={'Duplicate':'dup','Copy':'copy','Cut':'scissors','Delete':'trash','Paste':'clipboard','Paste box':'clipboard','Layout…':'layout','Box style…':'square','Colour':'palette','Back':'chevL','Heading':'h1','Checklist':'checks','Divider':'minus','Picture':'img','Line':'minus','Select':'typeic','Select all':'scan','Make card':'stack','Add to Summary':'anchor','Key point':'tag','Save to notes':'fdown','Bullets':'list','Numbers':'olist','Toggle':'toglist','Left':'alignL','Centre':'alignC','Right':'alignR','Justify':'alignJ','Title':'h1','Heading 1':'h1','Heading 2':'h1','Heading 3':'h1','Body':'typeic'};
const MTITLE={'Colour':'Text colour','Text colour':'Text colour','Size':'Text size','Style':'Text style','Align':'Align','List':'List','More':'More for this text'};
function openMenu(items,anchor,title){menuAnchor=anchor;R.menuAt=performance.now();menu.classList.add('glass','blur','cardmenu');items=items.slice();
 const back=items[0]&&/Back/.test(items[0].t||'');
 if(!title){const hi=items.findIndex(x=>x.h);if(hi===0||(back&&hi===1))title=items.splice(hi,1)[0].h}
 if(!title&&anchor&&anchor.classList){if(anchor.classList.contains('tab'))title='Box';else if(anchor.closest&&anchor.closest('#boxbar'))title='More for this box';else{const l=(anchor.getAttribute&&(anchor.getAttribute('aria-label')||''))||'';title=MTITLE[l]||''}}
 if(!title)title=items.some(x=>x.t==='Select all')?'Text':'Options';
 menu.innerHTML='<div class="ch"><strong class="h"></strong><button class="sq" data-mx aria-label="Close">✕</button></div><div class="cpane"></div>';
 $('.h',menu).textContent=title;$('[data-mx]',menu).onclick=()=>closeMenu();const pane=$('.cpane',menu);
 const size=items.length&&items.every(x=>x.h||/^\d+%$/.test(x.t||''));
 items.forEach(it=>{if(it.h){const h=document.createElement('div');h.className='clab';h.textContent=it.h;pane.append(h);return}
  const raw=it.t||'',sub=/▸\s*$/.test(raw),bk=/^‹\s*/.test(raw),name=raw.replace(/\s*▸\s*$/,'').replace(/^‹\s*/,'');
  const b=document.createElement('button');b.className='mrow2'+(it.on?' on':'')+(name==='Delete'?' dz':'');
  const pre=PRESETS.find(p=>p[1]===name),mine=!pre&&ST.presets.find(p=>p.name===name);
  let ic='';if(it.c)ic='<i class="mdot" style="background:'+it.c+'"></i>';else if(pre||mine)ic=bprev(pre?pre[2]:mine.v);else if(size)ic='<i class="msz" style="font-size:'+Math.round(9+parseInt(name)/22)+'px">A</i>';else if(MICON[name])ic=svg(MICON[name]);else ic='<i class="mnone"></i>';
  b.innerHTML=ic+'<span></span>'+(sub?svg('chevR'):it.on?svg('check2'):'');b.querySelector('span').textContent=name;if(bk)b.classList.add('bk');
  if(it.on)b.setAttribute('aria-current','true');if(it.dis)b.disabled=true;
  b.onclick=()=>{if(!it.keep)menu.classList.remove('show');it.f&&it.f()};pane.append(b)});
 const r=anchor.getBoundingClientRect();menu.classList.add('show');menu.style.maxHeight='';
 const below=innerHeight-r.bottom-18,above=r.top-18,up=below<240&&above>below;pane.style.maxHeight=Math.max(120,Math.min(420,(up?above:below)-60))+'px';
 const w=menu.offsetWidth,h=menu.offsetHeight;menu.style.top=(up?Math.max(8,r.top-6-h):r.bottom+6)+'px';menu.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+'px'}
/* sheets: the title becomes the card's title row, with close */
function openSheet(html,foot,fn){openSheet0(html,foot,fn);sheet.classList.remove('glass','blur');sheet.classList.add('cardsheet');sheet.classList.toggle('big',!!fn); /* a sheet you work in: the shell's fixed box. A question: a small centred dialog. */const h=sheet.firstElementChild;
 if(h&&h.tagName==='H3'){const d=document.createElement('div');d.className='ch shd';d.innerHTML='<strong></strong><button class="sq" data-act="close" aria-label="Close">✕</button>';d.firstChild.textContent=h.textContent;h.replaceWith(d)}}
/* the pad is a panel that stays: it minimises like every bar */
MINS.pad={on:()=>!padEl.hidden,label:()=>R.pad==='mag'?'Magnifier pad':'Write pad',ic:()=>R.pad==='mag'?'zin':'pencil',sh:()=>R.pad==='mag'?'Magnifier':'Write pad'};
if(typeof MutationObserver!=='undefined')new MutationObserver(()=>syncMin()).observe(padEl,{attributes:true,attributeFilter:['hidden']});

/* ============ v4: cards and sheets are sealed off from the page ============
   1 nothing done inside a card reaches the page; 2 the first tap outside only closes the card and is swallowed;
   3 card controls never take focus and the text selection survives them; 4 text fields in a card may take focus, and
   focus goes back to the box and caret afterwards; 5 scrolling inside a card never scrolls the page.
   Applies to cards, menus and sheets. Not to the slim pills and strips. */
const CARDSEL='#elcard,#acard,#ecard,#lcard,#laycard,#morecard,#begcard,#more,#sheet,.layfull';
const UISEL=CARDSEL+',#sh-rail,#sh-top,#sh-tabbar,#sh-pop,#sh-sheet,#sh-dialog,#sh-scrim,#bars,#selbar,#strip,#kbbar,#rbar,#pad,#kb,#toast,#bg,#tip,.sh-demo,.pmap,#showtb,#readpill';
const inCard=t=>!!(t&&t.closest&&t.closest(CARDSEL));
const isField=t=>!!(t&&t.matches&&t.matches('input,textarea,select'));
function cardOpen(){return!!((R.acard||R.ecard||R.lcard)&&(isPro()||R.tool==='pen'||R.tool==='text')&&R.optsOn&&$('#acard.show,#ecard.show,#lcard.show'))||LC.open||MC.open||menu.classList.contains('show')}
function closeCards(){if(R.acard||R.ecard||R.lcard){R.acard=false;R.ecard=false;R.lcard=false;renderOpts()}if(LC.open)layClose();if(MC.open)moreClose();if(menu.classList.contains('show'))closeMenu()}
/* 2: first tap outside closes and is swallowed (the pointer, the mouse and the click that follow it) */
let swallowTap=0;
document.addEventListener('pointerdown',e=>{if(!cardOpen()||(R.menuAt&&performance.now()-R.menuAt<350))return;const t=e.target;if(t.closest&&t.closest(UISEL))return;
 e.preventDefault();e.stopImmediatePropagation();swallowTap=performance.now();closeCards()},true);
['mousedown','mouseup','pointerup','click','touchstart','touchend'].forEach(n=>document.addEventListener(n,e=>{if(performance.now()-swallowTap>600)return;const t=e.target;if(t.closest&&t.closest(UISEL))return;
 if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();if(n==='click')swallowTap=0},true));
/* 3 + 4: controls keep the caret where it is; real text fields may take focus */
let fieldFrom=null;
document.addEventListener('mousedown',e=>{const t=e.target;if(!inCard(t))return;if(isField(t)){e.stopPropagation();return}e.preventDefault()},true);
document.addEventListener('focusin',e=>{if(inCard(e.target)&&isField(e.target)&&!fieldFrom&&R.last&&R.last.root.isConnected)fieldFrom={root:R.last.root,range:R.last.range.cloneRange()}},true);
function backToBox(force){const f=fieldFrom;fieldFrom=null;if(!f||!f.root.isConnected||R.reading)return;setTimeout(()=>{if(!force&&isField(document.activeElement)&&inCard(document.activeElement)){fieldFrom=f;return}
 f.root.focus({preventScroll:true});const s=getSelection();try{s.removeAllRanges();s.addRange(f.range)}catch(_){s.selectAllChildren(f.root);s.collapseToEnd()}R.last={root:f.root,range:f.range}},0)}
document.addEventListener('submit',e=>{if(inCard(e.target))backToBox()},true);
document.addEventListener('change',e=>{if(inCard(e.target)&&isField(e.target)&&e.target.type!=='text')backToBox(true)},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key==='Escape')&&inCard(e.target)&&isField(e.target))backToBox()},true);
document.addEventListener('focusout',e=>{if(fieldFrom&&inCard(e.target)&&isField(e.target))backToBox()},true);
{const cs0=closeSheet;closeSheet=function(){const was=sheet.classList.contains('show');cs0();if(was&&fieldFrom)backToBox()}}
/* 1: cards live outside the page element, so their taps and drags never reach it; rule 2 covers the page side.
   5: a wheel or a finger inside a card scrolls the card or nothing */
function cardCanScroll(t,c,dx,dy){let n=t;while(n){if(n.nodeType===1){const s=getComputedStyle(n);
   if(Math.abs(dy)>=Math.abs(dx)){if(/auto|scroll/.test(s.overflowY)&&n.scrollHeight>n.clientHeight+1&&((dy<0&&n.scrollTop>0)||(dy>0&&n.scrollTop<n.scrollHeight-n.clientHeight-1)))return true}
   else if(/auto|scroll/.test(s.overflowX)&&n.scrollWidth>n.clientWidth+1&&((dx<0&&n.scrollLeft>0)||(dx>0&&n.scrollLeft<n.scrollWidth-n.clientWidth-1)))return true}
  if(n===c)break;n=n.parentNode}return false}
document.addEventListener('wheel',e=>{const c=e.target.closest&&e.target.closest(CARDSEL);if(!c||e.ctrlKey)return;if(!cardCanScroll(e.target,c,e.deltaX,e.deltaY))e.preventDefault()},{passive:false,capture:true});
{let tp=null;document.addEventListener('touchstart',e=>{const t=e.touches[0];tp=t&&inCard(e.target)?{x:t.clientX,y:t.clientY}:null},{passive:true,capture:true});
 document.addEventListener('touchmove',e=>{if(!tp||isField(e.target))return;const t=e.touches[0],c=e.target.closest&&e.target.closest(CARDSEL);if(!t||!c)return;const dx=tp.x-t.clientX,dy=tp.y-t.clientY;tp={x:t.clientX,y:t.clientY};if(e.cancelable&&!cardCanScroll(e.target,c,dx,dy))e.preventDefault()},{passive:false,capture:true})}

/* ============ All tools > Text: a deliberate shortcut row (owner asked for it); every chip works ============ */
I.h2='<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>';
I.h3='<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>';
Object.assign(TOOLICON,{'Heading 1':'h1','Heading 2':'h2','Heading 3':'h3','Bullet list':'list','Numbered list':'olist','Checklist':'checks','Toggle list':'toglist','Bold':'bold','Italic':'italic','Underline':'underline','Strikethrough':'strike','Indent':'indent','Outdent':'outdent','Align left':'alignL','Align centre':'alignC','Align right':'alignR','Callout':'quote','Divider':'minus','Inline code':'code','Quote':'quote','Code block':'code'});
const TEXTACT={'Heading 1':()=>blockStyle('h2'),'Heading 2':()=>blockStyle('h3'),'Heading 3':()=>blockStyle('h4'),'Bullet list':()=>listCmd('bul'),'Numbered list':()=>listCmd('num'),'Checklist':()=>listCmd('chk'),'Toggle list':()=>listCmd('tog'),
 'Bold':()=>fmt('bold'),'Italic':()=>fmt('italic'),'Underline':()=>fmt('underline'),'Strikethrough':()=>fmt('strikeThrough'),
 'Indent':()=>{if(!focusTarget()){toast('Tap a text box first');return}document.execCommand('indent');flush()},'Outdent':()=>{if(!focusTarget()){toast('Tap a text box first');return}document.execCommand('outdent');flush()},
 'Align left':()=>fmt('justifyLeft'),'Align centre':()=>fmt('justifyCenter'),'Align right':()=>fmt('justifyRight'),
 'Callout':()=>tcardClick('kind','callout'),'Quote':()=>tcardClick('kind','quote'),'Code block':()=>tcardClick('kind','code'),
 'Divider':()=>{if(!focusTarget()){toast('Tap a text box first');return}document.execCommand('insertHorizontalRule');flush()},'Inline code':()=>wrapSel('code')};
function allAct(n){const m={Shapes:'shape',Ruler:'ruler',Tape:'tape',Magnifier:'magnifier'};
 if(TEXTACT[n]){if(R.tool!=='text'){const keep=R.last,sel=R.sel;setTool('text');if(sel&&sel.isConnected)select(sel);R.last=keep}TEXTACT[n]();return}
 if(m[n])insertAct(m[n]);else toast('Would do: '+n)}

/* ============ v4: All tools holds everything for Text and Pen (accepted repeat of the two pills), and is the ONLY home of shapes and aids ============
   A name starting with # is a small group label in the row. Chips show their state. Options that need a slider open the tool's More card at the right section. */
const penCard=sec=>()=>{if(R.tool!=='pen')setTool('pen');openPenAt(sec)};
const textCard=tab=>()=>{if(R.tool!=='text')setTool('text');if(tab==='box')ensureBox();R.ctab.text=tab;R.acard=true;R.optsOn=true;if(ST.min.opts)setMin('opts',false);R.tabIn=true;renderOpts();R.tabIn=false};
const inText=f=>()=>{if(R.tool!=='text'){const keep=R.last,sel=R.sel;setTool('text');if(sel&&sel.isConnected)select(sel);R.last=keep}f()};
const needT=f=>inText(()=>{if(!focusTarget()){toast('Tap a text box first');return}f()});
const lookChip=id=>{const p=PRESETS.find(x=>x[0]===id);return{ic:()=>bprev(p[2]),on:()=>!!curBox()&&sameV(p[2],curV()),f:inText(()=>{ensureBox();setStyle(p[2],true)})}};
const penType=n=>({ic:()=>svg({Fountain:'pen',Ball:'penLine',Brush:'pen',Pencil:'pencil',Marker:'hlight',Highlighter:'hlight'}[n]),on:()=>R.pen===n,f:()=>{if(R.tool!=='pen')setTool('pen');R.pen=n;renderOpts()}});
const penCol=(nm,c,hl)=>({ic:()=>'<i class="adot" style="background:'+(c==='auto'?'var(--ink)':c)+'"></i>',on:()=>(hl?R.hlCol:R.penCol)===c&&(R.pen==='Highlighter')===!!hl,f:()=>{if(R.tool!=='pen')setTool('pen');if(hl)R.hlCol=c;else R.penCol=c;renderOpts()}});
const penSize=n=>({ic:()=>'<svg class="ln" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16" style="stroke-width:'+({Fine:1.5,Medium:3,Bold:5.5}[n])+'"/></svg>',on:()=>R.pen==='Highlighter'?R.hlSize===n:(R.size===n&&PN.exact==null),f:()=>{if(R.tool!=='pen')setTool('pen');if(R.pen==='Highlighter')R.hlSize=n;else{R.size=n;PN.exact=null;save()}renderOpts()}});
const pnSet=(k,v,ic)=>({ic:()=>svg(ic),on:()=>PN[k]===v,f:()=>{PN[k]=v;save();if(R.tool!=='pen')setTool('pen');else renderOpts()}});
const pnSw=(k,ic)=>({ic:()=>svg(ic),on:()=>!!PN[k],f:()=>{PN[k]=!PN[k];save();renderOpts();toast(ACHIPNAME+(PN[k]?': on':': off'))}});
const shapeChip=(v,ic,msg)=>({ic:()=>svg(ic),on:()=>PN.shape===v,f:()=>{PN.shape=v;save();if(R.tool!=='pen')setTool('pen');else renderOpts();toast(v==='free'?'Pen draws freehand':msg||'Pen draws this shape now: drag on the page')}});
const paperChip=(k,ic)=>({ic:()=>svg(ic),on:()=>PN.paper===k,f:()=>{setPaper(k);renderOpts()}});
let ACHIPNAME='';
I.starl='<path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h11"/><path d="m4.5 4 .8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7L2 5.800l1.700-.2z"/><path d="m4.500 15 .8 1.600 1.700.2-1.200 1.200.3 1.700-1.600-.8-1.600.8.3-1.700L2 16.800l1.700-.2z"/>';
const ACHIP={
 /* Text */
 'Box style':{ic:()=>bprev(curV()),f:textCard('box')},'Plain look':lookChip('plain'),'Outline look':lookChip('outline'),'Soft card look':lookChip('soft'),'Sticky note look':lookChip('sticky'),'Callout look':lookChip('callout'),'Shadow card look':lookChip('shadow'),
 'Layout':{ic:()=>svg('layout'),f:textCard('layout')},'Two columns':{ic:()=>svg('layout'),f:inText(()=>{ensureBox();applyLayout('two')})},'Three columns':{ic:()=>svg('layout'),f:inText(()=>{ensureBox();applyLayout('three')})},'Auto width':{ic:()=>svg('fit'),f:inText(()=>{ensureBox();setWidth('auto')})},'Full width':{ic:()=>svg('fit'),f:inText(()=>{ensureBox();setWidth('wide')})},
 'Font':{ic:()=>'<i class="aaa">Aa</i>',f:textCard('text')},'Smaller text':{ic:()=>'<i class="aaa sm">A</i>',f:inText(()=>{ensureBox();setFs(-.1);renderOpts()})},'Larger text':{ic:()=>'<i class="aaa lg">A</i>',f:inText(()=>{ensureBox();setFs(.1);renderOpts()})},
 'Title':{ic:()=>svg('h1'),f:needT(()=>blockStyle('h1'))},'Body text':{ic:()=>svg('typeic'),f:needT(()=>blockStyle('div'))},
 'Star list':{ic:()=>svg('starl'),f:needT(()=>{listCmd('bul');const s=getSelection();let n=s.anchorNode;n=n&&(n.nodeType===3?n.parentElement:n);const ul=n&&n.closest?n.closest('ul'):null;if(ul){ul.classList.remove('chk');ul.classList.add('star');flush()}})},
 'Text colour':{ic:()=>svg('palette'),f:inText(()=>{const b=$('#allTabs .tab[data-t=Text]');openMenu([{h:'Text colour'},...PENCOL.map(([n,c])=>({t:n,c:c==='auto'?'var(--ink)':c,f:()=>fmt('foreColor',c==='auto'?css('--ink'):c)}))],b)})},
 'Highlight':{ic:()=>svg('hlight'),f:inText(()=>{const b=$('#allTabs .tab[data-t=Text]');openMenu([{h:'Highlight colour'},...HLCOL.map(([n,c])=>({t:n,c,f:()=>fmt('hiliteColor',hexA(c))}))],b)})},
 /* Pen */
 'Pen':penType('Fountain'),'Ballpoint':penType('Ball'),'Brush':penType('Brush'),'Pencil':penType('Pencil'),'Marker':penType('Marker'),'Highlighter':penType('Highlighter'),
 'Custom colour':{ic:()=>svg('plus'),f:penCard('colour')},'Favourites':{ic:()=>svg('star'),f:penCard('colour')},
 'Fine':penSize('Fine'),'Medium':penSize('Medium'),'Bold line':penSize('Bold'),'Exact thickness':{ic:()=>svg('sliders'),f:penCard('stroke')},
 'Solid':pnSet('ls','solid','minus'),'Dashed':pnSet('ls','dashed','minus'),'Dotted':pnSet('ls','dotted','dots9'),
 'Feel & pressure':{ic:()=>svg('sliders'),f:penCard('feel')},'Finger & gestures':{ic:()=>svg('lasso'),f:penCard('feel')},
 'Opacity':{ic:()=>svg('sliders'),f:penCard('stroke')},'Snap to text lines':{ic:()=>svg('typeic'),on:()=>!!HN.snap,f:()=>{HN.snap=!HN.snap;save();renderOpts()}},'Draw behind ink':{ic:()=>svg('layers'),on:()=>!!HN.behind,f:()=>{HN.behind=!HN.behind;save();renderOpts()}},
 'Layers':{ic:()=>svg('layers'),f:penCard('page')},'Blank paper':paperChip('blank','file'),'Lined paper':paperChip('lined','lines'),'Grid paper':paperChip('grid','grid'),'Dotted paper':paperChip('dots','dots9'),'Paper size & zoom':{ic:()=>svg('fit'),f:penCard('page')},'View as drawn':{ic:()=>svg('play'),f:()=>viewAsDrawn()},
 /* Shapes & aids: the only home */
 'Freehand':shapeChip('free','pen'),'Line':shapeChip('line','diagonal'),'Arrow':shapeChip('arrow','arrow'),'Box':shapeChip('box','square'),'Oval':shapeChip('oval','oval'),'Triangle':shapeChip('triangle','triangle'),'Tape':shapeChip('tape','tape','Pen draws Tape now: drag a strip over what you want to hide'),
 'Draw and hold':pnSw('hold','clock'),'Snap shapes':pnSw('snap','crosshair'),'Fill closed shapes':pnSw('fill','square'),
 'Ruler':{ic:()=>svg('ruler'),on:()=>!$('#ruler').hidden,f:()=>{if(R.tool!=='pen')setTool('pen');toggleRuler()}},'Magnifier':{ic:()=>svg('zin'),on:()=>R.pad==='mag',f:()=>{togglePad('mag');renderOpts()}}};
(function(){const pcol=()=>R.pen==='Highlighter'?HLCOL.map(([n,c])=>n+' highlight'):PENCOL.map(([n])=>n+' ink');
 PENCOL.forEach(([n,c])=>ACHIP[n+' ink']=penCol(n,c,false));HLCOL.forEach(([n,c])=>ACHIP[n+' highlight']=penCol(n,c,true));
 Object.defineProperty(ALLTABS,'Pen',{enumerable:true,configurable:true,get(){const hl=R.pen==='Highlighter';return['#Type','Pen','Ballpoint','Brush','Pencil','Marker','Highlighter','#Colour',...pcol(),'Custom colour','Favourites','#Size','Fine','Medium','Bold line',...(hl?['Opacity']:['Exact thickness']),'#Line','Solid','Dashed','Dotted',...(hl?['#Highlighter','Snap to text lines','Draw behind ink','Highlight eraser','Save to notes']:[]),'#Feel','Feel & pressure','Finger & gestures','#Page','Layers','Blank paper','Lined paper','Grid paper','Dotted paper','Paper size & zoom','View as drawn']}});
 ACHIP['Highlight eraser']={ic:()=>svg('eraser'),f:()=>{E.hlOnly=true;saveE();setTool('eraser');toast('Eraser limited to highlights')}};ACHIP['Save to notes']={ic:()=>svg('fdown'),f:()=>saveHighlights()};
 /* tab order: Text, Pen, then the rest */
 const rest={};Object.keys(ALLTABS).forEach(k=>{if(k!=='Text'&&k!=='Pen'){rest[k]=ALLTABS[k];delete ALLTABS[k]}});Object.assign(ALLTABS,rest);TABICON.Pen='pen';
 ALLTABS.Text=['#Box','Box style','Plain look','Outline look','Soft card look','Sticky note look','Callout look','Shadow card look','#Layout','Layout','Two columns','Three columns','Auto width','Full width','#Font','Font','Smaller text','Larger text','#Headings','Title','Heading 1','Heading 2','Heading 3','Body text','#Lists','Bullet list','Star list','Numbered list','Checklist','Toggle list','#Style','Bold','Italic','Underline','Strikethrough','Text colour','Highlight','#Paragraph','Indent','Outdent','Align left','Align centre','Align right','#Blocks','Quote','Callout','Code block','Inline code','Divider'];
 ALLTABS['Shapes & aids']=['#Draw as','Freehand','Line','Arrow','Box','Oval','Triangle','Tape','#Shape help','Draw and hold','Snap shapes','Fill closed shapes','#Aids','Ruler','Magnifier','Colour picker'];
 if(!ALLTABS[R.allTab])R.allTab='Text'})();
function allChip(n,row){if(n[0]==='#'){const s=document.createElement('span');s.className='alab';s.textContent=n.slice(1);row.append(s);return}
 const c=ACHIP[n],b=document.createElement('button'),on=!!(c&&c.on&&c.on());b.className='atool'+(on?' on':'');b.innerHTML=(c&&c.ic?c.ic():svg(TOOLICON[n]||'insert'))+'<span>'+n+'</span>';b.setAttribute('aria-label',n);if(c&&c.on)b.setAttribute('aria-pressed',on);
 b.onclick=()=>{R.allOpen=false;renderAll();$('#allChips').dataset.t=''; /* rebuilt with fresh state next time it opens */ACHIPNAME=n;if(c)c.f();else allAct(n)};row.append(b)}
/* Pen > More no longer holds shapes and aids */
CTABS.pen=CTABS.pen.filter(x=>x[0]!=='shapes');
{const pc0=penCardHtml;penCardHtml=function(){if(!CTABS.pen.some(x=>x[0]===R.ctab.pen))R.ctab.pen='stroke';return pc0().replace(/<section class="csec" data-sec="shapes"[\s\S]*?<\/section>/,'')}}

/* ============ Beginner: one small Shapes button on the toolbar, and a simple card with the essentials ============ */
const BC={open:false};
const begcard=document.createElement('div');begcard.id='begcard';begcard.className='pop col ecard laycard begcard glass blur nofocus anim';begcard.setAttribute('role','dialog');begcard.setAttribute('aria-label','Shapes and drawing aids');begcard.setAttribute('aria-hidden','true');document.body.append(begcard);
const BSHAPES=[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Rectangle','square'],['oval','Circle','oval']];
function begClose(){BC.open=false;begcard.classList.remove('show');begcard.setAttribute('aria-hidden','true')}
function begShapes(){if(BC.open){begClose();return}closeCards();BC.open=true;renderBeg()}
function renderBeg(){if(!BC.open)return;const a=$('#tb [data-id=shapes]');if(!a){begClose();return}
 begcard.innerHTML='<div class="ch"><strong>Shapes</strong><button class="sq" data-g="x" aria-label="Close">\u2715</button></div><div class="cpane">'+clab('Draw as')+'<div class="tiles" role="radiogroup" aria-label="Draw as">'+BSHAPES.map(([v,n,ic])=>'<button class="tile'+(PN.shape===v?' on':'')+'" role="radio" aria-checked="'+(PN.shape===v)+'" data-g="shape" data-v="'+v+'" aria-label="'+n+'">'+svg(ic)+'<span>'+n+'</span></button>').join('')+'</div>'+
  clab('Aid')+'<button class="mrow" role="switch" aria-checked="'+!$('#ruler').hidden+'" data-g="ruler" aria-label="Ruler">'+svg('ruler')+'<span class="mt"><b>Ruler</b><i>A straight edge on the page. The pen follows it.</i></span><span class="sw2" aria-hidden="true"></span></button>'+enote('Pick a shape, then drag on the page. Freehand goes back to normal drawing.')+'</div>';
 begcard.classList.add('show');begcard.setAttribute('aria-hidden','false');const r=a.getBoundingClientRect(),w=begcard.offsetWidth;begcard.style.top=(r.bottom+8)+'px';begcard.style.left=Math.max(8,Math.min(r.left+r.width/2-w/2,innerWidth-w-8))+'px'}
begcard.addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;const k=b.dataset.g;
 if(k==='x')begClose();
 else if(k==='shape'){PN.shape=b.dataset.v;save();if(R.tool!=='pen')setTool('pen');else renderOpts();begMark();begClose();toast(PN.shape==='free'?'Pen draws freehand':'Drag on the page to draw the '+b.getAttribute('aria-label').toLowerCase())}
 else if(k==='ruler'){if(R.tool!=='pen')setTool('pen');toggleRuler();begMark();renderBeg()}});
function begMark(){const b=$('#tb [data-id=shapes]');if(b)b.classList.toggle('on',(PN.shape&&PN.shape!=='free')||!$('#ruler').hidden)}
function begShapesBtn(){if($('#tb [data-id=shapes]'))return;const after=$('#tb .tools [data-id=eraser]')||$('#tb .tools [data-id=pen]');if(!after)return;
 const b=document.createElement('button');b.className='ic';b.dataset.id='shapes';b.dataset.tip='Draw shape';b.setAttribute('aria-label','Draw shape');b.innerHTML=svg('shapes')+'<span class="name">Draw shape</span>';b.onclick=e=>{e.stopPropagation();begShapes()};after.after(b);begMark();const sc=$('#tb .tools');if(sc)sc.dispatchEvent(new Event('scroll'))}
{const rt0=renderToolbar;renderToolbar=function(){rt0();if(BC.open)begClose();begShapesBtn()}}
{const us0=updateStates;updateStates=function(){us0();begMark()}}
{const co=cardOpen,cc=closeCards;cardOpen=function(){return co()||BC.open};closeCards=function(){cc();if(BC.open)begClose()}}
document.addEventListener('pointerdown',e=>{if(!BC.open)return;const t=e.target;if(begcard.contains(t)||(t.closest&&t.closest('#tb [data-id=shapes],#toast')))return;if(!(t.closest&&t.closest(UISEL)))return;begClose()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&BC.open)begClose()});

/* ============ v5: boot state, mode sync, Undo/Redo in the top bar ============ */
function shMode(){return($('#app')||{dataset:{}}).dataset.mode||'beg'}
function v5Boot(){
 try{if(Shell.icons()!=='A')Shell.icons('A')}catch(_){} /* icon set A is fixed: no switcher */
 // Night is the default look for a new person; the mode follows the layout (a fresh load = Beginner)
 try{const s=JSON.parse(localStorage.getItem('ln-shell-v1')||'{}');if(!s.theme)Shell.setTheme('Night')}catch(_){}
 Shell.setMode(isPro()?'pro':'beg');
 moveHist();updateStates();syncMin();startPulse();
}
/* Undo and Redo live in the shell's top bar, once. The toolbar builds them; they are moved up (handlers and state stay). */
function moveHist(){const t=$('#sh-top'),hs=$('#tb .hist');if(!t||!hs)return;const old=$('.hist',t);if(old)old.remove();
 const a=t.querySelector('[data-sh-search]');t.insertBefore(hs,a);hs.classList.add('tophist')}
{const rt0=renderToolbar;renderToolbar=function(){rt0();tb.insertAdjacentHTML('beforeend',minHtml('main'));
 if(shellReady){const m=isPro()?'pro':'beg';if(shMode()!==m)Shell.setMode(m);moveHist();syncMin()}}}
/* enabled state of the two top-bar buttons comes from the shared Shell.history (the toolbar keeps its own click wiring) */
const SHH=Shell.history({undo:()=>undo(),redo:()=>redo(),can:()=>[hi>0,hi<hist.length-1],click:false,keys:false,disCls:'dis',els:()=>({undo:$('#tb .hist .ic[data-id=undo]'),redo:$('#tb .hist .ic[data-id=redo]')})});
{const us0=updateStates;updateStates=function(){us0();SHH.sync()}}

/* ============ v5: ONE minimise component, the same in every floating bar ============
   44 px, arrow-to-edge icon, accent ring, at the END of the bar after a separator. Until it has been used once, a gentle pulse
   re-highlights it every 3 minutes (window.__pulseMinimise() runs it now). Reduced motion: a still ring instead. */
MINS.main={on:()=>!document.body.classList.contains('tbhidden')&&!R.reading,label:()=>'Main bar',ic:()=>'pen',sh:()=>'Tools'};
const PULSE={t:null,off:null};
{const sm0=setMin;setMin=function(key,on){if(on&&!ST.minUsed){ST.minUsed=1;$$('.minb.pulse').forEach(b=>b.classList.remove('pulse'));clearInterval(PULSE.t)}return sm0(key,on)}}
function minVisible(b){const s=getComputedStyle(b);return b.getClientRects().length>0&&s.visibility!=='hidden'&&!b.closest('[aria-hidden=true]')}
function pulseMinimise(){if(ST.minUsed)return 0;const vis=$$('.minb').filter(minVisible);vis.forEach(b=>b.classList.add('pulse'));
 if(vis[0])showTip(vis[0]);
 clearTimeout(PULSE.off);PULSE.off=setTimeout(()=>{$$('.minb.pulse').forEach(b=>b.classList.remove('pulse'));tip.hidden=true},4200);return vis.length}
function startPulse(){clearInterval(PULSE.t);if(!ST.minUsed)PULSE.t=setInterval(pulseMinimise,180000)}
window.__pulseMinimise=pulseMinimise;

/* a card never runs under the phone tab bar or past the bottom of the screen: its scrolling part takes what room is left */
function fitCard(el){if(!el||!el.classList.contains('show')||pillEdge()==='bottom')return;const pane=$('.cpane',el);if(!pane)return;
 pane.style.maxHeight='';const r=el.getBoundingClientRect(),tab=innerWidth<=640?(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sh-tabbar'))||56)+12:0;
 const extra=el.offsetHeight-pane.offsetHeight,room=innerHeight-tab-r.top-extra-10;if(room<pane.scrollHeight)pane.style.maxHeight=Math.max(140,Math.floor(room))+'px'}

/* ============ v5: Beginner Pen card ============
   Opens from "More" on the Beginner pen pill. A live stroke preview, labelled pen types, size, colour, Pressure and Stabilisation,
   then a short Settings list (Pen settings, Writing aids, Math assist) that opens the fuller pane inside the same card.
   It reuses the Professional state (PN, HN, R) so nothing is stored twice. */
Object.assign(I,{chevR:'<path d="m9 18 6-6-6-6"/>',sticker:'<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v6h6"/><path d="M8.5 13h.01"/><path d="M15.5 13h.01"/><path d="M9.5 16.5s.9 1.2 2.5 1.2 2.5-1.2 2.5-1.2"/>',
 sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',info2:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>'});
const BP={view:'main'};
const BPVIEWS={pen:['Pen settings','Thickness, line style, tip','sliders'],aids:['Writing aids','Finger, gestures, smoother lines','wave'],math:['Math assist','Draw as shapes, ruler, magnifier','ruler']};
const bpOn=()=>!isPro()&&R.tool==='pen'&&R.acard&&R.optsOn&&!R.reading&&!R.tbHidden;
/* the stroke: a hand-drawn wave. Stabilisation calms the shake, Pressure thickens the middle, type and colour and size change the look. */
function bpStroke(){const isHl=R.pen==='Highlighter',k=TYPEK[R.pen],c=PN,W=300,H=84,N=56;
 const col=isHl?R.hlCol:(R.penCol==='auto'?'var(--ink)':R.penCol);
 let base=isHl?(HLW[R.hlSize]||16)*1.15:(c.exact!=null?c.exact:SIZES[R.size])*1.6;
 if(k==='pencil')base*=.8;if(k==='brush')base*=1.25;if(k==='marker')base*=1.5;
 const shake=1-c.smooth/100,pr=(!isHl&&c.pOn)?c.press/100:0,pts=[];
 for(let i=0;i<=N;i++){const t=i/N,x=16+t*(W-32),tr=shake*.7*(Math.sin(t*71)*3.2+Math.sin(t*43+1)*2.4+Math.sin(t*131+2)*1.4);
  pts.push([x,H/2+Math.sin(t*Math.PI*2.3+.5)*H*.24+tr,t])}
 const varW=(k==='pen'||k==='brush');let d='',o={};
 if(varW&&c.ls==='solid'){const L=[],Rr=[];
  pts.forEach((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(N,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,w=Math.max(.6,base*(1+pr*1.5*(Math.sin(Math.PI*p[2])-.5)))/2;
   L.push([p[0]-dy/n*w,p[1]+dx/n*w]);Rr.push([p[0]+dy/n*w,p[1]-dx/n*w])});
  d='M'+L.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+'L'+Rr.reverse().map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+'Z';
  o={fill:col,stroke:col,'stroke-width':.8,'stroke-linejoin':'round',opacity:k==='brush'?.92:1}}
 else{d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
  o={fill:'none',stroke:col,'stroke-width':base.toFixed(1),'stroke-linecap':(k==='marker'||isHl)?'butt':'round','stroke-linejoin':'round',opacity:isHl?(HN.op/100):(k==='pencil'?.8:1)};
  if(c.ls==='dashed')o['stroke-dasharray']=(base*2.6).toFixed(1)+' '+(base*2).toFixed(1);if(c.ls==='dotted')o['stroke-dasharray']='0.1 '+(base*1.9).toFixed(1),o['stroke-linecap']='round'}
 return{d,o}}
function bpApply(){const p=$('#bpStroke',acard);if(!p)return;const s=bpStroke();p.setAttribute('d',s.d);['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','stroke-dasharray'].forEach(a=>{if(s.o[a]!=null)p.setAttribute(a,s.o[a]);else p.removeAttribute(a)})}
function bpPreview(){const s=bpStroke(),at=Object.entries(s.o).map(([k,v])=>k+'="'+v+'"').join(' ');
 return'<svg class="bpprev" id="bpPrev" viewBox="0 0 300 84" role="img" aria-label="Preview of the current pen"><path class="bpg" d="M10 28h280M10 56h280"/><path id="bpStroke" d="'+s.d+'" '+at+'/></svg>'}
function bpCard(){const isHl=R.pen==='Highlighter',c=PN,hn=HN,cur=isHl?R.hlCol:R.penCol,sizeNow=isHl?R.hlSize:R.size;let h='';
 const view=BP.view;
 const head=(t,back)=>'<div class="ch">'+(back?'<button class="sq" data-bp="back" aria-label="Back to Pen">'+svg('chevL')+'</button>':'')+'<strong>'+t+'</strong><button class="sq" data-a="close" aria-label="Close">✕</button></div>';
 const S=(o,k,l,on)=>swr('data-a="sw" data-o="'+o+'" data-k="'+k+'"',l,on);
 const pset=(k,arr,label,cls)=>group(label,cls,arr.map(([v,n,ic])=>chip('data-a="set" data-o="pn" data-k="'+k+'" data-v="'+v+'"',n,c[k]===v,ic)).join(''));
 if(view==='main'){
  h+=bpPreview();
  h+=clab('Pen type')+'<div class="tiles bptiles" role="radiogroup" aria-label="Pen type">'+PTYPES.map(n=>{const k=TYPEK[n],on=R.pen===n;return'<button class="tile'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-bp="type" data-v="'+n+'" aria-label="'+pname(n)+'"><span class="pi">'+penSvg(k,n==='Highlighter'?R.hlCol:(R.penCol==='auto'?'var(--ink)':R.penCol))+'</span><span>'+pname(n)+'</span></button>'}).join('')+'</div>';
  if(isHl)h+=clab('Feel')+slr('hop','Strength',20,90,5,hn.op,SLF.hop)+enote('How strongly the highlight covers the page.');
  else h+=clab('Feel')+slr('press','Pressure',0,100,5,c.pOn?c.press:0,SLF.press)+enote('Press harder for a thicker line.')+slr('smooth','Stabilisation',0,100,5,c.smooth,SLF.smooth)+enote('Smooths out a shaky hand.');
  h+=clab('Settings')+Object.entries(BPVIEWS).map(([k,[n,sub,ic]])=>'<button class="mrow" data-bp="go" data-v="'+k+'" aria-label="'+n+'">'+svg(ic)+'<span class="mt"><b>'+n+'</b><i>'+sub+'</i></span>'+svg('chevR')+'</button>').join('');
  return head(pname(R.pen))+'<div class="cpane" role="group" aria-label="Pen">'+h+'</div>'}
 if(view==='pen'){
  h+=bpPreview();
  if(isHl)h+=clab('Strength')+slr('hop','Opacity',20,90,5,hn.op,SLF.hop)+clab('On the page')+S('hn','snap','Snap to text lines',hn.snap)+S('hn','behind','Draw behind ink',hn.behind);
  else{h+=clab('Thickness')+slr('exact','Exact thickness',0.5,30,0.5,c.exact!=null?c.exact:SIZES[R.size],SLF.exact);if(c.exact!=null)h+=abtn('data-a="use3"','Use the 3 sizes','sliders');
   h+=clab('Line')+mchip('ls','Line style',LS_N[c.ls]||'Solid','minus')+clab('Tip')+slr('sharp','Tip sharpness',0,100,5,c.sharp,SLF.sharp)+(R.pen==='Fountain'?slr('flat','Flatness',0,100,5,c.flat,SLF.flat):'')+S('pn','tilt','Tilt widens the line',c.tilt)+S('pn','speed','Thickness by speed',c.speed)}
  return head('Pen settings',1)+'<div class="cpane" role="group" aria-label="Pen settings">'+h+'</div>'}
 if(view==='aids'){
  h+=clab('Finger can draw')+pset('finger',[['auto','Automatic'],['always','Always'],['never','Never']],'Finger can draw')+clab('Gestures')+S('pn','scribble','Scribble to erase',c.scribble)+S('pn','c2l','Circle to lasso',c.c2l)+clab('Speed')+S('pn','latency','Reduce latency',c.latency)+enote('Smoother ink on a slower device. It can use more battery.');
  return head('Writing aids',1)+'<div class="cpane" role="group" aria-label="Writing aids">'+h+'</div>'}
 h+=clab('Draw as')+pset('shape',[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Box','square'],['oval','Oval','oval'],['triangle','Triangle','triangle'],['tape','Tape','tape']],'Draw as','four')+clab('Aids')+swr('data-a="ruler"','Ruler',!$('#ruler').hidden)+swr('data-a="magnifier"','Magnifier',R.pad==='mag')+enote('Pick a shape, then drag on the page. Freehand goes back to normal drawing.');
 return head('Math assist',1)+'<div class="cpane" role="group" aria-label="Math assist">'+h+'</div>'}
acard.addEventListener('click',e=>{const b=e.target.closest('[data-bp]');if(!b||!bpOn())return;const k=b.dataset.bp,v=b.dataset.v,isHl=R.pen==='Highlighter';
 if(k==='type')R.pen=v;
 else if(k==='size'){if(isHl)R.hlSize=v;else{R.size=v;PN.exact=null;save()}}
 else if(k==='col'){if(isHl)R.hlCol=v;else R.penCol=v}
 else if(k==='go'){BP.view=v;R.tabIn=true}
 else if(k==='back'){BP.view='main';R.tabIn=true}
 renderOpts();R.tabIn=false;const p=$('.cpane',acard);if(p&&(k==='go'||k==='back'))p.scrollTop=0});
acard.addEventListener('input',e=>{if(!bpOn())return;const r=e.target.closest('[data-r]');if(!r)return;if(r.dataset.r==='press')PN.pOn=+r.value>0;bpApply()});
acard.addEventListener('change',e=>{if(!bpOn())return;const r=e.target.closest('[data-r]');if(r&&r.dataset.r==='press')save()});
/* the card, in place of the Professional one, while the person is a Beginner */
{const ra0=renderAcard;renderAcard=function(){
 if(!bpOn()){acard.classList.remove('bpen');if(BP.view!=='main'&&!R.acard)BP.view='main';return ra0()}
 acard.classList.add('show','bpen');acard.setAttribute('aria-hidden','false');if(acard.dataset.for!=='pen'){acard.dataset.for='pen';acard.innerHTML=''}acard.dataset.open='1';
 fillCard(acard,bpCard());placeCard(acard);fitCard(acard)}}

/* ============ v5: Beginner Draw shape card: tiny ============
   One main switch. "Advanced options" opens two more. The shape list, ruler and magnifier stay one step away (Pen card > Math assist).
   Professional keeps every shape option in Pen > More and in All tools > Shapes & aids. */
const BS={adv:false};
function renderBeg(){if(!BC.open)return;const a=$('#tb [data-id=shapes]');if(!a){begClose();return}
 const sw=(k,t,sub,on)=>'<button class="mrow" role="switch" aria-checked="'+!!on+'" data-g="'+k+'" aria-label="'+t+'"><span class="mt"><b>'+t+'</b>'+(sub?'<i>'+sub+'</i>':'')+'</span><span class="sw2" aria-hidden="true"></span></button>';
 begcard.innerHTML='<div class="ch"><strong>Draw shape</strong><button class="sq" data-g="x" aria-label="Close">✕</button></div><div class="cpane">'+
  sw('hold','Draw shape','Hold your pen still at the end of a line and it snaps to a clean shape.',PN.hold)+
  '<button class="abtn disc" data-g="adv" aria-expanded="'+BS.adv+'">'+svg('sliders')+'<span>Advanced options</span>'+svg('chevD')+'</button>'+
  (BS.adv?'<div class="bsadv">'+sw('snap','Snap shapes','Corners and edges line up with each other.',PN.snap)+sw('fill','Fill closed shapes','Boxes, circles and triangles are filled with colour.',PN.fill)+'</div>':'')+
  '<button class="mrow bsmore" data-g="more" aria-label="Pick a shape or use the ruler">'+svg('shapes')+'<span class="mt"><b>Pick a shape or use the ruler</b></span>'+svg('chevR')+'</button></div>';
 begcard.classList.add('show');begcard.setAttribute('aria-hidden','false');const r=a.getBoundingClientRect(),w=begcard.offsetWidth;begcard.style.top=(r.bottom+8)+'px';begcard.style.left=Math.max(8,Math.min(r.left+r.width/2-w/2,innerWidth-w-8))+'px'}
begcard.addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;const k=b.dataset.g;
 if(k==='hold'||k==='snap'||k==='fill'){PN[k]=!PN[k];save();renderBeg()}
 else if(k==='adv'){BS.adv=!BS.adv;renderBeg()}
 else if(k==='more'){begClose();if(R.tool!=='pen')setTool('pen');BP.view='math';R.acard=true;R.tabIn=true;renderOpts();R.tabIn=false}});

/* ============ v5: Elements (stickers, arrows, emoji, badges, animated GIFs) ============
   Insert > Elements opens one card: header with Edit, search, category tabs, a grid of previews. Tap = it lands on the page (drag it like any object).
   Edit: move up/down, rename, delete (with Undo), Add your own. A "Recent elements" row sits in All tools > Shapes & aids. */
const ES=(p,c)=>'<svg viewBox="0 0 24 24" class="elsvg" style="color:'+c+'" aria-hidden="true">'+p+'</svg>';
const EP={bulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
 alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',ques:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
 ok:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
 book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',goal:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 aR:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',aL:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',aU:'<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',aD:'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
 aBent:'<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',aCurve:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
 aDiag:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',aLoop:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
 heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
 spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>'};
const EB=(t,c)=>'<span class="elbadge" style="--bc:'+c+'">'+t+'</span>';
const EE=g=>'<span class="elemo" aria-hidden="true">'+g+'</span>';
/* [category, id, name, search words, preview/object html, width on the page] */
const ELB=[
 ['Study','bulb','Big idea','light lamp think',ES(EP.bulb,'#f0b94a'),72],['Study','warn','Warning','important alert careful',ES(EP.alert,'#ef7a6f'),72],['Study','ques','Question','help ask why',ES(EP.ques,'#5aa9ff'),72],
 ['Study','well','Well done','check tick correct yes',ES(EP.ok,'#4cc38a'),72],['Study','fav','Favourite','star best',ES(EP.star,'#f0b94a'),72],['Study','book','Book','read study',ES(EP.book,'#a48df5'),72],
 ['Study','goal','Goal','target aim',ES(EP.goal,'#ef7a6f'),72],['Study','time','Deadline','clock time due',ES(EP.clock,'#9a98a8'),72],
 ['Arrows','aR','Arrow right','next',ES(EP.aR,'#5aa9ff'),72],['Arrows','aL','Arrow left','back',ES(EP.aL,'#5aa9ff'),72],['Arrows','aU','Arrow up','increase',ES(EP.aU,'#4cc38a'),72],['Arrows','aD','Arrow down','decrease',ES(EP.aD,'#ef7a6f'),72],
 ['Arrows','aB','Bent arrow','turn then',ES(EP.aBent,'#a48df5'),72],['Arrows','aC','Curved arrow','undo back',ES(EP.aCurve,'#a48df5'),72],['Arrows','aG','Diagonal arrow','grow',ES(EP.aDiag,'#f0b94a'),72],['Arrows','aP','Loop arrows','repeat cycle',ES(EP.aLoop,'#4cc38a'),72],
 ['Emoji','e1','Smile','happy face',EE('\u{1F600}'),64],['Emoji','e2','Love it','heart eyes',EE('\u{1F60D}'),64],['Emoji','e3','Party','celebrate',EE('\u{1F389}'),64],['Emoji','e4','Thumbs up','good yes',EE('\u{1F44D}'),64],
 ['Emoji','e5','On fire','hot',EE('\u{1F525}'),64],['Emoji','e6','Brain','think smart',EE('\u{1F9E0}'),64],['Emoji','e7','Rocket','fast launch',EE('\u{1F680}'),64],['Emoji','e8','Wow','amazed star',EE('\u{1F929}'),64],
 ['Badges','b1','Must know','important exam',EB('Must know','#ef7a6f'),120],['Badges','b2','Revise','review again',EB('Revise','#5aa9ff'),100],['Badges','b3','Easy','simple',EB('Easy','#4cc38a'),84],['Badges','b4','Hard','difficult',EB('Hard','#f0b94a'),84],
 ['Badges','b5','Exam','test',EB('Exam','#a48df5'),84],['Badges','b6','New','fresh',EB('New','#5aa9ff'),76],['Badges','b7','Mastered','done learned',EB('Mastered','#4cc38a'),110],['Badges','b8','Tricky','careful',EB('Tricky','#ef7a6f'),92],
 ['GIFs','g1','Spinning star','animated turn',ES(EP.star,'#f0b94a').replace('class="elsvg"','class="elsvg gspin"'),80],['GIFs','g2','Beating heart','animated love',ES(EP.heart,'#ef7a6f').replace('class="elsvg"','class="elsvg gbeat"'),80],
 ['GIFs','g3','Bouncing ball','animated',' <span class="gball" aria-hidden="true"></span>',64],['GIFs','g4','Sparkles','animated shine',ES(EP.spark,'#f0b94a').replace('class="elsvg"','class="elsvg gtwinkle"'),80],
 ['GIFs','g5','Waving hand','animated hello',EE('\u{1F44B}').replace('elemo','elemo gwave'),72],['GIFs','g6','Confetti','animated party',' <span class="gconf" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>',80]
].map(([cat,id,name,kw,html,w])=>({cat,id:'el-'+id,name,kw,html,w}));
const ELCATS=['Recent','Study','Arrows','Emoji','Badges','GIFs','Mine'];
{const had=!!ST.el;ST.el=Object.assign({recent:[],order:{},names:{},gone:[],mine:[]},ST.el||{});if(!had)ST.el.recent=['el-bulb','el-ques','el-well','el-goal']}
const EL={open:false,cat:'Study',q:'',edit:false};
const elAll=()=>ELB.concat(ST.el.mine.map(m=>Object.assign({},m,{cat:'Mine'}))).map(x=>Object.assign({},x,{name:ST.el.names[x.id]||x.name}));
const elFind=id=>elAll().find(x=>x.id===id);
const elList=cat=>{const all=elAll().filter(x=>x.cat===cat&&!ST.el.gone.includes(x.id)),ord=ST.el.order[cat]||[];
 return all.sort((a,b)=>{const ia=ord.indexOf(a.id),ib=ord.indexOf(b.id);return(ia<0?999:ia)-(ib<0?999:ib)})};
const elRecent=()=>ST.el.recent.map(elFind).filter(x=>x&&!ST.el.gone.includes(x.id));
const elVisible=()=>{const q=EL.q.trim().toLowerCase();
 if(q)return elAll().filter(x=>!ST.el.gone.includes(x.id)&&(x.name+' '+(x.kw||'')+' '+x.cat).toLowerCase().includes(q));
 return EL.cat==='Recent'?elRecent():elList(EL.cat)};
const elcard=document.createElement('div');elcard.id='elcard';elcard.className='pop col ecard acard glass blur nofocus';elcard.setAttribute('role','dialog');elcard.setAttribute('aria-label','Elements');elcard.setAttribute('aria-hidden','true');$('#bars').append(elcard);
const elFile=document.createElement('input');elFile.type='file';elFile.accept='image/*';elFile.hidden=true;elFile.id='elFile';elFile.setAttribute('aria-label','Choose a picture');document.body.append(elFile);
const elTile=(x)=>'<button class="eltile'+(x.cat==='GIFs'?' isgif':'')+'" role="listitem" data-el="ins" data-id="'+x.id+'" aria-label="'+esc(x.name)+'"><span class="elprev">'+x.html+'</span><span class="elname">'+esc(x.name)+'</span></button>';
function elRows(items){const isR=EL.cat==='Recent'&&!EL.q.trim();
 return items.map((x,i)=>'<div class="elrow" role="listitem" data-id="'+x.id+'"><span class="elprev">'+x.html+'</span><span class="elname">'+esc(x.name)+'</span>'+
  (isR?'':'<button class="sq" data-el="up" data-id="'+x.id+'" aria-label="Move '+esc(x.name)+' earlier"'+(i===0?' disabled':'')+'>'+svg('up')+'</button><button class="sq" data-el="down" data-id="'+x.id+'" aria-label="Move '+esc(x.name)+' later"'+(i===items.length-1?' disabled':'')+'>'+svg('down')+'</button><button class="sq" data-el="ren" data-id="'+x.id+'" aria-label="Rename '+esc(x.name)+'">'+svg('pencil')+'</button>')+
  '<button class="sq dz" data-el="del" data-id="'+x.id+'" aria-label="Delete '+esc(x.name)+'">'+svg('trash')+'</button></div>').join('')}
function elGrid(){const g=$('#elPane',elcard);if(!g)return;g.style.maxHeight='';const items=elVisible(),q=EL.q.trim();let h='';
 if(!items.length)h='<p class="elempty">'+(q?'No elements match “'+esc(q)+'”. Try another word.':EL.cat==='Recent'?'Elements you use show up here.':EL.cat==='Mine'?'Nothing of your own yet.':'Nothing here. Elements you delete can come back with Undo, or add your own.')+'</p>';
 else h=EL.edit?'<div class="ellist" role="list">'+elRows(items)+'</div>':'<div class="elgrid" role="list">'+items.map(elTile).join('')+'</div>';
 if(EL.edit&&EL.cat==='Recent'&&!q)h+=enote('Recent follows what you use. Delete removes an element from this list only.');
 if((EL.edit||EL.cat==='Mine')&&!q)h+='<button class="abtn" data-el="add">'+svg('plus')+'<span>Add your own</span><small>a picture from your device</small></button>';
 g.innerHTML=h;fitCard(elcard);
 const c=$('#elClr',elcard);if(c)c.hidden=!EL.q;
 $$('.ctab',elcard).forEach(t=>{const on=!q&&t.dataset.cat===EL.cat;t.classList.toggle('on',on);t.setAttribute('aria-selected',on)})}
function elHtml(){
 return'<div class="ch"><strong>Elements</strong><button class="edbtn'+(EL.edit?' on':'')+'" data-el="edit" aria-pressed="'+EL.edit+'">'+(EL.edit?'Done':'Edit')+'</button><button class="sq" data-el="close" aria-label="Close">✕</button></div>'+
  '<div class="elsearch">'+svg('search')+'<input id="elQ" type="text" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search elements" aria-label="Search elements" value="'+esc(EL.q)+'"><button class="elclr" id="elClr" data-el="clr" aria-label="Clear search"'+(EL.q?'':' hidden')+'>'+svg('xmark')+'</button></div>'+
  '<div class="ctabs" role="tablist" aria-label="Element categories">'+ELCATS.map(c=>'<button class="ctab" role="tab" data-cat="'+c+'" aria-selected="false">'+c+'</button>').join('')+'</div>'+
  '<div class="cpane elpane" id="elPane" role="tabpanel"></div>'}
function renderEl(){if(EL.open&&R.acard)EL.open=false;
 const on=EL.open&&R.tool==='insert'&&R.optsOn&&!R.reading&&!R.tbHidden;elcard.classList.toggle('show',on);elcard.setAttribute('aria-hidden',!on);
 if(!on){if(!EL.open)EL.edit=false;return}
 const q=$('#elQ',elcard),had=q&&document.activeElement===q,ss=q?q.selectionStart:0;
 fillCard(elcard,elHtml());elGrid();placeCard(elcard);fitCard(elcard);
 if(had){const n=$('#elQ',elcard);n.focus();try{n.setSelectionRange(ss,ss)}catch(_){}}}
function elOpen(on){if(on===undefined)on=!EL.open;EL.open=on;if(on){R.acard=false;R.ecard=false;R.lcard=false;EL.cat=elRecent().length?'Recent':'Study';EL.q='';EL.edit=false;if(!R.optsOn)R.optsOn=true;if(ST.min.opts)setMin('opts',false)}renderOpts()}
function elNoteRecent(id){ST.el.recent=[id,...ST.el.recent.filter(x=>x!==id)].slice(0,10);save();ACHIPS_refresh()}
function elInsert(id){const it=elFind(id);if(!it)return;
 if(['pen','eraser','lasso','read'].includes(R.tool))setTool('text',true);
 const s=freeSpot(),b=makeBox({t:'pic',x:s.x,y:s.y,w:(it.w||72)+'px',size:'body',st:'none',h:'<div class="pic el" data-el="'+it.id+'" role="img" aria-label="'+esc(it.name)+'">'+it.html+'</div>'});
 select(b);commit();elNoteRecent(id);if(EL.open)elGrid()}
/* the card's own taps */
elcard.addEventListener('click',e=>{const b=e.target.closest('[data-el],[data-cat]');if(!b)return;
 if(b.dataset.cat){EL.cat=b.dataset.cat;EL.q='';const q=$('#elQ',elcard);if(q)q.value='';elGrid();const p=$('#elPane',elcard);if(p)p.scrollTop=0;return}
 const k=b.dataset.el,id=b.dataset.id;
 if(k==='close'){elOpen(false)}
 else if(k==='ins'){elInsert(id)}
 else if(k==='edit'){EL.edit=!EL.edit;renderEl()}
 else if(k==='clr'){EL.q='';const q=$('#elQ',elcard);if(q){q.value='';q.focus()}elGrid()}
 else if(k==='add'){elFile.value='';elFile.click()}
 else if(k==='up'||k==='down'){const cat=EL.cat,ids=elList(cat).map(x=>x.id),i=ids.indexOf(id),j=k==='up'?i-1:i+1;if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];ST.el.order[cat]=ids;save();elGrid();const nb=$('[data-el="'+k+'"][data-id="'+id+'"]',elcard);if(nb&&!nb.disabled)nb.focus()}
 else if(k==='ren'){const it=elFind(id);Shell.ask('Rename this element',it.name,v=>{v=(v||'').trim().slice(0,24);if(!v)return;const taken=elAll().some(x=>x.id!==id&&x.name.toLowerCase()===v.toLowerCase());if(taken){toast('That name is already used. Pick another.');return}ST.el.names[id]=v;save();ACHIPS_refresh();elGrid()})}
 else if(k==='del'){const it=elFind(id);if(!it)return;
  if(EL.cat==='Recent'&&!EL.q.trim()){const i=ST.el.recent.indexOf(id);ST.el.recent.splice(i,1);save();ACHIPS_refresh();elGrid();toastAct('Removed from Recent','Undo',()=>{ST.el.recent.splice(i,0,id);save();ACHIPS_refresh();elGrid()});return}
  const mineI=ST.el.mine.findIndex(m=>m.id===id);let gone=null;
  if(mineI>=0)gone=ST.el.mine.splice(mineI,1)[0];else ST.el.gone.push(id);
  save();ACHIPS_refresh();elGrid();
  toastAct('“'+it.name+'” deleted','Undo',()=>{if(gone)ST.el.mine.splice(mineI,0,gone);else ST.el.gone=ST.el.gone.filter(x=>x!==id);save();ACHIPS_refresh();if(EL.open)elGrid()})}});
elcard.addEventListener('input',e=>{if(e.target.id!=='elQ')return;EL.q=e.target.value;elGrid()});
elcard.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.id==='elQ'){if(EL.q){EL.q='';e.target.value='';elGrid();e.stopPropagation()}}});
elFile.addEventListener('change',()=>{const f=elFile.files&&elFile.files[0];if(!f)return;
 if(f.size>400*1024){toast('That picture is too big for this demo. Try one under 400 KB.');return}
 const r=new FileReader();r.onload=()=>{let nm=(f.name||'My picture').replace(/\.[^.]+$/,'').slice(0,24)||'My picture',n=2,base=nm;while(elAll().some(x=>x.name.toLowerCase()===nm.toLowerCase()))nm=base+' '+n++;
  ST.el.mine.push({id:'my-'+uid(),name:nm,kw:'mine my own',html:'<img class="elimg" alt="" src="'+r.result+'">',w:120});
  try{save()}catch(_){}EL.cat='Mine';EL.q='';renderEl()};r.readAsDataURL(f)});
/* hooks: the pill button, the card inside the one-card rules, placement */
{const ia0=insertAct;insertAct=function(k){if(k==='elements'){elOpen();return}return ia0.apply(this,arguments)}}
{const ra1=renderAcard;renderAcard=function(){ra1();fitCard(acard);renderEl()}}
{const po1=placeOpts;placeOpts=function(){po1();placeCard(elcard)}}
{const co=cardOpen,cc=closeCards;cardOpen=function(){return co()||(EL.open&&elcard.classList.contains('show'))};closeCards=function(){cc();if(EL.open){EL.open=false;renderEl()}}}
{const st0=setTool;setTool=function(t,q){if(t!=='insert'&&EL.open){EL.open=false;EL.edit=false}return st0(t,q)}}
/* All tools > Shapes & aids: the Recent elements row */
const ELBASE=ALLTABS['Shapes & aids'].slice();
function ACHIPS_refresh(){elRecent().slice(0,8).forEach(x=>{ACHIP[x.name]={ic:()=>'<span class="elthumb">'+x.html+'</span>',f:()=>elInsert(x.id)}});
 const ch=$('#allChips');if(ch)ch.dataset.t='';if(typeof renderAll==='function')renderAll()}
ACHIP['See all elements']={ic:()=>svg('sticker'),f:()=>{if(R.tool!=='insert')setTool('insert');EL.open=true;R.acard=false;EL.cat=elRecent().length?'Recent':'Study';EL.q='';EL.edit=false;renderOpts()}};
Object.defineProperty(ALLTABS,'Shapes & aids',{enumerable:true,configurable:true,get(){const r=elRecent().slice(0,4);r.forEach(x=>{ACHIP[x.name]={ic:()=>'<span class="elthumb">'+x.html+'</span>',f:()=>elInsert(x.id)}});return[...ELBASE,'#Recent elements',...r.map(x=>x.name),'See all elements']}});

/* ============ v5e: owner round fixes (T1 groups, T2 pen order, T3/T5/T6 Text bar, T5 Shapes slot) ============ */
/* a card setting that is ONE choice: a button with a down arrow that opens a small menu (Line, Page style) */
const LS_N={solid:'Solid',dashed:'Dashed',dotted:'Dotted'},PAPER_N={blank:'Blank',lined:'Lined',grid:'Grid',dots:'Dots'};
function mchip(id,label,cur,ic){return'<button class="abtn pickchip" data-m="'+id+'" aria-haspopup="menu" aria-label="'+label+': '+cur+'">'+(ic?svg(ic):'')+'<span>'+label+'</span><small>'+cur+'</small>'+svg('chevD')+'</button>'}
const MCH={
 ls:()=>({t:'Line style',items:Object.entries(LS_N).map(([v,n])=>({t:n,on:PN.ls===v,f:()=>{PN.ls=v;save();renderOpts()}}))}),
 paper:()=>({t:'Page style',items:Object.entries(PAPER_N).map(([v,n])=>({t:n,on:PN.paper===v,f:()=>{setPaper(v);renderOpts()}}))})};
acard.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b||!MCH[b.dataset.m])return;e.stopPropagation();const m=MCH[b.dataset.m]();openMenu(m.items,b,m.t)});

/* ---- Pen pill: Type ▾, Size ▾, 4 colours + ▾, Favourites ▾ (nothing repeated in the card) ---- */
function pillTidy(row){[...row.children].forEach(el=>{if(!el.classList.contains('sep')||el.classList.contains('minsep'))return;const p=el.previousElementSibling,n=el.nextElementSibling;
 if(!p||p.classList.contains('sep')||p.classList.contains('pgrip')||!n||n.classList.contains('sep')||n.classList.contains('minsep')||n.classList.contains('minb'))el.remove()})}
function penPillV5(){const row=$('.prow',opts);if(!row)return;const pro=isPro(),isHl=R.pen==='Highlighter';
 const mk=(cls,html,label,fn)=>{const b=document.createElement('button');b.className='opt chev '+cls;b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-label',label);b.dataset.tip=label;b.innerHTML=html;b.onclick=()=>fn(b);return b};
 const ts=$$('.ptype',row);
 if(ts.length&&!pro)ts.forEach(x=>x.hidden=true); /* Beginner: pen types live in the card tiles only */
 else if(ts.length){const k=TYPEK[R.pen],tc=k==='hl'?R.hlCol:(R.penCol==='auto'?'var(--ink)':R.penCol);
  ts[0].before(mk('pchip','<span class="ptype pmini on">'+penSvg(k,tc)+'</span><span>'+pname(R.pen)+'</span>','Pen type: '+pname(R.pen),b=>openMenu([{h:'Pen type'},...PTYPES.map(n=>({t:pname(n),on:R.pen===n,f:()=>{R.pen=n;renderOpts()}}))],b)));
  ts.forEach(x=>x.remove())}
 const szs=$$('.opt',row).filter(x=>/^(Fine|Medium|Bold)$/.test(x.getAttribute('aria-label')||''));
 if(szs.length){const cur=isHl?R.hlSize:R.size,exact=pro&&!isHl&&PN.exact!=null,w={Fine:1.5,Medium:3,Bold:5.5}[cur]||3;
  const sch=mk('schip','<svg class="ln" viewBox="0 0 24 24"><path d="M4 12h16" style="stroke-width:'+(isHl?w*1.7:w)+'"/></svg><span>'+(exact?PN.exact+' px':cur)+'</span>','Size: '+(exact?PN.exact+' px':cur),b=>openMenu([{h:'Size'},...['Fine','Medium','Bold'].map(n=>({t:n,on:!exact&&cur===n,f:()=>{if(isHl)R.hlSize=n;else{R.size=n;PN.exact=null;save()}renderOpts()}})),...(pro&&!isHl?[{t:'Exact thickness…',f:()=>openPenAt('stroke')}]:[])],b));
  szs.forEach(x=>x.remove());const pc=$('.pchip',row);if(pc)pc.after(sch);else row.prepend(sch)}
 const dots=$$('.dot',row),cur=isHl?R.hlCol:R.penCol;
 if(dots.length){const keep=new Set(),on=dots.find(d=>d.classList.contains('on'));if(on)keep.add(on);dots.forEach(d=>{if(keep.size<4)keep.add(d)});
  const kept=dots.filter(d=>keep.has(d));dots.forEach(d=>{if(!keep.has(d))d.remove()});
  const setC=c=>{if(isHl)R.hlCol=c;else R.penCol=c;renderOpts()};
  const all=(isHl?HLCOL:PENCOL).map(([n,c])=>({t:n,c:c==='auto'?'var(--ink)':c,on:cur===c,f:()=>setC(c)})),cust=(pro?(isHl?HN.cust:PN.cust):[]).map(c=>({t:'Custom '+c,c,on:cur===c,f:()=>setC(c)}));
  const cb=mk('ccaret',svg('palette'),'All colours',b=>openMenu([{h:'Colour'},...all,...cust,...(pro?[{t:'Add a colour…',f:()=>openPenAt('colour')}]:[])],b));
  kept[kept.length-1].after(cb);
  const ad=$('.addc',row);if(ad)ad.remove();
  $$('.favp',row).forEach(x=>x.remove());
  const favs=isHl?HN.favs:PN.favs,applyF=f=>{R.pen=f.pen;if(f.pen==='Highlighter'){R.hlCol=f.col;R.hlSize=f.size}else{R.penCol=f.col;R.size=f.size;PN.exact=f.exact==null?null:f.exact}save();renderOpts()};
  cb.after(mk('fchip',svg('star'),'Favourites',b=>openMenu([{h:'Favourites'},...favs.map((f,i)=>({t:'Favourite '+(i+1)+': '+pname(f.pen),c:cdot(f.col),f:()=>applyF(f)})),
   {t:'Save this pen as a favourite',f:()=>{if(favs.length>=6){toast('Up to 6 favourites: remove one in More');return}favs.push({pen:R.pen,col:isHl?R.hlCol:R.penCol,size:isHl?R.hlSize:R.size,exact:PN.exact});save();toast('Saved as a favourite');renderOpts()}}],b)))}
 pillTidy(row)}

/* ---- Text bar: its own bar. Box ▾ and Layout, Aa font/size, headings, every list, B I U S, indent, align, callout, divider, code ---- */
{const lc0=listCmd;listCmd=function(k){if(k!=='star')return lc0(k);const t=focusTarget();if(!t){toast('Tap a text box first');return}fmt('insertUnorderedList');
 const sl=getSelection();let n=sl.anchorNode;n=n&&(n.nodeType===3?n.parentElement:n);const ul=n&&n.closest?n.closest('ul,ol'):null;if(ul){ul.classList.remove('chk');ul.classList.toggle('star')}flush()}}
TEXTACT['Star list']=()=>listCmd('star');
TOOLICON['Star list']='star';
if(!ALLTABS.Text.includes('Star list'))ALLTABS.Text.splice(ALLTABS.Text.indexOf('Bullet list')+1,0,'Star list');
function textBarV5(){opts.innerHTML='';opts.classList.add('col');R.sub=null;const pro=isPro(),row=document.createElement('div');
 const add=(html,label,fn,cls,data)=>{const b=document.createElement('button');b.className='opt'+(cls?' '+cls:'');b.innerHTML=html;b.setAttribute('aria-label',label);b.dataset.tip=label;if(data)Object.assign(b.dataset,data);b.onclick=()=>fn(b);row.append(b);return b};
 const sep=()=>{const s=document.createElement('span');s.className='sep';row.append(s)};
 const act=n=>()=>TEXTACT[n]();
 const g=document.createElement('button');g.className='opt pgrip';g.innerHTML=svg('grip');g.setAttribute('aria-label','Move these options');g.dataset.tip='Drag to an edge';row.append(g);
 caret('acard','More text options',row);sep();
 const v=curV(),nm=styleName(v);
 add(bprev(v)+'<span class="bl"><small>Box</small><b>'+esc(nm)+'</b></span>','Box style: '+nm,b=>openMenu([{h:'Box style'},...['plain','sticky','callout'].map(id=>{const p=PRESETS.find(x=>x[0]===id);return{t:p[1],on:sameV(p[2],curV()),f:()=>{setStyle(p[2],true);if(!curBox())toast('New boxes will be '+p[1]+'. Tap a box to change that box');renderOpts()}}}),{t:'More box settings…',f:()=>openBoxStyle()}],b),'bst chev').setAttribute('aria-haspopup','menu');
 const lon=R.acard&&R.ctab.text==='layout';
 add('Layout','Layout',()=>{R.ctab.text='layout';R.acard=!lon;R.tabIn=true;renderOpts();R.tabIn=false},lon?'on':'');
 if(pro)add('Width','Width',b=>openMenu([{h:'Width'},...[['Auto','auto'],['Narrow',160],['Medium',280],['Wide','wide']].map(([n,x])=>({t:n,f:()=>setWidth(x)}))],b),'chev');
 sep();
 const fsNow=parseFloat((curBox()?curBox().style.getPropertyValue('--fs'):ST.boxDef.fs))||1,ff=v.ff||'inherit';
 add('Aa','Font and size',b=>openMenu([{h:'Font'},...FONTS.map(([n,x])=>({t:n,on:ff===x,f:()=>tcardClick('font',x)})),{h:'Size'},...FSIZES.map(z=>({t:Math.round(z*100)+'%',on:Math.abs(fsNow-z)<.03,f:()=>tcardClick('fsize',z)}))],b),'chev');
 sep();
 [['Heading 1','H1'],['Heading 2','H2'],['Heading 3','H3']].forEach(([n,t])=>add(t,n,act(n),'hd'));
 {const blk=curBlock();add('<span>'+esc((TSTYLES.find(x=>x[1]===blk)||TSTYLES[4])[0])+'</span>','Text style',b=>openMenu([{h:'Text style'},...TSTYLES.map(([n,tag])=>({t:n,on:curBlock()===tag,f:()=>{blockStyle(tag);renderOpts()}}))],b),'chev')}
 sep();
 [['Bullet list','list'],['Star list','star'],['Numbered list','olist'],['Checklist','checks'],['Toggle list','toglist']].forEach(([n,ic])=>add(svg(ic),n,act(n)));
 sep();
 add('B','Bold',act('Bold'),'b',{fmt:'bold'});add('I','Italic',act('Italic'),'i',{fmt:'italic'});add('U','Underline',act('Underline'),'u',{fmt:'underline'});add('S','Strikethrough',act('Strikethrough'),'s',{fmt:'strikeThrough'});
 sep();
 add(svg('outdent'),'Outdent',act('Outdent'));add(svg('indent'),'Indent',act('Indent'));
 add(svg('alignL'),'Align',b=>openMenu([{h:'Align'},...alignCmds.map(([n,cmd])=>({t:n,f:()=>fmt(cmd)}))],b),'chev');
 sep();
 add(svg('quote'),'Callout',act('Callout'));add(svg('minus'),'Divider',act('Divider'));add(svg('code'),'Inline code',act('Inline code'));
 sep();
 add(svg('palette'),'Text colour',b=>openMenu([{h:'Text colour'},...PENCOL.map(([n,c])=>({t:n,c:c==='auto'?'var(--ink)':c,f:()=>fmt('foreColor',c==='auto'?css('--ink'):c)}))],b),'chev');
 add(svg('hlight'),'Highlight colour',b=>openMenu([{h:'Highlight colour'},...HLCOL.map(([n,c])=>({t:n,c,f:()=>fmt('hiliteColor',hexA(c))}))],b),'chev');
 row.insertAdjacentHTML('beforeend',minHtml('opts','opt'));
 const h=document.createElement('div');h.className='bs2';row.className='prow';h.append(row);opts.append(h);hscroll(h,row);pinMore();pillTidy(row);placeOpts();updateFmtState()}
{const ro0=renderOpts;renderOpts=function(){ro0();if(R.tool==='pen')penPillV5();else if(R.tool==='text')textBarV5()}}

/* ---- Shapes & edits: a top-bar slot in both modes. Professional gets every option, no folding ---- */
{const rt1=renderToolbar;renderToolbar=function(){rt1();const b=$('#tb [data-id=shapes]');if(b&&isPro()){b.dataset.tip='Shapes & edits';b.setAttribute('aria-label','Shapes & edits');const n=$('.name',b);if(n)n.textContent='Shapes'}}}

/* ---- All tools > Shapes & aids: organised groups that wrap, no long strip to scroll ---- */
{const ra0=renderAll;renderAll=function(){ra0();const ch=$('#allChips'),row=ch&&$('.row',ch);if(!row)return;
 if(R.allTab!=='Shapes & aids'){row.classList.remove('grouped');return}
 row.classList.add('grouped');
 if(row.querySelector(':scope>.alab')){const kids=[...row.children];row.innerHTML='';let g=null;
  kids.forEach(k=>{if(k.classList.contains('alab')){g=document.createElement('div');g.className='agrp';g.setAttribute('role','group');g.setAttribute('aria-label',k.textContent);g.append(k);const c=document.createElement('div');c.className='agc';g.append(c);row.append(g)}else if(g)g.lastChild.append(k)});
  row.parentElement._m&&row.parentElement._m()}}}

/* ============ v6: ONE calm toolbar ============
   Main bar (one row): Text Pen Eraser Shapes Lasso Insert▾ ··· Undo Redo More › (the one minimise).
   Tool row (one row, under it): only ▾ buttons. Each opens one dropdown (one shared card style, a ✕, sealed from the page).
   Professional = the same rows and the same buttons; it only adds choices INSIDE the dropdowns. No category row, no map banner,
   no layout switch, no grip, no second minimise. Every feature of v5 is still here, in a ▾ or in More. */
const V={tab:R.tool==='lasso'||R.tool==='eraser'||R.tool==='text'?R.tool:'pen',dd:null,aid:null,menuFor:null,open:{}};
const LDD=['lsel','lmenu','llayers'];
const $dd=id=>document.querySelector('[data-dd="'+id+'"]');
const CHV='<span class="cv" aria-hidden="true">'+svg('chevD')+'</span>';
R.optsOn=true;ST.min.opts=false;
afterAction=function(){};
refreshNote=function(){};
renderAll=function(){};
moveHist=function(){};

/* ---- closing and syncing ---- */
function v6Close(){V.anchorEl=null;closeMenu();V.menuFor=null;if(MC.open)moreClose();if(LC.open)layClose();if(BC.open)begClose();if(EL.open){EL.open=false;EL.edit=false}
 R.acard=false;R.ecard=false;R.lcard=false;V.dd=null}
function v6Sync(){renderEcard();renderLcard();renderAcard()}
closeCards=function(){v6Close();renderOpts()};
cardOpen=function(){return!!((R.acard&&acard.classList.contains('show'))||(R.lcard&&lcard.classList.contains('show'))||(EL.open&&elcard.classList.contains('show'))||LC.open||MC.open||BC.open||menu.classList.contains('show'))};
renderEcard=function(){R.ecard=false;ecard.classList.remove('show');ecard.setAttribute('aria-hidden','true')};
{const st0=setTool;setTool=function(t,q){v6Close();if(t==='pen'){if(V.tab!=='shapes')V.tab='pen'}else if(t!=='insert')V.tab=t;return st0(t,q)}}
{const sm0=setMin;setMin=function(k,on){if(k==='main'&&on){v6Close();v6Sync()}return sm0(k,on)}}
{const mm0=moreMenu;moreMenu=function(a){const was=MC.open;v6Close();v6Sync();if(was)return;return mm0(a)}}
{const lm0=layoutMenu;layoutMenu=function(a){v6Close();v6Sync();return lm0(a)}}

/* ---- a ▾ button, a menu dropdown, a card dropdown ---- */
function B(row,id,html,label,fn,cls,kind){const b=document.createElement('button');b.type='button';b.className='v6b'+(cls?' '+cls:'')+(V.dd===id?' open':'');b.dataset.dd=id;b.setAttribute('aria-label',label);
 b.setAttribute('aria-haspopup',kind||'menu');b.setAttribute('aria-expanded',V.dd===id);b.innerHTML=html+CHV;
 const open=(el,force)=>fn(el||b,force);V.open[id]=open;b.onclick=e=>{e.stopPropagation();open(b)};row.append(b);return b}
function ddMenu(id,b,items,title,force){if(items[0]&&items[0].h&&(!title||items[0].h===title)){title=title||items[0].h;items=items.slice(1)}
 if(!force&&menu.classList.contains('show')&&V.menuFor===id){closeMenu();V.menuFor=null;return}
 const had=R.acard||R.lcard||EL.open||MC.open||LC.open||BC.open;v6Close();if(had){renderOpts()}b=$dd(id)||b;V.menuFor=id;openMenu(items,b,title)}
function ddCard(id,b,prep){const lasso=LDD.includes(id),on=lasso?R.lcard:R.acard;
 if(V.dd===id&&(on||EL.open)&&!MC.open){v6Close();renderOpts();return}
 v6Close();V.dd=id;V.aid=id;if(lasso)R.lcard=true;else R.acard=true;if(prep)prep();R.optsOn=true;R.tabIn=true;renderOpts();R.tabIn=false}
const ddAnchor=()=>{if(V.anchorEl&&V.anchorEl.isConnected)return V.anchorEl;const id=V.aid||V.dd;return(id&&$dd(id))||$('#barbox')};

/* ---- main bar ---- */
function v6Tool(tab){v6Close();V.tab=tab;const t=tab==='shapes'?'pen':tab;
 if(tab==='pen'&&PN.shape!=='free'){PN.shape='free';save()}
 if(tab==='shapes'&&PN.shape==='free'){PN.shape='line';save()}
 R.optsOn=true;if(R.tool!==t)setTool(t);else{updateStates();renderOpts()}
 V.tab=tab;updateStates();renderOpts()}
renderToolbar=function(){tb.className='bar nofocus v6bar';tb.innerHTML='';
 const bb=$('#barbox');if(opts.parentElement!==bb)bb.append(opts);const a2=$('#all');if(a2)a2.hidden=true;
 const g=document.createElement('div');g.className='tools v6tools';g.setAttribute('role','group');g.setAttribute('aria-label','Tools');
 [['text','Text'],['pen','Pen'],['eraser','Eraser'],['shapes','Shapes'],['lasso','Lasso']].forEach(([id,nm])=>{let b;
  if(id==='shapes'){b=document.createElement('button');b.type='button';b.className='ic';b.dataset.id='shapes';b.dataset.tip=nm;b.setAttribute('aria-label',nm);b.innerHTML=svg('shapes')+'<span class="name">'+nm+'</span>'}
  else b=mkIc(id);
  b.onclick=()=>{if(R.reading)return;v6Tool(id)};g.append(b)});
 const ins=document.createElement('button');ins.type='button';ins.className='ic v6ins';ins.dataset.id='insert';ins.dataset.dd='insert';ins.dataset.tip='Insert';ins.setAttribute('aria-label','Insert');ins.setAttribute('aria-haspopup','dialog');
 ins.innerHTML=svg('insert')+'<span class="name">Insert</span>'+CHV;ins.onclick=e=>{e.stopPropagation();ddCard('insert',ins)};V.open.insert=el=>ddCard('insert',el||ins);g.append(ins);
 tb.append(g);const sp=document.createElement('span');sp.className='v6grow';tb.append(sp);
 const hs=document.createElement('div');hs.className='hist';hs.setAttribute('role','group');hs.setAttribute('aria-label','History');['undo','redo'].forEach(i=>hs.append(mkIc(i)));tb.append(hs);
 tb.append(mkIc('more'));
 tb.insertAdjacentHTML('beforeend',minHtml('main'));
 updateStates();renderOpts();if(R.tool==='lasso')drawOverlay();syncMin()};
{const us0=updateStates;updateStates=function(){us0();
 const p=$('#tb [data-id=pen]'),s=$('#tb [data-id=shapes]'),i=$('#tb [data-id=insert]');
 [[p,R.tool==='pen'&&V.tab!=='shapes'&&!R.reading],[s,R.tool==='pen'&&V.tab==='shapes'&&!R.reading],[i,V.dd==='insert'||V.dd==='elements']].forEach(([el,on])=>{if(!el)return;el.classList.toggle('on',!!on);el.setAttribute('aria-pressed',!!on)})}}
SHH.sync();

/* ---- the tool row ---- */
const curCol=()=>R.pen==='Highlighter'?R.hlCol:R.penCol;
function recents(){const hl=R.pen==='Highlighter',key=hl?'rcHl':'rcPen',cur=curCol(),defs=(hl?HLCOL:PENCOL).map(x=>x[1]);let a=ST[key];
 if(!Array.isArray(a))a=ST[key]=[cur,...defs.filter(x=>x!==cur)];
 if(a[0]!==cur){a=ST[key]=[cur,...a.filter(x=>x!==cur)].slice(0,6);try{save()}catch(_){}}return a.slice(0,3)}
renderOpts=function(){opts.innerHTML='';opts.className='v6opts nofocus show';opts.dataset.tab=V.tab;
 const row=document.createElement('div');row.className='v6row';row.setAttribute('role','toolbar');row.setAttribute('aria-label',({text:'Text',pen:'Pen',shapes:'Shapes',eraser:'Eraser',lasso:'Lasso'})[V.tab]+' options');opts.append(row);
 ({text:rowText,pen:rowPen,shapes:rowShapes,eraser:rowEraser,lasso:rowLasso})[V.tab](row);
 applyOpts();if(V.tab==='text')updateFmtState()};
placeOpts=function(){const host=$('#bars');if(!host)return;host.classList.remove('gap');
 const r=opts.getBoundingClientRect(),hr=host.getBoundingClientRect();R.opL=r.left-hr.left;R.opT=r.top-hr.top;
 [acard,lcard,elcard].forEach(placeCard);syncMin()};
placeCard=function(el){if(!el.classList.contains('show'))return;const host=$('#bars'),hr=host.getBoundingClientRect(),a=ddAnchor(),r=a.getBoundingClientRect(),w=el.offsetWidth,g=6;
 if(V.anchorEl&&a===V.anchorEl){const h=el.offsetHeight,top=Math.max(opts.getBoundingClientRect().bottom-hr.top+g,Math.min(r.top-hr.top,hr.height-h-8));let x=r.right-hr.left+8;if(x+w>hr.width-8)x=r.left-hr.left-w-8;x=Math.max(8,Math.min(x,hr.width-w-8));el.style.left=Math.round(x)+'px';el.style.top=Math.round(top)+'px';return}
 let x=r.left-hr.left,y=(V.tab==='text'&&a.closest('#opts')?opts.getBoundingClientRect().bottom:r.bottom)-hr.top+g,h=el.offsetHeight;
 x=Math.max(8,Math.min(x,hr.width-w-8));
 const b=el===acard&&V.dd==='box'&&R.ctab.text==='box'?curBox():null;
 if(b){const pr=paper.getBoundingClientRect(),bx0=pr.left-hr.left+b.offsetLeft-8,bx1=pr.left-hr.left+b.offsetLeft+b.offsetWidth+8,by0=pr.top-hr.top+b.offsetTop-48,by1=pr.top-hr.top+b.offsetTop+b.offsetHeight+8;
  if(x<bx1&&x+w>bx0&&y<by1&&y+h>by0){if(bx1+8+w<=hr.width-8)x=bx1+8;else if(bx0-8-w>=8)x=bx0-8-w;else x=hr.width-w-8}}
 el.style.left=Math.round(x)+'px';el.style.top=Math.round(y)+'px'};
addEventListener('resize',()=>{if(cardOpen())v6Sync();else placeOpts()});

/* ---- Text row: Box ▾  Font Aa ▾  Style ▾  List ▾  B  I  Format ▾ ---- */
const STYLE_SHORT={h1:'Title',h2:'H1',h3:'H2',h4:'H3',div:'Body',blockquote:'Quote',pre:'Code'};
const nameOfBlock=()=>{const k=curBlock();return STYLE_SHORT[k]||(k?k:'Body')};
const colItems=back=>[...(back?[{t:'‹ Back',keep:true,f:back}]:[]),...PENCOL.map(([n,c])=>({t:n,c:cdot(c),f:()=>fmt('foreColor',c==='auto'?css('--ink'):c)}))];
function formatMenu(b,force){ddMenu('format',b,formatItems(),'Format',force)}
function formatItems(){const pro=isPro(),b=()=>$dd('format'),back=()=>openMenu(formatItems(),b(),'Format');
 const it=[{t:'Underline',f:()=>TEXTACT.Underline()}];
 if(pro)it.push({t:'Strikethrough',f:()=>TEXTACT.Strikethrough()});
 it.push({t:'Text colour ▸',keep:true,f:()=>openMenu([{t:'‹ Back',keep:true,f:back},...PENCOL.map(([n,c])=>({t:n,c:cdot(c),f:()=>fmt('foreColor',c==='auto'?css('--ink'):c)}))],b(),'Text colour')});
 it.push({t:'Highlight colour ▸',keep:true,f:()=>openMenu([{t:'‹ Back',keep:true,f:back},...HLCOL.map(([n,c])=>({t:n,c,f:()=>fmt('hiliteColor',hexA(c))}))],b(),'Highlight colour')});
 it.push({t:'Align ▸',keep:true,f:()=>openMenu([{t:'‹ Back',keep:true,f:back},...alignCmds.map(([n,cmd])=>({t:n,f:()=>fmt(cmd)}))],b(),'Align')});
 if(pro)it.push({t:'Callout',f:()=>TEXTACT.Callout()});
 it.push({t:'Divider',f:()=>TEXTACT.Divider()});
 if(pro)it.push({t:'Inline code',f:()=>TEXTACT['Inline code']()});
 return it}
function rowText(row){const pro=isPro(),v=curV(),nm=styleName(v);
 const sep=()=>row.insertAdjacentHTML('beforeend','<i class="v6sep" aria-hidden="true"></i>');
 B(row,'box',bprev(v)+'<span>Box</span>','Box style: '+nm,b=>{
  if(pro)ddCard('box',b,()=>{R.ctab.text='box';ensureBox()});
  else ddMenu('box',b,[{h:'Box look'},...['plain','sticky','callout'].map(id=>{const p=PRESETS.find(x=>x[0]===id);return{t:p[1],on:sameV(p[2],curV()),f:()=>{setStyle(p[2],true);if(!curBox())toast('New boxes will be '+p[1]+'. Tap a box to change that box');renderOpts()}}})],'Box')},'',pro?'dialog':'menu');
 sep();
 B(row,'format',svg('palette')+'<span>Format</span>','Format',b=>ddCard('format',b),'','dialog');
 sep();
 if(pro)B(row,'style','<span class="lab">Style:</span><span class="cur">'+nameOfBlock()+'</span>','Style: '+nameOfBlock(),b=>{const blk=curBlock();
  const it=[{h:'Text style'},{t:'Title',on:blk==='h1',f:()=>{blockStyle('h1');renderOpts()}},
  {t:'Heading 1',on:blk==='h2',f:()=>{blockStyle('h2');renderOpts()}},{t:'Heading 2',on:blk==='h3',f:()=>{blockStyle('h3');renderOpts()}},{t:'Heading 3',on:blk==='h4',f:()=>{blockStyle('h4');renderOpts()}},{t:'Body',on:blk==='div'||!blk,f:()=>{blockStyle('div');renderOpts()}},
   {t:'Quote',on:blk==='blockquote',f:()=>{TEXTACT.Quote();renderOpts()}},{t:'Code block',on:blk==='pre',f:()=>{TEXTACT['Code block']();renderOpts()}}];
  ddMenu('style',b,it,'Text style')},'v6w');
 [['B','Bold','b','bold'],['I','Italic','i','italic']].forEach(([t,n,c,f])=>{const b=document.createElement('button');b.type='button';b.className='v6b v6fmt '+c;b.textContent=t;b.dataset.fmt=f;b.setAttribute('aria-label',n);b.setAttribute('aria-pressed','false');b.onclick=e=>{e.stopPropagation();v6Close();v6Sync();fmt(f);updateFmtState()};row.append(b)});
 if(pro)B(row,'list',svg('list')+'<span>List</span>','List',b=>{const it=[{h:'List'},{t:'Bullets',f:()=>TEXTACT['Bullet list']()},{t:'Star list',f:()=>TEXTACT['Star list']()},{t:'Numbers',f:()=>TEXTACT['Numbered list']()},{t:'Checklist',f:()=>TEXTACT.Checklist()},{t:'Toggle list',f:()=>TEXTACT['Toggle list']()},{t:'Indent',f:()=>TEXTACT.Indent()},{t:'Outdent',f:()=>TEXTACT.Outdent()}];
  ddMenu('list',b,it,'List')})}
/* ---- Format ▾: ONE organised card ---- */
function formatHtml(){const pro=isPro(),v=curV(),bx=curBox(),ff=v.ff||'inherit',fsNow=parseFloat(bx?bx.style.getPropertyValue('--fs'):ST.boxDef.fs)||1,blk=curBlock();
 const sec=(t,h)=>'<section class="csec" data-sec="f-'+t.toLowerCase().replace(/\W+/g,'')+'"><h5>'+t+'</h5>'+h+'</section>';
 const A=(k,val,l,on)=>chip('data-v6="'+k+'" data-v="'+val+'"',l,on);
 let h='';
 if(pro)h+=sec('Font & size',clab('Font')+group('Font','',FONTS.map(([n],i)=>A('font',i,n,ff===FONTS[i][1])).join(''))+clab('Size')+group('Size','five',FSIZES.map(z=>A('fsize',z,Math.round(z*100)+'%',Math.abs(fsNow-z)<.03)).join('')));
 else{const sz=bx?bx.dataset.size:(R.defSize||'body');h+=sec('Font & size',clab('Text size')+group('Text size','',[['Body','body'],['Heading','head'],['Small','small']].map(([n,k])=>A('bsize',k,n,sz===k)).join('')))}
 h+=sec('Style',group('Style','four',[...(pro?[['Title','h1']]:[]),['Heading 1','h2'],['Heading 2','h3'],['Heading 3','h4'],['Body','div']].map(([n,t])=>A('blk',t,n,blk===t)).join('')+A('act','Quote','Quote',blk==='blockquote')+A('act','Code block','Code block',blk==='pre')));
 h+=sec('Lists',group('Lists','four',A('act','Bullet list','Bullets')+(pro?A('act','Star list','Star list'):'')+A('act','Numbered list','Numbers')+A('act','Checklist','Checklist')+(pro?A('act','Toggle list','Toggle list')+A('act','Indent','Indent')+A('act','Outdent','Outdent'):'')));
 h+=sec('Emphasis',group('Emphasis','four',A('fmt','bold','Bold')+A('fmt','italic','Italic')+A('fmt','underline','Underline')+(pro?A('fmt','strikeThrough','Strikethrough'):''))+
  clab('Text colour')+'<div class="swatches" role="group" aria-label="Text colour">'+PENCOL.map(([n,c])=>'<button class="sw" style="background:'+cdot(c)+'" data-v6="tcol" data-v="'+c+'" aria-label="Text colour '+n+'"></button>').join('')+'</div>'+
  clab('Highlight colour')+'<div class="swatches" role="group" aria-label="Highlight colour">'+HLCOL.map(([n,c])=>'<button class="sw" style="background:'+c+'" data-v6="hcol" data-v="'+c+'" aria-label="Highlight colour '+n+'"></button>').join('')+'</div>'+
  (pro?group('More marks','',chip('data-a="mark" data-v="link"','Link',false,'link')+chip('data-a="mark" data-v="key"','Key point',false,'tag')):''));
 h+=sec('Paragraph',clab('Alignment')+group('Alignment','four',alignCmds.map(([n,cmd])=>A('fmt',cmd,n)).join(''))+clab('Paragraph spacing')+group('Paragraph spacing','',[['Compact','compact'],['Normal','normal'],['Roomy','roomy']].map(([n,k])=>A('pgap',k,n,(bx&&bx.dataset.pgap||'normal')===k)).join('')));
 h+=sec('Blocks',group('Blocks','',(pro?chip('data-a="kind" data-v="plain"','Plain block',false)+A('act','Callout','Callout'):'')+A('act','Divider','Divider')+(pro?A('act','Inline code','Inline code'):'')));
 if(pro)h+=sec('Advanced',clab('Line height')+group('Line height','',LHS_.map(([n,x])=>chip('data-a="lh" data-v="'+(x||'')+'"',n,(v.lh||null)===x)).join(''))+clab('Letter spacing')+group('Letter spacing','',[['Tight','-.02em'],['Normal',''],['Wide','.06em']].map(([n,x])=>A('ls',x||'normal',n,(bx&&bx.style.letterSpacing||'')===x)).join(''))+clab('Custom styles')+abtn('data-v6="savestyle"','Save as a custom style','plus')+clab('Clear')+abtn('data-v6="clear"','Clear formatting','rotcw'));
 return cheadX('Format','data-a="close"')+cpane(h)}

/* ---- Pen row: Pen ▾  Size ▾  ●●● Colour ▾  Feel ▾  ☆ Favourites ▾ ---- */
const sizeItems=()=>{const isHl=R.pen==='Highlighter';return[{h:'Size'},...['Fine','Medium','Bold'].map(n=>({t:n,on:(isHl?R.hlSize:R.size)===n&&(isHl||PN.exact==null),f:()=>{if(isHl)R.hlSize=n;else{R.size=n;PN.exact=null;save()}renderOpts()}}))]};
const colItems2=()=>{const isHl=R.pen==='Highlighter',cur=curCol();return[{h:'Colour'},...(isHl?HLCOL:PENCOL).map(([n,c])=>({t:n,c:cdot(c),on:cur===c,f:()=>{if(isHl)R.hlCol=c;else R.penCol=c;renderOpts()}}))]};
function sizeColour(row){const pro=isPro(),isHl=R.pen==='Highlighter',cur=isHl?R.hlSize:R.size,exact=pro&&!isHl&&PN.exact!=null,w={Fine:1.5,Medium:3,Bold:5.5}[cur]||3;
 B(row,'size','<svg class="ln" viewBox="0 0 24 24"><path d="M4 12h16" style="stroke-width:'+(isHl?w*1.7:w)+'"/></svg><span>'+(exact?PN.exact+' px':cur)+'</span>','Size: '+(exact?PN.exact+' px':cur),
  b=>pro?ddCard('size',b,()=>{R.ctab.pen='stroke'}):ddMenu('size',b,sizeItems(),'Size'),'',pro?'dialog':'menu');
 B(row,'colour','<span class="v6dots">'+recents().map(c=>'<i style="background:'+cdot(c)+'"></i>').join('')+'</span><span>Colour</span>','Colour',
  b=>pro?ddCard('colour',b,()=>{R.ctab.pen='colour'}):ddMenu('colour',b,colItems2(),'Colour'),'',pro?'dialog':'menu')}
function rowPen(row){const pro=isPro(),k=TYPEK[R.pen],tc=k==='hl'?R.hlCol:(R.penCol==='auto'?'var(--ink)':R.penCol);
 B(row,'pentype','<span class="ptype pmini on">'+penSvg(k,tc)+'</span><span>'+pname(R.pen)+'</span>','Pen type: '+pname(R.pen),b=>ddMenu('pentype',b,[{h:'Pen type'},...PTYPES.map(n=>({t:pname(n),on:R.pen===n,f:()=>{R.pen=n;renderOpts()}}))],'Pen type'));
 sizeColour(row);
 B(row,'feel',svg('sliders')+'<span>Feel</span>','Feel',b=>ddCard('feel',b,()=>{R.ctab.pen='feel';BP.view='main'}),'','dialog');
 const isHl=R.pen==='Highlighter',favs=isHl?HN.favs:PN.favs;
 B(row,'fav',svg('star')+'<span>Favourites</span>','Favourites',b=>{
  if(pro)ddCard('fav',b,()=>{R.ctab.pen='colour'});
  else{const applyF=f=>{R.pen=f.pen;if(f.pen==='Highlighter'){R.hlCol=f.col;R.hlSize=f.size}else{R.penCol=f.col;R.size=f.size;PN.exact=f.exact==null?null:f.exact}save();renderOpts()};
   ddMenu('fav',b,[{h:'Favourites'},...favs.map((f,i)=>({t:'Favourite '+(i+1)+': '+pname(f.pen),c:cdot(f.col),f:()=>applyF(f)})),
    {t:'Save this pen as a favourite',f:()=>{if(favs.length>=6){toast('Up to 6 favourites');return}favs.push({pen:R.pen,col:isHl?R.hlCol:R.penCol,size:isHl?R.hlSize:R.size,exact:PN.exact});save();toast('Saved as a favourite');renderOpts()}}],'Favourites')}},'',pro?'dialog':'menu')}

/* ---- Shapes row: Shape ▾  Size ▾  Colour ▾ ---- */
function rowShapes(row){const pro=isPro(),L=pro?[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Box','square'],['oval','Oval','oval'],['triangle','Triangle','triangle'],['tape','Tape','tape']]:[['free','Freehand','pen'],['line','Line','diagonal'],['arrow','Arrow','arrow'],['box','Rectangle','square'],['oval','Circle','oval']];
 const cur=L.find(x=>x[0]===PN.shape)||L[1];
 B(row,'shape',svg(cur[2])+'<span>'+cur[1]+'</span>','Shape: '+cur[1],b=>ddMenu('shape',b,[{h:'Draw as'},...L.map(([v,n])=>({t:n,on:PN.shape===v,f:()=>{PN.shape=v;save();renderOpts();toast(v==='free'?'Pen draws freehand':v==='tape'?'Pen draws Tape now: drag a strip over what you want to hide':'Drag on the page to draw the '+n.toLowerCase())}}))],'Draw as'));
 sizeColour(row)}

/* ---- Eraser row ---- */
function rowEraser(row){const pro=isPro();
 if(pro){const M={precise:'Precise',standard:'Standard',stroke:'Whole stroke'},S=['Thin','Medium','Thick'],ic={precise:'crosshair',standard:'eraser',stroke:'penLine'};
  B(row,'emode',svg(ic[E.mode])+'<span>'+M[E.mode]+'</span>','Eraser mode: '+M[E.mode],b=>ddMenu('emode',b,[{h:'Eraser mode'},...Object.keys(M).map(m=>({t:M[m],on:E.mode===m,f:()=>{E.mode=m;saveE();renderOpts()}}))],'Eraser mode'));
  B(row,'esize','<span class="sdot" style="width:'+Math.min(18,Math.max(6,ERS[E.size]/3*1.4)).toFixed(0)+'px;height:'+Math.min(18,Math.max(6,ERS[E.size]/3*1.4)).toFixed(0)+'px"></span><span>'+S[E.size]+'</span>','Eraser size: '+S[E.size],b=>ddMenu('esize',b,[{h:'Size'},...S.map((n,i)=>({t:n,on:E.size===i,f:()=>{E.size=i;saveE();renderOpts()}}))],'Size'));
  const opt=(b,force)=>ddMenu('eopt',b,[{h:'Behaviour'},{t:'Erase highlights only',on:E.hlOnly,keep:true,f:()=>{E.hlOnly=!E.hlOnly;saveE();renderOpts();V.open.eopt($dd('eopt'),true)}},
   {t:'Go back to the previous tool after one erase',on:E.ret,keep:true,f:()=>{E.ret=!E.ret;saveE();renderOpts();V.open.eopt($dd('eopt'),true)}},{h:'Rubbing in the Magnifier pad also erases on the page.'}],'More eraser options',force);
  B(row,'eopt',svg('sliders')+'<span>Options</span>','More eraser options',opt)}
 else B(row,'emode',svg('eraser')+'<span>'+R.eraser+'</span>','Eraser mode: '+R.eraser,b=>ddMenu('emode',b,[{h:'Eraser mode'},...['Whole stroke','Partial','Highlights only'].map(n=>({t:n,on:R.eraser===n,f:()=>{R.eraser=n;renderOpts()}}))],'Eraser mode'))}

/* ---- Lasso row ---- */
function rowLasso(row){const pro=isPro();
 if(pro){const sh=LSHAPE.find(x=>x[0]===ST.lasso.shape)||LSHAPE[0];
  B(row,'lsel',svg(sh[1])+'<span>Select</span>','Select: '+sh[2],b=>ddCard('lsel',b,()=>{R.ctab.lasso='select'}),'','dialog');
  B(row,'lmenu',svg('sliders')+'<span>Menu</span>','Selection menu',b=>ddCard('lmenu',b,()=>{R.ctab.lasso='menu'}),'','dialog');
  B(row,'llayers',svg('layers')+'<span>Layers</span>','Layers',b=>ddCard('llayers',b,()=>{R.ctab.lasso='layers'}),'','dialog')}
 else{B(row,'lshape',svg('lasso')+'<span>'+R.lassoMode+'</span>','Lasso shape: '+R.lassoMode,b=>ddMenu('lshape',b,[{h:'Lasso shape'},...['Free','Rectangle'].map(n=>({t:n,on:R.lassoMode===n,f:()=>{R.lassoMode=n;renderOpts()}}))],'Lasso shape'));
  B(row,'lact',svg('scan')+'<span>Actions</span>','Actions for the selection',(b,force)=>{const n=selCount();
   ddMenu('lact',b,[{h:'Actions'},{h:n?'Selected':'Draw a loop, then drag the selection or its corner dot.'},...[['Cut','cut'],['Copy','copy'],['Paste','paste'],['Duplicate','dup'],['Delete','del']].map(([t,k])=>({t,dis:!n&&k!=='paste',f:()=>lassoAct(k)})),
    {t:'Colour ▸',dis:!n,keep:true,f:()=>openMenu([{t:'‹ Back',keep:true,f:()=>V.open.lact($dd('lact'),true)},...LCOL.map(c=>({t:c==='auto'?'Automatic':c,c:cdot(c),f:()=>lassoAct('col',c)}))],$dd('lact'),'Colour')},
    {t:'Convert to text',dis:!n,f:()=>lassoAct('conv')},{t:'Screenshot',dis:!n,f:()=>lassoAct('shot')}],'Actions',force)})}}

/* ---- the dropdown cards ---- */
const ACARD_VIEWS=['box','format','size','colour','fav','feel','insert'];
CTABS.text=[['box','Box'],['layout','Layout']];
function colourTop(){const pro=isPro(),isHl=R.pen==='Highlighter',cur=curCol();
 return clab('Colours')+'<div class="swatches" role="radiogroup" aria-label="Colours">'+(isHl?HLCOL:PENCOL).map(([n,c])=>'<button class="sw'+(cur===c?' on':'')+'" role="radio" aria-checked="'+(cur===c)+'" style="background:'+cdot(c)+'" data-v6="col" data-v="'+c+'" aria-label="'+n+(isHl?' highlight':' ink')+'" data-tip="'+n+'"></button>').join('')+'</div>'+abtn('data-v6="picker"','Colour picker','palette','Pick from the page')}
function penView(view){const tmp=document.createElement('div');tmp.innerHTML=penCardHtml();
 const sec=k=>{const s=tmp.querySelector('.csec[data-sec="'+k+'"]');if(!s)return'';const c=s.cloneNode(true),h=c.querySelector('h5');if(h)h.remove();return c.innerHTML};
 const isHl=R.pen==='Highlighter',fav='<div class="clab">Manage favourites</div>';
 let title,body='',pre='';
 if(view==='size'){title='Size';const cur=isHl?R.hlSize:R.size;
  body=clab('Size')+group('Size','',['Fine','Medium','Bold'].map(n=>chip('data-v6="size" data-v="'+n+'"',n,cur===n&&(isHl||PN.exact==null))).join(''))+sec('stroke')}
 else if(view==='colour'){title='Colour';const c=sec('colour'),i=c.indexOf(fav);body=colourTop()+(i<0?c:c.slice(0,i))}
 else if(view==='fav'){title='Favourites';const c=sec('colour'),i=c.indexOf(fav);body=i<0?c:c.slice(i)}
 else{title='Feel';pre='<canvas class="prev2" id="prev2" width="600" height="128" aria-label="Preview of the current pen"></canvas>';
  const S=(k,l,on)=>swr('data-a="sw" data-o="pn" data-k="'+k+'"',l,on);
  body='<section class="csec" data-sec="feel"><h5>Tip and response</h5>'+sec('feel')+'</section>'+
   '<section class="csec" data-sec="feel"><h5>Math assist</h5>'+S('hold','Draw and hold for a perfect shape',PN.hold)+S('snap','Snap shapes',PN.snap)+S('fill','Fill closed shapes',PN.fill)+clab('Aids')+swr('data-a="ruler"','Ruler',!$('#ruler').hidden)+swr('data-a="magnifier"','Magnifier',R.pad==='mag')+'</section>'+
   '<section class="csec" data-sec="page"><h5>Paper and layers</h5>'+sec('page')+'</section>'}
 body=body.replace('and joins the end of the pill. Tap to use','. Tap to use').replace('Your colours join the dots on the pill. Up to 6, newest first.','Your colours join the recent dots. Up to 6, newest first.').replace('<div class="clab">Manage favourites</div>','<div class="clab">Saved pens</div>');
 return{title,html:cheadX(title,'data-a="close"')+pre+cpane(body)}}
function insertHtml(){const pro=isPro();
 const T=(l,arr)=>clab(l)+'<div class="tiles">'+arr.map(a=>tile(a[0],a[1],a[2],a[3])).join('')+'</div>';
 let h=T('Add to the page',[['table','Table','table'],['pic','Picture','img'],['callout','Callout','quote'],['recall','Recall card','stack'],['box','Text box','text'],['link','Link','link'],['elements','Elements','sticker'],['divider','Divider','minus'],['camera','Camera','camera']]);
 if(pro)h+=T('Media and handwriting',[['file','File or PDF','ftext'],['audio',R.rec!=null?'Stop audio':'Audio','mic',R.rec!=null],['writepad','Write pad','pencil',R.pad==='write'],['handwriting','Handwriting','wave'],['mic','Mic','mic',!$('#strip').hidden]])+
  T('Page',[['pagelink','Page link','link'],['database','Database','database'],['mindmap','Mind map','mindmap'],['summary','Summary','ftext'],['instemplate','Insert template','fplus'],['savetemplate','Save as template','file'],['tohome','To Home','house']]);
 return cheadX('Insert','data-a="close"')+cpane(h)}
renderAcard=function(){const on=!!(R.acard&&ACARD_VIEWS.includes(V.dd)&&!R.reading&&!R.tbHidden);
 acard.classList.toggle('show',on);acard.setAttribute('aria-hidden',!on);acard.dataset.view=V.dd||'';
 if(!on){acard.dataset.open='';acard.classList.remove('bpen');return}
 const beg=!isPro(),keyV=V.dd+'|'+(V.dd==='box'?R.ctab.text:'');
 const fresh=acard.dataset.key!==keyV;acard.dataset.key=keyV;if(fresh)acard.innerHTML='';acard.dataset.open='1';
 acard.classList.toggle('bpen',beg&&V.dd==='feel');
 let html;
 if(V.dd==='insert')html=insertHtml();
 else if(V.dd==='format')html=formatHtml();
 else if(V.dd==='box'){if(!CTABS.text.some(x=>x[0]===R.ctab.text))R.ctab.text='box';html=textCardHtml().replace('<strong>Text</strong>','<strong>Box</strong>').replace('<div class="clab">Corners</div>',clab('Outline style')+group('Outline style','',[['Solid','solid'],['Dashed','dashed'],['Dotted','dotted']].map(([n,k])=>chip('data-v6="ostyle" data-v="'+k+'"',n,(curBox()&&curBox().dataset.bds||'solid')===k)).join(''))+'<div class="clab">Corners</div>');
  if(R.ctab.text==='layout')html=html.replace(/<\/div>$/,clab('This box')+swr('data-v6="lock"','Lock size',!!(curBox()&&curBox().dataset.lock))+clab('Width')+group('Width','four',[['Auto','auto'],['Narrow','160'],['Medium','280'],['Wide','wide']].map(([n,x])=>chip('data-v6="width" data-v="'+x+'"',n,false)).join(''))+'</div>')}
 else if(beg&&V.dd==='feel')html=bpFeel();
 else html=penView(V.dd).html;
 if(fresh)R.tabIn=true;fillCard(acard,html);
 if(beg&&V.dd==='feel')bpFix();
 if(!$('.ctabs',acard))acard.insertAdjacentHTML('beforeend','<div class="ctabs" hidden aria-hidden="true"></div>');
 placeCard(acard);fitCard(acard);placeCard(acard);
 if(V.dd==='feel'&&!beg)drawPreview();R.tabIn=false};
function bpFeel(){if(BP.view==='math'){return'<div class="ch"><button class="sq" data-bp="back" aria-label="Back to Feel">'+svg('chevL')+'</button><strong>Math assist</strong><button class="sq" data-a="close" aria-label="Close">✕</button></div><div class="cpane" role="group" aria-label="Math assist">'+
  swr('data-a="sw" data-o="pn" data-k="hold"','Draw and hold for a perfect shape',PN.hold)+swr('data-a="sw" data-o="pn" data-k="snap"','Snap shapes',PN.snap)+swr('data-a="sw" data-o="pn" data-k="fill"','Fill closed shapes',PN.fill)+clab('Aids')+swr('data-a="ruler"','Ruler',!$('#ruler').hidden)+swr('data-a="magnifier"','Magnifier',R.pad==='mag')+'</div>'}
 return bpCard()}
function bpFix(){const h=$('.ch strong',acard);if(BP.view==='main'){if(h)h.textContent='Feel';
  $$('.clab',acard).forEach(l=>{if(l.textContent==='Pen type'){const n=l.nextElementSibling;if(n&&n.classList.contains('bptiles'))n.remove();l.remove()}});
  const set=$$('.clab',acard).find(l=>l.textContent==='Settings');if(set)set.insertAdjacentHTML('beforebegin',clab('Page')+mchip('paper','Page style',PAPER_N[PN.paper]||'Lined','file'))}}
/* the card's own small controls */
acard.addEventListener('click',e=>{const b=e.target.closest('[data-v6]');if(!b)return;const k=b.dataset.v6,v=b.dataset.v,isHl=R.pen==='Highlighter';
 if(k==='size'){if(isHl)R.hlSize=v;else{R.size=v;PN.exact=null;save()}}
 else if(k==='col'){if(isHl)R.hlCol=v;else R.penCol=v}
 else if(k==='width'){setWidth(isNaN(+v)?v:+v)}
 else if(k==='picker'){allAct('Colour picker');return}
 else if(k==='font')tcardClick('font',FONTS[+v][1]);
 else if(k==='fsize')tcardClick('fsize',+v);
 else if(k==='bsize'){const bb=curBox();if(!bb){toast('Tap a text box first');return}bb.dataset.size=v;resolveOverlap(bb);flush();updateBoxBar()}
 else if(k==='blk')blockStyle(v);
 else if(k==='act')TEXTACT[v]();
 else if(k==='fmt')fmt(v);
 else if(k==='tcol')fmt('foreColor',v==='auto'?css('--ink'):v);
 else if(k==='hcol')fmt('hiliteColor',hexA(v));
 else if(k==='pgap'){const bb=curBox();if(!bb){toast('Tap a text box first');return}bb.dataset.pgap=v;flush()}
 else if(k==='ls'){const bb=curBox();if(!bb){toast('Tap a text box first');return}bb.style.letterSpacing=v==='normal'?'':v;flush()}
 else if(k==='ostyle'){const bb=curBox();if(!bb){toast('Tap a box first');return}bb.dataset.bds=v;if(!curV().bd)setStyle({bd:'1.5px',bdc:curV().bdc||'var(--ink-soft)'});flush()}
 else if(k==='lock'){const bb=curBox();if(!bb){toast('Tap a box first');return}if(bb.dataset.lock)delete bb.dataset.lock;else bb.dataset.lock='1';flush();toast(bb.dataset.lock?'Size locked':'Size unlocked')}
 else if(k==='savestyle'){toast('Custom style saved (demo)');return}
 else if(k==='clear'){fmt('removeFormat');toast('Formatting cleared');return}
 renderOpts()});
/* lasso dropdowns */
renderLcard=function(){const on=!!(R.lcard&&LDD.includes(V.dd)&&!R.reading&&!R.tbHidden);lcard.classList.toggle('show',on);lcard.setAttribute('aria-hidden',!on);if(!on)return;
 const tab={lsel:'select',lmenu:'menu',llayers:'layers'}[V.dd];let h='',title={select:'Select',menu:'Selection menu',layers:'Layers'}[tab];
 if(tab==='select')h=clab('Shape')+group('Lasso shape','two',LSHAPE.map(([k,ic,n])=>chip('data-l="shape" data-v="'+k+'"',n,ST.lasso.shape===k,ic)).join(''))+
  clab('What it picks')+LFILT.map(([k,ic,n])=>swr('data-l="f" data-v="'+k+'"',n,ST.lasso[k])).join('')+enote('After you select, a menu appears by the selection. Drag inside the box to move; the dots resize and the turn dot rotates.');
 else if(tab==='menu')h=clab('Actions in the menu row')+ROWACT.map(a=>swr('data-l="row" data-v="'+a+'"',ROWNAME[a],ST.lasso.row.includes(a))).join('')+enote('Actions you switch off stay one tap away, under More.')+abtn('data-l="arrange"','Arrange the menu…','sliders');
 else h=layersHtml()+enote('A hidden or locked layer cannot be selected.');
 const fresh=lcard.dataset.key!==V.dd;lcard.dataset.key=V.dd;if(fresh)lcard.innerHTML='';
 fillCard(lcard,cheadX(title,'data-l="close"')+cpane(h));placeCard(lcard);fitCard(lcard);placeCard(lcard)};
{const ra=renderAcard;renderAcard=function(){ra();renderEl()}}
/* elements dropdown hangs from Insert */
renderEl=function(){const on=EL.open&&!R.reading&&!R.tbHidden;elcard.classList.toggle('show',on);elcard.setAttribute('aria-hidden',!on);
 if(!on){if(!EL.open)EL.edit=false;return}
 const q=$('#elQ',elcard),had=q&&document.activeElement===q,ss=q?q.selectionStart:0;
 fillCard(elcard,elHtml());elGrid();placeCard(elcard);fitCard(elcard);placeCard(elcard);
 if(had){const n=$('#elQ',elcard);n.focus();try{n.setSelectionRange(ss,ss)}catch(_){}}};
{const ia=insertAct;insertAct=function(k){
 if(k==='mic'){v6Close();toggleStrip();renderOpts();return}
 if(k==='elements'){v6Close();V.dd='elements';V.aid='insert';ia(k);return}
 const r=ia(k);if(V.dd==='insert'){v6Close();renderOpts()}return r}}
openBoxStyle=function(){if(R.tool!=='text')setTool('text');V.tab='text';ensureBox();R.optsOn=true;renderOpts();const b=$dd('box');if(b&&V.open.box)V.open.box(b,true)};
openPenAt=function(tab){if(R.tool!=='pen')setTool('pen');if(V.tab==='shapes')V.tab='pen';renderOpts();const id=tab==='stroke'?'size':tab==='colour'?'colour':'feel',b=$dd(id);R.ctab.pen=tab==='page'?'feel':tab;if(b&&V.open[id])V.open[id](b)};

/* ============ More: everything that is not on the bars ============ */
renderMore=function(){if(!MC.open)return;const pro=isPro();
 const row=(k,ic,n,d,end)=>'<button class="mrow" data-z="'+k+'"'+(end==='sw-on'||end==='sw-off'?' role="switch" aria-checked="'+(end==='sw-on')+'"':'')+' aria-label="'+n+'">'+svg(ic)+'<span class="mt"><b>'+n+'</b><i>'+d+'</i></span>'+(end==='go'?svg('chevR'):end?'<span class="sw2" aria-hidden="true"></span>':'')+'</button>';
 const sw=on=>on?'sw-on':'sw-off',tiles=(l,names)=>clab(l)+'<div class="tiles">'+names.map(n=>{const c=ACHIP[n];return'<button class="tile" data-zz="'+esc(n)+'" aria-label="'+esc(n)+'">'+(c&&c.ic?c.ic():svg(TOOLICON[n]||'insert'))+'<span>'+n+'</span></button>'}).join('')+'</div>';
 let h='<div class="ch"><strong>More</strong><button class="sq" data-z="x" aria-label="Close">✕</button></div><div class="cpane">';
 h+=clab('Tools')+row('last','last','Back to '+TOOLS[R.prevTool][0],'Jump to the tool you used before.')+row('kbd','kb','Keyboard','Bring the keyboard up, or put it away.')+(pro?row('nl','newline','New line','Hold or double-tap for Heading, Checklist, Divider.')+row('bs','back','Backspace','Delete the character before the caret.'):'')+row('srch','search','Search','Find in this page.');
 h+=clab('View')+row('read','read','Reading mode','Hides the tools so you can just read.',sw(R.reading))+row('focus','focus','Focus mode','Dims everything except the box you are in.',sw(R.focusMode));
 if(pro)h+=tiles('Zoom and look',ALLTABS.View);
 h+=clab('Write & input')+row('kbh','kboff','Keyboard stays hidden','The on-screen keyboard will not pop up. The Keyboard row brings it when you want it.',sw(ST.kbHidden))+
  '<div class="mlab">'+svg('clipboard')+'<span class="mt"><b>Copy & paste</b><i>Works on the text you selected.</i></span></div><div class="chips" role="group" aria-label="Copy and paste">'+chip('data-z="copy"','Copy',false,'copy').replace('role="radio" aria-checked="false" ','')+chip('data-z="cut"','Cut',false,'scissors').replace('role="radio" aria-checked="false" ','')+chip('data-z="paste"','Paste',false,'clipboard').replace('role="radio" aria-checked="false" ','')+'</div>';
 if(pro)h+=tiles('Study',ALLTABS.Study)+tiles('File',ALLTABS.File);
 h+=clab('Layout & settings')+row('lay','layout','Toolbar layouts','Switch, rename or reset a layout.','go')+row('cust','sliders','Customise toolbar','Choose which tools show, and their order.','go')+row('sett','gear','Toolbar settings','Keyboard, Pencil and New line behaviour.','go')+row('hide','eyeOff','Hide toolbar','Tucks the toolbar away. A small button brings it back.','go');
 h+=clab('Help')+row('help','help','Where things live','A short map of the toolbar.','go');
 h+='</div>';
 const p0=$('.cpane',morecard),keep=p0?p0.scrollTop:0;morecard.innerHTML=h;$('.cpane',morecard).scrollTop=keep;morecard.classList.add('show');morecard.setAttribute('aria-hidden','false');
 if(!MC.a||!MC.a.isConnected)MC.a=$('#tb [data-id=more]');
 const r=MC.a.getBoundingClientRect(),w=morecard.offsetWidth,top=Math.max(8,Math.min(r.bottom+6,innerHeight-morecard.offsetHeight-8));
 morecard.style.top=top+'px';morecard.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'};
morecard.addEventListener('click',e=>{const t=e.target.closest('[data-zz]');if(t){const n=t.dataset.zz,c=ACHIP[n];moreClose();ACHIPNAME=n;if(c)c.f();else allAct(n);return}
 const b=e.target.closest('[data-z]');if(!b)return;const k=b.dataset.z;
 if(k==='last'){moreClose();setTool(R.prevTool)}
 else if(k==='kbd'){moreClose();toggleKb()}
 else if(k==='nl'){moreClose();doNewline()}
 else if(k==='bs'){doBack()}
 else if(k==='srch'){moreClose();toast('Search would open here (mock)')}
 else if(k==='lay'){moreClose();layoutMenu($('#tb [data-id=more]'))}
 else if(k==='help'){moreClose();helpSheet()}});
function helpSheet(){const L=[['Main bar','Text, Pen, Eraser, Shapes, Lasso and Insert ▾ on the left. Undo, Redo, More and the one minimise on the right.'],
 ['Text','Box ▾ (looks, layout, box settings) · Font ▾ · Style ▾ (headings, body, quote, code) · List ▾ · B · I · Format ▾ (underline, strike, colour, highlight, align, callout, divider, inline code).'],
 ['Pen','Pen ▾ (ball, brush, pencil, marker, highlighter) · Size ▾ · Colour ▾ · Feel ▾ (pressure, stabilisation, line style, paper, layers, writing aids, math assist) · Favourites ▾.'],
 ['Eraser','Mode ▾ · Size ▾ · Options ▾.'],['Shapes','Shape ▾ (line, arrow, box, oval, triangle, tape) · Size ▾ · Colour ▾. Ruler and Magnifier are in Pen > Feel > Math assist.'],
 ['Lasso','Select ▾ (shape, what it picks) · Menu ▾ (selection menu actions) · Layers ▾. The selection menu itself appears by the selection.'],
 ['Insert ▾','Table, Picture, Callout, Recall card, Text box, Link, Elements, Divider, Camera. Professional adds files, audio, write pad, handwriting, Mic, page links, database, mind map, templates.'],
 ['More','Back to last tool, Keyboard, New line, Backspace, Search · reading and focus mode, zoom · keyboard setting, copy and paste · study and file actions · layouts, customise, settings, hide.'],
 ['Beginner and Professional','Same bars, same buttons. Professional only adds more choices inside the ▾ menus.']];
 openSheet('<h3>Where things live</h3><div class="helpmap">'+L.map(([a,b])=>'<p><b>'+a+'</b><br><span class="muted">'+b+'</span></p>').join('')+'</div>','<button class="lay primary" data-act="close">Done</button>')}
Object.assign(MICON,{'Heading 2':'h2','Heading 3':'h3','Title':'h1','Bullets':'list','Numbers':'olist','Star list':'star','Toggle list':'toglist','Indent':'indent','Outdent':'outdent','Quote':'quote','Code block':'code','Callout':'quote','Inline code':'code','Underline':'underline','Strikethrough':'strike','Text colour':'palette','Highlight colour':'hlight','Align':'alignL','Colour':'palette'});

function v6BoxCard(which,b){if(R.tool!=='text')setTool('text');V.tab='text';select(b);
 if(!isPro()&&which==='box'){renderOpts();const bt=$dd('box');if(bt)V.open.box(bt,true);return}
 v6Close();V.dd=which;V.aid=which;V.anchorEl=b;R.acard=true;R.ctab.text='box';R.optsOn=true;R.tabIn=true;renderOpts();R.tabIn=false}
{const bm0=boxMenu;boxMenu=function(b,anchor){V.inj={b};try{return bm0(b,anchor)}finally{V.inj=null}}}
{const om0=openMenu;openMenu=function(items,anchor,title){if(V.inj){const b=V.inj.b;V.inj=null;items=[{t:'Box style…',f:()=>v6BoxCard('box',b)},{t:'Format…',f:()=>v6BoxCard('format',b)},...items]}return om0.call(this,items,anchor,title)}}
MICON['Format…']='palette';

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

/* ============ v8b: V1, every change shows ============
   1. the changed part glows once (the ▾ on the row since v7; now also the switch row, the box, the page);
   2. new bars and items slide or fade in (v8.css);
   3. a switch answers with "X turned on · Undo" (a pick you can see on the page or the row does not need words);
   4. every switch row carries a tiny live picture of what it does; three-way spacing choices carry a glyph. */
const V8SURF='#acard,#lcard,#more,#morecard,#sheet,#elcard,#laycard';
const v8SwLabel=e=>{const row=e.classList.contains('switch')?e.closest('.srow'):null;if(row){const b=row.querySelector('b');if(b)return b.textContent.trim()}
 return(e.getAttribute('aria-label')||((e.querySelector('b')||e.querySelector('span:not(.sw2):not(.v8pv)')||e).textContent)||'').trim()};
const v8SwSig=e=>((e.closest(V8SURF)||{}).id||'')+'|'+v8SwLabel(e)+'|'+['k','o','a','z','act','id','ct'].map(k=>e.dataset[k]||'').join('|');
const v8Short=l=>l.replace(/ until I ask$/,'').replace(/ \(Scribble\)$/,'').replace(/ after one erase$/,'').replace(/ for a perfect shape$/,'');

/* ---- settings snapshot: Undo puts every setting back exactly, wherever the card went ---- */
const V8R=['pen','size','hlSize','penCol','hlCol','eraser','lassoMode','defSize'];
const v8Snap=()=>JSON.stringify({ST,R:V8R.map(k=>R[k])});
function v8Assign(d,s){Object.keys(d).forEach(k=>{if(!(k in s))delete d[k]});
 Object.entries(s).forEach(([k,v])=>{const c=d[k];if(Array.isArray(v)&&Array.isArray(c)){c.length=0;c.push(...v)}else if(v&&typeof v==='object'&&!Array.isArray(v)&&c&&typeof c==='object'&&!Array.isArray(c))v8Assign(c,v);else d[k]=v})}
function v8Restore(s){const o=JSON.parse(s);v8Assign(ST,o.ST);V8R.forEach((k,i)=>{R[k]=o.R[i]});save();paper.dataset.paper=PN.paper;V8.noFb++;try{renderToolbar();v6Sync();rerender();if(MC.open)renderMore()}finally{V8.noFb--}}

/* ---- glow ---- */
function v8Flash(el,cls,ms){if(!el||v7RM())return;cls=cls||'v8flash';if(el.classList.contains(cls))return;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),ms||720)}
function v8Toast(msg,undo){if(undo)toastAct(msg,'Undo',undo);else toast(msg)}
{const ss8=setStyle;setStyle=function(p,w,q){const r=ss8(p,w,q);if(!q)v8Flash(curBox());return r}}
{const sp8=setPaper;setPaper=function(k){const was=PN.paper;sp8(k);if(was!==k)v8Flash(paper)}}
acard.addEventListener('click',e=>{if((V.dd==='box'||V.dd==='format')&&e.target.closest('button')&&!e.target.closest('.ch,.v7seg,.ctabs,[role=switch]'))setTimeout(()=>v8Flash(curBox()),0)});

/* ---- a switch answers: its row glows, a message says what happened, Undo takes it back ---- */
document.addEventListener('click',e=>{if(V8.noFb||typeof shellReady==='undefined'||!shellReady)return;const t=e.target;if(!t||!t.closest)return;const s=t.closest('[role=switch]');
 if(!s||s.disabled||!s.closest(V8SURF)||s.dataset.v8quiet!=null)return;
 const sig=v8SwSig(s),was=s.getAttribute('aria-checked')==='true',lab=v8Short(v8SwLabel(s)),snap=v8Snap(),find=()=>$$('[role=switch]').find(x=>v8SwSig(x)===sig);
 setTimeout(()=>{const now=find();if(!now)return;const on=now.getAttribute('aria-checked')==='true';if(on===was)return;
  const row=now.closest('.srow')||now;row.classList.remove('v8rowglow');void row.offsetWidth;if(!v7RM())row.classList.add('v8rowglow');
  v8Toast(lab+(on?' turned on':' turned off'),()=>{const again=find();V8.noFb++;try{if(again&&(again.getAttribute('aria-checked')==='true')===on)again.click();else if(v8Snap()!==snap)v8Restore(snap)}finally{V8.noFb--}
   toast(lab+(on?' is off again':' is on again'))})},0)},true);

/* ---- tiny live pictures (32 × 20). Each one draws the OFF and the ON result ---- */
const v8Loop='<ellipse class="a" cx="16" cy="10" rx="13" ry="8.5" stroke-dasharray="2.5 2.5"/>';
const V8MINI=[
 [/highlights only/i,on=>on?'<path d="M3 6h26"/><path class="h" d="M3 14h8M21 14h8"/>':'<path d="M3 6h8M21 6h8"/><path class="h" d="M3 14h8M21 14h8"/>'],
 [/previous tool/i,on=>on?'<rect class="d" x="19" y="5" width="9" height="10" rx="2"/><path class="a" d="M16 10H4m0 0 3.5-3.5M4 10l3.5 3.5"/>':'<rect x="19" y="5" width="9" height="10" rx="2"/><path class="d" d="M4 10h10"/>'],
 [/tilt widens/i,on=>on?'<path class="af" d="M3 10 29 5v10z"/>':'<path d="M3 10h26"/>'],
 [/thickness by speed/i,on=>on?'<path class="af" d="M3 11c6-8 9 6 14 1s8-5 12-2c-4-1-8 3-12 4S9 8 3 11z"/>':'<path d="M3 11c6-8 9 6 14 1s8-5 12-2"/>'],
 [/scribble to erase/i,on=>on?'<path class="d" d="M2 10h3M27 10h3"/><path class="a" d="M6 14l3.3-8 3.3 8 3.4-8 3.3 8 3.3-8 3.4 8"/>':'<path d="M3 10h26"/><path class="d" d="M6 14l3.3-8 3.3 8 3.4-8 3.3 8 3.3-8 3.4 8"/>'],
 [/circle to lasso/i,on=>on?v8Loop+'<path d="M11 11c2-4 4 3 6 0s3-2 4 0"/>':'<ellipse class="d" cx="16" cy="10" rx="13" ry="8.5"/><path d="M11 11c2-4 4 3 6 0s3-2 4 0"/>'],
 [/reduce latency/i,on=>on?'<path class="a" d="M4 15c6 0 8-10 14-10h6"/><circle class="af" cx="26" cy="5" r="2.2"/>':'<path d="M4 15c6 0 7-8 11-9.5"/><circle class="f" cx="26" cy="5" r="2.2"/>'],
 [/draw and hold/i,on=>on?'<circle class="a" cx="16" cy="10" r="7.5"/>':'<path d="M9 10c-1-5 4-8 8-7s8 3 6 8-6 7-10 6-3-3-4-7z"/>'],
 [/snap shapes/i,on=>on?'<path class="a" d="M5 10h22"/><circle class="af" cx="5" cy="10" r="2"/><circle class="af" cx="27" cy="10" r="2"/>':'<path d="M5 13c7-1 14-5 22-6"/>'],
 [/fill closed/i,on=>on?'<rect class="a" x="8" y="3.5" width="16" height="13" rx="2.5" style="fill:var(--accent);fill-opacity:.4"/>':'<rect x="8" y="3.5" width="16" height="13" rx="2.5"/>'],
 [/^ruler/i,on=>'<rect '+(on?'class="a" ':'class="d" ')+'x="3" y="6" width="26" height="8" rx="1.5"/><path class="t'+(on?' a':' d')+'" d="M8 6v3M12 6v4M16 6v3M20 6v4M24 6v3"/>'],
 [/^magnifier/i,on=>'<circle '+(on?'class="a" ':'')+'cx="14" cy="9" r="6"/><path '+(on?'class="a" ':'')+'d="M18.5 13.5 24 18"/>'+(on?'<path class="t" d="M11 9h6M14 6v6"/>':'')],
 [/snap to text lines/i,on=>'<path class="t d" d="M3 15h26"/>'+(on?'<path class="h" d="M5 11.5h22"/>':'<path class="h" d="M5 12 27 6"/>')],
 [/behind ink/i,on=>on?'<path class="h" d="M6 10h20"/><path d="M3 10c5-5 8 5 13 0s8-4 13 0"/>':'<path d="M3 10c5-5 8 5 13 0s8-4 13 0"/><path class="h" style="opacity:.85" d="M6 10h20"/>'],
 [/^ink$/i,on=>(on?v8Loop:'')+'<path '+(on?'':'class="d" ')+'d="M10 11c2-4 4 3 6 0s4-2 6 0"/>'],
 [/^pictures$/i,on=>(on?v8Loop:'')+'<g '+(on?'':'class="d"')+'><rect x="11" y="6" width="10" height="8" rx="1.5"/><path class="t" d="M12 13l3-3 2 2 1.5-1.5L21 13"/></g>'],
 [/^text$/i,on=>(on?v8Loop:'')+'<path '+(on?'':'class="d" ')+'d="M12 7h8M16 7v7"/>'],
 [/use for new boxes/i,on=>'<rect x="4" y="5" width="10" height="10" rx="2.5"/>'+(on?'<rect class="a" x="18" y="5" width="10" height="10" rx="2.5"/>':'<rect class="d" stroke-dasharray="2 2" x="18" y="5" width="10" height="10" rx="2.5"/>')],
 [/reading mode/i,on=>on?'<path class="a" d="M6 5h20M6 10h20M6 15h13"/>':'<rect x="5" y="2.5" width="22" height="5" rx="1.5"/><path class="d" d="M6 12h20M6 16h13"/>'],
 [/focus mode/i,on=>on?'<path class="d" d="M6 4h20M6 16h13"/><path class="a" d="M6 10h20"/>':'<path d="M6 4h20M6 10h20M6 16h13"/>'],
 [/keyboard stays hidden/i,on=>on?'<path class="a" d="M6 4h20M6 8h20M6 12h12"/><rect class="d" stroke-dasharray="2 2" x="5" y="15" width="22" height="3.5" rx="1"/>':'<path class="d" d="M6 3h20M6 6.5h12"/><rect x="5" y="10" width="22" height="8.5" rx="1.5"/><path class="t" d="M8 13h2M12 13h2M16 13h2M20 13h2M10 16h10"/>'],
 [/names under icons/i,on=>on?'<rect x="4" y="3" width="6" height="6" rx="1.5"/><rect x="13" y="3" width="6" height="6" rx="1.5"/><rect x="22" y="3" width="6" height="6" rx="1.5"/><path class="a" d="M4 14h6M13 14h6M22 14h6"/>':'<rect x="4" y="7" width="6" height="6" rx="1.5"/><rect x="13" y="7" width="6" height="6" rx="1.5"/><rect x="22" y="7" width="6" height="6" rx="1.5"/>'],
 [/options stay open/i,on=>'<rect x="4" y="3" width="24" height="5.5" rx="1.5"/>'+(on?'<rect class="a" x="4" y="11" width="24" height="5.5" rx="1.5"/>':'<rect class="d" stroke-dasharray="2 2" x="4" y="11" width="24" height="5.5" rx="1.5"/>')],
 [/pencil picks the pen/i,on=>'<path d="M4 16l1.5-4.5L14 4l3 3-8.5 8z"/>'+(on?'<rect class="a" x="20" y="5" width="9" height="10" rx="2.5" style="fill:var(--accent);fill-opacity:.35"/>':'<rect class="d" x="20" y="5" width="9" height="10" rx="2.5"/>')],
 [/finger only/i,on=>'<rect x="4" y="3" width="24" height="6" rx="2"/>'+(on?'<circle class="af" cx="16" cy="6" r="1.8"/><path class="a" d="M16 9v8"/><path class="d" d="M24 17l1-3 3-3"/>':'<path d="M12 17l1.2-3.6L19 9"/><path class="d" d="M24 17V9"/>')],
 [/pencil writes text/i,on=>on?'<path class="d" d="M3 8c2-5 3 3 5-1s3 3 5-1"/><path class="a" d="M17 7h11M17 11h11M17 15h7"/>':'<path d="M4 11c2-7 4 4 6-1s4 4 6-1 4 4 6-1 3 2 5 0"/>'],
 [/pencil can scroll/i,on=>'<rect class="d" x="9" y="2.5" width="14" height="15" rx="2.5"/><path '+(on?'class="a" ':'class="d" ')+'d="M16 5.5v9m0-9-3 3m3-3 3 3m-3 6-3-3m3 3 3-3"/>'],
 [/professional choices/i,on=>on?'<rect x="3" y="3" width="26" height="6" rx="2"/><rect class="a" x="3" y="12" width="7" height="5" rx="1.5"/><rect class="a" x="12.5" y="12" width="7" height="5" rx="1.5"/><rect class="a" x="22" y="12" width="7" height="5" rx="1.5"/>':'<rect x="3" y="3" width="26" height="6" rx="2"/><rect x="3" y="12" width="7" height="5" rx="1.5"/><rect class="d" stroke-dasharray="2 2" x="12.5" y="12" width="7" height="5" rx="1.5"/>'],
 [/^pressure$/i,on=>on?'<path class="af" d="M3 10c5-1 8-5 13-5s8 4 13 5c-5 1-8 5-13 5S8 11 3 10z"/>':'<path d="M3 10h26"/>'],
 [/^shadow$/i,on=>(on?'<rect class="f d" x="9" y="6" width="18" height="12" rx="2.5"/>':'')+'<rect x="6" y="3" width="18" height="12" rx="2.5" style="fill:var(--pv-fill)"'+(on?' class="a"':'')+'/>'],
 [/custom tools/i,on=>'<rect x="3" y="6" width="7" height="8" rx="2"/><rect x="12" y="6" width="7" height="8" rx="2"/>'+(on?'<path class="af" d="M25 4.5l1.6 3.3 3.6.5-2.6 2.6.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.6 3.6-.5z"/>':'<path class="d" d="M25 4.5l1.6 3.3 3.6.5-2.6 2.6.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.6 3.6-.5z"/>')]
];
const V8ICON={Copy:'copy',Cut:'scissors',Duplicate:'dup','Convert to text':'typeic',Colour:'palette',Delete:'trash',Thickness:'sliders','Make card':'stack','Add to Summary':'anchor','Name this drawing':'pencil'};
function v8Minis(root){if(!root)return;$$('[role=switch]',root).forEach(s=>{const lab=v8SwLabel(s),ic=s.closest('#lcard')&&V8ICON[lab],m=ic?[0,()=>'']:V8MINI.find(x=>x[0].test(lab)&&(x[0].source[0]!=='^'||!/ink|pictures|text/.test(x[0].source)||s.closest('#lcard')));if(!m)return;const on=s.getAttribute('aria-checked')==='true';
 const host=s.classList.contains('switch')?s.closest('.srow'):s;if(!host)return;let pv=host.querySelector(':scope>.v8pv');
 if(!pv){pv=document.createElement('i');pv.className='v8pv';pv.setAttribute('aria-hidden','true');const lead=host.firstElementChild;if(lead&&(lead.tagName.toLowerCase()==='svg'||lead.classList.contains('ico')))lead.replaceWith(pv);else host.prepend(pv)}
 pv.innerHTML=ic?svg(ic).replace('<svg','<svg class="v8ic"'):'<svg viewBox="0 0 32 20">'+m[1](on)+'</svg>';host.classList.toggle('v8on',on)});
 v8Glyphs(root)}
/* spacing choices: three lines (or bars) set as far apart as the choice sets them */
function v8Glyphs(root){const G=[['[data-a=lh]',i=>{const g=[3,4.5,6][Math.min(2,i)];return'M3 '+(8-g)+'h16M3 8h16M3 '+(8+g)+'h16'}],['[data-v6=pgap]',i=>{const g=[1,2.5,4][Math.min(2,i)];return'M3 '+(4-g/2).toFixed(1)+'h16M3 '+(6.5-g/2).toFixed(1)+'h10M3 '+(9.5+g/2).toFixed(1)+'h16M3 '+(12+g/2).toFixed(1)+'h10'}],['[data-v6=ls]',i=>{const g=[4,6,8][Math.min(2,i)];return'M'+(11-g)+' 3v10M11 3v10M'+(11+g)+' 3v10'}]];
 G.forEach(([sel,f])=>{const cs=$$('.chip'+sel,root);cs.forEach((c,i)=>{if(c.querySelector('.v8gl'))return;c.insertAdjacentHTML('afterbegin','<svg class="v8gl" viewBox="0 0 22 16" aria-hidden="true"><path d="'+f(cs.length>3?Math.round(i*2/(cs.length-1)):i)+'"/></svg>')})})}
{const fc8=fillCard;fillCard=function(el,html){fc8(el,html);v8Minis(el)}}

/* ============ v8c: V4 custom tools (Professional; Beginner can unlock them) ============
   ★ at the end of every tool row saves the setup you have NOW as a one-tap tool: any mix of Pen, Shape, Eraser, Lasso and Text box.
   The save sheet asks for a name, a picture and WHERE it sits (row + position) and shows the toolbar as it will look.
   Hold a custom tool for Edit mode (drag to reorder, tap to change, ✕ to remove). More › Custom tools manages them all.
   The row never scrolls sideways: tools that do not fit fold into one "⋯ n" button. */
if(!ST.ct||!Array.isArray(ST.ct.list)){ST.ct={list:[],unlock:false,seq:1}}
const CT={edit:false,draft:null,fresh:null,suppress:false,ht:0};
const ctOn=()=>isPro()||!!ST.ct.unlock;
const CTROWS=[['main','Main bar'],['text','Text'],['pen','Pen'],['shapes','Shapes'],['eraser','Eraser'],['lasso','Lasso']];
const ctRowName=r=>r==='main'?'Main bar':CTROWS.find(x=>x[0]===r)[1]+' row';
const CTPART={pen:'pen',text:'box',shapes:'shape',eraser:'eraser',lasso:'lasso'};
const CTSH={free:['Freehand','pen'],line:['Line','diagonal'],arrow:['Arrow','arrow'],box:['Box','square'],oval:['Oval','oval'],triangle:['Triangle','triangle'],tape:['Tape','tape']};
const ctColName=(c,hl)=>((hl?HLCOL:PENCOL).find(x=>x[1]===c)||['Own colour'])[0];
const ctFont=v=>(FONTS.find(f=>f[1]===(v.ff||'inherit'))||['Default'])[0];
const CTP={
 pen:{n:'Pen',tab:'pen',get:()=>{const hl=R.pen==='Highlighter';return{pen:R.pen,col:hl?R.hlCol:R.penCol,size:hl?R.hlSize:R.size,exact:hl?null:PN.exact,ls:PN.ls,pOn:PN.pOn,press:PN.press,smooth:PN.smooth,sharp:PN.sharp,op:HN.op}},
  set:p=>{R.pen=p.pen;if(p.pen==='Highlighter'){R.hlCol=p.col;R.hlSize=p.size;HN.op=p.op}else{R.penCol=p.col;R.size=p.size;PN.exact=p.exact;PN.ls=p.ls;PN.pOn=p.pOn;PN.press=p.press;PN.smooth=p.smooth;PN.sharp=p.sharp}},
  sum:p=>pname(p.pen)+' · '+(p.exact!=null?p.exact+' px':p.size)+' · '+ctColName(p.col,p.pen==='Highlighter'),
  pv:p=>v7Sample(TYPEK[p.pen],cdot(p.col),30,14)},
 shape:{n:'Shape',tab:'shapes',get:()=>({shape:PN.shape}),set:p=>{PN.shape=p.shape},sum:p=>(CTSH[p.shape]||CTSH.line)[0],pv:p=>svg((CTSH[p.shape]||CTSH.line)[1])},
 eraser:{n:'Eraser',tab:'eraser',get:()=>({mode:E.mode,size:E.size,hlOnly:E.hlOnly,ret:E.ret,beg:R.eraser}),set:p=>{E.mode=p.mode;E.size=p.size;E.hlOnly=p.hlOnly;E.ret=p.ret;R.eraser=p.beg},
  sum:p=>isPro()?({precise:'Precise',standard:'Standard',stroke:'Whole stroke'})[p.mode]+' · '+['Thin','Medium','Thick'][p.size]+(p.hlOnly?' · highlights only':''):p.beg,
  pv:p=>'<i class="v7edot" style="width:'+[8,13,18][p.size]+'px;height:'+[8,13,18][p.size]+'px"></i>'},
 lasso:{n:'Lasso',tab:'lasso',get:()=>({shape:ST.lasso.shape,ink:ST.lasso.ink,pictures:ST.lasso.pictures,text:ST.lasso.text,beg:R.lassoMode}),set:p=>{ST.lasso.shape=p.shape;ST.lasso.ink=p.ink;ST.lasso.pictures=p.pictures;ST.lasso.text=p.text;R.lassoMode=p.beg},
  sum:p=>isPro()?(p.shape==='rect'?'Rectangle':'Free-hand')+' · picks '+(['ink','pictures','text'].filter(k=>p[k]).join(', ')||'nothing'):p.beg,pv:p=>svg((isPro()?p.shape==='rect':p.beg==='Rectangle')?'square':'lasso')},
 box:{n:'Text box',tab:'text',get:()=>{const b=curBox();return{v:{...curV()},size:b?b.dataset.size||'body':(R.defSize||'body')}},set:p=>{setStyle(p.v,true);setStyle({ff:p.v.ff||null});const b=curBox();if(!b)R.defSize=p.size},
  sum:p=>styleName(p.v)+' · '+ctFont(p.v)+' font',pv:p=>bprev(p.v)}};
const CTKEYS=['pen','shape','eraser','lasso','box'];
const ctGet=id=>ST.ct.list.find(t=>t.id===id);
const ctIn=row=>ST.ct.list.filter(t=>t.row===row);
const ctMain=t=>{const k=CTPART[t.row];if(k&&t.parts[k])return k;return CTKEYS.find(k=>t.parts[k])};
const ctTab=t=>{const k=ctMain(t);let tab=CTP[k].tab;if(tab==='pen'&&t.parts.shape&&t.parts.shape.shape!=='free')tab='shapes';return tab};
const ctSum=t=>CTKEYS.filter(k=>t.parts[k]).map(k=>CTP[k].n+': '+CTP[k].sum(t.parts[k])).join(' + ');
const ctMatch=t=>V.tab===ctTab(t)&&CTKEYS.every(k=>!t.parts[k]||JSON.stringify(CTP[k].get())===JSON.stringify(t.parts[k]));
function ctPrev(t){if(t.icon&&t.icon!=='auto')return'<span class="v8ctp">'+svg(t.icon)+'</span>';const k=ctMain(t);return'<span class="v8ctp">'+(k?CTP[k].pv(t.parts[k]):svg('star'))+'</span>'}
function ctNat(r){if(r==='main')return['Text','Pen','Eraser','Shapes','Lasso','Insert'];const pro=isPro();
 return({text:pro?['Box','Format','Style','B','I','List']:['Box','Format','B','I'],pen:['Pen type','Size','Colour','Feel','Favourites'],shapes:['Shape','Size','Colour'],eraser:pro?['Mode','Size','Options']:['Mode'],lasso:pro?['Select','Menu','Layers']:['Shape','Actions']})[r]}

/* ---- the order model: natives are fixed, custom tools sit before native number `pos` ---- */
function ctSeq(row){const N=ctNat(row).length,cs=ctIn(row),seq=[];for(let i=0;i<N;i++){cs.forEach(c=>{if(Math.min(c.pos,N)===i)seq.push({c})});seq.push({n:i})}cs.forEach(c=>{if(c.pos>=N)seq.push({c})});return seq}
function ctApply(row,seq){let nat=0;const order=[];seq.forEach(it=>{if('n' in it)nat++;else{it.c.pos=nat;order.push(it.c)}});ST.ct.list=ST.ct.list.filter(t=>t.row!==row).concat(order);save();ctRender()}
function ctMoveBefore(id,target){const t=ctGet(id);if(!t)return;const seq=ctSeq(t.row).filter(it=>!(it.c&&it.c.id===id));let i=seq.length;
 if(target){const j=seq.findIndex(it=>target.ct?it.c&&it.c.id===target.ct:it.n===target.nat);if(j>=0)i=j}seq.splice(i,0,{c:t});ctApply(t.row,seq)}
function ctNudge(id,d){const t=ctGet(id);if(!t)return false;const seq=ctSeq(t.row),i=seq.findIndex(it=>it.c&&it.c.id===id),j=i+d;if(j<0||j>=seq.length)return false;const x=seq[i];seq[i]=seq[j];seq[j]=x;ctApply(t.row,seq);return true}
const ctCanNudge=(id,d)=>{const t=ctGet(id),seq=ctSeq(t.row),i=seq.findIndex(it=>it.c&&it.c.id===id);return i+d>=0&&i+d<seq.length};

/* ---- buttons on the bars ---- */
function ctBtn(t){const b=document.createElement('button');b.type='button';const used=ctMatch(t);b.className='v8ct'+(used?' used':'')+(CT.fresh===t.id?' v8new':'');b.dataset.ct=t.id;
 b.setAttribute('aria-label','Custom tool: '+t.name);b.setAttribute('aria-pressed',used);b.dataset.tip=CT.edit?'Drag to move, tap to change':ctSum(t);
 b.innerHTML=ctPrev(t)+'<span class="nm">'+esc(t.name)+'</span><span class="rm" role="button" aria-label="Remove '+esc(t.name)+'">'+svg('xmark')+'</span>';return b}
function ctFold(host,measure,after){if(innerWidth<=640)return;const hid=[];let cts=$$('.v8ct',host),o=null;const over=()=>measure.scrollWidth>measure.clientWidth+1;if(over()&&cts.length)host.classList.add('v8tight');
 while(over()&&cts.length){const b=cts.pop();hid.unshift(b.dataset.ct);b.remove();
  if(!o){o=document.createElement('button');o.type='button';o.className='v8ovf';o.dataset.ctx='ovf';after(o)}
  o.dataset.ids=hid.join(',');o.setAttribute('aria-label',hid.length+' more custom tools');o.dataset.tip=hid.length+' more custom tools';o.innerHTML=svg('more')+'<span>'+hid.length+'</span>'}}
function ctRow(){const row=$('#opts .v6row');if(!row)return;row.classList.toggle('v8editing',CT.edit&&ctOn());if(!ctOn())return;
 const nat=[...row.children].filter(c=>c.classList.contains('v6b'));
 ctIn(V.tab).forEach(t=>{const b=ctBtn(t),i=Math.min(t.pos,nat.length);if(i>=nat.length)row.append(b);else row.insertBefore(b,nat[i])});
 const g=document.createElement('span');g.className='v8grow';row.append(g);
 if(CT.edit)row.insertAdjacentHTML('beforeend','<span class="v8hint">Drag to reorder · tap to change</span><button type="button" class="v8done" data-ctx="done" aria-label="Done editing custom tools">'+svg('check2')+'Done</button>');
 else row.insertAdjacentHTML('beforeend','<button type="button" class="v8star" data-ctx="save" aria-label="Save this setup as a custom tool" data-tip="Save this setup as a custom tool">'+svg('starplus')+'</button>');
 ctFold(row,row,o=>g.after(o))}
function ctBar(){tb.classList.toggle('v8editing',CT.edit&&ctOn());if(!ctOn())return;const g=$('.v6tools',tb);if(!g)return;const nat=[...g.children];
 ctIn('main').forEach(t=>{const b=ctBtn(t),i=Math.min(t.pos,nat.length);if(i>=nat.length)g.append(b);else g.insertBefore(b,nat[i])});
 ctFold(g,tb,o=>g.append(o))}
{const ro8=renderOpts;renderOpts=function(){ro8();ctRow()}}
{const rt8=renderToolbar;renderToolbar=function(){rt8();ctBar()}}
function ctRender(){renderToolbar();if(CT.fresh)setTimeout(()=>{CT.fresh=null},1300)}
addEventListener('resize',()=>{if(ST.ct.list.length&&ctOn())renderToolbar()});

/* ---- use, save, remove ---- */
function ctUse(id){const t=ctGet(id);if(!t)return;const snap=v8Snap(),was=V.tab;V8.noFb++;try{CTKEYS.forEach(k=>{if(t.parts[k])CTP[k].set(t.parts[k])});save();v6Tool(ctTab(t));renderToolbar()}finally{V8.noFb--}
 $$('#barbox .v8ct[data-ct="'+id+'"]').forEach(b=>{if(!v7RM())b.classList.add('v7pop')});
 v8Toast('“'+t.name+'” is ready',()=>{v8Restore(snap);v6Tool(was);renderToolbar();toast('Back to how it was')})}
function ctRemove(id){const i=ST.ct.list.findIndex(t=>t.id===id);if(i<0)return;const t=ST.ct.list.splice(i,1)[0];save();if(!ST.ct.list.length)CT.edit=false;ctRender();rerender();
 v8Toast('Removed “'+t.name+'”',()=>{ST.ct.list.splice(Math.min(i,ST.ct.list.length),0,t);save();CT.fresh=t.id;ctRender();rerender();toast('“'+t.name+'” is back')})}
function ctDraftName(k,p){const n=k==='pen'?pname(p.pen):k==='box'?styleName(p.v)+' box':k==='shape'?CTP.shape.sum(p):CTP[k].n;return n.slice(0,16)}
function ctNew(){const row=V.tab,k=CTPART[row],parts={},inc={};CTKEYS.forEach(x=>{parts[x]=CTP[x].get();inc[x]=x===k});
 if(row==='shapes')inc.pen=true;
 CT.draft={id:null,name:ctDraftName(k,parts[k]),icon:'auto',row,pos:ctNat(row).length,parts,inc};ctSheet()}
function ctEdit(id){const t=ctGet(id);if(!t)return;const parts={},inc={};CTKEYS.forEach(x=>{inc[x]=!!t.parts[x];parts[x]=t.parts[x]?JSON.parse(JSON.stringify(t.parts[x])):CTP[x].get()});
 CT.draft={id,name:t.name,icon:t.icon||'auto',row:t.row,pos:Math.min(t.pos,ctNat(t.row).length),parts,inc};ctSheet()}
const ctDraftTool=()=>{const d=CT.draft,parts={};CTKEYS.forEach(k=>{if(d.inc[k])parts[k]=d.parts[k]});return{id:d.id||'_draft',name:d.name,icon:d.icon,row:d.row,pos:d.pos,parts}};
const CTICONS=['auto','star','pen','brush','pencil','hlight','typeic','square','eraser','lasso','shapes','tag','sparkle'];
function ctSheet(){const d=CT.draft;if(!d)return;
 openSheet('<h3>'+(d.id?'Edit custom tool':'Save as a custom tool')+'</h3><p class="muted">One tap brings this exact setup back.</p>'+
  '<div class="v8lab">Name</div><div class="v8ctl"><span id="ctPv"></span><span class="v8clr"><input class="field" id="ctName" maxlength="16" autocomplete="off" aria-label="Name" value="'+esc(d.name)+'"><button type="button" data-ctx="clr" aria-label="Clear the name">'+svg('xmark')+'</button></span></div>'+
  '<div class="v8lab">Picture</div><div class="v8icons" id="ctIcons" role="radiogroup" aria-label="Picture"></div>'+
  '<div class="v8lab">What it sets</div><div class="v8well" id="ctParts"></div><p class="v8note">It keeps the settings you have right now. Switch on parts from other tools to mix them.</p>'+
  (d.id?'<button type="button" class="v8wide" data-ctx="recap">'+svg('rotcw')+'Update to my current setup</button>':'')+
  '<div class="v8lab">Where it sits</div><div class="v8rows" id="ctRows" role="radiogroup" aria-label="Row"></div><div class="v8pos" id="ctPos"></div><div class="v8tbp" id="ctTbp" aria-label="Toolbar preview"></div>'+
  (d.id?'<button type="button" class="v8wide dz" data-ctx="del">'+svg('trash')+'Remove this tool</button>':''),
  '<button class="lay" data-ctx="cancel">'+svg('xmark')+'Cancel</button><button class="lay primary" id="ctOk" data-ctx="ok">'+svg('check2')+(d.id?'Save changes':'Save tool')+'</button>',ctSheet);
 ctSync();ctNoFocus()}
function ctNoFocus(){setTimeout(()=>{const a=document.activeElement;if(a&&a.tagName==='INPUT'&&sheet.contains(a)&&!CT.typing)a.blur()},45)}
function ctSync(){const d=CT.draft;if(!d||!$('#ctParts'))return;const t=ctDraftTool(),nat=ctNat(d.row),N=nat.length;d.pos=Math.max(0,Math.min(d.pos,N));
 $('#ctPv').innerHTML=ctPrev(t);
 $('#ctIcons').innerHTML=CTICONS.map(ic=>'<button type="button" role="radio" aria-checked="'+(d.icon===ic)+'" class="'+(d.icon===ic?'on':'')+'" data-ctx="icon" data-v="'+ic+'" aria-label="'+(ic==='auto'?'Live preview':ic+' icon')+'">'+(ic==='auto'?ctPrev({...t,icon:'auto'})+'<small>Live</small>':svg(ic))+'</button>').join('');
 $('#ctParts').innerHTML=CTKEYS.map(k=>'<button type="button" class="v8part" role="switch" data-v8quiet aria-checked="'+!!d.inc[k]+'" data-ctx="part" data-k="'+k+'" aria-label="'+CTP[k].n+'"><span class="v8ctp">'+CTP[k].pv(d.parts[k])+'</span><span class="tx"><b>'+CTP[k].n+'</b><i>'+esc(CTP[k].sum(d.parts[k]))+'</i></span><span class="sw2" aria-hidden="true"></span></button>').join('');
 $('#ctRows').innerHTML=CTROWS.map(([r,n])=>'<button type="button" role="radio" aria-checked="'+(d.row===r)+'" class="'+(d.row===r?'on':'')+'" data-ctx="row" data-v="'+r+'">'+n+'</button>').join('');
 $('#ctPos').innerHTML='<button type="button" data-ctx="pos" data-d="-1" aria-label="Move earlier"'+(d.pos<=0?' disabled':'')+'>'+svg('chevL')+'</button><span class="where">'+(d.pos===0?'<b>First</b> in the '+ctRowName(d.row).toLowerCase():'After <b>'+nat[d.pos-1]+'</b>')+'</span><button type="button" data-ctx="pos" data-d="1" aria-label="Move later"'+(d.pos>=N?' disabled':'')+'>'+svg('chevR')+'</button>';
 $('#ctTbp').innerHTML=ctPicture();
 $('#ctOk').disabled=!d.name.trim()||!CTKEYS.some(k=>d.inc[k])}
function ctPicture(){const d=CT.draft,me='<span class="c me">'+esc(d.name.trim()||'New tool')+'</span>';
 const line=row=>{const nat=ctNat(row),N=nat.length,cs=ctIn(row).filter(c=>c.id!==d.id);let h='';
  for(let i=0;i<=N;i++){cs.forEach(c=>{if(Math.min(c.pos,N)===i)h+='<span class="c ct">'+esc(c.name)+'</span>'});if(d.row===row&&d.pos===i)h+=me;if(i<N)h+='<span class="c">'+nat[i]+'</span>'}return h};
 const tool=d.row==='main'?V.tab:d.row;
 return'<span class="cap">'+(d.row==='main'?'On the main bar, whatever tool you are using.':'Shows when you are on '+CTROWS.find(x=>x[0]===d.row)[1]+'.')+'</span><div class="bar"><div class="r'+(d.row==='main'?'':' dim')+'">'+line('main')+'<span class="sp"></span><span class="c">'+svg('more')+'</span></div>'+
  '<div class="r'+(d.row==='main'?' dim':'')+'">'+line(tool)+'<span class="c star">'+svg('starplus')+'</span></div></div>'}
function ctSave(){const d=CT.draft;if(!d)return;const name=d.name.trim().slice(0,16);if(!name||!CTKEYS.some(k=>d.inc[k]))return;const parts={};CTKEYS.forEach(k=>{if(d.inc[k])parts[k]=d.parts[k]});
 const before=JSON.stringify(ST.ct.list);let t;
 if(d.id){t=ctGet(d.id);ST.ct.list=ST.ct.list.filter(x=>x.id!==d.id);Object.assign(t,{name,icon:d.icon,parts})}else t={id:'ct'+(ST.ct.seq++),name,icon:d.icon,parts};
 t.row=d.row;t.pos=d.pos;const seq=ctSeq(d.row),N=ctNat(d.row).length;let i=seq.findIndex(it=>it.n===d.pos);if(i<0||d.pos>=N)i=seq.length;seq.splice(i,0,{c:t});
 CT.draft=null;CT.fresh=t.id;closeSheet();ctApply(d.row,seq);
 v8Toast((d.id?'Saved “':'Added “')+name+'” to the '+ctRowName(t.row).toLowerCase(),()=>{ST.ct.list=JSON.parse(before);save();ctRender();toast(d.id?'Changes undone':'“'+name+'” removed')})}

/* ---- the manager: use on top, manage below (owner-ui-patterns 10) ---- */
function ctManager(){const L=ST.ct.list,on=ctOn();CT.draft=null;
 const tiles=L.map(t=>'<button type="button" class="v8tile" data-ctx="use" data-id="'+t.id+'" aria-label="Use '+esc(t.name)+'">'+ctPrev(t)+'<span>'+esc(t.name)+'</span><small>'+ctRowName(t.row)+'</small></button>').join('');
 const rows=L.map(t=>'<div class="v8mrow" data-id="'+t.id+'">'+ctPrev(t)+'<input class="field" data-ctx="rename" data-id="'+t.id+'" data-noclr maxlength="16" autocomplete="off" aria-label="Name of '+esc(t.name)+'" value="'+esc(t.name)+'"><span></span><span class="wh">'+ctRowName(t.row)+' · '+esc(CTKEYS.filter(k=>t.parts[k]).map(k=>CTP[k].n).join(' + '))+'</span>'+
  '<div class="acts"><button type="button" data-ctx="nudge" data-d="-1" data-id="'+t.id+'" aria-label="Move '+esc(t.name)+' earlier"'+(ctCanNudge(t.id,-1)?'':' disabled')+'>'+svg('chevL')+'</button><button type="button" data-ctx="nudge" data-d="1" data-id="'+t.id+'" aria-label="Move '+esc(t.name)+' later"'+(ctCanNudge(t.id,1)?'':' disabled')+'>'+svg('chevR')+'</button>'+
  '<button type="button" data-ctx="edit" data-id="'+t.id+'">'+svg('sliders')+'Change</button><button type="button" data-ctx="dup" data-id="'+t.id+'">'+svg('dup')+'Duplicate</button><button type="button" class="dz" data-ctx="rm" data-id="'+t.id+'" aria-label="Delete '+esc(t.name)+'">'+svg('trash')+'</button></div></div>').join('');
 openSheet('<h3>Custom tools</h3><p class="muted">Your own one-tap tools. Each one brings back a setup you saved.</p>'+
  (isPro()?'':'<div class="v8well"><button type="button" class="v8part" role="switch" aria-checked="'+!!ST.ct.unlock+'" data-ctx="unlock" aria-label="Custom tools"><span class="tx"><b>Custom tools</b><i>A Professional feature you can use in Beginner.</i></span><span class="sw2" aria-hidden="true"></span></button></div>')+
  (L.length?'<div class="v8lab">Use</div><div class="v8tiles">'+tiles+'</div><div class="v8lab">Manage</div><div class="v8well">'+rows+'</div>'+
    (on?'<button type="button" class="v8wide" data-ctx="editmode">'+svg('move')+'Reorder on the toolbar</button>':'')
   :'<div class="v8empty">'+svg('starplus')+'<span>No custom tools yet.<br>Set a tool up the way you like it, then tap ★ at the end of its row.</span></div>'),
  '<button class="lay primary" data-act="close">'+svg('check2')+'Done</button>',ctManager);ctNoFocus()}
function v8MoreRows(pane){const ref=$('[data-z=cust]',pane)||$('[data-z=sett]',pane);if(!ref||$('[data-ctx]',pane))return;const n=ST.ct.list.length;
 ref.insertAdjacentHTML('afterend',ctOn()?'<button class="mrow" data-ctx="manager" aria-label="Custom tools">'+svg('starplus')+'<span class="mt"><b>Custom tools</b><i>'+(n?n+' saved. Use, rename, reorder or remove them.':'Save a setup as a one-tap tool with ★.')+'</i></span>'+svg('chevR')+'</button>'
  :'<button class="mrow" role="switch" aria-checked="false" data-ctx="unlock" aria-label="Custom tools">'+svg('starplus')+'<span class="mt"><b>Custom tools</b><i>A Professional feature. Turn it on to save your own one-tap tools.</i></span><span class="sw2" aria-hidden="true"></span></button>')}

/* ---- taps ---- */
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-ct],[data-ctx]');if(!el)return;
 if(el.dataset.ct&&!el.dataset.ctx){e.stopPropagation();if(CT.suppress){CT.suppress=false;return}const id=el.dataset.ct;
  if(e.target.closest('.rm')&&CT.edit){ctRemove(id);return}if(CT.edit){ctEdit(id);return}ctUse(id);return}
 const k=el.dataset.ctx,d=CT.draft,ds=el.dataset;if(el.tagName==='INPUT')return;e.stopPropagation();
 if(k==='save'){v6Close();v6Sync();ctNew()}
 else if(k==='done'){CT.edit=false;ctRender()}
 else if(k==='ovf'){const ids=(ds.ids||'').split(',').filter(Boolean);if(menu.classList.contains('show')&&V.menuFor==='ctovf'){closeMenu();V.menuFor=null;return}v6Close();renderOpts();V.menuFor='ctovf';const a=[...document.querySelectorAll('#barbox .v8ovf')].find(x=>x.dataset.ids===ds.ids)||document.querySelector('#barbox .v8ovf')||el;openMenu([...ids.map(id=>{const t=ctGet(id);return{t:t.name,f:()=>ctUse(id)}}),{t:'Manage custom tools…',f:()=>ctManager()}],a,'More custom tools')}
 else if(k==='manager'){if(MC.open)moreClose();ctManager()}
 else if(k==='unlock'){ST.ct.unlock=!ST.ct.unlock;save();if(!ST.ct.unlock)CT.edit=false;renderToolbar();if(MC.open)renderMore();rerender();const on=ST.ct.unlock;v8Toast('Custom tools turned '+(on?'on':'off'),()=>{ST.ct.unlock=!on;save();renderToolbar();if(MC.open)renderMore();rerender();toast('Custom tools '+(on?'are off again':'are on again'))})}
 else if(k==='use'){closeSheet();ctUse(ds.id)}
 else if(k==='edit'){ctEdit(ds.id)}
 else if(k==='rm'){ctRemove(ds.id)}
 else if(k==='dup'){const t=ctGet(ds.id);if(!t)return;const c=JSON.parse(JSON.stringify(t));c.id='ct'+(ST.ct.seq++);c.name=(t.name.slice(0,14)+' 2');ST.ct.list.splice(ST.ct.list.indexOf(t)+1,0,c);save();CT.fresh=c.id;ctRender();rerender();toast('Duplicated “'+t.name+'”')}
 else if(k==='nudge'){if(ctNudge(ds.id,+ds.d)){rerender();const r=$('.v8mrow[data-id="'+ds.id+'"]');if(r&&!v7RM())r.classList.add('v8rowglow')}}
 else if(k==='editmode'){closeSheet();const t=ST.ct.list[0];CT.edit=true;if(t&&t.row!=='main'&&!ctIn(V.tab).length&&!ctIn('main').length)v6Tool(t.row);ctRender();toast('Edit mode: drag to reorder, tap a tool to change it')}
 else if(!d)return;
 else if(k==='cancel'){CT.draft=null;closeSheet()}
 else if(k==='ok')ctSave();
 else if(k==='clr'){d.name='';const i=$('#ctName');i.value='';i.focus();ctSync()}
 else if(k==='icon'){d.icon=ds.v;ctSync()}
 else if(k==='part'){const on=!d.inc[ds.k];if(!on&&CTKEYS.filter(x=>d.inc[x]).length<=1){toast('A tool needs at least one part');return}d.inc[ds.k]=on;ctSync()}
 else if(k==='row'){d.row=ds.v;d.pos=ctNat(d.row).length;ctSync()}
 else if(k==='pos'){d.pos+=+ds.d;ctSync()}
 else if(k==='recap'){CTKEYS.forEach(x=>{if(d.inc[x])d.parts[x]=CTP[x].get()});ctSync();toast('Now holds your current setup')}
 else if(k==='del'){const id=d.id;CT.draft=null;closeSheet();ctRemove(id)}});
document.addEventListener('input',e=>{const i=e.target;if(!i||!i.dataset)return;
 if(i.id==='ctName'&&CT.draft){CT.draft.name=i.value;const me=$('#ctTbp .me');if(me)me.textContent=i.value.trim()||'New tool';$('#ctOk').disabled=!i.value.trim()||!CTKEYS.some(k=>CT.draft.inc[k])}
 else if(i.dataset.ctx==='rename'){CT.typing=true;const t=ctGet(i.dataset.id),v=i.value.trim();if(t&&v){t.name=v.slice(0,16);save();ctRender()}}});
document.addEventListener('change',e=>{const i=e.target;if(i&&i.dataset&&i.dataset.ctx==='rename'){CT.typing=false;const t=ctGet(i.dataset.id);if(!t)return;if(!i.value.trim())i.value=t.name;const s=$('.v8tile[data-id="'+t.id+'"]>span:not(.v8ctp)',sheet);if(s)s.textContent=t.name}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&CT.edit&&!sheet.classList.contains('show')){CT.edit=false;ctRender()}
 if(e.key==='Enter'&&e.target&&e.target.id==='ctName'){e.preventDefault();ctSave()}});

/* ---- hold to edit, then drag to reorder (pointer capture, a drop line shows where it lands) ---- */
const ctLine=document.createElement('div');ctLine.className='v8dropline';ctLine.hidden=true;document.body.append(ctLine);
let CTD=null;const ctItems=box=>[...box.children].filter(c=>c.matches('.v8ct,.v6b,.ic'));
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('#barbox .v8ct');if(!b||e.button)return;
 if(!CT.edit){clearTimeout(CT.ht);CT.hx=e.clientX;CT.hy=e.clientY;CT.ht=setTimeout(()=>{CT.ht=0;CT.edit=true;CT.suppress=true;ctRender();toast('Edit mode: drag to reorder, tap a tool to change it')},550);return}
 if(e.target.closest('.rm'))return;CTD={b,id:b.dataset.ct,x0:e.clientX,moved:false,box:b.parentElement,idx:-1};try{b.setPointerCapture(e.pointerId)}catch(_){}},true);
document.addEventListener('pointermove',e=>{if(CT.ht&&Math.hypot(e.clientX-CT.hx,e.clientY-CT.hy)>8){clearTimeout(CT.ht);CT.ht=0}
 if(!CTD)return;const dx=e.clientX-CTD.x0;if(!CTD.moved&&Math.abs(dx)<6)return;CTD.moved=true;CTD.b.classList.add('drag');CTD.b.style.translate=dx+'px 0';
 const its=ctItems(CTD.box).filter(x=>x!==CTD.b);let idx=its.findIndex(x=>{const r=x.getBoundingClientRect();return e.clientX<r.left+r.width/2});if(idx<0)idx=its.length;CTD.idx=idx;
 const ref=its[idx],prev=its[idx-1],br=CTD.box.getBoundingClientRect(),x=ref?ref.getBoundingClientRect().left-3:prev?prev.getBoundingClientRect().right+1:br.left;
 ctLine.style.cssText='left:'+Math.round(x)+'px;top:'+Math.round(br.top+7)+'px;height:'+Math.round(br.height-14)+'px';ctLine.hidden=false;e.preventDefault()},true);
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,()=>{clearTimeout(CT.ht);CT.ht=0;if(!CTD)return;const d=CTD;CTD=null;ctLine.hidden=true;d.b.classList.remove('drag');d.b.style.translate='';
 if(!d.moved)return;CT.suppress=true;setTimeout(()=>{CT.suppress=false},60);const its=ctItems(d.box).filter(x=>x!==d.b),ref=its[d.idx];
 ctMoveBefore(d.id,ref?(ref.dataset.ct?{ct:ref.dataset.ct}:{nat:its.filter(x=>!x.dataset.ct).indexOf(ref)}):null)},true));
{const st8=setTool;setTool=function(t,q){if(CT.edit&&t!=='pen'&&t!==R.tool)CT.edit=false;return st8(t,q)}}

/* ---------- boot ---------- */
if(typeof ResizeObserver!=='undefined')new ResizeObserver(sizeCv).observe(paper);else addEventListener('resize',sizeCv);
makeBox({t:'text',x:34,y:96,size:'head',st:'none',h:'How to read books'});
makeBox({t:'text',x:34,y:160,size:'body',st:'none',h:'Audio book = zero retention. Try #1: first notes in GoodNotes, keyword notes in Notion.'});

const barbox=$('#barbox');
sizeCv();v2Boot();renderToolbar();renderOpts();hist=[snap()];hi=0;updateStates();shellReady=true;v5Boot();
requestAnimationFrame(()=>requestAnimationFrame(()=>{opts.classList.add('anim');ecard.classList.add('anim');lcard.classList.add('anim');acard.classList.add('anim');placeOpts()}));
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{moveUl();placeOpts()});addEventListener('resize',()=>{moveUl();placeOpts();if(!all.hidden)renderAll()});
