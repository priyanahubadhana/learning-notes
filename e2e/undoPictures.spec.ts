// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  pageAction,
  solidPng,
  startInMode,
} from './helpers.ts'

/**
 * Batch 3a: Undo and Redo after deleting text plus pictures. The bar buttons
 * work even when the editor lost focus, the pictures come back visible, and
 * History always holds a copy from before the big delete.
 */

test.use({ viewport: { width: 1000, height: 900 } })

async function setup(page: Page) {
  const png = await solidPng(240, 120)
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  const editor = page.locator('.bn-editor')
  await editor.click()
  await page.keyboard.type('First line')
  for (const name of ['one.png', 'two.png']) {
    await page.keyboard.press('Enter')
    await page.keyboard.type('/image')
    await page.keyboard.press('Enter')
    await page
      .locator('input[type="file"]')
      .last()
      .setInputFiles({ name, mimeType: 'image/png', buffer: png })
    await expect(
      page.locator('.bn-editor img').nth(name === 'one.png' ? 0 : 1),
    ).toBeVisible()
    await page.keyboard.type(name === 'one.png' ? 'Middle line' : 'Last line')
  }
  await picturesShown(page, 2)
  await page.waitForTimeout(600)
}

/** Every picture is really drawn (loaded, not broken). */
const picturesShown = (page: Page, count: number) =>
  expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('.bn-editor img')].filter(
            (img) => (img as HTMLImageElement).naturalWidth > 0,
          ).length,
      ),
    )
    .toBe(count)

/** Selects from the first picture to the end with a simulated pen drag. */
async function selectPicturesAndText(page: Page) {
  const box = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!
  const img1 = await box(page.locator('.bn-editor img').nth(0))
  const last = await box(page.getByText('Last line'))
  await page.evaluate(
    ({ from, to }) => {
      const make = (name: string, x: number, y: number) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 5,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          buttons: name === 'pointerup' ? 0 : 1,
          isPrimary: true,
        })
      const at = (x: number, y: number) => document.elementFromPoint(x, y)!
      at(from.x, from.y).dispatchEvent(make('pointerdown', from.x, from.y))
      for (let i = 1; i <= 10; i++) {
        const x = from.x + ((to.x - from.x) * i) / 10
        const y = from.y + ((to.y - from.y) * i) / 10
        at(x, y).dispatchEvent(make('pointermove', x, y))
      }
      at(to.x, to.y).dispatchEvent(make('pointerup', to.x, to.y))
    },
    {
      from: { x: img1.x + 40, y: img1.y + 40 },
      to: { x: last.x + 20, y: last.y + 10 },
    },
  )
  await expect(page.locator('[data-ln-selected]')).toHaveCount(2)
  await page.waitForTimeout(400) // the quiet time after a pen gesture
}

const bar = (page: Page, name: string) =>
  dockedBar(page).getByRole('button', { name, exact: true })

test('delete text and pictures, Undo brings them back with the pictures drawn, Redo deletes again, History restores', async ({
  page,
}) => {
  await setup(page)
  await selectPicturesAndText(page)
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(0)
  await expect(page.locator('.bn-editor')).not.toContainText('Last line')

  await bar(page, 'Undo').click()
  await expect(page.locator('.bn-editor img')).toHaveCount(2)
  await picturesShown(page, 2)
  await expect(page.locator('.bn-editor')).toContainText('Last line')

  await bar(page, 'Redo').click()
  await expect(page.locator('.bn-editor img')).toHaveCount(0)
  await expect(page.locator('.bn-editor')).not.toContainText('Last line')

  // History holds a copy from before the delete, whatever happened since.
  await page.waitForTimeout(1200) // saved
  const dialog = page.getByRole('dialog', { name: 'Page history' })
  await pageAction(page, 'History')
  const items = dialog.getByRole('listitem')

  await expect.poll(() => items.count()).toBeGreaterThan(1)
  const count = await items.count()
  let restored = false
  for (let i = 0; i < count && !restored; i++) {
    await items.nth(i).getByRole('button').click()
    if (await dialog.getByText('Last line').count()) {
      await dialog.getByRole('button', { name: 'Restore this copy' }).click()
      restored = true
    }
  }
  expect(restored).toBe(true)
  await expect(page.locator('.bn-editor img')).toHaveCount(2)
  await picturesShown(page, 2)
  await expect(page.locator('.bn-editor')).toContainText('Last line')
})

test('Undo and Redo on the bar work when focus is on the bar, not the editor', async ({
  page,
}) => {
  await setup(page)
  await selectPicturesAndText(page)
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(0)
  // Move focus away from the editor entirely.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await bar(page, 'Undo').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.bn-editor img')).toHaveCount(2)
  await picturesShown(page, 2)
  await bar(page, 'Redo').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.bn-editor img')).toHaveCount(0)
})

test('three or more deleted blocks are always in History', async ({ page }) => {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Notes', 'Many')
  await page.locator('.bn-editor').click()
  for (const line of ['one', 'two', 'three', 'four']) {
    await page.keyboard.type(line)
    await page.keyboard.press('Enter')
  }
  await page.waitForTimeout(800) // first copy of the page
  await page.keyboard.type('five') // saved, but too soon for a new copy
  await page.waitForTimeout(800)
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor')).not.toContainText('four')
  await page.waitForTimeout(1200)
  const dialog = page.getByRole('dialog', { name: 'Page history' })
  await pageAction(page, 'History')
  const items = dialog.getByRole('listitem')
  let found = false
  await expect.poll(() => items.count()).toBeGreaterThan(1)
  const count = await items.count()
  for (let i = 0; i < count && !found; i++) {
    await items.nth(i).getByRole('button').click()
    found = (await dialog.getByText('five').count()) > 0
  }
  expect(found).toBe(true)
})
