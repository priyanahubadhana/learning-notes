// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Bug batch item 19 (10 Nov): press and hold still on text under the Text
 * tool opens our menu (Paste, Select, Select all, Insert; Cut and Copy with
 * a selection). It needs the pointer to stay within about 6 px.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const MENU = '[role="menu"]'

async function setup(page: Page) {
  await openNote(page, 'touch', { 'advanced.holdMenu': 600 })
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
}

const wordPoint = (page: Page) =>
  page.evaluate(() => {
    const w = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 4)
    r.setEnd(n, 9)
    const b = r.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })

/** A press by a touch or Pencil pointer, held `ms`, drifting `drift` px. */
async function press(
  page: Page,
  type: 'touch' | 'pen',
  ms: number,
  drift: number,
) {
  const p = await wordPoint(page)
  await page.evaluate(
    async ({ p, type, ms, drift }) => {
      const el = document.elementFromPoint(p.x, p.y)!
      const make = (name: string, dx: number) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: 41,
          clientX: p.x + dx,
          clientY: p.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      el.dispatchEvent(make('pointerdown', 0))
      if (drift) el.dispatchEvent(make('pointermove', drift))
      await new Promise((r) => setTimeout(r, ms))
    },
    { p, type, ms, drift },
  )
}
const lift = (page: Page) =>
  page.evaluate(() =>
    document.elementFromPoint(5, 5)?.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerType: 'touch',
        pointerId: 41,
        bubbles: true,
        isPrimary: true,
      }),
    ),
  )

test('mouse: holding still opens the menu with Paste, Select, Select all and Insert', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await expect(page.locator(MENU)).toBeVisible({ timeout: 3000 })
  await page.mouse.up()
  for (const name of ['Paste', 'Select', 'Select all', 'Insert'])
    await expect(
      page.locator(MENU).getByRole('menuitem', { name, exact: true }),
    ).toBeVisible()
  await page
    .locator(MENU)
    .getByRole('menuitem', { name: 'Select', exact: true })
    .click()
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toContain('nucleus')
})

test('touch: a still hold opens the menu; a move or a short press does not', async ({
  page,
}) => {
  await setup(page)
  await press(page, 'touch', 1000, 0)
  await expect(page.locator(MENU)).toBeVisible()
  await lift(page)
  await page.keyboard.press('Escape')
  await expect(page.locator(MENU)).toHaveCount(0)
  // Moved 20 px: a drag, no menu.
  await press(page, 'touch', 1000, 20)
  await expect(page.locator(MENU)).toHaveCount(0)
  await lift(page)
  // Released early: no menu.
  await press(page, 'touch', 200, 0)
  await lift(page)
  await page.waitForTimeout(800)
  await expect(page.locator(MENU)).toHaveCount(0)
})

/** Puts the caret on the word (a mouse click), as typing would. */
async function caretOnWord(page: Page) {
  const p = await wordPoint(page)
  await page.mouse.click(p.x, p.y)
  // Text went in a moment ago (the note): the Pencil is "writing" for 3 s.
  await page.waitForTimeout(3200)
  return p
}

test('Pencil: opens only on the caret; elsewhere it is writing and nothing opens (item 5)', async ({
  page,
}) => {
  await setup(page)
  // No caret in the page: a Pencil hold is a Scribble stroke starting.
  await press(page, 'pen', 1100, 0)
  await expect(page.locator(MENU)).toHaveCount(0)
  await lift(page)
  // On the caret: it opens.
  await caretOnWord(page)
  await press(page, 'pen', 1100, 0)
  await expect(page.locator(MENU)).toBeVisible()
  await lift(page)
  await page.keyboard.press('Escape')
  // Far from the caret (another line, ~60 px away): nothing.
  await page.evaluate(() => {
    const el = document.querySelector('.bn-editor') as HTMLElement
    el.focus()
  })
  await caretOnWord(page)
  const p = await wordPoint(page)
  await page.evaluate(
    async ({ p }) => {
      const el = document.elementFromPoint(p.x + 80, p.y)!
      const ev = (n: string) =>
        new PointerEvent(n, {
          pointerType: 'pen',
          pointerId: 41,
          clientX: p.x + 80,
          clientY: p.y,
          bubbles: true,
          isPrimary: true,
        })
      el.dispatchEvent(ev('pointerdown'))
      await new Promise((r) => setTimeout(r, 1000))
    },
    { p },
  )
  await expect(page.locator(MENU)).toHaveCount(0)
  await lift(page)
})

test('a drift beyond ~5 px cancels the hold for that whole stroke, even if it returns (item 5)', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await page.evaluate(
    async ({ p }) => {
      const el = document.elementFromPoint(p.x, p.y)!
      const ev = (n: string, dx: number) =>
        new PointerEvent(n, {
          pointerType: 'touch',
          pointerId: 41,
          clientX: p.x + dx,
          clientY: p.y,
          bubbles: true,
          isPrimary: true,
        })
      el.dispatchEvent(ev('pointerdown', 0))
      el.dispatchEvent(ev('pointermove', 7))
      el.dispatchEvent(ev('pointermove', 0)) // back at the start
      await new Promise((r) => setTimeout(r, 1000))
    },
    { p },
  )
  await expect(page.locator(MENU)).toHaveCount(0)
  await lift(page)
})

test('a small filling ring shows after 0.4 s and lifting cancels (item 6)', async ({
  page,
}) => {
  await openNote(page, 'touch', { 'advanced.holdMenu': 1500 })
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await press(page, 'touch', 700, 0)
  await expect(page.locator('[data-hold-ring]')).toHaveCount(1)
  await expect(page.locator(MENU)).toHaveCount(0)
  await lift(page)
  await expect(page.locator('[data-hold-ring]')).toHaveCount(0)
  await page.waitForTimeout(1500)
  await expect(page.locator(MENU)).toHaveCount(0)
})

test('the default hold is 1.5 s (item 6)', async ({ page }) => {
  await openNote(page, 'touch')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await press(page, 'touch', 1000, 0)
  await expect(page.locator(MENU)).toHaveCount(0)
  await expect(page.locator(MENU)).toBeVisible({ timeout: 1500 })
  await lift(page)
})

test('the menu stays inside the screen near the bottom edge (item 4)', async ({
  page,
}) => {
  await setup(page)
  const vh = page.viewportSize()!.height
  await page.evaluate(
    async ({ vh }) => {
      const el = document.querySelector('.bn-editor') as HTMLElement
      const ev = (n: string) =>
        new PointerEvent(n, {
          pointerType: 'touch',
          pointerId: 41,
          clientX: 300,
          clientY: vh - 20,
          bubbles: true,
          isPrimary: true,
        })
      // A press on the editor's area near the bottom edge.
      el.dispatchEvent(ev('pointerdown'))
      await new Promise((r) => setTimeout(r, 900))
    },
    { vh },
  )
  const menu = page.locator(MENU)
  await expect(menu).toBeVisible()
  const r = (await menu.boundingBox())!
  expect(r.y).toBeGreaterThanOrEqual(0)
  expect(r.y + r.height).toBeLessThanOrEqual(vh)
  await lift(page)
})

test('Pencil: no menu while writing, even on the caret (item 5)', async ({
  page,
}) => {
  await setup(page)
  await caretOnWord(page)
  await page.keyboard.type('x') // text just went in
  const p = await wordPoint(page)
  await page.evaluate(
    async ({ p }) => {
      const el = document.elementFromPoint(p.x, p.y)!
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'pen',
          pointerId: 41,
          clientX: p.x,
          clientY: p.y,
          bubbles: true,
          isPrimary: true,
        }),
      )
      await new Promise((r) => setTimeout(r, 1000))
    },
    { p },
  )
  await expect(page.locator(MENU)).toHaveCount(0)
  await lift(page)
})
