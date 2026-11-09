import { expect, test, type Page } from '@playwright/test'
import {
  cardRecordCount,
  highlighted,
  createNotebook,
  selectText,
  typeInEditor,
  openSidebar,
  pageAction,
  cornerAction,
  setTheme,
  rowAction,
} from './helpers.ts'

// The Review screen (not the page's "Linked from" section).
const review = (page: Page) =>
  page.locator('main section:not([aria-labelledby^="linked-from"])')
const reviewButton = async (page: Page) =>
  (await openSidebar(page)).getByRole('button', { name: /^Review(?! this)/ })

/** Writes a question, turns it into a card and types the answer. */
async function makeCard(page: Page, question: string, answer: string) {
  await typeInEditor(page, question)
  await page.locator('.bn-block-content', { hasText: question }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type(answer)
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)
}

/** Writes a sentence and hides `words` as a fill-in-the-blank. */
async function makeBlank(page: Page, sentence: string, words: string) {
  await typeInEditor(page, sentence)
  await selectText(page, words)
  await page
    .getByRole('button', { name: 'Make blank (hide these words in review)' })
    .click()
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)
}

test('review a card: reveal, intervals, Again stays hidden until due', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S1?', 'Mitral and tricuspid')

  await expect(await reviewButton(page)).toContainText('1')
  await (await reviewButton(page)).click()
  await expect(review(page)).toContainText('Which valves close in S1?')
  await expect(review(page)).not.toContainText('Mitral and tricuspid')

  await page.keyboard.press('Space')
  await expect(review(page)).toContainText('Mitral and tricuspid')
  const ratings = review(page).getByRole('group', { name: /Rate how well/ })
  await expect(ratings.getByRole('button')).toHaveText([
    'Again10 min',
    'Hard10 min',
    'Good10 min',
    /^Easy\d+ days$/,
  ])

  // Again: hidden, with a countdown, until its 10 minutes are up.
  await page.keyboard.press('1')
  await expect(review(page)).toContainText(
    'Done for now — 1 card comes back in',
  )
  await expect(review(page)).not.toContainText('Which valves close in S1?')
  await page.clock.fastForward('09:00')
  await expect(review(page)).not.toContainText('Which valves close in S1?')
  await page.clock.fastForward('01:05')
  await expect(review(page)).toContainText('Which valves close in S1?')

  // FSRS: a new card repeats once more after 10 minutes, then gets days.
  await page.keyboard.press('Enter')
  await page.keyboard.press('3') // Good
  await expect(review(page)).toContainText(
    'Done for now — 1 card comes back in',
  )
  await page.clock.fastForward('10:05')
  await expect(review(page)).toContainText('Which valves close in S1?')
  await page.keyboard.press('Enter')
  await expect(ratings.getByRole('button').nth(2)).toHaveText(/^Good\d+ days?$/)
  await page.keyboard.press('3') // Good
  await expect(review(page)).toContainText('All caught up.')
  await expect(review(page)).toContainText('You reviewed 3 cards.')
  await expect(await reviewButton(page)).toHaveText(/^\S*\s*Review$/)

  // "Got wrong (7 days)": the card rated Again comes back as practice.
  await review(page).getByRole('button', { name: 'Got wrong (7 days)' }).click()
  await expect(review(page)).toContainText('Which valves close in S1?')
  await expect(review(page)).toContainText('schedule stays the same')
})

test('blanks show "…" until revealed; Practice anyway; Suspend with Undo', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeBlank(page, 'S2 closes the aortic valve', 'aortic')

  // Review this page, from the ⋯ menu.
  await pageAction(page, 'Review this page')
  await expect(review(page).locator('.review-blank')).toHaveText('…')
  await expect(review(page)).not.toContainText('aortic')
  await review(page).getByRole('button', { name: 'Show answer' }).click()
  await expect(review(page).locator('mark')).toHaveText('aortic')
  // Easy skips the short steps.
  await review(page).getByRole('button', { name: /^Easy/ }).click()
  await expect(review(page)).toContainText('All caught up.')

  // Practice anyway: the card is not due, so its schedule stays the same.
  await review(page).getByRole('button', { name: 'Practice anyway' }).click()
  await expect(review(page)).toContainText('schedule stays the same')
  await page.keyboard.press('Space')
  await page.keyboard.press('1') // Again repeats in the session
  await expect(review(page).locator('.review-blank')).toBeVisible()

  // Suspend, then Undo brings the card back.
  await review(page).getByRole('button', { name: 'Suspend' }).click()
  await expect(page.getByRole('status')).toContainText('Card suspended')
  await expect(review(page)).toContainText('All caught up.')
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(review(page).locator('.review-blank')).toBeVisible()

  // Open note goes back to the page and highlights the card.
  await review(page).getByRole('button', { name: 'Open note' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Heart sounds',
  )
  await expect.poll(() => highlighted(page)).not.toBe('')
})

test('Settings: Simple steps scheduler changes the button gaps', async ({
  page,
}) => {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  const scheduler = page.getByRole('combobox', { name: 'Scheduler' })
  await expect(scheduler).toHaveValue('fsrs')
  const target = page.getByRole('textbox', { name: 'Target memory' })
  const steps = page.getByRole('region', { name: 'Steps for “Good”' })
  await expect(target).toHaveValue('90')
  await expect(steps).toBeHidden()
  await scheduler.selectOption({ label: 'Simple steps' })
  await expect(steps).toBeVisible()
  await expect(target).toBeHidden()

  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await makeCard(page, 'Which valves close in S2?', 'Aortic and pulmonary')
  await (await reviewButton(page)).click()
  await expect(review(page)).toContainText('Which valves close in S2?')
  await page.keyboard.press('Space')
  const ratings = review(page).getByRole('group', { name: /Rate how well/ })
  await expect(ratings.getByRole('button')).toHaveText([
    'Again10 min',
    'Hard1 day',
    'Good1 day',
    'Easy3 days',
  ])
})

test('notebook review and empty states', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Empty', 'Nothing here')
  await rowAction(page, 'Empty', 'Review this notebook')
  await expect(review(page)).toContainText('No cards here yet.')
  await expect(
    review(page).getByRole('button', { name: 'Practice anyway' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(review(page)).toHaveCount(0)
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
  ['Night', 844, 390],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await page.goto('/')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await makeCard(
      page,
      'Which valves close in S1, and what does the sound mark?',
      'Mitral and tricuspid; the start of systole.',
    )
    await setTheme(page, theme)
    await page.setViewportSize({ width, height })
    await (await reviewButton(page)).click()
    await expect(review(page)).toContainText('Which valves close in S1')
    await page.keyboard.press('Space')

    // The rating buttons are on screen (pinned to the bottom on phones).
    const good = review(page).getByRole('button', { name: /^Good/ })
    await expect(good).toBeInViewport()
    const box = await good.boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(height)
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/review-${theme}-${width}x${height}.png`,
    })
  })
}
