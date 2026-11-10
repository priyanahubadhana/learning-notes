// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, openPage } from './helpers.ts'

/**
 * Copy side: Ctrl+C of a rich page puts rich HTML, clean Markdown and our own
 * lossless format on the clipboard together; pasting it back gives identical
 * blocks. Block menu Copy and "Copy as..." write the formats asked for.
 */

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

const editor = (page: Page) => page.locator('.bn-editor')

const MD =
  '## Steps\n\n- **Plan:** write it\n  - nested [link](https://example.com)\n- Do it\n\n1. first\n2. second\n\n| Level | Tool |\n| --- | --- |\n| 1 | None |\n\n```\nlet a = 1\n```\n'

/** The page's blocks as comparable text: type, level and words of each. */
const shape = (page: Page) =>
  editor(page).evaluate((el) =>
    [...el.querySelectorAll('[data-content-type]')]
      .map(
        (b) =>
          b.getAttribute('data-content-type') +
          ':' +
          (b.getAttribute('data-level') ?? '') +
          ':' +
          (b.innerHTML ?? '').replace(
            / (class|style|data-[a-z-]+)="[^"]*"/g,
            '',
          ),
      )
      .filter((l) => !/^paragraph::(<p>)?(<br>)?(<\/p>)?$/.test(l))
      .join('|'),
  )

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Copy', 'Page one')
  await editor(page).click()
  await page.evaluate((md) => {
    const data = new DataTransfer()
    data.setData('text/plain', md)
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, MD)
  await expect(editor(page).locator('h2')).toContainText('Steps')
  await expect(editor(page).locator('table')).toHaveCount(1)
}

test('Ctrl+C of a rich page: html, Markdown and our format together; paste back is identical', async ({
  page,
}) => {
  await start(page)
  const before = await shape(page)
  await page.evaluate(() => {
    const w = window as unknown as { __copied: Record<string, string> }
    document.addEventListener('copy', (e) => {
      const d = e.clipboardData!
      w.__copied = {
        types: d.types.join(','),
        plain: d.getData('text/plain'),
        html: d.getData('text/html'),
      }
    })
  })
  await editor(page).click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+c')
  const copied = await page.evaluate(
    () => (window as unknown as { __copied: Record<string, string> }).__copied,
  )
  expect(copied.types).toContain('blocknote/html')
  expect(copied.types).toContain('text/html')
  expect(copied.plain).toContain('## Steps')
  expect(copied.plain).toContain('| Level | Tool |')
  expect(copied.plain).toContain('[link](https://example.com)')
  expect(copied.plain).toContain('```')
  expect(copied.html).toContain('<h2>Steps</h2>')
  expect(copied.html).toContain('<table>')

  await addPage(page, 'Copy', 'Page two')
  await openPage(page, 'Page two')
  await editor(page).click()
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('table')).toHaveCount(1)
  expect(await shape(page)).toBe(before)
})

test('block menu: Copy puts every format; Copy as... Markdown writes Markdown only', async ({
  page,
}) => {
  await start(page)
  // The submenu opens on hover and the menu can redraw: open it all again
  // until it works (a slow runner).
  await expect(async () => {
    await page.keyboard.press('Escape')
    await editor(page).locator('h2').hover()
    await page.getByRole('button', { name: 'Open block menu' }).first().click()
    await page.getByRole('menuitem', { name: 'Copy as…' }).hover()
    await page
      .getByRole('menuitem', { name: 'Markdown' })
      .click({ timeout: 2000 })
  }).toPass({ timeout: 15_000 })
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('## Steps')
})

test('block menu Copy: rich html and Markdown on the clipboard, pastes back as the same block', async ({
  page,
}) => {
  await start(page)
  // The menu can redraw under the click on a slow runner: open it again.
  await expect(async () => {
    await page.keyboard.press('Escape')
    await editor(page).locator('h2').hover()
    await page.getByRole('button', { name: 'Open block menu' }).first().click()
    await page
      .getByRole('menuitem', { name: 'Copy', exact: true })
      .click({ timeout: 3000 })
  }).toPass({ timeout: 20_000 })
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const items = await navigator.clipboard.read()
        return items.flatMap((i) => i.types).join(',')
      }),
    )
    .toContain('text/html')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '## Steps',
  )
  await addPage(page, 'Copy', 'Page two')
  await openPage(page, 'Page two')
  await editor(page).click()
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('h2')).toHaveText('Steps')
})
