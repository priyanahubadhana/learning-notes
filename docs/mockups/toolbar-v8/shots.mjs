import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs'
const D =
  'C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1180, height: 820 } })
const errs = []
p.on('pageerror', (e) => errs.push('PE ' + e.message))
p.on('console', (m) => {
  if (['error', 'warning'].includes(m.type()) && !/fonts|ERR_/.test(m.text()))
    errs.push(m.type() + ' ' + m.text())
})
await p.goto('file:///' + D + 'v8/toolbar-mock-v8.html')
await p.waitForTimeout(600)
const S = async (n) => {
  await p.mouse.move(600, 780)
  await p.waitForTimeout(80)
  return p.screenshot({ path: D + 'v8/' + n + '.png' })
}
const tool = async (id) => {
  await p.click('#tb [data-id=' + id + ']')
  await p.waitForTimeout(250)
}
const dd = async (id) => {
  await p.click('[data-dd=' + id + ']')
  await p.waitForTimeout(350)
}
const shut = async () => {
  await p.evaluate(() => closeCards())
  await p.waitForTimeout(150)
}
await tool('text')
await S('v6-text-row')
for (const [id, n] of [
  ['box', 'v6-text-box'],
  ['font', 'v6-text-font'],
  ['style', 'v6-text-style'],
  ['list', 'v6-text-list'],
  ['format', 'v6-text-format'],
]) {
  await dd(id)
  await S(n)
  await shut()
}
await tool('pen')
await S('v6-pen-row')
for (const [id, n] of [
  ['pentype', 'v6-pen-type'],
  ['size', 'v6-pen-size'],
  ['colour', 'v6-pen-colour'],
  ['feel', 'v6-pen-feel'],
  ['fav', 'v6-pen-fav'],
]) {
  await dd(id)
  await S(n)
  await shut()
}
await tool('eraser')
await dd('emode')
await S('v6-eraser')
await shut()
await tool('shapes')
await dd('shape')
await S('v6-shapes')
await shut()
await tool('lasso')
await dd('lact')
await S('v6-lasso')
await shut()
await p.click('#tb [data-id=more]')
await p.waitForTimeout(350)
await S('v6-more')
await p.evaluate(() => closeCards())
await p.click('[data-sh-mode=pro]')
await p.waitForTimeout(400)
await tool('text')
await dd('box')
await S('v6-pro-text')
await shut()
await tool('pen')
await dd('feel')
await S('v6-pro-pen')
await shut()
for (const [t, id, n] of [
  ['pen', 'size', 'v6-pro-size'],
  ['pen', 'colour', 'v6-pro-colour'],
  ['pen', 'fav', 'v6-pro-fav'],
  ['text', 'format', 'v6-pro-format'],
  ['eraser', 'eopt', 'v6-pro-eraser'],
  ['lasso', 'lsel', 'v6-pro-lasso'],
  ['lasso', 'lmenu', 'v6-pro-lmenu'],
]) {
  await tool(t)
  await dd(id)
  await S(n)
  await shut()
}
await p.click('#tb [data-dd=insert]')
await p.waitForTimeout(350)
await S('v6-pro-insert')
await shut()
await p.click('#tb [data-id=more]')
await p.waitForTimeout(350)
await S('v6-pro-more')
await p.evaluate(() => closeCards())
await p.setViewportSize({ width: 820, height: 1180 })
await p.waitForTimeout(500)
await tool('text')
await S('v6-portrait-820')
await dd('box')
await S('v6-portrait-box')
console.log(errs.join('\n'))
await b.close()
