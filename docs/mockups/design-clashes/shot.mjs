import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const dir = path.join(process.cwd(), 'docs', 'mockups', 'design-clashes')
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(path.join(dir, 'index.html')).href)
await p.locator('#toast').screenshot({ path: path.join(dir, 'png', '1-toast-shape.png') })
await p.locator('#bars').screenshot({ path: path.join(dir, 'png', '2-bar-heights.png') })
await b.close()
console.log('shots done')
