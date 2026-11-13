// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'

/** Settings v3 Professional features: SET-B37 to B44, B46 (Why pop-up) and SET-P01 to P29. */

test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

const BEGINNER = JSON.stringify({ level: 'beginner', unlocked: [] })
const state = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('learning-notes:level') ?? '{}') as {
        level?: string
        unlocked?: string[]
      },
  )
const feature = (page: Page, id: string) =>
  page.locator(`[data-pro-feature="${id}"]`)
const sw = (page: Page, id: string) => feature(page, id).getByRole('switch')

/** Waits until the box stops moving (the pattern of slice 0g's settled()), so a click or a size never lands mid-animation. */
async function settled(l: Locator) {
  let last = ''
  await expect
    .poll(async () => {
      const now = JSON.stringify(await l.boundingBox())
      const same = now === last
      last = now
      return same
    })
    .toBe(true)
}

async function open(page: Page, section: string, level = BEGINNER) {
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('learning-notes:level', v)
      sessionStorage.setItem('seeded', '1')
    }
  }, level)
  await page.goto(`/?flags=settings.v3#/settings/${section}`)
  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test('SET-B37 every switch is listed in groups with "n of N on"', async ({
  page,
}) => {
  await open(page, 'pro')
  const groups = page.locator('[data-pro-group]')
  await expect(groups.first()).toHaveAttribute('data-pro-group', 'home')
  await expect(groups.nth(8)).toHaveAttribute('data-pro-group', 'settings')
  expect(await page.locator('[data-pro-feature]').count()).toBe(219)
  await expect(page.locator('[data-pro-total]')).toHaveText('0 of 219 on')
  await expect(
    page.locator('[data-pro-group="home"] [data-pro-count]'),
  ).toHaveText('0 of 2 on')
})

test('SET-B38 the feature search filters by name and by what it does; the X clears it', async ({
  page,
}) => {
  await open(page, 'pro')
  const box = page.getByRole('searchbox', { name: 'Search features' })
  await box.fill('frosted')
  await expect(page.locator('[data-pro-feature]')).toHaveCount(1)
  await expect(feature(page, 'general.reduceGlass')).toBeVisible()
  await box.fill('zzzz')
  await expect(page.locator('[data-pro-empty]')).toHaveText(
    'No Professional feature matches',
  )
  await page
    .locator('[data-pro-top]')
    .getByRole('button', { name: /clear/i })
    .click()
  expect(await page.locator('[data-pro-feature]').count()).toBe(219)
})

test('SET-B39 one switch on in Beginner: the feature shows at once with a glow, the app stays Beginner, toast with Undo', async ({
  page,
}) => {
  await open(page, 'pro')
  await settled(sw(page, 'general.reduceGlass'))
  await sw(page, 'general.reduceGlass').click()
  await expect(page.getByText('Reduce glass is on')).toBeVisible()
  await expect(feature(page, 'general.reduceGlass')).toHaveAttribute(
    'data-glow',
    'on',
  )
  expect((await state(page)).level).toBe('beginner')
  await page.locator('[data-section="general"]').click()
  const row = page.locator('[data-setting-id="general.reduceGlass"]')
  await expect(row).toBeVisible()
  await expect(row).toHaveAttribute('data-glow', 'on')
  // Undo from the toast turns it off again.
  await page.getByRole('button', { name: 'Undo' }).first().click()
  await expect(row).toHaveCount(0)
  expect((await state(page)).unlocked).toEqual([])
})

test('SET-B40 turn on / off all in a group is one Undo step', async ({
  page,
}) => {
  await open(page, 'pro')
  const group = page.locator('[data-pro-group="home"]')
  await settled(group.locator('[data-pro-all]'))
  await group.locator('[data-pro-all]').click()
  await expect(group.locator('[data-pro-count]')).toHaveText('2 of 2 on')
  await expect(group.locator('[data-pro-all]')).toContainText(
    'Turn off all in this group',
  )
  expect((await state(page)).unlocked).toEqual([
    'home.builtFrom',
    'home.cardSizes',
  ])
  await page.getByTestId('sv3-undo').click()
  await expect(group.locator('[data-pro-count]')).toHaveText('0 of 2 on')
  await page.getByTestId('sv3-redo').click()
  await expect(group.locator('[data-pro-count]')).toHaveText('2 of 2 on')
  await settled(group.locator('[data-pro-all]'))
  await group.locator('[data-pro-all]').click()
  await expect(group.locator('[data-pro-count]')).toHaveText('0 of 2 on')
})

test('SET-B41 Reset to Beginner asks first, turns every switch off, and Undo brings them back', async ({
  page,
}) => {
  await open(page, 'pro')
  await sw(page, 'home.builtFrom').click()
  await sw(page, 'general.reduceGlass').click()
  await page.locator('[data-pro-reset]').click()
  const dialog = page.getByTestId('sv3-pro-reset-dialog')
  await expect(dialog).toContainText('Turn off 2 Professional features')
  await dialog.locator('[data-pro-reset-confirm]').click()
  await expect(page.locator('[data-pro-total]')).toHaveText('0 of 219 on')
  expect((await state(page)).unlocked).toEqual([])
  await page.getByTestId('sv3-undo').click()
  await expect(page.locator('[data-pro-total]')).toHaveText('2 of 219 on')
})

test('SET-B42 a Professional row has "Show in Beginner", in step with the central list', async ({
  page,
}) => {
  await open(page, 'pro')
  await sw(page, 'general.reduceGlass').click()
  await page.locator('[data-section="general"]').click()
  const row = page.locator('[data-setting-id="general.reduceGlass"]')
  const toggle = row.getByRole('switch', {
    name: 'Show Reduce glass in Beginner',
  })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(row).toHaveCount(0)
  await page.locator('[data-section="pro"]').click()
  await expect(sw(page, 'general.reduceGlass')).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

// page.pastedChip starts off in Professional (PM-44), so Professional reads 218 of 219 on.
test('SET-B43 Professional reads every switch as on and keeps the stored choices for Beginner', async ({
  page,
}) => {
  await open(page, 'pro')
  await sw(page, 'home.builtFrom').click()
  const level = page.locator('[data-level-control]')
  await level.getByRole('radio', { name: 'Professional' }).click()
  await expect(page.locator('[data-pro-total]')).toHaveText('218 of 219 on')
  await expect(sw(page, 'home.cardSizes')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // SET-B20: in Professional every switch can be turned off by itself.
  await expect(sw(page, 'home.cardSizes')).toBeEnabled()
  expect((await state(page)).unlocked).toEqual(['home.builtFrom'])
  await level.getByRole('radio', { name: 'Beginner' }).click()
  await expect(page.locator('[data-pro-total]')).toHaveText('1 of 219 on')
  await expect(sw(page, 'home.builtFrom')).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('SET-B20 Professional: turn one switch off, it stays off, the others stay on, Undo brings it back', async ({
  page,
}) => {
  await open(page, 'pro', JSON.stringify({ level: 'professional' }))
  await expect(page.locator('[data-pro-total]')).toHaveText('218 of 219 on')
  await expect(sw(page, 'home.cardSizes')).toBeEnabled()
  await sw(page, 'home.cardSizes').click()
  await expect(sw(page, 'home.cardSizes')).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(sw(page, 'home.builtFrom')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.locator('[data-pro-total]')).toHaveText('217 of 219 on')
  await page.getByTestId('sv3-undo').click()
  await expect(sw(page, 'home.cardSizes')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.locator('[data-pro-total]')).toHaveText('218 of 219 on')
  await page.getByTestId('sv3-redo').click()
  await expect(page.locator('[data-pro-total]')).toHaveText('217 of 219 on')
  // It stays off after a reload.
  await page.reload()
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await expect(sw(page, 'home.cardSizes')).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(page.locator('[data-pro-total]')).toHaveText('217 of 219 on')
})

test('SET-B44 the Beginner / Professional control is in Professional features and in Your experience', async ({
  page,
}) => {
  await open(page, 'pro')
  await expect(page.locator('[data-level-control]')).toBeVisible()
  await page.locator('[data-section="experience"]').click()
  await expect(page.locator('[data-level-control]')).toBeVisible()
  await page
    .locator('[data-level-control]')
    .getByRole('radio', { name: 'Professional' })
    .click()
  expect((await state(page)).level).toBe('professional')
})

test('SET-B46 the Why? link opens a pop-up and Esc closes it; the list stays', async ({
  page,
}) => {
  await open(page, 'pro')
  await page.locator('[data-why="reset-beginner"]').click()
  const popup = page.getByTestId('sv3-why-popup')
  await expect(popup).toContainText('turns off every single Professional')
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await expect(page.locator('[data-pro-reset]')).toBeVisible()
})

/** SET-P01 to P29: a row follows its own switch (the rows that exist in the registry). */
const ROWS: [id: string, section: string][] = [
  ['general.reduceGlass', 'general'],
  ['advanced.showRefresh', 'advanced'],
  ['general.space.home', 'general'],
  ['general.space.library', 'general'],
  ['general.space.review', 'general'],
  ['toolbar.ribbonMode', 'toolbar'],
  ['toolbar.newLineHold', 'toolbar'],
  ['toolbar.pillReset', 'toolbar'],
  ['toolbar.reset', 'toolbar'],
  ['advanced.holdMenu', 'pencil'],
  ['reading.pdfFlow', 'reading'],
  ['reading.bar', 'reading'],
  ['reading.barPin', 'reading'],
  ['reading.glide', 'reading'],
  ['reading.speed', 'reading'],
  ['reading.awake', 'reading'],
  ['reading.orient', 'reading'],
  ['review.targetMemory', 'review'],
  ['review.nestedCard', 'review'],
  ['review.reviseLabels', 'review'],
  ['advanced.pencilLab', 'advanced'],
  ['advanced.slowMoments', 'advanced'],
  ['advanced.slowMomentsCopy', 'advanced'],
  ['advanced.toolStateCopy', 'advanced'],
]

for (const [id, section] of ROWS)
  test(`SET-P ${id}: hidden in Beginner, shown at once with a glow when its switch is on`, async ({
    page,
  }) => {
    await open(page, section)
    const row = page.locator(`[data-setting-id="${id}"]`)
    await expect(row).toHaveCount(0)
    await page.locator('[data-section="pro"]').click()
    await sw(page, id).click()
    await page.locator(`[data-section="${section}"]`).click()
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute('data-glow', 'on')
  })

test('SET-P01 Start new pages as always shows; its switch widens the template picker', async ({
  page,
}) => {
  await open(page, 'general')
  const row = page.locator('[data-setting-id="general.newPageStudy"]')
  await expect(row).toBeVisible()
  await row.locator('[data-choose-template]').click()
  const picker = page.getByTestId('sv3-template-picker')
  await expect(picker.locator('[data-template]')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await page.locator('[data-section="pro"]').click()
  await sw(page, 'general.newPageStudy').click()
  await page.locator('[data-section="general"]').click()
  await row.locator('[data-choose-template]').click()
  expect(await picker.locator('[data-template]').count()).toBeGreaterThan(2)
})
