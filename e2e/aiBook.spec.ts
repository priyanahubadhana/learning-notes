// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

/** Phase P: Ask this book, Story so far, streaming with Stop, Permissions. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function setUp(page: Page, cap?: number, epub = false) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles(
    epub
      ? {
          name: 'story.epub',
          mimeType: 'application/epub+zip',
          buffer: makeEpub('Cell Book'),
        }
      : {
          name: 'b.pdf',
          mimeType: 'application/pdf',
          buffer: makePdf(
            [
              'Cells make energy in mitochondria',
              'Plants use chloroplasts',
              'END',
            ],
            { title: 'Cell Book' },
          ),
        },
  )
  await expect(page.getByTestId('source-card')).toBeVisible()
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toBeVisible()
  if (cap !== undefined) await page.getByTestId('ai-cap').fill(String(cap))
  await page.goto('/#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('book-continue').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await page.getByTestId('reader-ask').click()
  await expect(page.getByTestId('ask-book')).toBeVisible()
}

const sse = (events: unknown[]) =>
  events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join('')

test('Ask this book: preview of what is sent, a streamed answer with page links, the log', async ({
  page,
}) => {
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        { type: 'message_start', message: { usage: { input_tokens: 50 } } },
        {
          type: 'content_block_delta',
          delta: { text: 'Energy comes from mitochondria ' },
        },
        { type: 'content_block_delta', delta: { text: '[p. 1].' } },
        { type: 'message_delta', usage: { output_tokens: 12 } },
      ]),
    })
  })
  await setUp(page)
  await page
    .getByTestId('ask-book-scope')
    .selectOption({ label: 'Pages I choose' })
  await page.getByTestId('ask-book-from').fill('1')
  await page.getByTestId('ask-book-to').fill('1')
  await page.getByTestId('ask-book-question').fill('Where is energy made?')
  await page.getByTestId('ask-book-prepare').click()
  const preview = page.getByTestId('ask-book-preview')
  await expect(preview).toContainText('api.anthropic.com')
  await expect(preview).toContainText('pages 1 to 1')
  expect(bodies).toHaveLength(0)
  await page.getByTestId('ask-book-send').click()
  await expect(page.getByTestId('ask-book-answer')).toContainText(
    'Energy comes from mitochondria',
  )
  await expect(page.getByTestId('ask-book-cite')).toHaveText('p. 1')
  expect(bodies).toHaveLength(1)
  const sent = JSON.parse(bodies[0])
  expect(sent.stream).toBe(true)
  const prompt = sent.messages[0].content as string
  expect(prompt).toContain('mitochondria')
  // Only the chosen page is sent.
  expect(prompt).not.toContain('chloroplasts')
  await expect(page.getByTestId('ask-book-save')).toBeVisible()
  await expect(page.getByTestId('ask-book-cards')).toBeVisible()

  // The log has the line, without any content.
  await page.goto('/#/settings/ai')
  const log = page.getByTestId('ai-use-recent')
  await expect(log).toContainText('Ask this book')
  await expect(log).not.toContainText('mitochondria')
  // Permissions no longer repeats it; it points here.
  await page.goto('/#/settings/permissions')
  await expect(page.getByTestId('perm-log')).toHaveCount(0)
  await expect(page.getByTestId('perm-usage-link')).toBeVisible()
})

test('Story so far sends only what has been read; Stop ends a long answer', async ({
  page,
}) => {
  const bodies: string[] = []
  let release: () => void = () => {}
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    bodies.push(route.request().postData() ?? '')
    // A slow answer: it waits until the test lets it go.
    await new Promise<void>((r) => (release = r))
    await route.abort().catch(() => {})
  })
  await setUp(page)
  await page.getByTestId('ask-book-story').click()
  await page.getByTestId('ask-book-prepare').click()
  await expect(page.getByTestId('ask-book-preview')).toContainText('page 1')
  await page.getByTestId('ask-book-send').click()
  await page.getByTestId('ask-book-stop').click()
  await expect(
    page.getByText('Stopped. The answer so far is kept.'),
  ).toBeVisible()
  release()
  const prompt = JSON.parse(bodies[0]).messages[0].content as string
  expect(prompt).toContain('mitochondria')
  // Page 3 is ahead of the reader: never sent.
  expect(prompt).not.toContain('END')
})

test('the monthly cap blocks the call: nothing is sent', async ({ page }) => {
  let calls = 0
  await page.route('https://api.anthropic.com/**', (route) => {
    calls++
    return route.abort()
  })
  await setUp(page, 0)
  await page.getByTestId('ask-book-question').fill('Anything?')
  await page.getByTestId('ask-book-prepare').click()
  await expect(page.getByTestId('ask-book-preview')).toBeVisible()
  await page.getByTestId('ask-book-send').click()
  await expect(page.getByText(/monthly limit|cap/i).first()).toBeVisible()
  expect(calls).toBe(0)
})

test('EPUB: only the chosen chapter is sent, citations name the chapter', async ({
  page,
}) => {
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      headers: { 'content-type': 'text/event-stream' },
      body: sse([
        {
          type: 'content_block_delta',
          delta: { text: 'It lives here [ch. 2].' },
        },
      ]),
    })
  })
  await setUp(page, undefined, true)
  await page
    .getByTestId('ask-book-scope')
    .selectOption({ label: 'Chapter: Chapter 2' })
  await page.getByTestId('ask-book-question').fill('Where does it live?')
  await page.getByTestId('ask-book-prepare').click()
  await expect(page.getByTestId('ask-book-preview')).toContainText('chapter 2')
  await page.getByTestId('ask-book-send').click()
  await expect(page.getByTestId('ask-book-cite')).toHaveText('ch. 2')
  const prompt = JSON.parse(bodies[0]).messages[0].content as string
  expect(prompt).toContain('Second chapter text lives here.')
  expect(prompt).not.toContain('quick brown fox')
})
