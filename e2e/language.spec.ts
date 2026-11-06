import { expect, test } from '@playwright/test'
import { openGroup, openSidebar, cornerAction, openCorner } from './helpers.ts'

test('the language setting switches the app texts and comes back', async ({
  page,
}) => {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: 'Español', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Ajustes', level: 1 }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByText('Idioma', { exact: true }).first()).toBeVisible()

  // It is remembered on this device.
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Ajustes', level: 1 }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'सेटिंग्स', level: 1 }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')

  await page.getByRole('button', { name: 'English', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible()
})

for (const [code, name] of [
  ['es', 'Español'],
  ['hi', 'हिन्दी'],
] as const) {
  test(`screenshots of key screens in ${code}`, async ({ page }) => {
    await page.goto('/')
    await cornerAction(page, 'Settings')
    await page.getByRole('button', { name, exact: true }).click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: `test-results/screens/lang-${code}-settings.png`,
    })
    await (
      await openCorner(page)
    )
      .getByRole('button', {
        name: /^(Guardar y restaurar|सहेजें और वापस लाएँ)/,
      })
      .click()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: `test-results/screens/lang-${code}-backup.png`,
    })
    await page
      .getByRole('button', { name: /^(Cuaderno|नई नोटबुक)/ })
      .first()
      .click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: `test-results/screens/lang-${code}-page.png`,
    })
  })
}

test('the app’s own template names are shown in the chosen language', async ({
  page,
}) => {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: 'Español', exact: true }).click()
  const side = await openSidebar(page)
  await openGroup(page, 'Plantillas')
  await expect(
    side.getByRole('button', { name: 'Apuntes de estudio' }),
  ).toBeVisible()
  await expect(side.getByRole('button', { name: 'Study notes' })).toHaveCount(0)
  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click()
  await expect(side.getByRole('button', { name: 'अध्ययन नोट' })).toBeVisible()
})
