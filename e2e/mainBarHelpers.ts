// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** The main bar (redesign step 2): one solid row of icon-only tools. */
export const mainBar = (page: Page) => page.locator('[data-main-bar]')
/** One tool of the main bar, by its name. */
export const tool = (page: Page, name: string) =>
  mainBar(page).getByRole('button', { name, exact: true })
/** The options pill showing now (or one tool's pill). */
export const pill = (page: Page, name?: string) =>
  page.locator(name ? `[data-options-pill="${name}"]` : '[data-options-pill]')
/** An option inside the pill, by its name. */
export const option = (page: Page, name: string | RegExp) =>
  pill(page).getByRole('button', { name })
/** The detail card. */
export const card = (page: Page) => page.locator('[data-pill-card]')
/** The ⋯ menu of the bar. */
export const barMenu = (page: Page) =>
  page.getByRole('button', { name: 'Toolbar menu' })

/** Opens a page in the given device mode and types a first line. */
export async function openNote(
  page: Page,
  mode: 'computer' | 'touch' | 'pencil' = 'touch',
  keys: Record<string, unknown> = {},
) {
  await startInMode(page, mode)
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem('learning-notes:' + key, JSON.stringify(value))
    }
  }, keys)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

/** Taps a main tool and waits for its pill. */
export async function openPill(page: Page, name: string, pillName: string) {
  // Tap again only while the pill is not showing (a late re-render of the bar
  // can swallow a tap), so a slow pill is never toggled shut.
  await expect(async () => {
    if (!(await pill(page, pillName).isVisible()))
      await tool(page, name).click()
    await expect(pill(page, pillName)).toBeVisible({ timeout: 2000 })
  }).toPass()
}

/** The saved place of the options pill (null = the default). */
export const savedPlace = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('learning-notes:toolbar.pillPlace')
    return raw ? (JSON.parse(raw) as { edge: string; along: number }) : null
  })

/** A pref saved by the bar (parsed). */
export const pref = <T>(page: Page, key: string): Promise<T | null> =>
  page.evaluate((k) => {
    const raw = localStorage.getItem('learning-notes:' + k)
    return raw ? JSON.parse(raw) : null
  }, key)

/** Drags the pill's grip to a point with the mouse (small steps, like a hand). */
export async function dragGrip(page: Page, to: { x: number; y: number }) {
  const grip = page.locator('[data-pill-grip]')
  const box = (await grip.boundingBox())!
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 4, from.y + 4, { steps: 2 })
  await page.mouse.move(to.x, to.y, { steps: 12 })
}

export const center = async (locator: Locator) => {
  const b = (await locator.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
