// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { openNote, pill, tool } from './mainBarHelpers.ts'

/**
 * A1: a Pencil tap on any control does that control's action exactly once,
 * from pointer events alone (iPadOS may send no click), and the browser's own
 * late click right after it is swallowed instead of firing again.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

/** A pen tap with pointer events only (no click). */
async function penTap(page: Page, target: Locator) {
  const box = (await target.boundingBox())!
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.evaluate(
    ({ at }) => {
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 31,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      const el = document.elementFromPoint(at.x, at.y)!
      el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
    },
    { at },
  )
}

test('a pen tap on Lasso and Pen selects each tool once', async ({ page }) => {
  await openNote(page, 'pencil')
  // The fixed Layout button (owner, 11 Nov) pushes the last tools out of view
  // beside an open sidebar; close it so Lasso is in plain view (as below).
  await page.getByRole('button', { name: 'Hide menu' }).first().click()
  await expect(page.locator('aside')).toBeHidden()
  await penTap(page, tool(page, 'Pen'))
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
  await penTap(page, tool(page, 'Lasso'))
  await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'false')
})

test('a pen tap on a toggling control fires once, also with a late real click', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  const insert = tool(page, 'Insert')
  // With the sidebar open the bar scrolls and its edge cue covers the last
  // tool; close the sidebar so every tool is in plain view.
  await page.getByRole('button', { name: 'Hide menu' }).first().click()
  await expect(page.locator('aside')).toBeHidden()
  await penTap(page, insert)
  await expect(pill(page, 'insert')).toBeVisible()
  // The browser's own click comes right after (trusted): swallowed.
  const box = (await insert.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(150)
  await expect(pill(page, 'insert')).toBeVisible()
})

test('a pen tap on the pill ✕ closes it once', async ({ page }) => {
  await openNote(page, 'pencil')
  await tool(page, 'Pen').click()
  await expect(pill(page, 'pen')).toBeVisible()
  await penTap(page, page.locator('[data-pill-close]'))
  await expect(pill(page, 'pen')).toBeHidden()
})

test('a pen tap on a menu item runs it once', async ({ page }) => {
  await openNote(page, 'pencil')
  await penTap(page, page.getByRole('button', { name: 'Toolbar menu' }))
  const item = page.getByRole('button', { name: /bar settings/i }).first()
  await expect(item).toBeVisible()
  await penTap(page, item)
  await expect(page.locator('[data-bar="tray"]').first()).toBeVisible()
  await expect(page.getByText(/reset/i).first()).toBeVisible()
})
