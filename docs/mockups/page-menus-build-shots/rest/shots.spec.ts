// Takes the pictures for slice 12 rest. Not part of the test suite: run with
// a config whose testDir is this folder (see index.md).
import { test, type Page } from '@playwright/test'
import { createNotebook } from '../../../../e2e/helpers.ts'

const OUT = 'docs/mockups/page-menus-build-shots/rest'
const SIZES = {
  ipadL: { width: 1180, height: 820 },
  ipadP: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  pc: { width: 1440, height: 900 },
}
const THEMES = ['day', 'night', 'sepia'] as const
const LEVELS = ['beginner', 'professional'] as const

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

for (const [size, viewport] of Object.entries(SIZES)) {
  for (const theme of THEMES) {
    for (const level of LEVELS) {
      test(`${size} ${theme} ${level}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.addInitScript(
          ([l, th]) => {
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({ level: l, unlocked: [] }),
            )
            localStorage.setItem('learning-notes:theme', JSON.stringify(th))
          },
          [level, theme],
        )
        await page.goto('/?flags=page.menus')
        await createNotebook(page, 'Biology', 'Cell division')
        await page.locator('.bn-editor').click()
        await page.keyboard.type(
          'Cells divide by mitosis. Chromosomes line up first.',
        )
        const tag = `${size}-${theme}-${level}`
        const box = (await page.locator('.bn-editor p').first().boundingBox())!
        await page.mouse.click(box.x + 60, box.y + box.height / 2, {
          button: 'right',
        })
        await page.getByTestId('page-strip').waitFor()
        await shot(page, `strip-${tag}`)
        await page.getByTestId('cs-paste').click()
        await shot(page, `paste-${tag}`)
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: 'More options' }).click()
        await page.getByTestId('page-sheet').waitFor()
        await shot(page, `sheet-${tag}`)
      })
    }
  }
}
