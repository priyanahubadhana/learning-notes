// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7f (docs/features/reader-v2.md): the Pages grid edits the real book,
 * with Undo and Restore original. RD-B36 to RD-B41. Flag reader.v2 is
 * switched on with ?flags=reader.v2.
 */

test.use({ viewport: { width: 1200, height: 900 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openPdf(page: Page, pages = 5) {
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from({ length: pages }, (_, i) => `Page ${i + 1} words here`),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
  await page.getByTestId('panel-toggle').click()
  await expect(page.getByTestId('pg-list')).toBeVisible()
  await expect(page.getByTestId('book-thumb')).toHaveCount(pages)
}

const label = (page: Page) => page.getByTestId('reader-page')
const thumb = (page: Page, n: number) =>
  page.locator(`[data-testid="book-thumb"][data-page="${n}"]`)
const firstPageText = (page: Page) => page.locator('[data-pdf-page="1"]')
const toast = (page: Page, text: string | RegExp) =>
  page.getByRole('status').filter({ hasText: text })

const centre = async (loc: ReturnType<Page['locator']>) => {
  const b = await loc.boundingBox()
  if (!b) throw new Error('not visible')
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }
}

/** Drags with the mouse from `from` to `to` in small steps. */
async function dragTo(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / 12,
      from.y + ((to.y - from.y) * i) / 12,
    )
  }
}

/** Moves page 4 to the front by its grip. */
async function moveFourToFront(page: Page) {
  const grip = page.locator('[data-reorder-id="p4"] .rord-grip')
  const g = await centre(grip)
  const first = await centre(thumb(page, 1))
  await dragTo(page, g, {
    x: first.b.x + first.b.width - 50,
    y: first.b.y + 10,
  })
  await page.mouse.up()
}

/** A touch or Pencil press, as the browser would send it (a mouse drags at once). */
const pointer = (
  page: Page,
  n: number,
  type: string,
  at: { x: number; y: number },
  kind: 'touch' | 'pen' = 'touch',
) =>
  page.locator(`[data-reorder-id="p${n}"]`).evaluate(
    (el, a) => {
      el.dispatchEvent(
        new PointerEvent(a.type, {
          bubbles: true,
          cancelable: true,
          pointerId: 41,
          pointerType: a.kind,
          clientX: a.at.x,
          clientY: a.at.y,
          button: 0,
          buttons: a.type === 'pointerup' ? 0 : 1,
        }),
      )
    },
    { type, at, kind },
  )

for (const kind of ['touch', 'pen'] as const) {
  test(`RD-B36 hold a page 0.3 s (${kind}), then drag: the page lifts, the others slide aside and it lands in the new place`, async ({
    page,
  }) => {
    await openPdf(page)
    const four = await centre(thumb(page, 4))
    const one = await centre(thumb(page, 1))
    await pointer(page, 4, 'pointerdown', four, kind)
    // The hold time is what is being tested, so this wait is the measurement.
    await page.waitForTimeout(400)
    for (let i = 1; i <= 12; i++) {
      await pointer(
        page,
        4,
        'pointermove',
        {
          x: four.x + ((one.b.x + 10 - four.x) * i) / 12,
          y: four.y + ((one.b.y + 10 - four.y) * i) / 12,
        },
        kind,
      )
    }
    // Lifted, and the others slide aside live: page 4 is now first in the grid.
    await expect(page.locator('[data-reorder-id="p4"]')).toHaveAttribute(
      'data-state',
      'lifted',
    )
    await expect(page.locator('[data-reorder-id]').first()).toHaveAttribute(
      'data-reorder-id',
      'p4',
    )
    await pointer(
      page,
      4,
      'pointerup',
      { x: one.b.x + 10, y: one.b.y + 10 },
      kind,
    )
    await expect(firstPageText(page)).toContainText('Page 4 words here')
  })
}

test('RD-B36 a quick swipe on a page (touch) does not lift it: the page just scrolls', async ({
  page,
}) => {
  await openPdf(page)
  const four = await centre(thumb(page, 4))
  await pointer(page, 4, 'pointerdown', four)
  await pointer(page, 4, 'pointermove', { x: four.x - 40, y: four.y - 30 })
  await page.waitForTimeout(400)
  await pointer(page, 4, 'pointermove', { x: four.x - 80, y: four.y - 60 })
  await expect(page.locator('[data-state="lifted"]')).toHaveCount(0)
  await pointer(page, 4, 'pointerup', { x: four.x - 80, y: four.y - 60 })
  await expect(firstPageText(page)).toContainText('Page 1 words here')
})

test('RD-B36 a tap on a page picks it and the book goes there', async ({
  page,
}) => {
  await openPdf(page)
  await thumb(page, 3).click()
  await expect(label(page)).toContainText('Page 3 of 5')
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
})

test('RD-B37 dropping a page in a new place changes the real book; the toast offers Undo', async ({
  page,
}) => {
  await openPdf(page)
  await moveFourToFront(page)
  await expect(toast(page, 'Moved page 4')).toBeVisible()
  await expect(firstPageText(page)).toContainText('Page 4 words here')
  await expect(label(page)).toContainText('of 5')
  // Page 2 of the book is now the old page 1.
  await expect(page.locator('[data-pdf-page="2"]')).toContainText(
    'Page 1 words here',
  )
  await toast(page, 'Moved page 4')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(firstPageText(page)).toContainText('Page 1 words here')
  await expect(page.locator('[data-pdf-page="2"]')).toContainText(
    'Page 2 words here',
  )
})

test('RD-B38 delete, turn and add a blank page change the real book; Undo works for each', async ({
  page,
}) => {
  await openPdf(page)
  const undo = (text: string | RegExp) =>
    toast(page, text).getByRole('button', { name: 'Undo' }).click()

  // Delete page 2.
  await thumb(page, 2).click()
  await page.getByTestId('pg-delete').click()
  await expect(toast(page, 'Deleted page 2')).toBeVisible()
  await expect(label(page)).toContainText('of 4')
  await expect(page.locator('[data-pdf-page="2"]')).toContainText(
    'Page 3 words here',
  )
  await undo('Deleted page 2')
  await expect(label(page)).toContainText('of 5')
  await expect(page.locator('[data-pdf-page="2"]')).toContainText(
    'Page 2 words here',
  )

  // Turn page 3 right: the page box becomes wider than tall.
  await thumb(page, 3).click()
  const before = await page.locator('[data-pdf-page="3"]').boundingBox()
  await page.getByTestId('pg-turn').click()
  await expect(toast(page, 'Turned page 3')).toBeVisible()
  await expect
    .poll(async () => {
      const b = await page.locator('[data-pdf-page="3"]').boundingBox()
      return b ? b.width / b.height : 0
    })
    .toBeGreaterThan(before!.width / before!.height)
  await undo('Turned page 3')
  await expect
    .poll(async () => {
      const b = await page.locator('[data-pdf-page="3"]').boundingBox()
      return b ? Math.round((b.width / b.height) * 100) : 0
    })
    .toBe(Math.round((before!.width / before!.height) * 100))

  // Add a blank page after page 1.
  await thumb(page, 1).click()
  await page.getByTestId('pg-blank').click()
  await expect(toast(page, 'Added a blank page after page 1')).toBeVisible()
  await expect(label(page)).toContainText('of 6')
  await undo('Added a blank page')
  await expect(label(page)).toContainText('of 5')
})

test('RD-B39 Restore original asks first (✕ keeps the edits); Yes brings the first copy back with Undo', async ({
  page,
}) => {
  await openPdf(page)
  // Nothing to restore before an edit.
  await expect(page.getByTestId('pg-restore')).toHaveCount(0)
  await thumb(page, 2).click()
  await page.getByTestId('pg-delete').click()
  await expect(label(page)).toContainText('of 4')
  await page.getByTestId('pg-restore').click()
  const dialog = page.getByTestId('pg-restore-dialog')
  await expect(dialog).toBeVisible()
  // ✕ closes the dialog; the edits stay.
  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).toHaveCount(0)
  await expect(label(page)).toContainText('of 4')
  await page.getByTestId('pg-restore').click()
  await page.getByTestId('pg-restore-yes').click()
  await expect(toast(page, 'The original book is back.')).toBeVisible()
  await expect(label(page)).toContainText('of 5')
  await expect(page.locator('[data-pdf-page="2"]')).toContainText(
    'Page 2 words here',
  )
  await toast(page, 'The original book is back.')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(label(page)).toContainText('of 4')
})

test('RD-B40 after edits, close the reader and open again: the edited book opens and Restore original is still there', async ({
  page,
}) => {
  await openPdf(page)
  await thumb(page, 2).click()
  await page.getByTestId('pg-delete').click()
  await expect(label(page)).toContainText('of 4')
  await page.getByTestId('reader-close').click()
  await page.getByTestId('book-continue').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(label(page)).toContainText('of 4')
  // The panel may have closed with the reader.
  if (!(await page.getByTestId('pg-list').isVisible())) {
    await page.getByTestId('panel-toggle').click()
  }
  await expect(page.getByTestId('pg-restore')).toBeVisible()
})

test('RD-B41 ✕ on the Pages panel closes it; nothing behind it is dimmed', async ({
  page,
}) => {
  await openPdf(page)
  const panel = page.getByTestId('left-panel')
  await expect(panel).toBeVisible()
  // No dim layer: the page behind the panel keeps full opacity and the
  // reader can still be pressed.
  const opacity = await page
    .getByTestId('book-reader')
    .evaluate((el) => getComputedStyle(el).opacity)
  expect(opacity).toBe('1')
  await expect(
    page.locator('[data-scrim], .scrim, [data-testid$="scrim"]'),
  ).toHaveCount(0)
  await panel.getByRole('button', { name: 'Close panel' }).click()
  await expect(panel).toHaveCount(0)
})
