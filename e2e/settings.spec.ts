import { expect, test, type Page } from '@playwright/test'
import { cornerAction, openCorner } from './helpers.ts'

const main = (page: Page) => page.locator('main')
const settingRow = (page: Page, label: string) =>
  main(page).getByRole('region', { name: label, exact: true })

async function openSettings(page: Page) {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  await expect(
    main(page).getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible()
}

/** "Steps for Good" is shown only with the Simple steps scheduler. */
async function useSimpleSteps(page: Page) {
  await main(page)
    .getByRole('combobox', { name: 'Scheduler' })
    .selectOption({ label: 'Simple steps' })
}

test('a changed setting is saved and survives a reload; Reset restores it', async ({
  page,
}) => {
  await openSettings(page)
  const row = settingRow(page, 'New cards per day')
  const field = row.getByRole('textbox')
  await expect(field).toHaveValue('20')
  await field.fill('35')
  await field.press('Enter')
  await expect(
    row.getByRole('button', { name: 'Reset to default' }),
  ).toBeVisible()

  await page.reload()
  await cornerAction(page, 'Settings')
  await expect(
    settingRow(page, 'New cards per day').getByRole('textbox'),
  ).toHaveValue('35')

  await settingRow(page, 'New cards per day')
    .getByRole('button', { name: 'Reset to default' })
    .click()
  await expect(
    settingRow(page, 'New cards per day').getByRole('textbox'),
  ).toHaveValue('20')
})

test('invalid input shows a clear message and is not saved', async ({
  page,
}) => {
  await openSettings(page)
  const row = settingRow(page, 'New cards per day')
  await row.getByRole('textbox').fill('-3')
  await row.getByRole('textbox').press('Enter')
  await expect(row.getByRole('alert')).toHaveText(
    'Enter a whole number from 0 to 9,999.',
  )

  // Steps must rise: 3 → 2 is refused.
  await useSimpleSteps(page)
  const steps = settingRow(page, 'Steps for “Good”')
  await steps.getByRole('textbox', { name: 'Step 2, in days' }).fill('1')
  await steps.getByRole('textbox', { name: 'Step 2, in days' }).press('Enter')
  await expect(steps.getByRole('alert')).toBeVisible()

  await page.reload()
  await cornerAction(page, 'Settings')
  await expect(
    settingRow(page, 'New cards per day').getByRole('textbox'),
  ).toHaveValue('20')
  await expect(
    settingRow(page, 'Steps for “Good”').getByRole('textbox', {
      name: 'Step 2, in days',
    }),
  ).toHaveValue('3')
})

test('steps can be added and removed', async ({ page }) => {
  await openSettings(page)
  await useSimpleSteps(page)
  const steps = settingRow(page, 'Steps for “Good”')
  await steps.getByRole('button', { name: /Add step/ }).click()
  await expect(
    steps.getByRole('textbox', { name: 'Step 7, in days' }),
  ).toHaveValue('120')
  await steps.getByRole('button', { name: /Remove last step/ }).click()
  await expect(steps.getByRole('textbox')).toHaveCount(6)
})

test('one setting appears in several categories with the same value', async ({
  page,
}) => {
  await openSettings(page)
  const nav = main(page).getByRole('navigation', {
    name: 'Settings categories',
  })

  await nav.getByRole('button', { name: /^General/ }).click()
  await settingRow(page, 'Day starts at')
    .getByRole('combobox')
    .selectOption({ index: 2 })

  await nav.getByRole('button', { name: /^Review/ }).click()
  const inReview = settingRow(page, 'Day starts at')
  await expect(inReview).toContainText('Also in: General, Journal')
  await expect(inReview.getByRole('combobox')).toHaveValue('2')

  await nav.getByRole('button', { name: /^Connections/ }).click()
  await expect(main(page)).toContainText('Your AI keys and whether they work')
})

test('search in All finds settings by name or description', async ({
  page,
}) => {
  await openSettings(page)
  const search = main(page).getByRole('searchbox', {
    name: 'Search all settings',
  })
  await search.fill('late-night')
  await expect(main(page).getByRole('region')).toHaveCount(1)
  await expect(settingRow(page, 'Day starts at')).toBeVisible()
  await search.fill('zebra')
  await expect(main(page)).toContainText('No settings match “zebra”.')
})

test('theme in Settings and in the sidebar stay in step', async ({ page }) => {
  await openSettings(page)
  await settingRow(page, 'Theme').getByRole('button', { name: 'Night' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  const themes = (await openCorner(page)).getByRole('group', { name: 'Theme' })
  await expect(themes.getByRole('button', { name: 'Night' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await themes.getByRole('button', { name: 'Sepia' }).click()
  await expect(
    settingRow(page, 'Theme').getByRole('button', { name: 'Sepia' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('settings fit a phone screen without sideways scrolling', async ({
  page,
}) => {
  // The sidebar stays 260 px wide until the full phone layout (docs/IDEAS.md);
  // this leaves the Settings area exactly a phone width (400 px).
  await page.setViewportSize({ width: 660, height: 844 })
  await openSettings(page)
  const overflow = await main(page).evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('each category page starts with a one-line description', async ({
  page,
}) => {
  await openSettings(page)
  for (const [tab, text] of [
    ['General', 'How the app looks and behaves'],
    ['Review', 'How cards come back'],
    ['Journal', 'Settings for your daily journal'],
    ['Connections', 'Your AI keys and whether they work'],
  ]) {
    await page.getByRole('button', { name: new RegExp(`^${tab}, `) }).click()
    await expect(main(page)).toContainText(text)
  }
})
