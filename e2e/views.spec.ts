import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, openSidebar } from './helpers.ts'

/** Phase I: notebook views and the Layer gallery. */

const main = (page: Page) => page.getByRole('main')

async function openNotebook(page: Page, name: string) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name, exact: true })
    .click()
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText(name)
}

async function choose(page: Page, button: string, item: string) {
  await main(page).getByTestId(button).click()
  await page.getByRole('menuitemradio', { name: item }).click()
}

test('a notebook switches between views and remembers them after a reload', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await addPage(page, 'Heart sounds', 'S1 and S2', 'sub-page')
  await openNotebook(page, 'Cardiology')

  // Layout of the Notes tab: gallery, table, board.
  await choose(page, 'notebook-layout', 'Gallery')
  await expect(main(page).getByTestId('view-gallery')).toBeVisible()
  await choose(page, 'notebook-layout', 'Table')
  await expect(main(page).getByTestId('view-table')).toBeVisible()
  await choose(page, 'notebook-layout', 'Board')
  await expect(main(page).getByTestId('view-board')).toBeVisible()
  await page.reload()
  await openNotebook(page, 'Cardiology')
  await expect(main(page).getByTestId('view-board')).toBeVisible()

  // Shelf: a cover and a thumbnail for each page.
  await choose(page, 'notebook-view', 'Shelf')
  const shelf = main(page).getByTestId('view-shelf')
  await expect(shelf).toBeVisible()
  await expect(
    shelf.getByRole('button', { name: /Heart sounds/ }),
  ).toBeVisible()

  // Tabs: pages are coloured section tabs, sub-pages are listed.
  await choose(page, 'notebook-view', 'Tabs')
  const tabs = main(page).getByTestId('view-tabs')
  await expect(tabs.getByRole('tab', { name: 'Heart sounds' })).toBeVisible()
  await expect(tabs.getByRole('button', { name: /S1 and S2/ })).toBeVisible()
  await tabs.getByRole('button', { name: 'Colour 1' }).click()
  await expect(tabs.getByRole('button', { name: 'Colour 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.reload()
  await openNotebook(page, 'Cardiology')
  await expect(main(page).getByTestId('view-tabs')).toBeVisible()
  await expect(
    main(page).getByRole('button', { name: 'Colour 1' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('Layer gallery: add the Study kit, use it, remove it', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await page.getByTestId('corner-button').click()
  await page.getByTestId('layer-gallery-open').click()
  const gallery = page.getByTestId('layer-gallery')
  await expect(gallery).toBeVisible()
  const kit = gallery.getByTestId('layer-study-kit')
  await expect(kit.getByText('What it adds')).toBeVisible()
  await kit.getByRole('button', { name: 'Add' }).click()
  await expect(kit.getByRole('button', { name: 'Remove' })).toBeVisible()
  await gallery.getByRole('button', { name: 'Close the Layer gallery' }).click()

  // It is an ordinary notebook now.
  await expect(
    (await openSidebar(page)).getByRole('button', {
      name: 'Study kit',
      exact: true,
    }),
  ).toBeVisible()

  await page.getByTestId('corner-button').click()
  await page.getByTestId('layer-gallery-open').click()
  await page
    .getByTestId('layer-study-kit')
    .getByRole('button', { name: 'Remove' })
    .click()
  await page
    .getByTestId('layer-gallery')
    .getByRole('button', { name: 'Close the Layer gallery' })
    .click()
  await expect(
    (await openSidebar(page)).getByRole('button', {
      name: 'Study kit',
      exact: true,
    }),
  ).toHaveCount(0)
  // Your own notebook is untouched.
  await expect(
    (await openSidebar(page)).getByRole('button', {
      name: 'Cardiology',
      exact: true,
    }),
  ).toBeVisible()
})
