// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng } from './helpers.ts'

/**
 * Selecting across pictures: a drag (Apple Pencil, mouse) that starts on a
 * picture, ends on one or passes over one selects whole blocks, pictures
 * included, so Copy, Delete and Move act on the whole range. The Pencil is
 * simulated with dispatched pointer events (pointerType "pen").
 */

test.use({ viewport: { width: 1000, height: 900 } })

/** Text, a picture, text, a picture, text: returns where each one is. */
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
      page.locator(`.bn-editor img`).nth(name === 'one.png' ? 0 : 1),
    ).toBeVisible()
    // Back to the end of the page by a known spot, not the middle of the editor.
    await page.getByText('First line').click()
    await page.keyboard.press('Control+End')
    await page.keyboard.press('Enter')
    await page.keyboard.type(name === 'one.png' ? 'Middle line' : 'Last line')
  }
  // Pictures finished loading (WebKit lays them out late), then positions.
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('.bn-editor img')].every(
          (img) => (img as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true)
  await page.waitForTimeout(600)
  const box = async (locator: ReturnType<Page['locator']>) =>
    (await locator.boundingBox())!
  return {
    first: await box(page.getByText('First line')),
    middle: await box(page.getByText('Middle line')),
    last: await box(page.getByText('Last line')),
    img1: await box(page.locator('.bn-editor img').nth(0)),
    img2: await box(page.locator('.bn-editor img').nth(1)),
  }
}

type Point = { x: number; y: number }

/** A drag with a pen, simulated by dispatching pointer events. */
async function penDrag(page: Page, from: Point, to: Point, type = 'pen') {
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
      for (let i = 1; i <= 10; i++) {
        const x = from.x + ((to.x - from.x) * i) / 10
        const y = from.y + ((to.y - from.y) * i) / 10
        at(x, y).dispatchEvent(make('pointermove', x, y))
      }
      at(to.x, to.y).dispatchEvent(make('pointerup', to.x, to.y))
    },
    { from, to, type },
  )
}

const marked = (page: Page) => page.locator('[data-ln-selected]')
const blockCount = (page: Page) => page.locator('.bn-editor .bn-block').count()
const text = (page: Page) => page.locator('.bn-editor').innerText()

test('a pen drag from text, over a picture, to text selects the picture too, and Delete removes the whole range', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.first.x + p.first.width - 2, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + p.middle.height / 2 },
  )
  await expect(marked(page)).toHaveCount(1) // the first picture
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(1) // the second stays
  const left = await text(page)
  expect(left).toContain('Last line')
  expect(left).not.toContain('Middle line')
})

test('a pen drag that starts ON a picture selects it and everything down to the end', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.img1.x + 40, y: p.img1.y + 40 },
    { x: p.last.x + 20, y: p.last.y + 10 },
  )
  await expect(marked(page)).toHaveCount(2) // both pictures
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(0)
  const left = await text(page)
  expect(left).toContain('First line')
  expect(left).not.toContain('Last line')
})

test('a pen drag that ENDS on a picture includes it', async ({ page }) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.middle.x + 10, y: p.middle.y + 10 },
    { x: p.img2.x + 60, y: p.img2.y + 50 },
  )
  await expect(marked(page)).toHaveCount(1)
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
  expect(await text(page)).toContain('First line')
})

test('a drag upwards works the same way', async ({ page }) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.last.x + 20, y: p.last.y + 10 },
    { x: p.first.x + 4, y: p.first.y + 10 },
  )
  await expect(marked(page)).toHaveCount(2)
})

test('a mouse drag across a picture selects it as well (not only the pen)', async ({
  page,
}) => {
  const p = await setup(page)
  await page.mouse.move(p.first.x + p.first.width - 2, p.first.y + 10)
  await page.mouse.down()
  await page.mouse.move(p.img1.x + 20, p.img1.y + 30, { steps: 6 })
  await page.mouse.move(p.middle.x + 30, p.middle.y + 10, { steps: 6 })
  await page.mouse.up()
  await expect(marked(page)).toHaveCount(1)
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
})

test('Copy puts the picture and the text of the whole range on the clipboard', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.first.x + p.first.width - 2, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + p.middle.height / 2 },
  )
  await expect(marked(page)).toHaveCount(1)
  const html = await page.evaluate(() => {
    const data = new DataTransfer()
    const event = new ClipboardEvent('copy', {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    })
    document.querySelector('.bn-editor')!.dispatchEvent(event)
    return data.getData('text/html')
  })
  expect(html).toContain('<img')
  expect(html).toContain('Middle line')
})

test('Move: the selected range moves as one with the keyboard', async ({
  page,
}) => {
  const p = await setup(page)
  // Select the first picture and the line after it, then move them up.
  await penDrag(
    page,
    { x: p.img1.x + 40, y: p.img1.y + 40 },
    { x: p.middle.x + 30, y: p.middle.y + 10 },
  )
  await expect(marked(page)).toHaveCount(1)
  await page.keyboard.press('Control+Shift+ArrowUp')
  await page.waitForTimeout(300)
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .bn-block-outer')].map((el) =>
      el.querySelector('img') ? 'img' : (el.textContent ?? '').trim(),
    ),
  )
  // Both moved above "First line", still together (picture, then its line).
  expect(order[0]).toBe('img')
  // (an empty line may sit between them, as the editor leaves one after a picture)
  expect(order.indexOf('Middle line')).toBeLessThanOrEqual(2)
  expect(order.indexOf('First line')).toBeGreaterThan(
    order.indexOf('Middle line'),
  )
})

test('a text-only drag is left to the browser (no picture marks)', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.last.x + 2, y: p.last.y + 10 },
    { x: p.last.x + p.last.width - 2, y: p.last.y + 10 },
  )
  await expect(marked(page)).toHaveCount(0)
  expect(await blockCount(page)).toBeGreaterThan(4)
})

test('a finger still scrolls: a touch drag does not start a block selection', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.first.x + 4, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + 10 },
    'touch',
  )
  await expect(marked(page)).toHaveCount(0)
})
