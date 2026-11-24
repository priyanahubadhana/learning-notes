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
    const barBox = await rect(page.getByTestId('object-bar'))
    // The grip sits at the bar's left end. A finger on it travels only as far
    // as the bar can move: the bar's leading edge reaches the page edge first.
    const toX =
      side === 'right'
        ? Math.min(a.r - 75, g.x + (a.r - 8 - (barBox.x + barBox.width)))
        : g.x - 40
    await realPen(page, [g, { x: toX, y: g.y }], 8)
    const b = await rect(page.getByTestId('object-bar'))
    expect(b.height).toBeGreaterThan(b.width)
    if (side === 'left') expect(b.x).toBeLessThan(a.l + 40)
    else expect(b.x + b.width).toBeGreaterThan(a.r - 40)
  })
}

test('F63. (#63) the bar beside a selected box has the pin from its first show, not pressed; a Pencil tap pins it', async ({
  page,
}) => {
  await ready(page)
  const pin = page.getByTestId('ob-pin')
  await expect(pin).toBeVisible()
  await expect(pin).toHaveAttribute('aria-pressed', 'false')
  await realPenTaps(page, await centre(pin), [{ hold: 60 }])
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('F62. (#62, red test only) a Pencil tap on the pin of a moved, unpinned bar pins it and the box stays selected', async ({
  page,
}) => {
  const box = await ready(page)
  const a = await area(page)
  const g = await centre(page.getByTestId('ob-grip'))
  // A free move down, away from every edge (the grip of a page-wide bar starts inside the left zone: 20 px right takes it out): not a dock, so not pinned.
  await realPen(page, [g, { x: g.x + 20, y: (g.y + a.b) / 2 - 100 }], 8)
  const pin = page.getByTestId('ob-pin')
  await expect(pin).toBeVisible()
  await expect(pin).toHaveAttribute('aria-pressed', 'false')
  // What the tip sends, and where it lands.
  await page.evaluate(() => {
    const w = window as unknown as { __log: string[] }
    w.__log = []
    for (const type of ['pointerdown', 'pointerup', 'click'])
      document.addEventListener(
        type,
        (e) => {
          const t = e.target as Element
          w.__log.push(
            `${type}:${(e as PointerEvent).pointerType ?? ''}:${t.tagName}.${
              t.getAttribute('data-testid') ?? String(t.className)
            }`,
          )
        },
        true,
      )
  })
  await realPenTaps(page, await centre(pin), [{ hold: 60 }])
  await page.waitForTimeout(300)
  console.log(
    'F62 targets:',
    JSON.stringify(
      await page.evaluate(
        () => (window as unknown as { __log: string[] }).__log,
      ),
    ),
  )
  await expect(page.getByTestId('ob-pin')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(box).toHaveAttribute('data-picked', '')
})
