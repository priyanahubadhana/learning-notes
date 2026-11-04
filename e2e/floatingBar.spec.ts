// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * The floating bar ("Floating" position): it appears at once in a visible spot
 * (centred above the bottom edge), is always inside the screen (also after a
 * rotation or with the keyboard open), has a ⠿ handle to drag it with a pen,
 * finger or mouse (it snaps gently to the edges and is remembered), a tip that
 * points at it when chosen, and a Reset. It can never be off-screen.
 */

test.use({ hasTouch: true })

const POS_KEY = 'learning-notes:toolbar.freePos'

async function openPage(page: Page, keys: Record<string, unknown> = {}) {
  await startInMode(page, 'touch')
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem('learning-notes:' + key, JSON.stringify(value))
    }
  }, keys)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const floating = { 'advanced.barPlacement': 'free' }
const handle = (page: Page) => page.locator('[data-bar-handle]')
const box = async (locator: Locator) => (await locator.boundingBox())!

/** The bar is whole and inside the visible screen. */
async function expectOnScreen(page: Page, what: Locator = dockedBar(page)) {
  // The bar is re-placed after a resize, so give it a moment.
  await expect(async () => {
    const b = await box(what)
    const view = page.viewportSize()!
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(view.width + 0.5)
    expect(b.y + b.height).toBeLessThanOrEqual(view.height + 0.5)
  }).toPass()
}

const savedPos = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
    POS_KEY,
  ) as Promise<{ fx: number; fy: number } | null>

/** A drag of the ⠿ handle by a pen (simulated pointer events). */
async function penDragHandle(page: Page, dx: number, dy: number) {
  await page.evaluate(
    ({ dx, dy }) => {
      const el = document.querySelector('[data-bar-handle]') as HTMLElement
      const r = el.getBoundingClientRect()
      const x0 = r.left + r.width / 2
      const y0 = r.top + r.height / 2
      const make = (type: string, x: number, y: number) =>
        new PointerEvent(type, {
          pointerType: 'pen',
          pointerId: 9,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
        })
      el.dispatchEvent(make('pointerdown', x0, y0))
      for (let i = 1; i <= 8; i++) {
        el.dispatchEvent(
          make('pointermove', x0 + (dx * i) / 8, y0 + (dy * i) / 8),
        )
      }
      el.dispatchEvent(make('pointerup', x0 + dx, y0 + dy))
    },
    { dx, dy },
  )
}

for (const [width, height] of [
  [820, 1180],
  [1180, 820],
]) {
  test(`${width}×${height}: Floating shows right away, inside the screen, near the bottom centre`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await openPage(page, floating)
    const bar = dockedBar(page)
    await expect(bar).toBeVisible()
    await expect(bar).toHaveAttribute('data-placement', 'free')
    await expectOnScreen(page)
    const b = await box(bar)
    expect(b.y + b.height).toBeGreaterThan(height - 140)
    expect(Math.abs(b.x + b.width / 2 - width / 2)).toBeLessThan(40)
    await expect(handle(page)).toBeVisible()
    await expect(handle(page)).toHaveAccessibleName(/Move the bar/)
  })
}

test('choosing Floating in Settings shows the bar at once, with a tip pointing at it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: /^Tool bar, / }).click()
  const row = page.locator('[data-setting-id="advanced.barPlacement"]')
  await row.getByRole('button', { name: 'Floating', exact: true }).click()
  // Back on the page the bar floats and the tip is there.
  await page.getByRole('button', { name: 'First', exact: true }).first().click()
  const tip = page.locator('[data-free-tip]')
  await expect(tip).toBeVisible()
  await expect(tip).toHaveText('This bar now floats. Drag ⠿ to move it.')
  await expect(dockedBar(page)).toBeVisible()
  await expectOnScreen(page)
  // The tip is next to the bar (above it, near the bottom of the screen).
  const t = await box(tip)
  const b = await box(dockedBar(page))
  expect(Math.abs(t.y + t.height - b.y)).toBeLessThan(30)
  await page.locator('.bn-editor').click({ position: { x: 5, y: 5 } })
  await expect(tip).toHaveCount(0)
})

test('Edit bar › Position › Floating works the same way', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page)
  await dockedBar(page).locator('[data-action="toolbarMenu"]').click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: 'Edit bar' })
    .click()
  await page.getByLabel('Position').selectOption('free')
  await expect(dockedBar(page)).toHaveAttribute('data-placement', 'free')
  await expectOnScreen(page)
  await expect(page.locator('[data-free-tip]')).toBeVisible()
})

test('drag the ⠿ handle with a pen: it moves, snaps to the edge and is remembered after a reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, floating)
  const before = await box(dockedBar(page))
  await penDragHandle(page, -10, -600) // up, a bit left
  const moved = await box(dockedBar(page))
  expect(moved.y).toBeLessThan(before.y - 400)
  await expectOnScreen(page)
  const saved = await savedPos(page)
  expect(saved).not.toBeNull()
  expect(saved!.fy).toBeLessThan(0.7)
  // Drop near the top edge: it snaps to it.
  await penDragHandle(page, 0, -2000)
  const top = await box(dockedBar(page))
  expect(top.y).toBeLessThanOrEqual(10)
  expect((await savedPos(page))!.fy).toBe(0)
  await page.reload()
  await expect(dockedBar(page)).toBeVisible()
  const after = await box(dockedBar(page))
  expect(Math.abs(after.y - top.y)).toBeLessThan(2)
})

test('drag with a mouse', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await openPage(page, floating)
  const h = await box(handle(page))
  const before = await box(dockedBar(page))
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.width / 2 + 200, h.y - 300, { steps: 8 })
  await page.mouse.up()
  const after = await box(dockedBar(page))
  expect(after.y).toBeLessThan(before.y - 200)
  await expectOnScreen(page)
})

test('keyboard: arrow keys on the handle move the bar; double-tap resets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, floating)
  const before = await box(dockedBar(page))
  await handle(page).focus()
  await page.keyboard.press('Shift+ArrowUp')
  await page.keyboard.press('Shift+ArrowUp')
  const moved = await box(dockedBar(page))
  expect(moved.y).toBeLessThan(before.y - 100)
  await handle(page).dblclick()
  const reset = await box(dockedBar(page))
  expect(Math.abs(reset.y - before.y)).toBeLessThan(2)
})

test('"Reset bar position" in the ⋯ Toolbar menu', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, floating)
  const before = await box(dockedBar(page))
  await penDragHandle(page, 0, -500)
  await dockedBar(page).locator('[data-action="toolbarMenu"]').click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: 'Reset bar position' })
    .click()
  const reset = await box(dockedBar(page))
  expect(Math.abs(reset.y - before.y)).toBeLessThan(2)
})

test('a saved place that is off-screen at load is reset to a visible one', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, { ...floating, 'toolbar.freePos': { fx: 9, fy: -4 } })
  await expect(dockedBar(page)).toBeVisible()
  await expectOnScreen(page)
  // Even a valid but extreme place is held inside the screen.
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ fx: 1, fy: 1 }))
  }, POS_KEY)
  await page.reload()
  await expectOnScreen(page)
})

test('stays inside the screen after a rotation and with the keyboard open (a short window)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, floating)
  await expectOnScreen(page)
  // Rotation.
  await page.setViewportSize({ width: 1180, height: 820 })
  await expect(dockedBar(page)).toBeVisible()
  await expectOnScreen(page)
  // The on-screen keyboard makes the visible screen much shorter.
  await page.setViewportSize({ width: 1180, height: 420 })
  await expect(dockedBar(page)).toBeVisible()
  await expectOnScreen(page)
  // A real visualViewport resize event also re-places it.
  await page.evaluate(() =>
    window.visualViewport?.dispatchEvent(new Event('resize')),
  )
  await expectOnScreen(page)
  await page.setViewportSize({ width: 820, height: 1180 })
  await expectOnScreen(page)
})

test('a floating bar never auto-hides and survives a tap away from the page text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, { ...floating, 'advanced.barAutoHide': 'on' })
  await page.getByRole('textbox', { name: 'Page title' }).click()
  await expect(dockedBar(page)).toBeVisible()
  await expectOnScreen(page)
})

test('floating bar trays (More) open inside the screen too', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, floating)
  await dockedBar(page).locator('[data-action="more"]').first().click()
  const tray = page.locator('[data-bar="tray"]')
  await expect(tray).toBeVisible()
  const t = await box(tray)
  expect(t.y).toBeGreaterThanOrEqual(0)
  expect(t.y + t.height).toBeLessThanOrEqual(1180 + 1)
})
