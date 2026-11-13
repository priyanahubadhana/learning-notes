import { expect, test, type Page } from '@playwright/test'

/**
 * Slice 0g step 3: Status pill stack on the Parts gallery at #/design-tokens
 * (S3-20 to S3-29, docs/features/shared-parts.md). Touch screens on purpose.
 */
test.use({ hasTouch: true })

const IPAD_L = { width: 1180, height: 820 }
const PHONE = { width: 390, height: 844 }
type Size = { width: number; height: number }

async function gallery(page: Page, size: Size = IPAD_L) {
  await page.setViewportSize(size)
  await page.goto('about:blank')
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-parts')).toHaveAttribute(
    'data-ready',
    'true',
  )
  const sec = page.getByTestId('gal-pills')
  await expect(sec).toBeAttached()
  await sec.scrollIntoViewIfNeeded()
}
const live = (page: Page) => page.locator('.pillstack[data-mode="fixed"]')
const pill = (page: Page, id: string) => live(page).getByTestId(`pill-${id}`)
const toggle = (page: Page, id: string) =>
  page.getByTestId(`pill-toggle-${id}`).click()
const box = async (l: ReturnType<Page['getByTestId']>) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  )
const clientW = (page: Page) =>
  page.evaluate(() => document.documentElement.clientWidth)
const innerH = (page: Page) => page.evaluate(() => window.innerHeight)

test('S3-20 one pill: 16 px from the bottom and end edge, 36 px high with a 44 pt target', async ({
  page,
}) => {
  await gallery(page)
  await toggle(page, 'update')
  const p = pill(page, 'update')
  await expect(p).toBeVisible()
  await settle(page)
  const b = await box(p)
  expect(Math.round(b.height)).toBe(36)
  expect(Math.round((await clientW(page)) - (b.x + b.width))).toBe(16)
  expect(Math.round((await innerH(page)) - (b.y + b.height))).toBe(16)
  // the target is 44 pt: the main button's hit box reaches 4 px above and below
  const t = await p
    .locator('.pill-main')
    .evaluate((n) => parseFloat(getComputedStyle(n, '::before').height))
  expect(t).toBeGreaterThanOrEqual(44)
})

test('S3-21 five pills stack 8 px apart in order; 4 show and "+1" lists the rest', async ({
  page,
}) => {
  await gallery(page)
  for (const id of ['update', 'sync', 'timer', 'play', 'rec'])
    await toggle(page, id)
  await settle(page)
  const ids = ['rec', 'play', 'timer', 'sync']
  const ys: { y: number; h: number }[] = []
  for (const id of ids) {
    const b = await box(pill(page, id))
    ys.push({ y: b.y, h: b.height })
  }
  for (let i = 1; i < ys.length; i++) {
    // each next pill sits above the one before it, 8 px apart
    expect(Math.round(ys[i - 1].y - (ys[i].y + ys[i].h))).toBe(8)
  }
  await expect(pill(page, 'update')).toHaveCount(0)
  await expect(live(page).getByTestId('pill-more-button')).toHaveText('+1')
  await live(page).getByTestId('pill-more-button').click()
  await expect(page.getByTestId('pill-more-card').first()).toContainText(
    'Update ready',
  )
})

test('S3-22 removing the middle pill: the others slide together and keep their order', async ({
  page,
}) => {
  await gallery(page)
  for (const id of ['rec', 'play', 'timer']) await toggle(page, id)
  await settle(page)
  const topBefore = (await box(pill(page, 'timer'))).y
  await toggle(page, 'play')
  await expect(pill(page, 'play')).toHaveCount(0)
  await settle(page)
  const rec = await box(pill(page, 'rec'))
  const timer = await box(pill(page, 'timer'))
  expect(Math.round(rec.y - (timer.y + timer.height))).toBe(8)
  expect(timer.y).toBeGreaterThan(topBefore)
})

test('S3-23 the stack rises above the tab bar, the keyboard and a toast', async ({
  page,
}) => {
  await gallery(page)
  await toggle(page, 'update')
  const gap = async () => {
    await settle(page)
    const b = await box(pill(page, 'update'))
    return Math.round((await innerH(page)) - (b.y + b.height))
  }
  expect(await gap()).toBe(16)
  await page.getByTestId('pill-env-tabBar').click()
  expect(await gap()).toBe(72)
  await page.getByTestId('pill-env-tabBar').click()
  await page.getByTestId('pill-env-keyboard').click()
  expect(await gap()).toBe(16 + 300 + 44)
  await page.getByTestId('pill-env-keyboard').click()
  await page.getByTestId('pill-env-toast').click()
  expect(await gap()).toBe(68)
})

test('S3-24 a pill opens its pop-up beside the stack; a tap in a gap goes to the page', async ({
  page,
}) => {
  await gallery(page)
  await toggle(page, 'custom')
  await toggle(page, 'update')
  await settle(page)
  const p = await box(pill(page, 'update'))
  await page.touchscreen.tap(p.x + p.width / 2, p.y + p.height / 2)
  const card = page.getByTestId('pill-popup')
  await expect(card).toBeVisible()
  const c = await box(card)
  // beside, never over the pill
  const over =
    c.x < p.x + p.width &&
    c.x + c.width > p.x &&
    c.y < p.y + p.height &&
    c.y + c.height > p.y
  expect(over).toBe(false)
  await page.keyboard.press('Escape')
  await expect(card).toBeHidden()
  // the stack box passes taps through: beside the narrower pill the page is hit
  const st = await box(live(page))
  const small = await box(pill(page, 'custom'))
  const hitsPill = await page.evaluate(
    ([x, y]) => !!document.elementFromPoint(x, y)?.closest('.pill, .pillstack'),
    [st.x + 2, small.y + small.height / 2],
  )
  expect(hitsPill).toBe(false)
})

test('S3-25 the zoom pill shows for about 2 s; touching it keeps it', async ({
  page,
}) => {
  await gallery(page)
  await toggle(page, 'zoom')
  const z = pill(page, 'zoom')
  await expect(z).toBeVisible()
  await expect(z).toHaveText('130%')
  await expect(z).toBeHidden({ timeout: 4000 })
  await toggle(page, 'zoom')
  await expect(z).toBeVisible()
  await z.hover()
  await page.waitForTimeout(2600)
  await expect(z).toBeVisible()
  await page.mouse.move(5, 5)
  await expect(z).toBeHidden({ timeout: 4000 })
})

test('S3-26 Stop ends the recording; the cross removes "Update ready"; recording has no cross and is never in "+n"', async ({
  page,
}) => {
  await gallery(page)
  await page.getByTestId('pill-all').click()
  await settle(page)
  await expect(live(page).getByTestId('pill-x-rec')).toHaveCount(0)
  await live(page).getByTestId('pill-more-button').click()
  const card = page.getByTestId('pill-more-card').first()
  await expect(card).not.toContainText('Recording')
  await page.keyboard.press('Escape')
  await page.getByTestId('pill-none').click()
  await toggle(page, 'rec')
  await toggle(page, 'update')
  await live(page).getByTestId('pill-x-update').click()
  await expect(pill(page, 'update')).toBeHidden()
  await live(page).getByTestId('pill-action-rec').click()
  await expect(pill(page, 'rec')).toBeHidden()
})

test('S3-27 a sync problem says it in words with a danger look and is announced', async ({
  page,
}) => {
  await gallery(page)
  await toggle(page, 'sync')
  await page.getByTestId('pill-problem').click()
  const p = pill(page, 'sync')
  await expect(p).toHaveAttribute('data-tone', 'problem')
  await expect(p).toContainText('Sync problem')
  await expect(live(page).getByRole('alert')).toHaveText('Sync problem')
  // it stays (no ttl)
  await page.waitForTimeout(2500)
  await expect(p).toBeVisible()
})

test('S3-28 three pills on a phone: all but recording show only an icon, still 44 pt, full names read aloud', async ({
  page,
}) => {
  await gallery(page, PHONE)
  for (const id of ['rec', 'sync', 'update']) await toggle(page, id)
  await settle(page)
  const rec = pill(page, 'rec')
  await expect(rec.locator('.pill-label')).toBeVisible()
  const sync = pill(page, 'sync')
  await expect(sync.locator('.pill-main')).toHaveAttribute(
    'aria-label',
    'Syncing',
  )
  const b = await box(sync.locator('.pill-main'))
  expect(Math.round(b.width)).toBeLessThanOrEqual(40)
  const label = await box(sync.locator('.pill-label'))
  expect(label.width).toBeLessThanOrEqual(1)
  // the hit area reaches 44 pt both ways
  const t = await sync.locator('.pill-main').evaluate((n) => {
    const c = getComputedStyle(n, '::before')
    return [parseFloat(c.width), parseFloat(c.height)]
  })
  expect(t[0]).toBeGreaterThanOrEqual(44)
  expect(t[1]).toBeGreaterThanOrEqual(44)
})

test('S3-29 with a Tool frame open and recording, the recording pill sits above the footer, still visible', async ({
  page,
}) => {
  await gallery(page)
  await toggle(page, 'rec')
  await page.getByTestId('tf-open-clean').scrollIntoViewIfNeeded()
  await page.getByTestId('tf-open-clean').click()
  const f = page.getByTestId('tool-frame')
  await expect(f).toBeVisible()
  await f.evaluate((n) => Promise.all(n.getAnimations().map((a) => a.finished)))
  await settle(page)
  const p = pill(page, 'rec')
  await expect(p).toBeVisible()
  const b = await box(p)
  const foot = await box(f.locator('.tf-foot'))
  expect(b.y + b.height).toBeLessThanOrEqual(foot.y)
  const on = await page.evaluate(
    ([x, y]) =>
      !!document.elementFromPoint(x, y)?.closest('[data-testid="pill-rec"]'),
    [b.x + 20, b.y + b.height / 2],
  )
  expect(on).toBe(true)
})
