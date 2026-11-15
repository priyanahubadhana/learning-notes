// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * Task 2A.5 (toolbar v9): dark mode looks premium. The default ink is light at
 * night (resolved when drawn, nothing stored changes), controls sit in wells
 * with raised thumbs, switch knobs are white.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(page: Page, theme: 'day' | 'night') {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [] }),
    )
  })
  await startInTheme(page, theme)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
}

const dot = (page: Page) =>
  page.getByTestId('v8-chip-pen.colour').locator('.v8dot-colour')

test('2A.5 at night the default ink is light and the saved colour is untouched', async ({
  page,
}) => {
  await open(page, 'night')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await expect(dot(page)).toHaveCSS('background-color', 'rgb(236, 236, 238)')
  const saved = await page.evaluate(
    () => localStorage.getItem('learning-notes:ink.pen') ?? '',
  )
  expect(saved).not.toContain('ececee')
})

test('2A.5 by day the default ink is dark again, same saved colour', async ({
  page,
}) => {
  await open(page, 'day')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await expect(dot(page)).toHaveCSS('background-color', 'rgb(29, 29, 31)')
})

test('2A.5 at night a switch knob is white, a tile sits in a well', async ({
  page,
}) => {
  await open(page, 'night')
  await page.getByTestId('v8-chip-pen.feel').click()
  const card = page.getByTestId('v8-card-pen.feel')
  await card.getByRole('tab', { name: 'Aids' }).click()
  const knob = await card
    .locator('.pcard-switch')
    .first()
    .evaluate((el) => getComputedStyle(el, '::after').backgroundColor)
  expect(knob).toBe('rgb(255, 255, 255)')
  await card.getByRole('tab', { name: 'Page' }).click()
  const tile = page.getByTestId('v8-pen-paper-grid')
  const bg = await tile.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
})

/** With toolbar.v8 OFF nothing of 2A.5 shows: old knob, no tile well, old ink. */
test('2A.5 with the switch OFF at night: old white-ish knob, no tile well, dark ink', async ({
  page,
}) => {
  await startInTheme(page, 'night')
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  const r = await page.evaluate(() => {
    const root = document.documentElement
    const sw = document.createElement('span')
    sw.className = 'pcard-switch'
    const tile = document.createElement('button')
    tile.className = 'pcard-tile'
    const opt = document.createElement('div')
    opt.className = 'onoff-choice'
    document.body.append(sw, tile, opt)
    return {
      v9: root.hasAttribute('data-v9'),
      ink: getComputedStyle(root).getPropertyValue('--ink-auto').trim(),
      knob: getComputedStyle(sw, '::after').backgroundColor,
      tile: getComputedStyle(tile).backgroundColor,
      choice: getComputedStyle(opt).backgroundColor,
      surface: getComputedStyle(root)
        .getPropertyValue('--color-surface-0')
        .trim(),
    }
  })
  expect(r.v9).toBe(false)
  expect(r.ink).toBe('#1d1d1f')
  expect(r.tile).toBe('rgba(0, 0, 0, 0)')
  expect(r.knob).not.toBe('rgb(255, 255, 255)')
  expect(r.choice).toBe('rgb(42, 41, 49)')
})

test('2A.5 with the switch ON the root says so (data-v9)', async ({ page }) => {
  await open(page, 'night')
  await expect(page.locator('html')).toHaveAttribute('data-v9', '')
})
