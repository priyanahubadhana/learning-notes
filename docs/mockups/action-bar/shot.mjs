// Shoots every frame of index.html into png/ (run from the repo root: node docs/mockups/action-bar/shot.mjs)
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const dir = path.join(process.cwd(), 'docs', 'mockups', 'action-bar')
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(path.join(dir, 'index.html')).href)
const ids = await p.locator('figure[id^="f-"]').evaluateAll((els) => els.map((e) => e.id))
for (const id of ids) {
  await p.locator('#' + id + ' .shot').screenshot({ path: path.join(dir, 'png', id.slice(2) + '.png') })
}
await b.close()
console.log('frames shot:', ids.length)
