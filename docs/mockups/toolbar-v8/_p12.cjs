const fs = require('fs')
const D = __dirname + '/'
const rep = (f, a, b) => {
  let s = fs.readFileSync(D + f, 'utf8')
  if (!s.includes(a)) throw new Error(f + ' miss ' + a.slice(0, 50))
  s = s.split(a).join(b)
  fs.writeFileSync(D + f, s)
}
// the fold menu hangs from the live "⋯ n" button (the row is redrawn when other cards close, so look the button up again)
rep(
  'v8c.js',
  "else if(k==='ovf'){const ids=(ds.ids||'').split(',').filter(Boolean);openMenu([",
  "else if(k==='ovf'){const ids=(ds.ids||'').split(',').filter(Boolean),inRow=!!el.closest('#opts');if(menu.classList.contains('show')&&V.menuFor==='ctovf'){closeMenu();V.menuFor=null;return}v6Close();renderOpts();V.menuFor='ctovf';const a=$(inRow?'#opts .v8ovf':'#tb .v8ovf')||el;openMenu([",
)
rep(
  'v8c.js',
  "{t:'Manage custom tools…',f:()=>ctManager()}],el,'More custom tools')}",
  "{t:'Manage custom tools…',f:()=>ctManager()}],a,'More custom tools')}",
)
rep('shots8.mjs', 'for(let i=0;i<7;i++)', 'for(let i=0;i<16;i++)')
console.log('ok')
