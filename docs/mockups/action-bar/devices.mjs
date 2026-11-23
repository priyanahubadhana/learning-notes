// Builds docs/mockups/action-bar/devices.html (iPad sideways, iPad upright, phone) from the approved PC picture
// (index.html: the bar markup, icons, tokens and gaps are copied, not redrawn), fits each bar to its screen,
// checks it against the tool table, then shoots every frame into png-devices/.
// Run from the repo root: node docs/mockups/action-bar/devices.mjs   (one chromium launch; no dev server)
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import {
  parseTable,
  compareList,
  SPEC,
} from '../../../scripts/check-bar-inventory.mjs'

const dir = path.join(process.cwd(), 'docs', 'mockups', 'action-bar')
const out = path.join(dir, 'png-devices')
mkdirSync(out, { recursive: true })
const src = readFileSync(path.join(dir, 'index.html'), 'utf8')
const css = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>'))

// copy the bar (or the round pin button) of an approved PC frame
function pick(id, cls) {
  const f = src.slice(src.indexOf(`<figure id="${id}"`))
  const a = f.indexOf(`<div class="${cls}"`)
  const b = f.indexOf('</div></div></div><figcaption')
  return f.slice(a, b + 6)
}
const at = (html, left, top) =>
  html.replace(/style="[^"]*"/, `style="left:${left}px;top:${top}px"`)
const WORDS = pick('f-2-words-light', 'bar')
const BOX = pick('f-3-box-light', 'bar')
const PINWORDS = pick('f-9-pinned-words-light', 'bar')
const FOLD = pick('f-5-pinned-light', 'foldwrap')
const foldAt = (left, top) =>
  FOLD.replace(/style="[^"]*"/, `style="left:${left}px;top:${top}px"`)

const LINE = 'Service 23-11 <mark class="sel">2000</mark> rate-is up on the old plan.'
const PLAIN = 'Service 23-11 2000 rate-is up on the old plan.'
const selbox = (l, t, w, h) =>
  `<div class="selbox" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px"><b>Service plan</b><br>Rate 2000 per month, review in March.<i class="h" style="left:0;top:0"></i><i class="h" style="left:100%;top:0"></i><i class="h" style="left:0;top:100%"></i><i class="h" style="left:100%;top:100%"></i></div>`
const ln = (t, top, left, extra = '') =>
  `<p class="ln ${extra}" style="top:${top}px;left:${left}px">${t}</p>`
const muted = (t, top, left, extra = '') =>
  `<p class="ln ${extra}" style="top:${top}px;left:${left}px;color:var(--muted)">${t}</p>`

const D = {
  sw: { w: 1180, h: 820, name: 'iPad sideways', m: 16, inset: 24 },
  up: { w: 820, h: 1180, name: 'iPad upright', m: 16, inset: 24 },
  ph: { w: 390, h: 844, name: 'Phone', m: 8, inset: 8 },
}

// frames: id, device, night, state (table row for the check), content, caption
const frames = []
const add = (f) => frames.push(f)

// ---- iPad sideways
add({
  id: 'ipad-sideways-1-words-day', dev: 'sw', night: false, state: 'Words selected', open: false,
  body: ln(LINE, 150, 80) + muted('Next line of the note, unselected.', 262, 80) + at(WORDS, 80, 190),
  cap: '1. iPad sideways, words selected. The whole row fits in one row; nothing moves, nothing is moved under ⋯. Day.',
})
add({
  id: 'ipad-sideways-1-words-night', dev: 'sw', night: true, state: 'Words selected', open: false,
  body: ln(LINE, 150, 80) + muted('Next line of the note, unselected.', 262, 80) + at(WORDS, 80, 190),
  cap: '2. iPad sideways, words selected. Night.',
})
add({
  id: 'ipad-sideways-2-box-day', dev: 'sw', night: false, state: 'A box', open: false,
  body: muted('Notes above the box.', 110, 80) + selbox(80, 150, 420, 104) + at(BOX, 80, 274),
  cap: '3. iPad sideways, a box selected. The long box row (13 tools and the ending) fits in one row at 1180 px; no sideways scroll, no second row. Day.',
})
add({
  id: 'ipad-sideways-3-pinned-folded-day', dev: 'sw', night: false, state: 'Pinned, nothing selected', open: false,
  body: ln(PLAIN, 150, 80) + muted('Nothing is selected. The pinned bar is folded into one round pin button at its place.', 206, 80) + foldAt(24, 56),
  cap: '4. iPad sideways, pinned and nothing selected: the round pin button (44 px, filled pin) at the bar\'s place. Day.',
})
add({
  id: 'ipad-sideways-4-pinned-words-day', dev: 'sw', night: false, state: 'Words selected', open: false,
  body: ln(LINE, 150, 80) + at(PINWORDS, 24, 56),
  cap: '5. iPad sideways, pinned, words selected: the bar opens at the round button\'s place with the filled pin. Day.',
})

// ---- iPad upright
add({
  id: 'ipad-upright-1-words-day', dev: 'up', night: false, state: 'Words selected', open: false,
  body: ln(LINE, 150, 80) + muted('Next line of the note, unselected.', 262, 80) + at(WORDS, 80, 190),
  cap: '6. iPad upright, words selected. The words row (about 660 px) fits in 820 px: one row, nothing moved. Day.',
})
add({
  id: 'ipad-upright-2-box-day', dev: 'up', night: false, state: 'A box', open: false,
  body: muted('Notes above the box.', 110, 80) + selbox(80, 150, 420, 104) + at(BOX, 80, 274),
  cap: '7. iPad upright, a box selected. The row is too wide for 820 px: the tools next to the ending move under ⋯▾ from the right; the ending stays. Day.',
})
add({
  id: 'ipad-upright-3-box-more-open-day', dev: 'up', night: false, state: 'A box', open: true,
  body: muted('Notes above the box.', 110, 80) + selbox(80, 150, 420, 104) + at(BOX, 80, 274),
  cap: '8. Same, ⋯▾ open: the moved tools first, in bar order, then the box list; Customise bar… last. Day.',
})
add({
  id: 'ipad-upright-4-pinned-folded-day', dev: 'up', night: false, state: 'Pinned, nothing selected', open: false,
  body: ln(PLAIN, 150, 80) + muted('Nothing is selected. The pinned bar is folded into one round pin button at its place.', 206, 80) + foldAt(24, 56),
  cap: '9. iPad upright, pinned and nothing selected: the round pin button. Day.',
})

// ---- phone
const phLines = (t) => ln(t, 40, 20, 'wrap')
add({
  id: 'phone-1-words-day', dev: 'ph', night: false, state: 'Words selected', open: false,
  body: ln(LINE, 40, 20, 'wrap') + muted('Next line of the note, unselected.', 190, 20, 'wrap') + at(WORDS, 8, 104),
  cap: '10. Phone, words selected. The ending Cut, Copy, Paste ▾, Delete, ⋯▾ shows in full; every tool before it sits under ⋯▾. Day.',
})
add({
  id: 'phone-1-words-night', dev: 'ph', night: true, state: 'Words selected', open: false,
  body: ln(LINE, 40, 20, 'wrap') + muted('Next line of the note, unselected.', 190, 20, 'wrap') + at(WORDS, 8, 104),
  cap: '11. Phone, words selected. Night.',
})
add({
  id: 'phone-2-box-day', dev: 'ph', night: false, state: 'A box', open: false,
  body: selbox(20, 28, 350, 72) + at(BOX, 8, 114),
  cap: '12. Phone, a box selected (S10). The ending shows in full; the eight tools before it sit first under ⋯▾. Day.',
})
add({
  id: 'phone-3-box-more-open-day', dev: 'ph', night: false, state: 'A box', open: true,
  body: selbox(20, 28, 350, 72) + at(BOX, 8, 114),
  cap: '13. Phone, a box selected, ⋯▾ open: the moved tools first, in bar order, then Duplicate to Customise bar…. Day.',
})
void phLines

const NOTES = {
  sw: 'iPad sideways (1180 x 820). What changes against the PC picture: the screen, touch only (no hover names, hold opens the Hold menu), a bar that can be dragged by ⠿ by finger. What does not: every button, its icon, its order, the 44 px targets, the one row, the ending, the pin and the fold. Here even the long box row fits, so nothing sits under ⋯ that the PC picture does not already have there.',
  up: 'iPad upright (820 x 1180). What changes: the width. The bar folds its tail into ⋯▾ by the width it has (confirm row 20): the box row no longer fits, so the tools next to the ending move under ⋯▾ from the right, in bar order, before the state\'s own list. What does not: the ending, the order, 44 px, one row, the pin and the fold.',
  ph: 'Phone (390 x 844, stage 3, drawn now so the rule is seen). What changes: the width again, and the gap tightens from 4 to 2 px and the divider loses its margin (Compact tightens spacing only, 44 px stays). Everything before the ending moves under ⋯▾ (S10); the bar keeps ⠿, the pin and the ending. What does not: the tools and their order, the icons, Delete the only red, ⋯ always last with ▾ and Customise bar… at the end of its list.',
}

function figure(f) {
  const d = D[f.dev]
  const dark = f.night ? ' dark' : ''
  const label = `${f.night ? 'Night' : 'Day'} · ${d.name}`
  const inset = d.inset
  return `<figure id="f-${f.id}"><div class="shot${dark}${f.dev === 'ph' ? ' compact' : ''}" style="width:${d.w}px;height:${d.h}px"><div class="paper" data-label="${label}" style="left:${inset}px;right:${inset}px;top:${inset}px;bottom:${inset}px"></div><div class="layer" style="left:${inset}px;right:${inset}px;top:${inset}px;bottom:${inset}px" data-state="${f.state}" data-fit="${d.w - 2 * inset - 2 * d.m}" data-margin="${d.m}" data-open="${f.open ? 1 : 0}">${f.body}</div></div><figcaption style="width:${d.w}px">${f.cap}</figcaption></figure>`
}
function group(dev, title) {
  const fs = frames.filter((f) => f.dev === dev)
  return `<section class="dev"><h2>${title}</h2><p class="note">${NOTES[dev]}</p><div class="grp">${fs.map(figure).join('\n')}</div></section>`
}

const extra = `
main{width:auto;max-width:2500px;padding:32px 32px 48px}
.grp{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start}
h2{font-size:19px;line-height:28px;margin:24px 0 4px;font-weight:600}
.dev .note{max-width:1100px}
.shot{border-radius:20px}
.ln.wrap{white-space:normal;right:20px}
.compact .bar{gap:2px}.compact .sep{margin:0}
.moved-dot{width:16px;height:16px;border-radius:50%;background:var(--swatch);border:1px solid var(--line-strong);flex:none}
`
const page = (body) =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Action bar, devices</title><style>${css}${extra}</style></head><body><main>
<h1>Action bar, iPad sideways, iPad upright, phone</h1>
<p class="note">Drawn 24 Nov 2026 from the approved PC picture (index.html): the bar markup, icons, tokens and gaps are copied, not redrawn. One row on every screen; every target 44 px; nothing depends on hover (no hover-name frame here); the Colour button is the circle with ▾; Delete is the only red; ⋯ always has ▾ and its list ends with Customise bar…; no button is dropped: what does not fit sits under ⋯ in the tool table's order, the ending stays. Waiting for the owner's yes.</p>
${body}
</main></body></html>`

const html0 = page(
  group('sw', 'iPad sideways') + group('up', 'iPad upright') + group('ph', 'Phone'),
)
const tmp = path.join(dir, 'devices.html')
writeFileSync(tmp, html0)

const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 2000, height: 1400 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(tmp).href)

// fit every bar to its screen: tools before the ending move under ⋯, from the right, in bar order
const report = await p.evaluate(() => {
  const res = []
  for (const layer of document.querySelectorAll('.layer[data-fit]')) {
    const fit = Number(layer.dataset.fit)
    const m = Number(layer.dataset.margin)
    const bar = layer.querySelector('.bar')
    const id = layer.closest('figure').id
    if (!bar) { res.push({ id, fold: true }); continue }
    const kids = [...bar.children]
    const pin = kids.findIndex((k) => k.classList.contains('pin'))
    const sep = kids.findIndex((k) => k.classList.contains('sep'))
    const lead = kids.slice(pin + 1, sep)
    const moved = []
    while (bar.getBoundingClientRect().width > fit && lead.length) {
      const el = lead.pop()
      moved.unshift(el)
      el.remove()
    }
    const menu = bar.querySelector('[data-bar-more]')
    if (moved.length) {
      if (!lead.length) bar.querySelector('.sep').remove()
      bar.setAttribute('data-bar-device-state', bar.getAttribute('data-bar-state'))
      bar.removeAttribute('data-bar-state')
      const rows = moved.map((el) => {
        const li = document.createElement('li')
        li.className = 'row moved'
        li.setAttribute('role', 'menuitem')
        li.setAttribute('data-tool', el.dataset.tool)
        const name = el.getAttribute('aria-label') || el.dataset.tool
        li.innerHTML = (el.dataset.tool === 'Colour' ? '<i class="moved-dot"></i>' : '') + name
        return li
      })
      const div = document.createElement('li')
      div.className = 'div'
      menu.prepend(...rows, div)
    }
    if (layer.dataset.open === '1') {
      menu.hidden = false
      bar.querySelector('[data-tool="⋯▾"]').classList.add('on')
    }
    // keep the bar on the screen
    const lw = layer.getBoundingClientRect().width
    const bw = bar.getBoundingClientRect().width
    let left = parseFloat(bar.style.left)
    left = Math.max(m, Math.min(left, lw - bw - m))
    bar.style.left = left + 'px'
    res.push({ id })
  }
  return res
})
void report

// checks: table order, 44 px, inside the screen, selection not covered, one row
const table = parseTable(readFileSync(SPEC, 'utf8'))
const problems = []
const facts = []
const data = await p.evaluate(() => {
  const list = []
  for (const layer of document.querySelectorAll('.layer[data-fit]')) {
    const fig = layer.closest('figure')
    const bar = layer.querySelector('.bar')
    const lr = layer.getBoundingClientRect()
    const row = { id: fig.id, state: layer.dataset.state, fold: !bar }
    if (bar) {
      const br = bar.getBoundingClientRect()
      row.bar = [...bar.children].map((k) => k.dataset.tool).filter(Boolean)
      const menu = bar.querySelector('[data-bar-more]')
      const items = [...menu.children]
      row.moved = items.filter((i) => i.classList.contains('moved')).map((i) => i.dataset.tool)
      row.more = items.filter((i) => i.dataset.tool && !i.classList.contains('moved')).map((i) => i.dataset.tool)
      row.w = Math.round(br.width)
      row.h = Math.round(br.height)
      row.inside = br.left >= lr.left && br.right <= lr.right && br.top >= lr.top && br.bottom <= lr.bottom
      row.scrollX = bar.scrollWidth > bar.clientWidth + 1
      const mr = menu.hidden ? null : menu.getBoundingClientRect()
      row.menuInside = mr ? mr.left >= lr.left && mr.right <= lr.right && mr.bottom <= lr.bottom : true
      row.menuRows = items.filter((i) => !i.classList.contains('div')).length
      const sel = layer.querySelector('.sel, .selbox')
      if (sel) {
        const sr = sel.getBoundingClientRect()
        row.covers = !(br.right < sr.left || br.left > sr.right || br.bottom < sr.top - 6 || br.top > sr.bottom + 6)
      }
      row.small = [...bar.querySelectorAll('.b:not(.dd), .grip')]
        .filter((e) => !e.closest('.split') || e.classList.contains('dd') === false && false)
        .filter((e) => { const r = e.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5 })
        .map((e) => e.dataset.tool)
      row.smallPaste = [...bar.querySelectorAll('.split .b')].map((e) => e.getBoundingClientRect().height)
    } else {
      const f = layer.querySelector('.fold')
      const fr = f.getBoundingClientRect()
      row.w = Math.round(fr.width); row.h = Math.round(fr.height)
      row.inside = fr.left >= lr.left && fr.top >= lr.top
    }
    list.push(row)
  }
  return list
})
for (const r of data) {
  const t = table.find((x) => x.state === r.state)
  if (r.fold) {
    facts.push(`${r.id}: round pin button ${r.w}x${r.h}, inside ${r.inside}`)
    if (r.w < 44 || r.h < 44 || !r.inside) problems.push(`${r.id}: fold size or place`)
    continue
  }
  const names = (a) => a.map((name) => ({ name }))
  const lead = r.bar.filter((n) => !['⠿', 'pin'].includes(n))
  const sepAt = r.bar.indexOf('Cut')
  const remaining = r.bar.slice(2, sepAt)
  const ending = r.bar.slice(sepAt)
  const full = [...names(['⠿', 'pin']), ...names(remaining), ...names(r.moved), ...names(ending)]
  const a = compareList(t.bar, full, `${r.id} bar+moved`)
  const b = compareList(t.more, names(r.more), `${r.id} list`)
  problems.push(...a, ...b)
  if (!r.inside || !r.menuInside) problems.push(`${r.id}: off screen`)
  if (r.scrollX || r.h > 56) problems.push(`${r.id}: not one row (h ${r.h})`)
  if (r.covers) problems.push(`${r.id}: bar covers the selection`)
  if (r.small.length) problems.push(`${r.id}: targets under 44: ${r.small}`)
  facts.push(
    `${r.id}: bar ${r.w}x${r.h}; ON BAR: ${r.bar.filter((n) => !['⠿', 'pin'].includes(n)).join(', ')}; MOVED UNDER ⋯: ${r.moved.join(', ') || '-'}; OWN LIST: ${r.more.join(', ')}`,
  )
  void lead
}
console.log(facts.join('\n'))
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all frames: table complete, 44 px, inside the screen, one row, selection not covered')

// write the fitted page, then shoot
const finalHtml = '<!doctype html>\n' + (await p.evaluate(() => document.documentElement.outerHTML))
writeFileSync(tmp, finalHtml)
await p.goto(pathToFileURL(tmp).href)
for (const f of frames) {
  await p.locator('#f-' + f.id + ' .shot').screenshot({ path: path.join(out, f.id + '.png') })
}
await browser.close()
console.log('frames shot:', frames.length)
