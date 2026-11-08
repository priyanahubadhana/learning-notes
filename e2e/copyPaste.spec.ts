// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  dockedBar,
  openPage,
  pageSubAction,
  selectText,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Copy and paste: normal copy and paste keep formatting, links and pictures
 * (same page, another page, another notebook); the menus add Copy as plain
 * text / Markdown / page with pictures and Paste as plain text; pasted web
 * HTML is cleaned.
 */

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

// A 2×2 red PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
  'base64',
)

const editor = (page: Page) => page.locator('.bn-editor')
const toast = (page: Page, text: string | RegExp) =>
  page.getByRole('status').filter({ hasText: text })
const clipboardText = (page: Page) =>
  page.evaluate(() => navigator.clipboard.readText())

/** Sets the system clipboard to rich content (HTML + plain text). */
const setClipboard = (page: Page, html: string, text: string) =>
  page.evaluate(
    async ([h, t]) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([h], { type: 'text/html' }),
          'text/plain': new Blob([t], { type: 'text/plain' }),
        }),
      ])
    },
    [html, text],
  )

/** Lines: formatted words, a link and a picture, then selects it all. */
async function writeRichPage(page: Page) {
  await editor(page).click()
  await page.keyboard.type('alpha ')
  await page.keyboard.press('Control+b')
  await page.keyboard.type('beta')
  await page.keyboard.press('Control+b')
  await page.keyboard.type(' https://example.com/g ')
  await expect(editor(page).locator('a')).toHaveCount(1) // the link has formed
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Place picture' }).click()
  await expect(editor(page).locator('img')).toHaveAttribute('src', /^blob:/)
  await page.waitForTimeout(900)
}

async function startPage(page: Page, mode?: 'touch') {
  if (mode) await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
}

test('normal copy and paste keep formatting and pictures, on the same page', async ({
  page,
}) => {
  await startPage(page)
  await writeRichPage(page)
  await editor(page).click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+c')
  // The copy writes the clipboard asynchronously: wait until it holds the
  // page (the old test pasted too soon about one run in three).
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          if (item.types.includes('text/html')) {
            return (await (await item.getType('text/html')).text()).includes(
              'beta',
            )
          }
        }
        return false
      }),
    )
    .toBe(true)
  // Put the cursor in the first line, then at the end of the page.
  await page.getByRole('textbox', { name: 'Page title' }).click()
  await editor(page).locator('p').last().click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('strong')).toHaveCount(2)
  await expect(editor(page).locator('img')).toHaveCount(2)
  await expect(
    editor(page).locator('a[href^="https://example.com"]'),
  ).toHaveCount(2)
  for (const img of await editor(page).locator('img').all()) {
    await expect(img).toHaveAttribute('src', /^blob:/)
  }
})

test('normal copy and paste keep everything on another page and in another notebook', async ({
  page,
}) => {
  await startPage(page)
  await writeRichPage(page)
  await editor(page).click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+c')

  // Another page in the same notebook.
  await addPage(page, 'Cardiology', 'Second page')
  await editor(page).click()
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('strong')).toHaveText('beta')
  await expect(editor(page).locator('img')).toHaveAttribute('src', /^blob:/)
  await expect(
    editor(page).locator('a[href^="https://example.com"]'),
  ).toHaveCount(1)
  await page.waitForTimeout(900)

  // Another notebook.
  await createNotebook(page, 'Neurology', 'Brain page')
  await editor(page).click()
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('strong')).toHaveText('beta')
  await expect(editor(page).locator('img')).toHaveAttribute('src', /^blob:/)
  await page.waitForTimeout(900)
  // And it is still there after a reload (the picture is kept in the app).
  await page.reload()
  await expect(editor(page).locator('img')).toHaveAttribute('src', /^blob:/)
  await openPage(page, 'Heart sounds')
  await expect(editor(page).locator('strong')).toHaveText('beta')
})

test('block menu: Copy as plain text and Copy as Markdown say Copied', async ({
  page,
}) => {
  await startPage(page)
  await editor(page).click()
  await page.keyboard.type('plain ')
  await page.keyboard.press('Control+b')
  await page.keyboard.type('bold')
  await page.keyboard.press('Control+b')
  await page.waitForTimeout(700)
  const block = page.locator('.bn-block-content', { hasText: 'plain bold' })
  await block.hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Copy as plain text' }).click()
  await expect(toast(page, 'Copied')).toBeVisible()
  expect(await clipboardText(page)).toBe('plain bold')

  await block.hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Copy as Markdown' }).click()
  await expect(toast(page, 'Copied')).toBeVisible()
  expect(await clipboardText(page)).toContain('plain **bold**')
})

test('page menu: plain text, Markdown and page with pictures', async ({
  page,
}) => {
  await startPage(page)
  await writeRichPage(page)

  await pageSubAction(page, 'Copy & paste', 'Copy page as plain text')
  await expect(toast(page, 'Copied')).toBeVisible()
  expect(await clipboardText(page)).toContain('alpha beta https://example.com')

  await pageSubAction(page, 'Copy & paste', 'Copy page as Markdown')
  expect(await clipboardText(page)).toContain('alpha **beta**')
  expect(await clipboardText(page)).toContain('(https://example.com')

  await pageSubAction(page, 'Copy & paste', 'Copy page with pictures')
  // The clipboard is shared with other tests: a read can fail with
  // "Clipboard data has changed", so it is simply tried again.
  const readItems = () =>
    page.evaluate(async () => {
      try {
        const [item] = await navigator.clipboard.read()
        const read = async (type: string) =>
          item.types.includes(type)
            ? await (await item.getType(type)).text()
            : ''
        return {
          types: item.types,
          html: await read('text/html'),
          text: await read('text/plain'),
        }
      } catch {
        return { types: [] as string[], html: '', text: '' }
      }
    })
  await expect
    .poll(async () => (await readItems()).types)
    .toContain('text/html')
  await expect
    .poll(async () => (await readItems()).html)
    .toContain('<strong>beta</strong>')
  const items = await readItems()
  expect(items.types).toEqual(
    expect.arrayContaining(['text/html', 'text/plain']),
  )
  expect(items.html).toContain('<strong>beta</strong>')
  // The picture travels inside the HTML, so it pastes into Word or Gmail.
  expect(items.html).toMatch(/<img[^>]+src="data:image\/png;base64,/)
  expect(items.html).not.toContain('blob:')
  expect(items.html).not.toContain('lnimg:')
  expect(items.text).toContain('alpha beta https://example.com')
})

test('Copy page with pictures falls back to text when the browser blocks it', async ({
  page,
}) => {
  await startPage(page)
  await typeInEditor(page, 'only words here')
  await page.evaluate(() => {
    navigator.clipboard.write = () => Promise.reject(new Error('blocked'))
  })
  await pageSubAction(page, 'Copy & paste', 'Copy page with pictures')
  await expect(toast(page, /text only/)).toBeVisible()
  expect(await clipboardText(page)).toBe('only words here')
})

test('Paste as plain text from the page menu drops the formatting', async ({
  page,
}) => {
  await startPage(page)
  await setClipboard(
    page,
    '<p><strong>Bold</strong> and <em>slanted</em> text</p>',
    'Bold and slanted text',
  )
  await editor(page).click()
  await pageSubAction(page, 'Copy & paste', 'Paste as plain text')
  await expect(editor(page)).toContainText('Bold and slanted text')
  await expect(editor(page).locator('strong, em')).toHaveCount(0)
  await expect(toast(page, 'Pasted')).toBeVisible()
})

test('Ctrl+Shift+V pastes plain text, Ctrl+V keeps the formatting', async ({
  page,
}) => {
  await startPage(page)
  await setClipboard(
    page,
    '<p>one <strong>two</strong></p><p>three</p>',
    'one two\nthree',
  )
  await editor(page).click()
  await page.keyboard.press('Control+Shift+v')
  await expect(editor(page)).toContainText('one two')
  await expect(editor(page)).toContainText('three')
  await expect(editor(page).locator('strong')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('strong')).toHaveText('two')
})

test('Paste as plain text says what to do when the browser blocks reading', async ({
  page,
}) => {
  await startPage(page)
  await page.evaluate(() => {
    navigator.clipboard.readText = () => Promise.reject(new Error('denied'))
  })
  await editor(page).click()
  await pageSubAction(page, 'Copy & paste', 'Paste as plain text')
  await expect(toast(page, /Ctrl\+Shift\+V/)).toBeVisible()
})

test('pasted web pages are cleaned: no scripts, handlers or javascript: links', async ({
  page,
}) => {
  await startPage(page)
  await editor(page).click()
  await page.evaluate(() => {
    ;(window as unknown as { hacked: boolean }).hacked = false
    const data = new DataTransfer()
    data.setData(
      'text/html',
      '<p onclick="window.hacked=true" style="color:red">Safe <a href="javascript:window.hacked=true">bad</a> ' +
        '<a href="https://ok.example/p" onmouseover="window.hacked=true">good</a>' +
        '<img src="x" onerror="window.hacked=true"><script>window.hacked=true</script></p>' +
        '<iframe src="https://evil.example"></iframe>',
    )
    data.setData('text/plain', 'Safe bad good')
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await expect(editor(page)).toContainText('Safe')
  await expect(
    editor(page).locator('a[href="https://ok.example/p"]'),
  ).toHaveCount(1)
  await expect(editor(page).locator('a[href^="javascript"]')).toHaveCount(0)
  await expect(editor(page).locator('iframe, script')).toHaveCount(0)
  await expect(
    editor(page).locator('[onclick], [onerror], [onmouseover]'),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => (window as unknown as { hacked: boolean }).hacked,
    ),
  ).toBe(false)
})

test('the toolbar menu copies the selection as plain text and Markdown', async ({
  page,
}) => {
  test.slow()
  await page.setViewportSize({ width: 820, height: 1180 })
  await startPage(page, 'touch')
  await typeInEditor(page, 'S1 is the first heart sound')
  const menu = () =>
    dockedBar(page).getByRole('button', { name: 'Toolbar menu' })
  await selectText(page, 'first heart')
  await menu().click()
  await page
    .getByRole('group', { name: 'Toolbar menu' })
    .getByRole('button', { name: 'Copy as plain text' })
    .click()
  await expect(toast(page, 'Copied')).toBeVisible()
  expect(await clipboardText(page)).toBe('first heart')

  await selectText(page, 'first heart')
  await menu().click()
  await page
    .getByRole('group', { name: 'Toolbar menu' })
    .getByRole('button', { name: 'Copy as Markdown' })
    .click()
  await expect(toast(page, 'Copied')).toBeVisible()
  expect(await clipboardText(page)).toContain('first heart')
})
