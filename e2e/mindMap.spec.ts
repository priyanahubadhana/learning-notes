import { expect, test, type Page } from '@playwright/test'

async function insertMap(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/mind map')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeVisible()
}

const item = (page: Page, name: string) =>
  page.getByRole('treeitem', { name, exact: true })

test('build a mind map with the keyboard; it survives a reload', async ({
  page,
}) => {
  await insertMap(page)
  // The centre: tap to select, tap again to type.
  await page.getByRole('treeitem').first().click()
  await page.getByRole('treeitem').first().click()
  await page.keyboard.type('Photoshop')
  await page.keyboard.press('Enter') // a branch beside (under the centre)
  await page.keyboard.type('Tools')
  await page.keyboard.press('Tab') // a branch under Tools
  await page.keyboard.type('Brush')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Eraser')
  await page.keyboard.press('Escape')
  await expect(item(page, 'Photoshop')).toHaveAttribute('aria-level', '1')
  await expect(item(page, 'Tools')).toHaveAttribute('aria-level', '2')
  await expect(item(page, 'Brush')).toHaveAttribute('aria-level', '3')
  await expect(item(page, 'Eraser')).toHaveAttribute('aria-level', '3')

  await page.waitForTimeout(1200)
  await page.reload()
  await expect(item(page, 'Eraser')).toHaveAttribute('aria-level', '3')
  await expect(item(page, 'Tools')).toBeVisible()
})

test('drag a branch onto another to move it; delete removes a branch', async ({
  page,
}) => {
  await insertMap(page)
  await page.getByRole('button', { name: '+ Branch' }).click()
  await page.keyboard.type('One')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Two')
  await page.keyboard.press('Escape')
  await expect(item(page, 'One')).toHaveAttribute('aria-level', '2')

  const one = (await item(page, 'One').boundingBox())!
  const two = (await item(page, 'Two').boundingBox())!
  await page.mouse.move(two.x + 10, two.y + two.height / 2)
  await page.mouse.down()
  await page.mouse.move(one.x + one.width / 2, one.y + one.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
  await expect(item(page, 'Two')).toHaveAttribute('aria-level', '3')

  await item(page, 'One').click()
  await page.getByRole('button', { name: 'Delete branch' }).click()
  await expect(item(page, 'One')).toHaveCount(0)
  await expect(item(page, 'Two')).toHaveCount(0)
})

test('the map can be saved as a picture below the block', async ({ page }) => {
  await insertMap(page)
  await page.getByRole('button', { name: 'Save as picture' }).click()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0)
})
