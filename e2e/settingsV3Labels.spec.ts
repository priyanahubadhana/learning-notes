// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/** Settings v3: the Revise labels editor (open point) and the roomy glass preview. */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

test('the Revise labels row edits names and colours and adds / removes a label', async ({
  page,
}) => {
  await page.goto('/?flags=settings.v3#/settings/review')
  const row = page.locator('[data-setting-id="review.reviseLabels"]')
  await expect(row).toBeVisible()
  const items = row.locator('[data-label-id]')
  const before = await items.count()
  await row.locator('[data-label-add]').click()
  await expect(items).toHaveCount(before + 1)
  const last = items.last()
  const name = last.getByRole('textbox')
  await name.fill('Tricky')
  await name.press('Enter')
  const swatch = last.locator('.sv3-swatch').nth(1)
  const box = await swatch.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  await swatch.click()
  await expect(swatch).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(
    page
      .locator('[data-setting-id="review.reviseLabels"] [data-label-id]')
      .last()
      .getByRole('textbox'),
  ).toHaveValue('Tricky')
  await page
    .locator('[data-setting-id="review.reviseLabels"] [data-label-remove]')
    .last()
    .click()
  await expect(
    page.locator('[data-setting-id="review.reviseLabels"] [data-label-id]'),
  ).toHaveCount(before)
})

test('the glass preview has room: a 104 px stage with the bars inside it', async ({
  page,
}) => {
  await page.goto('/?flags=settings.v3#/settings/general')
  const stage = page
    .locator('[data-setting-id="general.reduceGlass"] .sv3-glass-stage')
    .first()
  await expect(stage).toBeVisible()
  const box = await stage.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(100)
  const bars = stage.locator('.sv3-glass-bar')
  for (let i = 0; i < (await bars.count()); i++) {
    const b = await bars.nth(i).boundingBox()
    expect(b!.x).toBeGreaterThanOrEqual(box!.x)
    expect(b!.x + b!.width).toBeLessThanOrEqual(box!.x + box!.width)
  }
})
