import { expect, test } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Real use on an iPad size (2A.11 step 5): turn the screen, scroll the card, reload, open and close. */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

test('Professional Lasso on an iPad: turn, scroll, close and reload keep the settings', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: ['tb.lassoOptions'] }),
    )
  })
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-lasso').click()
  await page.getByTestId('v8-lasso-bar-rect').click()
  await page.getByTestId('v8-chip-lasso.opts').click()
  const c = page.getByTestId('v8-card-lasso.opts')
  await c.getByRole('button', { name: /Menu row/ }).click()
  await c.getByRole('button', { name: /Layers/ }).click()
  await c.getByTestId('v8-lasso-layers').scrollIntoViewIfNeeded()
  for (const vp of [
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    // A card open while the screen turns keeps its old place (shared Card, reported): close first.
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(c).toHaveCount(0)
    await page.setViewportSize(vp)
    // The row re-fits to the new width, then stands still.
    let last = ''
    await expect
      .poll(
        async () => {
          const now = await page
            .getByTestId('v8-row')
            .evaluate((el) => el.innerHTML.length + ':' + el.scrollWidth)
          const still = now === last
          last = now
          return still
        },
        { intervals: [150] },
      )
      .toBe(true)
    // Open the card by the chip, or by the fold when the row has no room: look again each
    // time (a slow machine re-fits the row after the first look), until the card is open.
    await expect(async () => {
      if (await c.isVisible()) return
      const chip = page.getByTestId('v8-chip-lasso.opts')
      if (await chip.isVisible()) await chip.click({ timeout: 2000 })
      else {
        await page.getByTestId('v8-row-more').click({ timeout: 2000 })
        await page
          .getByTestId('v8-card-fold.row')
          .getByRole('button', { name: 'Options' })
          .click({ timeout: 2000 })
      }
      await expect(c).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    const b = (await c.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width)
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height)
  }
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(c).toHaveCount(0)
  await page.reload()
  await page.getByTestId('v8-tool-lasso').click()
  await expect(page.getByTestId('v8-lasso-bar-rect')).toHaveAttribute(
    'aria-checked',
    'true',
  )
})
