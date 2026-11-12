// v7 screenshots: every ▾ card, Beginner and Professional, landscape 1180x820 and portrait 820x1180. node v7/shots7.mjs [filter]
import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs'
const D =
  'C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/'
const only = process.argv[2] || ''
const b = await chromium.launch()
const errs = []
async function run(W, H, tag) {
  const p = await b.newPage({ viewport: { width: W, height: H } })
  p.on('pageerror', (e) => errs.push('PE ' + e.message))
  p.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()) && !/fonts|ERR_/.test(m.text()))
      errs.push(m.type() + ' ' + m.text())
  })
  await p.goto('file:///' + D + 'v8/toolbar-mock-v8.html')
  await p.waitForTimeout(600)
  const S = async (n) => {
    if (only && !n.includes(only)) return
    await p.mouse.move(W - 200, H - 30)
    await p.waitForTimeout(380)
    await p.screenshot({ path: D + 'v8/v8-' + tag + n + '.png' })
    const c = await p.evaluate(() => {
      const e = ['#more', '#acard', '#lcard', '#elcard', '#morecard']
        .map((s) => document.querySelector(s))
        .find((e) => e && e.classList.contains('show'))
      if (!e) return null
      const r = e.getBoundingClientRect(),
        t = document.querySelector('#barbox').getBoundingClientRect()
      const x = Math.max(0, Math.min(r.left, innerWidth - r.width - 60) - 24)
      return {
        x,
        y: t.top - 4,
        width: Math.min(innerWidth - x, r.width + 84),
        height: Math.min(innerHeight - t.top + 4, r.bottom - t.top + 20),
      }
    })
    if (c)
      await p.screenshot({ path: D + 'v8/clip/' + tag + n + '.png', clip: c })
  }
  const tool = async (id) => {
    await p.click('#tb [data-id=' + id + ']')
    await p.waitForTimeout(250)
  }
  const dd = async (id) => {
    await p.click('[data-dd=' + id + ']')
    await p.waitForTimeout(300)
  }
  const seg = async (k) => {
    await p.click('#acard [data-v7seg$=":' + k + '"]')
    await p.waitForTimeout(350)
  }
  const shut = async () => {
    await p.evaluate(() => closeCards())
    await p.waitForTimeout(260)
  }
  for (const mode of ['beg', 'pro']) {
    await p.click('[data-sh-mode=' + mode + ']')
    await p.waitForTimeout(400)
    await tool('pen')
    for (const id of ['pentype', 'size', 'colour', 'fav']) {
      await dd(id)
      await S(mode + '-pen-' + id)
      await shut()
    }
    await dd('feel')
    await S(mode + '-pen-feel')
    for (const k of ['aids', 'math', 'page']) {
      await seg(k)
      await S(mode + '-pen-feel-' + k)
    }
    await seg('feel')
    if (mode === 'beg') {
      await p.click('#acard [data-v7=tune]')
      await p.waitForTimeout(300)
      await S(mode + '-pen-feel-tune')
      await p.click('#acard [data-v7=tune]')
    }
    await shut()
    await tool('text')
    await p.evaluate(() => {
      select(document.querySelectorAll('.box')[1])
      updateBoxBar()
    })
    await p.waitForTimeout(250)
    await dd('box')
    await S(mode + '-text-box')
    if (mode === 'pro') {
      await p.click('#acard .ctab[data-tab=layout]')
      await p.waitForTimeout(300)
      await S(mode + '-text-box-layout')
      await p.click('#acard .ctab[data-tab=box]')
    }
    await shut()
    await dd('format')
    await S(mode + '-text-format')
    for (const k of mode === 'pro'
      ? ['style', 'para', 'adv']
      : ['style', 'para']) {
      await seg(k)
      await S(mode + '-text-format-' + k)
    }
    await seg('text')
    await shut()
    if (mode === 'pro') {
      await dd('style')
      await S(mode + '-text-style')
      await shut()
      await dd('list')
      await S(mode + '-text-list')
      await shut()
    }
    await p.evaluate(() => deselect())
    await tool('eraser')
    for (const id of mode === 'pro' ? ['emode', 'esize', 'eopt'] : ['emode']) {
      await dd(id)
      await S(mode + '-eraser-' + id)
      await shut()
    }
    await tool('shapes')
    await dd('shape')
    await S(mode + '-shapes-shape')
    await shut()
    await tool('lasso')
    for (const id of mode === 'pro'
      ? ['lsel', 'lmenu', 'llayers']
      : ['lshape', 'lact']) {
      await dd(id)
      await S(mode + '-lasso-' + id)
      await shut()
    }
    await p.click('#tb [data-dd=insert]')
    await p.waitForTimeout(350)
    await S(mode + '-insert')
    await shut()
    await p.click('#tb [data-id=more]')
    await p.waitForTimeout(350)
    await S(mode + '-more')
    await shut()
    await tool('pen')
  }
  await p.close()
}
await run(1180, 820, '')
await run(820, 1180, 'p-')
console.log('ERRORS:\n' + errs.join('\n'))
await b.close()
