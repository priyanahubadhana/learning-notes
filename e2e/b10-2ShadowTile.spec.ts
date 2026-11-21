// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * B10-2 (R17): the Box style card's "Shadow card" look tile was white on white.
 * It now shows its real shadow and a hairline border, light and dark.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [], off: [] }),
    )
  })
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'B10-2')
  await typeInEditor(page, 'Main text')
}

async function addBox(page: Page, text: string) {
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count()) ? await rect(sheetEl) : main
  let bottom = 0
  const all = page.locator('[data-paper-box]')
  for (let i = 0; i < (await all.count()); i++) {
    const r = await rect(all.nth(i))
    bottom = Math.max(bottom, r.y + r.height)
  }
  await page.mouse.click(sheet.x + sheet.width * 0.3, bottom + 60)
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return box
}

async function pick(page: Page, box: Locator) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 32,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    el.dispatchEvent(mk('pointerdown', 1))
    el.dispatchEvent(mk('pointerup', 0))
  }, p)
  await expect(box).toHaveAttribute('data-picked', '')
}

async function openCard(page: Page) {
  const box = await addBox(page, 'Alpha beta')
  await pick(page, box)
  await page
    .locator('[data-box-bar]')
    .getByRole('button', { name: 'Box style' })
    .tap()
  const card = page.getByTestId('bc-card')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-settled', 'true')
}

const tileLook = (page: Page) =>
  page.getByTestId('bc-look-shadowCard').evaluate((tile) => {
    const s = getComputedStyle(tile.querySelector('.v8boxprev')!)
    return { shadow: s.boxShadow, border: s.borderTopWidth }
  })

for (const theme of ['day', 'night'] as const)
  test(`B10-2 Shadow card tile shows a shadow and a hairline (${theme})`, async ({
    page,
  }) => {
    await start(page)
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    await openCard(page)
    await page.getByTestId('bc-look-shadowCard').scrollIntoViewIfNeeded()
    const look = await tileLook(page)
    expect(look.shadow).not.toBe('none')
    expect(parseFloat(look.border)).toBeGreaterThan(0)
  })

const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
}
const taken: string[] = []
for (const [name, size] of Object.entries(SIZES))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`B10-2 pictures: ${name} ${tname}`, async ({ page }, info) => {
      await page.setViewportSize(size)
      await start(page)
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      await openCard(page)
      await page.getByTestId('bc-look-shadowCard').scrollIntoViewIfNeeded()
      const out = `screenshots/b10-2/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-2 Shadow card tile\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
