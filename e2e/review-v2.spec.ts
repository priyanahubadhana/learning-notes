import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  makeCard,
  selectText,
  typeInEditor,
  cardRecordCount,
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
async function seed(page: Page, n: number) {
  await page.goto(FLAGGED)
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
    await expect(session(page)).toContainText('Question 1')
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
    await expect(session(page)).toContainText('Question 1')

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
    await expect(session(page)).toContainText('Question 2')
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
    await expect(session(page)).toContainText('Question 1')
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
    await page.keyboard.press('Space')
    await page.keyboard.press('1') // Again
    const waiting = page.getByTestId('rv2-waiting')
    await expect(waiting).toContainText('1 card coming back soon')
    await expect(waiting.getByRole('timer')).toHaveText(/^\d+:\d\d$/)
    await expect(session(page)).not.toContainText('Question 1')
    await page.clock.fastForward('10:05')
    await expect(session(page)).toContainText('Question 1')
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
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await expect(session(page)).toContainText('Question 2')
    await expect
      .poll(async () => (await dbCounts(page)).logs, { timeout: 3000 })
      .toBe(1)
    expect((await dbCounts(page)).reps.sort()).toEqual([0, 1])

    await page.reload()
    await openReview(page)
    await expect(page.getByTestId('rv2-count')).toHaveText('1')
    await page.getByTestId('rv2-start').click()
    await expect(session(page)).toContainText('Question 2')
    await expect(left(page)).toHaveText('1 left')
    expect((await dbCounts(page)).logs).toBe(1)
  })

  test('double tap on a rating button writes one log row', async ({ page }) => {
    await seed(page, 2)
    await openReview(page)
    await page.getByTestId('rv2-start').click()
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: /^Easy/ }).dblclick()
    await expect(session(page)).toContainText('Question 2')
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
    await expect(session(page)).toContainText('Question 1')
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
      await expect(session(page)).toContainText('Question ' + i)
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
    await expect(session(page)).toContainText('Question 1')
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
    await expect(session(page)).toContainText('Question 2')
    await expect(left(page)).toHaveText('1 left')
    const card = (await page.getByTestId('rv2-card').boundingBox())!
    expect(card.width).toBeLessThanOrEqual(640)
  })
})
