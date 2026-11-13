import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  hideSidebar,
  makeCard,
  openSidebar,
  selectionAction,
  waitForSaved,
} from './helpers.ts'

/**
 * Pictures of Study tabs v2 (slice 15) for gate 3: Beginner / Professional x
 * Day / Night / Sepia x iPad landscape / iPad portrait / phone / PC, flag on,
 * real data. States: notebook Revise, notebook Cards, card editor, page
 * notes, page Summary, page Review. Only with SHOTS=1
 * (`SHOTS=1 PW_PORT=5315 npx playwright test studyV2Shots --project=chromium`).
 */
const OUT = 'docs/mockups/study-v2-build-shots'
const FLAGGED = '/?flags=study.v2'
const SIZES = {
  'ipad-landscape': { width: 1194, height: 834 },
  'ipad-portrait': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  pc: { width: 1336, height: 720 },
} as const
const ONLY_SIZE = process.env.SHOT_SIZE

// test-guard-reason: pictures only on purpose, same as the other Gate3Shots files
test.skip(!process.env.SHOTS, 'pictures only on request (SHOTS=1)')

const main = (page: Page) => page.getByRole('main')

async function seed(page: Page) {
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 1)
  // Back out of the answer so the next line is plain text.
  await page.keyboard.press('Enter')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.type(
    'The first heart sound is S1. The second heart sound is S2.',
  )
  await waitForSaved(page)
  await selectionAction(page, 'first heart sound', 'Key point')
  await waitForSaved(page)
  await selectionAction(page, 'second heart sound', 'Add to Summary')
  // The line is written before the reload.
  await expect(page.getByTestId('tab-count-summary')).toHaveText('1')
  await waitForSaved(page)
}

async function openNotebook(page: Page) {
  // After a reload the app first reopens the last page; tap again until the
  // notebook's tabs show.
  await expect(async () => {
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: 'Cardiology', exact: true })
      .click()
    await expect(
      main(page).getByRole('tablist', { name: 'Notebook tabs' }),
    ).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 15_000 })
  await tidyMenu(page)
}

async function openPage(page: Page) {
  const show = page.getByRole('button', { name: 'Show menu' })
  if (await show.isVisible()) await show.click()
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Heart sounds', exact: true })
    .click()
  await expect(page.locator('.bn-editor')).toContainText('second heart sound')
  await tidyMenu(page)
}

/** The menu closes again where it covers the page (iPad portrait, phone). */
async function tidyMenu(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 1000) return
  await hideSidebar(page)
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
}

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night', 'sepia'] as const)
    for (const [name, viewport] of Object.entries(SIZES)) {
      if (ONLY_SIZE && ONLY_SIZE !== name) continue
      test(`shot ${level} ${theme} ${name}`, async ({ browser }) => {
        // test-guard-reason: many pictures in one run need more time
        test.setTimeout(150_000)
        const base =
          process.env.PW_BASE ?? `http://localhost:${process.env.PW_PORT}`
        const context = await browser.newContext({
          viewport,
          hasTouch: name !== 'pc',
          isMobile: name === 'phone',
          storageState: {
            cookies: [],
            origins: [
              {
                origin: new URL(base).origin,
                localStorage: [
                  { name: 'learning-notes:devicePicker.done', value: 'true' },
                  { name: 'learning-notes:onboarding.done', value: 'true' },
                  { name: 'learning-notes:accountGate.off', value: '1' },
                  // Tips answered (no tips in the pictures).
                  {
                    name: 'learning-notes:toolbar.lastToolOffered',
                    value: 'true',
                  },
                  {
                    name: 'learning-notes:firstUse.seen',
                    value: '["lasso","writePad","layers","paperBox"]',
                  },
                  // A tap on a notebook opens its tabs.
                  {
                    name: 'learning-notes:general.openNotebookAt',
                    value: '"tabs"',
                  },
                  {
                    name: 'learning-notes:theme',
                    value: JSON.stringify(theme),
                  },
                  {
                    name: 'learning-notes:level',
                    value: JSON.stringify({ level, unlocked: [] }),
                  },
                ],
              },
            ],
          },
        })
        const page = await context.newPage()
        // No hover in the pictures: the pointer rests in a blank corner.
        const shot = async (state: string) => {
          await page.mouse.move(viewport.width - 2, viewport.height - 2)
          await page.waitForTimeout(400)
          await page.screenshot({
            path: `${OUT}/${level}-${theme}-${name}-${state}.png`,
          })
        }

        await seed(page)
        // A fresh start: no toasts or tips left from the seeding.
        await page.goto(FLAGGED)
        await closeCorner(page)
        await openNotebook(page)
        const tab = (label: string) =>
          main(page)
            .getByRole('tablist', { name: 'Notebook tabs' })
            .getByRole('tab', { name: label, exact: true })
        await tab('Revise').click()
        await expect(
          main(page).getByRole('region', { name: 'Key point' }),
        ).toContainText('first heart sound')
        await shot('1-revise')

        await tab('Cards').click()
        const row = main(page).getByRole('button', {
          name: /Which valves close/,
        })
        await expect(row).toBeVisible()
        await shot('2-cards')

        await row.click()
        const editor = page.getByTestId('study-card-editor')
        await expect(editor).toBeVisible()
        await shot('3-card-editor')
        await page.getByTestId('fb-sheet-close').click()
        await expect(editor).toHaveCount(0)

        await openPage(page)
        await shot('4-notes')

        await page.locator('[data-page-tab="summary"]').click()
        await expect(main(page).locator('[data-summary-line]')).toHaveCount(1)
        await shot('5-summary')

        await page.locator('[data-page-tab="review"]').click()
        await shot('6-page-review')
        await context.close()
      })
    }
