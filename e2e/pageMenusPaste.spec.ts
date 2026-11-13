// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice 12 rest (flag page.menus): the paste rules PM-42, PM-43, PM-44 and
 * PM-46 (docs/features/page-menus.md). Every paste is a synthetic
 * ClipboardEvent with a DataTransfer, so it needs no clipboard permission and
 * runs the same on chromium and ipad-webkit.
 */
test.use({ viewport: { width: 1024, height: 900 } })

const editor = (page: Page) => page.locator('.bn-editor')

async function open(
  page: Page,
  level: 'beginner' | 'professional',
  mode: 'ask' | null,
) {
  await page.addInitScript(
    ([l, m]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: [] }),
      )
      if (m) localStorage.setItem('learning-notes:general.pasteMode', `"${m}"`)
    },
    [level, mode] as const,
  )
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Biology', 'First')
  await editor(page).click()
}

const RICH = '<h2>Cell heading</h2><p><b>bold</b> and <i>rich</i> words</p>'
const PLAIN = 'Cell heading\nbold and rich words'

/** Optionally press Ctrl/Cmd+Shift+V (as a key event), then paste. */
const paste = (page: Page, html: string, text: string, plainKey = false) =>
  page.evaluate(
    ([h, t, k]) => {
      const ed = document.querySelector('.bn-editor')!
      if (k)
        ed.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'V',
            ctrlKey: true,
            metaKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          }),
        )
      const data = new DataTransfer()
      if (h) data.setData('text/html', h)
      data.setData('text/plain', t)
      ed.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    [html, text, plainKey] as const,
  )

test('PM-42 Ctrl/Cmd+Shift+V pastes plain text, flag on', async ({ page }) => {
  await open(page, 'beginner', null)
  await paste(page, RICH, PLAIN, true)
  await expect(editor(page)).toContainText('bold and rich words')
  await expect(editor(page).locator('h2')).toHaveCount(0)
  await expect(editor(page).locator('strong, b')).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Paste as' })).toHaveCount(0)
})

test('PM-43 default Keep original pastes the formatting at once', async ({
  page,
}) => {
  await open(page, 'beginner', null)
  await paste(page, RICH, PLAIN)
  await expect(editor(page).locator('h2')).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'Paste as' })).toHaveCount(0)
})

test('PM-43 "Always ask" opens the chooser before pasting', async ({
  page,
}) => {
  await open(page, 'beginner', 'ask')
  await paste(page, RICH, PLAIN)
  await expect(page.getByRole('dialog', { name: 'Paste as' })).toBeVisible()
  await expect(editor(page)).not.toContainText('Cell heading')
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('h2')).toHaveCount(1)
})

test('PM-44 the "Pasted as" chip is hidden for Beginner', async ({ page }) => {
  await open(page, 'beginner', 'ask')
  await paste(page, RICH, PLAIN)
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('h2')).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Pasted as' })).toHaveCount(0)
})

test('PM-44 the "Pasted as" chip shows in Professional', async ({ page }) => {
  await open(page, 'professional', 'ask')
  await paste(page, RICH, PLAIN)
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('h2')).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Pasted as' })).toBeVisible()
})

test('PM-46 pasted HTML is cleaned: scripts, handlers and styles are gone', async ({
  page,
}) => {
  await open(page, 'beginner', null)
  await paste(
    page,
    '<p onclick="window.__x=1" style="color:red">safe words</p><script>window.__y=1</script><img src=x onerror="window.__z=1">',
    'safe words',
  )
  await expect(editor(page)).toContainText('safe words')
  await expect(editor(page).locator('script')).toHaveCount(0)
  await expect(editor(page).locator('[onclick], [onerror]')).toHaveCount(0)
  expect(
    await page.evaluate(() => (window as never as { __z?: number }).__z),
  ).toBeUndefined()
})
