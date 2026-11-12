// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7c (docs/features/reader-v2.md): sticky notes. Flag reader.v2 is
 * switched on with ?flags=reader.v2. One test per RD line.
 */

test.use({ viewport: { width: 1200, height: 900 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openPdf(page: Page) {
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from(
        { length: 4 },
        (_, i) => `Page ${i + 1} words here and some more words to read`,
      ),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
}

const toastButton = (page: Page, name: string) =>
  page.getByRole('status').getByRole('button', { name })
const pdfPage = (page: Page, n = 1) => page.locator(`[data-pdf-page="${n}"]`)
const pins = (page: Page) => page.getByTestId('rv2-sticky-pin')
const readView = (page: Page) => page.getByTestId('rv2-sticky-read')
const editDialog = (page: Page) => page.getByTestId('rv2-sticky-edit-dialog')

/** Opens the Pen, arms the Sticky tool and taps the page at a fraction of it. */
async function placeAt(page: Page, fx = 0.4, fy = 0.3, n = 1) {
  if (!(await page.getByTestId('reader-ink-bar').isVisible()))
    await page.getByTestId('reader-ink').click()
  await page.getByTestId('reader-ink-sticky').click()
  const b = await pdfPage(page, n).boundingBox()
  if (!b) throw new Error('page not visible')
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy)
}

async function addNote(page: Page, text: string, fx = 0.4, fy = 0.3) {
  await placeAt(page, fx, fy)
  await expect(editDialog(page)).toBeVisible()
  await page.getByTestId('rv2-sticky-text-input').fill(text)
  await page.getByTestId('rv2-sticky-save').click()
  await expect(editDialog(page)).toHaveCount(0)
}

test('RD-B27 adding a sticky note opens the edit dialog with a close cross and Save; nothing exists until Save', async ({
  page,
}) => {
  await openPdf(page)
  await placeAt(page)
  await expect(editDialog(page)).toBeVisible()
  await expect(page.getByTestId('sheet-close')).toBeVisible()
  await expect(page.getByTestId('rv2-sticky-save')).toBeDisabled()
  await expect(pins(page)).toHaveCount(0)
  // The cross throws the new note away.
  await page.getByTestId('sheet-close').click()
  await expect(editDialog(page)).toHaveCount(0)
  await expect(pins(page)).toHaveCount(0)
  // Save keeps it, shows it on the page and says so.
  await addNote(page, 'Remember the date')
  await expect(pins(page)).toHaveCount(1)
  await expect(page.getByText('Sticky note added.')).toBeVisible()
})

test('RD-B28 a tap on a sticky note opens a read view: paper colour, text, only edit and close, not editable', async ({
  page,
}) => {
  await openPdf(page)
  await addNote(page, 'Line one\nLine two <b>not bold</b>')
  await pins(page).click()
  await expect(readView(page)).toBeVisible()
  await expect(page.getByTestId('rv2-sticky-text')).toHaveText(
    'Line one\nLine two <b>not bold</b>',
  )
  await expect(readView(page).locator('b')).toHaveCount(0)
  // Only two buttons, no text field.
  await expect(readView(page).getByRole('button')).toHaveCount(2)
  await expect(page.getByTestId('rv2-sticky-edit')).toBeVisible()
  await expect(page.getByTestId('rv2-sticky-close')).toBeVisible()
  await expect(readView(page).locator('textarea, input')).toHaveCount(0)
  const look = await readView(page).evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      bg: s.backgroundColor,
      radius: s.borderRadius,
      transform: s.transform,
    }
  })
  expect(look.bg).toBe('rgb(243, 220, 122)')
  expect(look.radius).toBe('4px 4px 4px 14px')
  expect(look.transform).not.toBe('none')
  // Typing into the read view changes nothing.
  await page.keyboard.type('zzz')
  await expect(page.getByTestId('rv2-sticky-text')).not.toContainText('zzz')
  // Esc closes.
  await page.keyboard.press('Escape')
  await expect(readView(page)).toHaveCount(0)
})

test('RD-B29 the pencil edits with the same text; Save returns to the read view; the cross closes without edits', async ({
  page,
}) => {
  await openPdf(page)
  await addNote(page, 'First words')
  await pins(page).click()
  await page.getByTestId('rv2-sticky-edit').click()
  await expect(editDialog(page)).toBeVisible()
  await expect(page.getByTestId('rv2-sticky-text-input')).toHaveValue(
    'First words',
  )
  await page.getByTestId('rv2-sticky-text-input').fill('Second words')
  await page.getByTestId('rv2-sticky-save').click()
  await expect(readView(page)).toBeVisible()
  await expect(page.getByTestId('rv2-sticky-text')).toHaveText('Second words')
  // Edit again, change, then the cross: nothing is kept.
  await page.getByTestId('rv2-sticky-edit').click()
  await page.getByTestId('rv2-sticky-text-input').fill('Thrown away')
  await page.getByTestId('sheet-close').click()
  await expect(editDialog(page)).toHaveCount(0)
  await expect(readView(page)).toHaveCount(0)
  await pins(page).click()
  await expect(page.getByTestId('rv2-sticky-text')).toHaveText('Second words')
})

test('Undo and Redo after adding and deleting', async ({ page }) => {
  await openPdf(page)
  await addNote(page, 'Undo me')
  await expect(pins(page)).toHaveCount(1)
  await toastButton(page, 'Undo').click()
  await expect(pins(page)).toHaveCount(0)
  await expect(page.getByText('Undone.')).toBeVisible()
  await toastButton(page, 'Redo').click()
  await expect(pins(page)).toHaveCount(1)
  // Delete from the edit dialog, then Undo.
  await pins(page).click()
  await page.getByTestId('rv2-sticky-edit').click()
  await page.getByTestId('rv2-sticky-delete').click()
  await expect(pins(page)).toHaveCount(0)
  await expect(page.getByText('Sticky note deleted.')).toBeVisible()
  await toastButton(page, 'Undo').click()
  await expect(pins(page)).toHaveCount(1)
})

test('RD-B33 a long-press lifts a sticky note and a drag moves it; a normal tap never moves it', async ({
  page,
}) => {
  await openPdf(page)
  await addNote(page, 'Move me', 0.3, 0.2)
  const before = await pins(page).boundingBox()
  if (!before) throw new Error('no pin')
  const cx = before.x + before.width / 2
  const cy = before.y + before.height / 2
  // A tap opens the read view and moves nothing.
  await pins(page).click()
  await expect(readView(page)).toBeVisible()
  await page.keyboard.press('Escape')
  const same = await pins(page).boundingBox()
  expect(same!.x).toBeCloseTo(before.x, 0)
  expect(same!.y).toBeCloseTo(before.y, 0)
  // A long-press lifts it, the drag carries it, letting go drops it.
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await expect(page.getByTestId('rv2-sticky-ghost')).toBeVisible()
  await page.mouse.move(cx + 150, cy + 120, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('rv2-sticky-ghost')).toHaveCount(0)
  // The click after the hold does not open the note.
  await expect(readView(page)).toHaveCount(0)
  await expect
    .poll(async () => (await pins(page).boundingBox())?.x ?? 0)
    .toBeGreaterThan(before.x + 100)
  await expect(page.getByText('Sticky note moved.')).toBeVisible()
  // Undo puts it back.
  await toastButton(page, 'Undo').click()
  await expect
    .poll(async () => (await pins(page).boundingBox())?.x ?? 0)
    .toBeLessThan(before.x + 5)
})

test('RD-B33 a long-press drag to the page edge scrolls the book', async ({
  page,
}) => {
  await openPdf(page)
  await addNote(page, 'Edge', 0.3, 0.4)
  const b = (await pins(page).boundingBox())!
  const scroller = page.getByTestId('pdf-scroller')
  const sb = (await scroller.boundingBox())!
  const top0 = await scroller.evaluate((el) => el.scrollTop)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await expect(page.getByTestId('rv2-sticky-ghost')).toBeVisible()
  await page.mouse.move(b.x + b.width / 2, sb.y + sb.height - 8, { steps: 5 })
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(top0)
  await page.mouse.up()
})

test('no sticky note appears by accident: not armed, dragged, or with the Pen drawing', async ({
  page,
}) => {
  await openPdf(page)
  const b = (await pdfPage(page).boundingBox())!
  // Plain taps on the page, Pen closed.
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.5)
  await expect(editDialog(page)).toHaveCount(0)
  // Pen open and drawing, Sticky not armed: a stroke makes ink, not a note.
  await page.getByTestId('reader-ink').click()
  await page.mouse.move(b.x + 200, b.y + 200)
  await page.mouse.down()
  await page.mouse.move(b.x + 260, b.y + 240, { steps: 5 })
  await page.mouse.up()
  await expect(editDialog(page)).toHaveCount(0)
  await expect(pins(page)).toHaveCount(0)
  // Armed: a drag across the page is not a tap.
  await page.getByTestId('reader-ink-sticky').click()
  await expect(page.getByTestId('reader-ink-sticky')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.mouse.move(b.x + 200, b.y + 300)
  await page.mouse.down()
  await page.mouse.move(b.x + 200, b.y + 380, { steps: 5 })
  await page.mouse.up()
  await expect(editDialog(page)).toHaveCount(0)
  // Done turns the tool off, so the next tap makes nothing.
  await page.getByTestId('reader-ink-done').click()
  await page.mouse.click(b.x + 300, b.y + 300)
  await expect(editDialog(page)).toHaveCount(0)
})

test.describe('touch', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  })

  test('a finger tap places a note only when armed; a finger scroll does not; a tap on a pin opens the read view', async ({
    page,
  }) => {
    await openPdf(page)
    // Arm, then a swipe (scroll) places nothing.
    await page.getByTestId('reader-ink').tap()
    await page.getByTestId('reader-ink-sticky').tap()
    const b = (await pdfPage(page).boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const x = b.x + b.width / 2
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y: b.y + 500 }],
    })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: b.y + 380 }],
    })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await expect(editDialog(page)).toHaveCount(0)
    // A tap places one.
    const b2 = (await pdfPage(page).boundingBox())!
    await page.touchscreen.tap(b2.x + b2.width * 0.5, b2.y + 200)
    await expect(editDialog(page)).toBeVisible()
    await page.getByTestId('rv2-sticky-text-input').fill('From a finger')
    await page.getByTestId('rv2-sticky-save').tap()
    await expect(pins(page)).toHaveCount(1)
    await pins(page).tap()
    await expect(readView(page)).toBeVisible()
    const r = (await readView(page).boundingBox())!
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x + r.width).toBeLessThanOrEqual(820.5)
  })
})

test('a Pencil that hovers or scribbles never makes a sticky note; only a still tap while the tool is armed does', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await page.getByTestId('reader-ink-sticky').click()
  const b = (await pdfPage(page).boundingBox())!
  const send = (type: string, dx: number, dy: number, buttons: number) =>
    page.evaluate(
      ([ty, x, y, bt]) => {
        const el = document.querySelector('[data-testid="rv2-sticky-catch"]')!
        el.dispatchEvent(
          new PointerEvent(ty as string, {
            pointerId: 9,
            pointerType: 'pen',
            isPrimary: true,
            bubbles: true,
            cancelable: true,
            clientX: x as number,
            clientY: y as number,
            buttons: bt as number,
          }),
        )
      },
      [type, b.x + dx, b.y + dy, buttons] as const,
    )
  // Hover (no contact): nothing.
  await send('pointermove', 100, 100, 0)
  await send('pointermove', 120, 110, 0)
  await expect(editDialog(page)).toHaveCount(0)
  // A scribble (down, move far, up): nothing.
  await send('pointerdown', 100, 100, 1)
  await send('pointermove', 160, 140, 1)
  await send('pointerup', 160, 140, 0)
  await expect(editDialog(page)).toHaveCount(0)
  // A still tap: one note dialog.
  await send('pointerdown', 200, 200, 1)
  await send('pointerup', 200, 200, 0)
  await expect(editDialog(page)).toBeVisible()
})
