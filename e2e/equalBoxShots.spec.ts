import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { addBox } from './cBoxesHelpers.ts'

/** Equal boxes: the first box and a new box on one page, iPad sideways, light and dark, plain and selected. Pictures in screenshots/equal-box/. */
test.use({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

for (const theme of ['light', 'dark'] as const) {
  test(`EB-shot ${theme}`, async ({ page }) => {
    mkdirSync('screenshots/equal-box', { recursive: true })
    await startInMode(page, 'computer')
    await page.addInitScript((th) => {
      localStorage.setItem(
        'learning-notes:flags',
        JSON.stringify([
          'foundation.shell',
          'toolbar.v8',
          'toolbar.menu',
          'page.menus',
          'textbox.v2',
          'settings.v3',
        ]),
      )
      localStorage.setItem('learning-notes:theme', JSON.stringify(th))
    }, theme)
    await page.goto('/')
    await createNotebook(page, 'Paper', 'Equal boxes')
    await typeInEditor(page, 'First box')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    const box = await addBox(page, ['New box'], 0.3, 40)
    const shot = (name: string) =>
      page.screenshot({
        path: `screenshots/equal-box/${name}-sideways-${theme}.png`,
      })
    await shot('plain')
    await pickBox(page, box)
    await shot('new-selected')
  })
}
