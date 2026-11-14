// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { lassoAround } from './groupHelpers.ts'

/**
 * Task 2B.10 first-look pictures (switch textbox.v2 ON): several boxes picked
 * with the group pill (states panel 6a) and Layout Assist (panel 6b). Light,
 * dark and sepia on an iPad upright, an iPad sideways and a phone (a phone has
 * no sheets, so no Lasso loop and no on-page Layout Assist: it shows the
 * "Layouts appear on larger screens" note). Written to
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

async function addBox(page: Page, text: string, fx: number, beside: boolean) {
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const sheetBox = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetBox.count()) ? await sheetBox.boundingBox() : null
  const n = await page.locator(EXTRA).count()
  const last = n
    ? (await page
        .locator(EXTRA)
        .nth(n - 1)
        .boundingBox())!
    : null
  const y = !last
    ? main.y + main.height + 70
    : beside
      ? last.y + 10
      : last.y + last.height + 60
  await page.mouse.click(sheet ? sheet.x + sheet.width * fx : 150, y)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(page.locator(EXTRA).nth(n).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
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
      await addBox(
        page,
        'Photosynthesis: light, water and CO2 make sugar',
        0.08,
        false,
      )
      await addBox(
        page,
        'Key words: chlorophyll, stomata, glucose',
        0.55,
        name === 'phone' ? false : true,
      )
      await addBox(page, 'Why it matters: food chains start here', 0.12, false)
      await addBox(
        page,
        'Quiz me: where does it happen?',
        0.55,
        name === 'phone' ? false : true,
      )
      if (name === 'phone') {
        await page.getByTestId('main-layout').click()
        await expect(
          page.getByText('Layouts appear on larger screens'),
        ).toBeVisible()
        for (const [label, th] of THEMES) {
          await theme(page, th)
          await page.screenshot({ path: `${OUT()}/assist-phone-${label}.png` })
        }
        return
      }
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
