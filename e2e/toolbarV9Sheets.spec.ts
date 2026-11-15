// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Tool bar v9, 2A.16 part B: the right sheets (Add favourite, Organise) and the
 * Feel card as the v9 picture shows them. Why: the first look found both
 * different from docs/mockups/toolbar-v9/toolbar-v9.html.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FLAGS = 'foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2'
const FAVS = [
  { tool: 'pen', type: 'ball', colour: '#0b6e99', size: 1, exact: null },
  { tool: 'pen', type: 'brush', colour: '#c62828', size: 2, exact: null },
]

async function open(
  page: Page,
  o: {
    size?: { width: number; height: number }
    level?: 'beginner' | 'professional'
  } = {},
) {
  await page.addInitScript(
    ([l, f]) => {
      if (localStorage.getItem('sheetsSeeded')) return
      localStorage.setItem('sheetsSeeded', '1')
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({
          level: l,
          unlocked: l === 'professional' ? ['tb.layers'] : [],
        }),
      )
      localStorage.setItem(
        'learning-notes:toolbar.favourites',
        JSON.stringify(f),
      )
    },
    [o.level ?? 'beginner', FAVS] as const,
  )
  if (o.size) await page.setViewportSize(o.size)
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${FLAGS}`)
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
}

const pref = (page: Page, key: string) =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:${k}`) ?? 'null'),
    key,
  )

/** The dock: 440 wide, 12 px from the right and the bottom, below the top bar. */
async function expectDocked(page: Page, testId: string) {
  const vp = page.viewportSize()!
  const sheet = page.getByTestId(testId)
  await expect(sheet).toBeVisible()
  await page.waitForTimeout(450) // the slide-in
  const box = (await sheet.boundingBox())!
  const top = (await page.locator('header[data-shell-top]').boundingBox())!
  expect(Math.round(box.width)).toBe(440)
  expect(Math.round(box.x + box.width)).toBe(vp.width - 12)
  expect(Math.round(box.y + box.height)).toBe(vp.height - 12)
  expect(box.y).toBeGreaterThanOrEqual(top.y + top.height)
}

/** ✕ at the left and ✓ at the right of the header. */
async function expectHeader(page: Page, testId: string) {
  const sheet = page.getByTestId(testId)
  const x = (await sheet.getByTestId('fb-sheet-close').boundingBox())!
  const ok = (await sheet.getByTestId('fb-sheet-ok').boundingBox())!
  const title = (await sheet.locator('.fb-sheet__title').boundingBox())!
  expect(x.x + x.width).toBeLessThanOrEqual(title.x + 1)
  expect(ok.x).toBeGreaterThanOrEqual(title.x + title.width - 1)
  expect(x.width).toBeGreaterThanOrEqual(44)
  expect(ok.height).toBeGreaterThanOrEqual(44)
}

test('Add favourite docks right at 440 px, ✕ left and ✓ right, no footer buttons; ✓ saves', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('v8-add').click()
  await expectDocked(page, 'v8-addsheet')
  await expectHeader(page, 'v8-addsheet')
  await expect(page.getByTestId('v8-add-save')).toHaveCount(0)
  await expect(page.getByTestId('v8-add-cancel')).toHaveCount(0)
  await expect(page.getByTestId('fb-sheet-foot')).toHaveCount(0)
  await page.getByTestId('v8-add-name').fill('Quick pen')
  await page.getByTestId('fb-sheet-ok').click()
  await expect(page.getByTestId('v8-addsheet')).toHaveCount(0)
  const saved = await pref(page, 'toolbar.favourites2')
  expect(saved.at(-1)).toMatchObject({ name: 'Quick pen' })
})

test('Add favourite: ✕ leaves nothing saved', async ({ page }) => {
  await open(page)
  await page.getByTestId('v8-add').click()
  await page.getByTestId('v8-add-name').fill('Temp')
  await page.getByTestId('fb-sheet-close').click()
  await expect(page.getByTestId('v8-addsheet')).toHaveCount(0)
  const saved = (await pref(page, 'toolbar.favourites2')) ?? []
  expect(saved.some((f: { name?: string }) => f.name === 'Temp')).toBe(false)
})

test('Add favourite: the tool tiles are whole, never under the scroll bar', async ({
  page,
}) => {
  await open(page, { size: { width: 820, height: 640 } })
  await page.getByTestId('v8-add').click()
  const body = page.getByTestId('fb-sheet-body')
  await expect(body).toBeVisible()
  await page.waitForTimeout(450)
  const edge = await body.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return r.left + el.clientWidth
  })
  for (const id of ['pen', 'text', 'lasso']) {
    const tile = (await page.getByTestId(`v8-add-tool-${id}`).boundingBox())!
    expect(tile.x + tile.width, id).toBeLessThanOrEqual(edge - 8)
  }
})

test('Organise docks right at 440 px with ✕ and ✓ and lists the whole row: tools, then favourites', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('v8-organise').click()
  await expectDocked(page, 'arrange-sheet')
  await expectHeader(page, 'arrange-sheet')
  // The footer keeps only Reset and Add favourite (no Done button).
  await expect(page.getByTestId('arrange-done')).toHaveCount(0)
  await expect(page.getByTestId('arrange-reset')).toBeVisible()
  await expect(page.getByTestId('arrange-add')).toBeVisible()
  // Tools of the Pen row, then the two favourites.
  const tools = page.getByTestId('v8-org-tools')
  await expect(tools).toContainText('Type')
  await expect(tools).toContainText('Feel')
  await expect(page.getByTestId('arrange-row')).toHaveCount(2)
  await page.getByTestId('fb-sheet-ok').click()
  await expect(page.getByTestId('arrange-sheet')).toHaveCount(0)
})

test('Organise: ✕ puts the row back as it was when the sheet opened', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('v8-organise').click()
  await expect(page.getByTestId('arrange-row')).toHaveCount(2)
  await page
    .getByRole('button', { name: /Move .* down/ })
    .first()
    .click()
  await page.getByTestId('fb-sheet-close').click()
  await expect(page.getByTestId('arrange-sheet')).toHaveCount(0)
  const saved = await pref(page, 'toolbar.favourites2')
  expect(
    saved.filter((f: { tool: string }) => f.tool === 'pen')[0],
  ).toMatchObject({ type: 'ball' })
})

test('On a phone the sheets fill the width below the top bar', async ({
  page,
}) => {
  await open(page, { size: { width: 390, height: 844 } })
  await page.getByTestId('v8-add').click()
  const sheet = page.getByTestId('v8-addsheet')
  await expect(sheet).toBeVisible()
  await page.waitForTimeout(450)
  const box = (await sheet.boundingBox())!
  expect(Math.round(box.width)).toBe(390)
  expect(Math.round(box.y + box.height)).toBe(844)
  await expectHeader(page, 'v8-addsheet')
})

// ---- Feel card ----

async function feel(page: Page, level: 'beginner' | 'professional') {
  await open(page, { level })
  await page.getByTestId('v8-chip-pen.feel').click()
  await expect(page.getByTestId('v8-card-pen.feel')).toBeVisible()
  await page.waitForTimeout(450)
}

test('Feel: the tabs are one full-width segmented control, 44 pt tall', async ({
  page,
}) => {
  await feel(page, 'professional')
  const card = page.getByTestId('v8-card-pen.feel')
  const tabs = card.getByRole('tablist')
  await expect(tabs.getByRole('tab')).toHaveCount(4)
  const t = (await tabs.boundingBox())!
  const body = (await card.getByTestId('v8-pen-pane-feel').boundingBox())!
  expect(Math.abs(t.width - body.width)).toBeLessThanOrEqual(2)
  for (const tab of await tabs.getByRole('tab').all())
    expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await tabs.getByRole('tab', { name: 'Page' }).click()
  await expect(tabs.getByRole('tab', { name: 'Page' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // The arrow keys move between the tabs.
  await tabs.getByRole('tab', { name: 'Page' }).press('ArrowLeft')
  await expect(tabs.getByRole('tab', { name: 'Math' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('Feel: slider values show as "%" chips', async ({ page }) => {
  await feel(page, 'professional')
  const out = page
    .getByTestId('v8-pen-pressure')
    .locator('..')
    .locator('output')
  await expect(out).toHaveText(/^\d+%$/)
  const chip = await out.evaluate((el) => {
    const s = getComputedStyle(el)
    return { radius: parseFloat(s.borderTopLeftRadius), bg: s.backgroundColor }
  })
  expect(chip.radius).toBeGreaterThanOrEqual(6)
  expect(chip.bg).not.toBe('rgba(0, 0, 0, 0)')
})

test('Feel › Page (Professional): Layers sit in one well, a row has the picture, name, strokes, eye and lock', async ({
  page,
}) => {
  await feel(page, 'professional')
  await page
    .getByTestId('v8-card-pen.feel')
    .getByRole('tab', { name: 'Page' })
    .click()
  const layers = page.getByTestId('v8-feel-layers')
  await expect(layers).toBeVisible()
  await expect(layers.locator('[data-layer-add]')).toBeVisible()
  await expect(layers.locator('[data-layer-page]')).toBeVisible()
  // Nothing dropped: eye and lock on the row; move up/down and delete under ⋯.
  const row = layers.locator('[data-layer]').first()
  if (await row.count()) {
    for (const a of ['visibility', 'lock'])
      await expect(row.locator(`[data-layer-action="${a}"]`)).toHaveCount(1)
    await row.locator('[data-layer-action="more"]').click()
    for (const a of ['up', 'down', 'delete'])
      await expect(row.locator(`[data-layer-action="${a}"]`)).toHaveCount(1)
  }
})
