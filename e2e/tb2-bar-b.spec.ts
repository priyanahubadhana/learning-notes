// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  openSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Phase 2B, box bar part A (switch textbox.v2 ON): the ONE bar of a selected
 * box (owner, 18 Nov 2026: docs/design/owner-decisions.md "Selected box: one
 * bar like Goodnotes" and "Box-bar mock APPROVED"; mock
 * docs/mockups/box-bar/index.html, "We will prove" and "Must never happen").
 * Moving, docking and pinning the bar is part B and is not tested here.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string, mode: 'computer' = 'computer') {
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    const w = window as unknown as { __clip: string[]; __paste: string }
    w.__clip = []
    w.__paste = 'Pasted words'
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (t: string) => (w.__clip.push(t), Promise.resolve()),
        readText: () => Promise.resolve(w.__paste),
        read: () =>
          Promise.resolve([
            {
              types: ['text/plain'],
              getType: () => Promise.resolve(new Blob([w.__paste])),
            },
          ]),
      },
    })
  })
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

async function addBox(page: Page, text: string, gap = 60) {
  const before = await page.locator(EXTRA).count()
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count()) ? await rect(sheetEl) : main
  let bottom = 0
  const all = page.locator('[data-paper-box]')
  for (let i = 0; i < (await all.count()); i++) {
    const r = await rect(all.nth(i))
    bottom = Math.max(bottom, r.y + r.height)
  }
  await page.mouse.click(sheet.x + sheet.width * 0.3, bottom + gap)
  const boxes = page.locator(EXTRA)
  await expect(boxes).toHaveCount(before + 1)
  await expect(boxes.nth(before).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return boxes.nth(before)
}

/** A finger tap in the empty part of a box selects it (owner 17 Nov). */
async function pick(page: Page, box: Locator) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picked]')).toHaveCount(0)
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 32,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    el.dispatchEvent(mk('pointerdown', 1))
    el.dispatchEvent(mk('pointerup', 0))
  }, p)
  await expect(box).toHaveAttribute('data-picked', '')
}

const bar = (page: Page) => page.locator('[data-box-bar]')
const btn = (page: Page, name: string) =>
  bar(page).getByRole('button', { name, exact: true })
const pop = (page: Page, id: string) =>
  page.locator(`[data-onebar-pop="${id}"]`)
const words = (box: Locator) => box.locator('.bn-inline-content').first()
/** The first words' own element: the one that carries the font and the size. */
const look = (box: Locator, prop: 'fontFamily' | 'fontSize') =>
  words(box).evaluate((el, p) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()
    return n?.parentElement ? getComputedStyle(n.parentElement)[p] : ''
  }, prop)
export const sizeOf = async (box: Locator) =>
  parseFloat(await look(box, 'fontSize'))

async function ready(page: Page, text = 'Alpha beta', gap = 60) {
  await start(page, 'Bar' + Math.random().toString(36).slice(2, 6))
  const box = await addBox(page, text, gap)
  await pick(page, box)
  await expect(bar(page)).toHaveCount(1)
  return box
}

/**
 * Box bar part B (owner decisions 18 Nov, mock frames 12 to 15 "We will prove"
 * line 7): drag the bar by its grip to any of the four sides, horizontal or
 * vertical, and pin it; it stays on every page and after closing the app, for
 * every box, with nothing selected and while typing.
 */
const area = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('main')!.getBoundingClientRect()
    return { l: r.left, t: r.top, r: r.right, b: r.bottom }
  })

async function drag(page: Page, to: { x: number; y: number }) {
  const g = await rect(page.getByTestId('ob-grip'))
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  return g
}

test('B1. a held grip shows the four dashed zones; the bar follows', async ({
  page,
}) => {
  await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  const g = await rect(page.getByTestId('ob-grip'))
  await drag(page, { x: (a.l + a.r) / 2, y: (a.t + a.b) / 2 })
  for (const side of ['top', 'bottom', 'left', 'right'])
    await expect(page.locator(`[data-onebar-zone="${side}"]`)).toBeVisible()
  const now = await rect(page.getByTestId('ob-grip'))
  expect(Math.abs(now.x - g.x) + Math.abs(now.y - g.y)).toBeGreaterThan(20)
  await page.mouse.up()
  await expect(page.locator('[data-onebar-zone]')).toHaveCount(0)
})

test('B2. a free drop moves the bar there and offers the pin; the pin keeps it', async ({
  page,
}) => {
  await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: (a.l + a.r) / 2, y: (a.t + a.b) / 2 })
  await page.mouse.up()
  await expect(page.getByTestId('ob-pin')).toBeVisible()
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByTestId('ob-pin').click()
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const b = await rect(page.getByTestId('object-bar'))
  expect(b.y).toBeGreaterThan(a.t)
  expect(b.y + b.height).toBeLessThan(a.b)
})

for (const [side, vertical] of [
  ['bottom', false],
  ['top', false],
  ['left', true],
  ['right', true],
] as const) {
  test(`B3. dropped on the ${side} the bar docks, ${vertical ? 'upright' : 'lying'}, inside the page`, async ({
    page,
  }) => {
    await ready(page, 'Alpha beta', 300)
    const a = await area(page)
    const to = {
      bottom: { x: (a.l + a.r) / 2, y: a.b - 24 },
      top: { x: (a.l + a.r) / 2, y: a.t + 24 },
      left: { x: a.l + 24, y: (a.t + a.b) / 2 },
      right: { x: a.r - 24, y: (a.t + a.b) / 2 },
    }[side]
    await drag(page, to)
    await expect(page.locator(`[data-onebar-zone="${side}"]`)).toHaveClass(
      /is-on/,
    )
    await page.mouse.up()
    const b = await rect(page.getByTestId('object-bar'))
    if (vertical) expect(b.height).toBeGreaterThan(b.width)
    else expect(b.width).toBeGreaterThan(b.height)
    expect(b.x).toBeGreaterThanOrEqual(a.l)
    expect(b.x + b.width).toBeLessThanOrEqual(a.r + 1)
    expect(b.y).toBeGreaterThanOrEqual(a.t)
    expect(b.y + b.height).toBeLessThanOrEqual(a.b + 1)
    // A docked bar is pinned.
    await expect(page.getByTestId('ob-pin')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
}

test('B4. a docked bar stays after a reload, with nothing selected (box buttons off), and works again on the next box picked', async ({
  page,
}) => {
  const box = await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: (a.l + a.r) / 2, y: a.b - 24 })
  await page.mouse.up()
  await expect(bar(page)).toHaveCount(1)
  await page.waitForTimeout(900)
  await page.reload()
  await expect(bar(page)).toHaveCount(1)
  await expect(page.locator('[data-picked]')).toHaveCount(0)
  // Nothing is selected: the box buttons are off; grip and pin still work.
  for (const n of ['Text colour', 'Size', 'Box actions'])
    await expect(btn(page, n)).toBeDisabled()
  await expect(page.getByTestId('ob-grip')).toBeEnabled()
  await expect(page.getByTestId('ob-pin')).toBeEnabled()
  // A box picked: the same bar, now working on it.
  const again = page.locator(EXTRA).first()
  await pick(page, again)
  await expect(bar(page)).toHaveCount(1)
  await expect(btn(page, 'Size')).toBeEnabled()
  void box
})

test('B5. a pinned bar stays while typing and acts on the box being typed in', async ({
  page,
}) => {
  const box = await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: (a.l + a.r) / 2, y: a.t + 24 })
  await page.mouse.up()
  await expect(bar(page)).toHaveCount(1)
  await page.waitForTimeout(500)
  const r = await rect(words(box))
  await page.mouse.click(r.x + 20, r.y + r.height / 2)
  await page.waitForTimeout(400)
  await page.mouse.click(r.x + 20, r.y + r.height / 2)
  await expect(page.locator('.bn-editor.ProseMirror-focused')).toHaveCount(1)
  await expect(bar(page)).toHaveCount(1)
  await expect(btn(page, 'Bold and italic')).toBeEnabled()
  await btn(page, 'Bold and italic').click()
  await pop(page, 'bi')
    .getByRole('button', { name: 'Bold', exact: true })
    .click()
  // The caret stayed in the box (a tap on the bar does not take it).
  await expect(page.locator('.bn-editor.ProseMirror-focused')).toHaveCount(1)
  await page.keyboard.type('X')
  await expect(
    box.locator('strong, b, [data-style-type="bold"]').last(),
  ).toContainText('X')
})

test('B6. unpin: the bar goes back beside the box', async ({ page }) => {
  const box = await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: (a.l + a.r) / 2, y: a.b - 24 })
  await page.mouse.up()
  await page.getByTestId('ob-pin').click()
  await expect(page.getByTestId('ob-pin')).toHaveCount(0)
  const b = await rect(page.getByTestId('object-bar'))
  const x = await rect(box)
  expect(b.y + b.height).toBeLessThanOrEqual(x.y)
})

test('B7. a docked bar is never past the page, with a strip open, on an upright iPad too', async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1194 })
  await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: a.r - 24, y: (a.t + a.b) / 2 })
  await page.mouse.up()
  await btn(page, 'Text colour').click()
  const p = await rect(pop(page, 'colour'))
  expect(p.x).toBeGreaterThanOrEqual(0)
  expect(p.x + p.width).toBeLessThanOrEqual(834)
  expect(p.y + p.height).toBeLessThanOrEqual(1194)
})

for (const side of ['bottom', 'top', 'left', 'right'] as const) {
  test(`B8. docked ${side}: fully visible, clear of the scroll bar, the zoom pill and the words`, async ({
    page,
  }) => {
    await ready(page, 'Alpha beta', 300)
    const a = await area(page)
    const to = {
      bottom: { x: (a.l + a.r) / 2, y: a.b - 24 },
      top: { x: (a.l + a.r) / 2, y: a.t + 24 },
      left: { x: a.l + 24, y: (a.t + a.b) / 2 },
      right: { x: a.r - 24, y: (a.t + a.b) / 2 },
    }[side]
    await drag(page, to)
    await page.mouse.up()
    await expect(page.locator('[data-pinned-bar]')).toHaveCount(1)
    await page.waitForTimeout(400)
    const vp = page.viewportSize()!
    const b = await rect(page.getByTestId('object-bar'))
    // Fully visible, at least 8 px from the screen edge.
    expect(b.x).toBeGreaterThanOrEqual(8)
    expect(b.y).toBeGreaterThanOrEqual(8)
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width - 8)
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height - 8)
    // Not over the page scroll bar, the zoom pill or any words.
    const over = await page.evaluate((r) => {
      const hit = (q: DOMRect) =>
        r.x < q.right &&
        q.left < r.x + r.width &&
        r.y < q.bottom &&
        q.top < r.y + r.height
      const out: string[] = []
      const sb = document.querySelector('.sbar')
      if (sb && hit(sb.getBoundingClientRect())) out.push('scroll bar')
      const z = document
        .querySelector('[aria-label="Zoom out"]')
        ?.closest('div')
      if (z && hit(z.getBoundingClientRect())) out.push('zoom pill')
      for (const w of document.querySelectorAll(
        '[data-paper-box] .bn-block-content',
      ))
        if (hit(w.getBoundingClientRect())) out.push('words')
      return out
    }, b)
    expect(over).toEqual([])
  })
}

/**
 * Owner's iPad check of 24 Nov (issues #60 to #63): the grip never reaches the
 * text behind it; the bar stays in the page column; it docks on the sides; a
 * new box shows the bar at its pinned place at once.
 */
test('B9. (#62) dragging the grip over the words selects nothing and types nothing', async ({
  page,
}) => {
  const box = await ready(page, 'Alpha beta', 300)
  const before = await words(box).innerText()
  const a = await area(page)
  const w = await rect(words(box))
  await drag(page, { x: w.x + 30, y: w.y + w.height / 2 })
  await expect(page.locator('html')).toHaveAttribute('data-bar-dragging', '')
  await page.mouse.up()
  await expect(page.locator('html')).not.toHaveAttribute('data-bar-dragging')
  const sel = await page.evaluate(() => window.getSelection()?.toString() ?? '')
  expect(sel).toBe('')
  await expect(page.locator('.bn-editor.ProseMirror-focused')).toHaveCount(0)
  await page.keyboard.type('Q')
  expect(await words(box).innerText()).toBe(before)
  void a
})

test('B10. (#60) a panel opening over the page: the bar stays in the page column, never over the panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1194 })
  await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: (a.l + a.r) / 2, y: a.b - 24 })
  await page.mouse.up()
  await expect(bar(page)).toHaveCount(1)
  const side = await openSidebar(page)
  await expect(side).toBeVisible()
  await page.waitForTimeout(600)
  const panel = await rect(side.first())
  const b = await rect(bar(page))
  // Beside the panel or folded back beside its box, never over it.
  const over = b.x < panel.x + panel.width && b.x + b.width > panel.x
  const overY = b.y < panel.y + panel.height && b.y + b.height > panel.y
  expect(over && overY).toBe(false)
})

for (const side of ['left', 'right'] as const) {
  test(`B11. (#61) a finger 80 px from the ${side} edge docks the bar there, upright`, async ({
    page,
  }) => {
    await ready(page, 'Alpha beta', 300)
    const a = await area(page)
    const x = side === 'left' ? a.l + 80 : a.r - 80
    await drag(page, { x, y: (a.t + a.b) / 2 })
    await expect(page.locator(`[data-onebar-zone="${side}"]`)).toHaveClass(
      /is-on/,
    )
    await page.mouse.up()
    const b = await rect(page.getByTestId('object-bar'))
    expect(b.height).toBeGreaterThan(b.width)
    if (side === 'left') expect(b.x).toBeLessThan(a.l + 40)
    else expect(b.x + b.width).toBeGreaterThan(a.r - 40)
  })
}

test('B12. (#63) with the bar pinned, a new box tapped shows the bar at its place at once', async ({
  page,
}) => {
  const first = await ready(page, 'Alpha beta', 300)
  const a = await area(page)
  await drag(page, { x: (a.l + a.r) / 2, y: a.t + 24 })
  await page.mouse.up()
  await expect(bar(page)).toHaveCount(1)
  const placed = await rect(bar(page))
  void first
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const next = await addBox(page, 'Second box', 120)
  await pick(page, next)
  await expect(bar(page)).toHaveCount(1)
  const now = await rect(bar(page))
  expect(Math.abs(now.x - placed.x)).toBeLessThan(2)
  expect(Math.abs(now.y - placed.y)).toBeLessThan(2)
})

test('B13. (#63) unpinned, a new box tapped shows the bar beside it at once', async ({
  page,
}) => {
  await start(page, 'Bar' + Math.random().toString(36).slice(2, 6))
  const box = await addBox(page, 'Alpha', 120)
  await pick(page, box)
  await expect(bar(page)).toHaveCount(1)
  const b = await rect(bar(page))
  expect(b.width).toBeGreaterThan(100)
  expect(b.y).toBeGreaterThanOrEqual(0)
})
