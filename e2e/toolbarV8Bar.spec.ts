// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  selectText,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** Toolbar v8, slice 1b: the tool bar (TB-01 to TB-05, TB-07, TB-09 to TB-11). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((l) => {
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
const bar = (page: Page) => page.getByTestId('v8-bar')

test('TB-01 the bar shows six tools, Undo, Redo, more and Minimise; Beginner icons only', async ({
  page,
}) => {
  await open(page, 'beginner')
  for (const id of ['text', 'pen', 'eraser', 'shapes', 'lasso', 'insert'])
    await expect(tool(page, id)).toBeVisible()
  await expect(page.getByTestId('v8-undo')).toBeVisible()
  await expect(page.getByTestId('v8-redo')).toBeVisible()
  await expect(page.getByTestId('v8-more')).toBeVisible()
  await expect(page.getByTestId('v8-minimise')).toBeVisible()
  await expect(tool(page, 'pen').locator('.v8tool-name')).toHaveCount(0)
  // Every target is at least 44 px.
  for (const el of await bar(page).locator('button').all()) {
    const box = (await el.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(43.5)
    expect(box.height).toBeGreaterThanOrEqual(43.5)
  }
})

test('TB-01 Professional shows the names next to the icons', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 900 })
  await open(page, 'professional')
  await expect(tool(page, 'pen')).toContainText('Pen')
  await expect(tool(page, 'insert')).toContainText('Insert')
})

test('TB-02 holding a Beginner tool shows its name and does not choose it', async ({
  page,
}) => {
  await open(page, 'beginner')
  await expect(tool(page, 'text')).toHaveAttribute('data-active', 'true')
  const box = (await tool(page, 'pen').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(page.getByTestId('v8-tip')).toHaveText('Pen')
  await page.mouse.up()
  await expect(page.getByTestId('v8-tip')).toHaveCount(0)
  await expect(tool(page, 'text')).toHaveAttribute('data-active', 'true')
  await expect(tool(page, 'pen')).not.toHaveAttribute('data-active', 'true')
})

test('TB-03 tapping a tool makes it active and shows its row; nothing opens', async ({
  page,
}) => {
  await open(page, 'beginner')
  await tool(page, 'pen').click()
  await expect(tool(page, 'pen')).toHaveAttribute('data-active', 'true')
  await expect(tool(page, 'text')).not.toHaveAttribute('data-active', 'true')
  await expect(page.getByTestId('v8-row')).toHaveAttribute('data-tool', 'pen')
  await expect(page.getByTestId('v8-chip-pen.type')).toBeVisible()
  await expect(page.getByTestId('pcard')).toHaveCount(0)
})

test('TB-04 tapping the active tool again opens its card and the chevron looks pressed', async ({
  page,
}) => {
  await open(page, 'beginner')
  await tool(page, 'pen').click()
  await tool(page, 'pen').click()
  const card = page.getByTestId('v8-card-pen.type')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-size', 'pick')
  await expect(page.getByTestId('v8-chip-pen.type')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await tool(page, 'pen').click()
  await expect(card).toHaveCount(0)
})

test('TB-05 a second chevron replaces the first card; never two cards', async ({
  page,
}) => {
  await open(page, 'beginner')
  await tool(page, 'pen').click()
  await page.getByTestId('v8-chip-pen.type').click()
  await expect(page.getByTestId('v8-card-pen.type')).toBeVisible()
  await page.getByTestId('v8-chip-pen.feel').click()
  await expect(page.getByTestId('v8-card-pen.feel')).toBeVisible()
  await expect(page.getByTestId('v8-card-pen.feel')).toHaveAttribute(
    'data-size',
    'panel',
  )
  await expect(page.getByTestId('v8-card-pen.type')).toHaveCount(0)
  await expect(page.locator('.pcard')).toHaveCount(1)
})

test('TB-07 tapping the bar keeps the text selection', async ({ page }) => {
  await open(page, 'beginner')
  await selectText(page, 'nucleus')
  await page.getByTestId('v8-chip-text.bold').click()
  const kept = await page.evaluate(() => window.getSelection()!.toString())
  expect(kept).toBe('nucleus')
  await expect(page.locator('.bn-editor strong, .bn-editor b')).toContainText(
    'nucleus',
  )
})

test('TB-09 hold a tool and slide onto another: letting go picks it', async ({
  page,
}) => {
  await open(page, 'beginner')
  const from = (await tool(page, 'text').boundingBox())!
  const to = (await tool(page, 'eraser').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await expect(page.getByTestId('v8-tip')).toBeVisible()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 })
  await expect(page.getByTestId('v8-tip')).toHaveText('Eraser')
  await page.mouse.up()
  await expect(tool(page, 'eraser')).toHaveAttribute('data-active', 'true')
  await expect(page.getByTestId('v8-row')).toHaveAttribute(
    'data-tool',
    'eraser',
  )
})

test('TB-10 Backspace deletes one character on a tap and repeats on a hold', async ({
  page,
}) => {
  await open(page, 'beginner')
  const editor = page.locator('.bn-editor')
  const text = async () => (await editor.innerText()).trim()
  const backspace = page.getByTestId('v8-backspace')
  const box = (await backspace.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.up()
  await expect.poll(text).toBe('The nucleus holds the DN')
  await page.mouse.down()
  await page.waitForTimeout(1200)
  await page.mouse.up()
  const after = await text()
  expect(after.length).toBeLessThan('The nucleus holds the DN'.length - 3)
})

test('TB-11 Backspace and New line sit next to each other; New line adds a line', async ({
  page,
}) => {
  await open(page, 'beginner')
  const a = (await page.getByTestId('v8-backspace').boundingBox())!
  const b = (await page.getByTestId('v8-newline').boundingBox())!
  expect(b.x - (a.x + a.width)).toBeLessThanOrEqual(8)
  const blocks = page.locator('.bn-block-content')
  const before = await blocks.count()
  await page.getByTestId('v8-newline').click()
  await expect(blocks).toHaveCount(before + 1)
})

test('TB-11 holding New line opens heading, checklist and divider; a pick adds that line', async ({
  page,
}) => {
  await open(page, 'beginner')
  const nl = page.getByTestId('v8-newline')
  const box = (await nl.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  const card = page.getByTestId('v8-card-newline.extras')
  await expect(card).toBeVisible()
  await page.mouse.up()
  await expect(card).toBeVisible()
  for (const k of ['heading', 'checklist', 'divider'])
    await expect(page.getByTestId(`v8-fold-${k}`)).toBeVisible()
  await page.getByTestId('v8-fold-checklist').click()
  await expect(card).toHaveCount(0)
  await expect(page.locator('[data-content-type="checkListItem"]')).toHaveCount(
    1,
  )
})

test('the old Options pill does not show when the new bar is on', async ({
  page,
}) => {
  await open(page, 'beginner')
  await page.getByTestId('v8-tool-pen').click()
  await expect(page.getByTestId('v8-row')).toBeVisible()
  await expect(page.locator('[data-options-pill]')).toHaveCount(0)
})

test('TB-06 the first tap outside a card only closes it; the page gets nothing', async ({
  page,
}) => {
  await open(page, 'beginner')
  await page.getByTestId('v8-chip-text.format').click()
  const card = page.getByTestId('v8-card-text.format')
  await expect(card).toBeVisible()
  // Count taps that reach the page content while the card is open.
  await page.evaluate(() => {
    const w = window as unknown as { __hits: number }
    w.__hits = 0
    window.addEventListener(
      'pointerdown',
      (e) => {
        if ((e.target as Element).closest('.bn-editor')) w.__hits += 1
      },
      false,
    )
  })
  const ed = (await page.locator('.bn-block-content').first().boundingBox())!
  await page.mouse.click(ed.x + 40, ed.y + 40)
  await expect(card).toHaveCount(0)
  expect(
    await page.evaluate(() => (window as never as { __hits: number }).__hits),
  ).toBe(0)
  // The next tap reaches the page again.
  await page.mouse.click(ed.x + 40, ed.y + 40)
  expect(
    await page.evaluate(() => (window as never as { __hits: number }).__hits),
  ).toBe(1)
})
