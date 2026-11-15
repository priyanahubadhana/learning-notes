// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Shared by the 2B.5b phone specs: a selected box on a phone-size page. */
export const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
export const rect = async (l: Locator) => (await l.boundingBox())!
export const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
export const dot = (box: Locator, how: string) =>
  box.locator(`[data-resize-handle="${how}"]`)
export const HOW = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export async function phoneBox(
  page: Page,
  name: string,
  lines: string[],
  o: { flag?: boolean; tall?: boolean } = {},
) {
  if (o.flag !== false)
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
  // A long page, so it can scroll.
  if (o.tall) for (let i = 0; i < 45; i++) await page.keyboard.press('Enter')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-paper-sheet]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Add a box here' }).click()
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  for (const [i, l] of lines.entries()) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  // Select it: the first tap on a box selects it.
  const r = await rect(box)
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
  if (o.flag !== false) {
    await expect(box).toHaveAttribute('data-picked', '')
    // The box's bar comes a moment after the tap and, near the bottom of a
    // phone, moves the page up once to make room (BoxBarV2). Wait for the
    // bar and for the box to stand still, as a user's eye would.
    await expect(box.locator('[data-box-bar]')).toBeVisible()
    await expect
      .poll(async () => {
        const a = (await rect(box)).y
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        )
        return Math.abs((await rect(box)).y - a)
      })
      .toBeLessThan(0.5)
  }
  return box
}

export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  o: { hold?: number; up?: boolean } = {},
) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(o.hold ?? 160)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  if (o.up !== false) {
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
}
