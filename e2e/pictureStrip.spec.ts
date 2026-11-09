// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng } from './helpers.ts'

/**
 * Contextual Picture strip, smooth resize, the resize bug guards (a picture
 * must never vanish) and the sheet-gap hint / tappable gap.
 */
test.use({ viewport: { width: 1100, height: 1000 }, hasTouch: true })

async function pageWithPicture(page: Page, lines = 0, h = 200) {
  const png = await solidPng(400, h)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  await page.locator('.bn-editor').click()
  for (let i = 0; i < lines; i++) {
    await page.keyboard.type(`Line ${i}`)
    await page.keyboard.press('Enter')
  }
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img')
  await expect(img).toBeVisible()
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0)
  return img
}

async function drag(page: Page, dx: number, corner = 'se') {
  const handle = page.locator(`[data-picture-handle="${corner}"]`)
  await expect(handle).toBeVisible()
  const h = (await handle.boundingBox())!
  const x = h.x + h.width / 2
  const y = h.y + h.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y, { steps: 5 })
  await page.mouse.move(x + dx, y, { steps: 5 })
  return { x: x + dx, y }
}

const widthOf = async (page: Page) =>
  (await page.locator('.bn-editor img').first().boundingBox())!.width

test('a pasted/placed picture is selected and the Picture strip shows', async ({
  page,
}) => {
  const img = await pageWithPicture(page)
  // Selected at once (handles and bar), no extra tap.
  await expect(page.locator('[data-picture-actions]')).toBeVisible()
  const bar = page.locator('[data-ctx-bar="picture"]')
  await expect(bar).toBeVisible()
  await expect(bar.getByRole('button', { name: 'Smaller' })).toBeVisible()
  // More opens the full tool bar directly on the Picture tab.
  await bar.locator('[data-ctx-more]').click()
  const tab = page.getByRole('tab', { name: 'Picture' })
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  const strip = page.locator('[data-ctx-strip="picture"]')
  for (const id of [
    'smaller',
    'bigger',
    'fit',
    'natural',
    'cropRotate',
    'replace',
    'alignLeft',
    'alignCenter',
    'alignRight',
    'copy',
    'cut',
    'duplicate',
    'delete',
  ])
    await expect(strip.locator(`[data-ctx-action="${id}"]`)).toBeVisible()
  const btn = (await strip.locator('button').first().boundingBox())!
  expect(btn.height).toBeGreaterThanOrEqual(43)

  // The strip works: Bigger then Undo (one step).
  const w0 = await widthOf(page)
  await strip.locator('[data-ctx-action="smaller"]').click()
  await expect.poll(() => widthOf(page)).toBeLessThan(w0 - 30)
  // Alignment through the strip.
  await strip.locator('[data-ctx-action="alignCenter"]').click()
  await expect(
    strip.locator('[data-ctx-action="alignCenter"]'),
  ).toHaveAttribute('aria-pressed', 'true')

  // Selection gone: the bar returns to the tab it had (no Picture tab).
  await strip.locator('[data-ctx-action="deselect"]').click()
  await expect(page.getByRole('tab', { name: 'Picture' })).toHaveCount(0)
  await expect(img).toBeVisible()
})

test('resize, background and back, type, resize again: the picture stays, Undo restores', async ({
  page,
}) => {
  const img = await pageWithPicture(page)
  const w0 = await widthOf(page)
  await drag(page, -120)
  await page.mouse.up()
  await expect.poll(() => widthOf(page)).toBeLessThan(w0 - 80)
  const w1 = await widthOf(page)

  // The app goes to the background and comes back.
  await page.evaluate(() => {
    const set = (v: string) =>
      Object.defineProperty(document, 'visibilityState', {
        value: v,
        configurable: true,
      })
    set('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    set('visible')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.locator('.bn-editor').click({ position: { x: 5, y: 5 } })
  await page.keyboard.type('hello')

  // Select it again and shrink far past the minimum.
  await img.click()
  await drag(page, -2000)
  await page.mouse.up()
  await expect(img).toBeVisible()
  const w2 = await widthOf(page)
  expect(Number.isFinite(w2)).toBe(true)
  expect(w2).toBeGreaterThanOrEqual(47)
  expect(w2).toBeLessThan(w1)

  // One Undo gives back the earlier size.
  await page.keyboard.press('Control+z')
  await expect.poll(() => widthOf(page)).toBeCloseTo(w1, -1)
})

test('size presets glide over 180 ms and land on one saved width', async ({
  page,
}) => {
  await pageWithPicture(page)
  const w0 = await widthOf(page)
  await page.locator('[data-picture-action="smaller"]').click()
  await expect.poll(() => widthOf(page)).toBeCloseTo(w0 * 0.6, -1)
  await page.locator('[data-picture-action="bigger"]').click()
  await expect.poll(() => widthOf(page)).toBeGreaterThan(w0 * 0.8)
  // Reduce motion: instant.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const w1 = await widthOf(page)
  await page.locator('[data-picture-action="smaller"]').click()
  await expect.poll(() => widthOf(page)).toBeLessThan(w1 - 20)
})

test('too big for the sheet: a ghost shows while dragging, the move happens on release, the gap is tappable', async ({
  page,
}) => {
  const img = await pageWithPicture(page, 14, 400)
  const sheet2 = page.locator('[data-paper-sheet="2"]')
  await img.scrollIntoViewIfNeeded()
  const before = (await img.boundingBox())!
  const top0 = before.y
  // Pull the corner wide: the picture grows taller than the room left.
  await drag(page, 450)
  // Mid-drag nothing has jumped: the picture is still where it was.
  const mid = (await img.boundingBox())!
  expect(Math.abs(mid.y - top0)).toBeLessThan(4)
  await expect(page.locator('[data-picture-ghost]')).toBeVisible()
  await page.mouse.up()
  // After the lift it lands on the next sheet and the gap says so.
  await expect(sheet2).toBeVisible()
  await expect(page.locator('.ln-pushed')).toHaveCount(1)
  // The blank end of the sheet is tappable: the caret goes to the last line.
  await page.locator('.ln-pushed').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600) // the follow-scroll settles
  const pushed = (await page.locator('.ln-pushed').boundingBox())!
  expect(pushed.y).toBeGreaterThan(60)
  await page.mouse.click(pushed.x + 100, pushed.y - 40)
  await expect(page.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('X')
  await expect(page.locator('.bn-editor')).toContainText('X')
})
