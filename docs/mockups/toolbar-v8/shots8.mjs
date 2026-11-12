// v8 screenshots: feedback, premium bars/sheets, custom tools, Box card beside the box. Landscape 1180x820 and portrait 820x1180. node v8/shots8.mjs [filter]
import fs from 'fs'
import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs'
const D =
  'C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/'
const only = process.argv[2] || ''
fs.mkdirSync(D + 'v8/shots', { recursive: true })
const b = await chromium.launch()
const errs = []
async function run(W, H, tag) {
  const p = await b.newPage({ viewport: { width: W, height: H } })
  p.on('pageerror', (e) => errs.push(tag + ' PE ' + e.message))
  p.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()) && !/fonts|ERR_/.test(m.text()))
      errs.push(tag + ' ' + m.type() + ' ' + m.text())
  })
  await p.goto('file:///' + D + 'v8/toolbar-mock-v8.html')
  await p.waitForTimeout(600)
  const S = async (n, ms) => {
    if (only && !n.includes(only)) return
    await p.mouse.move(W - 200, H - 30)
    await p.waitForTimeout(ms == null ? 420 : ms)
    await p.screenshot({ path: D + 'v8/shots/v8-' + tag + n + '.png' })
  }
  const ev = async (f) => {
    try {
      await p.evaluate(f)
    } catch (e) {
      errs.push(tag + ' EV ' + e.message.split('\n')[0])
    }
    await p.waitForTimeout(260)
  }
  const tool = async (id) => {
    await p.click('#tb [data-id=' + id + ']')
    await p.waitForTimeout(250)
  }
  const dd = async (id) => {
    await p.click('[data-dd=' + id + ']')
    await p.waitForTimeout(320)
  }
  const shut = async () => {
    await ev(() => {
      closeSheet()
      closeMenu()
      closeCards()
    })
  }
  await p.click('[data-sh-mode=pro]')
  await p.waitForTimeout(400)
  const B = await p.evaluate(() => {
    const r = document.querySelector('#paper').getBoundingClientRect()
    return { x: r.left, y: r.top }
  })
  // ---- M1 + M2 + M3: Box card beside the box, box bar without minimise, no Done
  await tool('text')
  await ev(() => {
    select(document.querySelectorAll('.box')[1])
    updateBoxBar()
  })
  await dd('box')
  await S('m1-box-card-beside-wide-box')
  await shut()
  await ev(() => {
    const bx = document.querySelectorAll('.box')[0]
    select(bx)
    updateBoxBar()
  })
  await dd('box')
  await S('m1-box-card-beside-small-box')
  await p
    .click('#acard [data-v6=look],#acard .ltile:nth-child(4)')
    .catch(() => {})
  await S('v1-box-glow', 90)
  await shut()
  await p.click('[data-sh-mode=beg]')
  await p.waitForTimeout(350)
  await tool('text')
  await ev(() => {
    select(document.querySelectorAll('.box')[0])
    updateBoxBar()
  })
  await dd('box')
  await S('m1-beginner-box-picker')
  await shut()
  await p.click('[data-sh-mode=pro]')
  await p.waitForTimeout(350)
  await tool('text')
  await ev(() => {
    select(document.querySelectorAll('.box')[1])
    updateBoxBar()
  })
  await S('m2-box-bar')
  await p.click('.box.sel .tab')
  await S('v3-box-menu')
  await shut()
  await ev(() => {
    buildSelbar(false)
    selbar.hidden = false
    selbar.style.top = '330px'
    selbar.style.left = Math.max(8, Math.min(200, innerWidth - 700)) + 'px'
  })
  await S('v3-text-selection-bar')
  await ev(() => {
    selbar.hidden = true
    deselect()
  })
  // ---- V1: switch feedback, previews in rows
  await tool('pen')
  await dd('feel')
  await p.click('#acard [data-v7seg$=":aids"]')
  await p.waitForTimeout(300)
  await p.click('#acard [role=switch]:has-text("Scribble")')
  await S('v1-switch-toast-undo', 140)
  await p.click('#acard [data-v7seg$=":math"]')
  await p.waitForTimeout(300)
  await S('v1-row-previews-math')
  await p.click('#acard [data-v7seg$=":page"]')
  await p.waitForTimeout(300)
  await p.click('#acard [data-v7=paper][data-v=grid]')
  await S('v1-paper-glow', 110)
  await ev(() => {
    setPaper('lined')
    renderOpts()
  })
  await shut()
  await tool('eraser')
  await dd('eopt')
  await S('v1-eraser-options-previews')
  await shut()
  await tool('lasso')
  await dd('lsel')
  await S('v1-lasso-select-previews')
  await shut()
  await dd('lmenu')
  await S('v1-lasso-menu-previews')
  await shut()
  // ---- V3: lasso selection bar, picture bar, More, layouts, sheets
  await tool('pen')
  await ev(() => {
    R.acard = false
    renderOpts()
  })
  await p.mouse.move(B.x + Math.min(700, W - 260), B.y + 300)
  await p.mouse.down()
  await p.mouse.move(B.x + Math.min(800, W - 160), B.y + 340, { steps: 6 })
  await p.mouse.up()
  await tool('lasso')
  const lx = Math.min(660, W - 300)
  await p.mouse.move(B.x + lx, B.y + 280)
  await p.mouse.down()
  for (const q of [
    [lx + 200, 280],
    [lx + 200, 460],
    [lx, 460],
    [lx + 2, 282],
  ])
    await p.mouse.move(B.x + q[0], B.y + q[1], { steps: 3 })
  await p.mouse.up()
  await p.waitForTimeout(300)
  await S('v3-lasso-bar')
  await p.click('#lsel [data-m=more]').catch(() => errs.push('lsel more'))
  await S('v3-lasso-bar-more')
  await ev(() => {
    R.lm = { col: true }
    syncLsel()
  })
  await S('v3-lasso-bar-colour')
  await ev(() => clearLasso())
  await p.click('#tb [data-id=more]')
  await p.waitForTimeout(350)
  await S('v3-more-top')
  await p.evaluate(
    () => (document.querySelector('#morecard .cpane').scrollTop = 9999),
  )
  await S('v3-more-bottom')
  await p.click('#morecard [data-z=lay]')
  await S('v3-layouts')
  await shut()
  await ev(() => settingsSheet())
  await S('v3-settings-sheet')
  await ev(() => customiseSheet())
  await S('v3-customise-sheet')
  await ev(() => {
    closeSheet()
    newLayoutDlg()
  })
  await S('v3-dialog-new-layout')
  await ev(() => {
    closeSheet()
    linkSheet()
  })
  await S('v3-dialog-link')
  await shut()
  await ev(() => toggleReading(true))
  await ev(() => readSheet())
  await S('v3-reading-look')
  await ev(() => {
    closeSheet()
    toggleReading(false)
  })
  await ev(() => openPad('write'))
  await S('v3-write-pad')
  await ev(() => closePad())
  await p.click('#tb [data-dd=insert]')
  await p.waitForTimeout(250)
  await p.click('#acard [data-v=elements]')
  await S('v3-elements')
  await shut()
  // ---- V4: custom tools
  await tool('pen')
  await ev(() => {
    R.pen = 'Fountain'
    R.size = 'Bold'
    R.penCol = '#ef7a6f'
    renderOpts()
  })
  await S('v4-pen-row-star')
  await p.click('#opts .v8star')
  await p.waitForTimeout(400)
  await S('v4-save-sheet')
  await p.fill('#ctName', 'Red ink')
  await p.click('#ctParts [data-k=shape]')
  await p.click('#ctPos [data-d="-1"]')
  await p.click('#ctPos [data-d="-1"]')
  await p.waitForTimeout(200)
  await S('v4-save-sheet-mixed-position')
  await p.evaluate(() => {
    const s = document.querySelector('#sheet')
    s.scrollTop = s.scrollHeight
  })
  await S('v4-save-sheet-where')
  await p.click('#ctParts [data-k=shape]')
  await p.click('#ctOk')
  await S('v4-saved-toast', 160)
  await p.waitForTimeout(900)
  await ev(() => {
    R.pen = 'Highlighter'
    R.hlCol = '#f5d76e'
    renderOpts()
  })
  await p.click('#opts .v8star')
  await p.waitForTimeout(300)
  await p.fill('#ctName', 'Exam marker')
  await p.click('#ctOk')
  await p.waitForTimeout(300)
  await tool('eraser')
  await p.click('#opts .v8star')
  await p.waitForTimeout(300)
  await p.fill('#ctName', 'Quick rub')
  await p.click('#ctRows [data-v=main]')
  await p.waitForTimeout(200)
  await S('v4-save-sheet-main-bar')
  await p.click('#ctOk')
  await p.waitForTimeout(300)
  await tool('text')
  await ev(() => {
    select(document.querySelectorAll('.box')[1])
    setStyle(PRESETS[3][2], true)
    deselect()
    renderOpts()
  })
  await p.click('#opts .v8star')
  await p.waitForTimeout(300)
  await p.fill('#ctName', 'Sticky')
  await p.click('#ctOk')
  await p.waitForTimeout(1500)
  await S('v4-text-row-custom-tool')
  await tool('pen')
  await ev(() => {
    R.pen = 'Ball'
    R.size = 'Fine'
    R.penCol = 'auto'
    renderOpts()
  })
  await S('v4-pen-row-custom-tools')
  console.log(
    tag,
    'ids',
    await p.evaluate(() =>
      ST.ct.list.map((t) => t.id + ':' + t.name + ':' + t.row).join(' | '),
    ),
  )
  if (await p.locator('#opts .v8ct:has-text("Red ink")').count())
    await p.click('#opts .v8ct:has-text("Red ink")')
  else await ev(() => ctUse('ct1'))
  await S('v4-use-toast', 160)
  await p.waitForTimeout(700)
  await ev(() => {
    CT.edit = true
    ctRender()
  })
  await S('v4-edit-mode')
  const r = await p.evaluate(() => {
    const e = document.querySelector('#opts .v8ct').getBoundingClientRect()
    return { x: e.left + e.width / 2, y: e.top + e.height / 2 }
  })
  await p.mouse.move(r.x, r.y)
  await p.mouse.down()
  await p.mouse.move(r.x + 170, r.y, { steps: 8 })
  await S('v4-edit-drag', 60)
  await p.mouse.up()
  await p.waitForTimeout(300)
  await ev(() => ctEdit('ct1'))
  await p.waitForTimeout(350)
  await S('v4-edit-sheet')
  await p.evaluate(() => {
    const s = document.querySelector('#sheet')
    s.scrollTop = s.scrollHeight
  })
  await S('v4-edit-sheet-bottom')
  await ev(() => {
    CT.draft = null
    closeSheet()
    CT.edit = false
    ctRender()
  })
  await ev(() => ctManager())
  await S('v4-manager')
  await shut()
  await ev(() => {
    for (let i = 0; i < 16; i++) {
      const c = JSON.parse(
        JSON.stringify(ST.ct.list.find((t) => t.name === 'Red ink')),
      )
      c.id = 'x' + i
      c.name = 'Pen set ' + (i + 1)
      ST.ct.list.push(c)
    }
    ctRender()
  })
  await S('v4-overflow-folds')
  await p
    .click('#opts .v8ovf')
    .catch(() => errs.push(tag + ' no overflow button'))
  await S('v4-overflow-menu')
  await shut()
  await ev(() => {
    ST.ct.list = ST.ct.list.filter((t) => !/^x/.test(t.id))
    ctRender()
  })
  await p.click('[data-sh-mode=beg]')
  await p.waitForTimeout(400)
  await tool('pen')
  await S('v4-beginner-hidden')
  await p.click('#tb [data-id=more]')
  await p.waitForTimeout(350)
  await p.evaluate(() => {
    const c = document.querySelector('#morecard .cpane')
    c.scrollTop = 9999
  })
  await S('v4-beginner-unlock-row')
  await p.click('#morecard [data-ctx=unlock]')
  await S('v4-beginner-unlocked', 200)
  await shut()
  await ev(() => {
    ST.ct.unlock = false
    save()
    renderToolbar()
  })
  // light theme check
  await p.click('[data-sh-mode=pro]')
  await p.waitForTimeout(350)
  await ev(() => {
    document.documentElement.dataset.theme = 'light'
    redraw()
    renderToolbar()
  })
  await tool('pen')
  await ev(() => ctManager())
  await S('light-manager')
  await shut()
  await tool('text')
  await ev(() => {
    select(document.querySelectorAll('.box')[1])
    updateBoxBar()
  })
  await dd('box')
  await S('light-box-card')
  await shut()
  await p.close()
}
await run(1180, 820, '')
await run(820, 1180, 'p-')
console.log('ERRORS:\n' + errs.join('\n'))
await b.close()
