import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'
import { createNotebook, pageAction, typeInEditor } from './helpers.ts'

/** Prompt library and skills (queue 3b). AI is mocked; nothing leaves the test. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openLibrary(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('ai-prompts').click()
  await expect(page.getByTestId('prompts-dialog')).toBeVisible()
  await expect(page.getByTestId('prompt-row').first()).toBeVisible()
}

test('library: seeded prompts, search, filter, new prompt, edit keeps a version', async ({
  page,
}) => {
  await openLibrary(page)
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('quiz')
  await expect(
    dialog.getByTestId('prompt-row').filter({ hasText: 'Quiz me' }),
  ).toHaveCount(1)
  await dialog.getByTestId('prompt-search').fill('')
  await dialog.getByRole('combobox', { name: 'Purpose' }).selectOption('plan')
  await expect(dialog.getByTestId('prompt-row')).toHaveCount(1)
  await dialog.getByRole('combobox', { name: 'Purpose' }).selectOption('')

  await dialog.getByTestId('prompt-new').click()
  await dialog.getByTestId('prompt-name').fill('Check my maths')
  await dialog.getByTestId('prompt-subjects').fill('Maths, exam')
  await dialog.getByTestId('prompt-text').fill('Check each step.')
  await dialog.getByTestId('prompt-save').click()
  await dialog.getByTestId('prompt-search').fill('maths')
  await expect(dialog.getByTestId('prompt-row')).toHaveCount(1)

  // Editing the text keeps the old text as a version.
  await dialog.getByRole('button', { name: 'Edit Check my maths' }).click()
  await dialog.getByTestId('prompt-text').fill('Check each step twice.')
  await dialog.getByTestId('prompt-save').click()
  await dialog.getByRole('button', { name: 'Edit Check my maths' }).click()
  await expect(dialog.getByText('1 earlier version')).toBeVisible()
})

/** Settings > AI: on, one key, and the Books notebook allowed. */
async function setUpAi(page: Page, allowBooks = true) {
  await page.goto('/#/settings/ai')
  await expect(page.getByTestId('ai-section')).toBeVisible()
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toContainText('sk-…7890')
  if (!allowBooks) return
  await page.goto('/#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
}

/** Imports a small PDF book and opens its page. */
async function bookPage(page: Page) {
  await page.goto('/')
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

test('run a prompt on a page: cost in rupees first, only the page words sent, rate, add, Undo', async ({
  page,
}) => {
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      json: {
        content: [{ type: 'text', text: 'Mitochondria make energy.' }],
        usage: { input_tokens: 90, output_tokens: 12 },
      },
    })
  })
  await bookPage(page)
  await setUpAi(page)
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('summarise')
  await dialog.getByTestId('prompt-row').first().click()
  // The cost is shown before anything is sent.
  await expect(dialog.getByTestId('cost-line')).toContainText('₹')
  await expect(dialog.getByTestId('cost-line')).toContainText('tokens')
  await expect(dialog.getByTestId('cost-line')).toContainText(
    'Claude Haiku 5.5',
  )
  expect(bodies).toHaveLength(0)
  await expect(dialog.getByTestId('input-status')).toBeVisible()
  await dialog.getByTestId('run-ai').click()
  await dialog.getByTestId('ai-privacy-ok').click()
  await expect(dialog.getByTestId('run-answer')).toHaveValue(
    'Mitochondria make energy.',
  )
  expect(bodies).toHaveLength(1)
  expect(bodies[0]).toContain('Summarise the text')
  await dialog.getByRole('button', { name: '4 stars' }).click()
  await dialog.getByTestId('run-apply').click()
  await expect(
    page.getByRole('main').getByText('Mitochondria make energy.'),
  ).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(
    page.getByRole('main').getByText('Mitochondria make energy.'),
  ).toHaveCount(0)
})

const skillAnswer = {
  title: 'Cell energy',
  summary: 'Cells make energy in mitochondria.',
  keywords: ['cell', 'energy'],
  sources: [{ n: 1, title: 'The lecture', url: 'https://example.org/lecture' }],
  points: [
    {
      text: 'Mitochondria make ATP',
      stars: 10,
      icon: '🔋',
      topic: 'Energy',
      sources: [1],
    },
    {
      text: 'Cells are tiny',
      stars: 5,
      icon: 'lucide:brain',
      topic: 'Size',
      sources: [],
    },
    { text: 'A fun aside', stars: 1, topic: 'Size', sources: [1] },
  ],
  pages: [
    { title: 'Energy in cells', body: 'ATP is made in mitochondria [1].' },
  ],
  cards: [{ kind: 'qa', q: 'What makes ATP?', a: 'Mitochondria', point: 0 }],
}

test('skill: one cached call, preview, untick, save into a new Research book, one Undo', async ({
  page,
}) => {
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    const body = route.request().postData() ?? ''
    bodies.push(body)
    const fact = body.includes('Check these points')
    return route.fulfill({
      json: {
        content: [
          {
            type: 'text',
            text: fact
              ? '{"checks":[{"i":1,"verdict":"doubt","note":"No source"}]}'
              : JSON.stringify(skillAnswer),
          },
        ],
        usage: { input_tokens: 300, output_tokens: 200 },
      },
    })
  })
  await setUpAi(page, false)
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('transcript')
  await dialog.getByTestId('prompt-row').first().click()
  await expect(dialog.getByTestId('run-skill')).toBeVisible()
  await dialog
    .getByTestId('input-text')
    .fill('Mitochondria make ATP. Cells are tiny. A long lecture text.')
  await expect(dialog.getByTestId('cost-line')).toContainText('₹')
  expect(bodies).toHaveLength(0)
  await dialog.getByTestId('run-ai').click()
  await dialog.getByTestId('ai-privacy-ok').click()
  await expect(dialog.getByTestId('skill-preview')).toBeVisible()

  // One call; the lecture text is in the first (cached) block.
  expect(bodies).toHaveLength(1)
  const sent = JSON.parse(bodies[0])
  expect(sent.messages[0].content[0].cache_control).toEqual({
    type: 'ephemeral',
  })
  expect(sent.messages[0].content[0].text).toContain('Mitochondria make ATP')

  // Must know has its icon; the unsourced point says so.
  await expect(dialog.getByTestId('skill-point')).toHaveCount(3)
  await expect(dialog.getByTestId('unchecked-count')).toContainText('1 point')
  // An open drawn icon (Lucide) shows in the preview.
  await expect(dialog.getByTestId('drawn-icon')).toHaveCount(1)
  // The fact check shows its cost first, then marks the doubted point.
  await expect(dialog.getByTestId('cost-line').last()).toContainText(
    'Fact check',
  )
  await dialog.getByTestId('fact-check').click()
  await expect(dialog.getByText('doubted by the fact check')).toBeVisible()
  expect(bodies).toHaveLength(2)

  // Untick the aside, edit the first point, save into a new notebook.
  await dialog
    .getByRole('checkbox', { name: 'Keep point: A fun aside' })
    .uncheck()
  await dialog
    .getByTestId('skill-point')
    .first()
    .getByLabel('Point', { exact: true })
    .fill('Mitochondria make ATP (edited)')
  await expect(dialog.getByTestId('save-new-title')).toHaveValue(
    'Research book',
  )
  await dialog.getByTestId('skill-save').click()
  await expect(dialog.getByTestId('skill-saved')).toBeVisible()
  // One Undo takes the whole result away; the preview is still there.
  await dialog.getByTestId('skill-undo').click()
  await expect(dialog.getByTestId('skill-preview')).toBeVisible()
  await dialog.getByTestId('skill-save').click()
  await expect(dialog.getByTestId('skill-saved')).toBeVisible()
  await dialog.getByTestId('skill-open').click()
  await expect(page.getByRole('main')).toContainText(
    'Mitochondria make ATP (edited)',
  )
  await expect(page.getByRole('main')).not.toContainText('A fun aside')
  await expect(page.getByRole('main')).toContainText('🔋')
  // Saved notes are plain text: the drawn icon becomes its emoji.
  await expect(page.getByRole('main')).toContainText('🧠')
  await expect(page.getByRole('main')).toContainText(
    'doubted by the fact check',
  )
})

test('paste-in: no AI key, copy the prompt with its format, paste a bad then a good answer', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const calls: string[] = []
  await page.route('https://api.anthropic.com/**', (route) => {
    calls.push(route.request().url())
    return route.abort()
  })
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('quick digest')
  await dialog.getByTestId('prompt-row').first().click()
  await dialog.getByTestId('input-text').fill('Mitochondria make ATP.')
  await dialog.getByText('No AI key? Use any AI chat (free)').click()
  await dialog.getByTestId('paste-copy').click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('Mitochondria make ATP.')
  expect(copied).toContain('ln-skill/1')
  expect(copied).toContain('"points"')

  // A wrong answer is refused with a plain reason and nothing changes.
  await dialog.getByTestId('paste-answer').fill('Sure! Here is a summary.')
  await dialog.getByTestId('paste-import').click()
  await expect(dialog.getByTestId('paste-problem')).toContainText(
    'not in the expected format',
  )
  await expect(dialog.getByTestId('skill-preview')).toHaveCount(0)

  // A good one goes through the same preview.
  await dialog.getByTestId('paste-answer').fill(JSON.stringify(skillAnswer))
  await dialog.getByTestId('paste-import').click()
  await expect(dialog.getByTestId('skill-preview')).toBeVisible()
  await expect(dialog.getByTestId('skill-point')).toHaveCount(3)
  await dialog.getByTestId('skill-save').click()
  await expect(dialog.getByTestId('skill-saved')).toBeVisible()
  expect(calls).toHaveLength(0)
})

test('a note page: Prompts in the ⋯ menu runs a prompt on the page, Insert below, one Undo', async ({
  page,
}) => {
  await page.route('https://api.anthropic.com/v1/messages', (route) =>
    route.fulfill({
      json: {
        content: [{ type: 'text', text: 'Short version of the page.' }],
        usage: { input_tokens: 60, output_tokens: 10 },
      },
    }),
  )
  await setUpAi(page, false)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.goto('/#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Biology' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
  await page.goBack()
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
  await pageAction(page, 'Prompts and skills')
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('summarise')
  await dialog.getByTestId('prompt-row').first().click()
  await expect(dialog.getByTestId('cost-line')).toContainText('₹')
  await dialog.getByTestId('run-ai').click()
  await dialog.getByTestId('ai-privacy-ok').click()
  await expect(dialog.getByTestId('run-answer')).toHaveValue(
    'Short version of the page.',
  )
  await dialog.getByTestId('run-apply').click()
  await expect(page.locator('.bn-editor')).toContainText(
    'Short version of the page.',
  )
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.bn-editor')).not.toContainText(
    'Short version of the page.',
  )
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
})
