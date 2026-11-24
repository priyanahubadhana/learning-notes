import { expect, test, type Page } from '@playwright/test'
import {
  dbTitles,
  drawnTitles,
  openById,
  openPanel,
  panel,
  row,
  rows,
  seedNotebook,
  start,
  tabButton,
  type Level,
  type SeedPage,
} from './notebooksV2PanelHelpers.ts'

/**
 * Left panel v2 (slice 4, flag notebooks.v2): NB-B40 .. NB-B52 and the
 * Professional lines NB-P40 .. NB-P42 (and Move up / down, `nb.move`). One
 * test per line. A Professional line turns on only its own switch for a
 * Beginner. Pages are written straight into the database; the checks click.
 */

const BOOK = 'Panel book'
const FIRST = 'Page 01'

const named = (n: number): SeedPage[] =>
  Array.from({ length: n }, (_, i) => ({
    title: `Page ${String(i + 2).padStart(2, '0')}`,
    lines: [
      `Line one of ${i + 2}`,
      `Line two of ${i + 2}`,
      `Line three of ${i + 2}`,
    ],
  }))

/** A notebook with `n` pages in all, the first page open and the panel shown. */
async function ready(
  page: Page,
  n = 6,
  opts: { level?: Level; unlocked?: string[]; extra?: SeedPage[] } = {},
) {
  await start(page, opts)
  const ids = await seedNotebook(page, BOOK, FIRST, [
    ...named(n - 1),
    ...(opts.extra ?? []),
  ])
  await openById(page, ids[FIRST])
  await openPanel(page)
  await expect(rows(page).first()).toBeVisible()
  return ids
}

const toast = (page: Page, text: string | RegExp) =>
  page.locator('[data-toast]').getByText(text)
const toastUndo = (page: Page) =>
  page.locator('[data-toast]').getByRole('button', { name: 'Undo' })
const bar = (page: Page) => page.getByTestId('object-bar')

/** A Beginner's strip keeps Delete and More actions; the rest is in that list. */
async function openMoreList(page: Page) {
  await page
    .getByTestId('lpv2-strip')
    .getByRole('menuitem', { name: 'More actions' })
    .click()
  const all = page.getByRole('option', { name: 'Show all' })
  if (await all.isVisible()) await all.click()
}

test('NB-B40 the panel is 264 px wide with the tabs Pages, Outline, Resources in the shared Tab row (no Audio tab)', async ({
  page,
}) => {
  await ready(page)
  const box = await panel(page).boundingBox()
  expect(Math.round(box?.width ?? 0)).toBe(264)
  const tabs = panel(page).getByTestId('tabrow')
  await expect(tabs).toBeVisible()
  await expect(panel(page).getByRole('tab')).toHaveText([
    'Pages',
    'Outline',
    'Resources',
  ])
  await expect(tabButton(page, 'Audio')).toHaveCount(0)
  await expect(panel(page).getByTestId('tabrow-plus')).toBeVisible()
})

test('NB-B41 Pages: thumbnails with title, three lines and number; the open page is highlighted and centred; a tap opens; a lock shows', async ({
  page,
}) => {
  const ids = await ready(page, 40, {
    extra: [{ title: 'Secret page', lines: ['hidden words'], locked: true }],
  })
  await openById(page, ids['Page 21'])
  await openPanel(page)
  const open = panel(page).locator(
    '[data-testid="lpv2-page"][aria-current="page"]',
  )
  await expect(open).toContainText('Page 21')
  await expect(open).toContainText('Line one of 21')
  await expect(open).toContainText('Line three of 21')
  // Centred: the highlighted row sits near the middle of the scroll area.
  const scroll = panel(page).getByTestId('lpv2-pages-scroll')
  const s = (await scroll.boundingBox())!
  const r = (await open.boundingBox())!
  expect(Math.abs(r.y + r.height / 2 - (s.y + s.height / 2))).toBeLessThan(
    s.height / 4,
  )
  // The page number.
  await expect(open.locator('.lpv2-th')).toHaveText('21')
  // A tap opens another page.
  await row(page, 'Page 22').click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Page 22',
  )
  // A locked page shows a lock and none of its words.
  await scroll.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  const locked = row(page, 'Secret page')
  await expect(locked).toContainText('Locked')
  await expect(locked).not.toContainText('hidden words')
})

test('NB-B41 more than 200 pages: the first 200, then a Show more button', async ({
  page,
}) => {
  await ready(page, 230)
  const scroll = panel(page).getByTestId('lpv2-pages-scroll')
  await scroll.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  const more = panel(page).getByTestId('lpv2-more')
  await expect(more).toHaveText('Show 30 more pages')
  await expect(row(page, 'Page 200')).toBeVisible()
  await more.click()
  await expect(more).toHaveCount(0)
  await scroll.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await expect(row(page, 'Page 230')).toBeVisible()
})

test('NB-B41 scale: 2,000 pages keep only about a screenful of rows in the page', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await ready(page, 2000)
  expect(await rows(page).count()).toBeLessThan(40)
  const scroll = panel(page).getByTestId('lpv2-pages-scroll')
  await scroll.evaluate((el) => el.scrollTo(0, 5000))
  await expect(rows(page).first()).toBeVisible()
  expect(await rows(page).count()).toBeLessThan(40)
  const outline = tabButton(page, 'Outline')
  await outline.click()
  const list = panel(page).getByTestId('lpv2-outline')
  await expect(list).toBeVisible()
  expect(await list.locator('li').count()).toBeLessThan(40)
})

test('NB-B42 Organise starts a pick mode with the Object bar: Move earlier, Move later, Duplicate, Extract, Pick all, Undo, Delete', async ({
  page,
}) => {
  await ready(page)
  await panel(page).getByTestId('lpv2-organise').click()
  await expect(bar(page)).toBeVisible()
  for (const name of [
    'Move earlier',
    'Move later',
    'Duplicate',
    'Extract…',
    'Pick all',
    'Undo',
    'Delete',
  ])
    await expect(bar(page).getByRole('button', { name })).toBeVisible()
  await row(page, 'Page 02').click()
  await row(page, 'Page 03').click()
  await expect(panel(page).getByText('2 pages picked')).toBeVisible()
  await row(page, 'Page 02').click()
  await expect(panel(page).getByText('1 page picked')).toBeVisible()
  await bar(page).getByRole('button', { name: 'Pick all' }).click()
  await expect(panel(page).getByText('6 pages picked')).toBeVisible()
  await bar(page).getByRole('button', { name: 'Pick none' }).click()
  await expect(panel(page).getByText('0 pages picked')).toBeVisible()
  // Move later / earlier act on the picked pages, and Undo puts them back.
  await row(page, 'Page 03').click()
  await bar(page).getByRole('button', { name: 'Move later' }).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 04', 'Page 03', 'Page 05', 'Page 06'])
  await bar(page).getByRole('button', { name: 'Undo' }).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 03', 'Page 04', 'Page 05', 'Page 06'])
  await panel(page).getByTestId('lpv2-organise').click()
  await expect(bar(page)).toHaveCount(0)
})

test('NB-B43 drag a thumbnail with the mouse: a drop-line shows the place, the drop saves, an Undo toast puts it back', async ({
  page,
}) => {
  await ready(page)
  const from = (await row(page, 'Page 02').boundingBox())!
  const to = (await row(page, 'Page 05').boundingBox())!
  await page.mouse.move(from.x + 60, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 60, from.y + from.height / 2 + 12, {
    steps: 3,
  })
  await page.mouse.move(to.x + 60, to.y + to.height / 2 + 10, { steps: 8 })
  await expect(page.getByTestId('drop-line')).toBeVisible()
  await page.mouse.up()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 03', 'Page 04', 'Page 05', 'Page 02', 'Page 06'])
  await expect(toast(page, 'Page order changed')).toBeVisible()
  await toastUndo(page).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 03', 'Page 04', 'Page 05', 'Page 06'])
})

test('NB-B43 Alt + arrow keys move a focused thumbnail', async ({ page }) => {
  await ready(page)
  await row(page, 'Page 03').locator('xpath=..').focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 04', 'Page 03', 'Page 05', 'Page 06'])
  await expect(toast(page, 'Page order changed')).toBeVisible()
})

test('NB-B44 Delete sends the picked pages to Trash with an Undo toast; a notebook never loses its last page', async ({
  page,
}) => {
  await ready(page, 4)
  await panel(page).getByTestId('lpv2-organise').click()
  await row(page, 'Page 02').click()
  await row(page, 'Page 03').click()
  await bar(page).getByRole('button', { name: 'Delete' }).click()
  await expect(toast(page, 'Moved 2 pages to Trash')).toBeVisible()
  await expect.poll(() => dbTitles(page, BOOK)).toEqual(['Page 01', 'Page 04'])
  await toastUndo(page).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 03', 'Page 04'])
  // All of them: refused.
  await bar(page).getByRole('button', { name: 'Pick all' }).click()
  await bar(page).getByRole('button', { name: 'Delete' }).click()
  await expect(toast(page, 'A notebook needs at least one page')).toBeVisible()
  await expect.poll(() => dbTitles(page, BOOK)).toHaveLength(4)
})

test('NB-B44 deleting the open page opens a neighbour', async ({ page }) => {
  await ready(page, 3)
  await panel(page).getByTestId('lpv2-organise').click()
  await row(page, 'Page 01').click()
  await bar(page).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Page 02',
  )
})

test('NB-B45 Duplicate puts "X copy" right after each original, with an Undo toast', async ({
  page,
}) => {
  await ready(page, 4)
  await panel(page).getByTestId('lpv2-organise').click()
  await row(page, 'Page 02').click()
  await row(page, 'Page 04').click()
  await bar(page).getByRole('button', { name: 'Duplicate' }).click()
  await expect(toast(page, 'Copied 2 pages')).toBeVisible()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual([
      'Page 01',
      'Page 02',
      'Page 02 copy',
      'Page 03',
      'Page 04',
      'Page 04 copy',
    ])
  await toastUndo(page).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 03', 'Page 04'])
})

test('NB-B46 Extract asks for a name and a notebook, moves the pages, and the toast has Undo', async ({
  page,
}) => {
  await ready(page, 4)
  await panel(page).getByTestId('lpv2-organise').click()
  await row(page, 'Page 03').click()
  await bar(page).getByRole('button', { name: 'Extract…' }).click()
  const dialog = page.getByTestId('lpv2-extract-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('lpv2-extract-where')).toBeVisible()
  await dialog.getByTestId('lpv2-extract-name').fill('Split book')
  await dialog.getByTestId('fb-dialog-main').click()
  await expect(toast(page, 'Moved 1 page to Split book')).toBeVisible()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 04'])
  await expect.poll(() => dbTitles(page, 'Split book')).toEqual(['Page 03'])
  await toastUndo(page).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 02', 'Page 03', 'Page 04'])
})

test('NB-B46 Extract into an existing notebook; a locked notebook is refused', async ({
  page,
}) => {
  await ready(page, 3)
  const other = await page.evaluate(async () => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const all = await new Promise<Record<string, unknown>[]>((res) => {
      const r = db.transaction('notebooks').objectStore('notebooks').getAll()
      r.onsuccess = () => res(r.result)
    })
    const seed = all.find((n) => n.title === 'Panel book')!
    await new Promise<void>((res) => {
      const tx = db.transaction('notebooks', 'readwrite')
      tx.objectStore('notebooks').put({
        ...seed,
        id: 'locked-nb',
        title: 'Locked book',
        order: 'zz',
        locked: true,
      })
      tx.objectStore('notebooks').put({
        ...seed,
        id: 'open-nb',
        title: 'Open book',
        order: 'zy',
        locked: undefined,
      })
      tx.oncomplete = () => res()
    })
    db.close()
    return true
  })
  expect(other).toBe(true)
  await page.reload()
  await openPanel(page)
  await panel(page).getByTestId('lpv2-organise').click()
  await row(page, 'Page 03').click()
  await bar(page).getByRole('button', { name: 'Extract…' }).click()
  const dialog = page.getByTestId('lpv2-extract-dialog')
  await dialog
    .getByTestId('lpv2-extract-where')
    .selectOption({ label: 'Locked book' })
  await dialog.getByTestId('fb-dialog-main').click()
  await expect(toast(page, /locked/)).toBeVisible()
  await expect.poll(() => dbTitles(page, BOOK)).toHaveLength(3)
  await bar(page).getByRole('button', { name: 'Extract…' }).click()
  await dialog
    .getByTestId('lpv2-extract-where')
    .selectOption({ label: 'Open book' })
  await dialog.getByTestId('fb-dialog-main').click()
  await expect.poll(() => dbTitles(page, 'Open book')).toEqual(['Page 03'])
})

test('NB-B47 the Page button adds a blank page after the current one and opens it', async ({
  page,
}) => {
  await ready(page, 3)
  await panel(page).getByTestId('lpv2-add-page').click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', '', 'Page 02', 'Page 03'])
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    '',
  )
})

const OUTLINE_PAGES: SeedPage[] = [
  {
    title: 'Biology',
    lines: ['cells'],
    heads: [
      [1, 'Cells'],
      [2, 'Membrane'],
      [3, 'Pores'],
    ],
  },
  { title: 'Chemistry', heads: [[1, 'Atoms']] },
]

test('NB-B48 Outline: the whole notebook; other pages fold to one line; the current heading is highlighted; Find has a ✕', async ({
  page,
}) => {
  const ids = await ready(page, 1, { extra: OUTLINE_PAGES })
  await openById(page, ids['Biology'])
  await openPanel(page)
  await tabButton(page, 'Outline').click()
  const lines = panel(page).getByTestId('lpv2-outline-line')
  await expect(lines.filter({ hasText: 'Biology' })).toBeVisible()
  await expect(lines.filter({ hasText: 'Chemistry' })).toBeVisible()
  await expect(lines.filter({ hasText: 'Membrane' })).toBeVisible()
  // Other pages are one line each.
  await expect(lines.filter({ hasText: 'Atoms' })).toHaveCount(0)
  await expect(
    panel(page).locator('[data-kind="page"] [aria-expanded="false"]'),
  ).toHaveCount(2)
  // Find has a ✕ and keeps matching lines.
  const find = panel(page).getByTestId('lpv2-outline-find')
  await find.fill('atom')
  await expect(lines.filter({ hasText: 'Atoms' })).toBeVisible()
  await expect(lines.filter({ hasText: 'Membrane' })).toHaveCount(0)
  await panel(page)
    .getByRole('button', { name: 'Clear Find a heading' })
    .click()
  await expect(find).toHaveValue('')
  await expect(lines.filter({ hasText: 'Membrane' })).toBeVisible()
  // The heading at the top of the page being read is the highlighted line.
  await expect(panel(page).locator('[data-current]')).toHaveCount(1)
  // Collapse all / Expand all.
  await panel(page).getByTestId('lpv2-fold-all').click()
  await expect(lines.filter({ hasText: 'Membrane' })).toHaveCount(0)
  await panel(page).getByTestId('lpv2-fold-all').click()
  await expect(lines.filter({ hasText: 'Atoms' })).toBeVisible()
})

test('NB-B49 a heading in the Outline opens its page and glides to it', async ({
  page,
}) => {
  const ids = await ready(page, 1, {
    extra: [
      {
        title: 'Long page',
        lines: Array.from({ length: 60 }, (_, i) => `Filler line number ${i}`),
        heads: [[1, 'The far end']],
      },
    ],
  })
  void ids
  await tabButton(page, 'Outline').click()
  // Everything folds, then everything opens.
  await panel(page).getByTestId('lpv2-fold-all').click()
  await panel(page).getByTestId('lpv2-fold-all').click()
  await panel(page)
    .getByTestId('lpv2-outline-line')
    .filter({ hasText: 'The far end' })
    .click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Long page',
  )
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('[data-page-scroller]')?.scrollTop ?? 0,
      ),
    )
    .toBeGreaterThan(100)
})

const RES_PAGES: SeedPage[] = [
  {
    title: 'Sources',
    blocks: [
      {
        type: 'embed',
        content: {
          url: 'https://example.org/atlas',
          provider: 'link',
          caption: 'Atlas site',
        },
      },
      {
        type: 'callout',
        content: {
          text: [{ type: 'text', text: 'Mnemonic: Roy G Biv', styles: {} }],
          emoji: '💡',
        },
      },
      {
        type: 'quote',
        content: {
          text: [{ type: 'text', text: 'Smith (2020) Optics', styles: {} }],
        },
      },
    ],
  },
]

test('NB-B50 Resources: scope This page / Notebook, kind chips (with Audio), rows with ⋯ (Copy, Open its page), and the empty text', async ({
  page,
}) => {
  const ids = await ready(page, 1, { extra: RES_PAGES })
  await tabButton(page, 'Resources').click()
  const scope = panel(page).getByTestId('lpv2-scope')
  await expect(scope.getByRole('button')).toHaveText(['This page', 'Notebook'])
  await expect(
    panel(page).getByTestId('lpv2-kinds').getByRole('button'),
  ).toHaveText([
    'All',
    'Images',
    'Links',
    'References',
    'Notes',
    'Audio',
    'Files',
  ])
  // Nothing on the open page.
  await expect(panel(page).getByTestId('lpv2-res-empty')).toContainText(
    'Nothing here yet.',
  )
  await scope.getByRole('button', { name: 'Notebook' }).click()
  const res = panel(page).getByTestId('lpv2-resource')
  await expect(res).toHaveCount(3)
  await panel(page)
    .getByTestId('lpv2-kinds')
    .getByRole('button', { name: 'Links' })
    .click()
  await expect(res).toHaveCount(1)
  await expect(res).toContainText('Atlas site')
  await expect(res).toContainText('Sources')
  await res.getByRole('button', { name: /More for/ }).click()
  const menu = page.getByTestId('lpv2-res-menu')
  await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Open its page' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Sources',
  )
  expect(ids['Sources']).toBeTruthy()
})

test('NB-B51 the panel ✕ closes it and the choice is kept on this device', async ({
  page,
}) => {
  await ready(page)
  await panel(page).getByTestId('lpv2-close').click()
  await expect(panel(page)).toBeHidden()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeVisible()
  await expect(panel(page)).toBeHidden()
  await openPanel(page)
  await page.reload()
  await expect(panel(page)).toBeVisible()
})

test('NB-P40 nb.outlineLevels: Level 1, 1-2, All, Toggles, Numbers and a fold arrow per line, remembered per device', async ({
  page,
}) => {
  await start(page, { unlocked: ['nb.outlineLevels'] })
  const ids = await seedNotebook(page, BOOK, FIRST, [
    {
      title: 'Deep',
      heads: [
        [1, 'Alpha'],
        [2, 'Beta'],
        [3, 'Gamma'],
        [1, 'Delta'],
      ],
      blocks: [
        {
          type: 'toggleListItem',
          content: {
            text: [{ type: 'text', text: 'Hidden detail', styles: {} }],
          },
        },
      ],
    },
  ])
  await openById(page, ids['Deep'])
  await openPanel(page)
  await tabButton(page, 'Outline').click()
  const options = panel(page).getByTestId('lpv2-outline-options')
  await expect(options).toBeVisible()
  const lines = panel(page).getByTestId('lpv2-outline-line')
  await expect(lines.filter({ hasText: 'Gamma' })).toBeVisible()
  await options.getByTestId('lpv2-level-1').click()
  await expect(lines.filter({ hasText: 'Beta' })).toHaveCount(0)
  await expect(lines.filter({ hasText: 'Alpha' })).toBeVisible()
  await options.getByTestId('lpv2-level-2').click()
  await expect(lines.filter({ hasText: 'Beta' })).toBeVisible()
  await expect(lines.filter({ hasText: 'Gamma' })).toHaveCount(0)
  await options.getByTestId('lpv2-level-3').click()
  await options.getByTestId('lpv2-numbers').click()
  await expect(lines.filter({ hasText: 'Alpha' })).toContainText('1')
  await expect(lines.filter({ hasText: 'Gamma' })).toContainText('1.1.1')
  await options.getByTestId('lpv2-toggles').click()
  await expect(lines.filter({ hasText: 'Hidden detail' })).toBeVisible()
  // A fold arrow per line that has lines under it.
  const fold = panel(page).getByRole('button', { name: 'Fold Alpha' })
  await fold.click()
  await expect(lines.filter({ hasText: 'Beta' })).toHaveCount(0)
  await panel(page).getByRole('button', { name: 'Unfold Alpha' }).click()
  await expect(lines.filter({ hasText: 'Beta' })).toBeVisible()
  // Remembered per device.
  await options.getByTestId('lpv2-level-2').click()
  await page.reload()
  await openPanel(page)
  await tabButton(page, 'Outline').click()
  await expect(panel(page).getByTestId('lpv2-level-2')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(panel(page).getByTestId('lpv2-numbers')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('NB-P40 a Beginner has no level row and no fold arrows on headings', async ({
  page,
}) => {
  const ids = await ready(page, 1, { extra: OUTLINE_PAGES })
  await openById(page, ids['Biology'])
  await openPanel(page)
  await tabButton(page, 'Outline').click()
  await expect(panel(page).getByTestId('lpv2-outline-options')).toHaveCount(0)
  await expect(
    panel(page).locator('[data-kind="heading"] .lpv2-fold'),
  ).toHaveCount(0)
})

test('NB-P41 nb.resourceScope: the Everywhere scope shows; a Beginner has only This page and Notebook', async ({
  page,
}) => {
  await ready(page, 1, { unlocked: ['nb.resourceScope'], extra: RES_PAGES })
  await tabButton(page, 'Resources').click()
  const scope = panel(page).getByTestId('lpv2-scope')
  await expect(scope.getByRole('button')).toHaveText([
    'This page',
    'Notebook',
    'Everywhere',
  ])
  await scope.getByRole('button', { name: 'Everywhere' }).click()
  // The notebook's own three, and what other notebooks hold.
  await expect(panel(page).getByTestId('lpv2-resource').first()).toBeVisible()
  await expect
    .poll(() => panel(page).getByTestId('lpv2-resource').count())
    .toBeGreaterThanOrEqual(3)
  await panel(page).getByTestId('lpv2-res-find').fill('Atlas')
  await expect(panel(page).getByTestId('lpv2-resource')).toContainText(
    'Atlas site',
  )
})

test('NB-P42 nb.dragGrip: a grip on every thumbnail drags like NB-B43', async ({
  page,
}) => {
  await ready(page, 6, { unlocked: ['nb.dragGrip'] })
  await expect(panel(page).getByTestId('lpv2-grip')).toHaveCount(
    await rows(page).count(),
  )
  const grip = row(page, 'Page 02').getByTestId('lpv2-grip')
  const g = (await grip.boundingBox())!
  const to = (await row(page, 'Page 05').boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 10, {
    steps: 3,
  })
  await page.mouse.move(g.x + g.width / 2, to.y + to.height / 2 + 10, {
    steps: 8,
  })
  await page.mouse.up()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 03', 'Page 04', 'Page 05', 'Page 02', 'Page 06'])
})

test('a Beginner has no grip', async ({ page }) => {
  await ready(page)
  await expect(panel(page).getByTestId('lpv2-grip')).toHaveCount(0)
})

test('the Context strip: right-click on a thumbnail; Beginner keeps Delete, other items sit in More actions', async ({
  page,
}) => {
  await ready(page)
  await row(page, 'Page 03').click({ button: 'right' })
  const strip = page.getByTestId('lpv2-strip')
  await expect(strip).toBeVisible()
  await expect(strip.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
  await expect(strip.getByRole('menuitem', { name: 'Move up' })).toHaveCount(0)
  await openMoreList(page)
  await expect(page.getByRole('option', { name: 'Duplicate' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Move up' })).toHaveCount(0)
  await page.getByRole('option', { name: 'Duplicate' }).click()
  await expect.poll(() => dbTitles(page, BOOK)).toContain('Page 03 copy')
})

test('nb.move: Move up and Move down appear in the strip and move the page', async ({
  page,
}) => {
  await ready(page, 6, { unlocked: ['nb.move'] })
  await row(page, 'Page 03').click({ button: 'right' })
  await openMoreList(page)
  await page.getByRole('option', { name: 'Move up' }).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Page 03', 'Page 02', 'Page 04', 'Page 05', 'Page 06'])
})

test('sub-pages list under their page and move with it', async ({ page }) => {
  await ready(page, 1, {
    extra: [
      { title: 'Parent A' },
      { title: 'Child A1', parent: 'Parent A' },
      { title: 'Parent B' },
    ],
  })
  expect(await drawnTitles(page)).toEqual([
    'Page 01',
    'Parent A',
    'Child A1',
    'Parent B',
  ])
  await panel(page).getByTestId('lpv2-organise').click()
  await row(page, 'Parent A').click()
  await bar(page).getByRole('button', { name: 'Move later' }).click()
  await expect
    .poll(() => dbTitles(page, BOOK))
    .toEqual(['Page 01', 'Parent B', 'Parent A', 'Child A1'])
})

test('a panel with a Pencil press: the Pencil never opens the strip or drags a row', async ({
  page,
}) => {
  await ready(page)
  const target = row(page, 'Page 03')
  const box = (await target.boundingBox())!
  await page.evaluate(
    async ([x, y]) => {
      const el = document.elementFromPoint(x, y)!
      const init = (px: number) => ({
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 9,
        pointerType: 'pen',
        isPrimary: true,
        clientX: px,
        clientY: y,
        button: 0,
        buttons: 1,
      })
      el.dispatchEvent(new PointerEvent('pointerdown', init(x)))
      await new Promise((r) => setTimeout(r, 700))
      el.dispatchEvent(new PointerEvent('pointermove', init(x + 2)))
      el.dispatchEvent(
        new PointerEvent('pointerup', { ...init(x + 2), buttons: 0 }),
      )
    },
    [box.x + 90, box.y + box.height / 2] as const,
  )
  await expect(page.getByTestId('lpv2-strip')).toHaveCount(0)
  await expect(page.getByTestId('drop-line')).toHaveCount(0)
})
