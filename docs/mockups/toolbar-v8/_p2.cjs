// one-off: String.replace turned "$$(" into "$(" in the v8Minis line; put it back
const fs = require('fs')
const f = __dirname + '/v8b.js'
let s = fs.readFileSync(f, 'utf8')
const a = "function v8Minis(root){if(!root)return;$('[role=switch]',root)"
if (!s.includes(a)) throw new Error('miss')
s = s
  .split(a)
  .join('function v8Minis(root){if(!root)return;$' + "$('[role=switch]',root)")
fs.writeFileSync(f, s)
console.log('ok')
