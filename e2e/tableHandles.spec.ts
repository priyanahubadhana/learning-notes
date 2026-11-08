import { expect, test, type Page } from '@playwright/test'

/** Fix 3: calm table grips and block handles. */

test.use({ viewport: { width: 1200, height: 800 } })

const visible = (page: Page, sel: string) =>
  page.evaluate(
    (s) =>
      [...document.querySelectorAll(s)].filter((e) => {
        const st = getComputedStyle(e)
        return (
          e.getBoundingClientRect().width > 0 &&
          st.opacity !== '0' &&
          st.visibility !== 'hidden'
        )
      }).length,
    sel,
  )

async function tablePage(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/table')
  await page.keyboard.press('Enter')
  await page.keyboard.type('A')
}

test('table grips show on hover, hide within 500 ms of leaving, and show a column grip pill', async ({
  page,
}) => {
  await tablePage(page)
  await page.mouse.move(900, 700)
  await expect.poll(() => visible(page, '.bn-table-handle')).toBe(0)
  const cell = page.locator('.bn-editor td').nth(4)
  await cell.hover()
  await expect.poll(() => visible(page, '.bn-table-handle')).toBeGreaterThan(0)
  await expect.poll(() => visible(page, '.bn-extend-button')).toBeGreaterThan(0)
  await page.mouse.move(900, 700)
  await page.waitForTimeout(500)
  expect(await visible(page, '.bn-table-handle')).toBe(0)
  expect(await visible(page, '.bn-extend-button')).toBe(0)
  // A column border shows the grip pill and the resize cursor.
  const box = (await page.locator('.bn-editor td').nth(1).boundingBox())!
  await page.mouse.move(box.x + box.width - 1, box.y + 10)
  await expect(page.locator('.column-resize-handle').first()).toBeVisible()
  const w0 = box.width
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 60, box.y + 10, { steps: 5 })
  await page.mouse.up()
  const w1 = (await page.locator('.bn-editor td').nth(1).boundingBox())!.width
  expect(w1).toBeGreaterThan(w0 + 30)
})

test('the block side menu hides after the pointer leaves the page', async ({
  page,
}) => {
  await tablePage(page)
  await page.locator('.bn-editor td').nth(0).hover()
  await expect.poll(() => visible(page, '.bn-side-menu')).toBeGreaterThan(0)
  await page.mouse.move(150, 700)
  await page.waitForTimeout(500)
  expect(await visible(page, '.bn-side-menu')).toBe(0)
})

test('Ctrl+A steps: cell words, whole table, all blocks', async ({ page }) => {
  await tablePage(page)
  await page.keyboard.type(' word')
  const sel = () =>
    page.evaluate(() => ({
      text: window.getSelection()?.toString() ?? '',
      cells: document.querySelectorAll('.selectedCell').length,
    }))
  await page.keyboard.press('Control+a')
  expect((await sel()).text).toBe('A word')
  expect((await sel()).cells).toBe(0)
  await page.keyboard.press('Control+a')
  expect((await sel()).cells).toBe(6)
  await page.keyboard.press('Control+a')
  // Everything: the whole page is selected, so Delete leaves a clean page.
  await page.keyboard.press('Control+c')
  await page.keyboard.press('Delete')
  await expect(page.locator('.bn-editor table')).toHaveCount(0)
  await page.keyboard.press('Control+v')
  await expect(page.locator('.bn-editor table')).toHaveCount(1)
})

test('Ctrl+A in a text block steps block then page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('one')
  await page.keyboard.press('Enter')
  await page.keyboard.type('two')
  await page.keyboard.press('Control+a')
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('two')
  await page.keyboard.press('Control+a')
  expect(await page.evaluate(() => getSelection()?.toString())).toContain('one')
})

test('a row border grip drags the row height and it is kept', async ({
  page,
}) => {
  await tablePage(page)
  const row = page.locator('.bn-editor tr').first()
  const before = (await row.boundingBox())!
  await page.mouse.move(before.x + 40, before.y + before.height - 1)
  const grip = page.locator('.ln-row-grip').first()
  await expect(grip).toBeVisible()
  const g = (await grip.boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + 80, { steps: 5 })
  await page.mouse.up()
  const after = (await row.boundingBox())!
  expect(after.height).toBeGreaterThan(before.height + 40)
  await page.reload()
  await expect
    .poll(
      async () =>
        (await page.locator('.bn-editor tr').first().boundingBox())?.height ??
        0,
    )
    .toBeGreaterThan(before.height + 40)
})

test('double-click on a column border fits the column to its text', async ({
  page,
}) => {
  await tablePage(page)
  await page.keyboard.type(' short')
  const cell = page.locator('.bn-editor td').nth(1)
  const box = (await cell.boundingBox())!
  await page.mouse.move(box.x + box.width - 1, box.y + 10)
  await expect(page.locator('.column-resize-handle').first()).toBeVisible()
  await page.mouse.dblclick(box.x + box.width - 1, box.y + 10)
  await expect
    .poll(async () => (await cell.boundingBox())!.width)
    .toBeLessThan(box.width - 20)
})
