// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Source-aware paste: Gemini / ChatGPT HTML, Markdown text, tree drawings,
 * Notion database rows, the paste chooser and the chip that swaps the result.
 */

const editor = (page: Page) => page.locator('.bn-editor')

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Paste', 'Page one')
  await editor(page).click()
}

const paste = (page: Page, html: string, text: string) =>
  page.evaluate(
    ([h, t]) => {
      const data = new DataTransfer()
      if (h) data.setData('text/html', h)
      data.setData('text/plain', t)
      document.querySelector('.bn-editor')!.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    [html, text],
  )

const GEMINI =
  '<message-content><div class="markdown"><h2 data-path-to-node="1">Agents explained</h2>' +
  '<p><b>Goal:</b> understand agents ✅ not chatbots ❌</p>' +
  '<ul><li><p><b>Level 1:</b> a plain LLM with <code>no tools</code></p></li><li><p>Level 2</p></li></ul>' +
  '<table><thead><tr><th>Level</th><th>Tool Access</th></tr></thead><tbody><tr><td>1</td><td>None</td></tr></tbody></table>' +
  '<blockquote><p>Agents act.</p></blockquote>' +
  '<p>See <a href="https://example.com/a">sources</a></p></div></message-content>'

test('Gemini HTML keeps heading, bold label, list, table, quote and link', async ({
  page,
}) => {
  await start(page)
  await paste(page, GEMINI, 'Agents explained\nGoal: x')
  await expect(editor(page).locator('h2')).toContainText('Agents explained')
  await expect(editor(page).locator('strong, b').first()).toContainText('Goal:')
  await expect(editor(page).locator('table')).toHaveCount(1)
  await expect(editor(page)).toContainText('Tool Access')
  await expect(
    editor(page).locator('a[href="https://example.com/a"]'),
  ).toHaveCount(1)
  await expect(editor(page)).toContainText('✅')
  await expect(editor(page).locator('[data-content-type="quote"]')).toHaveCount(
    1,
  )
})

const MD =
  '## Steps\n\n- **Plan:** write it\n- Do it\n\n| Level | Tool |\n| --- | --- |\n| 1 | None |\n\n```\nlet a = 1\n```\n'

test('Markdown text becomes headings, lists, a table and code', async ({
  page,
}) => {
  await start(page)
  await paste(page, '', MD)
  await expect(editor(page).locator('h2')).toContainText('Steps')
  await expect(
    editor(page).locator('[data-content-type="bulletListItem"]'),
  ).toHaveCount(2)
  await expect(editor(page).locator('table')).toHaveCount(1)
  await expect(
    editor(page).locator('[data-content-type="codeBlock"]'),
  ).toContainText('let a = 1')
})

test('a tree drawing keeps its spacing in a code block', async ({ page }) => {
  await start(page)
  await paste(page, '', 'project/\n├── src/\n│   ├── main.ts\n└── README.md')
  const code = editor(page).locator('[data-content-type="codeBlock"]')
  await expect(code).toHaveCount(1)
  await expect(code).toContainText('│   ├── main.ts')
})

test('Notion database rows paste as our Database block', async ({ page }) => {
  await start(page)
  await paste(
    page,
    '<table class="collection-content"><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td>📄 Alpha</td><td>Done</td></tr><tr><td>Beta</td><td>Open</td></tr></tbody></table>',
    '📄 Alpha\tDone\nBeta\tOpen',
  )
  await expect(
    editor(page).locator('[data-content-type="database"]'),
  ).toHaveCount(1)
  await expect(editor(page)).toContainText('Alpha')
  await expect(
    editor(page).locator('[data-content-type="heading"]'),
  ).toHaveCount(0)
})

test.describe('the paste chooser', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
    )
  })

  test('asks, Enter keeps the format, the chip swaps to plain text in one Undo', async ({
    page,
  }) => {
    await start(page)
    await paste(page, GEMINI, 'Agents explained')
    const dialog = page.getByRole('dialog', { name: 'Paste as' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('option')).toHaveCount(2)
    await page.keyboard.press('Enter')
    await expect(editor(page).locator('h2')).toHaveCount(1)
    const chip = page.getByRole('group', { name: 'Pasted as' })
    await expect(chip).toBeVisible()
    await chip.getByRole('button', { name: 'Plain text' }).click()
    await expect(editor(page).locator('h2')).toHaveCount(0)
    await expect(editor(page)).toContainText('Agents explained')
  })

  test('Esc cancels the paste', async ({ page }) => {
    await start(page)
    await paste(page, GEMINI, 'Agents explained')
    await expect(page.getByRole('dialog', { name: 'Paste as' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Paste as' })).toHaveCount(0)
    await expect(editor(page)).not.toContainText('Agents')
  })

  test('"Always use this" saves the choice in Settings', async ({ page }) => {
    await start(page)
    await paste(page, GEMINI, 'Agents explained')
    const dialog = page.getByRole('dialog', { name: 'Paste as' })
    await dialog.getByLabel('Always use this, do not ask again').check()
    await dialog.getByRole('option', { name: /Plain text/ }).click()
    await expect(editor(page).locator('h2')).toHaveCount(0)
    expect(
      await page.evaluate(() =>
        localStorage.getItem('learning-notes:general.pasteMode'),
      ),
    ).toBe('"plain"')
    await paste(page, GEMINI, 'Second paste')
    await expect(page.getByRole('dialog', { name: 'Paste as' })).toHaveCount(0)
    await expect(editor(page)).toContainText('Second paste')
  })
})

test('a lone YouTube address becomes an Embed; the chip swaps it to a link and to plain text', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
  )
  await start(page)
  await paste(page, '', 'https://youtu.be/dQw4w9WgXcQ')
  const dialog = page.getByRole('dialog', { name: 'Paste as' })
  await expect(dialog.getByRole('option')).toHaveCount(3)
  await expect(dialog.getByRole('option', { name: /Embed/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('[data-content-type="embed"]')).toHaveCount(
    1,
  )
  const chip = page.getByRole('group', { name: 'Pasted as' })
  await chip.getByRole('button', { name: 'Link', exact: true }).click()
  await expect(editor(page).locator('[data-content-type="embed"]')).toHaveCount(
    0,
  )
  await expect(editor(page).locator('a[href*="youtube.com"]')).toHaveCount(1)
  await chip.getByRole('button', { name: 'Plain URL' }).click()
  await expect(editor(page).locator('a[href*="youtube.com"]')).toHaveCount(0)
  await expect(editor(page)).toContainText('https://youtu.be/dQw4w9WgXcQ')
})
