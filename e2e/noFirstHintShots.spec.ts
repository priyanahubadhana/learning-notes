// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { installRealPen, realPen } from './realPen.ts'
import { rect } from './cBoxesHelpers.ts'

/** First-look pictures of "no hint in the first box" (owner 19 Nov): screenshots/no-first-hint/. */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FLAGS = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'journal.monthRepair',
]
const MAIN = '[data-paper-box="main"]'
const SIZES = {
  'ipad-sideways': { width: 1180, height: 820 },
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const

for (const theme of ['light', 'dark'] as const)
  for (const level of ['Beginner', 'Professional'] as const)
    for (const [size, vp] of Object.entries(SIZES)) {
      test(`pictures: ${theme}, ${level}, ${size}`, async ({ page }, info) => {
        await installRealPen(page)
        await page.addInitScript(
          (f) =>
            localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
          FLAGS,
        )
        await startInMode(page, 'pencil')
        await page.goto('/')
        await createNotebook(page, 'Paper', 'Old page')
        await typeInEditor(page, 'Old words')
        await addPage(page, 'Paper', 'No hint')
        await page.setViewportSize(vp)
        await page.emulateMedia({ colorScheme: theme })
        await page.evaluate(
          (th) => document.documentElement.setAttribute('data-theme', th),
          theme === 'dark' ? 'night' : 'light',
        )
        await page
          .getByRole('button', { name: level, exact: true })
          .first()
          .click()
        await page.waitForTimeout(600)
        await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
        await expect(page.getByText('Type, or tap anywhere')).toHaveCount(0)
        const b = await rect(page.locator(MAIN + ' .bn-block-content').first())
        await realPen(page, [{ x: b.x + 6, y: b.y + 8 }])
        await page.waitForTimeout(500)
        await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
        mkdirSync('screenshots/no-first-hint', { recursive: true })
        await page.screenshot({
          path: `screenshots/no-first-hint/${info.project.name}-empty-first-box-${theme}-${level.toLowerCase()}-${size}.png`,
        })
      })
    }
