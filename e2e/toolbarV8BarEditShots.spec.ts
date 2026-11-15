// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * First-look pictures for 2A.15, editing the tool bar (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV8BarEditShots.spec.ts`).
 * Light and dark, Beginner and Professional, iPad upright and sideways, phone.
 */
const OUT = 'screenshots/2a15'
// test-guard-reason: pictures only on purpose, same as the other Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-sideways': { width: 1180, height: 820 },
  'ipad-upright': { width: 820, height: 1180 },
} as const

async function setUp(
  page: Page,
  theme: 'day' | 'night',
  size: { width: number; height: number },
  pro: boolean,
) {
  await page.addInitScript(
    (l) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: [] }),
      )
    },
    pro ? 'professional' : 'beginner',
  )
  await startInTheme(page, theme)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  if (size.width === 820) await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expect(page.getByText('Switched to Pencil mode')).toHaveCount(0, {
    timeout: 20_000,
  })
}

async function startEditing(page: Page) {
  const box = (await page.getByTestId('v8-tool-pen').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75)
  await page.mouse.down()
  await page.waitForTimeout(1300)
  await page.mouse.up()
  await expect(page.getByTestId('v8-edit-bar')).toBeVisible()
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night'] as const) {
    for (const pro of [false, true]) {
      const level = pro ? 'professional' : 'beginner'
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: several pictures in one run need more time
        test.setTimeout(90_000)
        await setUp(page, theme, size, pro)
        const tag = `${dev}-${theme}-${level}`
        await page.screenshot({ path: `${OUT}/bar-${tag}.png` })
        await startEditing(page)
        // One tool removed and Highlighter added: the live state a person sees.
        await page.getByTestId('v8-edit-remove-shapes').click()
        await page.getByTestId('v8-edit-tile-highlighter').click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${OUT}/edit-${tag}.png` })
        await page.getByTestId('v8-edit-done').click()
        await expect(page.getByRole('status')).toBeVisible()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${OUT}/done-${tag}.png` })
      })
    }
  }
}
