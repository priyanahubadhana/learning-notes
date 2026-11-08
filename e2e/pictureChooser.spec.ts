// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  openRibbon,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** Fix #5: Insert › Picture opens a chooser; the block exists only once a picture is chosen. */

test.use({ viewport: { width: 1000, height: 1180 }, hasTouch: true })

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
  'base64',
)
const chooser = (page: Page) => page.getByTestId('picture-chooser')

async function openPage(page: Page) {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

async function insertPicture(page: Page) {
  const menu = page.getByRole('button', { name: 'Toolbar menu' })
  if (await menu.isVisible()) await openRibbon(page)
  const insert = dockedBar(page)
    .getByRole('tablist', { name: 'Tool tabs' })
    .getByRole('tab', { name: 'Insert', exact: true })
  const panel = dockedBar(page).getByRole('tabpanel')
  const onInsert = (await insert.getAttribute('aria-selected')) === 'true'
  if (!onInsert || !(await panel.isVisible())) await insert.click()
  await dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'Picture', exact: true })
    .click()
}

test('Insert › Picture: choose a file, the picture shows and is saved', async ({
  page,
}) => {
  await openPage(page)
  await insertPicture(page)
  await expect(chooser(page)).toBeVisible()
  // Nothing is added yet.
  await expect(
    page.locator('.bn-editor .bn-block-content[data-content-type="image"]'),
  ).toHaveCount(0)
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(chooser(page)).toHaveCount(0)
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
  await page.waitForTimeout(900) // autosave
  await page.reload()
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
})

test('cancelling the chooser leaves no empty picture block', async ({
  page,
}) => {
  await openPage(page)
  await insertPicture(page)
  await expect(chooser(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(chooser(page)).toHaveCount(0)
  await expect(
    page.locator('.bn-editor [data-content-type="image"]'),
  ).toHaveCount(0)
  await insertPicture(page)
  await chooser(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(chooser(page)).toHaveCount(0)
  await expect(
    page.locator('.bn-editor [data-content-type="image"]'),
  ).toHaveCount(0)
})

test('Paste uses a picture from the clipboard; without one it shows the hint', async ({
  page,
}) => {
  await openPage(page)
  // No picture on the clipboard: the hint.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { read: async () => [] },
    })
  })
  await insertPicture(page)
  await page.getByTestId('picture-paste').click()
  await expect(page.getByTestId('picture-paste-hint')).toBeVisible()
  await page.keyboard.press('Escape')
  // A picture on the clipboard.
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'image/png' })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => [{ types: ['image/png'], getType: async () => blob }],
      },
    })
  }, PNG.toString('base64'))
  await insertPicture(page)
  await page.getByTestId('picture-paste').click()
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
})

test("the empty picture block's own Add button opens the same chooser", async ({
  page,
}) => {
  await openPage(page)
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await expect(chooser(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.locator('.bn-editor [data-content-type="image"]'),
  ).toHaveCount(0)
})
