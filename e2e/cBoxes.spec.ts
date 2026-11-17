// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  EXTRA,
  HOW,
  addBox,
  centre,
  columns,
  ring,
  drag,
  pick,
  rect,
  rects,
  tapTextEnd,
  start,
  styleMain,
  tapOut,
  twoBoxes,
} from './cBoxesHelpers.ts'
import { lassoAround } from './groupHelpers.ts'
import { card, openNote, openPill, option } from './mainBarHelpers.ts'

/**
 * The text box fixes of the owner's iPad test, 16 Nov 2026 (switch
 * textbox.v2 ON): C8 Delete box, C10 typing pauses and comes back, C11 the
 * three box states, C12 the frame matches the fill, C13 every dot of a row
 * works, C15 every dot of a column works, C16 one selected box at a time.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const dots = (box: Locator) => box.locator('[data-resize-handle]')
const typed = (page: Page) =>
  page.evaluate(
    () => !!document.activeElement?.closest('[data-paper-box] .bn-editor'),
  )

/** A box with "Hello world", the caret after "Hello", then one tap outside (selected). */
async function caretBox(page: Page, name: string) {
  await start(page, name)
  const box = await addBox(page, ['Hello world'])
  await pick(page, box)
  await tapTextEnd(page, box)
  await expect(box.locator('.bn-editor')).toBeFocused()
  // The caret goes to offset 5 (after "Hello"), checked, not assumed.
  for (let i = 0; i < 10; i++) {
    const at = await page.evaluate(() => getSelection()?.anchorOffset ?? -1)
    if (at === 5) break
    await page.keyboard.press(at > 5 ? 'ArrowLeft' : 'ArrowRight')
  }
  expect(await page.evaluate(() => getSelection()?.anchorOffset)).toBe(5)
  await expect(box).toHaveAttribute('data-typing', '')
  await tapOut(page)
  await expect(box.locator('.bn-editor')).not.toBeFocused()
  await expect(box).toHaveAttribute('data-picked', '')
  return box
}

test('C8 Delete box on a box with a list removes the whole box; one Undo brings it all back', async ({
  page,
}) => {
  await start(page, 'C8a')
  const box = await addBox(page, ['- first', 'second', '1. one'])
  await pick(page, box)
  await page
    .locator('[data-box-bar]')
    .getByRole('button', { name: 'Delete box' })
    .click()
  await expect(page.locator(EXTRA)).toHaveCount(0)
  await page
    .locator('[data-toast]')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA)).toContainText('second')
})

test('C8 Delete box on the first box of the page empties it; one Undo brings the text back', async ({
  page,
}) => {
  await start(page, 'C8b', false)
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  await page.keyboard.type('Alpha')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Beta')
  await page.waitForTimeout(900)
  const more = await centre(page.locator('[data-main-chrome] button').last())
  await page.mouse.click(more.x, more.y)
  await page.getByRole('menuitem', { name: 'Delete box' }).click()
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Alpha',
  )
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Beta',
  )
  await page
    .locator('[data-toast]')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(page.locator('[data-paper-box="main"]')).toContainText('Alpha')
  await expect(page.locator('[data-paper-box="main"]')).toContainText('Beta')
})

test('C8 Delete box on a styled first box also resets its fill; one Undo brings text and fill back', async ({
  page,
}) => {
  await start(page, 'C8c', false)
  await styleMain(page, 'C8c')
  const main = page.locator('[data-paper-box="main"]')
  const fill = () => main.evaluate((el) => getComputedStyle(el).backgroundColor)
  await main.locator('.bn-editor').click()
  await page.keyboard.type('Alpha')
  await page.waitForTimeout(900)
  const styled = await fill()
  expect(styled).not.toBe('rgba(0, 0, 0, 0)')
  const more = await centre(page.locator('[data-main-chrome] button').last())
  await page.mouse.click(more.x, more.y)
  await page.getByRole('menuitem', { name: 'Delete box' }).click()
  await expect(main).not.toContainText('Alpha')
  await expect.poll(fill).toBe('rgba(0, 0, 0, 0)')
  await page
    .locator('[data-toast]')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(main).toContainText('Alpha')
  await expect.poll(fill).toBe(styled)
})

test('C11 a tap on a box frame or its ≡ tab never moves it and shows no "Box moved" toast', async ({
  page,
}) => {
  await start(page, 'C11tap')
  const box = await addBox(page, ['Tap me'])
  const before = await rect(box)
  await pick(page, box)
  const g = await centre(box.locator('[data-box-grip]'))
  await page.mouse.click(g.x, g.y)
  await page.waitForTimeout(700)
  await expect(page.locator('[data-toast]')).toHaveCount(0)
  const after = await rect(box)
  expect(
    Math.abs(after.x - before.x) + Math.abs(after.y - before.y),
  ).toBeLessThan(1.5)
})

test('C11 typing hides the ⠿ and + beside the box', async ({ page }) => {
  await start(page, 'C11side')
  const box = await addBox(page, ['Side menu'])
  await pick(page, box)
  await tapTextEnd(page, box)
  await expect(box).toHaveAttribute('data-typing', '')
  await page.keyboard.type(' more')
  await page.waitForTimeout(500)
  await expect(box.locator('.bn-side-menu:visible')).toHaveCount(0)
})

test('C13 the left dot of the first box moves its LEFT edge with the finger; the right edge stays; the room stays empty', async ({
  page,
}) => {
  await start(page, 'C13w')
  const { a, b } = await twoBoxes(page)
  await pick(page, a)
  const a0 = await rect(a)
  const b0 = await rect(b)
  const p = await centre(ring(a, 'w'))
  await drag(page, p, { x: p.x + 60, y: p.y })
  const a1 = await rect(a)
  expect(a1.x - a0.x).toBeGreaterThan(50)
  expect(a1.x - a0.x).toBeLessThan(70)
  expect(Math.abs(a1.x + a1.width - (a0.x + a0.width))).toBeLessThan(2)
  expect(Math.abs((await rect(b)).x - b0.x)).toBeLessThan(4)
  expect(Math.abs((await rect(b)).width - b0.width)).toBeLessThan(4)
  // Back out again: the left edge follows the finger the other way.
  const p1 = await centre(ring(a, 'w'))
  await drag(page, p1, { x: p1.x - 60, y: p1.y })
  expect(Math.abs((await rect(a)).x - a0.x)).toBeLessThan(3)
  // It stays after a reload.
  await drag(page, await centre(ring(a, 'w')), { x: p.x + 60, y: p.y })
  await page.waitForTimeout(900)
  await page.reload()
  await page.waitForTimeout(1500)
  const again = await rect(page.locator(EXTRA).first())
  expect(again.x - a0.x).toBeGreaterThan(40)
})

test('C13 the left dot of a lone box moves its left edge with the finger', async ({
  page,
}) => {
  await start(page, 'C13lone')
  const a = await addBox(page, ['Alone'])
  await pick(page, a)
  // A box as wide as its text is first made wider, so its left edge has room.
  const e = await centre(ring(a, 'e'))
  await drag(page, e, { x: e.x + 200, y: e.y })
  await pick(page, a)
  const a0 = await rect(a)
  const p = await centre(ring(a, 'w'))
  await drag(page, p, { x: p.x + 50, y: p.y })
  const a1 = await rect(a)
  expect(a1.x - a0.x).toBeGreaterThan(40)
  expect(Math.abs(a1.x + a1.width - (a0.x + a0.width))).toBeLessThan(3)
})

test('C10 a resize drag puts the caret away; at the lift it is back exactly where it was', async ({
  page,
}) => {
  const box = await caretBox(page, 'C10a')
  const s = await centre(ring(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 40 }, { up: false })
  expect(await typed(page)).toBe(false)
  await page.keyboard.type('Q')
  await page.mouse.up()
  await page.waitForTimeout(500)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('X')
  await expect(box.locator('.bn-editor')).toContainText('HelloX world')
  await expect(box.locator('.bn-editor')).not.toContainText('Q')
})

test('C10 a card pauses typing (keys go nowhere); closing it puts the caret back', async ({
  page,
}) => {
  const box = await caretBox(page, 'C10b')
  await page
    .locator('[data-box-bar]')
    .getByRole('button', { name: 'Box style' })
    .click()
  const card = page.getByRole('dialog', { name: 'Box style' })
  await expect(card).toBeVisible()
  await page.keyboard.type('Z')
  expect(await typed(page)).toBe(false)
  await card.getByRole('button', { name: 'Close' }).click()
  await expect(card).toBeHidden()
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Y')
  await expect(box.locator('.bn-editor')).toContainText('HelloY world')
  await expect(box.locator('.bn-editor')).not.toContainText('Z')
})

const V2 = { flags: ['textbox.v2'] }
const main = (page: Page) => page.locator('[data-paper-box="main"] .bn-editor')

test('C10 the tool bar: a card pauses typing (no key lands in the text behind); closing it puts the caret back', async ({
  page,
}) => {
  await openNote(page, 'touch', V2)
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft')
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  await expect(card(page)).toBeVisible()
  await page.keyboard.type('Z')
  expect(await typed(page)).toBe(false)
  await expect(main(page)).not.toContainText('Z')
  await page.keyboard.press('Escape')
  await expect(card(page)).toBeHidden()
  await expect(main(page)).toBeFocused()
  await page.keyboard.type('Y')
  await expect(main(page)).toContainText('The nucleus holds the YDNA')
})

test('C10 the tool bar: with words selected a card still applies, keys are not typed over them, and the selection is back when it closes', async ({
  page,
}) => {
  await openNote(page, 'touch', V2)
  await page.keyboard.press('Control+a')
  await openPill(page, 'Text', 'text')
  await option(page, 'Choose a text colour').click()
  await page.keyboard.type('Z')
  await expect(main(page)).toContainText('The nucleus holds the DNA')
  await expect(main(page)).not.toContainText('Z')
  await card(page).getByRole('button', { name: 'Blue', exact: true }).click()
  await expect(
    page.locator('.bn-editor [data-style-type="textColor"][data-value="blue"]'),
  ).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(card(page)).toBeHidden()
  await expect(main(page)).toBeFocused()
  expect(await page.evaluate(() => getSelection()?.toString())).toContain(
    'The nucleus holds the DNA',
  )
})

test('C11 typing: thin border and no dots; one tap outside: selected; a second: nothing', async ({
  page,
}) => {
  await start(page, 'C11')
  const box = await addBox(page, ['Typing here'])
  await pick(page, box)
  await tapTextEnd(page, box)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await expect(box).toHaveAttribute('data-typing', '')
  await expect(dots(box)).toHaveCount(0)
  await expect(box.locator('[data-box-grip]')).toBeHidden()
  const frame = box.locator('[data-box-frame]').first()
  const w = await frame.evaluate((el) =>
    parseFloat(getComputedStyle(el).borderTopWidth),
  )
  expect(w).toBeLessThanOrEqual(1.01)
  await tapOut(page)
  await expect(box.locator('.bn-editor')).not.toBeFocused()
  await expect(box).toHaveAttribute('data-picked', '')
  await expect(box).not.toHaveAttribute('data-typing', '')
  await expect(dots(box)).toHaveCount(8)
  await expect(box.locator('[data-box-grip]')).toBeVisible()
  await expect(page.locator('[data-box-bar]')).toBeVisible()
  await tapOut(page)
  await expect(box).not.toHaveAttribute('data-picked', '')
  await expect(dots(box)).toHaveCount(0)
})

test('C12 the frame of the first box matches its fill and padding', async ({
  page,
}) => {
  await start(page, 'C12')
  await styleMain(page, 'C12')
  const main = page.locator('[data-paper-box="main"]')
  await main.locator('.bn-editor').click()
  await page.keyboard.type(' more')
  await expect(page.locator('[data-main-frame]')).toBeVisible()
  // Why a poll: the frame follows the box through a resize observer, which
  // answers a frame or two after the text grew (WebKit).
  await expect
    .poll(async () => {
      const m = await rect(main)
      const f = await rect(page.locator('[data-main-frame]'))
      return Math.max(
        Math.abs(f.y - m.y),
        Math.abs(f.y + f.height - (m.y + m.height)),
        Math.abs(f.width - m.width),
      )
    })
    .toBeLessThan(1.5)
})

test('C12 the frame of a styled box matches its fill', async ({ page }) => {
  await start(page, 'C12b')
  const box = await addBox(page, ['One', 'Two', 'Three'])
  await pick(page, box)
  await page
    .locator('[data-box-bar]')
    .getByRole('button', { name: 'Box style' })
    .click()
  await page
    .getByRole('radiogroup', { name: 'Quick colours' })
    .getByRole('radio', { name: 'Lime' })
    .click()
  await page
    .getByRole('dialog', { name: 'Box style' })
    .getByRole('button', { name: 'Close' })
    .click()
  await page.waitForTimeout(500)
  const b = await rect(box)
  const fill = await rect(box.locator('[data-box-style]').first())
  const fr = await rect(box.locator('[data-box-frame]').first())
  for (const x of [fill, fr]) {
    expect(Math.abs(x.y - b.y)).toBeLessThan(1.5)
    expect(Math.abs(x.y + x.height - (b.y + b.height))).toBeLessThan(1.5)
  }
})

for (const side of ['right', 'left'] as const)
  test(
    'C13 every dot of the ' + side + ' box in a row does something',
    async ({ page }) => {
      await start(page, 'C13' + side)
      const { a, b } = await twoBoxes(page)
      const box = side === 'right' ? b : a
      // The way each dot is pulled: sides inward, top up, bottom down.
      // A box that is already narrow is widened instead, so it never hits its least width.
      const step = (how: string, width: number) => ({
        dx: how.includes('e')
          ? width > 200
            ? -60
            : 60
          : how.includes('w')
            ? width > 200
              ? 60
              : -60
            : 0,
        dy: how.includes('n') ? -40 : how.includes('s') ? 40 : 0,
      })
      const name = side
      {
        for (const how of HOW) {
          await pick(page, box)
          const before = await rect(box)
          const c = await centre(ring(box, how))
          const { dx, dy } = step(how, before.width)
          await drag(page, c, { x: c.x + dx, y: c.y + dy })
          const after = await rect(box)
          // A side dot changes the width, a top or bottom dot the height.
          if (dx)
            expect(
              Math.abs(after.width - before.width),
              `${name} box, dot ${how}: width`,
            ).toBeGreaterThan(2)
          if (dy)
            expect(
              Math.abs(after.height - before.height),
              `${name} box, dot ${how}: height`,
            ).toBeGreaterThan(2)
        }
      }
    },
  )

test('C13 the right edge of the last box narrows and widens it; the freed space stays empty', async ({
  page,
}) => {
  await start(page, 'C13b')
  const { a, b } = await twoBoxes(page)
  await pick(page, b)
  const w0 = (await rect(b)).width
  const left0 = (await rect(a)).width
  const e = await centre(ring(b, 'e'))
  await drag(page, e, { x: e.x - 80, y: e.y })
  const w1 = (await rect(b)).width
  expect(w1).toBeLessThan(w0 - 60)
  expect(Math.abs((await rect(a)).width - left0)).toBeLessThan(2)
  const e1 = await centre(ring(b, 'e'))
  await drag(page, e1, { x: e1.x + 80, y: e1.y })
  expect((await rect(b)).width).toBeGreaterThan(w1 + 60)
  // It stays after a reload.
  await page.waitForTimeout(900)
  await page.reload()
  await page.waitForTimeout(1200)
  expect((await rect(page.locator(EXTRA).nth(1))).width).toBeGreaterThan(
    w1 + 60,
  )
})

async function c15(page: Page, name: string) {
  await start(page, name)
  const { a, b, c } = await columns(page)
  const grow = async (box: Locator, how: 's' | 'n', dy: number) => {
    await pick(page, box)
    const h0 = (await rect(box)).height
    const p = await centre(ring(box, how))
    await drag(page, p, { x: p.x, y: p.y + dy })
    return (await rect(box)).height - h0
  }
  return { a, b, c, grow }
}

test('C15 bottom dots: every box grows, the box under it is pushed down; shrinking works', async ({
  page,
}) => {
  const { a, b, c, grow } = await c15(page, 'C15a')
  const cy0 = (await rect(c)).y
  expect(await grow(b, 's', 60)).toBeGreaterThan(50)
  expect((await rect(c)).y).toBeGreaterThan(cy0 + 50)
  expect(await grow(a, 's', 60)).toBeGreaterThan(50)
  expect(await grow(c, 's', 60)).toBeGreaterThan(50)
  expect(await grow(c, 's', -40)).toBeLessThan(-30)
  expect(await grow(a, 's', -2000)).toBeLessThan(-30)
  expect((await rect(a)).height).toBeGreaterThan(30)
})

test('C15 top dots: every box grows from its top edge, from any box, and nothing overlaps', async ({
  page,
}) => {
  const { a, b, c, grow } = await c15(page, 'C15b')
  expect(await grow(a, 'n', -50)).toBeGreaterThan(40)
  expect(await grow(b, 'n', -50)).toBeGreaterThan(40)
  expect(await grow(c, 'n', -50)).toBeGreaterThan(40)
  const [rb, rc] = await rects([b, c])
  expect(rc.y).toBeGreaterThanOrEqual(rb.y + rb.height - 1)
})

test('C15 after typing more lines the bottom dot still grows the box; after a reload too', async ({
  page,
}) => {
  const { a, b, c, grow } = await c15(page, 'C15c')
  await pick(page, b)
  await tapTextEnd(page, b)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('more')
  await expect(b).toHaveAttribute('data-typing', '')
  await tapOut(page)
  expect(await grow(b, 's', 50)).toBeGreaterThan(40)
  const before = await rects([a, b, c])
  await page.waitForTimeout(900)
  await page.reload()
  await page.waitForTimeout(1500)
  const boxes = page.locator(EXTRA)
  const after = await rects([boxes.nth(0), boxes.nth(1), boxes.nth(2)])
  for (const k of [0, 1, 2])
    expect(Math.abs(after[k].height - before[k].height)).toBeLessThan(3)
  expect(await grow(boxes.nth(1), 's', 40)).toBeGreaterThan(30)
})

test('C16 only one box is selected: tap A then B, only B has dots, the grip and the menu; a Lasso picks both', async ({
  page,
}) => {
  await start(page, 'C16')
  const a = await addBox(page, ['Alpha'], 0.3, 60)
  const b = await addBox(page, ['Beta'], 0.3, 170)
  const ra0 = await rect(a)
  await pick(page, a)
  await expect(dots(a)).toHaveCount(8)
  await pick(page, b)
  await expect(dots(b)).toHaveCount(8)
  await expect(dots(a)).toHaveCount(0)
  await expect(a).not.toHaveAttribute('data-picked', '')
  await expect(b.locator('[data-box-grip]')).toBeVisible()
  await expect(b.locator('[data-box-menu]')).toBeVisible()
  await expect(a.locator('[data-box-grip]')).toBeHidden()
  await expect(a.locator('[data-box-menu]')).toBeHidden()
  // Shift does not add a second box either.
  await page.keyboard.down('Shift')
  await page.mouse.click(ra0.x - 4, ra0.y + ra0.height / 2)
  await page.keyboard.up('Shift')
  await expect(b).not.toHaveAttribute('data-picked', '')
  await expect(a).toHaveAttribute('data-picked', '')
  // Typing in A (a first tap selects it, a second types) unselects B.
  await pick(page, b)
  const ra = await rect(a)
  // C32: the selected box B's tab now sits 48 to 92 px above B, over the middle
  // of A (the boxes are 36 px apart); tap A's left part, which the tab never covers.
  const ax = ra.x + ra.width * 0.2
  await page.mouse.click(ax, ra.y + ra.height / 2)
  await page.mouse.click(ax, ra.y + ra.height / 2)
  await expect(b).not.toHaveAttribute('data-picked', '')
  await tapOut(page)
  await tapOut(page)
  await lassoAround(page, [0, 1])
  await expect(a).toHaveAttribute('data-picked', '')
  await expect(b).toHaveAttribute('data-picked', '')
})
