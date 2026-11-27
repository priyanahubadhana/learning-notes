// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { mkdirSync } from 'node:fs'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { rect } from './cBoxesHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * Pencil device mode shows the SAME text box v2 look and behaviour as touch
 * mode (owner 18 Nov, preview build-next, iPad with an Apple Pencil): our hint,
 * a one-line first box, a tap in the empty part selects the box, the new one
 * bar on a selected box, the first box like any other box. The older specs
 * ran in computer or touch mode, so a Pencil-only path was never checked.
 */
test.use({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
})

/** What the owner's preview has ON (Test a phase 2B). */
const PHASE_2B = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'journal.monthRepair',
]
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const MAIN = '[data-paper-box="main"]'

async function open(page: Page, mode: 'pencil' | 'touch') {
  await installRealPen(page)
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    PHASE_2B,
  )
  await startInMode(page, mode)
  await page.goto('/')
  // The owner's path: a NEW page (sidebar, Add page, Blank) in a notebook that already has pages.
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Old words')
  await addPage(page, 'Paper', 'Pencil v2')
  // The owner writes with the Text tool on.
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await expect(text).toHaveAttribute('aria-pressed', 'true')
}

/** The BlockNote hint text the first box draws (CSS ::after), '' when none. */
const bnHint = (page: Page) =>
  page.evaluate((sel) => {
    const el = document.querySelector(
      sel + ' .bn-block-content',
    ) as HTMLElement | null
    if (!el) return 'no block'
    const c = getComputedStyle(el, '::after').content
    return c === 'none' || c === 'normal' ? '' : c
  }, MAIN)

for (const mode of ['pencil', 'touch'] as const)
  test(`${mode} mode, pen: first box is one line, no hint, empty tap selects, one bar`, async ({
    page,
  }) => {
    await open(page, mode)
    const main = page.locator(MAIN)
    // The box has stopped moving (the page still settles for a moment on a slow
    // machine; a tap at an old place misses the box), then it is measured.
    const first = main.locator('.bn-block-content').first()
    let was = ''
    let still = 0
    await expect
      .poll(async () => {
        const now = JSON.stringify(await rect(first))
        still = now === was ? still + 1 : 0
        was = now
        return still
      })
      .toBeGreaterThanOrEqual(3)
    const box = await rect(first)
    // Tap the empty first box with the Pencil: caret in, our hint, not BlockNote's.
    await realPen(page, [{ x: box.x + 6, y: box.y + 8 }])
    await page.waitForTimeout(600)
    await expect(main.locator('.bn-editor')).toBeFocused()
    expect(await bnHint(page)).not.toContain('Enter text')
    // Owner 19 Nov (First box hint dropped): no hint of ours either.
    await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
    await expect(main).not.toContainText('tap anywhere')
    // One line tall, like every box.
    const h = (await rect(main.locator('.bn-block-content').first())).height
    expect(h).toBeLessThan(44)
    await page.keyboard.type('First words')
    await page.waitForTimeout(700)
    await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    const blocks = () => main.locator('.bn-block-content').count()
    const before = await blocks()
    // A Pencil tap in the empty part selects the box: no new line.
    const t = await rect(main.locator('.bn-inline-content').first())
    const b = await rect(main)
    await realPen(page, [{ x: b.x + b.width - 16, y: t.y + t.height / 2 }])
    await page.waitForTimeout(700)
    await expect(main).toHaveAttribute('data-main-picked', '')
    // Selected, the first box is still as tall as its text (one line).
    const sel = await rect(main)
    expect(sel.height).toBeLessThan(70)
    expect(await blocks()).toBe(before)
    // The new one bar, not the old one.
    await expect(page.locator('[data-box-bar]').first()).toBeVisible()
    await expect(page.locator('[data-box-bar-action]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Turn into' })).toHaveCount(0)
  })

test('pencil mode: the first box has the same look as a box made by a tap', async ({
  page,
}) => {
  await open(page, 'pencil')
  const main = page.locator(MAIN)
  const first = await rect(main.locator('.bn-block-content').first())
  await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
  await page.keyboard.type('Same')
  await page.waitForTimeout(600)
  const look = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(
        s + ' .bn-inline-content',
      ) as HTMLElement
      const cs = getComputedStyle(el)
      return [cs.fontSize, cs.fontFamily, cs.fontWeight]
    }, sel)
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const m = await rect(main)
  await page.mouse.click(sheet.x + sheet.width * 0.3, m.y + m.height + 80)
  const extra = '[data-paper-box]:not([data-paper-box="main"])'
  await expect(page.locator(extra)).toHaveCount(1)
  await page.keyboard.type('Same')
  await page.waitForTimeout(600)
  expect(await look(MAIN)).toEqual(await look(extra))
})

/** First-look pictures (iPad sideways, Professional): screenshots/pencil-v2/. */
for (const [label, theme] of [
  ['light', 'day'],
  ['dark', 'night'],
] as const)
  test(`pencil mode pictures: iPad sideways, ${label}`, async ({
    page,
  }, info) => {
    await open(page, 'pencil')
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    const main = page.locator(MAIN)
    const first = await rect(main.locator('.bn-block-content').first())
    await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
    await page.waitForTimeout(500)
    mkdirSync('screenshots/pencil-v2', { recursive: true })
    const out = (n: string) =>
      `screenshots/pencil-v2/${info.project.name}-${n}-${label}.png`
    await page.screenshot({ path: out('empty-first-box') })
    await page.keyboard.type('First words')
    await page.waitForTimeout(700)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    const t = await rect(main.locator('.bn-inline-content').first())
    const b = await rect(main)
    await realPen(page, [{ x: b.x + b.width - 16, y: t.y + t.height / 2 }])
    await page.waitForTimeout(700)
    await page.screenshot({ path: out('selected-one-bar') })
  })

/** Bug 6 (owner 18 Nov): an empty new box vanishes at once when the user taps away. */
for (const mode of ['pencil', 'touch'] as const)
  for (const how of ['pen', 'finger'] as const)
    test(`${mode} mode, ${how}: empty new boxes vanish when the next tap makes another box`, async ({
      page,
    }) => {
      await open(page, mode)
      // The owner ticked "Use for new boxes" on a filled, dashed style.
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('learning-notes')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const tx = open.result.transaction('settings', 'readwrite')
              tx.objectStore('settings').put({
                id: 'paper.boxStyleDefault',
                value: { bg: 'blue', border: 'purple', borderW: 2 },
                updatedAt: Date.now(),
                v: 1,
              })
              tx.oncomplete = () => resolve()
              tx.onerror = () => reject(tx.error)
            }
          }),
      )
      const tap = async (x: number, y: number) => {
        if (how === 'pen') await realPen(page, [{ x, y }])
        else await page.touchscreen.tap(x, y)
        await page.waitForTimeout(500)
      }
      const main = page.locator(MAIN)
      const first = await rect(main.locator('.bn-block-content').first())
      await tap(first.x + 6, first.y + 8)
      const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
      const m = await rect(main)
      const x = sheet.x + sheet.width * 0.3
      await tap(x, m.y + m.height + 70)
      await tap(x, m.y + m.height + 170)
      await tap(first.x + 6, first.y + 8)
      await expect(page.locator(EXTRA)).toHaveCount(0)
    })
