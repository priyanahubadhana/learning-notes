// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Toolbar v8, slice 1d (TB-33) on iPad WebKit too. WebKit has no clipboard
 * permission, so nothing here asks for one: the clipboard is stubbed in the
 * page, and "Paste as" plain gets a synthetic paste event. The chromium
 * tests with the real clipboard stay in toolbarV8Paste.spec.ts.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const HTML = '<p>Plain and <b>strong words</b></p><ul><li>first item</li></ul>'
const TEXT = 'Plain and strong words\nfirst item'

async function open(
  page: Page,
  mode: 'keep' | 'plain',
  clipboard: 'html' | 'blocked',
) {
  await page.addInitScript(
    ({ m, c, html, text }) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      )
      localStorage.setItem('learning-notes:general.pasteMode', `"${m}"`)
      const stub =
        c === 'html'
          ? {
              read: async () => [
                {
                  types: ['text/html', 'text/plain'],
                  getType: async (type: string) =>
                    new Blob([type === 'text/html' ? html : text], { type }),
                },
              ],
              readText: async () => text,
            }
          : {
              read: async () => {
                throw new DOMException('denied', 'NotAllowedError')
              },
              readText: async () => {
                throw new DOMException('denied', 'NotAllowedError')
              },
            }
      Object.defineProperty(navigator, 'clipboard', {
        value: stub,
        configurable: true,
      })
    },
    { m: mode, c: clipboard, html: HTML, text: TEXT },
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-lasso').click()
  await page.getByText('The nucleus holds the DNA').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
}

test('TB-33 iPad: the bar Paste keeps bold and a list (stubbed clipboard)', async ({
  page,
}) => {
  await open(page, 'keep', 'html')
  await page.getByTestId('v8-sel-paste').click()
  await expect(page.locator('.bn-editor strong')).toContainText('strong words')
  await expect(
    page.locator('.bn-editor [data-content-type="bulletListItem"]'),
  ).toContainText('first item')
})

test('TB-33 iPad: the bar Paste with a refused clipboard says what to press instead', async ({
  page,
}) => {
  await open(page, 'keep', 'blocked')
  await page.getByTestId('v8-sel-paste').click()
  await expect(
    page.getByText(/did not allow reading the clipboard/),
  ).toBeVisible()
  await expect(page.locator('.bn-editor strong')).toHaveCount(0)
})

test('TB-33 iPad: "Paste as" plain text gives no bold and no list (synthetic paste)', async ({
  page,
}) => {
  await open(page, 'plain', 'html')
  await page.evaluate(
    ({ html, text }) => {
      const data = new DataTransfer()
      data.setData('text/html', html)
      data.setData('text/plain', text)
      const target =
        document.querySelector('.bn-editor [contenteditable="true"]') ??
        document.querySelector('.bn-editor')!
      target.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    { html: HTML, text: TEXT },
  )
  await expect(page.locator('.bn-editor')).toContainText('strong words')
  await expect(page.locator('.bn-editor strong')).toHaveCount(0)
  await expect(
    page.locator('.bn-editor [data-content-type="bulletListItem"]'),
  ).toHaveCount(0)
})
