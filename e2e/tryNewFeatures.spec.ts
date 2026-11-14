import { expect, test, type Page } from '@playwright/test'

const main = (page: Page) => page.locator('main')

/** Opens Settings by its address (works on a computer and on the iPad). */
async function openTryNew(page: Page, query = '') {
  await page.goto('/' + query + '#/settings')
  await showTryNew(page)
}

async function showTryNew(page: Page) {
  await expect(
    main(page).getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible({ timeout: 45_000 }) // cold lazy load on iPad webkit
  await page
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: /^Try new features/ })
    .click()
}

const row = (page: Page, name: string) =>
  main(page).getByRole('region', { name, exact: true })
const choice = (page: Page, name: string, label: 'On' | 'Off') =>
  row(page, name).getByRole('button', { name: label, exact: true })

test('Try new features: every switch starts off, one can be turned on and stays on', async ({
  page,
}) => {
  await openTryNew(page)
  const switches = main(page).locator('[data-setting-id^="tryNew."]')
  await expect(switches).toHaveCount(26) // one per flag in src/app/flags.ts
  await expect(
    main(page).locator('[aria-pressed="true"]', { hasText: 'On' }),
  ).toHaveCount(0)

  await choice(page, 'New tool bar', 'On').click()
  await expect(choice(page, 'New tool bar', 'On')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.reload()
  await showTryNew(page)
  await expect(choice(page, 'New tool bar', 'On')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(choice(page, 'New text box', 'Off')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await choice(page, 'New tool bar', 'Off').click()
  await expect(choice(page, 'New tool bar', 'Off')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('?flags= forces the named switches on for that run', async ({ page }) => {
  await openTryNew(page, '?flags=toolbar.v8,textbox.v2')
  await expect(choice(page, 'New tool bar', 'On')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(choice(page, 'New text box', 'On')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(choice(page, 'New Home', 'Off')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
