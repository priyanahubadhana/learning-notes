import { expect, test, type Page } from '@playwright/test'

/**
 * Slice 0g step 3: Before / after view on the Parts gallery at #/design-tokens
 * (S3-30 to S3-38, docs/features/shared-parts.md). Touch screens on purpose.
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
  const sec = page.getByTestId('gal-compare')
  await expect(sec).toBeAttached()
  await sec.scrollIntoViewIfNeeded()
}
const demo = (page: Page, id: string) => page.getByTestId(`demo-${id}`)
const box = async (l: ReturnType<Page['getByTestId']>) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}
async function frame(page: Page, variant: string) {
  await gallery(page)
  await page.getByTestId(`tf-open-${variant}`).scrollIntoViewIfNeeded()
  await page.getByTestId(`tf-open-${variant}`).click()
  const f = page.getByTestId('tool-frame')
  await expect(f).toBeVisible()
  await f.evaluate((n) => Promise.all(n.getAnimations().map((a) => a.finished)))
  return f
}

test('S3-30 hold the button: the original shows with a "Before" tag; let go shows my edit; the picture does not move', async ({
  page,
}) => {
  const f = await frame(page, 'compare')
  const hold = f.getByTestId('ba-hold')
  const btn = f.getByTestId('compare-button')
  await expect(hold).toHaveAttribute('data-showing', 'after')
  const still = await box(f.getByTestId('tfd-pic'))
  const b = await box(btn)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(450) // held, not tapped
  await expect(hold).toHaveAttribute('data-showing', 'before')
  await expect(f.getByTestId('ba-tag')).toHaveText('Before')
  const orig = await box(f.getByTestId('tfd-original'))
  expect(Math.round(orig.x)).toBe(Math.round(still.x))
  expect(Math.round(orig.y)).toBe(Math.round(still.y))
  expect(Math.round(orig.width)).toBe(Math.round(still.width))
  await page.mouse.up()
  await expect(hold).toHaveAttribute('data-showing', 'after')
  await expect(f.getByTestId('ba-tag')).toHaveCount(0)
})

test('S3-31 a short tap or Space keeps "Before" until the next tap, and says so', async ({
  page,
}) => {
  const f = await frame(page, 'compare')
  const hold = f.getByTestId('ba-hold')
  const btn = f.getByTestId('compare-button')
  await btn.click()
  await expect(hold).toHaveAttribute('data-showing', 'before')
  await expect(btn).toHaveAttribute('aria-pressed', 'true')
  await expect(f.locator('.cmpb-sr[role="status"]')).toHaveText(
    'Showing before',
  )
  await btn.click()
  await expect(hold).toHaveAttribute('data-showing', 'after')
  await btn.focus()
  await page.keyboard.press('Space')
  await expect(hold).toHaveAttribute('data-showing', 'before')
  await page.keyboard.press('Space')
  await expect(hold).toHaveAttribute('data-showing', 'after')
})

test('S3-32 no original: the button is disabled and says why', async ({
  page,
}) => {
  const f = await frame(page, 'nocompare')
  const btn = f.getByTestId('compare-button')
  await expect(btn).toHaveAttribute('aria-disabled', 'true')
  await expect(f.getByTestId('tf-hint')).toHaveText(
    'There is no original to compare.',
  )
  await btn.click({ force: true })
  await expect(f.getByTestId('ba-hold')).toHaveAttribute(
    'data-showing',
    'after',
  )
})

test('S3-33 two equal columns; added, removed and changed are marked by a sign and a tint', async ({
  page,
}) => {
  await gallery(page)
  const d = demo(page, 'cmp-side')
  const a = await box(d.getByTestId('ba-col-before'))
  const b = await box(d.getByTestId('ba-col-after'))
  expect(Math.abs(a.width - b.width)).toBeLessThan(2)
  await expect(d.getByTestId('ba-col-before')).toHaveAttribute(
    'aria-label',
    'Mine',
  )
  const added = d.getByTestId('ba-col-after').locator('[data-kind="added"]')
  await expect(added.first()).toContainText('+')
  const removed = d
    .getByTestId('ba-col-before')
    .locator('[data-kind="removed"]')
  await expect(removed.first()).toContainText('−')
  expect(
    await removed
      .first()
      .locator('.ba-text')
      .evaluate((n) => getComputedStyle(n).textDecorationLine),
  ).toContain('line-through')
  const changed = d
    .getByTestId('ba-col-before')
    .locator('[data-kind="changed"]')
  await expect(changed.first()).toContainText('~')
  await expect(d.getByTestId('ba-col-after')).toContainText('picture changed')
  // unchanged runs longer than 6 fold
  await expect(d.getByTestId('ba-fold').first()).toContainText(
    '9 lines the same',
  )
})

test('S3-34 scrolling one column moves the other', async ({ page }) => {
  await gallery(page)
  const d = demo(page, 'cmp-side')
  await d.getByTestId('ba-fold').first().click()
  const A = d.getByTestId('ba-body-before')
  const B = d.getByTestId('ba-body-after')
  await A.evaluate((n) => n.scrollTo({ top: 120 }))
  await expect
    .poll(() => B.evaluate((n) => Math.round(n.scrollTop)))
    .toBe(await A.evaluate((n) => Math.round(n.scrollTop)))
  expect(await B.evaluate((n) => n.scrollTop)).toBeGreaterThan(0)
})

test('S3-35 Next change rings the change and counts; Previous goes back', async ({
  page,
}) => {
  await gallery(page)
  const d = demo(page, 'cmp-side')
  await expect(d.getByTestId('ba-count')).toHaveText('4 changes')
  await d.getByTestId('ba-next').click()
  await d.getByTestId('ba-next').click()
  await expect(d.getByTestId('ba-count')).toHaveText('2 of 4')
  // the change is ringed and centred in both columns (or as near as the scroll allows)
  let ringed = 0
  for (const side of ['before', 'after']) {
    const cell = d.getByTestId(`ba-col-${side}`).locator('[data-current]')
    if ((await cell.count()) === 0) continue // a change that exists in one copy only
    ringed++
    expect(
      await cell.evaluate((n) => getComputedStyle(n).boxShadow),
      `${side}: ringed`,
    ).not.toBe('none')
    const body = d.getByTestId(`ba-body-${side}`)
    const where = await Promise.all([box(cell), box(body)])
    const edge = await body.evaluate(
      (n) =>
        n.scrollTop < 2 || n.scrollTop + n.clientHeight > n.scrollHeight - 2,
    )
    const off = Math.abs(
      where[0].y + where[0].height / 2 - (where[1].y + where[1].height / 2),
    )
    expect(edge || off <= 24, `${side}: centred (off by ${off})`).toBe(true)
  }
  expect(ringed, 'the change is ringed in a column').toBeGreaterThan(0)
  await d.getByTestId('ba-prev').click()
  await expect(d.getByTestId('ba-count')).toHaveText('1 of 4')
  // keyboard: N and P
  await d.getByTestId('ba-next').focus()
  await page.keyboard.press('n')
  await expect(d.getByTestId('ba-count')).toHaveText('2 of 4')
  await page.keyboard.press('p')
  await expect(d.getByTestId('ba-count')).toHaveText('1 of 4')
  const nav = await box(d.getByTestId('ba-next'))
  expect(nav.width).toBeGreaterThanOrEqual(44)
  expect(nav.height).toBeGreaterThanOrEqual(44)
})

test('S3-36 on a phone Before is on top, After below', async ({ page }) => {
  await gallery(page, PHONE)
  const d = demo(page, 'cmp-side')
  const a = await box(d.getByTestId('ba-col-before'))
  const b = await box(d.getByTestId('ba-col-after'))
  expect(a.y).toBeLessThan(b.y)
  expect(Math.abs(a.x - b.x)).toBeLessThan(2)
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(over).toBeLessThanOrEqual(0)
  // and the two copies scroll together
  await d.getByTestId('ba-fold').first().click()
  const A = d.getByTestId('ba-body-before')
  const B = d.getByTestId('ba-body-after')
  await A.evaluate((n) => n.scrollTo({ top: 90 }))
  await expect
    .poll(() => B.evaluate((n) => Math.round(n.scrollTop)))
    .toBe(await A.evaluate((n) => Math.round(n.scrollTop)))
  expect(await B.evaluate((n) => n.scrollTop)).toBeGreaterThan(0)
})

test('S3-37 two identical copies say so and the action buttons still work', async ({
  page,
}) => {
  await gallery(page)
  const d = demo(page, 'cmp-same')
  await expect(d.getByTestId('ba-same')).toContainText('These two are the same')
  await d.getByTestId('ba-keep-mine').click()
  await expect(page.getByTestId('ba-chosen')).toHaveText('Chosen: Keep mine')
})

test('S3-38 an action in the side view is one history step with an Undo toast; Undo brings the earlier state back', async ({
  page,
}) => {
  await gallery(page)
  const d = demo(page, 'cmp-side')
  await expect(page.getByTestId('ba-chosen')).toHaveText('Nothing chosen yet')
  await expect(page.getByTestId('ba-steps')).toHaveText('History steps: 0')
  await d.getByTestId('ba-keep-theirs').click()
  await expect(page.getByTestId('ba-chosen')).toHaveText('Chosen: Keep theirs')
  await expect(page.getByTestId('ba-steps')).toHaveText('History steps: 1')
  const toast = page.getByTestId('shell-toast')
  await expect(toast).toContainText('Chosen: Keep theirs')
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('ba-chosen')).toHaveText('Nothing chosen yet')
  await expect(page.getByTestId('ba-steps')).toHaveText('History steps: 0')
  await expect(toast).toBeHidden()
})
