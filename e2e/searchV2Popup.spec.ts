import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  makeCard,
  openSearchPopup,
  sidebar,
  typeInEditor,
} from './helpers.ts'

/**
 * Search v2 popup (slice 4, flag search.v2): SR-B01..SR-B04, SR-B06..SR-B10,
 * SR-B12, SR-B15, SR-B17 and SR-P01. One test per line. The flag is forced
 * with ?flags=search.v2; Professional lines turn on only their own switch for
 * a Beginner. Not here yet (later sub-slices): SR-B05 scope, SR-B11, SR-B13,
 * SR-B14, SR-B16 (the Search screen), SR-P02..SR-P15 (More sheet, filters,
 * scribble).
 */
const FLAG = '/?flags=search.v2'

async function seed(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((l) => {
    try {
      if (!sessionStorage.getItem('srv2-level-set')) {
        sessionStorage.setItem('srv2-level-set', '1')
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: l, unlocked: [] }),
        )
      }
    } catch {
      /* storage blocked */
    }
  }, level)
  await page.goto(FLAG)
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'The nucleus holds DNA')
  await page.keyboard.press('Enter')
  await makeCard(page, 'What does the nucleus hold?', 1)
  await addPage(page, 'Biology', 'Energy')
  await typeInEditor(page, 'Mitochondria make energy')
  await page.waitForTimeout(700) // autosave
}

const chips = (popup: ReturnType<Page['getByRole']>) =>
  popup.locator('[data-chip]')

test.describe('Professional', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, 'professional')
  })

  test('SR-B01 Ctrl K opens with the cursor in the box; Esc closes', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await expect(popup.getByRole('combobox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
  })

  test('SR-B01 Ctrl+Shift+K opens on the Features chip', async ({ page }) => {
    await sidebar(page).waitFor({ state: 'attached' })
    await page.keyboard.press('Control+Shift+K')
    const popup = page.getByRole('dialog', { name: 'Search' })
    await expect(popup.locator('[data-chip="feature"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('SR-B02 results appear as I type in groups with counts, words marked, location line', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await page.keyboard.type('nucleus')
    await expect(popup.getByRole('group', { name: 'Notes' })).toContainText(
      'The nucleus holds DNA',
    )
    await expect(popup.getByRole('group', { name: 'Cards' })).toBeVisible()
    await expect(popup.locator('mark').first()).toHaveText('nucleus')
    await expect(popup.getByRole('group', { name: 'Notes' })).toContainText(
      'Biology',
    )
    // Counts on the chips.
    await expect(popup.locator('[data-chip="note"]')).toContainText(/\d/)
  })

  test('SR-B03 the ✕ clears the text, keeps focus and shows the browse state', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    const box = popup.getByTestId('srv2-box')
    await expect(popup.getByTestId('clr-btn')).toHaveCSS('opacity', '0')
    await page.keyboard.type('nucleus')
    await expect(popup.getByTestId('clr-btn')).toHaveCSS('opacity', '1')
    await popup.getByTestId('clr-btn').click()
    await expect(box).toHaveValue('')
    await expect(box).toBeFocused()
    await expect(popup.getByRole('group', { name: 'Recent' })).toHaveCount(0)
    await expect(popup.getByRole('option').first()).toContainText(
      /Energy|Cells/,
    )
  })

  test('SR-B06 with no text: recent pages, newest first', async ({ page }) => {
    const popup = await openSearchPopup(page)
    await expect(popup.getByRole('option').first()).toContainText('Energy')
  })

  test('SR-B07 arrows move the highlighted row; Enter opens it', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await page.keyboard.type('nucleus')
    await expect(popup.getByRole('option').first()).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(popup.getByRole('option').first()).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.keyboard.press('Enter')
    await expect(popup).toBeHidden()
  })

  test('SR-B08 tapping a Pages result opens the page', async ({ page }) => {
    const popup = await openSearchPopup(page)
    await page.keyboard.type('cells')
    await popup
      .getByRole('group', { name: 'Pages' })
      .getByRole('option')
      .click()
    await expect(popup).toBeHidden()
    await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
      'Cells',
    )
  })

  test('SR-B10 right-click on a result opens the strip: Open, Copy link, Pin as favourite', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await page.keyboard.type('cells')
    await popup.getByTestId('srv2-row').first().click({ button: 'right' })
    const strip = page.getByTestId('srv2-strip')
    await expect(strip).toBeVisible()
    for (const name of [
      'Open',
      'Open in new place',
      'Copy link',
      'Pin as favourite',
    ])
      await expect(
        strip.getByRole('menuitem', { name, exact: true }),
      ).toBeVisible()
    // It did not run the search again or open the page.
    await expect(popup).toBeVisible()
    await strip.getByRole('menuitem', { name: 'Pin as favourite' }).click()
    await expect(strip).toBeHidden()
    await popup.getByTestId('srv2-row').first().click({ button: 'right' })
    await expect(
      page
        .getByTestId('srv2-strip')
        .getByRole('menuitem', { name: 'Remove from favourites' }),
    ).toBeVisible()
  })

  for (const [name, viewport] of [
    ['phone', { width: 390, height: 844 }],
    ['iPad landscape', { width: 1194, height: 834 }],
    ['iPad portrait', { width: 834, height: 1194 }],
    ['short window', { width: 700, height: 360 }],
  ] as const)
    test(`SR-B10 the strip on a result is fully on screen and not covered (${name})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      const popup = await openSearchPopup(page)
      await page.keyboard.type('cells')
      const row = popup.getByTestId('srv2-row').first()
      await expect(row).toBeVisible()
      await row.click({ button: 'right' })
      const strip = page.getByTestId('srv2-strip')
      await expect(strip).toBeVisible()
      const box = (await strip.boundingBox())!
      const rowBox = (await row.boundingBox())!
      // Fully inside the window, 12 px from every edge.
      expect(box.x).toBeGreaterThanOrEqual(12)
      expect(box.y).toBeGreaterThanOrEqual(12)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 12)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 12)
      // Not on top of its own row.
      const apart =
        box.y + box.height <= rowBox.y || box.y >= rowBox.y + rowBox.height
      expect(apart).toBe(true)
      // Nothing is drawn over it: every corner and the middle hit the strip.
      const covered = await strip.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const pts = [
          [r.left + 6, r.top + 6],
          [r.right - 6, r.top + 6],
          [r.left + 6, r.bottom - 6],
          [r.right - 6, r.bottom - 6],
          [r.left + r.width / 2, r.top + r.height / 2],
        ]
        return pts.some(
          ([x, y]) => !el.contains(document.elementFromPoint(x, y)),
        )
      })
      expect(covered).toBe(false)
      // It still works from there.
      await strip.getByRole('menuitem', { name: 'Copy link' }).click()
      await expect(strip).toBeHidden()
    })

  test('SR-B12 no match: Nothing found, and no "arrive with" text anywhere', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await page.keyboard.type('zzzqqq')
    await expect(popup).toContainText('zzzqqq')
    await expect(popup.getByRole('option')).toHaveCount(0)
    await expect(popup).not.toContainText('arrive with')
    await expect(popup).not.toContainText('Soon')
  })

  test('SR-B15 a word that is also a tool shows a Features group on All', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await page.keyboard.type('pen')
    await expect(popup.getByRole('group', { name: 'Features' })).toBeVisible()
  })

  test('SR-B17 and SR-P01 Professional chips: no Soon, no Books or Highlights without the Library', async ({
    page,
  }) => {
    const popup = await openSearchPopup(page)
    await expect(chips(popup)).toHaveText([
      'All',
      'Pages',
      'Notes',
      'Cards',
      'Tasks',
      'Features',
    ])
    await expect(popup).not.toContainText('Soon')
    await popup.locator('[data-chip="task"]').click()
    await expect(popup).not.toContainText('arrive with')
  })
})

test('SR-B04 Beginner chips are All, Pages, Notes, Cards; and the Features group stays', async ({
  page,
}) => {
  await seed(page, 'beginner')
  const popup = await openSearchPopup(page)
  await expect(chips(popup)).toHaveText(['All', 'Pages', 'Notes', 'Cards'])
  await page.keyboard.type('pen')
  await expect(popup.getByRole('group', { name: 'Features' })).toBeVisible()
  // A chip tap filters at once.
  await popup.locator('[data-chip="card"]').click()
  await expect(popup.locator('[data-chip="card"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('SR-P01 search.moreChips adds Tasks and Features for a Beginner (and nothing else)', async ({
  page,
}) => {
  await seed(page, 'beginner')
  await page.evaluate(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: ['search.moreChips'] }),
    ),
  )
  await page.reload()
  const popup = await openSearchPopup(page)
  await expect(chips(popup)).toHaveText([
    'All',
    'Pages',
    'Notes',
    'Cards',
    'Tasks',
    'Features',
  ])
})

test('SR-B17 Books and Highlights chips show only when the Library is on', async ({
  page,
}) => {
  await page.goto('/?flags=search.v2,library.v2')
  await sidebar(page).waitFor({ state: 'attached' })
  const popup = await openSearchPopup(page)
  await expect(chips(popup)).toHaveText([
    'All',
    'Pages',
    'Notes',
    'Cards',
    'Books',
    'Highlights',
    'Tasks',
    'Features',
  ])
  await expect(popup).not.toContainText('Soon')
})
