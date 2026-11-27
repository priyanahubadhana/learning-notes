// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Text box v2: the tap rules (src/paper/v2, "a first tap on a box that is
 * not selected selects it") load on demand (PaperFrame.tsx, `import('./v2')`).
 * Until they arrive, a tap in the empty part of a box falls to the old rule
 * in tapSelect.ts (`textFirstTap.on` is still false, so boxShift is 0): the
 * caret goes into the box and it turns to typing. Found by F62e (CI run
 * 45918658223 and here under load: the v2 chunk was not loaded 8 s after the
 * page opened, the tap put the caret in, data-picked never came).
 *
 * Here the rules' file is held back on purpose, so the case is made every
 * time. A tap while they load must not put the caret in the box, and it
 * must select the box.
 */
test.use({
  viewport: { width: 834, height: 1194 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const V2_RULES = /\/assets\/v2-[^/]+\.js$/

/**
 * A finger tap in the empty part of the box's first line, near its right
 * edge. Returns whether the caret is in a box once the tap's own follow-up
 * has run (tapSelect puts the caret from a 0 ms timer set at the lift; a
 * timer set after it runs after it).
 */
async function tapEmptyPart(page: Page, box: Locator): Promise<boolean> {
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  return page.evaluate(async ({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 33,
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
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    return !!document.activeElement?.closest(
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
    )
  }, p)
}

test('TB-late a tap on a box while the box tap rules still load never puts the caret in it', async ({
  page,
}) => {
  // Held for the whole test: it ends before they would come.
  const asked = page.waitForRequest(V2_RULES)
  await page.route(V2_RULES, () => {})
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(
    page,
    'Paper',
    'Late' + Math.random().toString(36).slice(2, 6),
  )
  await typeInEditor(page, 'Main text')
  // The page asked for its box tap rules; they are held back.
  await asked

  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(main.x + main.width * 0.3, main.y + main.height + 300)
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Alpha beta')
  await expect(box).toContainText('Alpha beta')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await expect(box.locator('.bn-editor')).not.toBeFocused()
  await expect(box).not.toHaveAttribute('data-typing')

  // A tap in the empty part while the rules load: the caret stays out and
  // the box is selected (F62e: data-picked never came).
  expect(
    await tapEmptyPart(page, box),
    'the tap put the caret in the box',
  ).toBe(false)
  await expect(box).toHaveAttribute('data-picked', '')
})
