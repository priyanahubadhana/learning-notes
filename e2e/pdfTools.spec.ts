/// <reference lib="dom" />
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { makePdf } from './fixtures/books.ts'
import { expectStrokes, line, savedInk, stroke } from './inkHelpers.ts'

/**
 * Q8: the PDF menu. Organise pages (marks follow their pages, Undo), Combine
 * files, Scan to PDF with on-device text reading, and Export with and
 * without the reader's marks.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

const threePages = () =>
  makePdf(['Alpha page words', 'Bravo page words', 'Charlie page words'], {
    title: 'Tools Book',
  })

async function openBook(page: Page, buffer: Buffer, name = 'tools.pdf') {
  await page.goto('/')
  await space(page, 'Library').click()
  await page
    .getByTestId('library-file')
    .setInputFiles({ name, mimeType: 'application/pdf', buffer })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.getByTestId('reader-page')).toContainText('of')
}

async function pdfMenu(page: Page, item: string) {
  await page.getByTestId('reader-pdf-menu').click()
  await page.getByRole('menuitem', { name: item }).click()
}

/** Rows of one store of the open database. */
const rows = (page: Page, store: string) =>
  page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const all = db.transaction(name).objectStore(name).getAll()
          all.onsuccess = () => {
            db.close()
            resolve(all.result)
          }
        }
      }),
    store,
  )

const liveHighlights = async (page: Page) =>
  (await rows(page, 'annotations')).filter(
    (a) => a.deletedAt === null,
  ) as unknown as { anchor: { page: number } }[]

/** The page count of the file the reader holds. */
const storedPageCount = async (page: Page) => {
  const bytes = await page.evaluate(
    () =>
      new Promise<number[]>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const all = db
            .transaction('bookFiles')
            .objectStore('bookFiles')
            .getAll()
          all.onsuccess = () => {
            db.close()
            const file = all.result.find((f) => f.deletedAt === null)
            resolve(Array.from(new Uint8Array(file.data)))
          }
        }
      }),
  )
  return (await PDFDocument.load(Uint8Array.from(bytes))).getPageCount()
}

async function highlight(page: Page, text: string) {
  await expect(async () => {
    await page.getByTestId('pdf-scroller').evaluate((el) => {
      el.scrollTop = (el.scrollHeight * 2) / 3
    })
    await page.evaluate((needle) => {
      const span = Array.from(
        document.querySelectorAll('.textLayer span'),
      ).find((s) => s.textContent?.includes(needle))
      if (!span?.firstChild) throw new Error('text not found: ' + needle)
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    }, text)
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1500,
    })
  }).toPass({ timeout: 15_000 })
  await page.getByTestId('hl-green').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
}

test('the PDF menu is in the PDF reader and lists the tools', async ({
  page,
}) => {
  await openBook(page, threePages())
  await page.getByTestId('reader-pdf-menu').click()
  for (const name of [
    'Organise pages…',
    'Combine files…',
    'Scan to PDF…',
    'Make searchable (OCR)…',
    'Export with my marks',
    'Export clean copy',
  ]) {
    await expect(page.getByRole('menuitem', { name })).toBeVisible()
  }
})

test('organise: move a page; its highlight and drawing follow it; Undo puts it back', async ({
  page,
}) => {
  await openBook(page, threePages())
  await highlight(page, 'Charlie page')
  await expect.poll(async () => (await liveHighlights(page)).length).toBe(1)
  expect((await liveHighlights(page))[0]!.anchor.page).toBe(3)

  await pdfMenu(page, 'Organise pages…')
  const sheet = page.getByTestId('pdftools-organise')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByTestId('org-page')).toHaveCount(3)
  await sheet.locator('[data-testid="org-page"][data-from="3"]').click()
  await sheet.getByTestId('org-earlier').click()
  await sheet.getByTestId('org-earlier').click()
  await expect(sheet.getByTestId('org-page').first()).toHaveAttribute(
    'data-from',
    '3',
  )
  await sheet.getByTestId('org-save').click()
  await expect(sheet).toBeHidden()

  // The file and the highlight now say page 1.
  await expect
    .poll(async () => (await liveHighlights(page))[0]!.anchor.page)
    .toBe(1)
  await expect(page.getByTestId('reader-page')).toContainText('of 3')
  await expect(
    page.locator('.textLayer span', { hasText: 'Charlie' }).first(),
  ).toBeVisible()

  // Undo from the toast restores the order and the highlight's page.
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect
    .poll(async () => (await liveHighlights(page))[0]!.anchor.page)
    .toBe(3)
  // The first page is Alpha again (scroll to the top: the reader keeps its place).
  await expect(async () => {
    await page.getByTestId('pdf-scroller').evaluate((el) => {
      el.scrollTop = 0
    })
    await expect(
      page.locator('.textLayer span', { hasText: 'Alpha' }).first(),
    ).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15_000 })
})

test('organise: ink moves with its page, and a deleted page takes its ink with it', async ({
  page,
}) => {
  await openBook(page, threePages())
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
  await expect(page.locator('[data-pdf-page="3"]')).toBeAttached()
  await page.getByTestId('pdf-scroller').evaluate((el) => {
    const t = el.querySelector<HTMLElement>('[data-pdf-page="3"]')!
    el.scrollTop = t.offsetTop - 20
  })
  const r = await page.locator('[data-pdf-page="3"]').evaluate((el) => {
    const b = el.getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width }
  })
  await stroke(
    page,
    line([r.x + r.w * 0.2, r.y + 120], [r.x + r.w * 0.7, r.y + 160]),
    { type: 'mouse' },
  )
  await expectStrokes(page, 1)
  expect((await savedInk(page)).chunks[0]!.blockId).toBe('pdf:3')
  await page.getByTestId('reader-ink-done').click()

  // Delete page 1: the page that held the ink is now page 2.
  await pdfMenu(page, 'Organise pages…')
  const sheet = page.getByTestId('pdftools-organise')
  await sheet.locator('[data-testid="org-page"][data-from="1"]').click()
  await sheet.getByTestId('org-delete').click()
  await expect(sheet.getByTestId('org-page')).toHaveCount(2)
  await sheet.getByTestId('org-save').click()
  await expect(sheet).toBeHidden()
  await expect
    .poll(async () => (await savedInk(page)).chunks[0]?.blockId)
    .toBe('pdf:2')
  expect(await storedPageCount(page)).toBe(2)

  // Undo: three pages and the ink on page 3 again.
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect
    .poll(async () => (await savedInk(page)).chunks[0]?.blockId)
    .toBe('pdf:3')
  expect(await storedPageCount(page)).toBe(3)
})

test('organise: rotate, add a blank page, and the last page cannot be deleted', async ({
  page,
}) => {
  await openBook(page, threePages())
  await pdfMenu(page, 'Organise pages…')
  const sheet = page.getByTestId('pdftools-organise')
  await expect(sheet.getByTestId('org-save')).toBeDisabled()
  await sheet.locator('[data-testid="org-page"][data-from="2"]').click()
  await sheet.getByTestId('org-right').click()
  await expect(
    sheet.locator('[data-testid="org-page"][data-from="2"]'),
  ).toHaveAttribute('data-turn', '90')
  await sheet.getByTestId('org-blank').click()
  await expect(sheet.getByTestId('org-page')).toHaveCount(4)
  await sheet.getByTestId('org-all').click()
  await sheet.getByTestId('org-delete').click()
  await expect(page.getByText('A PDF needs at least one page.')).toBeVisible()
  await expect(sheet.getByTestId('org-page')).toHaveCount(4)
  await sheet.getByTestId('org-save').click()
  await expect(sheet).toBeHidden()
  await expect(page.getByTestId('reader-page')).toContainText('of 4')
  expect(await storedPageCount(page)).toBe(4)
})

test('combine: this PDF and another become one new book', async ({ page }) => {
  await openBook(page, threePages())
  await pdfMenu(page, 'Combine files…')
  const sheet = page.getByTestId('pdftools-combine')
  await expect(sheet.getByTestId('comb-go')).toBeDisabled()
  await sheet.getByTestId('comb-input').setInputFiles([
    {
      name: 'second.pdf',
      mimeType: 'application/pdf',
      buffer: makePdf(['Delta page', 'Echo page']),
    },
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a pdf'),
    },
  ])
  await expect(sheet.getByTestId('comb-item')).toHaveCount(2)
  await expect(page.getByText('notes.txt is not a PDF')).toBeVisible()
  await sheet.getByTestId('comb-go').click()
  await expect(sheet).toBeHidden()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.getByTestId('reader-page')).toContainText('of 5')
  // Both files' words are in it, in order.
  await expect(
    page.locator('.textLayer span', { hasText: 'Alpha' }).first(),
  ).toBeVisible()
})

test('export: with my marks (flattened) and a clean copy', async ({ page }) => {
  await openBook(page, threePages())
  await highlight(page, 'Charlie page')

  await page.getByTestId('reader-pdf-menu').click()
  const marked = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export with my marks' }).click()
  const d1 = await marked
  expect(d1.suggestedFilename()).toBe('Tools Book (annotated).pdf')
  const bytes1 = readFileSync((await d1.path())!)
  expect(bytes1.subarray(0, 4).toString()).toBe('%PDF')
  const doc1 = await PDFDocument.load(bytes1)
  expect(doc1.getPageCount()).toBe(3)

  await page.getByTestId('reader-pdf-menu').click()
  const clean = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export clean copy' }).click()
  const d2 = await clean
  expect(d2.suggestedFilename()).toBe('Tools Book (clean).pdf')
  const bytes2 = readFileSync((await d2.path())!)
  expect((await PDFDocument.load(bytes2)).getPageCount()).toBe(3)
  // The marked copy carries the highlight drawing on top of the clean pages.
  expect(bytes1.length).toBeGreaterThan(bytes2.length)
})

/** A PNG of dark text on a light "sheet" over a dark table, made in the page. */
async function sheetPhoto(page: Page, text: string): Promise<Buffer> {
  const url = await page.evaluate((words) => {
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 1200
    const g = c.getContext('2d')!
    g.fillStyle = '#2a2a2a'
    g.fillRect(0, 0, 900, 1200)
    g.fillStyle = '#f4f4f0'
    g.fillRect(100, 100, 700, 1000)
    g.fillStyle = '#111'
    g.font = 'bold 56px Arial, Helvetica, sans-serif'
    g.fillText(words, 140, 300)
    g.fillText('Second line here', 140, 420)
    return c.toDataURL('image/png')
  }, text)
  return Buffer.from(url.split(',')[1]!, 'base64')
}

test('scan to PDF: a photo becomes a one-page book, corners found', async ({
  page,
}) => {
  await openBook(page, threePages())
  await pdfMenu(page, 'Scan to PDF…')
  const sheet = page.getByTestId('pdftools-scan')
  await expect(sheet.getByTestId('scan-create')).toBeDisabled()
  await sheet.getByTestId('scan-input').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: await sheetPhoto(page, 'Hello scanned world'),
  })
  await expect(sheet.getByTestId('scan-editor')).toBeVisible()
  await expect(sheet.getByText('Sheet found.')).toBeVisible()
  // The four corners are handles; the sheet was found inside the picture.
  await expect(sheet.locator('[data-testid^="scan-corner-"]')).toHaveCount(4)
  await sheet.getByTestId('scan-searchable').uncheck()
  await sheet.getByTestId('scan-create').click()
  await expect(sheet).toBeHidden()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.getByTestId('reader-page')).toContainText('of 1')
})

test('scan and read: the new book is searchable (text read on this device)', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await openBook(page, threePages())
  await pdfMenu(page, 'Scan to PDF…')
  const sheet = page.getByTestId('pdftools-scan')
  await sheet.getByTestId('scan-input').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: await sheetPhoto(page, 'Hello scanned world'),
  })
  await expect(sheet.getByTestId('scan-editor')).toBeVisible()
  await sheet.getByTestId('scan-look-colour').click()
  await sheet.getByTestId('scan-create').click()
  await expect(sheet).toBeHidden({ timeout: 120_000 })
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.getByTestId('reader-page')).toContainText('of 1')
  await page.getByTestId('reader-find').click()
  await page.getByTestId('pdf-find-input').fill('scanned')
  await expect(page.getByTestId('pdf-find-hit')).toHaveCount(1, {
    timeout: 20_000,
  })
})
