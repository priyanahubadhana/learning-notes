// Renders update-v3.html into PNGs (light and dark) beside it.
// Run: node docs/mockups/update-v3/render.mjs
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const dir = path.dirname(fileURLToPath(import.meta.url))
const url = pathToFileURL(path.join(dir, 'update-v3.html')).href
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 880, height: 600 },
  deviceScaleFactor: 2,
})
await page.goto(url)
for (const theme of ['light', 'dark'])
  for (const panel of ['pills', 'prompt', 'settings']) {
    await page.evaluate(
      ([t, p]) => {
        document.documentElement.dataset.theme = t
        document.body.dataset.panel = p
      },
      [theme, panel],
    )
    await page
      .locator(`#${panel}`)
      .screenshot({ path: path.join(dir, `${panel}-${theme}.png`) })
  }
await browser.close()
