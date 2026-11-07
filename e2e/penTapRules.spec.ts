// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * What a Pencil (or finger) tap does under each tool, simulated with pointer
 * events: ink tools and Lasso never place a caret or open the keyboard; Text
 * with "tap twice" marks a block with words first, places the caret on the
 * second tap, and places it at once in an empty block; View mode (no tool)
 * only scrolls, and a double-tap there starts typing.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

type Pt = { x: number; y: number }

async function setup(page: Page, keys: Record<string, unknown> = {}) {
  await openNote(page, 'touch', keys)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second block of words')
  await page.keyboard.press('Enter') // an empty third block
  await page.waitForTimeout(300)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
}

const blockPoint = (page: Page, index: number): Promise<Pt> =>
  page.evaluate((i) => {
    const el = document.querySelectorAll('.bn-editor .bn-block-content')[i]
    const b = el.getBoundingClientRect()
    return { x: b.x + Math.min(40, b.width / 2), y: b.y + b.height / 2 }
  }, index)

/** One tap; returns whether pointerdown was cancelled. */
async function tap(page: Page, at: Pt, type: 'pen' | 'touch' = 'pen') {
  return page.evaluate(
    ({ at, type }) => {
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: 21,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      const el = document.elementFromPoint(at.x, at.y)!
      const kept = el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
      return !kept
    },
    { at, type },
  )
}

const focused = (page: Page) =>
  page.evaluate(() =>
    document.querySelector('.bn-editor')!.contains(document.activeElement),
  )
const activeBlockIndex = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .bn-block')].findIndex((b) =>
      b.hasAttribute('data-active-block'),
    ),
  )
const text = (page: Page) => page.locator('.bn-editor').innerText()

for (const name of ['Pen', 'Highlighter', 'Eraser', 'Lasso', 'Read']) {
  test(`${name}: a Pencil tap on text or an empty line never places a caret or opens the keyboard`, async ({
    page,
  }) => {
    await setup(page)
    await tool(page, name).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500) // the closed pill gives the page its room back
    const before = await text(page)
    for (const index of [0, 1, 2]) {
      const cancelled = await tap(page, await blockPoint(page, index))
      expect(cancelled, `${name} block ${index}`).toBe(true)
      expect(await focused(page)).toBe(false)
    }
    expect(await text(page)).toBe(before)
    await expect(page.locator('.bn-editor')).toHaveAttribute(
      'inputmode',
      'none',
    )
  })
}

test('Text, tap twice on: the first Pencil tap only marks a block with words (no focus), the second places the caret', async ({
  page,
}) => {
  await setup(page, { 'advanced.pencilTapTwice': 'on' })
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  const first = await blockPoint(page, 0)
  expect(await tap(page, first)).toBe(true) // cancelled: no caret yet
  expect(await focused(page)).toBe(false)
  expect(await activeBlockIndex(page)).toBe(0)
  await expect(page.locator('.bn-editor')).toHaveAttribute('inputmode', 'none')
  // A tap on another block moves the mark there (again no caret).
  expect(await tap(page, await blockPoint(page, 1))).toBe(true)
  expect(await activeBlockIndex(page)).toBe(1)
  expect(await focused(page)).toBe(false)
  // The second tap inside the active block is left to place the caret.
  expect(await tap(page, await blockPoint(page, 1))).toBe(false)
  await expect(page.locator('.bn-editor [data-caret-flash]')).toHaveCount(1)
  expect(await activeBlockIndex(page)).toBe(-1)
})

test('Text, tap twice on: an empty block takes the caret with one tap', async ({
  page,
}) => {
  await setup(page, { 'advanced.pencilTapTwice': 'on' })
  expect(await tap(page, await blockPoint(page, 2))).toBe(false) // empty block
  expect(await activeBlockIndex(page)).toBe(-1)
})

test('Text, tap twice off: one Pencil tap is left to place the caret, as before', async ({
  page,
}) => {
  await setup(page, { 'advanced.pencilTapTwice': 'off' })
  expect(await tap(page, await blockPoint(page, 0))).toBe(false)
  expect(await activeBlockIndex(page)).toBe(-1)
})

test('Auto means on in Pencil mode, off in Touch mode', async ({ page }) => {
  await setup(page) // Touch mode, setting on Auto
  expect(await tap(page, await blockPoint(page, 0))).toBe(false)
})

test('a finger tap places the caret with one tap whatever the setting', async ({
  page,
}) => {
  await setup(page, { 'advanced.pencilTapTwice': 'on' })
  expect(await tap(page, await blockPoint(page, 0), 'touch')).toBe(false)
  await expect(page.locator('.bn-editor')).toHaveAttribute('inputmode', 'text')
})

test('Lasso: a Pencil tap on words marks nothing and places no caret (a tap starts a loop)', async ({
  page,
}) => {
  await setup(page)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500) // the closed pill gives the page its room back
  expect(await tap(page, await blockPoint(page, 0))).toBe(true)
  expect(await activeBlockIndex(page)).toBe(-1)
  expect(await focused(page)).toBe(false)
  expect(await tap(page, await blockPoint(page, 0))).toBe(true)
  expect(await focused(page)).toBe(false)
})

test('Lasso: a blank line takes no caret (a stroke there is a lasso)', async ({
  page,
}) => {
  await setup(page)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  expect(await tap(page, await blockPoint(page, 2))).toBe(true)
  expect(await focused(page)).toBe(false)
})

test('Text: no double-tap word select, and the finger pans (a touch drag is never cancelled)', async ({
  page,
}) => {
  await setup(page)
  const at = await blockPoint(page, 1)
  await tap(page, at, 'touch')
  await page.waitForTimeout(60)
  await tap(page, at, 'touch')
  await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)
  const moved = await page.evaluate((from) => {
    const el = document.elementFromPoint(from.x, from.y)!
    const make = (name: string, y: number) =>
      new PointerEvent(name, {
        pointerType: 'touch',
        pointerId: 23,
        clientX: from.x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        buttons: 1,
      })
    el.dispatchEvent(make('pointerdown', from.y))
    const move = make('pointermove', from.y - 120)
    el.dispatchEvent(move)
    el.dispatchEvent(make('pointerup', from.y - 120))
    return move.defaultPrevented
  }, at)
  expect(moved).toBe(false)
})

test('Pencil mode starts with the Lasso tool', async ({ page }) => {
  await openNote(page, 'pencil')
  await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'false')
})
