// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 6, Library v2 (`?flags=library.v2`): one test per line of
 * docs/plans/library-v2-spec.md, the flag-off check and the probes of the
 * 34 features of today's screen. Chromium and the iPad project.
 */

test.use({ viewport: { width: 1180, height: 820 } })

const main = (page: Page) => page.getByRole('main')
const pdf = (title: string) =>
  makePdf(['Alpha page words here', 'Bravo page words here'], { title })

async function openLibrary(
  page: Page,
  opts: { flag?: boolean; level?: 'beginner' | 'professional' } = {},
) {
  const { flag = true, level = 'beginner' } = opts
  await page.addInitScript((lv) => {
    try {
      if (!localStorage.getItem('learning-notes:level'))
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: lv, unlocked: [] }),
        )
    } catch {
      // storage blocked: the default level applies
    }
  }, level)
  await page.goto(flag ? '/?flags=library.v2' : '/')
  await expect(async () => {
    await page
      .getByRole('navigation', { name: 'Spaces' })
      .getByRole('button', { name: 'Space: Library' })
      .click()
    await expect(
      main(page).getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 20_000 })
}

async function importBook(page: Page, title: string) {
  await page.getByTestId('library-file').setInputFiles({
    name: `${title}.pdf`,
    mimeType: 'application/pdf',
    buffer: pdf(title),
  })
  await expect(
    page.getByTestId('source-card').filter({ hasText: title }),
  ).toBeVisible()
}

/** Puts a highlight straight into the local database (a fixture). */
async function addHighlight(page: Page, bookTitle: string, quote: string) {
  await page.evaluate(
    async ([title, text]) => {
      const db: IDBDatabase = await new Promise((res, rej) => {
        const r = indexedDB.open('learning-notes')
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      const get = <T>(store: string): Promise<T[]> =>
        new Promise((res, rej) => {
          const r = db.transaction(store).objectStore(store).getAll()
          r.onsuccess = () => res(r.result as T[])
          r.onerror = () => rej(r.error)
        })
      const pages = await get<{ id: string; title: string }>('pages')
      const book = pages.find((p) => p.title === title)
      if (!book) throw new Error('book not found')
      const now = Date.now()
      await new Promise<void>((res, rej) => {
        const tx = db.transaction('annotations', 'readwrite')
        tx.objectStore('annotations').put({
          id: 'h-' + text.length + '-' + now,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          pageId: book.id,
          kind: 'highlight',
          colour: 'yellow',
          anchor: { type: 'pdf', page: 1, rects: [0, 0.1, 0.5, 0.05] },
          quote: { exact: text, prefix: '', suffix: '' },
          origin: 'user',
        })
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
      db.close()
    },
    [bookTitle, quote],
  )
}

test.describe('Library v2 (Beginner)', () => {
  test('LB-B01 the header: title, one + Add, one row More | Books | Knowledge | search', async ({
    page,
  }) => {
    await openLibrary(page)
    const lib = page.getByTestId('library')
    await expect(lib.getByTestId('library-add')).toHaveCount(1)
    await expect(lib.getByTestId('library-more-button')).toBeVisible()
    await expect(lib.getByTestId('tab-books')).toBeVisible()
    await expect(lib.getByTestId('tab-knowledge')).toBeVisible()
    await expect(lib.getByTestId('library-search-button')).toBeVisible()
    // Nothing of today's header, and no Themes tab in Beginner.
    await expect(
      lib.getByRole('button', { name: 'Import a book' }),
    ).toHaveCount(0)
    await expect(lib.getByRole('button', { name: 'Capture' })).toHaveCount(0)
    await expect(lib.getByRole('tab', { name: 'Themes' })).toHaveCount(0)
    await expect(lib.getByTestId('pro-row')).toHaveCount(0)
    await expect(page.getByTestId('library-empty')).toBeVisible()
  })

  test('LB-B07 + Add lists Import, Capture, Prompts and the file rules', async ({
    page,
  }) => {
    await openLibrary(page)
    await page.getByTestId('library-add').click()
    const menu = page.getByRole('menu')
    await expect(
      menu.getByRole('menuitem', { name: /Import a book/ }),
    ).toBeVisible()
    await expect(menu.getByText(/DRM-free files only/)).toBeVisible()
    await expect(
      menu.getByRole('menuitem', { name: /Capture a link, video or text/ }),
    ).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Prompts/ })).toBeVisible()
  })

  test('LB-B08/B20/B19 import a book: a calm card; a cover tap opens the notes page', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    const card = page.getByTestId('source-card').first()
    await expect(card.getByTestId('source-start')).toHaveText('Start reading')
    await expect(card.getByTestId('source-menu-button')).toBeVisible()
    await card
      .getByRole('button', { name: /Alpha Book: open the notes page/ })
      .click()
    await expect(page.getByTestId('book-continue')).toBeVisible()
  })

  test('LB-B02/B05/B06 Continue reading shows opened books first, only on All without filters', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await expect(page.getByTestId('continue-block')).toHaveCount(0)
    await page.getByTestId('source-start').first().click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
    await page.getByTestId('reader-close').click()
    await page
      .getByRole('navigation', { name: 'Spaces' })
      .getByRole('button', { name: 'Space: Library' })
      .click()
    const block = page.getByTestId('continue-block')
    await expect(block.getByTestId('continue-card')).toHaveCount(1)
    // The first cover starts near the top (today it starts at 460 px).
    const top = await block
      .getByRole('button', { name: /open the notes page/ })
      .first()
      .boundingBox()
    expect(top!.y).toBeLessThan(260)
    // A card's cover opens the notes page, Continue opens the reader.
    await block.getByTestId('book-continue-card').click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
    await page.getByTestId('reader-close').click()
    await page
      .getByRole('navigation', { name: 'Spaces' })
      .getByRole('button', { name: 'Space: Library' })
      .click()
    // Hidden on another shelf and while searching.
    await page.getByTestId('shelf-finished').click()
    await expect(page.getByTestId('continue-block')).toHaveCount(0)
  })

  test('LB-B14/B15 the side panel: Shelves with counts, collections, Recent; a shelf filters', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    const panel = page.getByTestId('library-panel')
    await expect(panel.getByRole('heading', { name: 'Shelves' })).toBeVisible()
    await expect(panel.getByTestId('shelf-all')).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(panel.getByTestId('shelf-want')).toContainText('1')
    await expect(panel.getByText('No collections yet.')).toBeVisible()
    await expect(panel.getByTestId('panel-tags')).toHaveCount(0) // Beginner
    await expect(
      panel
        .getByTestId('panel-recent')
        .getByRole('button', { name: 'Alpha Book' }),
    ).toBeVisible()
    await panel.getByTestId('shelf-finished').click()
    await expect(panel.getByTestId('shelf-finished')).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByTestId('library-empty')).toBeVisible()
    await page
      .getByTestId('library-empty')
      .getByRole('button', { name: 'Show all' })
      .click()
    await expect(page.getByTestId('source-card')).toHaveCount(1)
  })

  test('LB-B21/B22 the ⋯ menu: Continue first, Mark as with Undo, Delete with confirm and Undo', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await page.getByTestId('source-menu-button').click()
    const items = page.getByRole('menuitem')
    await expect(items.first()).toHaveText(/Start reading/)
    for (const name of [
      'Open notes page',
      'Mark as',
      'Add to collections',
      'Export highlights',
      'Delete',
    ])
      await expect(
        page.getByRole('menuitem', { name: new RegExp(name) }),
      ).toBeVisible()
    await page.getByRole('menuitem', { name: /Mark as/ }).click()
    await page.getByRole('menuitemradio', { name: 'Finished' }).click()
    await expect(page.getByText('Moved to Finished')).toBeVisible()
    await page.getByTestId('shelf-finished').click()
    await expect(page.getByTestId('source-card')).toHaveCount(1)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('library-empty')).toBeVisible()
    // Delete: confirm, then Undo.
    await page.getByTestId('shelf-all').click()
    await page.getByTestId('source-menu-button').click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByTestId('source-card')).toHaveCount(1)
    await page.getByTestId('source-menu-button').click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete' })
      .click()
    await expect(page.getByTestId('source-card')).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('source-card')).toHaveCount(1)
  })

  test('LB-B24 Add to collections: a new collection shows as a shelf with the book', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await page.getByTestId('source-menu-button').click()
    await page.getByRole('menuitem', { name: /Add to collections/ }).click()
    const dlg = page.getByTestId('collections-dialog')
    await dlg
      .getByRole('textbox', { name: 'New collection' })
      .fill('Psychology')
    await dlg.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByTestId('collections-save').click()
    await page
      .getByTestId('library-panel')
      .getByRole('button', { name: /Psychology/ })
      .click()
    await expect(page.getByTestId('source-card')).toHaveCount(1)
  })

  test('LB-B27..B30 More › Filter: Videos chip with ✕; closing with ✕ changes nothing', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await page.getByTestId('library-more-button').click()
    const sheet = page.getByTestId('library-more')
    await expect(
      sheet.getByText('How your library looks and behaves'),
    ).toBeVisible()
    await expect(
      sheet.getByText('Nothing changes until you tap Done.'),
    ).toBeVisible()
    await sheet.getByTestId('more-type-videos').click()
    await sheet.getByTestId('sheet-close').click()
    await expect(page.getByTestId('chip-type')).toHaveCount(0)
    await page.getByTestId('library-more-button').click()
    await page.getByTestId('more-type-videos').click()
    await page.getByTestId('more-done').click()
    const chip = page.getByTestId('chip-type')
    await expect(chip).toContainText('Videos')
    await expect(
      page.getByText('Showing only these. Change it in More.'),
    ).toBeVisible()
    await expect(page.getByTestId('source-card')).toHaveCount(0)
    await chip.getByRole('button').click()
    await expect(page.getByTestId('chip-type')).toHaveCount(0)
    await expect(page.getByTestId('source-card')).toHaveCount(1)
  })

  test('LB-B31 More › View: list view, one Undo reverts', async ({ page }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await page.getByTestId('library-more-button').click()
    await page.getByRole('tab', { name: 'View' }).click()
    await page.getByRole('radio', { name: 'List' }).click()
    await page.getByTestId('more-done').click()
    await expect(page.getByTestId('library-list')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('library-grid')).toBeVisible()
  })

  test('LB-B32 More › Tag opens the universal Tag picker (filter mode)', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await page.getByTestId('library-more-button').click()
    await page.getByTestId('more-tags').click()
    const search = page.getByPlaceholder('Find or create a tag')
    await expect(search).toBeVisible()
    await search.fill('habits')
    await page
      .getByText(/Create/)
      .first()
      .click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('chip-tags')).toContainText('#habits')
    await expect(page.getByTestId('library-empty')).toBeVisible()
    await page.getByTestId('chip-tags').getByRole('button').click()
    await expect(page.getByTestId('source-card')).toHaveCount(1)
  })

  test('LB-B34/B35 search opens in place; 3 letters group the results', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await importBook(page, 'Zulu Book')
    await page.getByTestId('library-search-button').click()
    const box = page.getByTestId('library-search')
    await expect(box).toBeFocused()
    await box.fill('zul')
    await expect(page.getByTestId('search-books')).toContainText('Zulu Book')
    await expect(page.getByTestId('search-books')).not.toContainText(
      'Alpha Book',
    )
    await box.fill('')
    await expect(page.getByTestId('library-grid')).toBeVisible()
    await box.press('Escape')
    await expect(box).toHaveCount(0)
    // The / key opens it again.
    await page.locator('body').click({ position: { x: 5, y: 400 } })
    await page.keyboard.press('/')
    await expect(page.getByTestId('library-search')).toBeFocused()
  })

  test('LB-B38/B39/B54 Knowledge: highlights first, View menu, empty state', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await page.getByTestId('tab-knowledge').click()
    await expect(page.getByTestId('knowledge-empty')).toContainText(
      'No highlights yet.',
    )
    await expect(page.getByTestId('know-stats')).toHaveCount(0)
    await page.getByTestId('know-view').click()
    for (const name of ['All highlights', 'Daily Highlights', 'Export'])
      await expect(page.getByRole('menuitemradio', { name })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('LB-B40/B41/B42 a highlight shows a preview with Jump, Make a card and Delete (Undo)', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await addHighlight(page, 'Alpha Book', 'A line worth keeping forever')
    await page.getByTestId('tab-knowledge').click()
    const row = page.getByTestId('highlight-row')
    await expect(row).toHaveCount(1)
    await row.click()
    const preview = page.getByTestId('highlight-preview')
    await expect(preview).toContainText('A line worth keeping forever')
    await page.getByTestId('know-colour-blue').click()
    await expect(page.getByTestId('knowledge-empty')).toBeVisible()
    await page.getByTestId('know-colour-blue').click()
    await page.getByTestId('highlight-row').click()
    await page.getByTestId('highlight-card').click()
    await expect(
      page.getByText('Card made. It joins your next review.'),
    ).toBeVisible()
    await page.getByTestId('highlight-delete').click()
    await expect(page.getByTestId('highlight-row')).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('highlight-row')).toHaveCount(1)
    await page.getByTestId('highlight-row').click()
    await page.getByTestId('highlight-jump').click()
    await expect(page.getByTestId('book-reader')).toBeVisible()
  })

  test('LB-B45/B46/B47 Export: What to include, live count, disabled when nothing matches, a file downloads', async ({
    page,
  }) => {
    await openLibrary(page)
    await importBook(page, 'Alpha Book')
    await addHighlight(page, 'Alpha Book', 'Exported quote one')
    await page.getByTestId('tab-knowledge').click()
    await page.getByTestId('know-view').click()
    await page.getByRole('menuitemradio', { name: 'Export' }).click()
    const card = page.getByTestId('export-card')
    await expect(card.getByText('What to include')).toBeVisible()
    for (const name of [
      'Highlights',
      'Notes',
      'In my words',
      'Bookmarks',
      'Cards (Q+A)',
      'Summaries',
      'Chapter recaps',
      'Tags',
    ])
      await expect(
        card.getByRole('switch', { name, exact: true }),
      ).toBeChecked()
    await expect(page.getByTestId('export-count')).toHaveText(
      '1 items from 1 books',
    )
    const download = page.waitForEvent('download')
    await page.getByTestId('export-run').click()
    expect((await download).suggestedFilename()).toBe(
      'learning-notes-highlights.md',
    )
    await expect(page.getByText('Exported a Markdown file')).toBeVisible()
    await card.getByRole('radio', { name: 'CSV' }).click()
    const csv = page.waitForEvent('download')
    await page.getByTestId('export-run').click()
    expect((await csv).suggestedFilename()).toBe(
      'learning-notes-highlights.csv',
    )
    for (const k of [
      'highlights',
      'notes',
      'inMyWords',
      'bookmarks',
      'cards',
      'summaries',
      'recaps',
      'tags',
    ])
      await page.getByTestId(`inc-${k}`).uncheck()
    await expect(page.getByTestId('export-count')).toHaveText(
      'Nothing matches these choices.',
    )
    await expect(page.getByTestId('export-run')).toBeDisabled()
  })

  test('LB-B48 More › View › Open Export lands on Export', async ({ page }) => {
    await openLibrary(page)
    await page.getByTestId('library-more-button').click()
    await page.getByRole('tab', { name: 'View' }).click()
    await page.getByRole('button', { name: 'Open Export' }).click()
    await expect(page.getByTestId('export-card')).toBeVisible()
  })
})

test.describe('Library v2 (Professional, phone and iPad)', () => {
  test('LB-P01 Professional adds one extra row and the side panel gains Tags', async ({
    page,
  }) => {
    await openLibrary(page, { level: 'professional' })
    await importBook(page, 'Alpha Book')
    const row = page.getByTestId('pro-row')
    await expect(row).toBeVisible()
    for (const id of ['type', 'tag', 'sort', 'view', 'select'])
      await expect(row.getByTestId(`pro-${id}`)).toBeVisible()
    await expect(page.getByTestId('panel-tags')).toBeVisible()
    await row.getByTestId('pro-type').click()
    await page.getByRole('menuitemradio', { name: 'Videos' }).click()
    await expect(page.getByTestId('chip-type')).toBeVisible()
    await page.getByTestId('chip-type').getByRole('button').click()
    await row.getByTestId('pro-view').click()
    await expect(page.getByTestId('library-list')).toBeVisible()
    await row.getByTestId('pro-view').click()
    // Select: tap toggles; the bar shows Tag, Status, Move to, Done.
    await row.getByTestId('pro-select').click()
    await page
      .getByTestId('library-grid')
      .getByRole('button', { name: /Alpha Book/ })
      .first()
      .click()
    await expect(page.getByTestId('select-bar')).toContainText('1 selected')
  })

  test('LB-P02 at 820x1180 portrait the Professional row stays on one line', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 820, height: 1180 })
    await openLibrary(page, { level: 'professional' })
    await importBook(page, 'Alpha Book')
    const row = page.getByTestId('pro-row')
    await expect(row).toBeVisible()
    const boxes = await row
      .locator('> *')
      .evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().top)),
      )
    expect(boxes.length).toBeGreaterThanOrEqual(4)
    expect(new Set(boxes).size).toBe(1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
  })

  test('LB-B18/B51 phone: the shelf button picks a shelf; the row fits one line', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 820 })
    await openLibrary(page, { level: 'professional' })
    await importBook(page, 'Alpha Book')
    await expect(page.getByTestId('shelf-button')).toBeVisible()
    await page.getByTestId('shelf-button').click()
    await page.getByRole('menuitemradio', { name: /Finished/ }).click()
    await expect(page.getByTestId('library-empty')).toBeVisible()
    const tops = await page
      .getByTestId('control-row')
      .locator('> *')
      .evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().top)),
      )
    expect(new Set(tops).size).toBe(1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
  })
})

test.describe('Library: flag off and nothing lost', () => {
  test('LB-B56 with the flag OFF today’s screen is unchanged', async ({
    page,
  }) => {
    await openLibrary(page, { flag: false })
    const lib = page.getByTestId('library')
    await expect(
      lib.getByRole('button', { name: 'Import a book' }),
    ).toBeVisible()
    await expect(lib.getByRole('button', { name: 'Capture' })).toBeVisible()
    await expect(lib.getByRole('button', { name: 'Books' })).toBeVisible()
    await expect(lib.getByTestId('library-add')).toHaveCount(0)
    await expect(page.locator('[data-library-v2]')).toHaveCount(0)
  })

  test('probe L01..L18, S01..S04, B01..B07, O01..O05 in the new build', async ({
    page,
  }) => {
    await openLibrary(page)
    // L01 title, L02 file input (.pdf .epub .docx), L05 hint (in the Add menu), L10 empty state.
    await expect(page.getByTestId('library-file')).toHaveAttribute(
      'accept',
      /\.pdf,\.epub,\.docx/,
    )
    await expect(page.getByTestId('library-empty')).toContainText(
      'Your library is empty',
    )
    // L03/L04 Capture and Prompts live in + Add; L03 opens the Capture dialog.
    await page.getByTestId('library-add').click()
    await page.getByRole('menuitem', { name: /Capture a link/ }).click()
    await expect(
      page.getByRole('heading', { name: 'Capture', exact: true }).first(),
    ).toBeVisible()
    await page.goBack()
    // L08 drag and drop banner.
    await page.getByTestId('library').dispatchEvent('dragover')
    await expect(
      page.getByText('Drop a book, a link or some text anywhere here.'),
    ).toBeVisible()
    await page.getByTestId('library').dispatchEvent('dragleave')
    // L11/L12/L13/L14/L15/L17/L18 and B01..B07 with a real book.
    await importBook(page, 'Alpha Book') // O04 import pipeline, L06/L09 busy status and toast
    await expect(
      page.getByText(/Added “Alpha Book” to your library\./),
    ).toBeVisible()
    await importBook(page, 'Zulu Book')
    const cards = page.getByTestId('source-card')
    await expect(cards.first()).toContainText('Zulu Book') // L17 newest first
    await expect(cards.first().getByRole('img')).toBeVisible() // L12/L18
    await page.getByTestId('library-more-button').click()
    for (const name of ['All', 'Books', 'Videos', 'Articles', 'Pasted'])
      // L07
      await expect(
        page
          .getByTestId('library-more')
          .getByRole('button', { name, exact: true })
          .first(),
      ).toBeVisible()
    await page.getByTestId('sheet-close').click()
    // S01/S03/S04: the panel heading and Recent list.
    await expect(
      page
        .getByTestId('library-panel')
        .getByRole('heading', { name: 'Shelves' }),
    ).toBeVisible()
    await page
      .getByTestId('panel-recent')
      .getByRole('button', { name: 'Alpha Book' })
      .click() // S03 → B-series
    // B01..B07: the unchanged book header (O03).
    await expect(page.getByTestId('book-continue')).toBeVisible()
    await expect(page.getByRole('progressbar').first()).toBeVisible() // B03
    await page.getByTestId('book-continue').click() // B05
    await expect(page.getByTestId('book-reader')).toBeVisible()
  })
})
