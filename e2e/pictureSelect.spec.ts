// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng } from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Selecting a range that includes pictures (paragraph, picture, text below):
 * it selects whole blocks, never jumps or scrolls to the bottom, never changes
 * the page, and copies. A pen or finger press never starts a native drag or a
 * drop. Simulated pen and touch events.
 */

test.use({
  viewport: { width: 1000, height: 700 },
  hasTouch: true,
})

test.beforeEach(async ({ context, browserName }) => {
  // WebKit has no clipboard permissions; the clipboard checks run in Chromium.
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }
})

type Pt = { x: number; y: number }

async function setup(page: Page) {
  const png = await solidPng(240, 120)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  const editor = page.locator('.bn-editor')
  await editor.click()
  await page.keyboard.type('First line')
  for (const name of ['one.png', 'two.png']) {
    await page.keyboard.press('Enter')
    await page.keyboard.type('/image')
    await page.keyboard.press('Enter')
    await page
      .locator('input[type="file"]')
      .last()
      .setInputFiles({ name, mimeType: 'image/png', buffer: png })
    await expect(
      page.locator('.bn-editor img').nth(name === 'one.png' ? 0 : 1),
    ).toBeVisible()
    await page.keyboard.type(name === 'one.png' ? 'Middle line' : 'Last line')
  }
  // Plenty of lines under it, so the page scrolls.
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Filler ${i}`)
  }
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('.bn-editor img')].every(
          (img) => (img as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true)
  await page.waitForTimeout(700)
  await tool(page, 'Lasso').click() // the Pencil selects under Lasso
  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    document.querySelector('main')!.scrollTop = 0
  })
  await page.waitForTimeout(200)
}

const centre = async (page: Page, text: string): Promise<Pt> => {
  const b = (await page.getByText(text, { exact: true }).boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
const scrollTop = (page: Page) =>
  page.evaluate(() => document.querySelector('main')!.scrollTop)
const blockCount = (page: Page) => page.locator('.bn-editor .bn-block').count()

async function drag(page: Page, from: Pt, to: Pt, type = 'pen') {
  await page.evaluate(
    ({ from, to, type }) => {
      const make = (name: string, x: number, y: number) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: 5,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          buttons: name === 'pointerup' ? 0 : 1,
          isPrimary: true,
        })
      const at = (x: number, y: number) => document.elementFromPoint(x, y)!
      at(from.x, from.y).dispatchEvent(make('pointerdown', from.x, from.y))
      for (let i = 1; i <= 12; i++) {
        const x = from.x + ((to.x - from.x) * i) / 12
        const y = from.y + ((to.y - from.y) * i) / 12
        at(x, y).dispatchEvent(make('pointermove', x, y))
      }
      at(to.x, to.y).dispatchEvent(make('pointerup', to.x, to.y))
    },
    { from, to, type },
  )
}

test('text, picture, text: a pen drag selects the whole range, no jump, no change, and Copy works', async ({
  page,
}) => {
  await setup(page)
  const blocks = await blockCount(page)
  const before = await scrollTop(page)
  const a = await centre(page, 'First line')
  const b = await centre(page, 'Middle line')
  await drag(page, a, b)
  await expect(page.locator('[data-ln-selected]')).toHaveCount(1)
  expect(Math.abs((await scrollTop(page)) - before)).toBeLessThan(3)
  expect(await blockCount(page)).toBe(blocks)
  await expect(page.locator('.bn-editor')).toContainText('First line')
  await expect(page.locator('.bn-editor')).toContainText('Middle line')
  await page.keyboard.press('Control+c')
  if (test.info().project.name === 'chromium') {
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('First line')
  }
  expect(await blockCount(page)).toBe(blocks)
})

test('the selection can end on a picture', async ({ page }) => {
  await setup(page)
  const blocks = await blockCount(page)
  const a = await centre(page, 'First line')
  const img = (await page.locator('.bn-editor img').nth(0).boundingBox())!
  await drag(page, a, { x: img.x + img.width / 2, y: img.y + img.height / 2 })
  await expect(page.locator('[data-ln-selected]')).toHaveCount(1)
  expect(await blockCount(page)).toBe(blocks)
  // And from the picture down to text below it.
  const b = await centre(page, 'Middle line')
  await drag(page, { x: img.x + img.width / 2, y: img.y + 10 }, b)
  await expect(page.locator('[data-ln-selected]')).toHaveCount(1)
  expect(await blockCount(page)).toBe(blocks)
})

test('a drag far below the page does not scroll it to the bottom', async ({
  page,
}) => {
  await setup(page)
  const before = await scrollTop(page)
  const a = await centre(page, 'First line')
  const img = (await page.locator('.bn-editor img').nth(1).boundingBox())!
  await drag(page, a, { x: img.x + 20, y: img.y + 20 })
  const after = await scrollTop(page)
  expect(after - before).toBeLessThan(200) // never a jump to the bottom
})

for (const type of ['pen', 'touch'] as const) {
  test(`once a ${type} selection has started on text, crossing a picture never starts a drag or a drop`, async ({
    page,
  }) => {
    await setup(page)
    const blocks = await blockCount(page)
    const at = await centre(page, 'First line')
    const result = await page.evaluate(
      ({ at, type }) => {
        const el = document.elementFromPoint(at.x, at.y)!
        el.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerType: type,
            pointerId: 4,
            clientX: at.x,
            clientY: at.y,
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: 1,
            isPrimary: true,
          }),
        )
        const dragstart = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
        })
        document.querySelector('.bn-editor img')!.dispatchEvent(dragstart)
        const drop = new DragEvent('drop', { bubbles: true, cancelable: true })
        document.querySelector('.bn-editor')!.dispatchEvent(drop)
        return {
          dragCancelled: dragstart.defaultPrevented,
          dropCancelled: drop.defaultPrevented,
          userDrag: getComputedStyle(
            document.querySelector('.bn-editor img')!,
          ).getPropertyValue('-webkit-user-drag'),
        }
      },
      { at, type },
    )
    expect(result.dragCancelled).toBe(true)
    expect(result.dropCancelled).toBe(true)
    expect(['none', '']).toContain(result.userDrag)
    expect(await blockCount(page)).toBe(blocks)
  })
}

test('a finger still scrolls the page (touch is never turned into a selection)', async ({
  page,
}) => {
  await setup(page)
  const a = await centre(page, 'First line')
  const b = await centre(page, 'Middle line')
  await drag(page, a, b, 'touch')
  await expect(page.locator('[data-ln-selected]')).toHaveCount(0)
})
