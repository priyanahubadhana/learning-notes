// Builds library-mock-v2.html from ../library-mock.html + v2.css + v2.js (node build.cjs)
const fs = require('fs'),
  path = require('path')
const D = __dirname
let h = fs.readFileSync(path.join(D, '..', 'library-mock.html'), 'utf8')
const css = fs.readFileSync(path.join(D, 'v2.css'), 'utf8'),
  js = fs.readFileSync(path.join(D, 'v2.js'), 'utf8')
let n = 0
function rep(a, b, all) {
  if (!h.includes(a)) throw new Error('missing: ' + a.slice(0, 70))
  h = all ? h.split(a).join(b) : h.replace(a, () => b)
  n++
}
function repLine(start, b) {
  const L = h.split('\n')
  const i = L.findIndex((l) => l.startsWith(start))
  if (i < 0) throw new Error('missing line: ' + start)
  L[i] = b
  h = L.join('\n')
  n++
}
rep('<title>Library Mock-up</title>', '<title>Library Mock-up v2</title>')
rep('href="shell.css"', 'href="../shell.css"')
rep('src="shell.js"', 'src="../shell.js"')
rep('Library · on the shared app shell', 'Library v2 · on the shared app shell')
rep('</style>', css + '\n</style>')
// tags: many at once, Any/All, sub-tags
repLine(
  'const tagMatch=',
  'const tagHas=(x,t)=>(U.ktSub?family(t):[t]).some(s=>(x.tags||[]).includes(s));const tagMatch=x=>!U.ktags.length||(U.ktAll?U.ktags.every(t=>tagHas(x,t)):U.ktags.some(t=>tagHas(x,t)));',
)
repLine(" const sub=U.ktag==='all'", ' const sub=[];')
repLine(" const chip0=U.ktag==='all'", ' const chip0=tagChips();')
repLine(" if(U.ktag!=='all')l=l.filter(", ' l=l.filter(tagMatch);')
// card: Continue reading first
rep(
  "(b.st==='reading'||pct(b)>0)?'Continue':'Start reading'",
  "(b.st==='reading'||pct(b)>0)?'Continue reading':'Start reading'",
)
rep(
  "case'bmenu':{const bkx=bk(id);Shell.pop(b,`",
  'case\'bmenu\':{const bkx=bk(id);Shell.pop(b,`<button type="button" class="mi" role="menuitem" data-a="start" data-id="${id}">${ic(\'play\')}${ctaLabel(bkx)}</button>',
)
// preview: recent-tag chips now live in the Tag picker
repLine('  <div class="tags">${recentTags().filter', '  </div>')
// More sheet: Filter section first
rep('function moreBody(t){', 'function moreBody0(t){')
rep(
  'D={prefs:JSON.parse',
  'D={ui:{type:U.type,tags:[...U.ktags]},prefs:JSON.parse',
)
rep("dtab=tab||'view'", "dtab=tab||(U.book?'view':'filter')")
rep(
  "tabs:()=>[['view','View']",
  "tabs:()=>[...(U.book?[]:[['filter','Filter']]),['view','View']",
)
rep(
  "const before=snap();act('Library settings'",
  "const before=snap();if(!U.book){U.type=D.ui.type;U.ktags=D.ui.tags}act('Library settings'",
)
rep("title:'Library settings'", "title:'More'")
// new actions run first
rep(
  'function act1(a,id,b,e){\n switch(a){',
  'function act1(a,id,b,e){\n if(act2(a,id,b,e))return;\n switch(a){',
)
rep(
  '/* ---------- mount ---------- */',
  js + '\n/* ---------- mount ---------- */',
)
const left = h.match(/U\.ktag(?![sAS])[^\n]{0,60}/g)
// leftovers inside functions that v2.js replaces are harmless only if those functions are overridden
const out = path.join(D, 'library-mock-v2.html')
fs.writeFileSync(out, h)
console.log(
  'edits',
  n,
  'bytes',
  h.length,
  'left U.ktag refs:',
  left ? left.length : 0,
)
if (left) left.forEach((l) => console.log('  ', l))
