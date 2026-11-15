/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * T31: key names ("Ctrl+Shift+K", "⌘⇧K") show only in Computer mode. In
 * Touch and Pencil mode the page ⋯ menu shows none.
 */
const KEYS = /Ctrl\+|Alt\+|⌘|⌥|⌃|⇧/

async function menuText(page: Page, mode: string) {
  await page.addInitScript((m) => {
    localStorage.setItem('learning-notes:general.deviceMode', JSON.stringify(m))
  }, mode)
  await page.goto('/')
  await createNotebook(page, 'Keys NB', 'First')
  await page.getByRole('button', { name: 'More options' }).click()
  const menu = page.getByRole('menu').first()
  await expect(menu).toBeVisible()
  return (await menu.innerText()) ?? ''
}

test('T31 Computer mode: the page menu shows key names', async ({ page }) => {
  expect(await menuText(page, 'computer')).toMatch(KEYS)
})

for (const mode of ['touch', 'pencil'])
  test(`T31 ${mode} mode: the page menu shows no key names`, async ({
    page,
  }) => {
    const text = await menuText(page, mode)
    expect(text).toContain('Copy')
    expect(text).not.toMatch(KEYS)
  })
