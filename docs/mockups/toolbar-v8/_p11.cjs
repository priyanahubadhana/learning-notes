const fs = require('fs')
const D = __dirname + '/'
const rep = (f, a, b) => {
  let s = fs.readFileSync(D + f, 'utf8')
  if (!s.includes(a)) throw new Error(f + ' miss ' + a.slice(0, 50))
  s = s.split(a).join(b)
  fs.writeFileSync(D + f, s)
}
// renaming inline must not rebuild the sheet under the finger: the next tap (Duplicate, Delete…) has to land
rep(
  'v8c.js',
  "if(i&&i.dataset&&i.dataset.ctx==='rename'){CT.typing=false;if(!i.value.trim()){const t=ctGet(i.dataset.id);if(t)i.value=t.name}else rerender()}});",
  "if(i&&i.dataset&&i.dataset.ctx==='rename'){CT.typing=false;const t=ctGet(i.dataset.id);if(!t)return;if(!i.value.trim())i.value=t.name;const s=$('.v8tile[data-id=\"'+t.id+'\"]>span:not(.v8ctp)',sheet);if(s)s.textContent=t.name}});",
)
console.log('ok')
