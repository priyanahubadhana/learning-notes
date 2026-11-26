// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { start, rect, EXTRA } from './cBoxesHelpers.ts'

/**
 * C0-1 (owner, 20 Nov): every NEW box starts with the "Use for new boxes"
 * style: a tap at the top of an empty page (the page's own first box), a tap
 * lower, the phone's add-box button, a paste "As text box". Old boxes keep
 * their look; an empty default style means no style.
 */
test.use({ hasTouch: true })

const MAIN = '[data-paper-box="main"]'
const STYLE = { bg: 'lime', border: 'lime', radius: 12 }

async function setDefault(page: Page, value: Record<string, unknown>) {
  await page.evaluate(
    (v) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({
            id: 'paper.boxStyleDefault',
            value: v,
            updatedAt: Date.now(),
            v: 1,
          })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
    value,
  )
}

type Stored = { id: string; style?: Record<string, unknown> }
const boxes = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Stored[]>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const req = open.result
            .transaction('pages', 'readonly')
            .objectStore('pages')
            .getAll()
          req.onsuccess = () =>
            resolve(
              (req.result as { boxes?: Stored[]; deletedAt?: number }[])
                .filter((p) => !p.deletedAt)
                .flatMap((p) => p.boxes ?? []),
            )
          req.onerror = () => reject(req.error)
        }
      }),
  )

async function tapAt(page: Page, x: number, y: number) {
  await page.touchscreen.tap(x, y)
}

async function tapFirstLine(page: Page) {
  const first = await rect(
    page.locator(MAIN).locator('.bn-block-content').first(),
  )
  await tapAt(page, first.x + 6, first.y + 8)
}

async function textTool(page: Page) {
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await expect(text).toHaveAttribute('aria-pressed', 'true')
}

async function emptyPage(page: Page, name: string) {
  await start(page, name, false)
  await setDefault(page, STYLE)
  await textTool(page)
}

async function pasteAsBox(page: Page) {
  await page.locator(MAIN + ' .bn-editor').focus()
  await page.evaluate(() => {
    const data = new DataTransfer()
    data.setData(
      'text/html',
      '<div class="markdown"><h2>Agents</h2><p>Goal one</p></div>',
    )
    data.setData('text/plain', 'Agents\nGoal one')
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  const chooser = page.getByRole('dialog', { name: 'Paste as' })
  await chooser.getByRole('option', { name: /As text box/ }).click()
}

const extraStyle = async (page: Page) =>
  (await boxes(page)).find((b) => b.id !== 'main')?.style

test('C0-1 a tap at the top of an empty page: the first box starts with the style', async ({
  page,
}) => {
  await emptyPage(page, 'C01 top')
  await tapFirstLine(page)
  await expect(page.locator(MAIN + ' .bn-editor')).toBeFocused()
  await expect
    .poll(async () => (await boxes(page)).find((b) => b.id === 'main')?.style)
    .toMatchObject(STYLE)
})

test('C0-1 a tap lower on an empty page: the new box starts with the style', async ({
  page,
}) => {
  await emptyPage(page, 'C01 lower')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const m = await rect(page.locator(MAIN))
  await tapAt(page, sheet.x + sheet.width * 0.3, m.y + m.height + 120)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect.poll(() => extraStyle(page)).toMatchObject(STYLE)
})

test('C0-1 an empty default style: the first box and a new box have no style', async ({
  page,
}) => {
  await start(page, 'C01 none', false)
  await setDefault(page, {})
  await textTool(page)
  const m = await rect(page.locator(MAIN))
  await tapFirstLine(page)
  await expect(page.locator(MAIN + ' .bn-editor')).toBeFocused()
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  await tapAt(page, sheet.x + sheet.width * 0.3, m.y + m.height + 120)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect.poll(async () => (await boxes(page)).length).toBeGreaterThan(0)
  expect((await boxes(page)).every((b) => !b.style)).toBe(true)
})

test('C0-1 a paste as text box: the box starts with the style', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
  )
  await emptyPage(page, 'C01 paste')
  await pasteAsBox(page)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect.poll(() => extraStyle(page)).toMatchObject(STYLE)
})

test('C0-1 old boxes keep their look when the style is set later', async ({
  page,
}) => {
  await start(page, 'C01 old', true)
  await textTool(page)
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const m = await rect(page.locator(MAIN))
  await tapAt(page, sheet.x + sheet.width * 0.3, m.y + m.height + 120)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await page.keyboard.type('Old box words')
  await expect.poll(async () => (await boxes(page)).length).toBe(1)
  await setDefault(page, STYLE)
  await page.reload()
  await textTool(page)
  await tapFirstLine(page)
  await expect(page.locator(MAIN + ' .bn-editor')).toBeFocused()
  await expect(page.locator(EXTRA)).toHaveCount(1)
  const after = await boxes(page)
  expect(after.some((b) => b.id === 'main')).toBe(false)
  expect(after.every((b) => !b.style)).toBe(true)
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('C0-1 the add-box button in reading order: the box starts with the style', async ({
    page,
  }) => {
    await emptyPage(page, 'C01 plus')
    await page.locator('[data-paper-add-end]').click()
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await expect.poll(() => extraStyle(page)).toMatchObject(STYLE)
  })

  test('C0-1 a paste as text box on a phone: the box starts with the style', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
    )
    await emptyPage(page, 'C01 phone paste')
    await pasteAsBox(page)
    await expect(page.locator(EXTRA)).toHaveCount(1)
    await expect.poll(() => extraStyle(page)).toMatchObject(STYLE)
  })
})
