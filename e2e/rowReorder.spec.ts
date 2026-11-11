import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')
const rows = (page: Page) => main(page).locator('[data-reorder-row]')
const grip = (page: Page, title: string) =>
  rows(page).filter({ hasText: title }).locator('[data-reorder-grip]')
/** The shown order of the row titles. */
const order = (page: Page) =>
  rows(page).evaluateAll((els) =>
    els.map((el) => el.textContent?.match(/Alpha|Beta|Gamma/)?.[0] ?? ''),
  )

async function booksWithRows(page: Page, view: 'Table' | 'List') {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  for (const title of ['Alpha', 'Beta', 'Gamma']) {
    await main(page).getByRole('button', { name: '+ New row' }).click()
    await page.getByRole('textbox', { name: /^Title/ }).fill(title)
    await page.getByRole('textbox', { name: /^Title/ }).press('Enter')
  }
  if (view === 'List') {
    await main(page).getByRole('button', { name: '+ View' }).click()
    await page
      .getByRole('dialog', { name: 'Add a view' })
      .getByRole('button', { name: 'List' })
      .click()
    await expect(
      main(page).getByRole('button', { name: 'List', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(rows(page)).toHaveCount(3)
}

async function mouseDrag(page: Page, from: Locator, to: Locator, top: boolean) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, top ? b.y + 3 : b.y + b.height - 3, {
    steps: 12,
  })
  await page.mouse.up()
}

const names = ['Alpha', 'Beta', 'Gamma']

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

for (const view of ['Table', 'List'] as const) {
  test(`${view}: drag the grip to re-order rows, one Undo puts it back`, async ({
    page,
  }) => {
    await booksWithRows(page, view)
    expect(await order(page)).toEqual(names)

    // Gamma above Alpha.
    await mouseDrag(page, grip(page, 'Gamma'), rows(page).first(), true)
    await expect.poll(() => order(page)).toEqual([names[2], names[0], names[1]])
    await expect(page.getByText('“Gamma” moved.')).toBeVisible()

    // It stays after a reload of the view (saved).
    await main(page).getByRole('button', { name: 'Table', exact: true }).click()
    await expect.poll(() => order(page)).toEqual([names[2], names[0], names[1]])

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => order(page)).toEqual(names)

    // Alpha to the end (below Gamma).
    await mouseDrag(page, grip(page, 'Alpha'), rows(page).last(), false)
    await expect.poll(() => order(page)).toEqual([names[1], names[2], names[0]])
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => order(page)).toEqual(names)
  })

  test(`${view}: keyboard re-orders (Space, arrows, Space); Escape cancels`, async ({
    page,
  }) => {
    await booksWithRows(page, view)

    await grip(page, 'Alpha').focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => order(page)).toEqual([names[1], names[2], names[0]])
    await expect(grip(page, 'Alpha')).toBeFocused()
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => order(page)).toEqual(names)

    await grip(page, 'Gamma').focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowUp')
    await expect.poll(() => order(page)).toEqual([names[0], names[2], names[1]])
    await page.keyboard.press('Escape')
    await expect.poll(() => order(page)).toEqual(names)
  })
}

test('a sorted Table has no grips (the sort decides the order)', async ({
  page,
}) => {
  await booksWithRows(page, 'Table')
  await main(page)
    .getByRole('columnheader')
    .getByRole('button', { name: /^Title/ })
    .click()
  await page.getByRole('button', { name: 'A → Z' }).click()
  await expect(main(page).locator('[data-reorder-grip]')).toHaveCount(0)
})

test('a finger or pen on the grip re-orders at once (the grip never scrolls)', async ({
  page,
}) => {
  await booksWithRows(page, 'Table')
  const a = (await grip(page, 'Gamma').boundingBox())!
  const b = (await rows(page).first().boundingBox())!
  await grip(page, 'Gamma').evaluate(
    (el, { from, to }) => {
      const fire = (target: EventTarget, type: string, x: number, y: number) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'touch',
            pointerId: 3,
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
          }),
        )
      fire(el, 'pointerdown', from.x, from.y)
      for (let i = 1; i <= 8; i++) {
        fire(
          document,
          'pointermove',
          from.x + ((to.x - from.x) * i) / 8,
          from.y + ((to.y - from.y) * i) / 8,
        )
      }
      fire(document, 'pointerup', to.x, to.y)
    },
    {
      from: { x: a.x + a.width / 2, y: a.y + a.height / 2 },
      to: { x: b.x + b.width / 2, y: b.y + 3 },
    },
  )
  await expect.poll(() => order(page)).toEqual(['Gamma', 'Alpha', 'Beta'])
})
