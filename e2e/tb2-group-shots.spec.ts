// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { lassoAround } from './groupHelpers.ts'

/**
 * Task 2B.10 first-look pictures (switch textbox.v2 ON): several boxes picked
 * with the group pill (states panel 6a) and Layout Assist (panel 6b). Light,
 * dark and sepia on an iPad upright, an iPad sideways and a phone (a phone has
 * no sheets, so no Lasso loop, no group pill and no Layout button: its picture
 * only shows the page). Written to
 * screenshots/phase-2b/2b10-group/<project>/ (see its index.md). The theme is
 * set on the page and checked before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/phase-2b/2b10-group/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
  ['sepia', 'sepia'],
]
const SIZES: [
  string,
  { width: number; height: number },
  'computer' | 'touch',
][] = [
  ['ipad-upright', { width: 820, height: 1180 }, 'computer'],
  ['ipad-sideways', { width: 1180, height: 820 }, 'computer'],
  ['phone', { width: 390, height: 844 }, 'touch'],
]

async function theme(page: Page, th: string) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    th,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', th)
  await page.waitForTimeout(1000)
}

/** A box clicked into the paper: `fx` across the sheet, `down` under `under` (the page text when none). */
async function addBox(
  page: Page,
  text: string,
  fx: number,
  down: number,
  under?: Locator,
) {
  const main = (await (
    under ?? page.locator('[data-paper-box="main"]')
  ).boundingBox())!
  const sheetBox = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetBox.count()) ? await sheetBox.boundingBox() : null
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(
    sheet ? sheet.x + sheet.width * fx : 150,
    main.y + main.height + down,
  )
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(page.locator(EXTRA).nth(n).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return page.locator(EXTRA).nth(n)
}

for (const [name, vp, mode] of SIZES) {
  test(
    '2B.10 pictures: group pill and Layout Assist, ' + name,
    async ({ page }) => {
      mkdirSync(OUT(), { recursive: true })
      await page.addInitScript(() =>
        localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
      )
      await startInMode(page, mode)
      await page.setViewportSize(vp)
      await page.goto('/')
      await createNotebook(page, 'Shots', 'Layout')
      await typeInEditor(page, 'Biology')
      const a = await addBox(page, 'Photosynthesis', 0.12, 40)
      if (name === 'phone') {
        // A phone has no sheets: no Lasso loop, no group pill, no on-page Layout Assist.
        for (const [label, th] of THEMES) {
          await theme(page, th)
          await page.screenshot({ path: `${OUT()}/page-phone-${label}.png` })
        }
        return
      }
      const b = await addBox(page, 'Key words', 0.55, 40)
      await addBox(page, 'Why it matters', 0.12, 40, a)
      await addBox(page, 'Quiz me', 0.55, 40, b)
      await lassoAround(page, [0, 1])
      await expect(page.locator('[data-group-pill]')).toContainText('2 boxes')
      for (const [label, th] of THEMES) {
        await theme(page, th)
        await page.screenshot({ path: `${OUT()}/group-${name}-${label}.png` })
      }
      await page.keyboard.press('Escape')
      await page.getByTestId('main-layout').click()
      await expect(page.locator('[data-layout-assist]')).toBeVisible()
      await page
        .locator('[data-layout-strip]')
        .getByRole('button', { name: 'Two columns' })
        .click()
      await page.waitForTimeout(900)
      for (const [label, th] of THEMES) {
        await theme(page, th)
        await page.screenshot({ path: `${OUT()}/assist-${name}-${label}.png` })
      }
    },
  )
}
