// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Owner bug: a pasted URL left "Enter text or type '/'" drawn over the text. */

const URL_TEXT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const CASES = [
  ['plain URL', ''],
  ['URL with HTML link', `<a href="${URL_TEXT}">${URL_TEXT}</a>`],
] as const

const pasteInto = (page: Page, selector: string, html: string) =>
  page.evaluate(
    ([sel, h, t]) => {
      const data = new DataTransfer()
      if (h) data.setData('text/html', h)
      data.setData('text/plain', t)
      document.querySelector(sel)!.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    [selector, html, URL_TEXT],
  )

/** Blocks that hold text but are still marked empty (they draw the placeholder). */
const staleEmpties = (page: Page, scope: string) =>
  page.evaluate(
    (sel) =>
      [
        ...document.querySelectorAll(
          `${sel} [data-is-empty-and-focused], ${sel} .bn-is-empty`,
        ),
      ].filter(
        (el) =>
          (el.textContent ?? '')
            .replace(new RegExp(String.fromCharCode(0x200b), 'g'), '')
            .trim() !== '',
      ).length,
    scope,
  )

for (const [name, html] of CASES) {
  test(`no placeholder over a pasted ${name} in an empty page`, async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Paste', 'Page one')
    await page.locator('.bn-editor').click()
    await pasteInto(page, '.bn-editor', html)
    await expect(page.locator('[data-content-type="embed"]')).toHaveCount(1)
    expect(await staleEmpties(page, '.bn-editor')).toBe(0)
  })

  test(`no placeholder over a pasted ${name} in a new empty box`, async ({
    page,
  }) => {
    await startInMode(page, 'computer')
    await page.goto('/')
    await createNotebook(page, 'Paste', 'Boxes')
    await typeInEditor(page, 'Main text')
    const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
    const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
    await page.mouse.click(
      sheet.x + sheet.width * 0.5,
      main.y + main.height + 60,
    )
    const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')
    await expect(extra).toHaveCount(1)
    await expect(extra.locator('.bn-editor')).toBeFocused()
    await pasteInto(
      page,
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
      html,
    )
    await expect(extra.locator('[data-content-type="embed"]')).toHaveCount(1)
    expect(
      await staleEmpties(page, '[data-paper-box]:not([data-paper-box="main"])'),
    ).toBe(0)
  })
}
