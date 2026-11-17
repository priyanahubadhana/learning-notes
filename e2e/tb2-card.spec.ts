// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Phase 2B, task 2B.9 (switch textbox.v2 ON): the Box card.
 * TB-25 opens beside the box, scrolls inside; TB-26 Beginner looks and fills;
 * TB-27 Professional rows; TB-28 Layout section; TB-29 glow and one Undo.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
type R = { x: number; y: number; width: number; height: number }

async function start(
  page: Page,
  name: string,
  level: 'beginner' | 'professional' = 'professional',
) {
  await page.addInitScript((lv) => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: lv, unlocked: [], off: [] }),
    )
  }, level)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

/** A new box under the last one, with this text; nothing is left selected. */
async function addBox(page: Page, text: string) {
  const before = await page.locator(EXTRA).count()
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count()) ? await rect(sheetEl) : main
  let bottom = 0
  const all = page.locator('[data-paper-box]')
  for (let i = 0; i < (await all.count()); i++) {
    const r = await rect(all.nth(i))
    bottom = Math.max(bottom, r.y + r.height)
  }
  await page.mouse.click(sheet.x + sheet.width * 0.3, bottom + 60)
  const boxes = page.locator(EXTRA)
  await expect(boxes).toHaveCount(before + 1)
  await expect(boxes.nth(before).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return boxes.nth(before)
}

/** A finger tap in the empty part of a box selects it (owner 17 Nov, "First tap in a box"). */
async function pick(page: Page, box: Locator) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picked]')).toHaveCount(0)
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    // The empty part of the box (owner 17 Nov): a tap on the words puts the caret.
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 32,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    el.dispatchEvent(mk('pointerdown', 1))
    el.dispatchEvent(mk('pointerup', 0))
  }, p)
  await expect(box).toHaveAttribute('data-picked', '')
}

const bar = (page: Page) => page.locator('[data-box-bar]')
const card = (page: Page) => page.getByTestId('bc-card')

/** Pick the box and tap Box style on its bar: the card opens. */
async function openCard(page: Page, box: Locator) {
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Box style' }).tap()
  await expect(card(page)).toBeVisible()
  await expect(card(page)).toHaveAttribute('data-settled', 'true')
}

const look = (box: Locator, prop: 'backgroundColor' | 'borderTopLeftRadius') =>
  box.evaluate((e, p) => {
    const f = e.querySelector('[data-box-style]')
    return f ? getComputedStyle(f)[p] : 'none'
  }, prop)
const bg = (box: Locator) => look(box, 'backgroundColor')
const radius = (box: Locator) => look(box, 'borderTopLeftRadius')

const overlaps = (a: R, b: R) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

const scrolled = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((e) => e.scrollTop > 0 && !e.closest('[data-testid="bc-card"]'))
      .map((e) => e.scrollTop)
      .concat(window.scrollY),
  )

test('TB-25: Box style opens the card beside the box: 376 wide, radius 20, 8 px gap, never over the box, sections Box and Layout', async ({
  page,
}) => {
  await start(page, 'TB25')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  const c = await rect(card(page))
  const b = await rect(box)
  expect(Math.round(c.width)).toBe(376)
  expect(overlaps(c, b)).toBe(false)
  // Beside the box: at least 8 px from it (24 px stay clear for the dots).
  const gap =
    c.x >= b.x + b.width ? c.x - (b.x + b.width) : b.x - (c.x + c.width)
  expect(gap).toBeGreaterThanOrEqual(8)
  await expect(card(page)).toHaveCSS('border-top-left-radius', '20px')
  await expect(page.getByTestId('bc-tab-box')).toBeVisible()
  await expect(page.getByTestId('bc-tab-layout')).toBeVisible()
  // The ✕ closes it.
  await card(page).getByRole('button', { name: 'Close' }).click()
  await expect(card(page)).toHaveCount(0)
})

test('TB-25: a card taller than its room scrolls inside, is solid, and the page stays still', async ({
  page,
}) => {
  await start(page, 'TB25tall')
  const box = await addBox(page, 'Alpha beta')
  await page.setViewportSize({ width: 1336, height: 520 })
  await box.scrollIntoViewIfNeeded()
  await openCard(page, box)
  const c = await rect(card(page))
  expect(c.height).toBeLessThanOrEqual(520)
  const body = page.getByTestId('pcard-body')
  const cut = await body.evaluate((e) => e.scrollHeight - e.clientHeight)
  expect(cut).toBeGreaterThan(20)
  const before = await scrolled(page)
  await body.evaluate((e) => (e.scrollTop = 200))
  await page.waitForTimeout(300)
  expect(await body.evaluate((e) => e.scrollTop)).toBeGreaterThan(100)
  expect(await scrolled(page)).toEqual(before)
  // Solid: no blur, no see-through fill, no fade mask over the rows (R12).
  const look = await card(page).evaluate((e) => {
    const s = getComputedStyle(e)
    const a = getComputedStyle(e.querySelector('.pcard-body')!)
    return {
      bg: s.backgroundColor,
      blur: s.backdropFilter,
      mask: a.maskImage || a.webkitMaskImage,
    }
  })
  expect(look.bg).not.toMatch(/rgba\(.*, 0(\.\d+)?\)/)
  expect(look.blur).toBe('none')
  expect(look.mask).toBe('none')
  expect(overlaps(await rect(card(page)), await rect(box))).toBe(false)
})

test('TB-26: Beginner sees Plain, Sticky, Callout and six round fills; picking one changes the box at once', async ({
  page,
}) => {
  await start(page, 'TB26', 'beginner')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  for (const n of ['Plain', 'Sticky', 'Callout'])
    await expect(card(page).getByRole('radio', { name: n })).toBeVisible()
  await expect(
    card(page).getByRole('radiogroup', { name: 'Fill' }).getByRole('radio'),
  ).toHaveCount(6)
  // No Professional rows.
  await expect(card(page).getByText('Border colour')).toHaveCount(0)
  await expect(card(page).getByText('Corner radius')).toHaveCount(0)
  await expect(page.getByTestId('bc-save')).toHaveCount(0)
  const plain = await bg(box)
  await page.getByTestId('bc-look-sticky').tap()
  await expect.poll(() => bg(box)).not.toBe(plain)
  await expect(page.getByTestId('bc-look-sticky')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // A round fill colours the box.
  await page.getByTestId('bc-fill-blue').tap()
  await expect(page.getByTestId('bc-fill-blue')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(box.locator('[data-box-frame]').first()).not.toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  )
})

test('TB-27: Professional adds border, corners, padding, shadow, save / rename / delete my looks, use for new boxes, reset', async ({
  page,
}) => {
  await start(page, 'TB27')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  for (const n of [
    'Background',
    'Border colour',
    'Border width',
    'Corner radius',
    'Padding',
  ])
    await expect(card(page).getByRole('radiogroup', { name: n })).toBeAttached()
  await expect(
    card(page).getByRole('switch', { name: 'Shadow' }),
  ).toBeAttached()
  // Corners change the frame.
  await page.getByTestId('bc-radius-16').scrollIntoViewIfNeeded()
  await page.getByTestId('bc-radius-16').tap()
  await expect.poll(() => radius(box)).toBe('16px')
  // Save as my look, rename, apply, delete.
  await page.getByTestId('bc-save').scrollIntoViewIfNeeded()
  await page.getByTestId('bc-save').tap()
  const mine = card(page).getByRole('radio', { name: 'My look 1' })
  await expect(mine).toBeAttached()
  await card(page).getByRole('button', { name: 'Rename' }).tap()
  const field = page.getByTestId('bc-rename')
  await expect(
    card(page).getByRole('button', { name: 'Cancel renaming' }),
  ).toBeVisible()
  await field.fill('Mine A')
  await field.press('Enter')
  await expect(card(page).getByRole('radio', { name: 'Mine A' })).toBeAttached()
  await page.getByTestId('bc-reset').scrollIntoViewIfNeeded()
  await page.getByTestId('bc-reset').tap()
  await expect.poll(() => radius(box)).not.toBe('16px')
  await card(page).getByRole('radio', { name: 'Mine A' }).tap()
  await expect.poll(() => radius(box)).toBe('16px')
  const useNew = card(page).getByRole('switch', { name: 'Use for new boxes' })
  await useNew.scrollIntoViewIfNeeded()
  await expect(useNew).toHaveAttribute('aria-checked', 'true')
  await card(page).getByRole('button', { name: 'Delete preset' }).tap()
  await expect(card(page).getByRole('radio', { name: 'Mine A' })).toHaveCount(0)
})

test('TB-27: every row of the old Box style panel has a place (swatches, styles, colours, border, width, corners, padding, shadow, mine, reset)', async ({
  page,
}) => {
  await start(page, 'TB27rows')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  await expect(page.locator('[data-testid^="bc-quick-"]')).toHaveCount(10)
  for (const n of [
    'Outline',
    'Soft card',
    'Note',
    'Shadow card',
    'Sticky',
    'Callout',
  ])
    await expect(
      card(page).getByRole('radio', { name: n }).first(),
    ).toBeAttached()
  await expect(page.locator('[data-testid^="bc-bg-"]')).toHaveCount(11)
  await expect(page.locator('[data-testid^="bc-border-"]')).toHaveCount(11)
  await expect(page.locator('[data-testid^="bc-borderw-"]')).toHaveCount(4)
  await expect(page.locator('[data-testid^="bc-radius-"]')).toHaveCount(5)
  await expect(page.locator('[data-testid^="bc-pad-"]')).toHaveCount(5)
  await expect(page.getByTestId('bc-save')).toBeAttached()
  await expect(page.getByTestId('bc-reset')).toBeAttached()
})

test('TB-28: Layout section has Two columns, Six boxes, Layout Assist; Professional adds all pages', async ({
  page,
}) => {
  await start(page, 'TB28')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Bravo')
  await openCard(page, b)
  await page.getByTestId('bc-tab-layout').tap()
  await expect(page.getByTestId('bc-layout-two')).toBeVisible()
  await expect(page.getByTestId('bc-layout-six')).toBeVisible()
  await expect(page.getByTestId('bc-assist')).toBeVisible()
  await expect(
    card(page).getByRole('switch', {
      name: 'Apply to all pages in the notebook',
    }),
  ).toBeVisible()
  expect(Math.abs((await rect(a)).y - (await rect(b)).y)).toBeGreaterThan(20)
  await page.getByTestId('bc-layout-two').tap()
  // Two columns: the two boxes now stand side by side.
  await expect
    .poll(async () => Math.abs((await rect(a)).y - (await rect(b)).y))
    .toBeLessThan(6)
  // One Undo puts them back.
  await page.keyboard.press('Escape')
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(async () => Math.abs((await rect(a)).y - (await rect(b)).y))
    .toBeGreaterThan(20)
})

test('TB-28: Beginner Layout section has no all-pages row', async ({
  page,
}) => {
  await start(page, 'TB28b', 'beginner')
  const box = await addBox(page, 'Alpha')
  await openCard(page, box)
  await page.getByTestId('bc-tab-layout').tap()
  await expect(page.getByTestId('bc-layout-two')).toBeVisible()
  await expect(
    card(page).getByRole('switch', {
      name: 'Apply to all pages in the notebook',
    }),
  ).toHaveCount(0)
})

test('TB-29: the changed control glows once and one Undo reverses exactly that change', async ({
  page,
}) => {
  await start(page, 'TB29')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  expect(await card(page).locator('.pcard-glow').count()).toBe(0)
  const plain = await bg(box)
  await page.getByTestId('bc-look-sticky').tap()
  await expect(card(page).locator('.pcard-glow').first()).toBeAttached()
  await expect.poll(() => bg(box)).not.toBe(plain)
  // A second change, then Undo: only that one goes back.
  await page.getByTestId('bc-fill-green').tap()
  await expect(page.getByTestId('bc-fill-green')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.getByTestId('bc-fill-green')).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(page.getByTestId('bc-look-sticky')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => bg(box)).toBe(plain)
})

test('a tap opens the card without a focus ring and with no key names', async ({
  page,
}) => {
  await start(page, 'ring')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  const ring = await card(page).evaluate((root) => {
    const bad: string[] = []
    for (const e of root.querySelectorAll<HTMLElement>('*')) {
      const s = getComputedStyle(e)
      if (e.matches(':focus-visible') && s.outlineStyle !== 'none')
        bad.push(e.tagName)
    }
    return bad
  })
  expect(ring).toEqual([])
  const text = (await card(page).innerText()).toLowerCase()
  for (const k of ['⌘', '⌃', '⌥', 'ctrl', 'cmd', 'shift+'])
    expect(text).not.toContain(k)
  await page.keyboard.press('Escape')
  await expect(card(page)).toHaveCount(0)
})

test('phone: the Box card is a bottom sheet with 44 pt tiles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await start(page, 'phone')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  const c = await rect(card(page))
  expect(c.y + c.height).toBeGreaterThan(800)
  expect(c.width).toBeLessThanOrEqual(390)
  const tile = await rect(page.getByTestId('bc-look-sticky'))
  expect(tile.height).toBeGreaterThanOrEqual(44)
})

const fullSwitch = (page: Page) =>
  card(page).getByRole('switch', { name: 'Full width' })
const sameRow = async (a: Locator, b: Locator) =>
  Math.abs((await rect(a)).y - (await rect(b)).y) < 6
const tapSwitch = async (l: Locator) => {
  await l.scrollIntoViewIfNeeded()
  await l.tap()
}

test('TB-27: Full width in a grid spans the whole row, off returns the box to its column, one Undo each', async ({
  page,
}) => {
  await start(page, 'TB27full')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Bravo')
  await openCard(page, b)
  await page.getByTestId('bc-tab-layout').tap()
  await page.getByTestId('bc-layout-two').tap()
  await expect.poll(() => sameRow(a, b)).toBe(true)
  const side = (await rect(b)).width
  await page.getByTestId('bc-tab-box').tap()
  await tapSwitch(fullSwitch(page))
  await expect(fullSwitch(page)).toHaveAttribute('aria-checked', 'true')
  // The box spans every column: about twice as wide, and under its neighbour.
  await expect
    .poll(async () => (await rect(b)).width)
    .toBeGreaterThan(side * 1.6)
  expect(await sameRow(a, b)).toBe(false)
  // Off: back in its column.
  await tapSwitch(fullSwitch(page))
  await expect(fullSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect.poll(() => sameRow(a, b)).toBe(true)
  // One Undo puts back exactly the last change (full again), a second the column.
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(async () => (await rect(b)).width)
    .toBeGreaterThan(side * 1.6)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => sameRow(a, b)).toBe(true)
  await expect.poll(async () => (await rect(b)).width).toBeLessThan(side * 1.2)
})

test('TB-27: Full width on a free box takes the page text width, off gives its width back, one Undo each', async ({
  page,
}) => {
  await start(page, 'TB27free')
  const a = await addBox(page, 'Alpha')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const before = await rect(a)
  await openCard(page, a)
  await tapSwitch(fullSwitch(page))
  // 180 of 210 mm: the text width, from the left margin.
  await expect
    .poll(async () => (await rect(a)).width / sheet.width)
    .toBeGreaterThan(0.8)
  const on = await rect(a)
  expect(on.width / sheet.width).toBeLessThan(0.9)
  expect(on.x).toBeLessThanOrEqual(before.x)
  await tapSwitch(fullSwitch(page))
  await expect
    .poll(async () => Math.abs((await rect(a)).width - before.width))
    .toBeLessThan(4)
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(async () => (await rect(a)).width / sheet.width)
    .toBeGreaterThan(0.8)
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(async () => Math.abs((await rect(a)).width - before.width))
    .toBeLessThan(4)
})

test('TB-28: my layouts: save this page, apply it, rename it, delete it; apply is one Undo', async ({
  page,
}) => {
  await start(page, 'TB28own')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Bravo')
  await openCard(page, b)
  await page.getByTestId('bc-tab-layout').tap()
  // Save the stacked page, then change it to two columns.
  await tapSwitch(page.getByTestId('bc-save-layout'))
  const mine = page.getByTestId('bc-own-layout')
  await expect(mine).toHaveText('My layout 1')
  await page.getByTestId('bc-layout-two').tap()
  await expect.poll(() => sameRow(a, b)).toBe(true)
  // Apply mine: stacked again.
  await tapSwitch(mine)
  await expect.poll(() => sameRow(a, b)).toBe(false)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => sameRow(a, b)).toBe(true)
  // Rename.
  await tapSwitch(page.getByTestId('bc-layout-rename'))
  const field = page.getByTestId('bc-rename-layout')
  await expect(
    card(page).getByRole('button', { name: 'Cancel renaming' }),
  ).toBeVisible()
  await field.fill('Stacked')
  await field.press('Enter')
  await expect(page.getByTestId('bc-own-layout')).toHaveText('Stacked')
  // It is kept: the card opened again still lists it.
  await card(page).getByRole('button', { name: 'Close' }).click()
  await expect(card(page)).toHaveCount(0)
  await openCard(page, b)
  await page.getByTestId('bc-tab-layout').tap()
  await expect(page.getByTestId('bc-own-layout')).toHaveText('Stacked')
  // Delete.
  await card(page).getByRole('button', { name: 'Delete layout' }).tap()
  await expect(page.getByTestId('bc-own-layout')).toHaveCount(0)
})

test('TB-28: Apply to all pages in the notebook changes every page; one Undo', async ({
  page,
}) => {
  await start(page, 'TB28all')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Bravo')
  await addPage(page, 'Paper', 'Second')
  await typeInEditor(page, 'Main two')
  const c = await addBox(page, 'Charlie')
  const d = await addBox(page, 'Delta')
  await openCard(page, d)
  await page.getByTestId('bc-tab-layout').tap()
  await tapSwitch(
    card(page).getByRole('switch', {
      name: 'Apply to all pages in the notebook',
    }),
  )
  await page.getByTestId('bc-layout-two').tap()
  await expect.poll(() => sameRow(c, d)).toBe(true)
  await page.keyboard.press('Escape')
  await openPage(page, 'TB28all')
  await expect.poll(() => sameRow(a, b)).toBe(true)
  // One Undo, on the page where it was done, puts every page back.
  await openPage(page, 'Second')
  await expect.poll(() => sameRow(c, d)).toBe(true)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect.poll(() => sameRow(c, d)).toBe(false)
  await openPage(page, 'TB28all')
  await expect.poll(() => sameRow(a, b)).toBe(false)
})

test('TB-25: a wide box low on the page: the card is capped at the room there is, scrolls inside, is solid, the page stays still', async ({
  page,
}) => {
  await start(page, 'TB25wide')
  const box = await addBox(page, 'Alpha beta')
  await openCard(page, box)
  await tapSwitch(fullSwitch(page))
  await card(page).getByRole('button', { name: 'Close' }).click()
  await page.setViewportSize({ width: 1336, height: 640 })
  await box.evaluate((e) => e.scrollIntoView({ block: 'end' }))
  await page.waitForTimeout(300)
  await openCard(page, box)
  const c = await rect(card(page))
  const b = await rect(box)
  expect(overlaps(c, b)).toBe(false)
  expect(c.y).toBeGreaterThanOrEqual(0)
  expect(c.y + c.height).toBeLessThanOrEqual(640)
  const body = page.getByTestId('pcard-body')
  expect(
    await body.evaluate((e) => e.scrollHeight - e.clientHeight),
  ).toBeGreaterThan(20)
  const before = await scrolled(page)
  await body.evaluate((e) => (e.scrollTop = 150))
  await page.waitForTimeout(300)
  expect(await scrolled(page)).toEqual(before)
  const solid = await card(page).evaluate((e) => {
    const s = getComputedStyle(e)
    const m = getComputedStyle(e.querySelector('.pcard-body')!)
    return [
      s.backdropFilter,
      m.maskImage || m.webkitMaskImage,
      s.backgroundColor,
    ]
  })
  expect(solid[0]).toBe('none')
  expect(solid[1]).toBe('none')
  expect(solid[2]).not.toMatch(/rgba\(.*, 0(\.\d+)?\)/)
})

test('TB-28: Undo of "all pages" keeps edits made since: a box added on another page stays, that page is skipped and a toast says so', async ({
  page,
}) => {
  await start(page, 'TB28keep')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Bravo')
  await addPage(page, 'Paper', 'Second')
  await typeInEditor(page, 'Main two')
  const c = await addBox(page, 'Charlie')
  const d = await addBox(page, 'Delta')
  await openCard(page, d)
  await page.getByTestId('bc-tab-layout').tap()
  await tapSwitch(
    card(page).getByRole('switch', {
      name: 'Apply to all pages in the notebook',
    }),
  )
  await page.getByTestId('bc-layout-two').tap()
  await expect.poll(() => sameRow(c, d)).toBe(true)
  await page.keyboard.press('Escape')
  // An edit on the first page in between: a new box.
  await openPage(page, 'TB28keep')
  await expect.poll(() => sameRow(a, b)).toBe(true)
  await addBox(page, 'Echo')
  await expect(page.locator(EXTRA)).toHaveCount(3)
  // Undo, where it was done: that page goes back, the edited page is left alone.
  await openPage(page, 'Second')
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect.poll(() => sameRow(c, d)).toBe(false)
  await expect(page.locator('[data-toast]')).toContainText('Undo left 1 pages')
  await openPage(page, 'TB28keep')
  await expect(page.locator(EXTRA)).toHaveCount(3)
  await expect.poll(() => sameRow(a, b)).toBe(true)
})

test('TB-27: a later layout that moves a box off its full row switches Full width off', async ({
  page,
}) => {
  await start(page, 'TB27clear')
  const a = await addBox(page, 'Alpha')
  const b = await addBox(page, 'Bravo')
  await openCard(page, b)
  await tapSwitch(fullSwitch(page))
  await expect(fullSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('bc-tab-layout').tap()
  await page.getByTestId('bc-layout-two').tap()
  await expect.poll(() => sameRow(a, b)).toBe(true)
  await page.getByTestId('bc-tab-box').tap()
  await expect(fullSwitch(page)).toHaveAttribute('aria-checked', 'false')
})
