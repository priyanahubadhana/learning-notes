import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs'
const D =
  'C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1180, height: 820 } })
await p.goto('file:///' + D + 'v7/toolbar-mock-v7.html')
await p.waitForTimeout(500)
await p.evaluate(() => {
  document.documentElement.dataset.theme = 'light'
  redraw()
  renderOpts()
})
await p.click('[data-dd=pentype]')
await p.waitForTimeout(500)
await p.screenshot({
  path: D + 'v7/v7-light-pentype.png',
  clip: { x: 70, y: 120, width: 560, height: 440 },
})
await p.evaluate(() => closeCards())
await p.click('[data-dd=feel]')
await p.waitForTimeout(500)
await p.screenshot({
  path: D + 'v7/v7-light-feel.png',
  clip: { x: 300, y: 120, width: 600, height: 660 },
})
await b.close()
