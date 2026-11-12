import { expect, test, type Page } from '@playwright/test'

/**
 * Slice 0h: SH-09 to SH-14 (the shell's sheet, dialog, pop menu, toast,
 * floating bars and chips), shown in the Parts gallery at #/design-tokens.
 */
async function open(page: Page, size?: { width: number; height: number }) {
  // No motion: boxes are measured at once, and the reduced-motion rule is used.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  if (size) await page.setViewportSize(size)
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-shellparts')).toBeAttached()
  await expect(page.getByTestId('shell-said')).toHaveAttribute('data-ready', '')
  // The pen-tap guard ignores clicks inside a toolbar for 700 ms after the page starts.
  await page.waitForFunction(() => performance.now() > 1000)
}

const inTopLayer = (page: Page, testId: string) =>
  page.evaluate((id) => {
    const layer = document
      .querySelector<HTMLElement>('[data-testid="' + id + '"]')
      ?.closest('[popover]')
    return layer?.matches(':popover-open') ?? false
  }, testId)

test('SH-09 the More sheet is a fixed 440 px box on the right', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 800 })
  await page.getByTestId('open-more').click()
  const sheet = page.getByTestId('more-sheet')
  await expect(sheet).toBeVisible()
  const box = await sheet.boundingBox()
  expect(Math.round(box?.width ?? 0)).toBe(440)
  expect(Math.round(box?.y ?? 0)).toBe(12)
  expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(1366 - 12)
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(800 - 12)
  // A tab change does not change the box.
  await page.getByRole('tab', { name: 'Pages' }).click()
  const after = await sheet.boundingBox()
  expect(after?.width).toBe(box?.width)
  expect(after?.height).toBe(box?.height)
})

test('SH-09 only the body scrolls, and a new tab starts at the top', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 700 })
  await page.getByTestId('open-more').click()
  const body = page.getByTestId('more-body')
  await body.evaluate((el) => (el.scrollTop = 200))
  expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
  await page.getByRole('tab', { name: 'Share' }).click()
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBe(0)
  await expect(page.getByTestId('more-done')).toBeInViewport()
})

test('SH-09 Cancel with edits asks "Discard changes?"; Done saves; without edits it just closes', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('open-more').click()
  await page
    .getByTestId('more-sheet')
    .getByRole('button', { name: 'Cancel' })
    .click()
  await expect(page.getByTestId('more-sheet')).toBeHidden()
  await expect(page.getByTestId('shell-said')).toHaveText('Cancelled')
  await page.getByTestId('open-more').click()
  await page.getByTestId('more-field').fill('Chemistry')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Discard changes?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByTestId('more-sheet')).toBeVisible()
  await page
    .getByTestId('more-sheet')
    .getByRole('button', { name: 'Cancel' })
    .click()
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await expect(page.getByTestId('more-sheet')).toBeHidden()
  await page.getByTestId('open-more').click()
  await page.getByTestId('more-done').click()
  await expect(page.getByTestId('shell-said')).toHaveText('Done')
})

test('SH-09 on a phone the sheet is full width, 8 px below the top', async ({
  page,
}) => {
  await open(page, { width: 390, height: 844 })
  await page.getByTestId('open-more').click()
  const box = await page.getByTestId('more-sheet').boundingBox()
  expect(Math.round(box?.x ?? -1)).toBe(0)
  expect(Math.round(box?.width ?? 0)).toBe(390)
  expect(Math.round(box?.y ?? 0)).toBe(8)
})

test('SH-10 a destructive dialog is red, says "You can undo this.", and Esc cancels', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('open-danger').click()
  const dlg = page.getByRole('dialog', { name: 'Delete this page?' })
  await expect(dlg).toBeVisible()
  await expect(dlg.getByText('You can undo this.')).toBeVisible()
  const bg = await dlg
    .getByRole('button', { name: 'Delete' })
    .evaluate((b) => getComputedStyle(b).backgroundColor)
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  const box = await dlg.boundingBox()
  expect(box?.width).toBeLessThanOrEqual(420)
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(page.getByTestId('shell-said')).toHaveText('Kept')
})

test('SH-10 a name dialog focuses its field, Enter confirms, Tab stays inside', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('open-name').click()
  await expect(page.getByTestId('name-field')).toBeFocused()
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true)
  await page.getByTestId('name-field').fill('Genetics')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('shell-said')).toHaveText('Named Genetics')
})

test('SH-11 a pop menu opens by its button, arrows move, Delete is last after a divider', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 800 })
  const btn = page.getByTestId('open-pop')
  await btn.click()
  const menu = page.getByRole('menu', { name: 'Page actions' })
  await expect(menu).toBeVisible()
  const rows = menu.getByRole('menuitem')
  await expect(rows).toHaveText(['Rename', 'Move', 'Delete'])
  await expect(rows.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(rows.nth(1)).toBeFocused()
  expect((await rows.first().boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expect(menu.locator('hr')).toHaveCount(1)
  const b = await btn.boundingBox()
  const m = await menu.boundingBox()
  expect(m?.y ?? 0).toBeGreaterThan((b?.y ?? 0) + (b?.height ?? 0) - 1)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

test('SH-11 near the bottom the menu flips up and stays on screen', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 520 })
  const btn = page.getByTestId('open-pop-low')
  await btn.evaluate((el) => el.scrollIntoView({ block: 'end' }))
  await btn.click()
  const menu = page.getByTestId('shell-pop')
  await expect(menu).toBeVisible()
  const b = await btn.boundingBox()
  const m = await menu.boundingBox()
  expect((m?.y ?? 0) + (m?.height ?? 0)).toBeLessThanOrEqual(520)
  expect(m?.y ?? 0).toBeGreaterThanOrEqual(0)
  if (m && b && b.y + b.height + 4 + m.height > 520 - 8)
    expect(m.y).toBeLessThan(b.y)
})

test('SH-12 a toast with Undo runs Undo and closes; a second replaces the first', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('toast-undo').click()
  const toast = page.getByTestId('shell-toast')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveAttribute('role', 'status')
  expect((await toast.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  await page
    .getByTestId('shell-toast')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(page.getByTestId('shell-said')).toHaveText('Undone')
  await expect(toast).toBeHidden()
  await page.getByTestId('toast-two').click()
  await expect(page.getByTestId('shell-toast')).toHaveCount(1)
  await expect(page.getByTestId('shell-toast')).toHaveText('Second message')
})

test('SH-12 a toast is 24 px above the bottom on a computer and above the tab bar on a phone', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 800 })
  await page.getByTestId('toast-plain').click()
  const wide = await page.getByTestId('shell-toast').boundingBox()
  expect(Math.round(800 - ((wide?.y ?? 0) + (wide?.height ?? 0)))).toBe(24)
  await open(page, { width: 390, height: 844 })
  await page.getByTestId('toast-plain').click()
  const phone = await page.getByTestId('shell-toast').boundingBox()
  expect(844 - ((phone?.y ?? 0) + (phone?.height ?? 0))).toBeGreaterThanOrEqual(
    56 + 24 - 1,
  )
})

test('SH-13 two bars minimise into two stacked chips; each restores only its own; they stay after reload', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 800 })
  await page.getByTestId('open-bars').click()
  await expect(page.getByTestId('floating-bar')).toHaveCount(2)
  await page
    .locator('[data-bar="demo-reader"]')
    .getByTestId('bar-minimise')
    .click()
  await page
    .locator('[data-bar="demo-draw"]')
    .getByTestId('bar-minimise')
    .click()
  const chips = page.getByTestId('minimise-chip')
  await expect(chips).toHaveCount(2)
  const a = await chips.nth(0).boundingBox()
  const b = await chips.nth(1).boundingBox()
  expect((b?.y ?? 0) - ((a?.y ?? 0) + (a?.height ?? 0))).toBeGreaterThanOrEqual(
    7,
  )
  expect(a?.height).toBeGreaterThanOrEqual(44)
  await page.reload()
  await page.getByTestId('open-bars').click()
  await expect(page.getByTestId('minimise-chip')).toHaveCount(2)
  await page.getByTestId('minimise-chip').first().click()
  await expect(page.getByTestId('minimise-chip')).toHaveCount(1)
  await expect(page.getByTestId('floating-bar')).toHaveCount(1)
})

test('SH-13 the edge handle drags, snaps to the nearest side, remembers, and a tap shows the bar', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 800 })
  await page.getByTestId('open-edge').click()
  const handle = page.getByTestId('edge-handle')
  await expect(handle).toHaveAttribute('data-edge', 'right')
  await expect(handle).toHaveAttribute(
    'aria-label',
    'Show Tool bar (drag to move)',
  )
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(300, 500, { steps: 6 })
  await page.mouse.up()
  await expect(handle).toHaveAttribute('data-edge', 'left')
  await expect(page.getByTestId('shell-said')).not.toHaveText('Tool bar shown')
  const moved = (await handle.boundingBox())!
  expect(moved.x).toBeLessThanOrEqual(1)
  expect(Math.round(moved.y + moved.height / 2)).toBeGreaterThan(450)
  await page.reload()
  await page.getByTestId('open-edge').click()
  await expect(page.getByTestId('edge-handle')).toHaveAttribute(
    'data-edge',
    'left',
  )
  await page.getByTestId('edge-handle').click()
  await expect(page.getByTestId('shell-said')).toHaveText('Tool bar shown')
  await expect(page.getByTestId('edge-handle')).toHaveCount(0)
})

test('SH-14 layer order holds: the sheet is above a floating bar, a dialog above the sheet', async ({
  page,
}) => {
  await open(page, { width: 1366, height: 800 })
  await page.getByTestId('open-bars').click()
  await expect(page.getByTestId('floating-bar').first()).toBeVisible()
  await page.getByTestId('open-more').click()
  await expect(page.getByTestId('more-sheet')).toBeVisible()
  const barOnTop = await page.evaluate(() => {
    const r = document
      .querySelector('[data-testid="floating-bar"]')!
      .getBoundingClientRect()
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    )
    return !!hit?.closest('[data-testid="floating-bar"]')
  })
  expect(barOnTop).toBe(false)
  await page.getByTestId('more-field').fill('x')
  await page.keyboard.press('Escape')
  const dlg = page.getByRole('dialog', { name: 'Discard changes?' })
  await expect(dlg).toBeVisible()
  const dlgBox = await dlg.boundingBox()
  const hit = await page.evaluate(
    ([x, y]) => !!document.elementFromPoint(x, y)?.closest('.sh-dialog'),
    [(dlgBox?.x ?? 0) + 20, (dlgBox?.y ?? 0) + 20],
  )
  expect(hit).toBe(true)
  expect(await inTopLayer(page, 'shell-dialog')).toBe(true)
})

test('SH-14 the breakpoints are 640 and 1180 only', async ({ page }) => {
  await page.setViewportSize({ width: 1179, height: 800 })
  await page.goto('/?flags=foundation.shell')
  await expect(page.locator('.sh-frame')).toBeVisible()
  await expect(page.locator('#sidebar')).toBeVisible()
  await page.setViewportSize({ width: 639, height: 800 })
  await expect(page.getByRole('navigation', { name: 'Spaces' })).toBeVisible()
  await page.setViewportSize({ width: 640, height: 800 })
  await expect(page.locator('.sh-wide-only button').first()).toBeVisible()
})
