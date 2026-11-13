// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { showSidebar, sidebar } from './helpers.ts'

/**
 * V4-B1 and V4-C1..C6: the goal box on the Build screen (flag `ai.framework`).
 * Type a goal -> copy the planner prompt -> paste a plan -> "Plan ready" never
 * covers the plan title -> run -> preview -> apply. No AI or network call: the
 * plan and the answers are typed in by the test, and the test fails if the
 * page asks any other address for anything.
 */

const FLAGGED = '/?flags=ai.framework#/settings/ai'

const PLAN = JSON.stringify({
  steps: [
    {
      id: 's1',
      tool: 'notebooks.create',
      toolVersion: 1,
      args: { title: 'Goal nb' },
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
    title: 'Goal notes',
    summary: 'Short.',
    blocks: [{ type: 'paragraph', text: 'Hello.' }],
  },
})

function watchNetwork(page: Page): string[] {
  const outside: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (
      !['localhost', '127.0.0.1'].includes(u.hostname) &&
      u.protocol === 'http:'
    )
      outside.push(r.url())
    if (u.protocol === 'https:') outside.push(r.url())
  })
  return outside
}

async function openGoal(page: Page) {
  await page.goto(FLAGGED)
  await page.getByTestId('aifw-open').click()
  await expect(page.getByTestId('aifw-goal')).toBeVisible()
}

async function ask(page: Page) {
  await page.getByTestId('aifw-goal-text').fill('Notes and cards on habits')
  await page.getByTestId('aifw-dest-name').fill('Goal nb')
  await expect(page.getByTestId('aifw-goal-make')).toBeEnabled()
  await page.getByTestId('aifw-effort-deep').click()
  await expect(page.getByTestId('aifw-effort-deep')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByTestId('aifw-goal-make').click()
  await expect(page.getByTestId('aifw-goal-prompt')).toHaveValue(
    /Notes and cards on habits/,
  )
  await expect(page.getByTestId('aifw-goal-prompt')).toHaveValue(
    /pages\.write_notes/,
  )
}

async function planReady(page: Page) {
  await openGoal(page)
  await ask(page)
  // A wrong answer is refused with the reasons; the box stays.
  await page.getByTestId('aifw-goal-answer').fill('not json')
  await page.getByTestId('aifw-goal-check').click()
  await expect(page.getByTestId('aifw-goal-problems')).toBeVisible()
  await page.getByTestId('aifw-goal-answer').fill(PLAN)
  await page.getByTestId('aifw-goal-check').click()
  await expect(page.getByTestId('aifw-plan-ready')).toHaveText('Plan ready')
  const title = page.locator('[data-aifw-title]')
  await expect(title).toHaveText('Notes and cards on habits')
  const toast = page.getByTestId('aifw-toast')
  await expect(toast).toContainText('Plan ready')
  // B1: the notice never covers the plan title.
  const t = await toast.boundingBox()
  const h = await title.boundingBox()
  expect(t && h).toBeTruthy()
  const overlaps =
    t!.x < h!.x + h!.width &&
    t!.x + t!.width > h!.x &&
    t!.y < h!.y + h!.height &&
    t!.y + t!.height > h!.y
  expect(overlaps).toBe(false)
  await expect(page.getByTestId('aifw-goal-step')).toHaveCount(2)
  await expect(page.getByTestId('aifw-goal-cost')).toContainText('free')
  await expect(page.getByTestId('aifw-goal-cost')).toContainText(
    'nothing paid is ever used',
  )
}

for (const [name, size, touch] of [
  ['PC', { width: 1200, height: 900 }, false],
  ['iPad portrait, touch', { width: 820, height: 1180 }, true],
  ['phone', { width: 390, height: 780 }, true],
] as const) {
  test.describe(`AI framework: goal box (${name})`, () => {
    test.use({ viewport: size, hasTouch: touch, isMobile: false })

    test('goal -> plan ready -> run -> apply, nothing leaves the device', async ({
      page,
    }) => {
      const outside = watchNetwork(page)
      await planReady(page)
      const run = page.getByTestId('aifw-goal-run')
      expect((await run.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await run.click()
      await expect(page.getByTestId('aifw-paste')).toBeVisible()
      await page.getByTestId('aifw-answer').fill(PAGE_ANSWER)
      await page.getByTestId('aifw-submit').click()
      await expect(page.getByTestId('aifw-preview')).toBeVisible()
      await page.getByTestId('aifw-apply').click()
      await expect(page.getByTestId('aifw-done')).toBeVisible()
      await page.getByTestId('aifw-close').click()
      await showSidebar(page)
      await expect(
        sidebar(page)
          .getByRole('button', { name: 'Goal nb', exact: true })
          .first(),
      ).toBeVisible()
      expect(outside).toEqual([])
    })
  })
}

test.describe('AI framework: goal box repairs and simple plan', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  test('three wrong answers offer a simple plan', async ({ page }) => {
    await openGoal(page)
    await ask(page)
    for (let i = 0; i < 3; i++) {
      await page
        .getByTestId('aifw-goal-answer')
        .fill(`{"steps":[]}${' '.repeat(i)}`)
      await page.getByTestId('aifw-goal-check').click()
      await expect(page.getByTestId('aifw-goal-problems')).toBeVisible()
    }
    await expect(page.getByTestId('aifw-goal-problems')).toContainText(
      'still does not fit',
    )
    await page.getByTestId('aifw-goal-simple-btn').click()
    await expect(page.getByTestId('aifw-plan-ready')).toBeVisible()
    await expect(page.getByTestId('aifw-goal-simple')).toBeVisible()
    await expect(page.getByTestId('aifw-goal-step').first()).toContainText(
      'Create notebook',
    )
    await page.getByTestId('aifw-goal-back').click()
    await expect(page.getByTestId('aifw-goal-make')).toBeVisible()
  })
})

test.describe('AI framework: goal box, flag off', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  test('nothing of the goal box exists', async ({ page }) => {
    await page.goto('/#/settings/ai')
    await expect(page.getByTestId('ai-section')).toBeVisible()
    await expect(page.getByTestId('aifw-entry')).toHaveCount(0)
    await expect(page.getByTestId('aifw-goal')).toHaveCount(0)
  })
})

test.describe('AI framework: slice 5a tools through the goal box', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  test('summary, page rename and a hidden tab run as one job', async ({
    page,
  }) => {
    const plan = JSON.stringify({
      steps: [
        {
          id: 's1',
          tool: 'notebooks.create',
          toolVersion: 1,
          args: { title: 'Goal nb' },
        },
        {
          id: 's2',
          tool: 'pages.write_notes',
          toolVersion: 1,
          args: { notebookId: { $from: 's1.notebookId' }, brief: 'Notes' },
          dependsOn: ['s1'],
        },
        {
          id: 's3',
          tool: 'summaries.set',
          toolVersion: 1,
          args: { pageId: { $from: 's2.pageId' }, brief: 'Short' },
          dependsOn: ['s2'],
        },
        {
          id: 's4',
          tool: 'pages.rename',
          toolVersion: 1,
          args: { pageId: { $from: 's2.pageId' }, title: 'Renamed page' },
          dependsOn: ['s2'],
        },
        {
          id: 's5',
          tool: 'tabs.set_hidden',
          toolVersion: 1,
          args: {
            notebookId: { $from: 's1.notebookId' },
            tabId: 'revise',
            hidden: true,
          },
          dependsOn: ['s1'],
        },
      ],
    })
    await openGoal(page)
    await ask(page)
    await page.getByTestId('aifw-goal-answer').fill(plan)
    await page.getByTestId('aifw-goal-check').click()
    await expect(page.getByTestId('aifw-goal-step')).toHaveCount(5)
    await page.getByTestId('aifw-goal-run').click()
    await expect(page.getByTestId('aifw-paste')).toHaveAttribute(
      'data-step',
      's2',
    )
    await page.getByTestId('aifw-answer').fill(PAGE_ANSWER)
    await page.getByTestId('aifw-submit').click()
    await expect(page.getByTestId('aifw-paste')).toHaveAttribute(
      'data-step',
      's3',
    )
    await page
      .getByTestId('aifw-answer')
      .fill(JSON.stringify({ summary: 'A short summary.' }))
    await page.getByTestId('aifw-submit').click()
    await expect(page.getByTestId('aifw-preview')).toBeVisible()
    await expect(
      page
        .getByTestId('aifw-preview-line')
        .filter({ hasText: 'New: Renamed page' }),
    ).toHaveCount(1)
    await page.getByTestId('aifw-apply').click()
    await expect(page.getByTestId('aifw-done')).toBeVisible()
    await page.getByTestId('aifw-undo').click()
    await expect(page.getByTestId('aifw-redo')).toBeVisible()
  })
})

test.describe('AI framework: slice 5b and 5c tools through the goal box', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  test('a mind map with its colours, paper and page path run as one job', async ({
    page,
  }) => {
    const s = (
      id: string,
      tool: string,
      args: object,
      dependsOn?: string[],
    ) => ({
      id,
      tool,
      toolVersion: 1,
      args,
      ...(dependsOn ? { dependsOn } : {}),
    })
    const plan = JSON.stringify({
      steps: [
        s('s1', 'notebooks.create', { title: 'Goal nb 5b' }),
        s(
          's2',
          'pages.write_notes',
          { notebookId: { $from: 's1.notebookId' }, brief: 'Notes' },
          ['s1'],
        ),
        s(
          's3',
          'mindmaps.add',
          { pageId: { $from: 's2.pageId' }, outline: 'Cells\n  Nucleus' },
          ['s2'],
        ),
        s(
          's4',
          'mindmaps.set_theme',
          { blockId: { $from: 's3.blockId' }, theme: 'bold' },
          ['s3'],
        ),
        s(
          's5',
          'styles.set_paper',
          { pageId: { $from: 's2.pageId' }, paper: 'grid' },
          ['s2'],
        ),
        s(
          's6',
          'layouts.set_path_style',
          { pageId: { $from: 's2.pageId' }, pathStyle: 'full' },
          ['s2'],
        ),
      ],
    })
    await openGoal(page)
    await ask(page)
    await page.getByTestId('aifw-goal-answer').fill(plan)
    await page.getByTestId('aifw-goal-check').click()
    await expect(page.getByTestId('aifw-goal-step')).toHaveCount(6)
    await page.getByTestId('aifw-goal-run').click()
    await expect(page.getByTestId('aifw-paste')).toHaveAttribute(
      'data-step',
      's2',
    )
    await page.getByTestId('aifw-answer').fill(PAGE_ANSWER)
    await page.getByTestId('aifw-submit').click()
    await expect(page.getByTestId('aifw-preview')).toBeVisible()
    await page.getByTestId('aifw-apply').click()
    await expect(page.getByTestId('aifw-done')).toBeVisible()
    await page.getByTestId('aifw-undo').click()
    await expect(page.getByTestId('aifw-redo')).toBeVisible()
  })
})
