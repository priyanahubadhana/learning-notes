// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/** Several named keys, the model cards, and a notebook's own key and model. */

test.use({ viewport: { width: 1200, height: 900 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function addKey(page: Page, provider: string, name: string, key: string) {
  await page.getByTestId('ai-provider').selectOption(provider)
  await page.getByTestId('ai-key-name').fill(name)
  await page.getByTestId('ai-key').fill(key)
  await page.getByTestId('ai-key-save').click()
}

const cards = (page: Page) => page.getByTestId('ai-model-card')
const order = (page: Page) =>
  cards(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-model')))

test('keys: add, rename, replace, test and delete with a confirm; masked; device only', async ({
  page,
}) => {
  await page.route('https://api.anthropic.com/v1/messages', (route) =>
    route.fulfill({
      json: {
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 10, output_tokens: 2 },
      },
    }),
  )
  await page.goto('/#/settings/ai')
  await expect(page.getByTestId('ai-section')).toBeVisible()
  await addKey(page, 'anthropic', 'Claude main', 'sk-ant-main-1111aaaa')
  await addKey(page, 'gemini', 'Gemini free', 'AIza-free-key-2222bbbb')
  const rows = page.getByTestId('ai-key-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0).getByTestId('ai-key-masked')).toContainText(
    'sk-…aaaa',
  )
  await expect(rows.nth(0)).not.toContainText('sk-ant-main-1111aaaa')

  await rows.nth(1).getByTestId('ai-key-rename').click()
  await page.getByTestId('ai-key-input').fill('Gemini study')
  await page.getByTestId('ai-key-apply').click()
  await expect(rows.nth(1).getByTestId('ai-key-title')).toHaveText(
    'Gemini study',
  )

  await rows.nth(1).getByTestId('ai-key-edit').click()
  await page.getByTestId('ai-key-input').fill('AIza-new-key-3333cccc')
  await page.getByTestId('ai-key-apply').click()
  await expect(rows.nth(1).getByTestId('ai-key-masked')).toContainText(
    'AIz…cccc',
  )
  await expect(rows.nth(1).getByTestId('ai-key-title')).toHaveText(
    'Gemini study',
  )

  await rows.nth(0).getByTestId('ai-key-test').click()
  await expect(rows.nth(0).getByTestId('ai-key-test-result')).toHaveText(
    'The key works.',
  )
  await expect(rows.nth(0).getByTestId('ai-key-used')).toBeVisible()
  await expect(page.getByTestId('ai-usage-keys')).toContainText('Claude main')

  // Delete asks first; No keeps it.
  await rows.nth(1).getByTestId('ai-key-delete').click()
  await expect(page.getByRole('alertdialog')).toContainText('Gemini study')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(rows).toHaveCount(2)
  await rows.nth(1).getByTestId('ai-key-delete').click()
  await page.getByTestId('ai-key-delete-yes').click()
  await expect(rows).toHaveCount(1)

  // The keys are in localStorage only, never in the page database.
  const inDb = await page.evaluate(async () => {
    const names = (await indexedDB.databases()).map((d) => d.name!)
    let hit = false
    for (const n of names) {
      const open = indexedDB.open(n)
      const dbx = await new Promise<IDBDatabase>((r) => {
        open.onsuccess = () => r(open.result)
      })
      for (const store of Array.from(dbx.objectStoreNames)) {
        const all = await new Promise<unknown[]>((r) => {
          const q = dbx.transaction(store).objectStore(store).getAll()
          q.onsuccess = () => r(q.result)
        })
        if (JSON.stringify(all).includes('sk-ant-main-1111aaaa')) hit = true
      }
      dbx.close()
    }
    return hit
  })
  expect(inDb).toBe(false)
})

test('model cards: badges, Move up/down for the keyboard, drag with a pointer, order is kept', async ({
  page,
}) => {
  await page.goto('/#/settings/ai')
  await expect(cards(page).first()).toBeVisible()
  const first = cards(page).first()
  await expect(first).toContainText('Low cost')
  await expect(first.getByTestId('ai-model-vision')).toBeVisible()
  await expect(first).toContainText('Good:')
  const gemini = page.locator('[data-model="gemini-3.5-flash-lite"]')
  await expect(gemini.getByTestId('ai-model-cost')).toHaveText('Free tier')
  await expect(gemini).toContainText(
    'Free; Google may use data to improve products.',
  )
  await expect(
    page.locator('[data-model="claude-opus-5-5"]').getByTestId('ai-model-cost'),
  ).toHaveText('High cost')

  // Keyboard: Move down on the first card.
  const start = await order(page)
  const down = first.getByTestId('ai-model-down')
  await down.focus()
  await page.keyboard.press('Enter')
  expect((await order(page)).slice(0, 2)).toEqual([start[1], start[0]])
  await expect(first.getByTestId('ai-model-up')).toBeDisabled()

  // Pointer drag: the Gemini 3.5 card to the top.
  const grip = gemini.getByTestId('ai-model-grip')
  await grip.scrollIntoViewIfNeeded()
  const g = (await grip.boundingBox())!
  const top = (await cards(page).first().boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y - 40, { steps: 6 })
  await page.mouse.move(g.x + g.width / 2, top.y + 4, { steps: 12 })
  await page.mouse.up()
  await expect
    .poll(async () => (await order(page))[0])
    .toBe('gemini-3.5-flash-lite')

  // The order is kept after a reload.
  await page.reload()
  await expect(cards(page).first()).toBeVisible()
  expect((await order(page))[0]).toBe('gemini-3.5-flash-lite')
})

test('a notebook uses its own key and model; the default is used elsewhere', async ({
  page,
}) => {
  const bodies: { url: string; body: string }[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push({ url: 'anthropic', body: route.request().postData() ?? '' })
    return route.fulfill({
      json: {
        content: [{ type: 'text', text: 'Summary from Sonnet.' }],
        usage: { input_tokens: 80, output_tokens: 25 },
      },
    })
  })
  await page.route('https://generativelanguage.googleapis.com/**', (route) => {
    bodies.push({ url: 'gemini', body: route.request().postData() ?? '' })
    return route.fulfill({
      json: {
        choices: [{ message: { content: 'Summary from Gemini.' } }],
        usage: { prompt_tokens: 80, completion_tokens: 25 },
      },
    })
  })
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

  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-enable').check()
  await addKey(page, 'anthropic', 'Claude private', 'sk-ant-priv-1111aaaa')
  await addKey(page, 'gemini', 'Gemini free', 'AIza-free-key-2222bbbb')
  // Default: Gemini first.
  for (let i = 0; i < 4; i++) {
    const up = page
      .locator('[data-model="gemini-3.5-flash-lite"]')
      .getByTestId('ai-model-up')
    if (await up.isEnabled()) await up.click()
  }
  await expect(cards(page).first().getByTestId('ai-model-rank')).toHaveText(
    'Default',
  )
  await page.goto('/#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()

  const run = async () => {
    await space(page, 'Library').click()
    await page
      .getByTestId('source-card')
      .getByRole('button', { name: 'Cell Book' })
      .click()
    await page.getByTestId('ai-summary').click()
    // The privacy sheet opens a moment after the click, so wait for whichever
    // of the two shows up instead of peeking once.
    const ok = page.getByTestId('ai-privacy-ok')
    const text = page.getByTestId('ai-preview-text')
    await expect(ok.or(text)).toBeVisible()
    if (await ok.isVisible()) await ok.click()
    await expect(text).toBeVisible()
  }

  await run()
  await expect(page.getByTestId('ai-preview-text')).toContainText(
    'Summary from Gemini.',
  )
  expect(bodies.map((b) => b.url)).toEqual(['gemini'])

  // Books now uses Claude private + Sonnet.
  await page.goto('/#/settings/permissions')
  await page
    .getByRole('combobox', { name: 'Key and model for Books' })
    .selectOption({ label: 'Claude private · Claude Sonnet 5.5' })
  await run()
  await expect(page.getByTestId('ai-preview-text')).toContainText(
    'Summary from Sonnet.',
  )
  expect(bodies.map((b) => b.url)).toEqual(['gemini', 'anthropic'])
  expect(JSON.parse(bodies[1].body).model).toBe('claude-sonnet-5-5')
  await page.goto('/#/settings/ai')
  await expect(page.getByTestId('ai-usage-keys')).toContainText(
    'Claude private',
  )
})
