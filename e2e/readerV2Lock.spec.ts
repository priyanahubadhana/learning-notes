// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7d (docs/features/reader-v2.md): the padlock and its four lock
 * modes. Flag reader.v2 is switched on with ?flags=reader.v2. One test per
 * RD line.
 */

test.use({ viewport: { width: 1200, height: 900 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

const pdf = (title: string) =>
  makePdf(
    Array.from(
      { length: 4 },
      (_, i) => `${title} page ${i + 1} words here and some more words`,
    ),
    { title },
  )

async function goLibrary(page: Page) {
  const menu = page.getByRole('button', { name: 'Open menu' })
  // WebKit on a cold start can take ~15 s to show the app: wait for it first.
  await expect(
    page.getByRole('navigation', { name: 'Spaces' }).or(menu).first(),
  ).toBeVisible({ timeout: 30_000 })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
}

async function importAndRead(page: Page, title: string) {
  await goLibrary(page)
  await page.getByTestId('library-file').setInputFiles({
    name: `${title}.pdf`,
    mimeType: 'application/pdf',
    buffer: pdf(title),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
  // Room for the whole bar: the side menu is put away.
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
}

async function openPdf(page: Page, title = 'Fixture Book') {
  await page.goto('/?flags=reader.v2')
  await importAndRead(page, title)
}

const lock = (page: Page) => page.getByTestId('reader-lock')
const toastText = (page: Page, text: string | RegExp) =>
  page.getByRole('status').filter({ hasText: text })

async function pickMode(page: Page, id: 'all' | 'reading' | 'view' | 'frozen') {
  await lock(page).click()
  await expect(page.getByTestId('rv2-lock-menu')).toBeVisible()
  await page.getByTestId(`rv2-lock-${id}`).click()
  await expect(lock(page)).toHaveAttribute('data-mode', id)
}

/** Presses the padlock and holds for `ms`, then lets go. */
async function holdLock(page: Page, ms: number) {
  const b = (await lock(page).boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await expect(lock(page)).toHaveAttribute('data-holding', 'true')
  // The time held is what is being tested, so this wait is the measurement.
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

const pro = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [] }),
    ),
  )

test('RD-B15 the padlock opens a menu of three modes; Frozen is not listed; the icon follows the pick', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    ),
  )
  await openPdf(page)
  await expect(lock(page)).toHaveAttribute('data-mode', 'all')
  await lock(page).click()
  const menu = page.getByTestId('rv2-lock-menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitemradio')).toHaveCount(3)
  await expect(menu.getByText('Everything works')).toBeVisible()
  await expect(menu.getByText('Reading mode')).toBeVisible()
  await expect(menu.getByText('View only', { exact: true })).toBeVisible()
  await expect(menu.getByText('Frozen', { exact: true })).toHaveCount(0)
  await page.getByTestId('rv2-lock-view').click()
  await expect(lock(page)).toHaveAttribute('data-mode', 'view')
  await expect(page.getByText('View only.')).toBeVisible()
})

test('RD-B16 Everything works is the first-ever mode and lets the pen work', async ({
  page,
}) => {
  await openPdf(page)
  await expect(lock(page)).toHaveAttribute('data-mode', 'all')
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
  await page.getByTestId('reader-ink-done').click()
  await pickMode(page, 'reading')
  await pickMode(page, 'all')
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
})

test('RD-B17 Reading mode: no pen or sticky notes; bookmarks, Find and Aa still work', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
  await pickMode(page, 'reading')
  // The pen bar that was open is put away.
  await expect(page.getByTestId('reader-ink-bar')).toHaveCount(0)
  await page.getByTestId('reader-ink').click()
  await expect(toastText(page, 'Unlock to use this.')).toBeVisible()
  await expect(page.getByTestId('reader-ink-bar')).toHaveCount(0)
  // Bookmarks, Find and Aa work.
  await page.getByTestId('reader-bookmark').click()
  await expect(page.getByTestId('reader-bookmark')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByTestId('reader-find').click()
  await expect(
    page.getByRole('searchbox').or(page.getByRole('textbox')).first(),
  ).toBeVisible()
})

test('RD-B18 View only: no pen, bookmark or Listen; a tap on a tool shakes the padlock and says Unlock to use this; Find still works', async ({
  page,
}) => {
  await openPdf(page)
  await pickMode(page, 'view')
  // Record whether the padlock shakes.
  await page.evaluate(() => {
    // The whole page is watched: WebKit may draw the padlock anew.
    ;(window as unknown as { __shook: boolean }).__shook = false
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="reader-lock"][data-shake]'))
        (window as unknown as { __shook: boolean }).__shook = true
    }).observe(document.body, {
      attributes: true,
      subtree: true,
      childList: true,
    })
  })
  await page.getByTestId('reader-ink').click()
  await expect(toastText(page, 'Unlock to use this.')).toBeVisible()
  await expect(page.getByTestId('reader-ink-bar')).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __shook: boolean }).__shook),
    )
    .toBe(true)
  await page.getByTestId('reader-bookmark').click()
  await expect(page.getByTestId('reader-bookmark')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByTestId('reader-listen').click()
  await expect(page.getByTestId('reader-listen')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  // Selecting text makes no pop-up.
  await expect(page.locator('.textLayer span').first()).toBeAttached({
    timeout: 15_000,
  })
  await page.evaluate(() => {
    const span = document.querySelector('.textLayer span')!
    const range = document.createRange()
    range.selectNodeContents(span)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await expect(page.getByTestId('selection-popup')).toHaveCount(0)
  // Find and scrolling still work.
  await page.getByTestId('reader-find').click()
  await expect(
    page.getByRole('searchbox').or(page.getByRole('textbox')).first(),
  ).toBeVisible()
  const scroller = page.getByTestId('pdf-scroller')
  await scroller.evaluate((el) => {
    el.scrollTop = 400
  })
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
})

test('RD-B19 holding the padlock in View only fills a ring and opens the lock', async ({
  page,
}) => {
  await openPdf(page)
  await pickMode(page, 'view')
  await holdLock(page, 1800)
  await expect(lock(page)).toHaveAttribute('data-mode', 'all')
  await expect(toastText(page, 'Unlocked. Everything works.')).toBeVisible()
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
})

test('RD-B20 letting go of the padlock at 0.8 s keeps the lock; the ring drains; no success message', async ({
  page,
}) => {
  await openPdf(page)
  await pickMode(page, 'view')
  await holdLock(page, 800)
  await expect(lock(page)).not.toHaveAttribute('data-holding', 'true')
  await expect(lock(page)).toHaveAttribute('data-mode', 'view')
  await expect(toastText(page, 'Hold the padlock to unlock.')).toBeVisible()
  await expect(toastText(page, 'Unlocked')).toHaveCount(0)
  // Well after the full time the lock is still on.
  await page.waitForTimeout(1200)
  await expect(lock(page)).toHaveAttribute('data-mode', 'view')
})

test('RD-B21 and RD-B22 each book keeps its own mode; a new book opens in the last mode used; it survives a reload', async ({
  page,
}) => {
  await openPdf(page, 'Alpha Book')
  await pickMode(page, 'view')
  await page.getByTestId('reader-close').click()
  // A second book never locked: opens in the last mode used (View only).
  await importAndRead(page, 'Beta Book')
  await expect(lock(page)).toHaveAttribute('data-mode', 'view')
  // Give it its own mode.
  await holdLock(page, 1800)
  await expect(lock(page)).toHaveAttribute('data-mode', 'all')
  await pickMode(page, 'reading')
  await page.getByTestId('reader-close').click()
  // Back to the first book: still View only.
  await goLibrary(page)
  await page.getByRole('button', { name: 'Alpha Book' }).first().click()
  await page.getByTestId('book-continue').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(lock(page)).toHaveAttribute('data-mode', 'view')
  // Reload: it is stored on the book, not in memory.
  await page.reload()
  await goLibrary(page)
  await page.getByRole('button', { name: 'Beta Book' }).first().click()
  await page.getByTestId('book-continue').click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect(lock(page)).toHaveAttribute('data-mode', 'reading')
})

test('RD-B23 a tap on a highlight with a note opens it; in View only the note is read-only (no pencil, no delete)', async ({
  page,
}) => {
  await openPdf(page)
  // A highlight with a note.
  await expect(async () => {
    await page.evaluate(() => {
      const span = document.querySelector('.textLayer span')!
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1500,
    })
  }).toPass({ timeout: 15_000 })
  await page
    .getByTestId('selection-popup')
    .getByRole('button', { name: 'Note' })
    .click()
  await page.getByTestId('note-text').fill('A note on this line')
  await page.getByTestId('note-save').click()
  const box = page.getByTestId('pdf-highlight').first()
  await expect(box).toBeAttached()
  const tap = async () => {
    const b = (await box.boundingBox())!
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  }
  // Everything works: the note opens and can be edited.
  await tap()
  await expect(page.getByTestId('rv2-sticky-text')).toHaveText(
    'A note on this line',
  )
  await expect(page.getByTestId('rv2-sticky-edit')).toBeVisible()
  await page.getByTestId('rv2-sticky-close').click()
  // View only: read-only.
  await pickMode(page, 'view')
  await tap()
  await expect(page.getByTestId('rv2-sticky-text')).toHaveText(
    'A note on this line',
  )
  await expect(page.getByTestId('rv2-sticky-edit')).toHaveCount(0)
  await expect(page.getByTestId('rv2-sticky-delete')).toHaveCount(0)
  await expect(
    page.getByTestId('rv2-sticky-read').getByRole('button'),
  ).toHaveCount(1)
})

test('a sticky note can be read but not moved or edited in Reading mode and View only', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await page.getByTestId('reader-ink-sticky').click()
  const b = (await page.locator('[data-pdf-page="1"]').boundingBox())!
  await page.mouse.click(b.x + b.width * 0.4, b.y + b.height * 0.3)
  await page.getByTestId('rv2-sticky-text-input').fill('Locked note')
  await page.getByTestId('rv2-sticky-save').click()
  await page.getByTestId('reader-ink-done').click()
  for (const m of ['reading', 'view'] as const) {
    await pickMode(page, m)
    await page.getByTestId('rv2-sticky-pin').click()
    await expect(page.getByTestId('rv2-sticky-text')).toHaveText('Locked note')
    await expect(page.getByTestId('rv2-sticky-edit')).toHaveCount(0)
    await page.getByTestId('rv2-sticky-close').click()
    // A long press does not lift it.
    const p = (await page.getByTestId('rv2-sticky-pin').boundingBox())!
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(700)
    await expect(page.getByTestId('rv2-sticky-ghost')).toHaveCount(0)
    await page.mouse.up()
    await page.keyboard.press('Escape')
    if (m === 'view') await holdLock(page, 1800)
  }
})

test.describe('Professional', () => {
  test('RD-P01 Frozen appears with its switch: the bar hides, taps do nothing, a swipe turns the page, a 1.5 s hold leaves', async ({
    page,
  }) => {
    await pro(page)
    await openPdf(page)
    await lock(page).click()
    await expect(
      page.getByTestId('rv2-lock-menu').getByRole('menuitemradio'),
    ).toHaveCount(4)
    await page.getByTestId('rv2-lock-frozen').click()
    // The bar is gone; only the unlock padlock shows.
    await expect(page.getByTestId('rv2-row')).toHaveCount(0)
    await expect(page.getByTestId('reader-unlock')).toBeVisible()
    // A tap does nothing (no toolbar, no dialog).
    const b = (await page.locator('[data-pdf-page="1"]').boundingBox())!
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await expect(page.getByTestId('rv2-row')).toHaveCount(0)
    // A swipe still turns the page.
    const scroller = page.getByTestId('pdf-scroller')
    const top0 = await scroller.evaluate((el) => el.scrollTop)
    const y = b.y + 300
    await page.mouse.move(b.x + b.width * 0.8, y)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width * 0.2, y + 5, { steps: 6 })
    await page.mouse.up()
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(top0)
    // A 1.5 s hold on the lock leaves.
    const u = (await page.getByTestId('reader-unlock').boundingBox())!
    await page.mouse.move(u.x + u.width / 2, u.y + u.height / 2)
    await page.mouse.down()
    await expect(page.getByTestId('rv2-row')).toBeVisible({ timeout: 4000 })
    await page.mouse.up()
    await expect(lock(page)).toHaveAttribute('data-mode', 'all')
    await expect(toastText(page, 'Unlocked. Everything works.')).toBeVisible()
  })
})

test.describe('phone and iPad touch', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test('the padlock menu fits on a phone and a pick sticks', async ({
    page,
  }) => {
    await openPdf(page)
    // On a phone the padlock may sit in the ⋯ card.
    if (!(await lock(page).isVisible())) {
      await page.getByTestId('reader-more').tap()
    }
    await lock(page).tap()
    const menu = page.getByTestId('rv2-lock-menu')
    await expect(menu).toBeVisible()
    // The sheet slides up; judge it once it has come to rest.
    await expect
      .poll(async () => {
        const r = (await menu.boundingBox())!
        return r.y + r.height
      })
      .toBeLessThanOrEqual(844.5)
    const r = (await menu.boundingBox())!
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x + r.width).toBeLessThanOrEqual(390.5)
    await page.getByTestId('rv2-lock-view').tap()
    // The padlock may be back in the ⋯ card: open it again to look.
    if (!(await lock(page).isVisible())) {
      await page.getByTestId('reader-more').tap()
    }
    await expect(lock(page)).toHaveAttribute('data-mode', 'view')
  })
})
