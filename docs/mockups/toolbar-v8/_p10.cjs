// probe updates for v8: M2 flips the box-bar minimise check; new probes for M1, M3, V1, V3, V4 are appended to cov.mjs
const fs = require('fs')
const D = __dirname + '/'
const rep = (f, a, b) => {
  let s = fs.readFileSync(D + f, 'utf8')
  if (!s.includes(a)) throw new Error(f + ' miss ' + a.slice(0, 50))
  s = s.split(a).join(b)
  fs.writeFileSync(D + f, s)
}
rep(
  'func.mjs',
  " const r2=await check('box bar',2);ok(W+' box bar has its minimise',r2.some(x=>x.key==='box'));",
  " const r2=await check('box bar',1);ok(W+' box bar has NO minimise (v8 M2)',!r2.some(x=>x.key==='box')&&await vis(p,'#boxbar')===1&&await vis(p,'#boxbar .minb')===0);",
)
rep(
  'cov.mjs',
  "await chk('Box bar','#boxbar *',['Style','Duplicate','Cut','Copy','Delete','More','Minimise']);",
  "await chk('Box bar','#boxbar *',['Style','Duplicate','Cut','Copy','Delete','More']);\nawait gone('Box bar','second minimise on the text box bar (v8 M2)','#boxbar .minb');",
)
rep(
  'cov.mjs',
  "console.log('REMOVED BY DESIGN (verified gone above)",
  'const V8N0=total,V8F0=found;\n' +
    fs.readFileSync(D + 'cov_v8.mjs', 'utf8') +
    "\nconsole.log('COVERAGE v8 probes (M1-M3, V1, V3, V4)',(found-V8F0)+'/'+(total-V8N0));\nconsole.log('REMOVED BY DESIGN (verified gone above)",
)
rep(
  'cov.mjs',
  "console.log('COVERAGE new v6 layout probes',(found-V5T)+'/'+(total-V5N));",
  "console.log('COVERAGE new v6 layout probes',(V8F0-V5T)+'/'+(V8N0-V5N));",
)
console.log('ok')
