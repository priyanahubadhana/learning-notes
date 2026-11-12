// rebuild cov.mjs / func.mjs from the pre-v8 copies with the current cov_v8.mjs block (so the v8 probes live in one file)
const fs = require('fs')
const D = __dirname + '/'
let s = fs.readFileSync(D + 'cov_v8.mjs', 'utf8')
const a =
  "await T('V4: the fold opens a menu with the hidden tools and Manage',async()=>/Pen set 14/.test(await txt('#more *'))&&/Manage custom tools/.test(await txt('#more *')));"
if (!s.includes(a)) throw new Error('miss')
if (!s.includes('hangs under its button'))
  s = s
    .split(a)
    .join(
      a +
        "\n await T('V4: the fold menu hangs under its button, inside the screen',async()=>E(()=>{const m=document.querySelector('#more').getBoundingClientRect(),o=document.querySelector('#opts .v8ovf').getBoundingClientRect();return m.top>=o.bottom&&m.top<o.bottom+20&&m.right<=innerWidth&&m.left<=o.left&&m.right>=o.right-60}));",
    )
fs.writeFileSync(D + 'cov_v8.mjs', s)
fs.copyFileSync(D + 'cov.pre8.bak', D + 'cov.mjs')
fs.copyFileSync(D + 'func.pre8.bak', D + 'func.mjs')
require('./_p10.cjs')
