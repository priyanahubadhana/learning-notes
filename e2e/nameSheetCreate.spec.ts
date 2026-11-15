import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  showSidebar,
  sidebar,
  startInMode,
} from './helpers.ts'

/**
 * R9: on a touch device the "Name it" sheet must open every time a notebook
 * is made, and the shared createNotebook step must name it reliably, on an
 * iPad and on a phone (where the sidebar is a drawer).
 */
for (const [size, viewport] of [
  ['iPad', { width: 1336, height: 1100 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test.describe(size, () => {
    test.use({ viewport, hasTouch: true })
    test(`${size}: a new notebook is named through the sheet every time`, async ({
      page,
    }) => {
      await startInMode(page, 'computer')
      await page.goto('/')
      await createNotebook(page, 'Paper', 'First')
      await expect(
        page.getByRole('navigation', { name: 'Breadcrumb' }),
      ).toContainText('Paper')
      await showSidebar(page)
      await expect(
        sidebar(page).getByRole('button', { name: 'First', exact: true }),
      ).toBeVisible()
    })
    test(`${size}: a new page is named through the sheet every time`, async ({
      page,
    }) => {
      await startInMode(page, 'computer')
      await page.goto('/')
      await createNotebook(page, 'Paper', 'First')
      await addPage(page, 'Paper', 'Second')
      await expect(
        page.getByRole('navigation', { name: 'Breadcrumb' }),
      ).toContainText('Second')
    })
  })
}
