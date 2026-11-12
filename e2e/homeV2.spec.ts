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
  const first = await box(widget(page, 'cards'))
  const grip = widget(page, 'pending').locator('.rord-grip')
  const g = await box(grip)
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 6, { steps: 2 })
  // Aim so the dragged card's centre sits on the edge of the first small card.
  const pb = await box(widget(page, 'pending'))
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
