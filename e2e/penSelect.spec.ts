// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng, startInMode } from './helpers.ts'

/**
 * The Pencil on text under the Lasso (owner's table, 7 Nov): the Lasso owns
 * the Pencil, so a drag is a loop and the words under it never react. With
 * the Text filter on, a loop selects the lines it covers (whole lines); with
 * Pictures on, the pictures too. The page is not editable while a loop is
 * drawn, so iPadOS Scribble has nothing to write in, and the Pencil guard
 * refuses deletes that arrive while the pen is down. The Pencil is
 * simulated with dispatched pointer events (pointerType "pen").
 */

test.use({ viewport: { width: 1000, height: 900 }, hasTouch: true })

/** Text, a picture, text, a picture, text: returns where each one is. */
async function setup(page: Page, lasso: Record<string, boolean> = {}) {
  const png = await solidPng(240, 120)
  await page.addInitScript((filters) => {
    localStorage.setItem(
      'learning-notes:ink.lasso',
      JSON.stringify({ shape: 'free', ink: true, ...filters }),
    )
  }, lasso)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  const editor = page.locator('.bn-editor')
  // In Pencil mode the Lasso pad lies over the page; a click on it places the caret.
  await editor.click({ force: true })
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
    // The editor leaves an empty line under the picture with the caret in it.
    await page.keyboard.type(name === 'one.png' ? 'Middle line' : 'Last line')
  }
  await page.getByRole('button', { name: 'Lasso', exact: true }).click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  await page.keyboard.press('Escape')
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
type Rect = { x: number; y: number; width: number; height: number }

/** Pointer events along `pts`, dispatched where the first one lands. */
async function penPath(page: Page, pts: Point[], type = 'pen') {
  await page.evaluate(
    ({ pts, type }) => {
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
      const el = document.elementFromPoint(pts[0].x, pts[0].y)!
      el.dispatchEvent(make('pointerdown', pts[0].x, pts[0].y))
      for (const p of pts.slice(1))
        el.dispatchEvent(make('pointermove', p.x, p.y))
      const last = pts[pts.length - 1]
      el.dispatchEvent(make('pointerup', last.x, last.y))
    },
    { pts, type },
  )
  await page.waitForTimeout(150)
}

/** A loop of small steps around the box from `a` to `b` (inside the column). */
function loopAround(a: Rect, b: Rect): Point[] {
  const x0 = Math.min(a.x, b.x) + 4
  const x1 = Math.max(a.x + a.width, b.x + b.width) - 4
  const y0 = Math.min(a.y, b.y) - 4
  const y1 = Math.max(a.y + a.height, b.y + b.height) + 4
  const corners: Point[] = [
    { x: x0, y: y1 },
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0 + 2, y: y1 - 2 },
  ]
  const out: Point[] = []
  for (let i = 1; i < corners.length; i++) {
    const p = corners[i - 1]
    const q = corners[i]
    for (let k = 0; k < 10; k++) {
      out.push({
        x: p.x + ((q.x - p.x) * k) / 10,
        y: p.y + ((q.y - p.y) * k) / 10,
      })
    }
  }
  return out
}

const marked = (page: Page) => page.locator('[data-ln-selected]')
const lines = (page: Page) => page.locator('.bn-editor .ln-sel-node')
const text = (page: Page) => page.locator('.bn-editor').innerText()
const editable = (page: Page) =>
  page.evaluate(() =>
    document.querySelector('.bn-editor')!.getAttribute('contenteditable'),
  )

test('Text filter on: a loop around two lines and the picture between selects them whole, and nothing is deleted', async ({
  page,
}) => {
  const p = await setup(page, { text: true, pictures: true })
  const before = await text(page)
  await penPath(page, loopAround(p.first, p.middle))
  await expect(marked(page)).toHaveCount(1) // the picture
  await expect(lines(page)).toHaveCount(3)
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  expect(await text(page)).toBe(before)
  expect(await editable(page)).toBe('true')
})

test('Pictures filter on, Text off: the loop takes the picture only', async ({
  page,
}) => {
  const p = await setup(page, { pictures: true })
  await penPath(page, loopAround(p.img1, p.img1))
  await expect(marked(page)).toHaveCount(1)
  // No words are selected (the picture block alone is the selection).
  await expect(page.locator('.bn-editor .ln-sel')).toHaveCount(0)
  await expect(lines(page)).toHaveCount(1)
  // The same loop with the filter off picks nothing.
  await page.keyboard.press('Escape')
})

test('ink only (the default): the words under the loop never react', async ({
  page,
}) => {
  const p = await setup(page)
  const before = await text(page)
  await penPath(page, loopAround(p.first, p.middle))
  await expect(marked(page)).toHaveCount(0)
  await expect(lines(page)).toHaveCount(0)
  expect(
    await page.evaluate(() => window.getSelection()?.toString() ?? ''),
  ).toBe('')
  expect(await text(page)).toBe(before)
})

test('while the loop is drawn the page is not editable (Scribble has nothing to write in)', async ({
  page,
}) => {
  const p = await setup(page, { text: true })
  const before = await text(page)
  const y = p.first.y + p.first.height / 2
  await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y)!
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'pen',
          pointerId: 9,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          buttons: 1,
          isPrimary: true,
        }),
      )
    },
    { x: p.first.x + 4, y },
  )
  expect(await editable(page)).toBe('false')
  await page.evaluate(
    ({ x, y }) => {
      document.querySelector('[data-ink-pad]')!.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerType: 'pen',
          pointerId: 9,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          buttons: 0,
          isPrimary: true,
        }),
      )
    },
    { x: p.first.x + 4, y },
  )
  await expect.poll(() => editable(page)).toBe('true')
  expect(await text(page)).toBe(before)
})

test('Pencil mode: a finger drag under the Lasso selects nothing (it scrolls)', async ({
  page,
}) => {
  await startInMode(page, 'pencil')
  const p = await setup(page, { text: true, pictures: true })
  await penPath(page, loopAround(p.first, p.middle), 'touch')
  await expect(marked(page)).toHaveCount(0)
  await expect(lines(page)).toHaveCount(0)
})

test('in typing mode the Pencil is left to the browser', async ({ page }) => {
  const p = await setup(page)
  await page.getByRole('button', { name: 'Text', exact: true }).click()
  await page.keyboard.press('Escape')
  const y = p.first.y + p.first.height / 2
  await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y)!
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'pen',
          pointerId: 3,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          buttons: 1,
          isPrimary: true,
        }),
      )
    },
    { x: p.first.x + 4, y },
  )
  expect(await editable(page)).toBe('true')
})

test('a pen tap on the bar works right after a loop, and the page is editable after each one', async ({
  page,
}) => {
  const p = await setup(page)
  const insert = page
    .locator('[data-main-bar]')
    .getByRole('button', { name: 'Insert', exact: true })
  const bb = (await insert.boundingBox())!
  for (let i = 0; i < 5; i++) {
    await penPath(page, loopAround(p.first, p.first))
    const prevented = await page.evaluate(
      ([px, py]) => {
        const el = document.elementFromPoint(px, py)!
        const seen: boolean[] = []
        const spy = (e: Event) => seen.push(e.defaultPrevented)
        el.addEventListener('pointerdown', spy)
        const make = (name: string) =>
          new PointerEvent(name, {
            pointerType: 'pen',
            pointerId: 4,
            clientX: px,
            clientY: py,
            bubbles: true,
            cancelable: true,
            buttons: name === 'pointerup' ? 0 : 1,
            isPrimary: true,
          })
        el.dispatchEvent(make('pointerdown'))
        el.dispatchEvent(make('pointerup'))
        el.removeEventListener('pointerdown', spy)
        return seen
      },
      [bb.x + bb.width / 2, bb.y + bb.height / 2] as const,
    )
    expect(prevented.every((v) => !v)).toBe(true)
    await page.keyboard.press('Escape') // close what the tap opened
    await expect(
      page.locator('.bn-editor[contenteditable="true"]'),
    ).toBeVisible()
  }
})
