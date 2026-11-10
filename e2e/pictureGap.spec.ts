// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  openRibbon,
  solidPng,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Bug batch item 22 (10 Nov), builder B: the placement preview opens a real
 * gap in the text, splits a line like a caret, drags smoothly with edge
 * auto-scroll, stays inside the page area and never commits by itself.
 */
test.use({ viewport: { width: 1000, height: 1000 }, hasTouch: true })

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
  'base64',
)

async function openPage(page: Page, text = 'The nucleus holds the DNA') {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, text)
}

async function chooseFile(page: Page, buffer: Buffer = PNG) {
  const menu = page.getByRole('button', { name: 'Toolbar menu' })
  if (await menu.isVisible()) await openRibbon(page)
  const insert = dockedBar(page)
    .getByRole('tablist', { name: 'Tool tabs' })
    .getByRole('tab', { name: 'Insert', exact: true })
  const panel = dockedBar(page).getByRole('tabpanel')
  const onInsert = (await insert.getAttribute('aria-selected')) === 'true'
  if (!onInsert || !(await panel.isVisible())) await insert.click()
  await dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'Picture', exact: true })
    .click()
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer,
  })
  await expect(page.locator('[data-picture-preview]')).toBeVisible()
}

const blocks = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.bn-editor .bn-block-content')).map(
      (el) =>
        el.getAttribute('data-content-type') === 'image'
          ? '[img]'
          : (el.textContent ?? '').trim(),
    ),
  )

test('a gap opens in the text for the preview; the cross closes it', async ({
  page,
}) => {
  await openPage(page)
  await chooseFile(page)
  const gap = page.locator('.bn-editor [data-place-gap]')
  await expect(gap).toHaveCount(1)
  const p = (await page.locator('[data-picture-preview]').boundingBox())!
  const g = (await gap.boundingBox())!
  expect(Math.abs(g.height - (p.height + 8))).toBeLessThan(2)
  // Nothing else happens by itself.
  await page.waitForTimeout(1200)
  await expect(gap).toHaveCount(1)
  expect(await blocks(page)).toEqual(['The nucleus holds the DNA'])
  await page.getByRole('button', { name: 'Cancel picture' }).click()
  await expect(gap).toHaveCount(0)
  expect(await blocks(page)).toEqual(['The nucleus holds the DNA'])
})

test('placing in the middle of a line splits it like a caret; one Undo joins it', async ({
  page,
}) => {
  await openPage(page)
  await page.keyboard.press('Home')
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
  await chooseFile(page)
  await page.getByRole('button', { name: 'Place picture' }).click()
  await expect
    .poll(() => blocks(page))
    .toEqual(['The', '[img]', 'nucleus holds the DNA'])
})

test('dragging: stays in the page area, scrolls near the edge, commits nothing', async ({
  page,
}) => {
  await openPage(page, 'Top line')
  await page.keyboard.press('End')
  for (let i = 0; i < 70; i++) await page.keyboard.press('Enter')
  await page.keyboard.type('Last line')
  await page.keyboard.press('Control+Home')
  await chooseFile(page)
  const scroller = page.locator('[data-page-scroller]')
  const sc = (await scroller.boundingBox())!
  const pv = page.locator('[data-picture-preview]')
  const b = (await pv.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  // Over the top bar: the preview stays inside the page area.
  await page.mouse.move(b.x + b.width / 2, 2, { steps: 6 })
  await page.waitForTimeout(150)
  const top = (await pv.boundingBox())!
  expect(top.y).toBeGreaterThanOrEqual(sc.y)
  // Near the bottom edge: the page scrolls by itself.
  const before = await scroller.evaluate((el) => el.scrollTop)
  await page.mouse.move(b.x + b.width / 2, sc.y + sc.height - 8, { steps: 8 })
  await page.waitForTimeout(700)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(
    before + 50,
  )
  const low = (await pv.boundingBox())!
  expect(low.y + low.height).toBeLessThanOrEqual(sc.y + sc.height)
  await page.mouse.up()
  // Still not placed: only the tick does that.
  await page.waitForTimeout(600)
  await expect(pv).toBeVisible()
  expect((await blocks(page)).filter((x) => x === '[img]')).toHaveLength(0)
})

test('a tall picture stops at the largest size for one page, with a hint', async ({
  page,
}) => {
  await openPage(page)
  await chooseFile(page, await solidPng(100, 400))
  const pv = page.locator('[data-picture-preview]')
  const h = (await page.locator('[data-preview-handle="se"]').boundingBox())!
  const x = h.x + h.width / 2
  const y = h.y + h.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 400, y, { steps: 8 })
  await page.mouse.up()
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const b = (await pv.boundingBox())!
  // Never taller than one sheet (less its margins), never wider than the page.
  expect(b.height).toBeLessThan(sheet.height)
  expect(b.height).toBeGreaterThan(sheet.height * 0.6)
  await expect(page.locator('[data-size-hint]')).toContainText(
    'Largest size for one page',
  )
})
