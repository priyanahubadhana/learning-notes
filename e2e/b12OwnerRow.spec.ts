// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/**
 * B12 (owner, 19 Nov 2026): the owner's top row is the v8 bar (Professional,
 * Pencil mode, page.menus ON, a saved bar with the Mic tool pinned). Mic,
 * Backspace, Enter and Paste ▾ must sit together there; the pinned Mic must
 * speak (it used to open a floating bar that is hidden in Pencil mode).
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FLAGS = {
  flags: ['page.menus', 'toolbar.v8', 'foundation.shell'],
  level: { level: 'professional', unlocked: [] },
  // An old saved bar: the pinned Mic after Lasso, as on the owner's iPad.
  'toolbar.v9.tools': [
    'text',
    'pen',
    'eraser',
    'shapes',
    'lasso',
    'insert',
    'mic',
  ],
}

const open = (page: Page, mode: 'pencil' | 'touch' | 'computer' = 'pencil') =>
  openNote(page, mode, FLAGS)

const x = async (page: Page, sel: string) =>
  (await page.locator(sel).first().boundingBox())!.x

test('B12 v8 row in Pencil mode: Mic, Backspace, Enter, Paste ▾ in that order, together', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByTestId('v8-bar')).toBeVisible()
  const paste = page.getByTestId('top-paste')
  await expect(paste).toBeVisible()
  const mic = await x(page, '[data-testid="v8-bar"] [data-action="miniKeys"]')
  const back = await x(page, '[data-testid="v8-backspace"]')
  const enter = await x(page, '[data-testid="v8-newline"]')
  expect(mic).toBeLessThan(back)
  expect(back).toBeLessThan(enter)
  expect(enter).toBeLessThan(await x(page, '[data-testid="top-paste"]'))
  // One Mic only: the pinned one is the same button.
  await expect(
    page.locator('[data-testid="v8-bar"] [data-action="miniKeys"]'),
  ).toHaveCount(1)
  await expect(page.getByTestId('v8-tool-mic')).toHaveCount(0)
})

for (const mode of ['touch', 'computer'] as const)
  test(`B12 v8 row in ${mode} mode: Mic and Paste ▾ are there`, async ({
    page,
  }) => {
    await open(page, mode)
    await expect(page.getByTestId('top-paste')).toBeVisible()
    await expect(
      page.locator('[data-testid="v8-bar"] [data-action="miniKeys"]'),
    ).toHaveCount(1)
  })

test('B12 the Mic in the v8 row speaks (no hidden floating bar)', async ({
  page,
}) => {
  await open(page)
  const mic = page.locator('[data-testid="v8-bar"] [data-action="miniKeys"]')
  await mic.click()
  await expect(page.locator('[data-mini-keys]')).toHaveCount(0)
})
