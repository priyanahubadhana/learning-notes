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
  unlocked: string[] = [],
) {
  await page.addInitScript(
    ([l, m, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
      if (m) localStorage.setItem('learning-notes:general.pasteMode', `"${m}"`)
    },
    [level, mode, unlocked] as const,
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

test('PM-44 the chip is off by default, even in Professional', async ({
  page,
}) => {
  await open(page, 'professional', 'ask')
  await paste(page, RICH, PLAIN)
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('h2')).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Pasted as' })).toHaveCount(0)
})

test('PM-44 with the switch on the chip shows for 8 s and re-pastes another form', async ({
  page,
}) => {
  await page.clock.install()
  await open(page, 'professional', 'ask', ['page.pastedChip'])
  await paste(page, RICH, PLAIN)
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('h2')).toHaveCount(1)
  const chip = page.getByRole('group', { name: 'Pasted as' })
  await expect(chip).toBeVisible()
  await page.clock.fastForward(7000)
  await expect(chip).toBeVisible()
  await page.clock.fastForward(1500)
  await expect(chip).toHaveCount(0)
  // A second paste: choosing another form re-pastes it.
  await editor(page).click()
  await paste(page, RICH, PLAIN)
  await page.keyboard.press('Enter')
  await expect(chip).toBeVisible()
  await chip.getByRole('button', { name: 'Plain text' }).click()
  await expect(editor(page).locator('h2')).toHaveCount(1)
  await expect(editor(page)).toContainText('Cell heading')
})

const pasteGroup = (page: Page) => page.getByRole('group', { name: 'Paste' })

test('PM-43 Settings shows Keep format as the choice with the flag on', async ({
  page,
}) => {
  await page.goto('/?flags=page.menus#/settings/general')
  await expect(
    pasteGroup(page).getByRole('button', { name: 'Keep format' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('PM-46 pasted HTML is cleaned: scripts, handlers and the style attribute are gone', async ({
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
  await expect(
    editor(page).locator('[onclick], [onerror], [style*="color:red"]'),
  ).toHaveCount(0)
  expect(
    await page.evaluate(() => (window as never as { __z?: number }).__z),
  ).toBeUndefined()
})

test('the "Pasted as" chip sits above the phone tab bar, never on it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'professional', 'ask', ['page.pastedChip'])
  await paste(page, RICH, PLAIN)
  await page.keyboard.press('Enter')
  const chip = page.getByRole('group', { name: 'Pasted as' })
  await expect(chip).toBeVisible()
  const bar = await page
    .locator('[data-space]')
    .first()
    .locator('xpath=ancestor::nav')
    .boundingBox()
  const box = (await chip.boundingBox())!
  expect(bar).not.toBeNull()
  expect(box.y + box.height).toBeLessThanOrEqual(bar!.y)
})

test('the chooser footer shows no key names on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'beginner', 'ask')
  await paste(page, RICH, PLAIN)
  const dialog = page.getByRole('dialog', { name: 'Paste as' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Enter = default')).toBeHidden()
})

// A computer shows the key names; a touch screen (the iPad stand-in) does not.
test('the chooser footer shows key names only without touch', async ({
  page,
}, info) => {
  await open(page, 'beginner', 'ask')
  await paste(page, RICH, PLAIN)
  const keys = page
    .getByRole('dialog', { name: 'Paste as' })
    .getByText('Enter = default')
  if (info.project.name === 'ipad-webkit') await expect(keys).toBeHidden()
  else await expect(keys).toBeVisible()
})
