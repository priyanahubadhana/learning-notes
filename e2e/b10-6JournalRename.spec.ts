// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { openSidebar, sheetFill, sidebar } from './helpers.ts'

/**
 * B10-6 (R20): at iPad size a double tap on a Journal month opens the Name it
 * sheet (touch never edits in the row); the new name is kept after a reload.
 */
test.use({
  viewport: { width: 1024, height: 768 },
  hasTouch: true,
  isMobile: true,
})

const monthName = () =>
  new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(),
  )

test('B10-6 double tap on a Journal month renames it (iPad size)', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  const side = await openSidebar(page)
  const month = side.getByRole('button', { name: monthName(), exact: true })
  await doubleTap(page, month)
  expect(await sheetFill(page, 'My exam month')).toBe(true)
  await expect(
    side.getByRole('button', { name: 'My exam month', exact: true }),
  ).toBeVisible()
  await page.reload()
  const again = await openSidebar(page)
  await expect(
    again.getByRole('button', { name: 'My exam month', exact: true }),
  ).toBeVisible()
})

const taken: string[] = []
for (const [name, size] of Object.entries({
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
}))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`B10-6 pictures: ${name} ${tname}`, async ({ page }, info) => {
      if (name === 'phone') {
        // A phone: size first, then one straight path. Today's button is in the
        // drawer; opening the page closes the drawer; open it again for ⋯.
        await page.setViewportSize(size)
        await page.goto('/')
        const side = sidebar(page)
        await page.getByRole('button', { name: 'Open menu' }).click()
        await expect(side).toBeVisible()
        await page.getByRole('button', { name: 'Open today’s journal' }).tap()
        // Why: the page is made a moment after the tap (WebKit on this PC writes
        // about 900x slower than Chromium, which is how this race showed up).
        await expect.poll(() => page.url()).toContain('#/page/')
        await expect(side).toBeHidden()
        await page.getByRole('button', { name: 'Open menu' }).click()
        await expect(side).toBeVisible()
        const more = side.getByRole('button', {
          name: `More for ${monthName()}`,
        })
        // The rows slide and settle for a moment as the drawer opens: tap once they stand still.
        await stands(more)
        await more.tap()
        await expect(
          page.getByRole('menuitem', { name: 'Rename' }),
        ).toBeVisible()
        await page.getByRole('menuitem', { name: 'Rename' }).tap()
      } else {
        await page.goto('/')
        await page.getByRole('button', { name: 'Open today’s journal' }).click()
        await page.setViewportSize(size)
        const side = await openSidebar(page)
        await doubleTap(
          page,
          side.getByRole('button', { name: monthName(), exact: true }),
        )
      }
      await expect(page.getByTestId('name-sheet')).toBeVisible()
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      const out = `screenshots/b10-6/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-6 Journal month rename (Name it sheet)\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })

/** Two quick finger taps on the same spot (a real double tap), once the row stands still. */
async function doubleTap(page: Page, el: Locator) {
  await expect
    .poll(async () => {
      const a = (await el.boundingBox())!
      await page.waitForTimeout(150)
      const b = (await el.boundingBox())!
      return a.y === b.y && a.x === b.x
    })
    .toBe(true)
  const r = (await el.boundingBox())!
  const x = r.x + r.width / 2
  const y = r.y + r.height / 2
  await page.touchscreen.tap(x, y)
  await page.touchscreen.tap(x, y)
}

/** Waits until the drawer row has stopped moving: its position and size match on two reads in a row. */
async function stands(el: Locator) {
  let last = ''
  await expect
    .poll(async () => {
      const now = JSON.stringify(await el.boundingBox())
      const same = now === last
      last = now
      return same
    })
    .toBe(true)
}
