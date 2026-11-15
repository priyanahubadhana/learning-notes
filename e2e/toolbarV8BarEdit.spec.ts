// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Tool bar v8, 2A.15: editing the bar on the bar itself (Settings v5 S5-22, S5-23). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(
  page: Page,
  level: 'beginner' | 'professional' = 'beginner',
) {
  // Set the level once, so a reload keeps what the test saved.
  await page.addInitScript((l) => {
    if (localStorage.getItem('barEditSeeded')) return
    localStorage.setItem('barEditSeeded', '1')
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
  }, level)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const tool = (page: Page, id: string) => page.getByTestId(`v8-tool-${id}`)
const editBar = (page: Page) => page.getByTestId('v8-edit-bar')
const ids = (page: Page) =>
  page
    .getByTestId('v8-bar')
    .locator('[data-bar-tool]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.barTool))

async function startEditing(page: Page, on = 'pen') {
  const box = (await tool(page, on).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1300)
  await page.mouse.up()
  await expect(editBar(page)).toBeVisible()
}

test('S5-22 touch and hold a tool opens edit mode with the top bar, cancel and done', async ({
  page,
}) => {
  await open(page)
  await expect(editBar(page)).toHaveCount(0)
  await startEditing(page)
  await expect(editBar(page)).toContainText('Editing the tool bar')
  await expect(editBar(page)).toContainText(
    'Drag to move. Tap − to remove. Tools with a lock always stay.',
  )
  await expect(page.getByTestId('v8-edit-cancel')).toBeVisible()
  await expect(page.getByTestId('v8-edit-done')).toBeVisible()
  await expect(page.getByTestId('v8-edit-tray')).toContainText(
    'More tools · tap or drag one up',
  )
  // Holding did not choose a tool, and the tool row is not shown while editing.
  await expect(page.getByTestId('v8-row')).toHaveCount(0)
  await expect(tool(page, 'text')).toHaveAttribute('data-active', 'true')
})

test('S5-22 touch and hold the free space of the bar opens edit mode sooner', async ({
  page,
}) => {
  await open(page)
  const bar = (await page.getByTestId('v8-bar').boundingBox())!
  const more = (await page.getByTestId('v8-more').boundingBox())!
  const undo = (await tool(page, 'insert').boundingBox())!
  // Between the tools and the right-hand buttons there is free space.
  const x = (undo.x + undo.width + more.x) / 2
  await page.mouse.move(x, bar.y + bar.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(800)
  await page.mouse.up()
  await expect(editBar(page)).toBeVisible()
})

test('S5-23 Text, Pen, Eraser, Backspace, New line and More are locked; the others show a minus', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  for (const id of ['text', 'pen', 'eraser', 'backspace', 'newline', 'more']) {
    await expect(page.getByTestId(`v8-edit-lock-${id}`)).toBeVisible()
    await expect(page.getByTestId(`v8-edit-remove-${id}`)).toHaveCount(0)
  }
  for (const id of ['shapes', 'lasso', 'insert'])
    await expect(page.getByTestId(`v8-edit-remove-${id}`)).toBeVisible()
  // The minus is a roomy target that stays inside its own tool's width.
  const box = (await page.getByTestId('v8-edit-remove-shapes').boundingBox())!
  const own = (await tool(page, 'shapes').boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(30)
  expect(box.height).toBeGreaterThanOrEqual(24)
  // It never covers the middle of the tool, where a finger presses to drag.
  expect(box.y + box.height).toBeLessThanOrEqual(own.y + own.height / 2 + 1)
  expect(box.x).toBeGreaterThanOrEqual(own.x - 0.5)
  expect(box.x + box.width).toBeLessThanOrEqual(own.x + own.width + 0.5)
  // A lock says why it is there.
  await expect(page.getByTestId('v8-edit-lock-pen')).toHaveAttribute(
    'aria-label',
    'Pen (always on the tool bar)',
  )
})

test('S5-23 a removed tool waits in More tools; done saves with a toast; it stays after a reload', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-remove-shapes').click()
  await expect(page.getByTestId('v8-edit-tile-shapes')).toBeVisible()
  expect(await ids(page)).not.toContain('shapes')
  await page.getByTestId('v8-edit-done').click()
  await expect(editBar(page)).toHaveCount(0)
  await expect(
    page.getByRole('status').getByText('Tool bar changed on this device'),
  ).toBeVisible()
  await expect(tool(page, 'shapes')).toHaveCount(0)
  await page.reload()
  await expect(tool(page, 'pen')).toBeVisible()
  await expect(tool(page, 'shapes')).toHaveCount(0)
})

test('S5-22 Undo in the toast puts the bar back', async ({ page }) => {
  await open(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-remove-lasso').click()
  await page.getByTestId('v8-edit-done').click()
  await expect(tool(page, 'lasso')).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(tool(page, 'lasso')).toBeVisible()
})

test('S5-23 Highlighter goes on the bar with one tap and Undo takes it off', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-tile-highlighter').click()
  expect(await ids(page)).toContain('highlighter')
  await expect(page.getByTestId('v8-edit-tile-highlighter')).toHaveCount(0)
  await page.getByTestId('v8-edit-done').click()
  await expect(tool(page, 'highlighter')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(tool(page, 'highlighter')).toHaveCount(0)
})

test('S5-23 a tool added with done is still there after a reload', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-tile-highlighter').click()
  await page.getByTestId('v8-edit-done').click()
  await page.reload()
  await expect(tool(page, 'highlighter')).toBeVisible()
})

test('S5-22 cancel keeps the bar as it was', async ({ page }) => {
  await open(page)
  const before = await ids(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-remove-insert').click()
  expect(await ids(page)).not.toContain('insert')
  await page.getByTestId('v8-edit-cancel').click()
  await expect(editBar(page)).toHaveCount(0)
  expect(await ids(page)).toEqual(before)
  await expect(page.getByText('Tool bar changed on this device')).toHaveCount(0)
})

test('S5-22 dragging moves a tool and the others slide aside while the finger is still down', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  const insert = (await tool(page, 'insert').boundingBox())!
  const shapes = (await tool(page, 'shapes').boundingBox())!
  await page.mouse.move(
    insert.x + insert.width * 0.75,
    insert.y + insert.height * 0.75,
  )
  await page.mouse.down()
  await page.mouse.move(shapes.x + 10, shapes.y + shapes.height / 2, {
    steps: 8,
  })
  const live = await ids(page)
  expect(live.indexOf('insert')).toBeLessThan(live.indexOf('shapes'))
  await page.mouse.up()
  await page.getByTestId('v8-edit-done').click()
  const saved = await ids(page)
  expect(saved.indexOf('insert')).toBeLessThan(saved.indexOf('shapes'))
})

test('S5-22 dropping a tool on More tools removes it; a locked tool cannot be dragged out', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  const tray = (await page.getByTestId('v8-edit-tray').boundingBox())!
  const target = { x: tray.x + 40, y: tray.y + 40 }
  for (const [id, gone] of [
    ['pen', false],
    ['lasso', true],
  ] as const) {
    const b = (await tool(page, id).boundingBox())!
    // Press the lower right of the tool: the minus sits on its upper left corner.
    await page.mouse.move(b.x + b.width * 0.75, b.y + b.height * 0.75)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 8 })
    await page.mouse.up()
    await expect(tool(page, id)).toHaveCount(gone ? 0 : 1)
  }
})

test('TB-61 Your layouts stay hidden: no Layout button on the new bar', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByTestId('main-layout')).toHaveCount(0)
})

test('S5-22 Professional: the same edit mode works', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 900 })
  await open(page, 'professional')
  await startEditing(page)
  await page.getByTestId('v8-edit-remove-lasso').click()
  await page.getByTestId('v8-edit-done').click()
  await expect(tool(page, 'lasso')).toHaveCount(0)
})

test('S5-22 phone: edit mode fits; Shapes and Insert sit inside More, with a note', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await open(page)
  await startEditing(page)
  await expect(page.getByTestId('v8-edit-tray')).toBeVisible()
  await expect(tool(page, 'shapes')).toHaveCount(0)
  await expect(tool(page, 'insert')).toHaveCount(0)
  await expect(page.getByTestId('v8-edit-phone-note')).toContainText(
    'Shapes, Insert sit inside ⋯ More.',
  )
  const w = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(w).toBeLessThanOrEqual(391)
})

test('S5-23 every tool of the old list can be added: All tools, grouped and scrollable', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-all').click()
  const list = page.getByTestId('v8-edit-all-list')
  await expect(list).toBeVisible()
  expect(await list.locator('[data-edit-id]').count()).toBeGreaterThan(30)
  await page.getByTestId('v8-edit-tile-bold').scrollIntoViewIfNeeded()
  await page.getByTestId('v8-edit-tile-bold').click()
  expect(await ids(page)).toContain('bold')
  await page.getByTestId('v8-edit-done').click()
  await expect(tool(page, 'bold')).toBeVisible()
})

test('S5-22 Reset to default asks first, then puts the standard bar back, with Undo', async ({
  page,
}) => {
  await open(page)
  await startEditing(page)
  await page.getByTestId('v8-edit-tile-highlighter').click()
  await page.getByTestId('v8-edit-remove-lasso').click()
  await page.getByTestId('v8-edit-done').click()
  await expect(tool(page, 'highlighter')).toBeVisible()
  await startEditing(page)
  await page.getByTestId('v8-edit-reset').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(tool(page, 'highlighter')).toBeVisible()
  await page.getByTestId('v8-edit-reset').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click()
  await expect(editBar(page)).toHaveCount(0)
  await expect(tool(page, 'highlighter')).toHaveCount(0)
  await expect(tool(page, 'lasso')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(tool(page, 'highlighter')).toBeVisible()
  await expect(tool(page, 'lasso')).toHaveCount(0)
})
