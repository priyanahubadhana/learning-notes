import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  makeCard,
  contrastOf,
  openSidebar,
  startInTheme,
} from './helpers.ts'

/**
 * Review v2, slice 8b: Professional home (More button, chips, limits line)
 * and the More sheet shell (tabs, draft model, picker row). One test per id of
 * docs/features/review-v2.md. The flag is forced with ?flags=.
 */

const FLAGGED = '/?flags=review.v2'
const home = (page: Page) => page.getByTestId('rv2-home')
const sheet = (page: Page) => page.getByTestId('more-sheet')

async function seed(page: Page, n: number, off: string[] = [], url = FLAGGED) {
  if (off.length)
    await page.addInitScript((ids) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'professional', unlocked: [], off: ids }),
      )
    }, off)
  await page.goto(url)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  for (let i = 1; i <= n; i++) {
    if (i > 1) await page.keyboard.press('Enter')
    await makeCard(page, `Question ${i}`, i)
  }
}

async function openReview(page: Page) {
  await closeCorner(page)
  await page.locator('[data-space="review"]').click()
}

/** Adds decks straight to the database (the Decks tab comes in a later part). */
async function addDecks(page: Page, names: string[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('decks', 'readwrite')
          list.forEach((name, i) =>
            tx.objectStore('decks').add({
              id: crypto.randomUUID(),
              createdAt: 1,
              updatedAt: 1,
              deletedAt: null,
              name,
              order: String.fromCharCode(97 + i),
              colour: '#4f8a6b',
              scope: { notebookIds: [], pageIds: [], withSubpages: true },
              tagIds: [],
              tagMode: 'any',
              states: ['all'],
            }),
          )
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    names,
  )
}

test('RV-B07: Beginner has no More button, chips or limits line; Professional has all three', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    ),
  )
  await seed(page, 2)
  await openReview(page)
  await expect(page.getByTestId('rv2-start')).toBeVisible()
  await expect(page.getByTestId('rv2-more')).toHaveCount(0)
  await expect(page.getByTestId('rv2-chips')).toHaveCount(0)
  await expect(page.getByTestId('rv2-limits')).toHaveCount(0)
})

test('RV-B07 / RV-B08: Professional shows More first, the chips row and one limits line', async ({
  page,
}) => {
  await seed(page, 2)
  await openReview(page)
  const more = page.getByTestId('rv2-more')
  const chips = page.getByTestId('rv2-chips')
  await expect(more).toBeVisible()
  await expect(chips).toBeVisible()
  const a = (await more.boundingBox())!
  const b = (await chips.boundingBox())!
  expect(a.x).toBeLessThan(b.x) // More is FIRST in its row
  expect(Math.abs(a.y + a.height / 2 - (b.y + b.height / 2))).toBeLessThan(24)
  await expect(page.getByTestId('rv2-limits')).toContainText('20 new left')
})

test('RV-P06 / RV-P08: decks are chips only while rev.decks is on; a deck chip changes the hero', async ({
  page,
}) => {
  await seed(page, 2)
  await addDecks(page, ['Heart'])
  await page.reload()
  await openReview(page)
  const chips = page.getByTestId('rv2-chips')
  await expect(chips.getByRole('radio')).toHaveText([
    'All cards',
    'Heart',
    /Got wrong/,
  ])
  await chips.getByRole('radio', { name: 'Heart' }).click()
  await expect(page.getByTestId('rv2-hero')).toContainText('Heart')
  await page.getByTestId('rv2-start').click()
  await expect(page.getByTestId('rv2-session')).toBeVisible()
})

test('RV-P06: a deck chip counts only its own cards and Start opens that deck only', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seed(page, 2)
  await createNotebook(page, 'Lungs', 'Breathing')
  await makeCard(page, 'Lung question', 3)
  const rows = (store: string) =>
    page.evaluate(
      (name) =>
        new Promise<{ id: string; title?: string; name?: string }[]>(
          (resolve) => {
            const open = indexedDB.open('learning-notes')
            open.onsuccess = () => {
              const db = open.result
              const all = db.transaction(name).objectStore(name).getAll()
              all.onsuccess = () => {
                db.close()
                resolve(all.result)
              }
            }
          },
        ),
      store,
    )
  const heart = (await rows('notebooks')).find(
    (n) => (n.title ?? n.name) === 'Cardiology',
  )!
  await page.evaluate(
    (id) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('decks', 'readwrite')
          tx.objectStore('decks').add({
            id: crypto.randomUUID(),
            createdAt: 1,
            updatedAt: 1,
            deletedAt: null,
            name: 'Heart',
            order: 'a',
            colour: '#4f8a6b',
            scope: { notebookIds: [id], pageIds: [], withSubpages: true },
            tagIds: [],
            tagMode: 'any',
            states: ['all'],
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    heart.id,
  )
  await page.reload()
  await openReview(page)
  await expect(page.getByTestId('rv2-count')).toHaveText('3')
  await page
    .getByTestId('rv2-chips')
    .getByRole('radio', { name: 'Heart' })
    .click()
  await expect(page.getByTestId('rv2-count')).toHaveText('2')
  await page.getByTestId('rv2-start').click()
  await expect(page.locator('[data-side="front"]')).toContainText('Question')
  await expect(page.locator('[data-side="front"]')).not.toContainText('Lung')
})

test('RV-P08: with rev.decks off only All cards and Got wrong remain', async ({
  page,
}) => {
  await seed(page, 1, ['rev.decks'])
  await addDecks(page, ['Heart'])
  await page.reload()
  await openReview(page)
  await expect(page.getByTestId('rv2-chips').getByRole('radio')).toHaveText([
    'All cards',
    /Got wrong/,
  ])
})

test('RV-P07: Got wrong shows (n), Start reviews them and there is no Practice for it', async ({
  page,
}) => {
  await seed(page, 1)
  await openReview(page)
  await page.getByTestId('rv2-start').click()
  await expect(page.getByTestId('rv2-session')).toHaveAttribute(
    'data-revealed',
    '0',
  )
  await expect(page.locator('[data-side="front"]')).toContainText('Question 1')
  await page.keyboard.press('Space')
  await expect(page.getByTestId('rv2-session')).toHaveAttribute(
    'data-revealed',
    '1',
  )
  await page.keyboard.press('1') // Again
  await expect(page.getByTestId('rv2-waiting')).toBeVisible()
  await page.keyboard.press('Escape')
  const wrong = page.getByTestId('rv2-chips').getByRole('radio', {
    name: /Got wrong/,
  })
  await expect(wrong).toContainText('(1)')
  await wrong.click()
  await expect(page.getByTestId('rv2-hero')).toContainText('Got wrong')
  await expect(page.getByTestId('rv2-practice-home')).toHaveCount(0)
  await page.getByTestId('rv2-start').click()
  await expect(page.getByTestId('rv2-session')).toBeVisible()
  await expect(page.locator('[data-side="front"]')).toContainText('Question 1')
})

test('RV-P09 / RV-B26: More opens the 440 sheet with header, tabs and footer; the close button returns focus', async ({
  page,
}) => {
  await seed(page, 1)
  await openReview(page)
  const more = page.getByTestId('rv2-more')
  await more.click()
  await expect(sheet(page)).toBeVisible()
  await expect(sheet(page).getByRole('heading', { name: 'More' })).toBeVisible()
  await expect(sheet(page).getByRole('tab')).not.toHaveCount(0)
  await expect(page.getByTestId('more-done')).toBeVisible()
  const box = (await sheet(page).boundingBox())!
  expect(Math.round(box.width)).toBe(440)
  // The home page stays visible beside it.
  await expect(home(page)).toBeVisible()
  await sheet(page).getByRole('button', { name: 'Close' }).click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(more).toBeFocused()
})

test('RV-P10: only tabs whose own switch is on show; none on = an empty state', async ({
  page,
}) => {
  await seed(page, 1, [
    'rev.decks',
    'rev.browse',
    'rev.editor',
    'rev.makeCards',
    'rev.stats',
    'rev.scheduler',
    'rev.anki',
  ])
  await openReview(page)
  await page.getByTestId('rv2-more').click()
  await expect(sheet(page).getByRole('tab')).toHaveCount(0)
  await expect(page.getByTestId('rv2-more-empty')).toContainText(
    'Turn on more tools in Settings › Professional features',
  )
})

test('RV-P10: with rev.moreSheet off the More button is absent', async ({
  page,
}) => {
  await seed(page, 1, ['rev.moreSheet'])
  await openReview(page)
  await expect(page.getByTestId('rv2-more')).toHaveCount(0)
  await expect(page.getByTestId('rv2-chips')).toBeVisible()
})

test('RV-P11: switching tabs starts at the top; Esc closes at once when nothing changed', async ({
  page,
}) => {
  await seed(page, 1)
  await openReview(page)
  await page.getByTestId('rv2-more').click()
  const tabs = sheet(page).getByRole('tab')
  await tabs.nth(1).click()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await tabs.nth(0).click()
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  // Scroll place: a new tab opens at the top; the same tab keeps its place.
  const body = page.getByTestId('more-body')
  await body.evaluate((el) => {
    const pad = document.createElement('div')
    pad.style.height = '2000px'
    el.appendChild(pad)
    el.scrollTop = 150
  })
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBe(150)
  await tabs.nth(0).click() // same tab again: place kept
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBe(150)
  await tabs.nth(1).click() // another tab: top
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
})

test('RV-P09: Done with no edits closes without a toast', async ({ page }) => {
  await seed(page, 1)
  await openReview(page)
  await page.getByTestId('rv2-more').click()
  await page.getByTestId('more-done').click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(
    page.getByRole('status').filter({ hasText: 'changed' }),
  ).toHaveCount(0)
})

test.describe('Phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  test('RV-B30: the sheet is full width from 8 px under the top; Done sits above the bottom edge', async ({
    page,
  }) => {
    await seed(page, 1)
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: /^Review(?! this)/ })
      .click()
    await expect(page.getByTestId('rv2-show')).toBeVisible()
    // Phone: the menu opens the session; the plain address is Review home.
    await page.evaluate(() => (location.hash = '#/'))
    await expect(home(page)).toBeVisible()
    await page.getByTestId('rv2-more').tap()
    await expect
      .poll(async () => (await sheet(page).boundingBox())!.y)
      .toBeLessThanOrEqual(10)
    const box = (await sheet(page).boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(388)
    const done = (await page.getByTestId('more-done').boundingBox())!
    expect(done.y + done.height).toBeLessThanOrEqual(844)
    expect(done.height).toBeGreaterThanOrEqual(44)
  })
})

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`RV-B28: chips and the limits line keep readable contrast in ${theme}`, async ({
    page,
  }) => {
    await startInTheme(page, theme)
    await seed(page, 1)
    await openReview(page)
    const line = page.getByTestId('rv2-limits')
    await expect(line).toBeVisible()
    expect(await contrastOf(line)).toBeGreaterThanOrEqual(4.5)
    const chips = page.getByTestId('rv2-chips').getByRole('radio')
    for (let k = 0; k < (await chips.count()); k++)
      expect(await contrastOf(chips.nth(k))).toBeGreaterThanOrEqual(4.5)
  })
}

test('RV-B08: with 12 new cards and a limit of 20, finishing 3 new shows "17 new left"', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seed(page, 1)
  // 11 more new cards straight into the database (copies of the first).
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('cards', 'readwrite')
          const all = tx.objectStore('cards').getAll()
          all.onsuccess = () => {
            for (let i = 0; i < 11; i++)
              tx.objectStore('cards').add({
                ...all.result[0],
                id: crypto.randomUUID(),
              })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
  )
  await page.reload()
  await openReview(page)
  await expect(page.getByTestId('rv2-limits')).toContainText('20 new left')
  await page.getByTestId('rv2-start').click()
  for (let n = 0; n < 3; n++) {
    await expect(page.locator('[data-side="front"]')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByTestId('rv2-session')).toHaveAttribute(
      'data-revealed',
      '1',
    )
    await page.keyboard.press('3') // Good
    await expect(page.getByTestId('rv2-session')).toHaveAttribute(
      'data-revealed',
      '0',
    )
  }
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('rv2-limits')).toContainText('17 new left')
})

test('RV-P06 / a11y: every chip is at least 44 pt tall and the group has one Tab stop with arrow keys', async ({
  page,
}) => {
  await seed(page, 2)
  await addDecks(page, ['Heart'])
  await page.reload()
  await openReview(page)
  const radios = page.getByTestId('rv2-chips').getByRole('radio')
  await expect(radios).toHaveCount(3)
  for (let k = 0; k < 3; k++)
    expect((await radios.nth(k).boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    )
  // Only the picked chip is in the Tab order.
  await expect(radios.nth(0)).toHaveAttribute('tabindex', '0')
  await expect(radios.nth(1)).toHaveAttribute('tabindex', '-1')
  await radios.nth(0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(radios.nth(1)).toBeFocused()
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('rv2-hero')).toContainText('Heart')
  await page.keyboard.press('ArrowLeft')
  await expect(radios.nth(0)).toBeFocused()
  await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true')
})
