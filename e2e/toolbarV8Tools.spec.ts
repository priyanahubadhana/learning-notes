// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  expectStrokes,
  line,
  savedInk,
  stroke,
  textBox,
  type Pt,
} from './inkHelpers.ts'
import {
  createNotebook,
  solidPng,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** Toolbar v8, slice 1d: Eraser, Shapes, Lasso cards and the selection bar (TB-30 to TB-33). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(
  page: Page,
  tool: 'pen' | 'eraser' | 'shapes' | 'lasso',
  level: Level = 'beginner',
  unlocked: string[] = [],
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, unlocked] as const,
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  const direct = page.getByTestId(`v8-tool-${tool}`)
  if (await direct.isVisible()) await direct.click()
  else {
    // A narrow screen folds the tool into the ⋯ list.
    await page.getByTestId('v8-more').click()
    await page.getByTestId(`v8-fold-${tool}`).click()
  }
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-${id}`)
const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)

async function openCard(page: Page, id: string) {
  await chip(page, id).click()
  await expect(card(page, id)).toBeVisible()
}

const stored = (page: Page, key: string) =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:ink.${k}`) ?? '{}'),
    key,
  )

test('TB-30 Beginner Eraser: two types and three sizes, nothing else; a pick closes the card', async ({
  page,
}) => {
  await open(page, 'eraser')
  await openCard(page, 'eraser.mode')
  const tiles = card(page, 'eraser.mode').getByRole('radio')
  await expect(tiles).toHaveCount(2)
  await expect(tiles.nth(0)).toContainText('Standard')
  await expect(tiles.nth(1)).toContainText('Whole stroke')
  await expect(card(page, 'eraser.mode').getByRole('switch')).toHaveCount(0)
  await page.getByTestId('v8-eraser-mode-stroke').click()
  await expect(card(page, 'eraser.mode')).toHaveCount(0)
  expect((await stored(page, 'eraser')).mode).toBe('stroke')
  await openCard(page, 'eraser.size')
  await expect(card(page, 'eraser.size').getByRole('radio')).toHaveCount(3)
  await page.getByTestId('v8-eraser-size-2').click()
  await expect(card(page, 'eraser.size')).toHaveCount(0)
  expect((await stored(page, 'eraser')).size).toBe(2)
})

test('TB-30 Professional Eraser brings back Precise, highlights only, go back after one erase and the size ring', async ({
  page,
}) => {
  await open(page, 'eraser', 'professional', ['tb.eraserOptions'])
  await openCard(page, 'eraser.mode')
  await expect(card(page, 'eraser.mode').getByRole('radio')).toHaveCount(3)
  const sw = card(page, 'eraser.mode').getByRole('switch')
  await expect(sw).toHaveCount(2)
  await sw.nth(0).click()
  await sw.nth(1).click()
  const e = await stored(page, 'eraser')
  expect(e.highlightsOnly).toBe(true)
  expect(e.returnAfter).toBe(true)
  // A Professional card stays open after a pick.
  await page.getByTestId('v8-eraser-mode-precise').click()
  await expect(card(page, 'eraser.mode')).toBeVisible()
  await page.keyboard.press('Escape')
  await openCard(page, 'eraser.size')
  await expect(page.getByTestId('v8-eraser-ring')).toBeVisible()
})

test('TB-31 Shapes has its own slot; the card has sections, no sideways strip; Beginner has no aids', async ({
  page,
}) => {
  await open(page, 'shapes')
  await expect(page.getByTestId('toolbar-v8')).toHaveAttribute(
    'data-tool',
    'shapes',
  )
  // Tapping Shapes makes the pen draw a clean shape.
  expect(['rect', 'line', 'arrow', 'ellipse', 'triangle']).toContain(
    (await stored(page, 'pen')).drawAs,
  )
  await openCard(page, 'shapes.shape')
  const c = card(page, 'shapes.shape')
  await expect(c.getByRole('radio')).toHaveCount(5)
  await expect(c.getByText('Draw as').first()).toBeVisible()
  await expect(c.getByText('Shape help').first()).toBeVisible()
  await expect(c.getByText('Ruler')).toHaveCount(0)
  const wide = await c.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  expect(wide).toBe(false)
  await page.getByTestId('v8-shape-ellipse').click()
  expect((await stored(page, 'pen')).drawAs).toBe('ellipse')
  // The tool stays Shapes (the pen is only how it draws).
  await expect(page.getByTestId('toolbar-v8')).toHaveAttribute(
    'data-tool',
    'shapes',
  )
})

test('TB-31 Professional Shapes adds Ruler, Magnifier and Colour picker; Size and Colour cards open', async ({
  page,
}) => {
  await open(page, 'shapes', 'professional', ['tb.shapesAids'])
  await openCard(page, 'shapes.shape')
  const c = card(page, 'shapes.shape')
  await expect(c.getByText('Ruler')).toBeVisible()
  await expect(c.getByText('Magnifier')).toBeVisible()
  await expect(c.getByLabel('Colour picker')).toBeVisible()
  await page.keyboard.press('Escape')
  await openCard(page, 'shapes.size')
  await expect(
    card(page, 'shapes.size').locator('[data-testid^="v8-pen-size-"]'),
  ).toHaveCount(3)
  await page.keyboard.press('Escape')
  await openCard(page, 'shapes.colour')
  await expect(card(page, 'shapes.colour').getByRole('radio')).toHaveCount(6)
})

test('TB-32 Lasso: shape tiles and the action list; Professional adds what it picks and the menu row', async ({
  page,
}) => {
  await open(page, 'lasso')
  await openCard(page, 'lasso.shape')
  await expect(card(page, 'lasso.shape').getByRole('radio')).toHaveCount(2)
  await page.getByTestId('v8-lasso-shape-rect').click()
  await expect(card(page, 'lasso.shape')).toHaveCount(0)
  expect((await stored(page, 'lasso')).shape).toBe('rect')
  await openCard(page, 'lasso.actions')
  await expect(
    page.getByTestId('v8-lasso-actions').getByRole('listitem'),
  ).toHaveCount(7)
  await expect(card(page, 'lasso.actions').getByRole('switch')).toHaveCount(0)
})

test('TB-32 Professional Lasso lists what it picks and which actions sit in the menu row', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.lassoOptions'])
  await openCard(page, 'lasso.actions')
  const c = card(page, 'lasso.actions')
  await expect(c.getByText('What it picks')).toBeVisible()
  const picks = c.getByTestId('v8-lasso-picks').getByRole('switch')
  await expect(picks).toHaveCount(3)
  await picks.nth(2).click()
  expect((await stored(page, 'lasso')).text).toBe(true)
  await expect(c.getByText('Actions in the menu row')).toBeVisible()
  await expect(c.getByTestId('v8-lasso-row').getByRole('switch')).toHaveCount(
    10,
  )
})

/** Selects the whole line with the keyboard (the Lasso is already the tool). */
async function selectLine(page: Page) {
  await page.getByText('The nucleus holds the DNA').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
}

test('TB-33 a selection shows the bar: Cut, Copy, Paste, Duplicate, Colour, Resize, Delete, then More', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  const bar = page.getByTestId('v8-selbar')
  await expect(bar).toBeVisible()
  const names = await bar
    .getByRole('button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(names).toEqual([
    'Cut',
    'Copy',
    'Paste',
    'Duplicate',
    'Colour',
    'Resize',
    'Delete',
    'More',
  ])
  for (const b of await bar.getByRole('button').all()) {
    const box = (await b.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  const vp = page.viewportSize()!
  const r = (await bar.boundingBox())!
  expect(r.x).toBeGreaterThanOrEqual(0)
  expect(r.x + r.width).toBeLessThanOrEqual(vp.width)
})

test('TB-33 Delete removes the selected words; Beginner More has Deselect only', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  await page.getByTestId('v8-sel-more').click()
  const more = card(page, 'sel.more')
  const items = more.locator('.v8sel-more button')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Deselect')
  await page.keyboard.press('Escape')
  await page.getByTestId('v8-sel-delete').click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
  await expect(page.getByTestId('v8-selbar')).toHaveCount(0)
})

test('TB-33 Professional More adds Convert, Screenshot, Key point, Make card, Summary, Save, Move, Scale, Rotate', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.selectionMenu'])
  await selectLine(page)
  await page.getByTestId('v8-sel-more').click()
  await expect(
    card(page, 'sel.more').locator('.v8sel-more button'),
  ).toHaveCount(10)
})

/** A picture in the page, picked with a tap (the Text tool); returns its image. */
async function pickPicture(page: Page) {
  const png = await solidPng(400, 200)
  await page.locator('.bn-editor').click({ force: true })
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img')
  await expect(img).toBeVisible()
  // A tap in the Lasso only loops; a tap with the Text tool picks the picture.
  await page.getByTestId('v8-tool-text').click()
  await img.click({ force: true })
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
  return img
}

/** The width once a resize animation has stopped (two equal reads in a row). */
async function settledWidth(img: Locator): Promise<number> {
  let last = -1
  await expect
    .poll(async () => {
      // The picture may be redrawn for a moment while Undo runs.
      const w = (await img.boundingBox())?.width ?? -2
      const same = w > 0 && Math.abs(w - last) < 0.5
      last = w
      return same
    })
    .toBe(true)
  return last
}

const PRO_ALL = ['tb.pictureEdit', 'tb.selectionMenu']

test('TB-34 a selected picture offers Edit picture (Professional): crop, turn, straighten, shapes, resize presets', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', PRO_ALL)
  const img = await pickPicture(page)
  await page.getByTestId('v8-sel-picture').click()
  const list = card(page, 'sel.picture')
  await expect(
    list.getByRole('button', { name: 'Crop and rotate' }),
  ).toBeVisible()
  const before = (await img.boundingBox())!.width
  await list.getByRole('button', { name: 'Smaller' }).click()
  await expect
    .poll(async () => (await img.boundingBox())!.width)
    .toBeLessThan(before)
  // The editor behind "Crop and rotate" has turn, straighten and crop shapes.
  await list.getByRole('button', { name: 'Crop and rotate' }).click()
  const sheet = page.getByRole('dialog', { name: 'Edit picture' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Turn right' })).toBeVisible()
  await expect(sheet.getByLabel('Straighten')).toBeVisible()
  await expect(sheet.getByLabel('Crop shape').first()).toBeVisible()
  await sheet.getByRole('button', { name: 'Turn right' }).click()
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await expect
    .poll(async () =>
      img.evaluate(
        (el: HTMLImageElement) => el.naturalHeight > el.naturalWidth,
      ),
    )
    .toBe(true)
})

test('TB-33 Undo and Redo: the picture Resize step from the bar', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', PRO_ALL)
  const img = await pickPicture(page)
  const w0 = (await img.boundingBox())!.width
  await page.getByTestId('v8-sel-picture').click()
  await card(page, 'sel.picture')
    .getByRole('button', { name: 'Smaller' })
    .click()
  const w1 = await settledWidth(img)
  expect(w1).toBeLessThan(w0)
  await page.keyboard.press('Escape')
  await page.getByTestId('v8-undo').click()
  expect(await settledWidth(img)).toBeGreaterThan(w1)
  await page.getByTestId('v8-redo').click()
  expect(Math.abs((await settledWidth(img)) - w1)).toBeLessThan(2)
})

test('TB-33 Undo and Redo: Delete from the bar removes the words, Undo brings them back, Redo removes again', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  await page.getByTestId('v8-sel-delete').click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
  await page.getByTestId('v8-undo').click()
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
  await page.getByTestId('v8-redo').click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
})

test('TB-33 no bar action is dimmed or "soon": on words each one answers in plain words', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', PRO_ALL)
  await selectLine(page)
  await expect(page.locator('[data-coming]')).toHaveCount(0)
  await page.getByTestId('v8-sel-more').click()
  await expect(page.locator('[data-coming]')).toHaveCount(0)
  for (const name of ['Convert', 'Screenshot', 'Move', 'Scale', 'Rotate']) {
    await card(page, 'sel.more')
      .locator('.v8sel-more button', { hasText: name })
      .click()
    await expect(page.getByText('This works on drawings').last()).toBeVisible()
    await page.getByTestId('v8-sel-more').click()
  }
})

/** A drawing under the text, then the Lasso loops it (Pen then Lasso). */
async function lassoInk(page: Page) {
  await open(page, 'pen', 'professional', ['tb.selectionMenu'])
  await page.waitForTimeout(800)
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
  await expectStrokes(page, 1)
  await page.getByTestId('v8-tool-lasso').click()
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const at = y + (now.y - box.y)
  const b = { x: box.x + 20, y: at - 4, width: 280, height: 8 }
  const corners: Pt[] = [
    [b.x - 14, b.y + b.height + 10],
    [b.x - 14, b.y - 8],
    [b.x + b.width + 14, b.y - 8],
    [b.x + b.width + 14, b.y + b.height + 10],
    [b.x - 12, b.y + b.height + 8],
  ]
  await stroke(
    page,
    corners.slice(1).flatMap((c, i) => line(corners[i]!, c, 10)),
  )
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
}

const boxWidth = async (page: Page) =>
  (await page.locator('[data-ink-box]').boundingBox())!.width

test('TB-33 a loop around a drawing shows the new bar, not the old menu; Resize works live and Undo/Redo bring it back', async ({
  page,
}) => {
  await lassoInk(page)
  await expect(page.locator('[data-ink-menu]')).toHaveCount(0)
  await expect(page.locator('[data-coming]')).toHaveCount(0)
  const w0 = await boxWidth(page)
  const pen0 = (await savedInk(page)).strokes[0]!.style.width
  await page.getByTestId('v8-sel-resize').click()
  const c = card(page, 'sel.resize')
  await expect(c).toBeVisible()
  await c.getByRole('button', { name: 'Bigger' }).click()
  // Live: the loop on the page grows at once, the pen width follows.
  await expect.poll(() => boxWidth(page)).toBeGreaterThan(w0 + 20)
  await expect
    .poll(async () => (await savedInk(page)).strokes[0]!.style.width)
    .toBeGreaterThan(pen0 * 1.2)
  await c.getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('v8-undo').click()
  await expect
    .poll(async () => (await savedInk(page)).strokes[0]!.style.width)
    .toBeCloseTo(pen0, 3)
  await page.getByTestId('v8-redo').click()
  await expect
    .poll(async () => (await savedInk(page)).strokes[0]!.style.width)
    .toBeGreaterThan(pen0 * 1.2)
})

test('TB-33 on a drawing: Colour card recolours, Delete removes it, Undo brings it back', async ({
  page,
}) => {
  await lassoInk(page)
  await page.getByTestId('v8-sel-colour').click()
  const c = card(page, 'sel.colour')
  await expect(c).toBeVisible()
  const before = (await savedInk(page)).strokes[0]!.style.colour
  await c.locator('[data-testid^="v8-sel-colour-"]').nth(2).click()
  await expect
    .poll(async () => (await savedInk(page)).strokes[0]!.style.colour)
    .not.toBe(before)
  await page.getByTestId('v8-sel-delete').click()
  await expectStrokes(page, 0)
  await page.getByTestId('v8-undo').click()
  await expectStrokes(page, 1)
})

test('TB-33 Professional ⋯ on a drawing: Rotate, Move, Scale and Screenshot all work', async ({
  page,
}) => {
  await lassoInk(page)
  const pts = async () => (await savedInk(page)).strokes[0]!.pts.join()
  const p0 = await pts()
  await page.getByTestId('v8-sel-more').click()
  const more = card(page, 'sel.more').locator('.v8sel-more')
  await expect(page.locator('[data-coming]')).toHaveCount(0)
  await more.getByRole('button', { name: 'Rotate' }).click()
  await expect.poll(pts).not.toBe(p0)
  const p1 = await pts()
  await page.getByTestId('v8-sel-more').click()
  await more.getByRole('button', { name: 'Move' }).click()
  const mv = card(page, 'sel.move')
  await expect(mv).toBeVisible()
  await mv.getByRole('button', { name: 'Move right' }).click()
  await expect.poll(pts).not.toBe(p1)
  await mv.getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('v8-sel-more').click()
  await more.getByRole('button', { name: 'Scale' }).click()
  await expect(card(page, 'sel.resize')).toBeVisible()
  await card(page, 'sel.resize').getByRole('button', { name: 'Close' }).click()
  const download = page.waitForEvent('download')
  await page.getByTestId('v8-sel-more').click()
  await more.getByRole('button', { name: 'Screenshot' }).click()
  expect((await download).suggestedFilename()).toBe('drawing.png')
})

test('selection bar: icon and word on a wide screen, icons only on a phone', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  const word = page.getByTestId('v8-sel-delete').locator('.v8sel-word')
  await expect(word).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(word).toBeHidden()
})

test('Lasso Actions card (Professional) hangs under its own chip and stays inside the window', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.lassoOptions'])
  await openCard(page, 'lasso.actions')
  const c = (await card(page, 'lasso.actions').boundingBox())!
  const a = (await chip(page, 'lasso.actions').boundingBox())!
  const vp = page.viewportSize()!
  expect(c.y).toBeGreaterThanOrEqual(a.y + a.height)
  expect(c.y + c.height).toBeLessThanOrEqual(vp.height)
})

test('Shapes (Professional): Colour picker is a row in the Tools well and every switch row has the same height', async ({
  page,
}) => {
  await open(page, 'shapes', 'professional', ['tb.shapesAids'])
  await openCard(page, 'shapes.shape')
  const c = card(page, 'shapes.shape')
  await expect(
    c.locator('.pcard-well .pcard-row', { hasText: 'Colour picker' }),
  ).toBeVisible()
  const hs = await c
    .locator('.pcard-well .pcard-row')
    .evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().height)),
    )
  expect(new Set(hs).size).toBe(1)
})

test('phone: the slot that holds Shapes is lit, the open chip keeps its word, the sheet is solid', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'shapes')
  await expect(page.getByTestId('v8-more')).toHaveAttribute(
    'data-active',
    'true',
  )
  await openCard(page, 'shapes.shape')
  await expect(chip(page, 'shapes.shape')).toContainText('Shape')
  const bg = await card(page, 'shapes.shape').evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  )
  expect(bg).not.toMatch(/rgba\(.*,\s*0?\.\d+\)/)
})

test('selected words use the accent tint, not system blue', async ({
  page,
}) => {
  await open(page, 'lasso')
  await selectLine(page)
  const bg = await page
    .locator('.bn-editor')
    .evaluate((el) => getComputedStyle(el, '::selection').backgroundColor)
  expect(bg).not.toBe('rgb(0, 120, 215)')
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
})

const iconClass = (b: Locator) =>
  b
    .locator('svg')
    .first()
    .evaluate((s) => s.getAttribute('class') ?? '')

test('1d gate fixes: Copy uses the Copy page icon, not the clipboard one, in the bar and the Lasso Actions card', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.lassoOptions'])
  await openCard(page, 'lasso.actions')
  const inCard = card(page, 'lasso.actions')
    .getByTestId('v8-lasso-actions')
    .getByRole('listitem')
    .filter({ hasText: 'Copy' })
  expect(await iconClass(inCard)).toContain('lucide-copy')
  expect(await iconClass(inCard)).not.toContain('clipboard')
  await page.getByRole('button', { name: 'Close' }).click()
  await selectLine(page)
  const bar = page.getByTestId('v8-selbar')
  expect(await iconClass(bar.getByTestId('v8-sel-copy'))).toContain(
    'lucide-copy',
  )
})

test('1d gate fixes: Smaller, Half, Bigger and Double each have their own icon', async ({
  page,
}) => {
  await lassoInk(page)
  await page.getByTestId('v8-sel-resize').click()
  const c = card(page, 'sel.resize')
  const names = ['Smaller', 'Bigger', 'Half size', 'Double size']
  const classes = new Set<string>()
  for (const n of names)
    classes.add(await iconClass(c.getByRole('button', { name: n })))
  expect(classes.size).toBe(4)
})

test('1d gate fixes: a tap on the Actions chip leaves no focus ring; the keyboard still gets one', async ({
  page,
}) => {
  await open(page, 'lasso', 'professional', ['tb.lassoOptions'])
  const actions = chip(page, 'lasso.actions')
  await actions.click()
  await expect(card(page, 'lasso.actions')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(actions).toHaveCSS('outline-style', 'none')
  await page.keyboard.press('Shift+Tab')
  await actions.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(actions).toBeFocused()
  await expect(actions).not.toHaveCSS('outline-style', 'none')
})

test('1d gate fixes: iPad portrait Edit picture card never covers the picture; the box tab and ⋯ step aside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await open(page, 'lasso', 'professional', PRO_ALL)
  const img = await pickPicture(page)
  await expect(page.locator('[data-box-grip]')).toBeHidden()
  await expect(page.locator('[data-box-menu]')).toBeHidden()
  await page.getByTestId('v8-sel-picture').click()
  const c = (await card(page, 'sel.picture').boundingBox())!
  const p = (await img.boundingBox())!
  const apart =
    c.x >= p.x + p.width ||
    c.x + c.width <= p.x ||
    c.y >= p.y + p.height ||
    c.y + c.height <= p.y
  expect(apart).toBe(true)
})
