// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { png } from './fixtures/png.ts'
import { line, paintedBox, stroke } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * iPad fix 8 (9 Nov): ink drawn on a picture is anchored to the picture, so
 * it stays on the same spot of the picture when the picture is resized.
 */
test.use({ viewport: { width: 1100, height: 1000 }, hasTouch: true })

test('ink on a picture scales and stays with it when the picture is resized', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  // The Lasso's pad lies over the text (the page may now be scrolled to its
  // top): the Text tool lets the click reach the editor.
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer: png(400, 200),
  })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await page.waitForTimeout(900)

  await tool(page, 'Pen').click()
  await page.keyboard.press('Escape')
  const b = (await img.boundingBox())!
  const cx = b.x + b.width * 0.5
  const cy = b.y + b.height * 0.5
  await stroke(page, line([cx - 30, cy], [cx + 30, cy], 12))
  await page.waitForTimeout(200)
  const rel = async () => {
    const ib = (await img.boundingBox())!
    const pb = (await paintedBox(page, 'ink'))!
    const c = await page.locator('[data-ink-canvases]').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top }
    })
    const midX = c.left + (pb.x0 + pb.x1) / 2 / pb.dpr
    const midY = c.top + (pb.y0 + pb.y1) / 2 / pb.dpr
    return {
      fx: (midX - ib.x) / ib.width,
      fy: (midY - ib.y) / ib.height,
      w: ib.width,
    }
  }
  const before = await rel()
  expect(before.fx).toBeGreaterThan(0.35)
  expect(before.fx).toBeLessThan(0.65)

  // Resize the picture by its corner (Lasso/Text tool: handles show on tap).
  await tool(page, 'Text').click()
  await img.click()
  const h = (await page.locator('[data-picture-handle="se"]').boundingBox())!
  const x = h.x + h.width / 2
  const y = h.y + h.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 80, y, { steps: 6 })
  await page.mouse.up()
  await expect
    .poll(async () => (await img.boundingBox())!.width)
    .toBeLessThan(before.w - 40)
  await page.waitForTimeout(400)
  const after = await rel()
  expect(Math.abs(after.fx - before.fx)).toBeLessThan(0.08)
  expect(Math.abs(after.fy - before.fy)).toBeLessThan(0.12)
})
