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
