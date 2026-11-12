import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs'
const D =
  'C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1180, height: 820 } })
p.on('pageerror', (e) => console.log('PE', e.message))
await p.goto('file:///' + D + 'v8/toolbar-mock-v8.html')
await p.waitForTimeout(600)
await p.click('[data-sh-mode=pro]')
await p.waitForTimeout(400)
console.log(await p.evaluate(process.argv[2]))
await b.close()
