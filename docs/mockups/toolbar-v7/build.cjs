// v7: builds ./toolbar-mock-v7.html (v6 + v7.css + v7.js; the premium ▾ cards). Was: builds ../toolbar-mock-v6.html from ../toolbar-mock-v4.html (v4 is only read). Re-runnable: node v5/build.cjs
const fs=require('fs');const D=__dirname+'/';
let h=fs.readFileSync(D+'../toolbar-mock-v4.html','utf8');
function rep(o,n){const i=h.indexOf(o);if(i<0)throw new Error('MISSING: '+o.slice(0,90));if(h.indexOf(o,i+1)>=0)throw new Error('AMBIGUOUS: '+o.slice(0,90));h=h.slice(0,i)+n+h.slice(i+o.length)}
function cut(a,b,n){const i=h.indexOf(a);if(i<0)throw new Error('CUT start missing: '+a.slice(0,60));if(h.indexOf(a,i+1)>=0)throw new Error('CUT start ambiguous: '+a.slice(0,60));const j=h.indexOf(b,i);if(j<0)throw new Error('CUT end missing: '+b.slice(0,60));h=h.slice(0,i)+(n||'')+h.slice(j)}
const P=f=>fs.readFileSync(D+f,'utf8');

/* ---- chrome, storage key ---- */
rep('<title>Toolbar Mock-up v4</title>','<title>Toolbar Mock-up v7</title>');
rep(`const KEY='tbmock.v4';`,`const KEY='tbmock.v7';`);

/* ---- shell skeleton (shell-spec 1): sh-wrap > sh-demo + sh-shell > rail + sh-main > top bar, bars, sh-scroll. The page never scrolls. ---- */
cut('<div class="wrap">\n<div class="demo">','<nav class="sh-rail glass nofocus"',
`<div class="sh-wrap" id="app" data-mode="beg">
<div class="sh-demo nofocus"><span class="t">Toolbar mock-up v7</span><div class="seg" role="group" aria-label="Who is this for"><button type="button" data-sh-mode="beg">Beginner</button><button type="button" data-sh-mode="pro">Professional</button></div></div>
<div class="sh-shell">
  `);
rep('<div class="main">\n    <header class="sh-top','<div class="sh-main">\n    <header class="sh-top');
rep('    <div class="paper" id="paper" data-tool="pen">','    <main class="sh-scroll" id="main">\n    <div class="paper" id="paper" data-tool="pen">');
rep('<div class="lcol" hidden></div></div>\n    </div>\n  </div>\n</div>\n<ul class="notes">','<div class="lcol" hidden></div></div>\n    </div>\n<ul class="notes">');
rep('</ul>\n</div>\n\n<div class="kb nofocus"','</ul>\n</main>\n  </div>\n </div>\n</div>\n\n<div class="kb nofocus"');
// notes: v5 wording
rep('<li>Your layouts are saved on this device (browser storage).</li>','<li>Beginner opens first, with the defaults a new person sees. Switch to Professional at the top. Your layouts are saved on this device (browser storage).</li>');

/* ---- remove the local copies of shell primitives (body, wrap, demo, seg, shell, main, rail, top bar) ---- */
cut(`body{background:var(--canvas);color:var(--ink);font:15px/1.5 var(--sans);margin:0;overflow-x:hidden;position:relative}`,`.glass{background:var(--glass-fill);border:1px solid var(--glass-line);box-shadow:var(--elev-2)}`,'body.kbopen .sh-scroll{padding-bottom:calc(330px + var(--sh-safe-b))}\n');
cut('/* app shell */\n.shell{display:flex','/* toolbar */\n','');
rep('.rail{display:none}.shell{display:block}.main{gap:6px}}','.sh-main{gap:6px}}');
rep('html,body{height:auto}\nbody{overflow-x:hidden;overflow-y:auto}\n','');
rep(' body{padding-bottom:calc(var(--sh-tabbar) + var(--sh-safe-b))}\n','');
rep(',#toast,#bg,#tip,.demo,.pmap,',',#toast,#bg,#tip,.sh-demo,.pmap,');

/* ---- one minimise component (44 px, accent ring, separator before it) ---- */
rep(`function minHtml(key,cls){return'<button type="button" class="'+(cls?cls+' ':'')+'minb" data-min="'+key+'" aria-label="Minimise" data-tip="Minimise to the edge">'+svg('minim')+'</button>'}`,`function minHtml(key){return'<i class="sep minsep" aria-hidden="true"></i><button type="button" class="minb" data-min="'+key+'" aria-label="Minimise" data-tip="Tuck this bar away">'+svg('minim')+'</button>'}`);
rep('body.mz-opts #opts,','body.mz-main #barbox,body.mz-opts #opts,');

/* ---- Beginner pen: a More button opens the Beginner Pen card ---- */
rep(`   sep();caret('acard','More pen options',host)}
  minb(host)}`,`   sep();caret('acard','More pen options',host)}
  else caret('acard','More pen options',host);
  minb(host)}`);
rep(`function cardOpen(){return!!((R.acard||R.ecard||R.lcard)&&isPro()&&R.optsOn&&`,`function cardOpen(){return!!((R.acard||R.ecard||R.lcard)&&(isPro()||R.tool==='pen'||R.tool==='text')&&R.optsOn&&`);

rep(`if(!el.classList.contains('sep')||el===s)return;`,`if(!el.classList.contains('sep')||el.classList.contains('minsep')||el===s)return;`);

/* ---- mode follows the shell toggle; a fresh load is Beginner + Night ---- */
rep(`onChange:w=>{if(w==='theme'&&shellReady){redraw();renderOpts();if(R.tool==='lasso')drawOverlay()}}});`,
 `onChange:(w,val)=>{if(w==='theme'&&shellReady){redraw();renderOpts();if(R.tool==='lasso')drawOverlay()}
  if(w==='mode'&&shellReady&&(val==='pro')!==isPro()&&(val==='pro'||ST.cur==='pro'||getLayout(ST.cur).all)){ST.cur=val==='pro'?'pro':'beginner';save();renderToolbar();renderOpts();if(typeof renderAll==='function')renderAll()}}});`);
rep(`sizeCv();v2Boot();renderToolbar();renderOpts();hist=[snap()];hi=0;updateStates();shellReady=true;`,
 `sizeCv();v2Boot();renderToolbar();renderOpts();hist=[snap()];hi=0;updateStates();shellReady=true;v5Boot();`);
rep("b.dataset.tip='Shapes';b.setAttribute('aria-label','Shapes');b.innerHTML=svg('shapes')+'<span class=\"name\">Shapes</span>'","b.dataset.tip='Draw shape';b.setAttribute('aria-label','Draw shape');b.innerHTML=svg('shapes')+'<span class=\"name\">Draw shape</span>'");
rep("['Link','link','link']].forEach(","['Link','link','link'],['Elements','elements','sticker']].forEach(");
rep("const CARDSEL='#acard,","const CARDSEL='#elcard,#acard,");
/* ---- v5e: owner round fixes that edit the v4 base strings ---- */
rep("b+=clab('Favourites')+","b+=clab('Manage favourites')+");
rep("function begShapesBtn(){if(isPro()||$('#tb [data-id=shapes]'))return;","function begShapesBtn(){if($('#tb [data-id=shapes]'))return;");
rep("a+=clab('Line style')+pset('ls',[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']],'Line style');","");
rep("f+=clab('Gestures')+S('pn','scribble','Scribble to erase',c.scribble)+S('pn','c2l','Circle to lasso',c.c2l);","f+=clab('Gestures')+S('pn','scribble','Scribble to erase',c.scribble)+S('pn','c2l','Circle to lasso',c.c2l);f+=clab('Line')+mchip('ls','Line style',LS_N[c.ls]||'Solid','minus');");
rep("clab('Paper')+group('Paper style','four',[['blank','Blank','file'],['lined','Lined','lines'],['grid','Grid','grid'],['dots','Dots','dots9']].map(([k,n,ic])=>chip('data-a=\"paper\" data-v=\"'+k+'\"',n,c.paper===k,ic)).join(''))+","clab('Page')+mchip('paper','Page style',PAPER_N[c.paper]||'Lined','file')+");
cut("  h+=clab('Font')+group('Font','four',FONTS","  h+=clab('Line height')");
rep("KINDS.map(([k,n])=>chip('data-a=\"kind\" data-v=\"'+k+'\"',n,kind===k)).join('')","KINDS.filter(([k])=>k!=='callout').map(([k,n])=>chip('data-a=\"kind\" data-v=\"'+k+'\"',n,kind===k)).join('')");
rep("chip('data-a=\"mark\" data-v=\"strike\"','Strikethrough',false,'strike')+chip('data-a=\"mark\" data-v=\"code\"','Code',false,'code')+","");
rep("on=R.acard&&isPro()&&(t==='pen'||t==='text'||t==='insert')","on=R.acard&&(isPro()||t==='text')&&(t==='pen'||t==='text'||t==='insert')");
rep("if(pro)h+=clab('Page')+row('page','layers','Paper, layers and zoom','Opens Pen options at Layers & paper.','go');","h+=clab('Page')+(pro?row('page','layers','Paper, layers and zoom','Opens Pen options at Layers & paper.','go'):'')+'<div class=\"mlab\">'+svg('file')+'<span class=\"mt\"><b>Paper style</b><i>How the page looks behind your notes.</i></span></div><div class=\"chips four\" role=\"group\" aria-label=\"Paper style\">'+[['blank','Blank','file'],['lined','Lined','lines'],['grid','Grid','grid'],['dots','Dots','dots9']].map(([k,n,ic])=>chip('data-z=\"paper\" data-v=\"'+k+'\"',n,PN.paper===k,ic).replace('role=\"radio\" ','role=\"radio\" ')).join('')+'</div>';");
rep("else if(k==='page'){moreClose();setTool('pen');openPenAt('page')}","else if(k==='paper'){setPaper(b.dataset.v);renderMore()} else if(k==='page'){moreClose();setTool('pen');openPenAt('page')}");
const JS=['v5a.js','v5b.js','v5c.js','v5d.js','v5e.js','v6.js','v7.js'];
rep('/* ---------- boot ---------- */',JS.map(P).join(String.fromCharCode(10))+String.fromCharCode(10)+'/* ---------- boot ---------- */');
rep('</style>',P('v5.css')+P('v6.css')+P('v7.css').split('PV').join(':is(#acard,#lcard,#more,#elcard,#morecard,.v7ghost)')+'</style>');
/* v6: Undo/Redo sit in the main bar again */
rep('#sh-top .hist .ic[data-id=undo]','#tb .hist .ic[data-id=undo]');rep('#sh-top .hist .ic[data-id=redo]','#tb .hist .ic[data-id=redo]');
/* v6: the notes under the page describe the new toolbar */
cut('<ul class="notes">','</ul>'+String.fromCharCode(10)+'</main>',P('v6notes.html'));
/* ---- re-embed the CURRENT shared shell.css / shell.js between their markers (single source: ../shell.css and ../shell.js) ---- */
const {reembed}=require('../_reembed.cjs');h=reembed(h,D+'../');
fs.writeFileSync(D+'toolbar-mock-v7.html',h);
const m=h.match(/<script>([\s\S]*)<\/script>\s*$/);fs.writeFileSync(D+'_v7script.js',m[1]);
console.log('built',h.length);
