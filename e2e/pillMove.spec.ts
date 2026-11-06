import { expect, test, type Page } from '@playwright/test'
import {
  card,
  center,
  dragGrip,
  mainBar,
  openNote,
  openPill,
  option,
  pill,
  pref,
  savedPlace,
  tool,
} from './mainBarHelpers.ts'

/**
 * The options pill moves (drag its grip) and snaps to the top, left, right or
 * bottom edge; drop zones show while dragging; the place is remembered per
 * device. Press and hold a tool, slide onto an option, let go to choose it.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const room = (page: Page) =>
  page.evaluate(() => {
    const m = document.querySelector('main')!.getBoundingClientRect()
    return {
      left: m.left,
      right: m.right,
      bottom: window.innerHeight,
    }
  })

async function dropAt(page: Page, x: number, y: number) {
  await dragGrip(page, { x, y })
  await page.mouse.up()
  await page.waitForTimeout(350) // the snap animation
}

test('the default place is right under the main bar, on the page', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  const bar = (await mainBar(page).boundingBox())!
  const p = (await pill(page).boundingBox())!
  expect(p.y).toBeGreaterThanOrEqual(bar.y + bar.height)
  expect(p.y - (bar.y + bar.height)).toBeLessThan(12)
  await expect(pill(page)).toHaveAttribute('data-edge', 'top')
  // It does not cover the first line of the page: the bar made room for it.
  const line = (await page.locator('.bn-editor').boundingBox())!
  expect(line.y).toBeGreaterThanOrEqual(p.y + p.height - 1)
  expect(await savedPlace(page)).toBeNull()
})

test('drop zones show while dragging, and go when it is dropped', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  await expect(page.locator('[data-drop-zones]')).toHaveCount(0)
  const r = await room(page)
  await dragGrip(page, { x: r.right - 30, y: 450 })
  await expect(page.locator('[data-drop-zone]')).toHaveCount(4)
  await expect(page.locator('[data-drop-zone="right"]')).toHaveAttribute(
    'data-hot',
  )
  await expect(page.locator('[data-drop-zone="left"]')).not.toHaveAttribute(
    'data-hot',
    /.*/,
  )
  await page.mouse.up()
  await expect(page.locator('[data-drop-zones]')).toHaveCount(0)
})

test('snaps to the left, right, bottom and top edge, and remembers each', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  const r = await room(page)
  const bar = (await mainBar(page).boundingBox())!

  // Left: a vertical strip against the left edge.
  await dropAt(page, r.left + 24, 300)
  await expect(pill(page)).toHaveAttribute('data-edge', 'left')
  await expect(pill(page)).toHaveAttribute('aria-orientation', 'vertical')
  let p = (await pill(page).boundingBox())!
  expect(p.x).toBeLessThan(r.left + 14)
  expect(p.height).toBeGreaterThan(p.width)
  expect((await savedPlace(page))?.edge).toBe('left')
  // Moving it off the top means the page gets its room back.
  await expect(page.locator('[data-pill-room]')).toHaveCount(0)

  // Right.
  await dropAt(page, r.right - 20, 300)
  await expect(pill(page)).toHaveAttribute('data-edge', 'right')
  p = (await pill(page).boundingBox())!
  expect(p.x + p.width).toBeGreaterThan(r.right - 14)
  expect((await savedPlace(page))?.edge).toBe('right')

  // Bottom.
  await dropAt(page, 500, r.bottom - 20)
  await expect(pill(page)).toHaveAttribute('data-edge', 'bottom')
  await expect(pill(page)).toHaveAttribute('aria-orientation', 'horizontal')
  p = (await pill(page).boundingBox())!
  expect(p.y + p.height).toBeGreaterThan(r.bottom - 14)
  expect((await savedPlace(page))?.edge).toBe('bottom')

  // Top again: right under the main bar.
  await dropAt(page, 500, bar.y + bar.height + 12)
  await expect(pill(page)).toHaveAttribute('data-edge', 'top')
  p = (await pill(page).boundingBox())!
  expect(Math.abs(p.y - (bar.y + bar.height))).toBeLessThan(14)
})

test('the place survives a reload and is kept per device (not per tool)', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  const r = await room(page)
  await dropAt(page, r.right - 20, 300)
  const saved = await savedPlace(page)
  expect(saved?.edge).toBe('right')
  await page.reload()
  await openPill(page, 'Eraser', 'eraser')
  await expect(pill(page)).toHaveAttribute('data-edge', 'right')
  expect(await savedPlace(page)).toEqual(saved)
  // Settings can put it back next to the bar.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:toolbar.pillPlace', 'null'),
  )
  await page.reload()
  await openPill(page, 'Eraser', 'eraser')
  await expect(pill(page)).toHaveAttribute('data-edge', 'top')
})

test('a card opens beside a side pill, inside the screen', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  const r = await room(page)
  await dropAt(page, r.left + 24, 300)
  await option(page, 'Pen type').first().click()
  const p = (await pill(page).boundingBox())!
  const c = (await card(page).boundingBox())!
  expect(c.x).toBeGreaterThanOrEqual(p.x + p.width)
  expect(c.x + c.width).toBeLessThanOrEqual(1024)
  expect(c.y + c.height).toBeLessThanOrEqual(900)
  // On the right edge the card opens on the other side.
  await card(page).getByRole('button', { name: 'Close' }).click()
  await dropAt(page, r.right - 20, 300)
  await option(page, 'Pen type').first().click()
  const p2 = (await pill(page).boundingBox())!
  const c2 = (await card(page).boundingBox())!
  expect(c2.x + c2.width).toBeLessThanOrEqual(p2.x + 1)
})

test('the arrow keys move the grip along the edge or to another edge; Home resets', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  await page.locator('[data-pill-grip]').focus()
  await page.keyboard.press('ArrowRight')
  expect((await savedPlace(page))?.along).toBeCloseTo(0.6, 1)
  await page.keyboard.press('ArrowRight')
  await expect(pill(page)).toHaveAttribute('data-edge', 'top')
  await page.keyboard.press('ArrowDown')
  await expect(pill(page)).toHaveAttribute('data-edge', 'bottom')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(pill(page)).toHaveAttribute('data-edge', 'bottom')
  await page.keyboard.press('Home')
  await expect(pill(page)).toHaveAttribute('data-edge', 'top')
  expect(await savedPlace(page)).toBeNull()
})

test('moving the pill never moves the page or the bar', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  const bar = await mainBar(page).boundingBox()
  const editor = await page.locator('.bn-editor').boundingBox()
  const r = await room(page)
  await dragGrip(page, { x: r.left + 200, y: 600 })
  expect(await mainBar(page).boundingBox()).toEqual(bar)
  expect(await page.locator('.bn-editor').boundingBox()).toEqual(editor)
  await page.mouse.up()
})

test('press and hold a tool, slide onto an option, let go: it is chosen without lifting', async ({
  page,
}) => {
  await openNote(page)
  const pen = await center(tool(page, 'Pen'))
  await page.mouse.move(pen.x, pen.y)
  await page.mouse.down()
  await page.waitForTimeout(480) // about 350 ms
  await expect(pill(page, 'pen')).toBeVisible()
  const red = await center(option(page, 'Red'))
  await page.mouse.move(red.x, red.y, { steps: 8 })
  await expect(option(page, 'Red')).toHaveAttribute('data-hot', '')
  await page.mouse.up()
  await expect(option(page, 'Red')).toHaveAttribute('aria-pressed', 'true')
  expect(await pref(page, 'ink.pen')).toMatchObject({ colour: '#c62828' })
  // The pill stays open and the tool is the mode (the release was not a tap).
  await expect(pill(page, 'pen')).toBeVisible()
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-hot]')).toHaveCount(0)
})

test('hold and slide onto a thickness; letting go off the pill chooses nothing', async ({
  page,
}) => {
  await openNote(page)
  const hl = await center(tool(page, 'Highlighter'))
  await page.mouse.move(hl.x, hl.y)
  await page.mouse.down()
  await page.waitForTimeout(480)
  const thick = await center(option(page, 'Thick'))
  await page.mouse.move(thick.x, thick.y, { steps: 6 })
  await page.mouse.up()
  expect(await pref(page, 'ink.highlighter')).toMatchObject({ size: 2 })
  // Hold again but let go in the page: nothing is chosen.
  const eraser = await center(tool(page, 'Eraser'))
  await page.mouse.move(eraser.x, eraser.y)
  await page.mouse.down()
  await page.waitForTimeout(480)
  await expect(pill(page, 'eraser')).toBeVisible()
  await page.mouse.move(eraser.x, 600, { steps: 4 })
  await page.mouse.up()
  expect(await pref(page, 'ink.eraser')).toBeNull()
  await expect(pill(page, 'eraser')).toBeVisible()
})

test('a quick tap is a tap, not a hold', async ({ page }) => {
  await openNote(page)
  await tool(page, 'Pen').click()
  await expect(pill(page, 'pen')).toBeVisible()
  await tool(page, 'Pen').click()
  await expect(pill(page)).toHaveCount(0)
})

test('hold and slide works with a simulated Pencil (pointer type pen)', async ({
  page,
}) => {
  await openNote(page)
  const pen = await center(tool(page, 'Pen'))
  await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y)!
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 7,
          pointerType: 'pen',
          isPrimary: true,
          button: 0,
          buttons: 1,
          bubbles: true,
          clientX: x,
          clientY: y,
        }),
      )
    },
    [pen.x, pen.y],
  )
  await expect(pill(page, 'pen')).toBeVisible({ timeout: 3000 })
  const blue = await center(option(page, 'Blue'))
  await page.evaluate(
    ([x, y]) => {
      const el = document.querySelector('[data-pill-option="colour-blue"]')!
      const init = {
        pointerId: 7,
        pointerType: 'pen',
        isPrimary: true,
        bubbles: true,
        clientX: x,
        clientY: y,
      }
      document
        .querySelector('[data-bar-tool="pen"]')!
        .dispatchEvent(new PointerEvent('pointermove', init))
      document
        .querySelector('[data-bar-tool="pen"]')!
        .dispatchEvent(new PointerEvent('pointerup', { ...init, button: 0 }))
      void el
    },
    [blue.x, blue.y],
  )
  await expect(option(page, 'Blue')).toHaveAttribute('aria-pressed', 'true')
})
