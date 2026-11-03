// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  contrastOf,
  createNotebook,
  dockedBar,
  selectText,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * The docked bar's colour button and picker are clearly visible in every
 * theme (WCAG AA), the button shows the chosen colours, and every other bar
 * button is readable on the dark theme.
 */

test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

const colorButton = (page: Page) =>
  dockedBar(page).locator('button[data-action="color"]')
const picker = (page: Page) => page.getByRole('group', { name: 'Colors' })

async function openPage(page: Page, theme: 'day' | 'night' | 'sepia') {
  await startInMode(page, 'touch')
  await startInTheme(page, theme)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'S1 is the first heart sound')
}

/** Puts the colour button on the bar (it is under More at first). */
async function pinColor(page: Page) {
  await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: /^Edit bar/ })
    .click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('checkbox', { name: 'Colors' })
    .check()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: 'Done' })
    .click()
  await expect(colorButton(page)).toBeVisible()
}

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`${theme}: the colour button and picker pass WCAG AA`, async ({
    page,
  }) => {
    await openPage(page, theme)
    await pinColor(page)
    const button = colorButton(page)
    // The outlined swatch is at least 3:1 against the bar (non-text contrast).
    const swatch = button.locator('[data-swatch]')
    await expect(swatch).toBeVisible()
    expect(await contrastOf(swatch, 'border')).toBeGreaterThanOrEqual(3)
    expect(await contrastOf(swatch.locator('span').first())).toBeGreaterThan(
      4.5,
    )

    await selectText(page, 'first')
    await button.click()
    const panel = page.locator('[data-bar="tray"]')
    await expect(picker(page)).toBeVisible()
    // The picker has a visible border, and every name is readable.
    expect(await contrastOf(panel, 'border')).toBeGreaterThanOrEqual(3)
    const names = picker(page).locator('button span.truncate')
    expect(await names.count()).toBe(20)
    for (const name of await names.all()) {
      expect(await contrastOf(name), await name.innerText()).toBeGreaterThan(
        4.5,
      )
    }
    for (const chip of await picker(page)
      .locator('button > span[aria-hidden]:first-child')
      .all()) {
      expect(await contrastOf(chip, 'border')).toBeGreaterThanOrEqual(3)
    }
  })
}

test('the button shows what was chosen, and the text really changes', async ({
  page,
}) => {
  await openPage(page, 'night')
  await pinColor(page)
  const button = colorButton(page)
  await expect(button).toHaveAttribute(
    'aria-label',
    'Colors. Text: Default. Highlight: Default.',
  )
  await selectText(page, 'first')
  await button.click()
  await picker(page)
    .getByRole('group', { name: 'Text color' })
    .getByRole('button', { name: 'Red' })
    .click()
  await expect(
    page.locator('.bn-editor [data-style-type="textColor"][data-value="red"]'),
  ).toHaveText('first')
  await expect(button).toHaveAttribute(
    'aria-label',
    'Colors. Text: Red. Highlight: Default.',
  )
  // The swatch's bar is red now (not the default grey).
  const bar = button.locator('[data-text-color="red"]')
  await expect(bar).toBeVisible()
  expect(await bar.evaluate((el) => getComputedStyle(el).color)).toBe(
    'rgb(224, 62, 62)',
  )
  await expect(
    picker(page)
      .getByRole('group', { name: 'Text color' })
      .getByRole('button', { name: 'Red', pressed: true }),
  ).toBeVisible()
  await picker(page)
    .getByRole('group', { name: 'Highlight color' })
    .getByRole('button', { name: 'Yellow' })
    .click()
  await expect(button).toHaveAttribute(
    'aria-label',
    'Colors. Text: Red. Highlight: Yellow.',
  )
  await expect(
    button.locator('[data-swatch][data-background-color="yellow"]'),
  ).toBeVisible()
  // Back to the default removes the colour.
  await picker(page)
    .getByRole('group', { name: 'Text color' })
    .getByRole('button', { name: 'Default' })
    .click()
  await expect(
    page.locator('.bn-editor [data-style-type="textColor"][data-value="red"]'),
  ).toHaveCount(0)
})

test('night: every bar button is readable and Done/More are clear', async ({
  page,
}) => {
  await openPage(page, 'night')
  await pinColor(page)
  const buttons = dockedBar(page).getByRole('toolbar').getByRole('button')
  expect(await buttons.count()).toBeGreaterThan(8)
  for (const b of await buttons.all()) {
    const name =
      (await b.getAttribute('aria-label')) ?? (await b.innerText()) ?? '?'
    if ((await b.getAttribute('data-action')) === 'color') continue
    expect(await contrastOf(b), name).toBeGreaterThanOrEqual(4.5)
  }
  // The text style menu and the link button too.
  const link = dockedBar(page).getByRole('button', { name: 'Create link' })
  if (await link.count()) {
    expect(await contrastOf(link.first())).toBeGreaterThanOrEqual(4.5)
  }
})
