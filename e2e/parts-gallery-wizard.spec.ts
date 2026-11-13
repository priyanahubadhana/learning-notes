import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Slice 0g step 3: Wizard steps on the Parts gallery at #/design-tokens
 * (S3-13 to S3-19 and the Pro step of S3-40, docs/features/shared-parts.md).
 */
test.use({ hasTouch: true })

const IPAD_L = { width: 1180, height: 820 }
const IPAD_P = { width: 820, height: 1180 }
const PHONE = { width: 390, height: 844 }
type Size = { width: number; height: number }

async function open(page: Page, size: Size) {
  await page.setViewportSize(size)
  await page.goto('about:blank')
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-parts')).toHaveAttribute(
    'data-ready',
    'true',
  )
  const sec = page.getByTestId('gal-wizard')
  await expect(sec).toBeAttached()
  await sec.scrollIntoViewIfNeeded()
  return sec
}
const demo = (page: Page, id: string) => page.getByTestId(`demo-${id}`)
const step = (d: Locator, id: string) => d.getByTestId(`wizard-step-${id}`)

test('S3-13 a 4-step strip on step 2: check, filled, muted', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const d = demo(page, 'wiz-four')
  await expect(step(d, 'a')).toHaveAttribute('data-state', 'done')
  await expect(step(d, 'a').locator('svg')).toBeVisible()
  await expect(step(d, 'b')).toHaveAttribute('aria-current', 'step')
  await expect(step(d, 'b')).toHaveAttribute('data-state', 'current')
  await expect(step(d, 'c')).toHaveAttribute('data-state', 'upcoming')
  await expect(step(d, 'd')).toHaveAttribute('data-state', 'upcoming')
  // each step is a 44 pt target
  for (const id of ['a', 'b', 'c', 'd']) {
    const b = await step(d, id).boundingBox()
    expect(b!.height).toBeGreaterThanOrEqual(44)
  }
  // the strip is 52 px high
  const strip = await d.locator('.wz').first().boundingBox()
  expect(Math.round(strip!.height)).toBe(52)
})

test('S3-14 a done step goes back and later input is kept', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const d = demo(page, 'wiz-form')
  await d.getByTestId('wiz-name').fill('Notes.csv')
  await step(d, 'check').click()
  await expect(step(d, 'check')).toHaveAttribute('aria-current', 'step')
  await d.getByTestId('wiz-note').fill('looks fine')
  await step(d, 'file').click()
  await expect(step(d, 'file')).toHaveAttribute('aria-current', 'step')
  await expect(d.getByTestId('wiz-name')).toHaveValue('Notes.csv')
  await step(d, 'check').click()
  await expect(d.getByTestId('wiz-note')).toHaveValue('looks fine')
})

test('S3-15 next step while not valid: nothing moves, the hint says why', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const d = demo(page, 'wiz-form')
  await step(d, 'check').click({ force: true })
  await expect(step(d, 'file')).toHaveAttribute('aria-current', 'step')
  await expect(d.getByTestId('wiz-hint')).toContainText('Type a file name')
})

test('S3-16 a step two ahead does not move and reads as not available', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const d = demo(page, 'wiz-four')
  const far = step(d, 'd')
  await expect(far).toHaveAttribute('aria-disabled', 'true')
  await expect(far).toHaveAttribute('aria-label', 'Done, not available yet')
  await far.click({ force: true })
  await expect(step(d, 'b')).toHaveAttribute('aria-current', 'step')
})

for (const size of [PHONE, IPAD_P]) {
  test(`S3-17 compact "Step n of m · name" at ${size.width} px, one line, no sideways scroll`, async ({
    page,
  }) => {
    await open(page, size)
    const d = demo(page, 'wiz-six')
    await expect(d.getByTestId('wizard-compact')).toBeVisible()
    await expect(d.locator('.wz-compact-text')).toHaveText(
      'Step 3 of 6 · Check every row',
    )
    await expect(d.locator('.wz-progress')).toBeVisible()
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(over).toBeLessThanOrEqual(0)
    // the arrows are 44 pt and move one step
    const prev = d.getByTestId('wizard-prev')
    expect((await prev.boundingBox())!.width).toBeGreaterThanOrEqual(44)
    await prev.click()
    await expect(d.locator('.wz-compact-text')).toHaveText(
      'Step 2 of 6 · Match the columns',
    )
  })
}

test('S3-18 arrows move focus, Enter opens an allowed step, change announced once', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const d = demo(page, 'wiz-four')
  await step(d, 'b').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(step(d, 'a')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(step(d, 'c')).toBeFocused()
  // c is the next one: allowed
  await page.keyboard.press('Enter')
  await expect(step(d, 'c')).toHaveAttribute('aria-current', 'step')
  await expect(d.locator('.wz-sr')).toHaveText('Step 3 of 4, Look')
})

test('S3-19 an error step: "!" with a danger ring and "needs a fix" in the name', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const d = demo(page, 'wiz-states')
  const e = step(d, 'b')
  await expect(e).toHaveAttribute('data-state', 'error')
  await expect(e).toHaveAttribute('aria-label', 'Match, needs a fix')
  await expect(e.locator('.wz-circle')).toHaveText('!')
  const ring = await e
    .locator('.wz-circle')
    .evaluate((n) => getComputedStyle(n).boxShadow)
  expect(ring).not.toBe('none')
})

test('S3-40 a Pro step appears only when unlocked; the numbers close up', async ({
  page,
}) => {
  await open(page, IPAD_L)
  const off = page.getByTestId('wiz-pro-off')
  await expect(off.locator('.wz-step')).toHaveCount(3)
  await expect(off).not.toContainText('Match columns')
  await page.getByTestId('wiz-unlock').click()
  const on = page.getByTestId('wiz-pro-on')
  await expect(on.locator('.wz-step')).toHaveCount(4)
  await expect(on).toContainText('Match columns')
})
