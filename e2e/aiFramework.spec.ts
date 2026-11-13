// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { showSidebar, sidebar } from './helpers.ts'

/**
 * AF-20..AF-23: the Build screen behind the flag `ai.framework`. Pick steps
 * -> paste the answers -> run -> preview -> apply -> undo -> redo -> Activity.
 * No AI or network call: the answers are typed in by the test.
 */

const PAGE_ANSWER = JSON.stringify({
  page: {
    title: 'Habits',
    summary: 'How habits form.',
    blocks: [
      { type: 'heading', level: 1, text: 'Habits' },
      { type: 'paragraph', text: 'A **habit** is a loop.' },
    ],
  },
})
const CARDS_ANSWER = JSON.stringify({
  cards: [
    { kind: 'qa', q: 'What starts a habit loop?', a: 'The cue.' },
    { kind: 'qa', q: 'What ends it?', a: 'The reward.' },
  ],
})

const FLAGGED = '/?flags=ai.framework#/settings/ai'

async function pasteAnswer(page: Page, text: string) {
  await page.getByTestId('aifw-answer').fill(text)
  await page.getByTestId('aifw-submit').click()
}

async function flow(page: Page) {
  await page.goto(FLAGGED)
  await expect(page.getByTestId('aifw-entry')).toBeVisible()
  await page.getByTestId('aifw-open').click()
  await expect(page.getByTestId('aifw-build')).toBeVisible()

  // AF-20: destination, steps from the catalog, reorder / untick / remove.
  await expect(page.getByTestId('aifw-start')).toBeDisabled()
  await page.getByTestId('aifw-dest-name').fill('Habits')
  await page.getByTestId('aifw-pick-cards.make_recall').click()
  await expect(page.getByTestId('aifw-step-problem')).toBeVisible() // needs a page
  await expect(page.getByTestId('aifw-start')).toBeDisabled()
  await page.getByTestId('aifw-pick-pages.write_notes').click()
  await page.getByTestId('aifw-pick-styles.apply').click()
  const steps = page.getByTestId('aifw-step')
  await expect(steps).toHaveCount(3)
  // Move Write notes above the cards; the warning goes away.
  await steps.nth(1).getByTestId('aifw-step-up').click()
  await expect(steps.nth(0)).toHaveAttribute('data-tool', 'pages.write_notes')
  await expect(page.getByTestId('aifw-step-problem')).toHaveCount(0)
  // Untick and remove the style step.
  await steps.nth(2).getByTestId('aifw-step-on').uncheck()
  await expect(page.getByTestId('aifw-start')).toBeEnabled()
  await steps.nth(2).getByTestId('aifw-step-remove').click()
  await expect(steps).toHaveCount(2)
  await steps.nth(1).getByTestId('aifw-step-count').fill('2')

  // AF-21 / AF-22: run; the first step waits for a pasted answer.
  await page.getByTestId('aifw-start').click()
  const title = page.getByTestId('aifw-run-title')
  await expect(title).toContainText('Habits')
  await expect(page.getByTestId('aifw-paste')).toBeVisible()
  await expect(page.getByTestId('aifw-prompt')).toHaveValue(/"page"/)
  const stepStates = page.getByTestId('aifw-step-state')
  await expect(stepStates.nth(0)).toHaveText('Done') // the notebook step
  await expect(stepStates.nth(1)).toHaveText('Working')
  await expect(stepStates.nth(2)).toHaveText('Waiting')
  // A wrong answer is refused with reasons; the step keeps waiting.
  await pasteAnswer(page, 'this is not json')
  await expect(page.getByTestId('aifw-paste-problems')).toBeVisible()
  await pasteAnswer(
    page,
    JSON.stringify({ page: { title: 'T', blocks: [{ type: 'nope' }] } }),
  )
  await expect(page.getByTestId('aifw-paste-problems')).toContainText(
    '/page/blocks/0/type',
  )
  await pasteAnswer(page, PAGE_ANSWER)
  await expect(page.getByTestId('aifw-paste')).toHaveAttribute(
    'data-step',
    's3',
  )
  await pasteAnswer(page, '```json\n' + CARDS_ANSWER + '\n```')

  // Preview: nothing is saved yet.
  await expect(page.getByTestId('aifw-preview')).toBeVisible()
  await expect(
    page
      .getByTestId('aifw-preview-line')
      .filter({ hasText: /^New (notebook|page): Habits$/ }),
  ).toHaveCount(2) // the notebook and the page
  await expect(stepStates).toHaveText(['Done', 'Done', 'Done'])

  // Apply: done card and a toast with Undo that does not cover the title.
  await page.getByTestId('aifw-apply').click()
  await expect(page.getByTestId('aifw-done')).toBeVisible()
  const toast = page.getByTestId('aifw-toast')
  await expect(toast).toContainText('Applied')
  const t = await toast.boundingBox()
  const h = await title.boundingBox()
  expect(t && h).toBeTruthy()
  const overlaps =
    t!.x < h!.x + h!.width &&
    t!.x + t!.width > h!.x &&
    t!.y < h!.y + h!.height &&
    t!.y + t!.height > h!.y
  expect(overlaps).toBe(false)
}

test.describe('AI framework: Build (flag on)', () => {
  test.describe('PC', () => {
    test.use({ viewport: { width: 1200, height: 900 } })

    test('pick steps, paste, run, preview, apply, undo, redo, Activity', async ({
      page,
    }) => {
      await flow(page)

      // The toast's Undo takes the whole job back.
      await page.getByTestId('aifw-toast-action').click()
      await expect(page.getByTestId('aifw-redo')).toBeVisible()
      await expect(page.getByTestId('aifw-toast')).toContainText('Undone')
      await page.getByTestId('aifw-close').click() // the sheet covers the app
      await showSidebar(page)
      await expect(sidebar(page).getByText('Habits')).toHaveCount(0)

      // Activity: one row with the time and destination; Redo from there.
      // (A hash change, not a reload: jobs live in memory.)
      await page.evaluate(() => {
        location.hash = '#/settings/ai'
      })
      await page.getByTestId('aifw-open').click()
      await page.getByTestId('aifw-tab-activity').click()
      const rows = page.getByTestId('aifw-activity-row')
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText('Habits')
      await expect(rows.first()).toContainText('New notebook “Habits”')
      await expect(rows.first().locator('time')).toBeVisible()
      await expect(rows.first()).toHaveAttribute('data-state', 'undone')
      await rows.first().getByTestId('aifw-activity-redo').click()
      await expect(rows.first()).toHaveAttribute('data-state', 'applied')
      await page.getByTestId('aifw-close').click()
      await showSidebar(page)
      await expect(
        sidebar(page)
          .getByRole('button', { name: 'Habits', exact: true })
          .first(),
      ).toBeVisible()
    })

    test('a step can be skipped after it fails, and Stop saves nothing', async ({
      page,
    }) => {
      await page.goto(FLAGGED)
      await expect(page.getByTestId('aifw-entry')).toBeVisible()
      await page.getByTestId('aifw-open').click()
      await page.getByTestId('aifw-dest-name').fill('Skips')
      await page.getByTestId('aifw-pick-pages.write_notes').click()
      await page.getByTestId('aifw-start').click()
      await expect(page.getByTestId('aifw-paste')).toBeVisible()
      // "Not now": the step needs a decision; Skip it, then the job previews.
      await page.getByTestId('aifw-notnow').click()
      await expect(page.getByTestId('aifw-retry')).toBeVisible()
      await page.getByTestId('aifw-skip').click()
      await expect(page.getByTestId('aifw-preview')).toBeVisible()
      await page.getByTestId('aifw-cancel').click()
      await expect(page.getByTestId('aifw-ended')).toBeVisible()
      await page.getByTestId('aifw-close').click()
      await showSidebar(page)
      await expect(sidebar(page).getByText('Skips')).toHaveCount(0)
    })

    test('Stop while a step waits for an answer ends the job', async ({
      page,
    }) => {
      await page.goto(FLAGGED)
      await expect(page.getByTestId('aifw-entry')).toBeVisible()
      await page.getByTestId('aifw-open').click()
      await page.getByTestId('aifw-dest-name').fill('Halted')
      await page.getByTestId('aifw-pick-pages.write_notes').click()
      await page.getByTestId('aifw-start').click()
      await expect(page.getByTestId('aifw-paste')).toBeVisible()
      await page.getByTestId('aifw-stop').click()
      await expect(page.getByTestId('aifw-ended')).toContainText(
        'Nothing was saved',
      )
      await expect(page.getByTestId('aifw-paste')).toHaveCount(0)
    })
  })

  test.describe('iPad portrait, touch', () => {
    test.use({
      viewport: { width: 820, height: 1180 },
      hasTouch: true,
      isMobile: false,
    })

    test('the same flow works by touch with 44 px targets', async ({
      page,
    }) => {
      await flow(page)
      for (const id of ['aifw-undo', 'aifw-another']) {
        const box = await page.getByTestId(id).boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      await page.getByTestId('aifw-undo').tap()
      await expect(page.getByTestId('aifw-redo')).toBeVisible()
      await page.getByTestId('aifw-redo').tap()
      await expect(page.getByTestId('aifw-undo')).toBeVisible()
      await page.getByTestId('aifw-tab-activity').tap()
      await expect(page.getByTestId('aifw-activity-row')).toHaveCount(1)
      await expect(page.getByTestId('aifw-activity-row')).toHaveAttribute(
        'data-state',
        'applied',
      )
      const undo = await page.getByTestId('aifw-activity-undo').boundingBox()
      expect(undo!.height).toBeGreaterThanOrEqual(44)
      await page.getByTestId('aifw-close').tap()
      await expect(page.getByTestId('aifw-screen')).toHaveCount(0)
    })
  })
})

test.describe('AI framework: flag off', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  test('Settings › AI is the same as before', async ({ page }) => {
    await page.goto('/#/settings/ai')
    await expect(page.getByTestId('ai-section')).toBeVisible()
    await expect(page.getByTestId('aifw-entry')).toHaveCount(0)
  })
})
