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

for (const type of ['touch', 'pen'] as const) {
  test(`${type}: a still hold opens the menu; a move or a short press does not`, async ({
    page,
  }) => {
    await setup(page)
    await press(page, type, 1000, 0)
    await expect(page.locator(MENU)).toBeVisible()
    await lift(page)
    await page.keyboard.press('Escape')
    await expect(page.locator(MENU)).toHaveCount(0)
    // Moved 20 px: a drag, no menu.
    await press(page, type, 1000, 20)
    await expect(page.locator(MENU)).toHaveCount(0)
    await lift(page)
    // Released early: no menu.
    await press(page, type, 200, 0)
    await lift(page)
    await page.waitForTimeout(800)
    await expect(page.locator(MENU)).toHaveCount(0)
  })
}
