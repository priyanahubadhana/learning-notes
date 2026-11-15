import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  selectText,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * 2A.12 on the new tool bar (toolbar.v8 + toolbar.menu): the ⋯ More card as
 * v9. New line and Backspace stay on the bar (TB-11), a Keyword option sits
 * under Mark for review, "Back to <tool>" is a Professional item on the bar
 * (TB-14, owner answer C: no), and no key names on touch screens (G, R3).
 */
test.use({ hasTouch: true })

const PHONE = { width: 300, height: 700 }
const FLAGS = 'toolbar.v8,toolbar.menu'

async function open(
  page: Page,
  level: 'beginner' | 'professional',
  size = PHONE,
) {
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({
        level: l,
        unlocked: l === 'professional' ? ['tb.layouts', 'tb.allTools'] : [],
      }),
    )
  }, level)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${FLAGS}`)
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const card = (page: Page) => page.getByTestId('v8-card-fold.bar')
const more = async (page: Page) => {
  await page.getByTestId('v8-more').click()
  await expect(card(page)).toBeVisible()
}

for (const level of ['beginner', 'professional'] as const) {
  test(`${level}: New line and Backspace stay on a narrow bar, never under ⋯`, async ({
    page,
  }) => {
    await open(page, level)
    await expect(page.getByTestId('v8-backspace')).toBeVisible()
    await expect(page.getByTestId('v8-newline')).toBeVisible()
    await more(page)
    await expect(page.getByTestId('v8-fold-bs')).toHaveCount(0)
    await expect(page.getByTestId('v8-fold-nl')).toHaveCount(0)
  })
}

test('Keyword sits under Mark for review and marks the selected text', async ({
  page,
}) => {
  await open(page, 'beginner', { width: 820, height: 900 })
  await selectText(page, 'nucleus')
  await more(page)
  await card(page).getByRole('button', { name: 'Mark for review' }).click()
  const keyword = card(page).getByRole('button', {
    name: 'Keyword',
    exact: true,
  })
  await expect(keyword).toBeVisible()
  await keyword.click()
  await expect(card(page)).toHaveCount(0)
  await more(page)
  await card(page).getByRole('button', { name: 'Mark for review' }).click()
  await expect(
    card(page).getByRole('button', { name: 'Keyword', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('Professional: Back to <tool> is on the bar and swaps back; Beginner has none', async ({
  page,
}) => {
  await open(page, 'professional', { width: 1180, height: 820 })
  await page.getByTestId('v8-tool-pen').click()
  await page.getByTestId('v8-tool-eraser').click()
  const back = page.getByTestId('v8-back')
  await expect(back).toBeVisible()
  await expect(back).toHaveAttribute('aria-label', 'Back to Pen')
  await back.click()
  await expect(page.getByTestId('v8-tool-pen')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(back).toHaveAttribute('aria-label', 'Back to Eraser')
})

test('Beginner: no Back to <tool> on the bar', async ({ page }) => {
  await open(page, 'beginner', { width: 1180, height: 820 })
  await page.getByTestId('v8-tool-pen').click()
  await page.getByTestId('v8-tool-eraser').click()
  await expect(page.getByTestId('v8-back')).toHaveCount(0)
})

test('touch: the ⋯ card shows no key names, even with Copy and paste open', async ({
  page,
}) => {
  await open(page, 'professional', { width: 820, height: 900 })
  await more(page)
  await card(page).getByRole('button', { name: 'Copy and paste' }).click()
  await expect(
    card(page).getByRole('button', { name: 'Paste as plain text' }),
  ).toBeVisible()
  expect(await card(page).innerText()).not.toMatch(/⌘|⇧|Ctrl|Shift/)
})

test("nothing from today's ⋯ is dropped: Reading mode, All tools, Settings, Hide", async ({
  page,
}) => {
  await open(page, 'professional', { width: 820, height: 900 })
  await more(page)
  for (const id of ['reading', 'alltools', 'settings', 'hide'])
    await expect(page.getByTestId(`v8-more-${id}`)).toBeVisible()
})

test('View, Page and Tool bar folds: Professional has all three, Beginner no Page', async ({
  page,
}) => {
  await open(page, 'professional', { width: 820, height: 900 })
  await more(page)
  for (const g of ['View', 'Page', 'Tool bar'])
    await expect(
      card(page).getByRole('button', { name: g, exact: true }),
    ).toBeVisible()
  await card(page).getByRole('button', { name: 'Page', exact: true }).click()
  await expect(page.getByTestId('v8-more-tool-share')).toBeVisible()
})

test('Beginner: View and Tool bar folds, no Page', async ({ page }) => {
  await open(page, 'beginner', { width: 820, height: 900 })
  await more(page)
  await expect(
    card(page).getByRole('button', { name: 'View', exact: true }),
  ).toBeVisible()
  await expect(
    card(page).getByRole('button', { name: 'Tool bar', exact: true }),
  ).toBeVisible()
  await expect(
    card(page).getByRole('button', { name: 'Page', exact: true }),
  ).toHaveCount(0)
})
