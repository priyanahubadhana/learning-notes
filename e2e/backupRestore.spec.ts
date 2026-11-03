import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import {
  addAsCopies,
  createNotebook,
  openSidebar,
  typeInEditor,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

async function openData(page: Page) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Save & restore' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Save & restore', level: 1 }),
  ).toBeVisible()
}

async function saveEverything(
  page: Page,
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const downloading = page.waitForEvent('download')
  await main(page).getByRole('button', { name: 'Save everything' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toMatch(
    /^Learning Notes \d{4}-\d{2}-\d{2}\.learningnotes\.zip$/,
  )
  await expect(
    page.getByText(/^Saved “Learning Notes .*everything\.$/),
  ).toBeVisible()
  return {
    name: file.suggestedFilename(),
    mimeType: 'application/zip',
    buffer: await readFile(await file.path()),
  }
}

const sidebarButton = (page: Page, name: string) =>
  page.locator('aside').getByRole('button', { name, exact: true })

test('Save everything, replace my notes from the file, then undo', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'S1 is the first sound')
  await openData(page)
  const path = await saveEverything(page)

  // Something new after the save: it must disappear on Replace, and return on Undo.
  await createNotebook(page, 'Extra', 'Extra page')
  await openData(page)

  await main(page).getByLabel('Open saved file').setInputFiles(path)
  const dialog = page.getByRole('dialog', {
    name: /Learning Notes .*\.learningnotes\.zip/,
  })
  await expect(dialog).toContainText('Contains')
  await expect(dialog).toContainText(/\d+ notebooks, \d+ pages, 0 cards/)
  await expect(dialog).toContainText('Size')
  await page.screenshot({ path: 'test-results/screens/restore-dialog.png' })
  await dialog.getByRole('button', { name: /^Replace my notes/ }).click()

  // The app starts fresh on the same screen, with the dark bar and the Undo row.
  const bar = page
    .getByRole('status')
    .filter({ hasText: 'Restored the file from' })
  await expect(bar).toContainText(
    'Your earlier notes were kept as a safety copy.',
  )
  await expect(
    main(page).getByText(/^Safety copy from before the last restore/),
  ).toBeVisible()
  await expect(sidebarButton(page, 'Cardiology')).toBeVisible()
  await expect(sidebarButton(page, 'Extra')).toHaveCount(0)

  await bar.getByRole('button', { name: 'Undo restore' }).click()
  await expect(
    page.getByText('Your notes from before the restore are back.'),
  ).toBeVisible()
  await expect(sidebarButton(page, 'Extra')).toBeVisible()
  await expect(sidebarButton(page, 'Cardiology')).toBeVisible()
  // The Undo row is gone until the next restore.
  await expect(
    main(page).getByText(/^Safety copy from before the last restore/),
  ).toHaveCount(0)
})

test('Add as copies keeps everything and adds the file’s notebooks', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openData(page)
  const path = await saveEverything(page)
  await main(page).getByLabel('Open saved file').setInputFiles(path)
  await addAsCopies(page)
  await expect(page.getByText(/^Imported \d+ notebooks/)).toBeVisible()
  await expect(sidebarButton(page, 'Cardiology (imported)')).toBeVisible()
  await expect(sidebarButton(page, 'Cardiology')).toBeVisible()
})

test('Save notes only makes a smaller, named file', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openData(page)
  const downloading = page.waitForEvent('download')
  await main(page).getByRole('button', { name: 'Save notes only' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toMatch(
    /^Learning Notes \(notes only\) .*\.learningnotes\.zip$/,
  )
  await expect(page.getByText(/notes only, no pictures\.$/)).toBeVisible()
  // Its restore dialog says that no pictures are inside.
  await main(page)
    .getByLabel('Open saved file')
    .setInputFiles(await file.path())
  await expect(page.getByRole('dialog')).toContainText('no pictures')
})

test('an old JSON file only offers Add as copies', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openData(page)
  const downloading = page.waitForEvent('download')
  await main(page)
    .getByRole('region', { name: 'Share one notebook' })
    .getByRole('button', { name: 'Save file' })
    .click()
  const file = await downloading
  await main(page)
    .getByLabel('Open saved file')
    .setInputFiles(await file.path())
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: /^Replace/ })).toHaveCount(0)
  await expect(dialog).toContainText('only be added as copies')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toHaveCount(0)
})

test('a damaged zip is refused and nothing changes', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openData(page)
  await main(page)
    .getByLabel('Open saved file')
    .setInputFiles({
      name: 'bad.learningnotes.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from([0x50, 0x4b, 3, 4, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    })
  await expect(main(page).getByRole('alert')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(sidebarButton(page, 'Cardiology')).toBeVisible()
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: restore dialog and bar ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await (
      await openSidebar(page)
    )
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    const close = page.getByRole('button', { name: 'Close notebook' })
    if (await close.isVisible()) await close.click()
    await openData(page)
    const path = await saveEverything(page)
    await page.waitForTimeout(300)
    await page.screenshot({
      path: `test-results/screens/save-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
    await main(page).getByLabel('Open saved file').setInputFiles(path)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.screenshot({
      path: `test-results/screens/restore-dialog-${theme}-${width}x${height}.png`,
    })
    await dialog.getByRole('button', { name: /^Replace my notes/ }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Restored the file from' }),
    ).toBeVisible()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: `test-results/screens/restored-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
