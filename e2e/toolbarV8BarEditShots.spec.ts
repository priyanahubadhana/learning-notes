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
const OUT = process.env.SHOTS_OUT ?? 'screenshots/2a15'
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
  await hideSidebar(page)
  if (size.width === 820) await closeDockedSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expect(page.getByText('Switched to Pencil mode')).toHaveCount(0, {
    timeout: 20_000,
  })
}

/** iPad upright: the sidebar is docked; close it with the top bar's button. */
async function closeDockedSidebar(page: Page) {
  const aside = page.locator('aside')
  if (!(await aside.isVisible())) return
  await page
    .locator('button[aria-controls="sidebar"][aria-expanded="true"]:visible')
    .click()
  await expect(aside).toBeHidden()
}

/** A shot with the pointer parked away from every control (no hover ring). */
async function shot(page: Page, path: string) {
  await page.mouse.move(2, 2)
  await page.waitForTimeout(300)
  await page.screenshot({ path })
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
        await shot(page, `${OUT}/bar-${tag}.png`)
        await startEditing(page)
        // One tool removed and Highlighter added: the live state a person sees.
        await page.getByTestId('v8-edit-remove-lasso').click()
        await page.getByTestId('v8-edit-tile-highlighter').click()
        await page.waitForTimeout(500)
        await shot(page, `${OUT}/edit-${tag}.png`)
        await page.getByTestId('v8-edit-done').click()
        await expect(page.getByRole('status')).toBeVisible()
        await page.waitForTimeout(400)
        await shot(page, `${OUT}/done-${tag}.png`)
      })
    }
  }
}
