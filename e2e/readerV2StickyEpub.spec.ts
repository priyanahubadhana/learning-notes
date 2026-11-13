// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Frame, Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makeEpub } from './fixtures/books.ts'

/**
 * Slice 7 (reader v2): sticky notes on an EPUB (selection pop-up route) and a
 * tap on marked words opens the note. Flag reader.v2 via ?flags=reader.v2.
 */
test.use({ viewport: { width: 1200, height: 900 } })

async function openEpub(page: Page) {
  await page.goto('/?flags=reader.v2')
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

async function bookFrame(page: Page, text: string): Promise<Frame> {
  let found: Frame | null = null
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue
          const body = await f
            .evaluate(() => document.body?.innerText ?? '')
            .catch(() => '')
          if (body.includes(text)) {
            found = f
            return true
          }
        }
        return false
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  return found!
}

const selectFox = (frame: Frame) =>
  frame.evaluate(() => {
    const p = document.querySelector('p')!
    const range = document.createRange()
    // Real words (a text node), as a person selects them.
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, p.firstChild!.textContent!.length)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  })

/** Taps the first words of the paragraph, where the mark is. */
async function tapFoxWords(page: Page, frame: Frame) {
  const at = await frame.evaluate(() => {
    const p = document.querySelector('p')!
    const r = document.createRange()
    r.setStart(p.firstChild!, 4)
    r.setEnd(p.firstChild!, 9)
    const b = r.getBoundingClientRect()
    const f = window.frameElement!.getBoundingClientRect()
    return { x: b.x + b.width / 2 + f.x, y: b.y + b.height / 2 + f.y }
  })
  await page.mouse.click(at.x, at.y)
}

const readView = (page: Page) => page.getByTestId('rv2-sticky-read')
const editDialog = (page: Page) => page.getByTestId('rv2-sticky-edit-dialog')

test('RD-B27 on an EPUB, Sticky note in the selection pop-up opens the edit dialog; nothing exists until Save; Undo', async ({
  page,
}) => {
  await openEpub(page)
  const frame = await bookFrame(page, 'quick brown fox')
  await selectFox(frame)
  await page.getByTestId('popup-sticky').click()
  await expect(editDialog(page)).toBeVisible()
  await expect(page.getByTestId('sheet-close')).toBeVisible()
  await expect(page.getByTestId('rv2-sticky-save')).toBeDisabled()
  // The cross throws the new note away.
  await page.getByTestId('sheet-close').click()
  await expect(editDialog(page)).toHaveCount(0)
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(0)
  // Save keeps it, says so, and Undo takes it back.
  await selectFox(frame)
  await page.getByTestId('popup-sticky').click()
  await page.getByTestId('rv2-sticky-text-input').fill('Check this fox')
  await page.getByTestId('rv2-sticky-save').click()
  await expect(page.getByText('Sticky note added.')).toBeVisible()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(0)
})

test('RD-B28 on an EPUB, a tap on the marked words opens the sticky note read view; it survives a reload', async ({
  page,
}) => {
  await openEpub(page)
  const frame = await bookFrame(page, 'quick brown fox')
  await selectFox(frame)
  await page.getByTestId('popup-sticky').click()
  await page.getByTestId('rv2-sticky-text-input').fill('Check this fox')
  await page.getByTestId('rv2-sticky-save').click()
  await expect(editDialog(page)).toHaveCount(0)
  await expect(readView(page)).toHaveCount(0)
  await tapFoxWords(page, frame)
  await expect(readView(page)).toContainText('Check this fox')
  await page.getByTestId('rv2-sticky-close').click()
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  const again = await bookFrame(page, 'quick brown fox')
  await expect(page.getByTestId('annotation-row')).toHaveCount(0)
  await tapFoxWords(page, again)
  await expect(readView(page)).toHaveCount(1)
  await expect(readView(page)).toContainText('Check this fox')
})

test('on an EPUB, a tap on a highlight that has a note opens its note', async ({
  page,
}) => {
  await openEpub(page)
  const frame = await bookFrame(page, 'quick brown fox')
  await selectFox(frame)
  await page.getByRole('button', { name: 'Note', exact: true }).click()
  await page.getByTestId('note-text').fill('A fox note')
  await page.getByTestId('note-save').click()
  await expect(page.getByTestId('note-text')).toHaveCount(0)
  await tapFoxWords(page, frame)
  await expect(readView(page)).toHaveCount(1)
  await expect(readView(page)).toContainText('A fox note')
})
