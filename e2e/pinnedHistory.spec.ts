import { expect, test } from '@playwright/test'
import { mainBar, openNote, tool } from './mainBarHelpers.ts'

/**
 * Undo and Redo are pinned at the left of the main bar and of the full
 * ribbon, outside the part that scrolls, on every width (iPad finding, 9 Nov).
 */
const keys = {
  'toolbar.extras': ['bold', 'italic', 'underline', 'code', 'link'],
}

for (const width of [320, 560, 820, 1336]) {
  test.describe(`width ${width}`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true })

    test('main bar: Undo and Redo do not move when the tools scroll', async ({
      page,
    }) => {
      await openNote(page, 'touch', keys)
      const undo = tool(page, 'Undo')
      await expect(undo).toBeVisible()
      await expect(tool(page, 'Redo')).toBeVisible()
      const before = (await undo.boundingBox())!
      await mainBar(page)
        .locator('.overflow-x-auto')
        .first()
        .evaluate((el) => (el.scrollLeft = 9999))
      const after = (await undo.boundingBox())!
      expect(after.x).toBe(before.x)
      expect(after.x + after.width).toBeLessThanOrEqual(width)
    })

    test('ribbon: Undo and Redo stay at the left of the tab row', async ({
      page,
    }) => {
      await openNote(page, 'touch', { ...keys, 'toolbar.ribbon': true })
      const undo = page.locator('[data-slot="history"]').first()
      await expect(undo).toBeVisible()
      const tab = (await page.getByRole('tab', { name: 'Home' }).boundingBox())!
      const h = (await undo.boundingBox())!
      expect(h.x).toBeLessThan(tab.x)
      await expect(
        page.locator('[data-ribbon]').getByRole('button', { name: 'Undo' }),
      ).toHaveCount(1)
    })
  })
}
