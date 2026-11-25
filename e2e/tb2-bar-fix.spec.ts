// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { installRealPen, realPen, realPenTaps } from './realPen.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Box bar fixes #61, #62, #63 at 834x1194 (iPad upright) with real Pencil input.
 * (Setup copied from tb2-bar-b.spec.ts.) Original header, part A (switch textbox.v2 ON): the ONE bar of a selected
 * box (owner, 18 Nov 2026: docs/design/owner-decisions.md "Selected box: one
 * bar like Goodnotes" and "Box-bar mock APPROVED"; mock
 * docs/mockups/box-bar/index.html, "We will prove" and "Must never happen").
 * Moving, docking and pinning the bar is part B and is not tested here.
 */
test.use({
  viewport: { width: 834, height: 1194 },
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
  await expect(boxes.nth(before)).toContainText(text)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await expect(boxes.nth(before).locator('.bn-editor')).not.toBeFocused()
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
const area = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('main')!.getBoundingClientRect()
    return { l: r.left, t: r.top, r: r.right, b: r.bottom }
  })
const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

async function ready(page: Page) {
  await installRealPen(page)
  await start(page, 'Fix' + Math.random().toString(36).slice(2, 6))
  const box = await addBox(page, 'Alpha beta', 300)
  await pick(page, box)
  await expect(bar(page)).toHaveCount(1)
  return box
}

for (const side of ['right', 'left'] as const) {
  test(`F61. (#61) a Pencil drags the grip toward the ${side} as far as the bar can go, lets go: the bar docks ${side}, upright`, async ({
    page,
  }) => {
    await ready(page)
    const a = await area(page)
    const g = await centre(page.getByTestId('ob-grip'))
    // The grip sits at the bar's left end. A finger on it travels only as far
    // as the bar can move: the bar's leading edge reaches the page edge first.
    const toX = side === 'right' ? g.x + 26 : g.x - 40
    await realPen(page, [g, { x: toX, y: g.y }], 8)
    const b = await rect(page.getByTestId('object-bar'))
    expect(b.height).toBeGreaterThan(b.width)
    if (side === 'left') expect(b.x).toBeLessThan(a.l + 40)
    else expect(b.x + b.width).toBeGreaterThan(a.r - 40)
  })
}

test('F61v. (#61) the page-wide bar dragged straight down 150 px stays free and lying', async ({
  page,
}) => {
  await ready(page)
  const g = await centre(page.getByTestId('ob-grip'))
  await realPen(page, [g, { x: g.x, y: g.y + 150 }], 8)
  const b = await rect(page.getByTestId('object-bar'))
  expect(b.width).toBeGreaterThan(b.height)
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('F63. (#63) the bar beside a selected box has the pin from its first show, not pressed; a Pencil tap pins it and changes nothing else; a second tap unpins', async ({
  page,
}) => {
  const box = await ready(page)
  const pin = page.getByTestId('ob-pin')
  await expect(pin).toBeVisible()
  await expect(pin).toHaveAttribute('aria-pressed', 'false')
  const before = await rect(page.getByTestId('object-bar'))
  // Where the bar stands against its box. The first real Pencil touch switches
  // the page to Pencil mode, whose toolbar is a few px taller on some machines
  // (CI WebKit: 7 px), so the whole page can move; the bar must keep its place
  // beside the box, not on the screen.
  const gapBefore = before.y - (await rect(box)).y
  await realPenTaps(page, await centre(pin), [{ hold: 60 }])
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // The bar settles where it was (a slow machine moves it a moment later): wait for it.
  await expect
    .poll(async () => {
      const pinned = await rect(page.getByTestId('object-bar'))
      return (
        Math.abs(pinned.x - before.x) <= 2 &&
        Math.abs(pinned.y - before.y) <= 2 &&
        Math.abs(pinned.width - before.width) <= 1
      )
    })
    .toBe(true)
  await expect(box).toHaveAttribute('data-picked', '')
  await realPenTaps(page, await centre(page.getByTestId('ob-pin')), [
    { hold: 60 },
  ])
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect
    .poll(async () => {
      const back = await rect(page.getByTestId('object-bar'))
      const gap = back.y - (await rect(box)).y
      return Math.abs(back.x - before.x) <= 2 && Math.abs(gap - gapBefore) <= 2
    })
    .toBe(true)
  await expect(box).toHaveAttribute('data-picked', '')
})

/** The bar moved down a little, away from every edge: free, not pinned. */
async function movedFree(page: Page) {
  const box = await ready(page)
  const g = await centre(page.getByTestId('ob-grip'))
  await realPen(page, [g, { x: g.x, y: g.y + 120 }], 8)
  const pin = page.getByTestId('ob-pin')
  await expect(pin).toBeVisible()
  await expect(pin).toHaveAttribute('aria-pressed', 'false')
  return { box, pin }
}

test('F62. (#62) a Pencil tap on the pin of a moved, unpinned bar pins it and the box stays selected', async ({
  page,
}) => {
  const { box, pin } = await movedFree(page)
  // The tap comes inside the page shield that follows a drop (450 ms).
  await realPenTaps(page, await centre(pin), [{ hold: 60 }])
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(box).toHaveAttribute('data-picked', '')
})

test('F62b. (#62) the same tap after the shield is over', async ({ page }) => {
  const { box, pin } = await movedFree(page)
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-bar-dragging',
    '',
  )
  await realPenTaps(page, await centre(pin), [{ hold: 60 }])
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(box).toHaveAttribute('data-picked', '')
})

test('F62c. (#62) a press whose lift never comes does not freeze the page: it takes input within 2.5 s of a drop', async ({
  page,
}) => {
  await movedFree(page)
  // A press the page never sees end (a right-click whose menu ate the lift).
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 77,
        bubbles: true,
        composed: true,
      }),
    ),
  )
  const g = await centre(page.getByTestId('ob-grip'))
  await realPen(page, [g, { x: g.x, y: g.y + 60 }], 8)
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-bar-dragging',
    '',
    { timeout: 2500 },
  )
})

/** What the v8 tool bar does when it loads (applyLayerVars, src/app/overlay/layers.ts): --z-bar becomes 100. */
const v8Layers = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement.style
    const layers = { bar: 100, pill: 200, menu: 300, card: 400, sheet: 500 }
    for (const [k, v] of Object.entries(layers))
      root.setProperty('--z-' + k, String(v))
  })

/** The stacking number an element paints with (its own, or the nearest ancestor's that has one). */
const layerOf = (page: Page, sel: string) =>
  page.evaluate((q) => {
    for (let el = document.querySelector(q); el; el = el.parentElement) {
      const z = parseInt(getComputedStyle(el).zIndex, 10)
      if (!Number.isNaN(z)) return z
    }
    return -1
  }, sel)

test('F62d. (layers) a moved bar lies under the notebooks drawer and above the page, also with the v8 tool bar layers', async ({
  page,
}) => {
  await movedFree(page)
  await v8Layers(page)
  const bar = await layerOf(page, 'body > [data-box-bar]')
  // The shell layers that never move (tokens.css, index.css).
  const token = (n: string) =>
    page.evaluate(
      (v) =>
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(v),
          10,
        ),
      n,
    )
  const under = Math.min(
    await token('--z-mini'),
    await token('--z-drawer-scrim'),
    await token('--z-pop'),
    await token('--z-tagpick'),
  )
  const text = await layerOf(
    page,
    '[data-paper-box]:not([data-paper-box="main"])',
  )
  expect(bar).toBeGreaterThan(text)
  expect(bar).toBeLessThan(under)
})

test('F62e. (layers) the bar menu lies over the moved bar', async ({
  page,
}) => {
  await movedFree(page)
  await v8Layers(page)
  await page
    .getByTestId('object-bar')
    .getByRole('button', { name: 'Box actions' })
    .click()
  const menu = page.getByRole('menu', { name: 'Box actions' })
  await expect(menu).toBeVisible()
  const m = await rect(menu)
  const top = await page.evaluate(
    ([x, y]) => !!document.elementFromPoint(x, y)?.closest('[role="menu"]'),
    [m.x + m.width / 2, m.y + 12],
  )
  expect(top).toBe(true)
  expect(await layerOf(page, '[role="menu"]')).toBeGreaterThan(
    await layerOf(page, 'body > [data-box-bar]'),
  )
})
