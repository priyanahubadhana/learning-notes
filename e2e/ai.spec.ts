// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/** Wave 3 part A, CR4: bring your own AI (key on the device, off by default). */

test.use({ viewport: { width: 1200, height: 800 } })

const main = (page: Page) => page.getByRole('main')
const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

/** Imports a book and opens its page. */
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

/** Turns on "Allow AI in Books" (keyboard: a toast can sit over the switch). */
async function allowBooks(page: Page) {
  const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
}

/** Settings › AI: on, a key, and the Books notebook allowed. */
async function setUpAi(page: Page) {
  await page.goto('/#/settings/ai')
  await expect(page.getByTestId('ai-section')).toBeVisible()
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toContainText('sk-…7890')
  await allowBooks(page)
}

test('AI is off by default: no AI buttons and no network call', async ({
  page,
}) => {
  const calls: string[] = []
  await page.route('https://api.anthropic.com/**', (route) => {
    calls.push(route.request().url())
    return route.abort()
  })
  await bookPage(page)
  await expect(page.getByTestId('ai-summary')).toHaveCount(0)
  expect(calls).toHaveLength(0)
})

test('Summarise: asks once about privacy, sends only the page text, adds an AI-made summary, Undo removes it', async ({
  page,
}) => {
  const requests: { headers: Record<string, string>; body: string }[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    const r = route.request()
    requests.push({ headers: r.headers(), body: r.postData() ?? '' })
    return route.fulfill({
      json: {
        content: [
          {
            type: 'text',
            text: 'Cells make energy in mitochondria. That is the summary.',
          },
        ],
        usage: { input_tokens: 80, output_tokens: 25 },
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

  await page.getByTestId('ai-summary').click()
  await page.getByTestId('ai-privacy-ok').click()
  // The answer waits in a preview: nothing is on the page until Add to page.
  await expect(page.getByTestId('ai-preview-text')).toContainText(
    'That is the summary.',
  )
  await expect(
    page.locator('.bn-editor').getByText('That is the summary.'),
  ).toHaveCount(0)
  await expect(page.getByTestId('ai-badge')).toHaveCount(0)
  await page.getByTestId('ai-preview-apply').click()
  await expect(main(page).getByText('That is the summary.')).toBeVisible()
  await expect(page.getByTestId('ai-badge')).toBeVisible()
  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-api-key']).toBe('sk-ant-test-1234567890')
  expect(requests[0].headers['anthropic-dangerous-direct-browser-access']).toBe(
    'true',
  )
  const sent = JSON.parse(requests[0].body)
  expect(sent.messages[0].content).toContain('Summarise')

  // One Undo takes the whole result away.
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(main(page).getByText('That is the summary.')).toHaveCount(0)

  // Again: Cancel in the preview adds nothing; Apply, then the AI chip removes it.
  await page.getByTestId('ai-summary').click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.locator('.bn-editor').getByText('That is the summary.'),
  ).toHaveCount(0)
  await page.getByTestId('ai-summary').click()
  await page.getByTestId('ai-preview-edit').click()
  await page
    .getByTestId('ai-preview-text')
    .fill('Cells make energy. My own edit.')
  await page.getByTestId('ai-preview-apply').click()
  await expect(main(page).getByText('My own edit.')).toBeVisible()
  await page.getByTestId('ai-badge').click()
  await page.getByRole('menuitem', { name: 'Keep as mine' }).click()
  await expect(page.getByTestId('ai-badge')).toHaveCount(0)
  await expect(main(page).getByText('My own edit.')).toBeVisible()
})

test('Cards from this page: an approval list, then cards marked as AI-made', async ({
  page,
}) => {
  await page.route('https://api.anthropic.com/v1/messages', (route) =>
    route.fulfill({
      json: {
        content: [
          {
            type: 'text',
            text: '## Cards\nQ: Where is energy made?\nA: In the mitochondria.\nQ: Unwanted card?\nA: Yes.\nCloze: Cells make {{energy}}.',
          },
        ],
        usage: { input_tokens: 80, output_tokens: 60 },
      },
    }),
  )
  await bookPage(page)
  await setUpAi(page)
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-cards-page').click()
  await page.getByTestId('ai-privacy-ok').click()
  const dialog = page.getByTestId('ai-approval')
  await expect(dialog.getByRole('checkbox')).toHaveCount(3)
  await dialog.getByRole('checkbox').nth(1).uncheck()
  await dialog.getByTestId('ai-approve').click()
  await expect(main(page).getByText('Where is energy made?')).toBeVisible()
  await expect(main(page).getByText('Unwanted card?')).toHaveCount(0)
  await expect(page.getByTestId('ai-badge')).toBeVisible()
})

test('a notebook that does not allow AI, a refused key and a spent cap say so', async ({
  page,
}) => {
  await page.route('https://api.anthropic.com/v1/messages', (route) =>
    route.fulfill({ status: 401, json: { error: 'bad key' } }),
  )
  await bookPage(page)
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  // Not allowed in this notebook yet.
  await page.getByTestId('ai-summary').click()
  await expect(page.getByText('AI is off for this notebook.')).toBeVisible()

  await page.goto('/#/settings/ai')
  await allowBooks(page)
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-summary').click()
  await page.getByTestId('ai-privacy-ok').click()
  await expect(page.getByText(/the key was refused/)).toBeVisible()

  // A cap of 0 stops the next call before it is made.
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-cap').fill('0')
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-summary').click()
  await expect(page.getByText(/monthly cap is reached/)).toBeVisible()
})

test('forgetting the key removes it from this device', async ({ page }) => {
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await page.getByTestId('ai-key-forget').click()
  await expect(page.getByTestId('ai-key')).toBeVisible()
  const stored = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.includes('ai.key')),
  )
  expect(stored).toEqual([])
})

test('Cards from highlights: only the highlights are sent, each card is approved on its own, one Undo removes them', async ({
  page,
}) => {
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      json: {
        content: [
          {
            type: 'text',
            text: '## Cards\nQ: Where is energy made?\nA: In the mitochondria.\nQ: Skip me?\nA: Yes.',
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
      },
    })
  })
  await bookPage(page)
  await page.getByTestId('book-continue').click()
  await expect(async () => {
    await page.evaluate(() => {
      const span = Array.from(
        document.querySelectorAll('.textLayer span'),
      ).find((s) => s.textContent?.includes('mitochondria'))
      if (!span) throw new Error('no text yet')
      const range = document.createRange()
      range.selectNodeContents(span)
      getSelection()!.removeAllRanges()
      getSelection()!.addRange(range)
    })
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1500,
    })
  }).toPass({ timeout: 20_000 })
  await page.getByTestId('hl-green').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
  await page.getByTestId('reader-close').click()
  await setUpAi(page)
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-cards-hl').click()
  await page.getByTestId('ai-privacy-ok').click()
  const dialog = page.getByTestId('ai-approval')
  await expect(dialog.getByRole('checkbox')).toHaveCount(2)
  const prompt = JSON.parse(bodies[0]).messages[0].content as string
  expect(prompt).toContain('- Cells make energy in mitochondria')
  await dialog.getByRole('checkbox').nth(1).uncheck()
  await dialog.getByTestId('ai-approve').click()
  await expect(main(page).getByText('Where is energy made?')).toBeVisible()
  await expect(main(page).getByText('Skip me?')).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(main(page).getByText('Where is energy made?')).toHaveCount(0)
})
