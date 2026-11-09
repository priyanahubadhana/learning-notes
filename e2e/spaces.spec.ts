import { expect, test, type Page } from '@playwright/test'
import {
  corner,
  cornerAction,
  createNotebook,
  openCorner,
  openSearchPopup,
  openTrash,
  sidebar,
  typeInEditor,
} from './helpers.ts'

/**
 * Step 4a: the four spaces (strip on a computer, tab bar on a phone), the
 * quiet corner, the one Search, hiding a space and deep links.
 */

const strip = (page: Page) => page.getByRole('navigation', { name: 'Spaces' })
const space = (page: Page, name: string) =>
  strip(page).getByRole('button', { name: `Space: ${name}` })

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('the strip has four spaces; each shows only its own list', async ({
  page,
}) => {
  await start(page)
  for (const name of ['Home', 'Library', 'Notebooks', 'Review']) {
    await expect(space(page, name)).toBeVisible()
  }
  await expect(space(page, 'Notebooks')).toHaveAttribute('aria-current', 'page')
  const side = sidebar(page)
  // Notebooks: the notebook tree, calendar, databases, favourites, recent.
  await expect(
    side.getByRole('button', { name: 'Biology', exact: true }),
  ).toBeVisible()
  await expect(side.getByRole('button', { name: 'Calendar' })).toBeVisible()

  await space(page, 'Review').click()
  await expect(space(page, 'Review')).toHaveAttribute('aria-current', 'page')
  await expect(side.getByRole('button', { name: /^Review/ })).toBeVisible()
  await expect(side.getByRole('button', { name: 'All cards' })).toBeVisible()
  await expect(side.getByRole('button', { name: 'Biology' })).toHaveCount(0)
  await expect(side.getByRole('button', { name: 'Calendar' })).toHaveCount(0)

  await space(page, 'Library').click()
  await expect(side.getByRole('button', { name: '+ Capture' })).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Library' }),
  ).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Import a book' }),
  ).toBeEnabled()
  await expect(side.getByRole('button', { name: 'All cards' })).toHaveCount(0)

  await space(page, 'Home').click()
  const today = page
    .getByRole('main')
    .getByRole('button', { name: /Open today’s journal/ })
  await expect(today).toBeVisible()
  await today.click()
  // The journal is a notebook page, so the sidebar moves to Notebooks.
  await expect(space(page, 'Notebooks')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeVisible()
})

test('the last space is remembered on this device', async ({ page }) => {
  await start(page)
  await space(page, 'Library').click()
  await page.reload()
  await expect(space(page, 'Library')).toHaveAttribute('aria-current', 'page')
  await expect(
    sidebar(page).getByRole('button', { name: '+ Capture' }),
  ).toBeVisible()
})

test('every old sidebar item is still reachable', async ({ page }) => {
  await start(page)
  const side = sidebar(page)
  // Notebooks space
  for (const name of [
    /^Open today/,
    'Search',
    /^Review/,
    'All cards',
    'Calendar',
    'Databases',
    'Biology',
  ]) {
    await expect(
      side.getByRole('button', { name }).first(),
      String(name),
    ).toBeVisible()
  }
  await expect(side.getByRole('button', { name: /^Tags/ })).toBeVisible()
  await expect(side.getByRole('button', { name: /^Templates/ })).toBeVisible()
  // Review space
  await space(page, 'Review').click()
  await expect(side.getByRole('button', { name: 'All cards' })).toBeVisible()
  // Quiet corner
  await openTrash(page)
  const panel = corner(page)
  for (const name of ['Settings', 'Save & restore', 'Help', 'Device mode']) {
    await expect(panel.getByRole('button', { name })).toBeVisible()
  }
  for (const theme of ['Day', 'Night', 'Sepia']) {
    await expect(
      panel.getByRole('button', { name: theme, exact: true }),
    ).toBeVisible()
  }
  await expect(panel.getByText('Trash is empty')).toBeVisible()
})

test('quiet corner: Settings, Save & restore, Theme, Device mode and Help', async ({
  page,
}) => {
  await start(page)
  await cornerAction(page, 'Settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(corner(page)).toHaveCount(0) // it closes after the choice
  await cornerAction(page, 'Save & restore')
  await expect(
    page.getByRole('heading', { name: 'Save & restore', level: 1 }),
  ).toBeVisible()
  // The theme stays open, and the choice is ticked.
  const panel = await openCorner(page)
  await panel.getByRole('button', { name: 'Night', exact: true }).click()
  await expect(
    panel.getByRole('button', { name: 'Night', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await panel.getByRole('button', { name: 'Day', exact: true }).click()
  // Device mode opens its list.
  await panel.getByRole('button', { name: /^Device mode/ }).click()
  await expect(page.getByRole('menuitemradio', { name: /Touch/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(corner(page)).toHaveCount(0)
  // Help opens the Show help setting.
  await cornerAction(page, 'Help')
  await expect(
    page.locator('[data-setting-id="general.showHelp"]'),
  ).toBeVisible()
})

test('one Search: groups, chips, and both shortcuts', async ({ page }) => {
  await start(page)
  for (const keys of ['Control+K', 'Control+Shift+K']) {
    await page.keyboard.press(keys)
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Search' })).toHaveCount(0)
  }
  const popup = await openSearchPopup(page)
  const chips = popup.getByRole('group', { name: 'Show' })
  for (const name of [
    'All',
    'Pages',
    'Books',
    'Highlights',
    'Cards',
    'Tasks',
    'Features',
  ]) {
    await expect(chips.getByRole('button', { name, exact: true })).toBeVisible()
  }
  await popup.getByRole('combobox').fill('First')
  await expect(popup.getByRole('group', { name: 'Pages' })).toBeVisible()
  await popup.getByRole('combobox').fill('paste')
  await expect(popup.getByRole('group', { name: 'Features' })).toBeVisible()
  // A chip narrows to one group.
  await chips.getByRole('button', { name: 'Cards', exact: true }).click()
  await expect(popup.getByRole('group', { name: 'Features' })).toHaveCount(0)
  await chips.getByRole('button', { name: 'Features', exact: true }).click()
  await expect(popup.getByRole('group', { name: 'Features' })).toBeVisible()
  // Books, Highlights and Tasks arrive in later steps and say so.
  await chips.getByRole('button', { name: 'Books', exact: true }).click()
  await expect(popup.getByText(/Books arrive with the Library/)).toBeVisible()
})

test('Settings can hide a whole space; Notebooks stays', async ({ page }) => {
  await start(page)
  await page.goto('/#/settings')
  const choice = page.getByRole('group', { name: 'Library space' })
  await choice.getByRole('button', { name: 'Hide' }).click()
  await expect(space(page, 'Library')).toHaveCount(0)
  await expect(space(page, 'Home')).toBeVisible()
  await page.reload()
  await expect(space(page, 'Library')).toHaveCount(0)
  await expect(space(page, 'Notebooks')).toBeVisible()
  // Hiding the space you are in moves you to Notebooks.
  await page
    .getByRole('group', { name: 'Review space' })
    .getByRole('button', { name: 'Hide' })
    .click()
  await expect(space(page, 'Review')).toHaveCount(0)
  await page
    .getByRole('group', { name: 'Library space' })
    .getByRole('button', { name: 'Show' })
    .click()
  await expect(space(page, 'Library')).toBeVisible()
})

test('deep links keep working and choose the matching space', async ({
  page,
}) => {
  await start(page)
  const pageHash = await page.evaluate(() => location.hash)
  expect(pageHash).toMatch(/^#\/page\//)
  await space(page, 'Library').click()
  await page.goto('/#/review')
  await expect(space(page, 'Review')).toHaveAttribute('aria-current', 'page')
  await page.goto('/#/cards')
  await expect(space(page, 'Review')).toHaveAttribute('aria-current', 'page')
  await page.goto(`/${pageHash}`)
  await expect(space(page, 'Notebooks')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
  await page.goto('/#/calendar')
  await expect(space(page, 'Notebooks')).toHaveAttribute('aria-current', 'page')
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('a bottom tab bar with four labelled tabs and the quiet corner', async ({
    page,
  }) => {
    await start(page)
    const bar = strip(page)
    await expect(bar).toBeVisible()
    const box = (await bar.boundingBox())!
    expect(box.y + box.height).toBeGreaterThan(830) // at the bottom edge
    expect(box.width).toBeGreaterThan(380) // across the screen
    for (const name of ['Home', 'Library', 'Notebooks', 'Review']) {
      await expect(space(page, name)).toBeVisible()
      await expect(bar.getByText(name, { exact: true })).toBeVisible() // label
    }
    // Review opens its list in the drawer.
    await space(page, 'Review').tap()
    await expect(sidebar(page)).toBeVisible()
    await expect(
      sidebar(page).getByRole('button', { name: 'All cards' }),
    ).toBeVisible()
    // The corner is on the bar too.
    await page.getByRole('button', { name: 'Quiet corner' }).tap()
    await expect(
      corner(page).getByRole('button', { name: 'Settings' }),
    ).toBeVisible()
    await corner(page).getByRole('button', { name: 'Settings' }).tap()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('Library shows its page on a phone', async ({ page }) => {
    await start(page)
    await space(page, 'Library').tap()
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Library' }),
    ).toBeVisible()
  })
})
