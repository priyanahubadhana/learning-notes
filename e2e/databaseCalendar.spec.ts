import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const view = (page: Page, name: string) =>
  main(page).getByRole('button', { name, exact: true })
const days = (page: Page) => main(page).locator('[data-calendar-day]')
const chip = (page: Page, title: string) =>
  main(page).locator('[data-chip-label]').filter({ hasText: title })
/** The day cell a chip is in (its date). */
const dayOfChip = (chipEl: Locator) =>
  chipEl.evaluate(
    (el) =>
      el.closest<HTMLElement>('[data-calendar-day]')!.dataset.calendarDay!,
  )

async function openBooks(page: Page) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
}

async function backToBooks(page: Page, name: string) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  await view(page, name).click()
}

/** "+" on the n-th day of the month grid adds a row with this title. */
async function addOnDay(page: Page, index: number, title: string) {
  const day = days(page).nth(index)
  await day.hover()
  await day.getByRole('button', { name: /^Add a row on/ }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill(title)
  await page.getByRole('textbox', { name: 'Title' }).press('Enter')
}

/** A mouse drag that goes there in steps (a drag needs real moves). */
async function mouseDrag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('Calendar: drag a row to another day changes its date, one Undo puts it back', async ({
  page,
}) => {
  await openBooks(page)
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await addOnDay(page, 10, 'Dune')
  await backToBooks(page, 'Calendar')

  const dune = chip(page, 'Dune')
  await expect(dune).toBeVisible()
  const start = await dayOfChip(dune)
  const target = days(page).nth(12)
  const targetDay = await target.getAttribute('data-calendar-day')
  expect(targetDay).not.toBe(start)

  // Mouse: the row is now on the other day.
  await mouseDrag(page, dune, target)
  await expect(target.locator('[data-chip-label]')).toContainText('Dune')
  await expect(page.getByText(/“Dune” moved to/)).toBeVisible()

  // One Undo puts it back.
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    main(page).locator(`[data-calendar-day="${start}"] [data-chip-label]`),
  ).toContainText('Dune')
  await expect(target.locator('[data-chip-label]')).toHaveCount(0)

  // Dropping outside the calendar (or on its own day) changes nothing.
  const same = main(page).locator(`[data-calendar-day="${start}"]`)
  await mouseDrag(page, chip(page, 'Dune'), same)
  await expect(
    main(page).locator(`[data-calendar-day="${start}"] [data-chip-label]`),
  ).toContainText('Dune')

  // A plain click still opens the row.
  await chip(page, 'Dune').click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Dune')
})

test('Calendar: keyboard moves a row (Space, arrows, Space) with one Undo; Escape cancels', async ({
  page,
}) => {
  await openBooks(page)
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await addOnDay(page, 10, 'Dune')
  await backToBooks(page, 'Calendar')

  const start = await dayOfChip(chip(page, 'Dune'))
  const at = (day: string) =>
    main(page).locator(`[data-calendar-day="${day}"] [data-chip-label]`)
  const plus = (n: number) => {
    const d = new Date(`${start}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
  }

  await chip(page, 'Dune').focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown') // a week later
  await expect(at(plus(9))).toContainText('Dune')
  // The chip keeps the focus although it changed cells.
  await expect(chip(page, 'Dune')).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByText(/“Dune” moved to/)).toBeVisible()
  await expect(at(plus(9))).toContainText('Dune')

  // One Undo for the whole move.
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(at(start)).toContainText('Dune')

  // Escape puts it back.
  await chip(page, 'Dune').focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowLeft')
  await expect(at(plus(-1))).toContainText('Dune')
  await page.keyboard.press('Escape')
  await expect(at(start)).toContainText('Dune')
})

test('Calendar: Year view shows 12 months with dots; a day opens its month', async ({
  page,
}) => {
  await openBooks(page)
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await addOnDay(page, 10, 'Dune')
  await backToBooks(page, 'Calendar')
  const day = await dayOfChip(chip(page, 'Dune'))

  await main(page).getByRole('button', { name: 'Year', exact: true }).click()
  await expect(main(page).locator('[data-year-month]')).toHaveCount(12)
  await expect(main(page).locator('[data-year-dot]')).toHaveCount(1)
  const tapped = main(page).locator(`[data-year-day="${day}"]`)
  await expect(tapped.locator('[data-year-dot]')).toHaveCount(1)

  // Tap the day: back to the month view of that day.
  await tapped.click()
  await expect(
    main(page).getByRole('button', { name: 'Month', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(main(page).locator(`[data-calendar-day="${day}"]`)).toBeVisible()

  // Previous / next move by a year in the Year view.
  await main(page).getByRole('button', { name: 'Year', exact: true }).click()
  const heading = main(page).getByRole('heading', { level: 3 })
  await expect(heading).toHaveText(/^[0-9]{4}$/)
  const year = Number(await heading.textContent())
  await main(page).getByRole('button', { name: 'Next' }).click()
  await expect(heading).toHaveText(String(year + 1))
  await main(page).getByRole('button', { name: 'Today' }).click()
  await expect(heading).toHaveText(String(year))
})

test('Calendar: a crowded day shows 3 rows and “+ N more” lists them all', async ({
  page,
}) => {
  await openBooks(page)
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  // Five rows on one day: three show, "+ 2 more" opens the rest.
  for (let i = 1; i <= 5; i++) {
    await addOnDay(page, 10, `Book ${i}`)
    await backToBooks(page, 'Calendar')
  }
  const cell = days(page).nth(10)
  await expect(cell.locator('[data-chip-label]')).toHaveCount(3)
  await cell.getByRole('button', { name: /^Show all rows on/ }).click()
  const list = page.getByRole('dialog', { name: /^Rows on/ })
  await expect(list.getByRole('button')).toHaveCount(5)
  await page.keyboard.press('Escape')
})

/** Pen and finger drags, sent as the browser's own pointer / touch events. */
for (const kind of ['pen', 'finger'] as const) {
  test(`Calendar: a ${kind} drag moves a row to another day (Undo puts it back)`, async ({
    page,
  }) => {
    await openBooks(page)
    await main(page).getByRole('button', { name: '+ View' }).click()
    await page
      .getByRole('dialog', { name: 'Add a view' })
      .getByRole('button', { name: 'Calendar' })
      .click()
    await addOnDay(page, 10, 'Dune')
    await backToBooks(page, 'Calendar')

    const dune = chip(page, 'Dune')
    const start = await dayOfChip(dune)
    const target = days(page).nth(11)
    const a = (await dune.boundingBox())!
    const b = (await target.boundingBox())!
    const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
    const to = { x: b.x + b.width / 2, y: b.y + b.height / 2 }

    await dune.evaluate(
      async (el, { kind, from, to }) => {
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
        const at = (t: number) => ({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        })
        if (kind === 'pen') {
          const fire = (
            target: EventTarget,
            type: string,
            p: { x: number; y: number },
          ) =>
            target.dispatchEvent(
              new PointerEvent(type, {
                pointerType: 'pen',
                pointerId: 7,
                isPrimary: true,
                button: 0,
                buttons: 1,
                clientX: p.x,
                clientY: p.y,
                bubbles: true,
                cancelable: true,
              }),
            )
          fire(el, 'pointerdown', from)
          for (let i = 1; i <= 8; i++) fire(document, 'pointermove', at(i / 8))
          fire(document, 'pointerup', to)
          return
        }
        const touch = (p: { x: number; y: number }) =>
          new Touch({
            identifier: 1,
            target: el,
            clientX: p.x,
            clientY: p.y,
          })
        const send = (
          target: EventTarget,
          type: string,
          p: { x: number; y: number },
          ended = false,
        ) =>
          target.dispatchEvent(
            new TouchEvent(type, {
              touches: ended ? [] : [touch(p)],
              targetTouches: ended ? [] : [touch(p)],
              changedTouches: [touch(p)],
              bubbles: true,
              cancelable: true,
            }),
          )
        send(el, 'touchstart', from)
        await wait(500) // hold to pick it up
        for (let i = 1; i <= 8; i++) send(document, 'touchmove', at(i / 8))
        send(document, 'touchend', to, true)
      },
      { kind, from, to },
    )

    await expect(target.locator('[data-chip-label]')).toContainText('Dune')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(
      main(page).locator(`[data-calendar-day="${start}"] [data-chip-label]`),
    ).toContainText('Dune')
  })
}

test('Calendar: a finger that moves before the hold scrolls instead of dragging', async ({
  page,
}) => {
  await openBooks(page)
  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await addOnDay(page, 10, 'Dune')
  await backToBooks(page, 'Calendar')
  const dune = chip(page, 'Dune')
  const start = await dayOfChip(dune)
  const b = (await days(page).nth(11).boundingBox())!
  await dune.evaluate(
    async (el, to) => {
      const r = el.getBoundingClientRect()
      const touch = (x: number, y: number) =>
        new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
      const send = (target: EventTarget, type: string, x: number, y: number) =>
        target.dispatchEvent(
          new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [touch(x, y)],
            changedTouches: [touch(x, y)],
            bubbles: true,
            cancelable: true,
          }),
        )
      send(el, 'touchstart', r.x + 5, r.y + 5)
      send(document, 'touchmove', r.x + 5, r.y + 60) // moved at once: a scroll
      await new Promise((res) => setTimeout(res, 500))
      send(document, 'touchmove', to.x, to.y)
      send(document, 'touchend', to.x, to.y)
    },
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
  )
  await expect(
    main(page).locator(`[data-calendar-day="${start}"] [data-chip-label]`),
  ).toContainText('Dune')
})
