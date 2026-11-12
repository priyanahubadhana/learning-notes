import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, sidebar } from './helpers.ts'

/**
 * Notebooks home v2 (slice 4, flag notebooks.v2): spec lines NB-B01..NB-B13
 * and the Professional lines NB-P01, NB-P03, NB-P05. One test per line. The
 * flag is forced with ?flags=notebooks.v2; Professional lines turn on only
 * their own switch for a Beginner.
 */
const FLAG = '/?flags=notebooks.v2'

async function start(
  page: Page,
  opts: { level?: 'beginner' | 'professional'; unlocked?: string[] } = {},
) {
  const level = opts.level ?? 'professional'
  const unlocked = opts.unlocked ?? []
  await page.addInitScript(
    ([l, u]) => {
      try {
        // Only at the first load: a test may change the switches and reload.
        if (!sessionStorage.getItem('nbv2-level-set')) {
          sessionStorage.setItem('nbv2-level-set', '1')
          localStorage.setItem(
            'learning-notes:level',
            JSON.stringify({ level: l, unlocked: u }),
          )
        }
      } catch {
        /* storage blocked */
      }
    },
    [level, unlocked] as const,
  )
  await page.goto(FLAG)
  await sidebar(page).waitFor({ state: 'attached' })
}

const home = (page: Page) => page.getByTestId('notebooks-home')
const card = (page: Page, name: string) =>
  home(page).locator('[data-notebook-card]').filter({ hasText: name })
const strip = (page: Page) => page.getByTestId('nbv2-strip')

/**
 * A Beginner's strip shows only Delete and "More actions" (the parts rule);
 * every other item, unlocked or not, lives in that list.
 */
async function openMoreList(page: Page) {
  await strip(page).getByRole('menuitem', { name: 'More actions' }).click()
  await page.getByRole('option', { name: 'Show all' }).click()
}

async function pickFromMore(page: Page, name: string | RegExp) {
  await openMoreList(page)
  await page.getByRole('option', { name }).click()
}

async function openHome(page: Page) {
  const rail = page.locator('[data-space="notebooks"]')
  await rail.click()
  if (!(await home(page).isVisible())) {
    await page.keyboard.press('Escape')
    await rail.click()
  }
  await expect(home(page)).toBeVisible()
  await expect(home(page).getByTestId('nbh-scroll')).toBeVisible()
}

async function twoBooks(page: Page) {
  await createNotebook(page, 'Alpha book', 'A page')
  await createNotebook(page, 'Zeta book', 'Z page')
  await openHome(page)
}

/** Switches on one Professional feature for a Beginner, then reloads. */
async function unlock(page: Page, id: string) {
  await page.evaluate(
    (feature) =>
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [feature] }),
      ),
    id,
  )
  await page.reload()
  await openHome(page)
}

/** Holds the mouse on a locator for 0.65 s (the strip opens at 0.5 s). */
async function hold(page: Page, target: Locator) {
  const box = await target.boundingBox()
  if (!box) throw new Error('nothing to hold')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3)
  await page.mouse.down()
  await page.waitForTimeout(650)
  await page.mouse.up()
}

test('NB-B01 home shows title, New notebook, Shelf / List, tabs and covers; no space switcher', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await expect(home(page)).toHaveAttribute('data-v2', 'true')
  await expect(
    home(page).getByRole('heading', { name: 'Notebooks' }),
  ).toBeVisible()
  await expect(home(page).getByTestId('nbh-new')).toBeVisible()
  await expect(home(page).locator('[data-layout="shelf"]')).toBeVisible()
  await expect(home(page).locator('[data-layout="list"]')).toBeVisible()
  await expect(home(page).getByRole('tab')).toHaveText([
    'All',
    'Starred',
    'Recent',
  ])
  await expect(card(page, 'Alpha book')).toBeVisible()
  await expect(page.locator('[data-space-switcher]')).toHaveCount(0)
})

test('NB-B02 Starred shows only pinned ones; none says how to pin', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await home(page).getByRole('tab', { name: 'Starred' }).click()
  await expect(home(page).getByTestId('nbh-empty')).toContainText(
    'Pin a notebook and it will show here',
  )
  await home(page).getByRole('tab', { name: 'All' }).click()
  await home(page).getByRole('button', { name: 'Pin Zeta book' }).click()
  await home(page).getByRole('tab', { name: 'Starred' }).click()
  await expect(card(page, 'Zeta book')).toBeVisible()
  await expect(card(page, 'Alpha book')).toHaveCount(0)
})

test('NB-B03 Recent lists opened notebooks with the day they were opened', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await home(page).getByRole('tab', { name: 'Recent' }).click()
  await expect(card(page, 'Zeta book')).toContainText('Today')
})

test('NB-B04 tapping a cover opens the notebook and leaves the home', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await card(page, 'Alpha book').getByRole('button').first().click()
  await expect(home(page)).toBeHidden()
})

test('NB-B06 New notebook asks for a name, creates it at the end and opens it', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await home(page).getByTestId('nbh-new').click()
  const dialog = page.getByTestId('nbv2-new-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await dialog.getByRole('textbox').fill('Chemistry')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('Notebook created')).toBeVisible()
  await expect(home(page)).toBeHidden()
  await expect(
    sidebar(page).getByRole('button', { name: 'Chemistry', exact: true }),
  ).toBeVisible()
})

test('NB-B07 the star pins at once and fills', async ({ page }) => {
  await start(page)
  await twoBooks(page)
  await home(page).getByRole('button', { name: 'Pin Zeta book' }).click()
  await expect(
    home(page).locator('[data-notebook-card]').first(),
  ).toContainText('Zeta book')
  await expect(
    home(page).getByRole('button', { name: 'Unpin Zeta book' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('NB-B08 holding a cover opens the strip; right-click does too', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  const cover = card(page, 'Alpha book')
  await hold(page, cover)
  await expect(strip(page)).toBeVisible()
  for (const name of [
    'Open',
    'Pin to the top',
    'Rename',
    'Cover and settings',
    'Delete',
  ])
    await expect(strip(page).getByRole('menuitem', { name })).toBeVisible()
  await expect(home(page)).toBeVisible() // the hold did not open the notebook
  await page.keyboard.press('Escape')
  await expect(strip(page)).toBeHidden()
  await cover.click({ button: 'right' })
  await expect(strip(page)).toBeVisible()
})

test('NB-B08 Pin in the strip pins; the Undo toast unpins', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await card(page, 'Zeta book').click({ button: 'right' })
  await strip(page).getByRole('menuitem', { name: 'Pin to the top' }).click()
  await expect(
    home(page).getByRole('button', { name: 'Unpin Zeta book' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    home(page).getByRole('button', { name: 'Pin Zeta book' }),
  ).toBeVisible()
})

test('NB-B08 Rename in the strip renames the notebook', async ({ page }) => {
  await start(page)
  await twoBooks(page)
  await card(page, 'Alpha book').click({ button: 'right' })
  await strip(page).getByRole('menuitem', { name: 'Rename' }).click()
  const dialog = page.getByTestId('nbv2-rename-dialog')
  await dialog.getByRole('textbox').fill('Alpha renamed')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(card(page, 'Alpha renamed')).toBeVisible()
})

test('NB-B09 Delete asks with the page count, moves to Trash, Undo restores', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await card(page, 'Alpha book').click({ button: 'right' })
  await strip(page).getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByTestId('nbv2-delete-dialog')
  await expect(dialog).toContainText('You can undo this.')
  await expect(dialog).toContainText('1 page')
  await dialog.getByRole('button', { name: 'Move to Trash' }).click()
  await expect(card(page, 'Alpha book')).toHaveCount(0)
  await expect(page.getByText('Moved “Alpha book” to Trash')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(card(page, 'Alpha book')).toBeVisible()
})

test('NB-B10 Shelf / List switch changes the layout and is remembered', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await home(page).locator('[data-layout="list"]').click()
  await expect(home(page).locator('[data-layout="list"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.reload()
  await openHome(page)
  await expect(home(page).locator('[data-layout="list"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('NB-B11 Continue where you stopped shows at most 4 notebooks', async ({
  page,
}) => {
  await start(page)
  await twoBooks(page)
  await page.reload()
  await openHome(page)
  const cont = page.getByTestId('nbv2-continue')
  await expect(cont).toBeVisible()
  const cards = cont.getByTestId('nbv2-continue-card')
  expect(await cards.count()).toBeLessThanOrEqual(4)
  await cards.first().click()
  await expect(home(page)).toBeHidden()
})

test('NB-B13 with no notebook left there is no blank screen, and Undo brings it back', async ({
  page,
}) => {
  await start(page)
  await createNotebook(page, 'Only book', 'A page')
  await openHome(page)
  await card(page, 'Only book').click({ button: 'right' })
  await strip(page).getByRole('menuitem', { name: 'Delete' }).click()
  await page
    .getByTestId('nbv2-delete-dialog')
    .getByRole('button', { name: 'Move to Trash' })
    .click()
  // Today the app itself shows its empty page (with New notebook) here.
  await expect(
    page.getByRole('button', { name: 'Create notebook' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await openHome(page)
  await expect(card(page, 'Only book')).toBeVisible()
})

test('NB-P01 Find a notebook filters as I type; ✕ clears (needs nb.find)', async ({
  page,
}) => {
  await start(page, { level: 'beginner' })
  await twoBooks(page)
  await expect(home(page).getByTestId('nbv2-find')).toHaveCount(0)
  await unlock(page, 'nb.find')
  const find = home(page).getByTestId('nbv2-find')
  await find.fill('zeta')
  await expect(card(page, 'Zeta book')).toBeVisible()
  await expect(card(page, 'Alpha book')).toHaveCount(0)
  await find.fill('nothing')
  await expect(home(page).getByTestId('nbh-empty')).toContainText(
    'No notebooks match.',
  )
  await home(page)
    .getByRole('button', { name: /^Clear/ })
    .click()
  await expect(find).toHaveValue('')
  await expect(card(page, 'Alpha book')).toBeVisible()
})

test('NB-P03 Move to top and Undo in the strip (needs nb.move)', async ({
  page,
}) => {
  await start(page, { level: 'beginner' })
  await twoBooks(page)
  await unlock(page, 'nb.move')
  await card(page, 'Zeta book').click({ button: 'right' })
  await pickFromMore(page, 'Move to top')
  await expect(
    home(page).locator('[data-notebook-card]').first(),
  ).toContainText('Zeta book')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    home(page).locator('[data-notebook-card]').first(),
  ).toContainText('Alpha book')
})

test('NB-P05 Add empty page in the strip adds a page and opens it (needs nb.addEmptyPage)', async ({
  page,
}) => {
  await start(page, { level: 'beginner' })
  await twoBooks(page)
  await unlock(page, 'nb.addEmptyPage')
  await card(page, 'Alpha book').click({ button: 'right' })
  await pickFromMore(page, 'Add empty page')
  await expect(home(page)).toBeHidden()
})

test('A Beginner sees no Professional items in the strip', async ({ page }) => {
  await start(page, { level: 'beginner' })
  await twoBooks(page)
  await card(page, 'Alpha book').click({ button: 'right' })
  await expect(strip(page)).toBeVisible()
  // Nothing is unlocked, so the whole list fits without "Show all".
  await strip(page).getByRole('menuitem', { name: 'More actions' }).click()
  await expect(page.getByRole('option', { name: 'Rename' })).toBeVisible()
  for (const name of [
    'Add empty page',
    'Add from template…',
    'Review this notebook',
    'Move up',
  ])
    await expect(page.getByRole('option', { name })).toHaveCount(0)
})
