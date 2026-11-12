// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/** Slice 5: Home v2 board (flag `home.v2`). Spec: docs/plans/home-v2-spec.md. */

async function openHome(page: Page, url = '/?flags=home.v2') {
  await page.goto(url)
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  // The board is its own chunk: wait until it has drawn its widgets.
  if (url.includes('home.v2'))
    await expect(
      page.getByTestId('home-widgets').locator('> li[data-reorder-id]'),
    ).not.toHaveCount(0)
}

const ids = (page: Page) =>
  page
    .getByTestId('home-widgets')
    .locator('> li[data-reorder-id]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.reorderId))

const widget = (page: Page, id: string) =>
  page.locator(`li[data-reorder-id="${id}"]`)

async function box(l: Locator) {
  const b = await l.boundingBox()
  if (!b) throw new Error('no box')
  return b
}

/** Waits until the drop animation is over (the box stops moving). */
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

async function edit(page: Page) {
  await page.getByTestId('home-edit').click()
  await expect(page.getByTestId('home-edit-bar')).toBeVisible()
}

async function setSizes(page: Page, sizes: Record<string, 's' | 'm' | 'l'>) {
  for (const [id, size] of Object.entries(sizes)) {
    await page.getByTestId(`size-${id}-${size}`).click()
    await expect(page.getByTestId(`widget-${id}`)).toHaveAttribute(
      'data-size',
      size,
    )
  }
  // The board animates to its new layout; boxes measured mid-way aimed the
  // drags at the wrong spot on a busy runner. Wait until every widget is still.
  for (const id of Object.keys(sizes))
    await settled(page.locator(`li[data-reorder-id="${id}"]`))
}

test('flag off: Home looks as before (no board, no edit button)', async ({
  page,
}) => {
  await openHome(page, '/')
  await expect(page.getByTestId('home-today')).toBeVisible()
  await expect(page.getByTestId('top3')).toBeVisible()
  await expect(page.getByTestId('home-board')).toHaveCount(0)
  await expect(page.getByTestId('home-edit')).toHaveCount(0)
  await expect(page.getByText('Pending items')).toHaveCount(0)
})

test('flag on: six widgets, no top-bar Done, new wording', async ({ page }) => {
  await openHome(page)
  expect(await ids(page)).toEqual([
    'cards',
    'briefing',
    'top3',
    'pending',
    'timer',
    'record',
  ])
  await expect(
    page.getByRole('button', { name: 'Done', exact: true }),
  ).toHaveCount(0)
  const text = (await page.getByTestId('home-board').innerText()) ?? ''
  expect(text).not.toMatch(/Period|Built from/)
  await expect(page.getByTestId('source-top3').first()).toHaveText(
    'Where this comes from',
  )
})

test('S / M / L applies at once, shows the chosen size, never removes the widget', async ({
  page,
}) => {
  await openHome(page)
  await edit(page)
  for (const size of ['s', 'l', 'm'] as const) {
    await page.getByTestId(`size-top3-${size}`).click()
    await expect(page.getByTestId('widget-top3')).toHaveAttribute(
      'data-size',
      size,
    )
    await expect(page.getByTestId(`size-top3-${size}`)).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(page.getByTestId('widget-top3')).toBeVisible()
    expect((await ids(page)).sort()).toEqual(
      ['briefing', 'cards', 'pending', 'record', 'timer', 'top3'].sort(),
    )
  }
})

test('drag: others slide away live, a wide widget lands between small ones, an impossible spot snaps', async ({
  page,
}) => {
  // Tall window so the whole board is on screen for real mouse drags.
  await page.setViewportSize({ width: 1336, height: 2200 })
  await openHome(page)
  await edit(page)
  await setSizes(page, {
    cards: 's',
    briefing: 's',
    top3: 's',
    pending: 'm',
  })
  const grid = page.getByTestId('home-widgets')
  const before = await ids(page)
  await widget(page, 'cards').scrollIntoViewIfNeeded()
  await settled(widget(page, 'cards'))
  await settled(widget(page, 'pending'))
  const first = await box(widget(page, 'cards'))
  const grip = widget(page, 'pending').locator('.rord-grip')
  const g = await box(grip)
  // Aim so the dragged card's centre sits on the edge of the first small card
  // (measured before the lift, while the card is still).
  const pb = await box(widget(page, 'pending'))
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 6, { steps: 2 })
  const off = {
    x: pb.x + pb.width / 2 - (g.x + g.width / 2),
    y: pb.y + pb.height / 2 - (g.y + g.height / 2),
  }
  await page.mouse.move(
    first.x + first.width - off.x + 6,
    first.y + first.height / 2 - off.y,
    { steps: 12 },
  )
  // Live: the order has already changed while the button is still down.
  await expect
    .poll(async () => (await ids(page)).join())
    .not.toBe(before.join())
  await page.mouse.up()
  const after = await ids(page)
  expect(after).toHaveLength(6)
  expect(after.indexOf('pending')).toBeLessThanOrEqual(1)
  const gb = await box(grid)
  await settled(widget(page, 'pending'))
  const wb = await box(widget(page, 'pending'))
  expect(wb.x + wb.width).toBeLessThanOrEqual(gb.x + gb.width + 1)
  await expect(page.getByTestId('widget-pending')).toBeVisible()

  // A full-row widget dropped after a lone small one cannot sit there: it snaps.
  const rec = widget(page, 'record').locator('.rord-grip')
  const rg = await box(rec)
  await widget(page, 'cards').scrollIntoViewIfNeeded()
  const cardsNow = await box(widget(page, 'cards'))
  await page.mouse.move(rg.x + rg.width / 2, rg.y + rg.height / 2)
  await page.mouse.down()
  await page.mouse.move(rg.x + rg.width / 2, rg.y + rg.height / 2 - 6, {
    steps: 2,
  })
  await page.mouse.move(cardsNow.x + cardsNow.width - 4, cardsNow.y + 10, {
    steps: 12,
  })
  await page.mouse.up()
  const gb2 = await box(grid)
  await settled(widget(page, 'record'))
  const rb = await box(widget(page, 'record'))
  expect(rb.x).toBeGreaterThanOrEqual(gb2.x - 1)
  expect(rb.x + rb.width).toBeLessThanOrEqual(gb2.x + gb2.width + 1)
  expect(await ids(page)).toHaveLength(6)
})

test('Done saves the layout, Cancel drops it, Reset restores the default', async ({
  page,
}) => {
  await openHome(page)
  await edit(page)
  await page.getByTestId('size-timer-s').click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('widget-timer')).toHaveAttribute(
    'data-size',
    'l',
  )
  await edit(page)
  await page.getByTestId('size-timer-m').click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByTestId('home-edit-bar')).toHaveCount(0)
  await openHome(page)
  await expect(page.getByTestId('widget-timer')).toHaveAttribute(
    'data-size',
    'm',
  )
  await edit(page)
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByTestId('widget-timer')).toHaveAttribute(
    'data-size',
    'l',
  )
  await page.getByRole('button', { name: 'Done', exact: true }).click()
})

test('Where this comes from opens its own pop-up: ✕, Esc and an outside tap close it; the widget stays', async ({
  page,
}) => {
  await openHome(page)
  const body = page.getByTestId('body-top3')
  const text = await body.textContent()
  const popup = page.getByTestId('home-source-popup')

  await page.getByTestId('source-top3').click()
  await expect(popup).toBeVisible()
  await expect(popup).toContainText('How to build this')
  expect(await body.textContent()).toBe(text)
  await page.getByTestId('home-source-close').click()
  await expect(popup).toHaveCount(0)

  await page.getByTestId('source-top3').click()
  await expect(popup).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)

  await page.getByTestId('source-top3').click()
  await expect(popup).toBeVisible()
  await page.mouse.click(2, 2)
  await expect(popup).toHaveCount(0)
  await expect(page.getByTestId('widget-top3')).toBeVisible()
  expect(await body.textContent()).toBe(text)
})

test('Pending items lists open tasks and a tick finishes one', async ({
  page,
}) => {
  await openHome(page)
  await expect(page.getByTestId('pending-card')).toContainText(
    'Nothing pending.',
  )
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  for (const title of ['Write essay', 'Pay bill']) {
    await page.getByTestId('quick-add').fill(title)
    await page.getByTestId('quick-add').press('Enter')
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await expect(page.getByTestId('pending-title')).toHaveText(
    'Pending items (2)',
  )
  await page
    .getByTestId('pending-card')
    .getByRole('checkbox', { name: /Write essay/ })
    .click()
  await expect(page.getByTestId('pending-title')).toHaveText(
    'Pending items (1)',
  )
  await expect(page.getByTestId('pending-card')).not.toContainText(
    'Write essay',
  )
})

test('Edit layout shows the edit bar and per-widget controls; text cannot be selected', async ({
  page,
}) => {
  await openHome(page)
  await expect(page.getByTestId('home-edit')).toHaveText('Edit layout')
  await edit(page)
  const bar = page.getByTestId('home-edit-bar')
  for (const name of ['Done', 'Cancel', 'Reset'])
    await expect(bar.getByRole('button', { name, exact: true })).toBeVisible()
  const w = widget(page, 'top3')
  await expect(w.locator('.rord-grip')).toBeVisible()
  await expect(w.getByTestId('move-up')).toBeVisible()
  await expect(w.getByTestId('move-down')).toBeVisible()
  await expect(w.getByRole('radio')).toHaveCount(3)
  await expect(w.getByTestId('source-top3')).toBeVisible()
  await expect(page.getByTestId('widget-top3')).toHaveCSS('user-select', 'none')
})

test('up/down buttons and Alt+arrows move a widget to the next spot that fits', async ({
  page,
}) => {
  await openHome(page)
  await edit(page)
  const start = await ids(page)
  expect(start.indexOf('top3')).toBeLessThan(start.indexOf('pending'))
  await widget(page, 'top3').getByTestId('move-down').click()
  const a = await ids(page)
  expect(a.indexOf('top3')).toBeGreaterThan(a.indexOf('pending'))
  await widget(page, 'top3').focus()
  await page.keyboard.press('Alt+ArrowUp')
  const b = await ids(page)
  expect(b.indexOf('top3')).toBeLessThan(b.indexOf('pending'))
  expect(b).toHaveLength(6)
})

test('a widget with nothing to show is still there with a calm line', async ({
  page,
}) => {
  await openHome(page)
  await expect(page.getByTestId('widget-cards')).toContainText(
    'No cards are due.',
  )
  await expect(page.getByTestId('widget-pending')).toContainText(
    'Nothing pending.',
  )
  await expect(page.getByTestId('widget-top3')).toBeVisible()
  await expect(page.getByTestId('widget-record')).toBeVisible()
})

test('Pending items shows at most 5 and says how many more', async ({
  page,
}) => {
  await openHome(page)
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  for (let i = 1; i <= 7; i++) {
    await page.getByTestId('quick-add').fill(`Chore ${i}`)
    await page.getByTestId('quick-add').press('Enter')
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await expect(page.getByTestId('pending-title')).toHaveText(
    'Pending items (7)',
  )
  await expect(
    page.getByTestId('pending-card').getByRole('checkbox'),
  ).toHaveCount(5)
  await expect(page.getByTestId('pending-card')).toContainText('2 more')
})

test('reload keeps the saved layout (order and sizes)', async ({ page }) => {
  await openHome(page)
  await edit(page)
  await widget(page, 'top3').getByTestId('move-down').click()
  await page.getByTestId('size-timer-m').click()
  const order = await ids(page)
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.reload()
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-widgets')).toBeVisible()
  expect(await ids(page)).toEqual(order)
  await expect(page.getByTestId('widget-timer')).toHaveAttribute(
    'data-size',
    'm',
  )
})

async function inside(page: Page) {
  const gb = await box(page.getByTestId('home-widgets'))
  for (const id of (await ids(page)) as string[]) {
    await settled(widget(page, id))
    const b = await box(widget(page, id))
    expect(b.x).toBeGreaterThanOrEqual(gb.x - 1)
    expect(b.x + b.width).toBeLessThanOrEqual(gb.x + gb.width + 1)
  }
}

for (const dev of [
  { name: 'phone', w: 390, h: 844 },
  { name: 'iPad portrait', w: 820, h: 1180 },
]) {
  test(`${dev.name}: widgets stay inside the grid, sizes, moves and pop-up work`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: dev.w, height: dev.h })
    await openHome(page)
    await inside(page)
    await edit(page)
    for (const id of ['cards', 'briefing', 'top3', 'pending']) {
      await page.getByTestId(`size-${id}-s`).click()
    }
    await inside(page)
    await page.getByTestId('size-top3-l').click()
    await expect(page.getByTestId('widget-top3')).toHaveAttribute(
      'data-size',
      'l',
    )
    await inside(page)
    // the full-row widget starts at the left edge: it never leaves a hole
    const gb = await box(page.getByTestId('home-widgets'))
    await settled(widget(page, 'top3'))
    expect((await box(widget(page, 'top3'))).x).toBeLessThanOrEqual(gb.x + 1)
    await widget(page, 'pending').getByTestId('move-up').click()
    await inside(page)
    expect(await ids(page)).toHaveLength(6)
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.getByTestId('source-timer').click()
    await expect(page.getByTestId('home-source-popup')).toBeVisible()
    await page.getByTestId('home-source-close').click()
    await expect(page.getByTestId('home-source-popup')).toHaveCount(0)
  })
}
