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
