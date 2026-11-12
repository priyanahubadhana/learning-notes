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
