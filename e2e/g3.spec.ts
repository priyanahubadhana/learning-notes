// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng } from './helpers.ts'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'

/** Wave 4 part B (G3): picture resize by its corners, and drawing labels. */

test.use({ viewport: { width: 1100, height: 1000 }, hasTouch: true })

async function pageWithPicture(page: Page) {
  const png = await solidPng(400, 200)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png })
  const img = page.locator('.bn-editor img')
  await expect(img).toBeVisible()
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0)
  return img
}

test('dragging a corner resizes the picture and it stays after a reload', async ({
  page,
}) => {
  const img = await pageWithPicture(page)
  const before = (await img.boundingBox())!.width
  await img.click()
  const handle = page.locator('[data-picture-handle="se"]')
  await expect(handle).toBeVisible()
  const h = (await handle.boundingBox())!
  const x = h.x + h.width / 2
  const y = h.y + h.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 60, y, { steps: 6 })
  await page.mouse.move(x - 120, y, { steps: 6 })
  await page.mouse.up()
  await expect
    .poll(async () => (await img.boundingBox())!.width)
    .toBeLessThan(before - 80)
  const after = (await img.boundingBox())!.width
  expect(after).toBeGreaterThan(60)

  await page.waitForTimeout(900) // autosave
  await page.reload()
  await expect(page.locator('.bn-editor img')).toBeVisible()
  await expect
    .poll(
      async () => (await page.locator('.bn-editor img').boundingBox())!.width,
    )
    .toBeCloseTo(after, -1)
})

test('a typed name on a drawing makes Search find it', async ({ page }) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(800)
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 400, y], [box.x + 640, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const dy = (await textBox(page)).y - box.y
  const corners: [number, number][] = [
    [box.x + 380, y + dy + 25],
    [box.x + 380, y + dy - 25],
    [box.x + 660, y + dy - 25],
    [box.x + 660, y + dy + 25],
    [box.x + 382, y + dy + 23],
  ]
  await stroke(
    page,
    corners.slice(1).flatMap((c, i) => line(corners[i], c, 10)),
  )
  await page.locator('[data-ink-action="more"]').click()
  await page.locator('[data-ink-action="label"]').click()
  await page.locator('[data-ink-label-input]').fill('Ventricle sketch for exam')
  await page.getByRole('button', { name: 'Save name' }).click()
  await page.waitForTimeout(900) // the ink saves a moment later

  await page.keyboard.press('Control+K')
  const popup = page.getByRole('dialog', { name: 'Search' })
  await expect(popup).toBeVisible()
  await popup
    .getByRole('combobox')
    .or(popup.getByRole('textbox'))
    .first()
    .fill('ventricle')
  await expect(popup).toContainText('Ventricle sketch for exam')
})
