// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** Toolbar v8, slice 1f: the Insert card, the ⋯ card and All tools. */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(
  page: Page,
  level: 'beginner' | 'professional' = 'beginner',
  unlocked: string[] = [],
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, unlocked] as const,
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)
const tile = (page: Page, id: string) => page.getByTestId(`v8-tool-tile-${id}`)

async function openInsert(page: Page) {
  const direct = page.getByTestId('v8-tool-insert')
  if (await direct.isVisible()) await direct.click()
  else {
    await page.getByTestId('v8-more').click()
    await page.getByTestId('v8-fold-insert').click()
  }
  await expect(card(page, 'insert')).toBeVisible()
  await expect(tile(page, 'picture')).toBeVisible()
}

test('1f Insert: grouped 44 pt tiles, a thin scroll track, a close button; Beginner has the basics only', async ({
  page,
}) => {
  await open(page)
  await openInsert(page)
  const c = card(page, 'insert')
  const groups = await c.locator('.pcard-glabel').count()
  expect(groups).toBeGreaterThanOrEqual(3)
  for (const id of ['picture', 'table', 'callout', 'divider', 'link'])
    await expect(tile(page, id)).toBeVisible()
  await expect(tile(page, 'mindMap')).toHaveCount(0)
  for (const b of await c.locator('.pcard-tile').all()) {
    const r = (await b.boundingBox())!
    expect(r.height).toBeGreaterThanOrEqual(44)
    expect(r.width).toBeGreaterThanOrEqual(44)
  }
  const track = await c
    .getByTestId('v8-insert')
    .evaluate((e) => getComputedStyle(e).scrollbarWidth)
  expect(track).toBe('thin')
  await c.getByTestId('pcard-close').click()
  await expect(c).toHaveCount(0)
})

test('1f Insert: the Professional switch adds more tools', async ({ page }) => {
  await open(page, 'professional', ['tb.insertMore'])
  await openInsert(page)
  await expect(tile(page, 'mindMap')).toBeVisible()
})

for (const vp of [
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  test.describe(`${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })
    test(`1f Insert: nothing is cut at the screen edge (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await open(page)
      await openInsert(page)
      const c = card(page, 'insert')
      await page.waitForTimeout(300)
      const r = (await c.boundingBox())!
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.x + r.width).toBeLessThanOrEqual(vp.width)
      for (const b of await c.locator('.pcard-tile').all()) {
        const t = (await b.boundingBox())!
        expect(t.x).toBeGreaterThanOrEqual(r.x - 0.5)
        expect(t.x + t.width).toBeLessThanOrEqual(r.x + r.width + 0.5)
      }
    })
  })
}

test('1f ⋯ card: Reading mode, Settings and Hide the tool bar; Beginner has no All tools', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('v8-more').click()
  await expect(card(page, 'fold.bar')).toBeVisible()
  await expect(page.getByTestId('v8-more-reading')).toBeVisible()
  await expect(page.getByTestId('v8-more-settings')).toBeVisible()
  await expect(page.getByTestId('v8-more-hide')).toBeVisible()
  await expect(page.getByTestId('v8-more-alltools')).toHaveCount(0)
})

test('TB-63 Professional: ⋯ then All tools opens every group of every tab', async ({
  page,
}) => {
  await open(page, 'professional', ['tb.allTools'])
  await page.getByTestId('v8-more').click()
  await page.getByTestId('v8-more-alltools').click()
  const c = card(page, 'more.alltools')
  await expect(c).toBeVisible()
  await expect(tile(page, 'bold')).toBeAttached()
  await expect(tile(page, 'readingMode')).toBeAttached()
  await expect(tile(page, 'ballPen')).toBeAttached()
  await expect(c.getByTestId('pcard-close')).toBeVisible()
})
