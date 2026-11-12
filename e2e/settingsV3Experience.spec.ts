// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Settings v3 Your experience and Tours library: SET-B17 to B24 (and the hidden-row rule). */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

const V3 = '/?flags=settings.v3#/settings'
const level = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('learning-notes:level') ?? '{}').level as
        string | undefined,
  )
const section = (page: Page, id: string) =>
  page.locator(`[data-section="${id}"]`)

async function open(page: Page, hash = V3) {
  await page.goto(hash)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test('SET-B17 Your experience is the first section with three choices', async ({
  page,
}) => {
  await open(page)
  await expect(page.locator('[data-section]').first()).toHaveAttribute(
    'data-section',
    'experience',
  )
  const choices = page.locator('[data-experience-choices] [role=radio]')
  await expect(choices).toHaveCount(3)
  await expect(choices).toHaveText([/New/, /Used a little/, /Experienced/])
  // The app view toggle stays two levels.
  await expect(
    page.locator('[data-level-control]').getByRole('radio'),
  ).toHaveText(['Beginner', 'Professional'])
})

test('SET-B18 New shows essentials only, the app view is Beginner, and a note says what is hidden', async ({
  page,
}) => {
  await open(page)
  await page.locator('[data-experience="new"]').click()
  await expect(page.locator('[data-experience="new"]')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(await level(page)).toBe('beginner')
  await expect(page.locator('[data-hidden-note]')).toContainText('hidden')
  await section(page, 'general').click()
  await expect(page.locator('[data-setting-id="general.theme"]')).toBeVisible()
  await expect(
    page.locator('[data-setting-id="general.dateStyle"]'),
  ).toHaveCount(0)
  await expect(
    page.locator('[data-setting-id="general.reduceGlass"]'),
  ).toHaveCount(0)
})

test('SET-B19 Used a little adds the common rows; Professional rows stay off', async ({
  page,
}) => {
  await open(page)
  await page.locator('[data-experience="little"]').click()
  expect(await level(page)).toBe('beginner')
  await section(page, 'general').click()
  await expect(
    page.locator('[data-setting-id="general.dateStyle"]'),
  ).toBeVisible()
  await expect(
    page.locator('[data-setting-id="general.reduceGlass"]'),
  ).toHaveCount(0)
})

test('SET-B20 Experienced shows everything and the app view becomes Professional', async ({
  page,
}) => {
  await open(page)
  await page.locator('[data-experience="new"]').click()
  await page.locator('[data-experience="expert"]').click()
  expect(await level(page)).toBe('professional')
  await expect(page.locator('[data-hidden-note]')).toContainText(
    'Everything is showing',
  )
  await section(page, 'general').click()
  await expect(
    page.locator('[data-setting-id="general.reduceGlass"]'),
  ).toBeVisible()
})

test('SET-B21 turning off "Show Your experience at the top" moves it to the bottom with a toast and a glow', async ({
  page,
}) => {
  await open(page)
  await page
    .getByRole('switch', { name: 'Show Your experience at the top' })
    .click()
  await expect(page.getByText('moved to the bottom')).toBeVisible()
  await expect(section(page, 'experience')).toHaveAttribute('data-glow', 'on')
  await expect(page.locator('[data-section]').last()).toHaveAttribute(
    'data-section',
    'experience',
  )
  // It stays one tap away and the switch remembers.
  await section(page, 'experience').click()
  await expect(
    page.getByRole('switch', { name: 'Show Your experience at the top' }),
  ).toHaveAttribute('aria-checked', 'false')
  await page.reload()
  await expect(page.locator('[data-section]').last()).toHaveAttribute(
    'data-section',
    'experience',
  )
})

test('SET-B22 the Tours library lists the built-in guide and downloadable tours; nothing downloads by default', async ({
  page,
}) => {
  const asked: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/tours/')) asked.push(r.url())
  })
  await open(page, '/?flags=settings.v3#/settings/help')
  const lib = page.locator('[data-tours-library]')
  await expect(lib.locator('[data-tour-row="guide"]')).toContainText('Built in')
  await expect(lib.locator('[data-tour-download]')).toHaveCount(3)
  await expect(lib.locator('[data-tour-row="srs"]')).toContainText('KB')
  expect(asked).toEqual([])
  // The tour search has a clear button.
  await lib.getByRole('searchbox').fill('pencil')
  await expect(lib.locator('[data-tour-row]')).toHaveCount(1)
  await lib.getByRole('button', { name: /clear/i }).click()
  await expect(lib.locator('[data-tour-row]')).toHaveCount(4)
})

test('SET-B23 Download shows Ready, Replay starts the tour; offline says so and keeps the row', async ({
  page,
  context,
}) => {
  await open(page, '/?flags=settings.v3#/settings/help')
  const lib = page.locator('[data-tours-library]')
  await context.setOffline(true)
  await lib.locator('[data-tour-download="srs"]').click()
  await expect(lib.locator('[data-tour-row="srs"]')).toContainText(
    'You are offline. Try again when connected.',
  )
  await expect(lib.locator('[data-tour-download="srs"]')).toBeEnabled()
  await context.setOffline(false)
  await lib.locator('[data-tour-download="srs"]').click()
  await expect(lib.locator('[data-tour-row="srs"]')).toContainText('Ready')
  await lib.locator('[data-tour-replay="srs"]').click()
  const tour = page.getByTestId('sv3-tour')
  await expect(tour).toContainText('Step 1 of 5')
  await tour.locator('[data-tour-next]').click()
  await expect(tour).toContainText('Step 2 of 5')
  await page.keyboard.press('Escape')
  await expect(tour).toHaveCount(0)
  // Stays downloaded after a reload; Remove brings the button back.
  await page.reload()
  await expect(lib.locator('[data-tour-row="srs"]')).toContainText('Ready')
  await lib.getByRole('button', { name: /Remove the downloaded tour/ }).click()
  await expect(lib.locator('[data-tour-download="srs"]')).toBeVisible()
})

test('SET-B23 the built-in guide replays offline and "Show me" opens the row', async ({
  page,
  context,
}) => {
  await open(page, '/?flags=settings.v3#/settings/help')
  await context.setOffline(true)
  await page.locator('[data-tour-replay="guide"]').click()
  const tour = page.getByTestId('sv3-tour')
  await expect(tour).toContainText('Step 1 of')
  await tour.locator('[data-tour-show]').click()
  await expect(tour).toHaveCount(0)
  await expect(page.locator('[data-setting-id="general.theme"]')).toBeVisible()
})

test('SET-B24 "Show the first-launch question again" opens the New / Used a little / Experienced pop-up', async ({
  page,
}) => {
  await open(page, '/?flags=settings.v3#/settings/help')
  await page.locator('[data-first-launch]').click()
  const dialog = page.getByTestId('sv3-experience-dialog')
  await expect(dialog).toContainText('How well do you know this app?')
  await expect(dialog.locator('[role=radio]')).toHaveCount(3)
  await dialog.locator('[data-experience="new"]').click()
  await expect(dialog).toHaveCount(0)
  expect(await level(page)).toBe('beginner')
  // Professional row: hidden in Beginner until its own switch is on.
  await expect(page.locator('[data-first-launch]')).toHaveCount(0)
})
