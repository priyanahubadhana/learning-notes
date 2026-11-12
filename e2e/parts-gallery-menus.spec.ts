import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Slice 0g step 2: the Context menu strip and the Command list on the Parts
 * gallery (#/design-tokens, section "menus"). One test per line SP-40..SP-48
 * of docs/features/shared-parts.md, plus the edge and corner check (SP-41) on
 * iPad both ways and on phones.
 */

const POSITIONS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'middle',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
  'tall',
] as const

async function open(page: Page, size?: { width: number; height: number }) {
  if (size) await page.setViewportSize(size)
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-menus')).toBeAttached()
  await expect(page.getByTestId('menus-at-middle')).toBeAttached()
}

const box = async (l: Locator) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

/** The floating strip (the gallery also draws inline ones). */
const cs = (page: Page, id: string) =>
  page.getByTestId('context-strip').getByTestId(id)
const picker = (page: Page) =>
  page.locator('[data-testid="cs-picker"]:not([data-inline])')

const bar = (page: Page) =>
  page.getByTestId('context-strip').getByRole('menubar')

/** Opens the real strip at one spot, waits until it is placed and still. */
async function openAt(page: Page, pos: string) {
  const b = page.getByTestId(`menus-at-${pos}`)
  await b.scrollIntoViewIfNeeded()
  await b.click()
  await expect(bar(page)).toBeVisible()
  let last = ''
  await expect
    .poll(async () => {
      const now = JSON.stringify(await bar(page).boundingBox())
      const same = now === last
      last = now
      return same
    })
    .toBe(true)
}

async function closeStrip(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('context-strip')).toHaveCount(0)
}

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

test.describe('Parts gallery: menus', () => {
  test('SP-40 the strip shows above the selection and never covers it', async ({
    page,
  }) => {
    await open(page, { width: 1180, height: 820 })
    await openAt(page, 'middle')
    const menubar = bar(page)
    await expect(menubar.getByRole('menuitem')).toHaveCount(7)
    for (const name of ['Paste', 'Copy', 'Cut', 'Delete', 'More actions'])
      await expect(
        menubar.getByRole('menuitem', { name, exact: true }),
      ).toBeVisible()
    const s = await box(menubar)
    const sel = await box(page.getByTestId('menus-selection'))
    expect(s.y + s.height).toBeLessThanOrEqual(sel.y)
    expect(overlaps(s, sel)).toBe(false)
    expect(s.height).toBeLessThanOrEqual(52)
    // Delete is the last button before the more button, in danger red.
    const names = await menubar
      .getByRole('menuitem')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
    expect(names.at(-2)).toBe('Delete')
    const colour = await menubar
      .getByTestId('cs-delete')
      .evaluate((e) => getComputedStyle(e).color)
    expect(colour).not.toBe(
      await menubar
        .getByTestId('cs-copy')
        .evaluate((e) => getComputedStyle(e).color),
    )
    // Every target is at least 44 px.
    for (const b of await menubar.getByRole('menuitem').all()) {
      const r = await box(b)
      expect(r.height).toBeGreaterThanOrEqual(44)
      expect(r.width).toBeGreaterThanOrEqual(44)
    }
  })

  test('SP-40 Beginner shows exactly Cut, Copy, Paste, Delete and more', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      ),
    )
    await open(page, { width: 1180, height: 820 })
    await openAt(page, 'middle')
    const names = await bar(page)
      .getByRole('menuitem')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
    expect(names).toEqual(['Cut', 'Copy', 'Paste', 'Delete', 'More actions'])
  })

  const DEVICES = [
    { name: 'iPad landscape', width: 1180, height: 820, touch: true },
    { name: 'iPad portrait', width: 820, height: 1180, touch: true },
    { name: 'phone 390', width: 390, height: 844, touch: true },
    { name: 'phone 320', width: 320, height: 640, touch: true },
  ]
  for (const d of DEVICES) {
    test.describe(`SP-41 edges and corners on ${d.name}`, () => {
      test.use({ hasTouch: d.touch })
      test(`the whole strip stays at least 12 px inside at ${d.width}x${d.height}`, async ({
        page,
      }) => {
        await open(page, { width: d.width, height: d.height })
        for (const pos of POSITIONS) {
          await openAt(page, pos)
          const s = await box(bar(page))
          const where = `${d.name} ${pos}`
          expect(s.x, where).toBeGreaterThanOrEqual(12 - 0.5)
          expect(s.y, where).toBeGreaterThanOrEqual(12 - 0.5)
          expect(s.x + s.width, where).toBeLessThanOrEqual(d.width - 12 + 0.5)
          expect(s.y + s.height, where).toBeLessThanOrEqual(d.height - 12 + 0.5)
          const side = await page
            .getByTestId('context-strip')
            .getAttribute('data-side')
          if (side !== 'over') {
            const sel = await box(page.getByTestId('menus-selection'))
            expect(overlaps(s, sel), where).toBe(false)
          }
          await closeStrip(page)
        }
      })
    })
  }

  test('a tall selection puts the strip beside it', async ({ page }) => {
    await open(page, { width: 1180, height: 820 })
    await openAt(page, 'tall')
    await expect(page.getByTestId('context-strip')).toHaveAttribute(
      'data-side',
      /right|left/,
    )
  })

  test('SP-42 Paste opens a picker below the strip; another arrow replaces it', async ({
    page,
  }) => {
    await open(page, { width: 1180, height: 820 })
    await openAt(page, 'middle')
    const paste = cs(page, 'cs-paste')
    await expect(paste).toHaveAttribute('aria-expanded', 'false')
    await paste.click()
    await expect(paste).toHaveAttribute('aria-expanded', 'true')
    const card = picker(page)
    await expect(card).toBeVisible()
    await expect(card).toHaveCount(1)
    const s = await box(bar(page))
    await expect
      .poll(async () => (await box(card)).y)
      .toBeGreaterThanOrEqual(s.y + s.height)
    const p = await box(card)
    // (the card scales in for 160 ms: wait for its final width)
    await expect.poll(async () => Math.round((await box(card)).width)).toBe(304)
    expect(p.x).toBeGreaterThanOrEqual(12)
    await expect(card.getByRole('menuitem')).toHaveCount(4)
    // Another arrow replaces it: still one picker, now with the colours.
    await cs(page, 'cs-colour').click()
    await expect(picker(page)).toHaveCount(1)
    await expect(picker(page).getByTestId('cs-pick-red')).toBeVisible()
    await expect(paste).toHaveAttribute('aria-expanded', 'false')
    // A choice reports itself and closes the strip.
    await picker(page).getByTestId('cs-pick-red').click()
    await expect(page.getByTestId('menus-did')).toContainText('colour / red')
    await expect(page.getByTestId('context-strip')).toHaveCount(0)
  })

  for (const d of [
    { name: 'phone 390', width: 390, height: 844 },
    { name: 'iPad', width: 820, height: 1180 },
  ]) {
    test(`SP-43 the more button opens the full list in the same place on ${d.name}`, async ({
      page,
    }) => {
      await open(page, d)
      await openAt(page, 'middle')
      const items = await bar(page).getByRole('menuitem').count()
      if (d.width < 600) expect(items).toBeLessThanOrEqual(5) // 4 + more
      const before = await box(bar(page))
      await cs(page, 'cs-more').click()
      const list = page.getByTestId('command-list')
      await expect(list).toBeVisible()
      await expect(list.getByRole('listbox')).toBeVisible()
      let last = ''
      await expect
        .poll(async () => {
          const now = JSON.stringify(await list.boundingBox())
          const same = now === last
          last = now
          return same
        })
        .toBe(true)
      const l = await box(list)
      // Same place: centred over the selection like the strip was.
      expect(
        Math.abs(l.x + l.width / 2 - (before.x + before.width / 2)),
      ).toBeLessThanOrEqual(Math.max(2, (l.width - before.width) / 2 + 12))
      expect(l.x).toBeGreaterThanOrEqual(12 - 0.5)
      expect(l.x + l.width).toBeLessThanOrEqual(d.width - 12 + 0.5)
      expect(l.y).toBeGreaterThanOrEqual(12 - 0.5)
      expect(l.y + l.height).toBeLessThanOrEqual(d.height - 12 + 0.5)
      const sel = await box(page.getByTestId('menus-selection'))
      expect(overlaps(l, sel)).toBe(false)
      // Every row can be tapped (it is not covered and 44 px tall).
      await list.getByTestId('cl-show-all').click()
      const rows = list.getByRole('option')
      const n = await rows.count()
      expect(n).toBeGreaterThan(8)
      for (let i = 0; i < n; i++) {
        const row = rows.nth(i)
        await row.scrollIntoViewIfNeeded()
        expect((await box(row)).height).toBeGreaterThanOrEqual(44)
        await row.click({ trial: true })
      }
      if (d.width < 600) {
        await expect(rows.filter({ hasText: 'Duplicate' })).toHaveCount(1)
        await expect(rows.filter({ hasText: 'Cut' })).toHaveCount(1)
      }
      await rows.filter({ hasText: 'Bold' }).first().click()
      await expect(page.getByTestId('menus-did')).toContainText('bold')
      await expect(page.getByTestId('command-list')).toHaveCount(0)
    })
  }

  test('SP-44 Esc or a tap outside closes the strip and focus returns', async ({
    page,
  }) => {
    await open(page, { width: 1180, height: 820 })
    const opener = page.getByTestId('menus-at-middle')
    await openAt(page, 'middle')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('context-strip')).toHaveCount(0)
    await expect(opener).toBeFocused()
    // Esc closes the picker first, then the strip.
    await openAt(page, 'middle')
    await cs(page, 'cs-paste').click()
    await expect(picker(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(picker(page)).toHaveCount(0)
    await expect(cs(page, 'cs-paste')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('context-strip')).toHaveCount(0)
    // A tap outside.
    await openAt(page, 'middle')
    await page.getByRole('heading', { name: /Context strip/ }).click()
    await expect(page.getByTestId('context-strip')).toHaveCount(0)
  })

  test('the strip moves with arrow keys and opens a picker with Down', async ({
    page,
  }) => {
    await open(page, { width: 1180, height: 820 })
    await openAt(page, 'middle')
    await expect(cs(page, 'cs-paste')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(cs(page, 'cs-colour')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(picker(page)).toBeVisible()
    await expect(picker(page).getByTestId('cs-pick-ink')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(picker(page).getByTestId('cs-pick-red')).toBeFocused()
  })

  const list = (page: Page) => page.getByTestId('demo-list')

  test('SP-45 typing filters by name and alias; No match shows', async ({
    page,
  }) => {
    await open(page)
    const input = list(page).getByTestId('cl-input')
    await input.scrollIntoViewIfNeeded()
    await input.fill('col')
    await expect(list(page).getByRole('option')).toHaveCount(1)
    await expect(list(page).getByRole('option')).toHaveText('Colour')
    await input.fill('photo') // an alias of Picture
    await expect(list(page).getByRole('option')).toHaveText('Picture')
    await input.fill('zzz')
    await expect(list(page).getByRole('option')).toHaveCount(0)
    await expect(list(page).getByTestId('cl-none')).toHaveText('No match')
  })

  test('SP-46 up, down and Enter move the highlight and pick', async ({
    page,
  }) => {
    await open(page)
    const input = list(page).getByTestId('cl-input')
    await input.scrollIntoViewIfNeeded()
    await input.focus()
    const rows = list(page).getByRole('option')
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'false')
    await expect(input).toHaveAttribute(
      'aria-activedescendant',
      (await rows.nth(1).getAttribute('id')) ?? '',
    )
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('menus-did')).toHaveText('Picked: italic')
  })

  test('SP-47 the last 3 picked show in Recent on top', async ({ page }) => {
    await open(page)
    const l = list(page)
    await l.getByTestId('cl-input').scrollIntoViewIfNeeded()
    for (const id of ['bold', 'italic', 'colour', 'turn'])
      await l.getByTestId(`cl-item-${id}`).click()
    await expect(l.getByTestId('cl-group-recent')).toHaveText('Recent')
    const recent = await l
      .locator('[data-recent]')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).dataset.testid ?? ''),
      )
    expect(recent).toEqual([
      'cl-recent-turn',
      'cl-recent-colour',
      'cl-recent-italic',
    ])
    // Recent is the first group in the list.
    expect(
      await l.getByRole('option').first().getAttribute('data-recent'),
    ).toBe('true')
  })

  test('SP-48 Show all shows every group', async ({ page }) => {
    await open(page)
    const l = list(page)
    await l.getByTestId('cl-input').scrollIntoViewIfNeeded()
    await expect(l.getByRole('option')).toHaveCount(6) // 5 + Show all
    await expect(l.getByTestId('cl-group-page')).toHaveCount(0)
    await l.getByTestId('cl-show-all').click()
    await expect(l.getByTestId('cl-show-all')).toHaveCount(0)
    await expect(l.getByRole('option')).toHaveCount(12)
    for (const g of ['format', 'insert', 'page'])
      await expect(l.getByTestId(`cl-group-${g}`)).toBeAttached()
  })

  test('the strip and list stay in the screen on a 320 px phone', async ({
    page,
  }) => {
    await open(page, { width: 320, height: 640 })
    await page.getByTestId('demo-strip').scrollIntoViewIfNeeded()
    const over = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(over).toBeLessThanOrEqual(0)
    for (const id of ['demo-strip', 'demo-strip-phone', 'demo-list']) {
      const b = await box(page.getByTestId(id))
      expect(b.x + b.width, id).toBeLessThanOrEqual(320 + 0.5)
    }
  })
})
