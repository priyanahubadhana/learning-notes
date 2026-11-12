import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  makeCard,
  selectText,
  typeInEditor,
  cardRecordCount,
  contrastOf,
  startInTheme,
  openSidebar,
} from './helpers.ts'

/**
 * Review v2 (slice 8, flag `review.v2`): Home, Session, Waiting, Done, keys,
 * and the Professional session extras. One test per line of
 * docs/features/review-v2.md (RV-B01 ...). The flag is forced with ?flags=.
 */

const FLAGGED = '/?flags=review.v2'

const session = (page: Page) => page.getByTestId('rv2-session')
const home = (page: Page) => page.getByTestId('rv2-home')
/** The question side of the open card (a card's answer can hold the next block). */
const front = (page: Page) => page.locator('[data-side="front"]')
const left = (page: Page) => page.getByTestId('rv2-left')

/** Beginner level for this device (set before the app starts). */
async function asBeginner(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    )
  })
}

/** Starts with a notebook and `n` cards ("Question 1", "Question 2" ...). */
async function seed(page: Page, n: number, url = FLAGGED) {
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

/** Review log rows and cards, read straight from the database. */
const dbCounts = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ logs: number; reps: number[] }>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['reviewLogs', 'cards'])
          const logs = tx.objectStore('reviewLogs').count()
          const cards = tx.objectStore('cards').getAll()
          tx.oncomplete = () => {
            resolve({
              logs: logs.result,
              reps: (cards.result as { reps: number }[]).map((c) => c.reps),
            })
            db.close()
          }
        }
      }),
  )

test.describe('Beginner home and session', () => {
  test.beforeEach(async ({ page }) => asBeginner(page))

  test('RV-B01 / RV-B02 / RV-B05: the hero, singular label, Start opens the first card', async ({
    page,
  }) => {
    await seed(page, 1)
    await openReview(page)
    const hero = page.getByTestId('rv2-hero')
    await expect(hero).toContainText('Today')
    await expect(page.getByTestId('rv2-count')).toHaveText('1')
    await expect(hero).toContainText('card is ready') // singular (RV-B02)
    await expect(page.getByTestId('rv2-start')).toHaveText('Start review')
    // Beginner: no counts line, no Practice, no More, no chips.
    await expect(page.getByTestId('rv2-counts')).toHaveCount(0)
    await expect(page.getByTestId('rv2-practice-home')).toHaveCount(0)
    await expect(home(page).getByRole('button', { name: 'More' })).toHaveCount(
      0,
    )

    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toContainText('Question 1')
    await expect(left(page)).toHaveText('1 left')
    await expect(home(page)).toHaveCount(0)
  })

  test('RV-B01: several cards read "cards are ready"', async ({ page }) => {
    await seed(page, 2)
    await openReview(page)
    await expect(page.getByTestId('rv2-count')).toHaveText('2')
    await expect(page.getByTestId('rv2-hero')).toContainText('cards are ready')
  })

  test('RV-B04: no cards at all shows the empty state with a way to Notebooks', async ({
    page,
  }) => {
    await page.goto(FLAGGED)
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await openReview(page)
    await expect(page.getByTestId('rv2-no-cards')).toContainText(
      'No cards yet. Make one in a note',
    )
    await page.getByTestId('rv2-no-cards-action').click()
    await expect(page.locator('[data-space="notebooks"]')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('RV-B12 / RV-B14 / RV-B13 / RV-B16: Space flips, 1 before the flip does nothing, 3 rates, Done', async ({
    page,
  }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toContainText('Question 1')

    // RV-B14: 1 before the flip does nothing.
    await page.keyboard.press('1')
    await expect(session(page)).toHaveAttribute('data-revealed', '0')
    expect((await dbCounts(page)).logs).toBe(0)

    // RV-B12: Space flips; four buttons with the next gap.
    await page.keyboard.press('Space')
    await expect(session(page)).toHaveAttribute('data-revealed', '1')
    await expect(session(page)).toContainText('An answer')
    const rates = page.getByTestId('rv2-rates').getByRole('button')
    await expect(rates).toHaveText([
      'Again10 min',
      'Hard10 min',
      'Good10 min',
      /^Easy\d+ days$/,
    ])

    // RV-B13: Easy (4) rates; the next card shows face up (question side).
    await page.keyboard.press('4')
    await expect(front(page)).toContainText('Question 2')
    await expect(session(page)).toHaveAttribute('data-revealed', '0')
    await expect(left(page)).toHaveText('1 left')
    await page.keyboard.press('Enter')
    await page.keyboard.press('4')

    // RV-B16: the last card ends in Done.
    const done = page.getByTestId('rv2-done')
    await expect(done).toContainText('All done')
    await expect(done).toContainText('You reviewed 2 cards')
    await expect(page.getByTestId('rv2-practice')).toBeVisible()
  })

  test('RV-B03 / RV-B06: nothing due shows the empty state; Practice anyway keeps the schedule', async ({
    page,
  }) => {
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toBeVisible() // keys count only once the card is on screen
    await page.keyboard.press('Space')
    await page.keyboard.press('4') // Easy: not due again for days
    await expect(page.getByTestId('rv2-done')).toBeVisible()
    await page.getByTestId('rv2-close').click()

    // RV-B03: Start is disabled; "Nothing to review today" and Practice anyway.
    await expect(page.getByTestId('rv2-start')).toBeDisabled()
    await expect(page.getByTestId('rv2-nothing')).toContainText(
      'Nothing to review today',
    )
    const before = await dbCounts(page)

    // RV-B06: practice opens with the practising note, logs a cram row only.
    await page.getByTestId('rv2-nothing-action').click()
    await expect(front(page)).toContainText('Question 1')
    await expect(session(page)).toContainText('schedule stays the same')
    await page.keyboard.press('Space')
    await page.keyboard.press('3')
    await expect(page.getByTestId('rv2-done')).toBeVisible()
    const after = await dbCounts(page)
    expect(after.logs).toBe(before.logs + 1)
    expect(after.reps).toEqual(before.reps) // reps unchanged: a cram row
  })

  test('RV-B15: Again leaves the queue and the wait view counts down', async ({
    page,
  }) => {
    await page.clock.install()
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toBeVisible() // keys count only once the card is on screen
    await page.keyboard.press('Space')
    await page.keyboard.press('1') // Again
    const waiting = page.getByTestId('rv2-waiting')
    await expect(waiting).toContainText('1 card coming back soon')
    await expect(waiting.getByRole('timer')).toHaveText(/^\d+:\d\d$/)
    await expect(session(page)).not.toContainText('Question 1')
    await page.clock.fastForward('10:05')
    await expect(front(page)).toContainText('Question 1')
  })

  test('RV-B17: x and Esc close; Esc in a text box does not', async ({
    page,
  }) => {
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(session(page)).toBeVisible()
    // Esc inside a text box is for the box.
    await page.evaluate(() => {
      const input = document.createElement('input')
      input.id = 'probe'
      document.body.append(input)
      input.focus()
    })
    await page.keyboard.press('Escape')
    await expect(session(page)).toBeVisible()
    await page.evaluate(() => document.getElementById('probe')?.remove())

    await page.keyboard.press('Escape')
    await expect(home(page)).toBeVisible()
    await expect(page.getByTestId('rv2-count')).toHaveText('1')
    await page.getByTestId('rv2-start').click()
    await page.getByTestId('rv2-close').click()
    await expect(home(page)).toBeVisible()
  })

  test('RV-B18: a rating is saved once and a reload restarts from the live queue', async ({
    page,
  }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toBeVisible() // keys count only once the card is on screen
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await expect(front(page)).toContainText('Question 2')
    await expect
      .poll(async () => (await dbCounts(page)).logs, { timeout: 3000 })
      .toBe(1)
    expect((await dbCounts(page)).reps.sort()).toEqual([0, 1])

    await page.reload()
    await openReview(page)
    await expect(page.getByTestId('rv2-count')).toHaveText('1')
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toContainText('Question 2')
    await expect(left(page)).toHaveText('1 left')
    expect((await dbCounts(page)).logs).toBe(1)
  })

  test('double tap on a rating button writes one log row', async ({ page }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toBeVisible() // keys count only once the card is on screen
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: /^Easy/ }).dblclick()
    await expect(front(page)).toContainText('Question 2')
    await page.waitForTimeout(300)
    expect((await dbCounts(page)).logs).toBe(1)
  })

  test('RV-B34 / RV-B35: keyboard only, and the screen reader names', async ({
    page,
  }) => {
    await seed(page, 1)
    await openReview(page)
    await page.keyboard.press('Tab')
    // Tab reaches Start on the home; Enter starts.
    await page.getByTestId('rv2-start').focus()
    await expect(page.getByTestId('rv2-start')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(front(page)).toContainText('Question 1')
    // The Show answer button is focused: Enter turns the card.
    await expect(page.getByTestId('rv2-show')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('status').filter({ hasText: 'Answer shown' }),
    ).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: /^Good, comes back in 10 min$/ }),
    ).toBeVisible()
  })

  test('RV-B32: reduced motion makes the flip instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toBeVisible() // keys count only once the card is on screen
    await page.keyboard.press('Space')
    const ms = await page
      .locator('.rv2-fc')
      .evaluate(
        (el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000,
      )
    expect(ms).toBeLessThan(1)
  })

  test('RV-B31: offline, ratings are saved locally with no error toast', async ({
    page,
    context,
  }) => {
    await seed(page, 3)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await context.setOffline(true)
    for (let i = 1; i <= 3; i++) {
      // Wait for the card to show before pressing its keys.
      await expect(front(page)).toContainText('Question ' + i)
      await page.keyboard.press('Space')
      await expect(session(page)).toHaveAttribute('data-revealed', '1')
      await page.keyboard.press('4')
    }
    await expect(page.getByTestId('rv2-done')).toBeVisible()
    await context.setOffline(false)
    expect((await dbCounts(page)).logs).toBe(3)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

test('RV-B19: a cloze card hides the words, then shows them in accent colour', async ({
  page,
}) => {
  await asBeginner(page)
  await page.goto(FLAGGED)
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'S2 closes the aortic valve')
  await selectText(page, 'aortic')
  await page
    .getByRole('button', { name: 'Make blank (hide these words in review)' })
    .click()
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)
  await openReview(page)
  await page.getByTestId('rv2-start').click()
  const card = page.getByTestId('rv2-card')
  await expect(card.locator('.rv2-blank')).toHaveText('…')
  await expect(card).not.toContainText('aortic')
  await expect(card).toHaveAttribute('data-type', 'blank')
  await page.keyboard.press('Space')
  await expect(card.locator('mark.rv2-fill')).toHaveText('aortic')
})

test('RV-B09 / RV-B11: addresses keep working and the Home due tile opens the same count', async ({
  page,
}) => {
  await seed(page, 2)
  // The old address of "Cards I got wrong" opens that scope with its title.
  await page.goto(`${FLAGGED}#/review/wrong`)
  await expect(session(page)).toBeVisible()
  await expect(session(page)).toHaveAttribute('aria-label', 'Cards I got wrong')
  await expect(page.getByTestId('rv2-empty')).toContainText(
    'No cards marked Again in the last 7 days.',
  )
  // The Home due tile opens Review on the same count.
  await page.goto(`${FLAGGED}#/`)
  await page.locator('[data-space="home"]').click()
  const tile = page.getByTestId('due-tile')
  await expect(tile).toContainText('2 due')
  await tile.click()
  await expect(left(page)).toHaveText('2 left')
})

test('RV-B07 (part): Professional shows the counts line and Practice anyway on the home', async ({
  page,
}) => {
  await seed(page, 2) // default level = Professional
  await openReview(page)
  const counts = page.getByTestId('rv2-counts')
  await expect(counts).toContainText('New')
  await expect(counts).toContainText('Learning')
  await expect(counts).toContainText('Due')
  await expect(page.getByTestId('rv2-hero')).toContainText('ready to review')
  await expect(page.getByTestId('rv2-practice-home')).toBeVisible()
})

test.describe('Phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  test('RV-B24: the rate buttons stay above the tab bar and inside the screen', async ({
    page,
  }) => {
    await asBeginner(page)
    await seed(page, 1)
    // On a phone the Review button of the menu opens the session directly.
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: /^Review(?! this)/ })
      .click()
    await expect(front(page)).toContainText('Question 1')
    await page.getByTestId('rv2-show').tap()
    const rates = page.getByTestId('rv2-rates')
    await expect(rates).toBeVisible()
    const box = (await rates.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    const rail = (await page
      .locator('nav[aria-label]')
      .filter({ has: page.locator('[data-space]') })
      .boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(rail.y + 1)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await page.getByRole('button', { name: /^Good/ }).tap()
    await expect(page.getByTestId('rv2-waiting')).toBeVisible()
  })
})

test.describe('iPad (touch)', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  test('RV-B12 / RV-B13 by tap: Show answer then Easy', async ({ page }) => {
    await asBeginner(page)
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').tap()
    await page.getByTestId('rv2-show').tap()
    await expect(page.getByTestId('rv2-rates')).toBeVisible()
    await page.getByRole('button', { name: /^Easy/ }).tap()
    await expect(front(page)).toContainText('Question 2')
    await expect(left(page)).toHaveText('1 left')
    const card = (await page.getByTestId('rv2-card').boundingBox())!
    expect(card.width).toBeLessThanOrEqual(640)
  })
})

test.describe('Professional session extras (rev.sessionExtras, rev.keyHints)', () => {
  const toast = (page: Page) =>
    page.getByRole('status').filter({ hasText: /./ })

  test('RV-P05: the key line shows with rev.keyHints and is absent without it', async ({
    page,
  }) => {
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(page.getByTestId('rv2-keyhints')).toHaveText(
      'Space show · 1 Again · 2 Hard · 3 Good · 4 Easy · Esc close',
    )
    // A Beginner with only Session extras unlocked: extras yes, key line no.
    await page.evaluate(() =>
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: ['rev.sessionExtras'] }),
      ),
    )
    await page.reload()
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(page.getByTestId('rv2-extras')).toBeVisible()
    await expect(page.getByTestId('rv2-keyhints')).toHaveCount(0)
  })

  test('without rev.sessionExtras a Beginner sees no Open note, Suspend or Undo rating', async ({
    page,
  }) => {
    await asBeginner(page)
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toContainText('Question 1')
    await expect(page.getByTestId('rv2-extras')).toHaveCount(0)
    await expect(page.getByTestId('rv2-keyhints')).toHaveCount(0)
  })

  test('RV-P03 / RV-P04: Undo rating is off at first; after Good it brings the card back', async ({
    page,
  }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    const undo = page.getByTestId('rv2-undo')
    await expect(front(page)).toContainText('Question 1')
    await expect(undo).toBeDisabled() // RV-P04
    const before = await dbCounts(page)

    await page.keyboard.press('Space')
    await page.keyboard.press('3') // Good: a new card waits in a 10-minute step
    await expect(front(page)).toContainText('Question 2')
    await expect(undo).toBeEnabled()

    await undo.click()
    await expect(front(page)).toContainText('Question 1')
    await expect(session(page)).toHaveAttribute('data-revealed', '0')
    await expect(left(page)).toHaveText('2 left')
    await expect(undo).toBeDisabled()
    await expect(toast(page)).toContainText('Rating undone')
    // The card is back to its old schedule; the log row stays (marked), not deleted.
    const after = await dbCounts(page)
    expect(after.reps).toEqual(before.reps)
    expect(after.logs).toBe(1)
    const marked = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const open = indexedDB.open('learning-notes')
          open.onsuccess = () => {
            const all = open.result
              .transaction('reviewLogs')
              .objectStore('reviewLogs')
              .getAll()
            all.onsuccess = () => {
              resolve(
                (all.result as { purgedAt?: number }[]).every(
                  (l) => typeof l.purgedAt === 'number',
                ),
              )
              open.result.close()
            }
          }
        }),
    )
    expect(marked).toBe(true)

    // And the same card can be rated again: exactly one counted log row more.
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await expect(front(page)).toContainText('Question 2')
    expect((await dbCounts(page)).logs).toBe(2)
  })

  test('Ctrl+Z in a session undoes the last rating', async ({ page }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toContainText('Question 1')
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await expect(front(page)).toContainText('Question 2')
    await expect(left(page)).toHaveText('1 left')
    await page.keyboard.press('Control+z')
    await expect(front(page)).toContainText('Question 1')
    await expect(left(page)).toHaveText('2 left')
  })

  test('RV-P02: Suspend takes the card out and Undo puts it back as the current card', async ({
    page,
  }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toContainText('Question 1')
    await page.getByTestId('rv2-suspend').click()
    await expect(toast(page)).toContainText('Card suspended')
    await expect(front(page)).toContainText('Question 2')
    await expect(left(page)).toHaveText('1 left')
    await toast(page).getByRole('button', { name: 'Undo' }).click()
    await expect(front(page)).toContainText('Question 1')
    await expect(left(page)).toHaveText('2 left')
  })

  test('RV-P01: Open note opens the note and Back returns to Review', async ({
    page,
  }) => {
    await seed(page, 1)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await page.getByTestId('rv2-open-note').click()
    await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
      'Heart sounds',
    )
    await page.goBack()
    await expect(front(page)).toContainText('Question 1')
  })

  test('RV-P03 at iPad size: tap Easy, tap Undo rating, the count goes back', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await page.getByTestId('rv2-show').click()
    await page.getByRole('button', { name: /^Easy/ }).click()
    await expect(left(page)).toHaveText('1 left')
    await page.getByTestId('rv2-undo').click()
    await expect(left(page)).toHaveText('2 left')
  })
})

/** Adds `extra` copies of the first card (new cards, due now) straight to the database. */
async function cloneCards(page: Page, extra: number) {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('cards', 'readwrite')
          const all = tx.objectStore('cards').getAll()
          all.onsuccess = () => {
            const first = all.result[0]
            for (let i = 0; i < count; i++) {
              tx.objectStore('cards').add({
                ...first,
                id: crypto.randomUUID(),
              })
            }
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    extra,
  )
}

const newCount = (page: Page) =>
  page.getByTestId('rv2-counts').locator('b').first()

test('RV-B08: with 25 new cards and a limit of 20 the counts line says 20, and 17 after three are done', async ({
  page,
}) => {
  await seed(page, 1) // default level = Professional
  await cloneCards(page, 24)
  await page.reload()
  await openReview(page)
  await expect(newCount(page)).toHaveText('20')
  await page.getByTestId('rv2-start').click()
  for (let i = 0; i < 3; i++) {
    await expect(session(page)).toHaveAttribute('data-revealed', '0')
    await page.keyboard.press('Space')
    await expect(session(page)).toHaveAttribute('data-revealed', '1')
    await page.keyboard.press('3')
    await expect.poll(async () => (await dbCounts(page)).logs).toBe(i + 1)
  }
  await page.keyboard.press('Escape')
  await expect(home(page)).toBeVisible()
  await expect(newCount(page)).toHaveText('17')
})

test('RV-B10: the Review icon in the rail is selected and its badge counts the same as the Home number', async ({
  page,
}) => {
  // The rail (with its badge) is the new shell.
  await seed(page, 2, '/?flags=review.v2,foundation.shell')
  await openReview(page)
  const icon = page.locator('[data-space="review"]')
  await expect(icon).toHaveAttribute('aria-current', 'page')
  // countDue is what Home shows as the big number.
  await expect(page.getByTestId('rv2-count')).toHaveText('2')
  await expect(icon.locator('.sh-badge')).toHaveText('2')
})

test('RV-B20: a Picture card shows its picture under the answer', async ({
  page,
}) => {
  await seed(page, 1)
  const dot =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  await page.evaluate(
    (url) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['blocks', 'cards'], 'readwrite')
          const store = tx.objectStore('blocks')
          const cards = tx.objectStore('cards').getAll()
          cards.onsuccess = () => {
            const cardBlock = (cards.result[0] as { blockId: string }).blockId
            const all = store.getAll()
            all.onsuccess = () => {
              const answer = (
                all.result as { parentId: string | null; type: string }[]
              ).find((b) => b.parentId === cardBlock)
              if (answer)
                store.put({ ...answer, type: 'image', content: { url } })
            }
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    dot,
  )
  await page.reload()
  await openReview(page)
  await page.getByTestId('rv2-start').click()
  await expect(page.getByTestId('rv2-card')).toHaveAttribute(
    'data-type',
    'picture',
  )
  await expect(page.getByTestId('rv2-type')).toHaveText('Picture')
  await expect(page.locator('[data-answer-picture]')).toHaveCount(0)
  await page.keyboard.press('Space')
  await expect(page.locator('[data-answer-picture]')).toBeVisible()
})

test('RV-B23: a card made from a highlight shows "From ..." and tapping it opens the annotation', async ({
  page,
}) => {
  await asBeginner(page)
  await seed(page, 1)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['cards', 'annotations'], 'readwrite')
          const cards = tx.objectStore('cards')
          const all = cards.getAll()
          all.onsuccess = () => {
            const card = all.result[0]
            const now = Date.now()
            tx.objectStore('annotations').add({
              id: 'rv-b23-note',
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              pageId: card.pageId,
              kind: 'highlight',
              anchor: { type: 'block', blockId: card.blockId },
              origin: 'user',
            })
            cards.put({ ...card, sourceAnnotationId: 'rv-b23-note' })
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
  await page.getByTestId('rv2-start').click()
  const source = page.getByTestId('card-source')
  await expect(source).toContainText('From')
  await source.click()
  // The annotation opens at its page: the note editor is on screen again.
  await expect(session(page)).toHaveCount(0)
  await expect(page.locator('.bn-editor')).toContainText('Question 1')
})

test('RV-B27: with the flag OFF the old Review screens show with the same data', async ({
  page,
}) => {
  await seed(page, 1, '/')
  await openReview(page)
  await expect(page.getByTestId('rv2-home')).toHaveCount(0)
  await page.getByRole('button', { name: 'All cards' }).first().click()
  await page
    .getByRole('main')
    .getByRole('button', { name: /^Study/ })
    .first()
    .click()
  await expect(page.getByRole('main')).toContainText('Question 1')
  await expect(page.getByTestId('rv2-session')).toHaveCount(0)
})

for (const theme of ['day', 'night', 'sepia'] as const) {
  // No axe package is installed (see a11yWave34.spec.ts): the same check as the
  // other specs, WCAG contrast of the real colours through `contrastOf`.
  test(`RV-B28: ${theme} keeps readable contrast on the hero, card face and rate buttons`, async ({
    page,
  }) => {
    await startInTheme(page, theme)
    await seed(page, 1)
    await openReview(page)
    expect(await contrastOf(page.getByTestId('rv2-hero'))).toBeGreaterThan(4.5)
    expect(await contrastOf(page.getByTestId('rv2-start'))).toBeGreaterThan(4.5)
    await page.getByTestId('rv2-start').click()
    await expect(front(page)).toBeVisible()
    await page.keyboard.press('Space')
    await expect(session(page)).toHaveAttribute('data-revealed', '1')
    expect(await contrastOf(front(page))).toBeGreaterThan(4.5)
    expect(
      await contrastOf(page.locator('[data-side="back"]')),
    ).toBeGreaterThan(4.5)
    const rates = page.getByTestId('rv2-rates').getByRole('button')
    for (let i = 0; i < 4; i++)
      expect(await contrastOf(rates.nth(i))).toBeGreaterThan(4.5)
  })
}

test('Error state: "Could not load" with Try again, which loads the session', async ({
  page,
}) => {
  await seed(page, 1)
  await openReview(page)
  await expect(page.getByTestId('rv2-start')).toBeVisible()
  // From now on every read of the database fails, until we say otherwise.
  await page.evaluate(() => {
    const w = window as unknown as { __fail?: boolean }
    w.__fail = true
    for (const proto of [IDBObjectStore.prototype, IDBIndex.prototype]) {
      for (const m of ['getAll', 'getAllKeys', 'openCursor', 'openKeyCursor']) {
        const orig = (
          proto as unknown as Record<string, (...a: unknown[]) => unknown>
        )[m]
        ;(proto as unknown as Record<string, unknown>)[m] = function (
          this: unknown,
          ...a: unknown[]
        ) {
          const store =
            this instanceof IDBIndex
              ? this.objectStore
              : (this as IDBObjectStore)
          if (w.__fail && store.name === 'cards')
            throw new DOMException('test', 'DataError')
          return orig.apply(this, a)
        }
      }
    }
  })
  await page.getByTestId('rv2-start').click()
  const error = page.getByTestId('rv2-error')
  await expect(error).toContainText('Could not load')
  await page.evaluate(() => {
    ;(window as unknown as { __fail?: boolean }).__fail = false
  })
  await error.getByRole('button', { name: 'Try again' }).click()
  await expect(front(page)).toContainText('Question 1')
})

test('Loading: a skeleton shows on Home and in the session until the data arrives', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const saw = { home: false, session: false }
    ;(window as unknown as { __saw: typeof saw }).__saw = saw
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="rv2-home"][data-loading="1"]'))
        saw.home = true
      if (document.querySelector('[data-testid="rv2-session"] .rv2-skel'))
        saw.session = true
    }).observe(document, { childList: true, subtree: true })
  })
  await seed(page, 1)
  await openReview(page)
  await page.getByTestId('rv2-start').click()
  await expect(front(page)).toContainText('Question 1')
  const saw = await page.evaluate(
    () => (window as unknown as { __saw: object }).__saw,
  )
  expect(saw).toEqual({ home: true, session: true })
})
