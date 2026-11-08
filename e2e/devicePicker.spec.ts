// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * Batch 2d, step 1: the device picker (Phone, iPad / tablet, Computer /
 * laptop). The other specs start with it answered; these start without.
 */

// The first-run welcome (polish 2) takes the picker's place on a brand-new device;
// it is marked as seen here so these tests still reach the picker itself.
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:' + (process.env.PW_PORT ?? 5199),
        localStorage: [
          { name: 'learning-notes:onboarding.done', value: 'true' },
        ],
      },
    ],
  },
})

const dialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Which device is this?' })
const stored = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem('learning-notes:' + k), key)

test('first start asks once, preselects Computer on a computer', async ({
  page,
}) => {
  await page.goto('/')
  await expect(dialog(page)).toBeVisible()
  await expect(
    dialog(page).getByRole('radio', { name: 'Computer / laptop' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(dialog(page).getByRole('checkbox')).toHaveCount(0)
  await dialog(page).getByRole('button', { name: 'Use this' }).click()
  await expect(dialog(page)).toHaveCount(0)
  expect(await stored(page, 'general.deviceMode')).toBe('"computer"')
  await page.reload()
  await expect(page.getByRole('complementary')).toBeAttached()
  await expect(dialog(page)).toHaveCount(0)
})

test.describe('iPad', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  })

  test('preselects iPad, asks about the Pencil and sets Pencil mode', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(dialog(page)).toBeVisible()
    await expect(
      dialog(page).getByRole('radio', { name: 'iPad / tablet' }),
    ).toHaveAttribute('aria-checked', 'true')
    const pencil = dialog(page).getByRole('checkbox', {
      name: 'I use an Apple Pencil',
    })
    await expect(pencil).not.toBeChecked()
    await pencil.check()
    await dialog(page).getByRole('button', { name: 'Use this' }).click()
    expect(await stored(page, 'general.deviceMode')).toBe('"pencil"')
    expect(await stored(page, 'advanced.barSize')).toBe('"large"')
  })

  test('without the Pencil it is Touch mode', async ({ page }) => {
    await page.goto('/')
    await dialog(page).getByRole('button', { name: 'Use this' }).click()
    expect(await stored(page, 'general.deviceMode')).toBe('"touch"')
    expect(await stored(page, 'advanced.barPlacement')).toBe('"top"')
  })
})

test.describe('phone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test('preselects Phone and sets Touch mode; big targets', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      dialog(page).getByRole('radio', { name: 'Phone' }),
    ).toHaveAttribute('aria-checked', 'true')
    for (const b of await dialog(page).getByRole('button').all()) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
    }
    await dialog(page).getByRole('button', { name: 'Use this' }).click()
    expect(await stored(page, 'general.deviceMode')).toBe('"touch"')
  })
})

test('an existing user gets it once, preselected from what they use, and can dismiss it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('learning-notes:general.deviceMode')) {
      localStorage.setItem('learning-notes:general.deviceMode', '"pencil"')
      localStorage.setItem('learning-notes:advanced.barSize', '"large"')
      localStorage.setItem('learning-notes:modeRechecked', 'true')
    }
  })
  await page.goto('/')
  await expect(
    dialog(page).getByRole('radio', { name: 'iPad / tablet' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    dialog(page).getByRole('checkbox', { name: 'I use an Apple Pencil' }),
  ).toBeChecked()
  await dialog(page).getByRole('button', { name: 'Not now' }).click()
  await expect(dialog(page)).toHaveCount(0)
  // Nothing changed, and it does not come back.
  expect(await stored(page, 'general.deviceMode')).toBe('"pencil"')
  await page.reload()
  await expect(page.getByRole('complementary')).toBeAttached()
  await expect(dialog(page)).toHaveCount(0)
})

test('Esc dismisses without changing anything; arrows choose a card', async ({
  page,
}) => {
  await page.goto('/')
  await expect(dialog(page)).toBeVisible()
  const computer = dialog(page).getByRole('radio', {
    name: 'Computer / laptop',
  })
  await expect(computer).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(
    dialog(page).getByRole('radio', { name: 'iPad / tablet' }),
  ).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  expect(await stored(page, 'general.deviceMode')).toBe('"computer"')
})

test('Settings can open it again', async ({ page }) => {
  await page.goto('/')
  await dialog(page).getByRole('button', { name: 'Not now' }).click()
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Choose device type…' }).click()
  await dialog(page).getByRole('radio', { name: 'iPad / tablet' }).click()
  await dialog(page).getByRole('button', { name: 'Use this' }).click()
  expect(await stored(page, 'general.deviceMode')).toBe('"touch"')
})
