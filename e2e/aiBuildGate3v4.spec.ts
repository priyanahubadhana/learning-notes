/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Gate 3 fourth visit fixes for the Build screen (slice 9b, flag ai.framework), items 1 to 5. */
const FLAGGED = '/?flags=ai.framework#/settings/ai'

const PLAN = JSON.stringify({
  steps: [
    {
      id: 's1',
      tool: 'notebooks.create',
      toolVersion: 1,
      args: { title: 'Habits' },
      placement: { in: '$destination' },
    },
    {
      id: 's2',
      tool: 'pages.write_notes',
      toolVersion: 1,
      args: { notebookId: { $from: 's1.notebookId' }, brief: 'Notes' },
      dependsOn: ['s1'],
    },
  ],
})
const PAGE_ANSWER = JSON.stringify({
  page: {
    title: 'Habits',
    summary: 'Short.',
    blocks: [{ type: 'paragraph', text: 'Hello.' }],
  },
})

async function toGoalAsk(page: Page) {
  await page.goto(FLAGGED)
  await expect(page.getByTestId('aifw-entry')).toBeVisible()
  await page.getByTestId('aifw-open').click()
  await expect(page.getByTestId('aifw-build')).toBeVisible()
  await page.getByTestId('aifw-dest-name').fill('Habits')
  await page.getByTestId('aifw-goal-text').fill('Notes on habits')
  await page.getByTestId('aifw-goal-make').click()
}

async function toPaste(page: Page) {
  await toGoalAsk(page)
  await page.getByTestId('aifw-goal-answer').fill(PLAN)
  await page.getByTestId('aifw-goal-check').click()
  await page.getByTestId('aifw-goal-cost').waitFor()
  await page.getByTestId('aifw-goal-run').click()
  await page.getByTestId('aifw-paste').waitFor()
}

async function toPreview(page: Page) {
  await toPaste(page)
  await page.getByTestId('aifw-answer').fill(PAGE_ANSWER)
  await page.getByTestId('aifw-submit').click()
  await page.getByTestId('aifw-preview').waitFor()
}

const noGrip = async (page: Page, id: string) => {
  const box = page.getByTestId(id)
  expect(await box.evaluate((e) => getComputedStyle(e).resize)).toBe('none')
  // Grows with its text: no inner scroll bar below the cap.
  expect(
    await box.evaluate(
      (e) => e.scrollHeight <= e.clientHeight + 2 || e.clientHeight >= 300,
    ),
  ).toBe(true)
}

test.describe('Build gate 3, fourth visit', () => {
  test('1 Preview says "Check before saving", Done says "Finished"', async ({
    page,
  }) => {
    await toPreview(page)
    const title = page.getByTestId('aifw-run-title')
    await expect(title).toHaveText('Check before saving')
    await page.getByTestId('aifw-apply').click()
    await page.getByTestId('aifw-done').waitFor()
    await expect(title).toHaveText('Finished')
  })

  test('2 Preview names the kind once, no "Blocks"', async ({ page }) => {
    await toPreview(page)
    const lines = await page.getByTestId('aifw-preview-line').allTextContents()
    expect(lines).toContain('New notebook: Habits')
    expect(lines).toContain('New page: Habits')
    expect(new Set(lines).size).toBe(lines.length)
    await expect(page.getByTestId('aifw-preview')).not.toContainText('Blocks')
  })

  test('3 a broken answer is explained in plain words', async ({ page }) => {
    await toPaste(page)
    await page.getByTestId('aifw-answer').fill('this is not json')
    await page.getByTestId('aifw-submit').click()
    const box = page.getByTestId('aifw-paste-problems')
    await expect(box).toContainText(
      'This is not the full answer. Copy the whole answer from the chat and paste it again.',
    )
    await expect(box).not.toContainText('JSON')
  })

  test('4 prompt and answer boxes have no resize grip', async ({ page }) => {
    await toGoalAsk(page)
    await noGrip(page, 'aifw-goal-prompt')
    await noGrip(page, 'aifw-goal-answer')
    await page.getByTestId('aifw-goal-answer').fill(PLAN)
    await page.getByTestId('aifw-goal-check').click()
    await page.getByTestId('aifw-goal-cost').waitFor()
    await page.getByTestId('aifw-goal-run').click()
    await page.getByTestId('aifw-paste').waitFor()
    await noGrip(page, 'aifw-prompt')
    await noGrip(page, 'aifw-answer')
    await page.getByTestId('aifw-answer').fill('a\nb\nc\nd\ne\nf\ng\nh\ni')
    await noGrip(page, 'aifw-answer')
  })

  test('5 "Plan ready" closes when the run starts and by itself', async ({
    page,
  }) => {
    await toGoalAsk(page)
    await page.getByTestId('aifw-goal-answer').fill(PLAN)
    await page.getByTestId('aifw-goal-check').click()
    await page.getByTestId('aifw-goal-cost').waitFor()
    const toasts = page.getByTestId('aifw-toast')
    await expect(toasts).toHaveCount(1)
    await expect(toasts).toHaveCount(0, { timeout: 6000 })
    await page.getByTestId('aifw-goal-run').click()
    await page.getByTestId('aifw-paste').waitFor()
    await page.getByTestId('aifw-answer').fill(PAGE_ANSWER)
    await page.getByTestId('aifw-submit').click()
    await page.getByTestId('aifw-apply').click()
    await expect(toasts).toHaveCount(1)
    await expect(toasts).toContainText('Applied')
  })

  test('5b a toast closes when the next state starts', async ({ page }) => {
    await toGoalAsk(page)
    await page.getByTestId('aifw-goal-answer').fill(PLAN)
    await page.getByTestId('aifw-goal-check').click()
    await page.getByTestId('aifw-goal-cost').waitFor()
    await expect(page.getByTestId('aifw-toast')).toHaveCount(1)
    await page.getByTestId('aifw-goal-run').click()
    await page.getByTestId('aifw-paste').waitFor()
    await expect(page.getByTestId('aifw-toast')).toHaveCount(0)
  })
})
