import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Study tabs v2, sub-slice 15f: the prompt library tiles and the free path
 * (ST12, ST13, ST14). Flag `study.v2` on; AI is mocked, nothing leaves.
 */

const FLAGGED = '/?flags=study.v2'

async function asLevel(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((value) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: value, unlocked: [] }),
    )
  }, level)
}

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function bookPage(page: Page) {
  await page.goto(FLAGGED)
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'b.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['Cells make energy in mitochondria'], {
      title: 'Cell Book',
    }),
  })
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await expect(page.getByTestId('book-continue')).toBeVisible()
}

async function setUpAi(page: Page) {
  await page.goto('/?flags=study.v2#/settings/ai')
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toContainText('sk-…7890')
  await page.goto('/?flags=study.v2#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
}

test('ST12: the library shows 6 starter prompts as tiles with Run, and nothing else', async ({
  page,
}) => {
  await asLevel(page, 'beginner')
  await page.goto(FLAGGED)
  await space(page, 'Library').click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await expect(dialog.getByTestId('starter-tile')).toHaveCount(6)
  await expect(dialog.getByRole('button', { name: /^Run / })).toHaveCount(6)
  const box = (await dialog.getByTestId('starter-tile').first().boundingBox())!
  expect(Math.round(box.width)).toBe(160)
  expect(Math.round(box.height)).toBe(112)
  await expect(dialog.getByTestId('prompt-search')).toHaveCount(0)
  await expect(dialog.getByTestId('prompt-new')).toHaveCount(0)
  await expect(dialog.getByTestId('prompt-row')).toHaveCount(0)
})

test('ST12: Professional keeps the whole library under the tiles', async ({
  page,
}) => {
  await asLevel(page, 'professional')
  await page.goto(FLAGGED)
  await space(page, 'Library').click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await expect(dialog.getByTestId('starter-tile')).toHaveCount(6)
  await expect(dialog.getByTestId('prompt-search')).toBeVisible()
  await expect(dialog.getByTestId('prompt-row').first()).toBeVisible()
})

test('ST13: with AI off, copy the prompt, paste the answer, add to page, Undo', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await asLevel(page, 'beginner')
  await bookPage(page)
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByRole('button', { name: 'Run Summarise' }).click()
  await expect(dialog.getByTestId('run-ai')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Copy prompt' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('Summarise the text')
  await dialog.getByTestId('paste-answer').fill('Mitochondria make energy.')
  await dialog.getByTestId('paste-import').click()
  await expect(dialog.getByTestId('run-answer')).toHaveValue(
    'Mitochondria make energy.',
  )
  await dialog.getByRole('button', { name: 'Add to page' }).click()
  await expect(
    page.getByRole('main').getByText('Mitochondria make energy.'),
  ).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(
    page.getByRole('main').getByText('Mitochondria make energy.'),
  ).toHaveCount(0)
})

test('ST14: the first paid run says "Before you use AI" with the limit; Cancel sends nothing', async ({
  page,
}) => {
  const calls: string[] = []
  await page.route('https://api.anthropic.com/**', (route) => {
    calls.push(route.request().url())
    return route.abort()
  })
  await asLevel(page, 'professional')
  await bookPage(page)
  await setUpAi(page)
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByRole('button', { name: 'Run Summarise' }).click()
  await dialog.getByTestId('run-ai').click()
  await expect(dialog.getByText('Before you use AI')).toBeVisible()
  await expect(dialog.getByTestId('ai-limit')).toContainText('limit')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog.getByText('Before you use AI')).toHaveCount(0)
  expect(calls).toHaveLength(0)
})
