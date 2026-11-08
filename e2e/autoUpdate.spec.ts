// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Automatic updates: a found version is applied at a safe moment, by itself.
 * The app has a test door: the event below pretends a new version was found
 * (the restart is a plain reload).
 */

const found = (page: Page) =>
  page.evaluate(() =>
    window.dispatchEvent(new Event('learning-notes:test-update')),
  )

/** A mark on the window that disappears when the page reloads. */
const mark = (page: Page) =>
  page.evaluate(() => {
    ;(window as unknown as Record<string, number>).__before = 1
  })
const reloaded = (page: Page) =>
  page
    .evaluate(() => !(window as unknown as Record<string, number>).__before)
    .catch(() => true) // the page was just leaving

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const toast = (page: Page) => page.getByText('Updated to the latest version')

test('waits while typing, then updates when idle', async ({ page }) => {
  await start(page)
  await mark(page)
  await found(page)
  // Typing for longer than the 5 s idle time: nothing may restart.
  for (let i = 0; i < 24; i++) {
    await page.keyboard.type('x')
    await page.waitForTimeout(300)
  }
  expect(await reloaded(page)).toBe(false)
  // Stopped: the app saves, backs up and restarts by itself.
  await expect.poll(() => reloaded(page), { timeout: 20_000 }).toBe(true)
  await expect(toast(page)).toBeVisible()
  await expect(page.locator('.bn-editor')).toContainText(
    'The nucleus holds the DNAxxxxxxxx',
  )
})

test('waits while the pen is down', async ({ page }) => {
  await start(page)
  await page.waitForTimeout(5500) // idle already
  await page.evaluate(() => {
    const e = (type: string) =>
      new PointerEvent(type, {
        pointerType: 'pen',
        pointerId: 9,
        bubbles: true,
        isPrimary: true,
        clientX: 600,
        clientY: 300,
        buttons: type === 'pointerup' ? 0 : 1,
      })
    document.body.dispatchEvent(e('pointerdown'))
    ;(window as unknown as Record<string, unknown>).__lift = () =>
      document.body.dispatchEvent(e('pointerup'))
  })
  await mark(page)
  await found(page)
  await page.waitForTimeout(6500)
  expect(await reloaded(page)).toBe(false)
  await page.evaluate(() =>
    (window as unknown as Record<string, () => void>).__lift(),
  )
  await expect.poll(() => reloaded(page), { timeout: 20_000 }).toBe(true)
  await expect(toast(page)).toBeVisible()
})

test('keeps the page and the scroll position', async ({ page }) => {
  await start(page)
  await page.keyboard.type('\n' + 'a line of notes\n'.repeat(70))
  await page.waitForTimeout(800)
  const top = await page.evaluate(() => {
    const el = document.querySelector('[data-page-scroller]')!
    el.scrollTop = 400
    return el.scrollTop
  })
  expect(top).toBeGreaterThan(100)
  const hash = await page.evaluate(() => location.hash)
  await mark(page)
  await found(page)
  await expect.poll(() => reloaded(page), { timeout: 20_000 }).toBe(true)
  await expect(toast(page)).toBeVisible()
  expect(await page.evaluate(() => location.hash)).toBe(hash)
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'First',
  )
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('[data-page-scroller]')!.scrollTop,
      ),
    )
    .toBeGreaterThan(top - 3)
})

test('with the setting off, the Update toast is shown instead', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.autoUpdate', '"off"'),
  )
  await start(page)
  await page.waitForTimeout(5500)
  await mark(page)
  await found(page)
  await expect(page.getByText('A new version is ready.')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(await reloaded(page)).toBe(false)
  await page.getByRole('button', { name: 'Update', exact: true }).click()
  await expect.poll(() => reloaded(page), { timeout: 20_000 }).toBe(true)
})

test('asks when the safety copy cannot be made', async ({ page }) => {
  // Almost no space left (only before the restart, so the app still starts).
  await page.addInitScript(() => {
    if (sessionStorage.getItem('ln.updated')) return
    Object.defineProperty(navigator.storage, 'estimate', {
      value: async () => ({ quota: 1_000_000, usage: 0 }),
    })
  })
  await start(page)
  await page.waitForTimeout(5500)
  await mark(page)
  await found(page)
  await expect(page.getByText(/low on space/)).toBeVisible()
  expect(await reloaded(page)).toBe(false)
  await page.getByRole('button', { name: 'Update anyway' }).click()
  await expect.poll(() => reloaded(page), { timeout: 20_000 }).toBe(true)
  await expect(toast(page)).toBeVisible()
})
