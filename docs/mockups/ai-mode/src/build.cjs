/* builds ai-mode-mock.html (v4) from ai-mode-mock.backup-v3.html + the parts in this folder. Re-runnable. */
const fs = require('fs'),
  path = require('path')
const D = path.join(__dirname, '..'),
  R = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8')
let s = fs.readFileSync(path.join(D, 'ai-mode-mock.backup-v3.html'), 'utf8')
function rep(a, b) {
  const n = s.split(a).length - 1
  if (n !== 1)
    throw new Error('anchor found ' + n + ' times: ' + a.slice(0, 70))
  s = s.replace(a, () => b)
}
function region(from, to, b) {
  const i = s.indexOf(from),
    j = s.indexOf(to, i + 1)
  if (i < 0 || j < 0 || s.indexOf(from, i + 1) >= 0)
    throw new Error('region: ' + from.slice(0, 50) + ' → ' + to.slice(0, 50))
  s = s.slice(0, i) + b + s.slice(j)
}
rep('</style>', R('v4.css') + '</style>')
rep(
  '<span class="t">AI space v3 · on the shared app shell</span>',
  '<span class="t">AI space v4 · jobs run on a small copy of the tool framework</span>\n  <div class="demo2"><small>Test run</small><div class="seg sm" role="group" aria-label="Test run"><button type="button" data-a="demo" data-v="ok" aria-pressed="false">Runs smoothly</button><button type="button" class="on" data-a="demo" data-v="fail" aria-pressed="true">One step fails</button><button type="button" data-a="demo" data-v="off" aria-pressed="false">Offline</button></div></div>',
)
rep(
  "p:'Find the main topic and four to six branches. Keep every label under five words.'}];",
  "p:'Find the main topic and four to six branches. Keep every label under five words.'},\n {id:'w5',n:'Podcast to key points',tags:['audio','summary'],ai:'Any',jt:'Audio',star:4.6,uses:27,my:0,p:'List the main points with the time of each.'},\n {id:'w6',n:'Book chapter to mind map',tags:['book','map'],ai:'Claude',jt:'Book',star:4.4,uses:12,my:0,p:'Draw the chapter as a mind map with short labels.'},\n {id:'w7',n:'Video to recall cards',tags:['video','cards'],ai:'Claude',jt:'Video',star:4.1,uses:22,my:0,p:'Make one card per idea in the video.'},\n {id:'w8',n:'Article to notes and tags',tags:['article','notes'],ai:'Any',jt:'Article',star:3.6,uses:6,my:0,p:'Write short notes and add three tags.'}];",
)
rep(
  'wfs:WFS.map(w=>Object.assign({},w))',
  'wfs:WFS.map((w,i)=>Object.assign({last:[1,3,6,9,2,12,4,20][i]||5},w))',
)
rep(
  "open:{},qpq:'',unl:{},B:{goal:'',plan:null,stage:'idea',eff:'standard',view:'build',pick:false,q:'',cg:'',pv:'notes',prog:0,title:'Habits that stick'}};",
  "open:{},qpq:'',unl:{},demo:'fail',fx:null,tq:'',\n stu:{sel:[],d:{kind:'new',name:'',nb:'Habits and focus',sec:''}},\n W:{q:'',tags:[],tmode:'any',jt:[],ai:[],star:0,uses:0,sort:'rating',more:false},wviews:[{id:'v1',n:'Top rated video',f:{jt:['Video'],star:4}}],\n B:{goal:'',plan:null,stage:'idea',eff:'standard',view:'build',pick:false,q:'',cg:'',pv:'notes',job:null,fromStudio:null,dest:{kind:'new',name:'Habits that stick',nb:'Habits and focus',sec:''}}};",
)
region('function stuPanel(){', 'function workspace(){', R('stu.js'))
rep("sel('jnb',NBS,J.nb,'Notebook')", "sel('jnb',nbNames(),J.nb,'Notebook')")
rep(
  "sw('remember','Remember this path for #'+tag,'Next time, anything tagged #'+tag+' goes to '+pathStr()+' by itself.',J.remember)+",
  "sw('remember','Remember this path','Next time, anything tagged #'+tag+' goes to '+pathStr()+' by itself.',J.remember).replace('class=\"sw-row\"','class=\"sw-row rem\"')+",
)
rep(
  "'<div class=\"runbar\"><div class=\"gr\"><span class=\"path\">'+IC('folder')+esc(pathStr())+'</span></div>'+chip()+est('job')+'<button",
  "'<div class=\"runbar jr\"><div class=\"gr\"><span class=\"path\">'+IC('folder')+'<span>'+esc(pathStr())+'</span></span></div><div class=\"rmeta\">'+chip()+est('job')+'</div><button",
)
region(
  'function workflows(){',
  '/* ---------- Settings ---------- */',
  R('wf.js'),
)
rep(
  'const cp=a=>a?a.map(s=>Object.assign({},s)):null;',
  'const cp=a=>a?a.map(s=>Object.assign({},s)):null;\n' + R('fw.js'),
)
region(
  'function makePlan(',
  '/* ---------- Tool catalog ---------- */',
  R('build.js'),
)
rep(
  ":B.pick?'<button type=\"button\" class=\"btn sm pri\" data-a=\"tadd\" data-id=\"'+t.id+'\">'+IC('plus')+'Add to plan</button>':'')+'</div>'}",
  ":B.pick?'<button type=\"button\" class=\"btn sm pri\" data-a=\"tadd\" data-id=\"'+t.id+'\">'+IC('plus')+'Add to plan</button>':'')+'<button type=\"button\" class=\"ib sm\" data-a=\"open\" data-k=\"td'+t.id+'\" aria-expanded=\"'+!!S.open['td'+t.id]+'\" aria-label=\"What '+esc(t.n)+' needs and makes\" title=\"Details\">'+IC('down')+'</button>'+(S.open['td'+t.id]?tdet(t):'')+'</div>'}",
)
rep(
  "'Everything the AI can do in your app. The AI reads this same list when it makes a plan.'",
  "'Everything the AI can do in your app. The AI reads this same list when it makes a plan. Open a tool to see what it needs and makes.'",
)
rep(' aiTabs.draw();\n', ' aiTabs.draw();S.fx=null;placeToast();\n')
rep(
  "Shell.clearable(m,i=>i.type==='search'||i.id==='jnew');",
  "Shell.clearable(m,i=>i.type==='search'||/^(jnew|bname|stname)$/.test(i.id));",
)
rep(
  "const A2=Q.plan.filter(s=>s.on);h+='<div class=\"bar2\" aria-hidden=\"true\"><i style=\"width:'+Math.round(Q.prog/A2.length*100)+'%\"></i></div><ul class=\"prog\" role=\"status\">'+A2.map((s,i)=>{const c=i<Q.prog?'done':i===Q.prog?'now':'wait';return'<li class=\"'+c+'\"><span class=\"st\">'+IC('check')+'</span><b>'+esc(TOOL[s.t].n)+'</b></li>'}).join('')+'</ul>'}",
  "const j=Q.job,dn=j.steps.filter(s=>s.state==='done').length;h+='<div class=\"bar2\" aria-hidden=\"true\"><i style=\"width:'+Math.round(dn/j.steps.length*100)+'%\"></i></div>'+(j.state==='offline'?'<div class=\"attn off\">'+IC('cloud')+'<div><b>You are offline.</b><span>It starts by itself when the internet is back.</span></div></div>':'')+'<div role=\"status\">'+jobRows(j)+'</div>'}",
)
region('function runBuild(){', 'Object.assign(A,{\n eff:', '')
rep(
  '/* one click / input / change listener',
  R('act.js') + '/* one click / input / change listener',
)
rep("else if(id==='wq'){S.wq=t.value;", "else if(id==='wq'){S.W.q=t.value;")
rep('<title>AI mode Mock-up</title>', '<title>AI mode Mock-up v4</title>')
fs.writeFileSync(path.join(D, 'ai-mode-mock.html'), s)
const js = s.slice(s.lastIndexOf('<script>') + 8, s.lastIndexOf('</script>'))
fs.writeFileSync(path.join(__dirname, '_chk.js'), js)
console.log('built', s.length, 'bytes')
