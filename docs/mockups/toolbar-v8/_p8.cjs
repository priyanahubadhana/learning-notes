const fs = require('fs')
const D = __dirname + '/'
const rep = (f, a, b) => {
  let s = fs.readFileSync(D + f, 'utf8')
  if (!s.includes(a)) throw new Error(f + ' miss ' + a.slice(0, 40))
  s = s.split(a).join(b)
  fs.writeFileSync(D + f, s)
}
rep(
  'v8.css',
  '.v8pv svg.ic{width:17px;height:17px;stroke-width:1.7}',
  '.v8pv svg.ic{width:17px!important;height:17px!important;stroke-width:1.7}',
)
// the toolbar picture: one line for the main bar (history folded into the ⋯ chip), the tool row may wrap so the new tool is always in view
rep(
  'v8c.js',
  "'<span class=\"sp\"></span><span class=\"c\">'+svg('undo')+'</span><span class=\"c\">'+svg('redo')+'</span><span class=\"c\">'+svg('more')+'</span></div>'",
  "'<span class=\"sp\"></span><span class=\"c\">'+svg('more')+'</span></div>'",
)
// a sheet must not pull the iPad keyboard up by itself: the name is already filled in
rep(
  'v8c.js',
  ' ctSync()}\nfunction ctSync(){',
  " ctSync();ctNoFocus()}\nfunction ctNoFocus(){setTimeout(()=>{const a=document.activeElement;if(a&&a.tagName==='INPUT'&&sheet.contains(a)&&!CT.typing)a.blur()},45)}\nfunction ctSync(){",
)
rep(
  'v8c.js',
  "'<button class=\"lay primary\" data-act=\"close\">'+svg('check2')+'Done</button>',ctManager)}",
  "'<button class=\"lay primary\" data-act=\"close\">'+svg('check2')+'Done</button>',ctManager);ctNoFocus()}",
)
rep(
  'v8c.js',
  "else if(i.dataset.ctx==='rename'){",
  "else if(i.dataset.ctx==='rename'){CT.typing=true;",
)
rep(
  'v8c.js',
  "if(i&&i.dataset&&i.dataset.ctx==='rename'){",
  "if(i&&i.dataset&&i.dataset.ctx==='rename'){CT.typing=false;",
)
console.log('ok')
