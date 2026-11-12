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
await p.click('#tb [data-id=pen]')
await p.click('#opts .v8star')
await p.waitForTimeout(300)
await p.click('#ctOk')
await p.waitForTimeout(300)
await p.evaluate(() => {
  for (let i = 0; i < 16; i++) {
    const c = JSON.parse(JSON.stringify(ST.ct.list[0]))
    c.id = 'x' + i
    c.name = 'Pen set ' + (i + 1)
    ST.ct.list.push(c)
  }
  ctRender()
  const om = openMenu
  window._log = []
  openMenu = function (items, anchor, title) {
    window._log.push(
      'anchor connected ' +
        (anchor && anchor.isConnected) +
        ' cls ' +
        (anchor && anchor.className) +
        ' rect ' +
        JSON.stringify(anchor && anchor.getBoundingClientRect()),
    )
    const r = om.call(this, items, anchor, title)
    window._log.push(
      'after: connected ' +
        (anchor && anchor.isConnected) +
        ' top ' +
        menu.style.top +
        ' left ' +
        menu.style.left +
        ' v7 ' +
        menu.dataset.v7 +
        ' arrow ' +
        menu.dataset.arrow,
    )
    return r
  }
})
await p.waitForTimeout(300)
await p.click('#opts .v8ovf')
await p.waitForTimeout(400)
console.log(
  await p.evaluate(
    () =>
      window._log.join('\n') +
      '\nfinal ' +
      menu.style.top +
      ' ' +
      menu.style.left +
      ' pos ' +
      getComputedStyle(menu).position,
  ),
)
await b.close()
