import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Task 0.6: Settings › Try new features › "Test a phase". SET-B26a to B26f.
 * The preset sets mirror the table in docs/plans/phases/phase-1.md.
 */

const FLAGS_KEY = 'learning-notes:flags'
const PHASES: { label: string; ids: string[] }[] = [
  {
    label: 'Phase 1',
    ids: [
      'foundation.shell',
      'settings.v3',
      'storage.safety',
      'update.v2',
      'security.m1',
    ],
  },
  { label: 'Up to Phase 2A', ids: ['toolbar.v8', 'page.menus'] },
  { label: 'Up to Phase 2B', ids: ['textbox.v2'] },
  { label: 'Up to Phase 3', ids: ['notebooks.v2'] },
  { label: 'Up to Phase 4', ids: ['search.v2'] },
  { label: 'Up to Phase 5', ids: ['home.v2', 'library.v2'] },
  { label: 'Up to Phase 6', ids: ['review.v2', 'study.v2'] },
  { label: 'Up to Phase 7', ids: ['reader.v2'] },
  { label: 'Up to Phase 8', ids: ['ai.framework'] },
]

const storedFlags = (page: Page) =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? 'null') as string[] | null,
    FLAGS_KEY,
  )

async function openTryNew(page: Page) {
  await page.goto('/#/settings')
  await expect(
    page.locator('main').getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible({ timeout: 45_000 })
  await page
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: /^Try new features/ })
    .click()
}

const region = (page: Page, name: string) =>
  page.locator('main').getByRole('region', { name, exact: true })
/** The old Settings screen uses its own list; the new one uses the shared ▾ card. */
async function pickPhase(page: Page, label: string) {
  const list = region(page, 'Test a phase').getByRole('combobox')
  await list.selectOption({ label })
}
const phaseIsOn = (page: Page) =>
  region(page, 'Test this phase').getByRole('button', {
    name: 'On',
    exact: true,
  })

test('SET-B26a the old Settings screen: choose a phase, nothing changes until the switch is On', async ({
  page,
}) => {
  await openTryNew(page)
  const rows = page.locator('main [data-setting-id^="tryNewPreset."]')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('Test a phase')
  await expect(phaseIsOn(page)).toHaveAttribute('aria-pressed', 'false')
  await pickPhase(page, 'Up to Phase 2A')
  expect(await storedFlags(page)).toBeNull()
  await phaseIsOn(page).click()
  await expect
    .poll(async () => (await storedFlags(page))?.sort())
    .toEqual([...PHASES[0].ids, ...PHASES[1].ids].sort())
})

test('SET-B26b to B26e the new Settings: shared ▾ list and one switch; reload keeps On; one change turns it Off; Off clears all', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      )
      sessionStorage.setItem('seeded', '1')
    }
  })
  await page.goto('/?flags=settings.v3#/settings/help')
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  const tap = page.locator('[data-version-tap]')
  for (let i = 0; i < 5; i++) await tap.click()
  const rows = page.locator('[data-setting-id^="tryNewPreset."]')
  const sw = () => rows.nth(1).getByRole('switch')
  const choose = async (label: string) => {
    await rows.first().locator('.sv3-select').click()
    await page.getByRole('radio', { name: label, exact: true }).click()
    await expect(page.getByRole('radiogroup')).toHaveCount(0)
  }
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('Test a phase')
  await expect(sw()).not.toBeChecked()

  await choose('Up to Phase 2A')
  expect(await storedFlags(page)).toBeNull() // choosing while Off applies nothing
  await sw().click()
  await expect(sw()).toBeChecked()
  expect((await storedFlags(page))!.sort()).toEqual(
    [...PHASES[0].ids, ...PHASES[1].ids].sort(),
  )

  // B26c: still On after a reload, same phase shown.
  await page.reload()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await expect(sw()).toBeChecked()
  await expect(rows.first()).toContainText('Up to Phase 2A')

  // B26b: choosing another phase while On applies it at once.
  await choose('Up to Phase 3')
  await expect
    .poll(async () => (await storedFlags(page))?.includes('notebooks.v2'))
    .toBe(true)
  expect(await storedFlags(page)).not.toContain('search.v2')
  await expect(sw()).toBeChecked()

  // B26d: one single switch below changes it, the preset reads Off by itself.
  await page
    .locator('[data-setting-id="tryNew.textbox.v2"]')
    .getByRole('switch')
    .click()
  await expect(sw()).not.toBeChecked()

  // B26e: On again, then Off: every new part is off.
  await sw().click()
  await expect(sw()).toBeChecked()
  await sw().click()
  await expect.poll(() => storedFlags(page)).toEqual([])
})

test('SET-B26h Undo of the preset switch gives back the exact earlier list of switches', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      )
      localStorage.setItem(
        'learning-notes:flags',
        JSON.stringify(['settings.v3', 'reader.v2', 'media.v2']),
      )
      sessionStorage.setItem('seeded', '1')
    }
  })
  await page.goto('/#/settings/help')
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  const tap = page.locator('[data-version-tap]')
  for (let i = 0; i < 5; i++) await tap.click()
  const rows = page.locator('[data-setting-id^="tryNewPreset."]')
  const sw = rows.nth(1).getByRole('switch')
  await sw.click()
  await expect(sw).toBeChecked()
  expect((await storedFlags(page))!.sort()).toEqual(
    PHASES[0].ids.slice().sort(),
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await expect(sw).not.toBeChecked()
  expect((await storedFlags(page))!.sort()).toEqual([
    'media.v2',
    'reader.v2',
    'settings.v3',
  ])
})

/** B26f: every preset loads the app and the main screens open without an error. */
test.describe('SET-B26f each preset loads and moves between the screens', () => {
  test.describe.configure({ timeout: 180_000 })
  const all = [
    ...PHASES.map((p, i) => ({
      label: p.label,
      ids: PHASES.slice(0, i + 1).flatMap((x) => x.ids),
    })),
    { label: 'Everything', ids: null as string[] | null },
  ]
  for (const preset of all) {
    test(preset.label, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))

      // Make a notebook and a page with the old screens, then switch the preset on.
      await page.goto('/#/')
      await createNotebook(page, 'Preset book', 'Preset page')
      const pageUrl = page.url()
      await page.evaluate((k) => localStorage.removeItem(k), FLAGS_KEY)

      await openTryNew(page)
      await pickPhase(page, preset.label)
      await phaseIsOn(page).click()
      if (preset.ids)
        expect((await storedFlags(page))!.sort()).toEqual(
          [...preset.ids].sort(),
        )

      await page.reload()
      // Each screen is proven by its own heading or landmark, not by a pause.
      const main = page.locator('main')
      const heading = (name: string) =>
        main.getByRole('heading', { name, level: 1 })
      const titleBox = page.getByRole('textbox', { name: 'Page title' })
      const go = async (hash: string, shown: () => Locator) => {
        await page.evaluate((h) => (location.hash = h), hash)
        await expect(shown()).toBeVisible({ timeout: 45_000 })
      }
      // Home opens the notebooks list or the page you were last on.
      await go('#/', () => heading('Notebooks').or(titleBox))
      await go('#/library', () => heading('Notebooks'))
      await go('#/notebooks', () => heading('Notebooks'))
      await go('#/settings', () => heading('Settings'))
      await go(new URL(pageUrl).hash, () => titleBox)
      await expect(titleBox).toHaveValue('Preset page')
      expect(errors).toEqual([])
    })
  }
})
