// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'
import { installRealPen } from './realPen.ts'

/**
 * C0-7 (owner, 20 Nov check C0): holding still in a box opens OUR strip after
 * about 0.5 s; a finger may drift about 10 px; a Pencil hold works anywhere in
 * the box, but not within 1 s after writing. Time only with page.clock.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const MENU = '[role="menu"]'

async function setup(page: Page) {
  await installRealPen(page)
  await openNote(page, 'touch')
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const now = Date.now() // typed text is older than the pause below
  await page.clock.install({ time: now })
  await page.clock.pauseAt(now + 2000)
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

/** A finger press that drifts `drift` px right a moment after it lands. */
async function fingerDown(page: Page, at: { x: number; y: number }, drift = 0) {
  await page.evaluate(
    ({ at, drift }) => {
      const el = document.elementFromPoint(at.x, at.y)!
      const make = (name: string, dx: number) =>
        new PointerEvent(name, {
          pointerType: 'touch',
          pointerId: 41,
          clientX: at.x + dx,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      el.dispatchEvent(make('pointerdown', 0))
      if (drift) el.dispatchEvent(make('pointermove', drift))
    },
    { at, drift },
  )
}
const fingerUp = (page: Page) =>
  page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerType: 'touch',
        pointerId: 41,
        bubbles: true,
        isPrimary: true,
      }),
    ),
  )

async function penDown(page: Page, at: { x: number; y: number }) {
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  await page.mouse.move(at.x - 3, at.y - 6)
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
}
async function penUp(page: Page) {
  await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

/** The middle of the empty line under the last line of text. */
async function emptyLinePoint(page: Page) {
  const w = await wordPoint(page)
  await page.mouse.click(w.x, w.y)
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('.bn-block-content')]
    const b = all[all.length - 1].getBoundingClientRect()
    return { x: b.x + 40, y: b.y + b.height / 2 }
  })
}

test('C0-7: a finger hold with 8 px drift opens at about 0.5 s', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await fingerDown(page, p, 8)
  await page.clock.runFor(400)
  await expect(page.locator(MENU)).toHaveCount(0)
  await page.clock.runFor(200)
  await expect(page.locator(MENU)).toBeVisible()
  await fingerUp(page)
})

test('C0-7: a finger drift of 15 px does not open it', async ({ page }) => {
  await setup(page)
  const p = await wordPoint(page)
  await fingerDown(page, p, 15)
  await page.clock.runFor(1500)
  await expect(page.locator(MENU)).toHaveCount(0)
  await fingerUp(page)
})

test('C0-7: a Pencil hold far from the cursor opens it', async ({ page }) => {
  await setup(page)
  const p = await wordPoint(page)
  await page.mouse.click(p.x - 60, p.y) // caret far from where we hold
  await page.clock.runFor(1500) // typed text is older than 1 s
  await penDown(page, { x: p.x + 90, y: p.y })
  await page.clock.runFor(700)
  await expect(page.locator(MENU)).toBeVisible()
  await penUp(page)
})

test('C0-7: a Pencil hold 0.5 s after writing does not open; 1.2 s after does', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await page.mouse.click(p.x, p.y)
  await page.keyboard.type('x')
  await page.clock.runFor(500)
  await penDown(page, p)
  await page.clock.runFor(900)
  await expect(page.locator(MENU)).toHaveCount(0)
  await penUp(page)
  await page.clock.runFor(1200)
  await penDown(page, p)
  await page.clock.runFor(700)
  await expect(page.locator(MENU)).toBeVisible()
  await penUp(page)
})

test('C0-7: an empty box opens the strip with a finger and with the Pencil', async ({
  page,
}) => {
  await setup(page)
  const e = await emptyLinePoint(page)
  await page.clock.runFor(1500) // the Enter above is older than 1 s
  await fingerDown(page, e)
  await page.clock.runFor(700)
  await expect(page.locator(MENU)).toBeVisible()
  await fingerUp(page)
  await page.keyboard.press('Escape')
  await expect(page.locator(MENU)).toHaveCount(0)
  await page.clock.runFor(1500)
  await penDown(page, e)
  await page.clock.runFor(700)
  await expect(page.locator(MENU)).toBeVisible()
  await penUp(page)
})

test('C0-7: a box with text opens the strip with a finger', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await fingerDown(page, p)
  await page.clock.runFor(700)
  await expect(page.locator(MENU)).toBeVisible()
  await expect(
    page.locator(MENU).getByRole('menuitem', { name: 'Paste', exact: true }),
  ).toBeVisible()
  await fingerUp(page)
})

test('C0-7: a tap still places the cursor and a drag opens no strip', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await page.mouse.click(p.x, p.y)
  await expect
    .poll(() =>
      page.evaluate(() =>
        document
          .querySelector('.bn-editor')!
          .contains(window.getSelection()?.anchorNode ?? null),
      ),
    )
    .toBe(true)
  await page.clock.runFor(1500)
  await expect(page.locator(MENU)).toHaveCount(0)
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(p.x + 60, p.y, { steps: 5 })
  await page.clock.runFor(1500)
  await expect(page.locator(MENU)).toHaveCount(0)
  await page.mouse.up()
})

test('C0-7: while the strip is open the page text takes no selection', async ({
  page,
}) => {
  await setup(page)
  const p = await wordPoint(page)
  await fingerDown(page, p)
  await page.clock.runFor(700)
  await expect(page.locator(MENU)).toBeVisible()
  const lock = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.bn-editor')!)
    return s.userSelect === 'none' || s.webkitUserSelect === 'none'
  })
  expect(lock).toBe(true)
  await fingerUp(page)
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('.bn-editor')!.hasAttribute('data-hold-lock'),
      ),
    )
    .toBe(false)
})
