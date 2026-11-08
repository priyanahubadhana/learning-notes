import { expect, test, type Page } from '@playwright/test'
import { openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

// A 2×2 red PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
  'base64',
)

test('a picture from this device shows in the table and the gallery', async ({
  page,
}) => {
  await page.goto('/')
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  await main(page).getByRole('button', { name: '+ Column' }).click()
  await page
    .getByRole('dialog', { name: 'Column type' })
    .getByRole('button', { name: /^Web link/ })
    .click()
  const dialog = page.getByRole('dialog', { name: 'New Web link column' })
  await dialog.getByRole('textbox').first().fill('Cover')
  await dialog.getByRole('button', { name: 'Add column' }).click()

  await main(page).getByRole('button', { name: '+ New row' }).click()
  await main(page)
    .getByTestId('picture-input')
    .first()
    .setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: PNG })
  await expect(main(page).getByText('🖼 Picture')).toBeVisible()

  // The gallery uses it as the tile picture.
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Gallery' })
    .click()
  const img = main(page).locator('img').first()
  await expect(img).toBeVisible()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0)
})

test('a picture added in a note is kept in the app and shown again after a reload', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await page.waitForTimeout(900)
  await page.reload()
  await expect(page.locator('.bn-editor img').first()).toHaveAttribute(
    'src',
    /^blob:/,
  )
})
