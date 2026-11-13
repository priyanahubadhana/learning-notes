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
 * Extra pictures of Study tabs v2 (slice 15) for gate 3: the empty states
 * (Cards, Summary, Revise), an active Filter chip, a saved-filter chip, an
 * open Filter list, the Labels panel (Professional) and the Prompt library
 * Pick tiles. Dark and light, phone and iPad portrait. Only with SHOTS=1.
 */
const OUT = 'docs/mockups/study-v2-build-shots'
const FLAGGED = '/?flags=study.v2'
const SIZES = {
  'ipad-portrait': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const
const ONLY_SIZE = process.env.SHOT_SIZE

// test-guard-reason: pictures only on purpose, same as the other Gate3Shots files
test.skip(!process.env.SHOTS, 'pictures only on request (SHOTS=1)')

const main = (page: Page) => page.getByRole('main')

async function seed(page: Page, part: 'empty' | 'data') {
  await page.goto(FLAGGED)
  if (part === 'empty') {
    await createNotebook(page, 'Blank book', 'Blank page')
    return
  }
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
  await waitForSaved(page)
}

async function openNotebook(page: Page, name: string) {
  // After a reload the app first reopens the last page; tap again until the
  // notebook's tabs show.
  await expect(async () => {
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name, exact: true })
      .click()
    await expect(
      main(page).getByRole('tablist', { name: 'Notebook tabs' }),
    ).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 15_000 })
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
  for (const theme of ['day', 'night'] as const)
    for (const [name, viewport] of Object.entries(SIZES)) {
      if (ONLY_SIZE && ONLY_SIZE !== name) continue
      for (const part of ['empty', 'data'] as const)
        test(`extra shot ${level} ${theme} ${name} ${part}`, async ({
          browser,
        }) => {
          // test-guard-reason: many pictures in one run need more time
          test.setTimeout(180_000)
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
          const shot = async (state: string) => {
            await page.mouse.move(viewport.width - 2, viewport.height - 2)
            await page.waitForTimeout(400)
            await page.screenshot({
              path: `${OUT}/${level}-${theme}-${name}-${state}.png`,
            })
          }
          const tab = (label: string) =>
            main(page)
              .getByRole('tablist', { name: 'Notebook tabs' })
              .getByRole('tab', { name: label, exact: true })

          await seed(page, part)
          await page.goto(FLAGGED)
          await closeCorner(page)

          if (part === 'empty') {
            // Empty states: a notebook with one blank page.
            await openNotebook(page, 'Blank book')
            await tab('Cards').click()
            await expect(main(page).getByTestId('cards-empty')).toBeVisible()
            await shot('7-empty-cards')
            await tab('Summary').click()
            await expect(main(page).getByTestId('summary-empty')).toBeVisible()
            await shot('8-empty-summary')
            await tab('Revise').click()
            await expect(main(page).getByTestId('revise-empty')).toBeVisible()
            await shot('9-empty-revise')
            await context.close()
            return
          }

          // Labels panel (Professional) on a Revise with a Key point.
          await openNotebook(page, 'Cardiology')
          if (level === 'professional') {
            await tab('Revise').click()
            await page
              .getByRole('button', { name: 'Labels', exact: true })
              .click()
            const labels = page.getByTestId('revise-labels')
            await expect(labels).toBeVisible()
            // One custom label, so its remove ✕ shows in the picture.
            await labels.getByRole('button', { name: /Add label/ }).click()
            await expect(labels.locator('.sv3-labels-item')).toHaveCount(5)
            await shot('10-labels')
            await page.getByTestId('fb-sheet-close').click()
            await expect(page.getByTestId('revise-labels')).toHaveCount(0)
          }

          // Filter chips and the open list (Professional).
          await tab('Cards').click()
          await expect(tab('Cards')).toHaveAttribute('aria-selected', 'true')
          if (level === 'professional') {
            const filter = page.getByTestId('study-header-filter')
            await filter.click()
            await shot('11-filter-list-open')
            await page.getByRole('menuitemradio', { name: 'Paused' }).click()
            await expect(main(page).getByTestId('cards-empty')).toBeVisible()
            await shot('12-filter-chip')
            await page
              .getByRole('button', { name: 'Remove filter Paused' })
              .click()
            await filter.click()
            await page.getByRole('menuitemradio', { name: 'New' }).click()
            await filter.click()
            await page.getByRole('menuitem', { name: 'Save filter' }).click()
            await shot('13-saved-chip')
          } else {
            await page.getByTestId('study-header-sort').click()
            await shot('11-sort-list-open')
          }
          await page.keyboard.press('Escape')

          // Prompt library Pick tiles.
          await page
            .getByRole('navigation', { name: 'Spaces' })
            .getByRole('button', { name: 'Space: Library' })
            .click()
          await page.getByTestId('ai-prompts').click()
          await expect(page.getByTestId('starter-tile').first()).toBeVisible()
          await shot('14-pick-tiles')
          await context.close()
        })
    }
