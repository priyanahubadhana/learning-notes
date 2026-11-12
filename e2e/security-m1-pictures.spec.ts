// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openSidebar } from './helpers.ts'

/** Slice 11c (flag security.m1): a web picture in a gallery waits for a tap. */

const FLAGS = 'learning-notes:flags'
const HOST = 'https://pics.invalid-host.test'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const main = (page: Page) => page.getByRole('main')

async function galleryWithPicture(page: Page, on: boolean) {
  const hits: string[] = []
  await page.route(`${HOST}/**`, (route) => {
    hits.push(route.request().url())
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PNG,
    })
  })
  if (on)
    await page.addInitScript((k) => {
      localStorage.setItem(k, '["security.m1"]')
    }, FLAGS)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
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
  await page
    .getByRole('dialog', { name: 'New Web link column' })
    .getByRole('button', { name: 'Add column' })
    .click()
  await main(page).getByRole('button', { name: '+ New row' }).click()
  await page.getByRole('textbox', { name: /^Title/ }).fill('Atlas')
  await page.getByRole('textbox', { name: /^Title/ }).press('Enter')
  await main(page)
    .getByRole('button', { name: /^Edit Web link of/ })
    .click()
  await page.keyboard.type(`${HOST}/a.png`)
  await page.keyboard.press('Enter')
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Gallery' })
    .click()
  return hits
}

test('S12 S13 S14: a web picture in a gallery shows the card; nothing loads until Load picture; it asks again after a reload', async ({
  page,
}) => {
  const hits = await galleryWithPicture(page, true)
  const card = main(page).getByTestId('remote-picture-card')
  await expect(card).toBeVisible()
  await expect(card).toContainText('pics.invalid-host.test')
  await page.waitForTimeout(500)
  expect(hits).toEqual([]) // no request to the remote host yet
  await card.getByRole('button', { name: 'Load picture' }).click()
  const img = main(page).locator('[data-tile-id] img')
  await expect(img).toHaveAttribute('src', `${HOST}/a.png`)
  await expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
  // The lazy picture asks the network a moment after its src is set.
  await expect.poll(() => hits.length).toBeGreaterThan(0)
  // The tap only loaded the picture; it did not open the page.
  await expect(main(page).getByTestId('remote-picture-card')).toHaveCount(0)
  await page.reload()
  await main(page).getByRole('button', { name: 'Gallery', exact: true }).click()
  await expect(main(page).getByTestId('remote-picture-card')).toBeVisible()
})

test('S22: flag off, the web picture loads by itself as before', async ({
  page,
}) => {
  const hits = await galleryWithPicture(page, false)
  await expect(main(page).locator('[data-tile-id] img')).toHaveAttribute(
    'src',
    `${HOST}/a.png`,
  )
  await expect(main(page).getByTestId('remote-picture-card')).toHaveCount(0)
  // The lazy picture asks the network a moment after its src is set.
  await expect.poll(() => hits.length).toBeGreaterThan(0)
})
