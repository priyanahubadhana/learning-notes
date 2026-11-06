// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, pill, tool } from './mainBarHelpers.ts'

/**
 * Owner bug (real iPad): a FINGER must always work on the bar, pills, menus
 * and the sidebar, also right after Pencil input and when pen and finger
 * alternate. The Pencil is simulated with pen pointer events.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

async function penTapOn(page: Page, label: string) {
  await page.evaluate((name) => {
    const el = document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!
    const r = el.getBoundingClientRect()
    const make = (type: string) =>
      new PointerEvent(type, {
        pointerType: 'pen',
        pointerId: 4,
        clientX: r.x + r.width / 2,
        clientY: r.y + r.height / 2,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
      })
    el.dispatchEvent(make('pointerdown'))
    el.dispatchEvent(make('pointerup'))
  }, label)
}

const finger = async (page: Page, target: ReturnType<Page['locator']>) => {
  const box = (await target.boundingBox())!
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
}

test('finger taps work right after Pencil input, and when pen and finger alternate', async ({
  page,
}) => {
  await openNote(page, 'touch')
  for (let i = 0; i < 3; i++) {
    await penTapOn(page, 'Pen')
    await expect(pill(page, 'pen')).toBeVisible()
    await finger(page, tool(page, 'Highlighter'))
    await expect(pill(page, 'highlighter')).toBeVisible()
    await finger(page, tool(page, 'Eraser'))
    await expect(pill(page, 'eraser')).toBeVisible()
  }
  // A pen touch that never lifts (cancelled) must not stick either.
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Pen"]')!
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 5,
        bubbles: true,
        cancelable: true,
        buttons: 1,
      }),
    )
  })
  await finger(page, tool(page, 'Lasso'))
  await expect(pill(page, 'lasso')).toBeVisible()
})

test('finger taps work on sidebar page rows and Settings after pen input', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await penTapOn(page, 'Pen')
  await finger(page, page.getByRole('button', { name: 'Quiet corner' }))
  await expect(
    page.getByRole('button', { name: /Settings/ }).first(),
  ).toBeVisible()
  await finger(page, page.getByRole('button', { name: /Settings/ }).first())
  await expect(
    page.getByRole('heading', { name: /Settings/ }).first(),
  ).toBeVisible()
})
