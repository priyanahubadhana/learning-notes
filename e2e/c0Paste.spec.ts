// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { installRealPen, realPen, realPenHover } from './realPen.ts'
import { caretAtEnd, openV8, stubClipboard, type Mode } from './c0Clipboard.ts'

/**
 * Check C0 (owner, 20 Nov 2026, iPad): the Paste buttons.
 * C0-2 a Pencil tap on Paste and on its arrow works; C0-3 they hover like every
 * other tool button; C0-4 / C0-6 the line while Safari's own black "Paste"
 * bubble waits, and words with no keyboard shortcut on an iPad; owner choice A
 * (copies made in the app paste without the bubble); C0-5 Paste on the box bar.
 * A computer with a keyboard is in c0PasteComputer.spec.ts (chromium only).
 *
 * The clipboard is a stand-in: allowed, refused or pending (Safari waiting for
 * a tap on its bubble). It counts its reads and keeps nothing else.
 */
test.use({
  viewport: { width: 1024, height: 900 },
  hasTouch: true,
})

const reads = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __clip: { reads: number } }).__clip.reads,
  )
const tapBubble = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { __clip: { tapBubble: () => void } }
    ).__clip.tapBubble(),
  )

const REFUSED =
  'Not pasted yet. Tap Paste again, then tap the black Paste button that pops up.'

const topPaste = (page: Page) => page.getByTestId('top-paste')
const editor = (page: Page) => page.locator('.bn-editor')
const hint = (page: Page) => page.getByTestId('paste-ask-hint')
const ASKING =
  'Your iPad asks first. Tap the black Paste button, or tap anywhere else to cancel.'

async function openTop(page: Page, mode: Mode, device: 'pencil' | 'touch') {
  await stubClipboard(page, mode)
  if (device === 'pencil') await installRealPen(page)
  await openV8(page, device)
}
const centre = async (l: Locator) => {
  const b = (await l.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/**
 * What iPad Safari does with a Pencil tap on our bars: our own touchstart
 * handler cancels it (so Scribble stays out), and then NO click follows. The
 * stand-in drops the browser's click after a pen press; only the click the app
 * makes itself (not trusted) goes through. The owner's recorder, 20 Nov.
 */
async function noPenClick(page: Page) {
  await page.addInitScript(() => {
    let pen = false
    window.addEventListener(
      'pointerdown',
      (e) => {
        pen = e.isTrusted && e.pointerType === 'pen'
      },
      true,
    )
    window.addEventListener(
      'click',
      (e) => {
        if (e.isTrusted && pen) {
          pen = false
          e.stopImmediatePropagation()
          e.preventDefault()
        }
      },
      true,
    )
  })
}

test('C0-2 a Pencil tap on Paste pastes at the cursor and the cursor stays in its box', async ({
  page,
}) => {
  await noPenClick(page)
  await openTop(page, 'allowed', 'pencil')
  await caretAtEnd(page)
  await realPen(page, [
    await centre(topPaste(page).locator('[data-action="paste"]')),
  ])
  await expect(editor(page)).toContainText('bold and rich words')
  await expect(editor(page).locator('strong, b').first()).toHaveText('bold')
  await expect(editor(page)).toBeFocused()
})

test('C0-2 a Pencil tap on the arrow next to Paste opens the formats', async ({
  page,
}) => {
  await noPenClick(page)
  await openTop(page, 'allowed', 'pencil')
  await caretAtEnd(page)
  await realPen(page, [
    await centre(topPaste(page).locator('[data-action="pasteMore"]')),
  ])
  await expect(page.getByRole('menu', { name: 'Paste as' })).toBeVisible()
})

test('C0-2 a finger tap on Paste still pastes', async ({ page }) => {
  await openTop(page, 'allowed', 'touch')
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="paste"]').tap()
  await expect(editor(page)).toContainText('bold and rich words')
})

test('C0-3 the Pencil hovering over Paste and its arrow shows the same highlight as Enter', async ({
  page,
}) => {
  await openTop(page, 'allowed', 'pencil')
  const bg = (l: Locator) =>
    l.evaluate((el) => getComputedStyle(el).backgroundColor)
  const enter = page.locator('[data-bar-tool="newLine"]')
  // The highlight fades in: read it once it has finished.
  const settled = (l: Locator) =>
    l.evaluate((el) =>
      Promise.all(el.getAnimations().map((a) => a.finished)).then(() => {}),
    )
  await realPenHover(page, [await centre(enter)])
  await settled(enter)
  const lit = await bg(enter)
  expect(lit).not.toBe('rgba(0, 0, 0, 0)')
  for (const action of ['paste', 'pasteMore']) {
    const b = topPaste(page).locator(`[data-action="${action}"]`)
    await realPenHover(page, [await centre(b)])
    await settled(b)
    expect(await bg(b)).toBe(lit)
  }
})

test('C0-4 C0-6 while Safari waits for its black Paste button a line says what to do, then it goes', async ({
  page,
}) => {
  await openTop(page, 'pending', 'touch')
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="paste"]').tap()
  await expect(hint(page)).toHaveText(ASKING)
  // Next to the button, not somewhere else on the screen.
  const h = (await hint(page).boundingBox())!
  const b = (await topPaste(page).boundingBox())!
  expect(h.y).toBeGreaterThanOrEqual(b.y + b.height)
  expect(Math.abs(h.x - b.x)).toBeLessThan(300)
  await tapBubble(page)
  await expect(hint(page)).toHaveCount(0)
  await expect(editor(page)).toContainText('bold and rich words')
})

test('C0-4 a quick read shows no line', async ({ page }) => {
  await openTop(page, 'allowed', 'touch')
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="paste"]').tap()
  await expect(editor(page)).toContainText('bold and rich words')
  await expect(hint(page)).toHaveCount(0)
})

test('C0-4 refused: it says to tap Paste again and then the black button, and names no shortcut on an iPad', async ({
  page,
}) => {
  await openTop(page, 'refused', 'touch')
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="paste"]').tap()
  await expect(page.getByText(REFUSED)).toBeVisible()
  await expect(page.getByText(/Ctrl\+|Cmd\+|keyboard/i)).toHaveCount(0)
  await expect(editor(page)).not.toContainText('bold and rich words')
})

test('C0-4 a copy made in the app pastes with one tap and no read of the system clipboard', async ({
  page,
}) => {
  await openTop(page, 'pending', 'touch') // the system would wait for the bubble
  await caretAtEnd(page)
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('End')
  await topPaste(page).locator('[data-action="paste"]').tap()
  await expect(editor(page)).toContainText(
    'The nucleus holds the DNAThe nucleus holds the DNA',
  )
  expect(await reads(page)).toBe(0)
  await expect(hint(page)).toHaveCount(0)
})

test('C0-4 once the app loses focus, Paste reads the system clipboard again (another app may have copied)', async ({
  page,
}) => {
  await openTop(page, 'allowed', 'touch')
  await caretAtEnd(page)
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('End')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await topPaste(page).locator('[data-action="paste"]').tap()
  await expect(editor(page)).toContainText('bold and rich words')
  expect(await reads(page)).toBe(1)
})

// ---- C0-5: Paste on the box bar ----

test.describe('C0-5 the box bar', () => {
  test.use({ viewport: { width: 1336, height: 1100 } })
  const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
  const bar = (page: Page) => page.locator('[data-box-bar]')

  async function boxReady(page: Page, mode: Mode, text: string) {
    await page.clock.install()
    await page.addInitScript(() =>
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
    )
    await stubClipboard(page, mode, 'Pasted words', '')
    await startInMode(page, 'touch')
    await page.goto('/')
    await createNotebook(
      page,
      'Paper',
      'Box' + Math.random().toString(36).slice(2, 6),
    )
    // A box with no words: the page's own box on a new page (an extra box
    // that is left empty is removed, so it cannot be the empty one).
    if (!text) {
      const main = page.locator('[data-paper-box="main"]')
      await expect(main).toBeVisible()
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
      await page.keyboard.press('Escape')
      const m = (await main.boundingBox())!
      await page.mouse.click(m.x - 5, m.y + m.height / 2)
      await expect(bar(page)).toHaveCount(1)
      return main
    }
    await typeInEditor(page, 'Main text')
    const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
    const sheetEl = page.locator('[data-paper-sheet="1"]')
    const sheet = (await sheetEl.count())
      ? (await sheetEl.boundingBox())!
      : main
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 80,
    )
    const box = page.locator(EXTRA).first()
    await expect(box.locator('.bn-editor')).toBeFocused()
    await page.keyboard.type(text)
    await expect(box).toContainText(text)
    // Past the history's grouping time, so the paste is a step of its own.
    await page.clock.fastForward(2000)
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Escape')
    // A tap in the empty space beside the box picks it (owner 17 Nov).
    const r = (await box.boundingBox())!
    await page.mouse.click(r.x - 5, r.y + r.height / 2)
    await expect(box).toHaveAttribute('data-picked', '')
    await expect(bar(page)).toHaveCount(1)
    return box
  }
  const paste = (page: Page) =>
    bar(page).getByRole('button', { name: 'Paste', exact: true })

  test('C0-5 a box with words: one tap on Paste adds the content at the end, one Undo step takes it away', async ({
    page,
  }) => {
    const box = await boxReady(page, 'allowed', 'Alpha beta')
    await paste(page).click()
    await expect(box.locator('.bn-editor')).toContainText('Alpha beta')
    await expect(box.locator('.bn-editor')).toContainText('Pasted words')
    const t = await box.locator('.bn-editor').innerText()
    expect(t.indexOf('Alpha beta')).toBeLessThan(t.indexOf('Pasted words'))
    await page.keyboard.press('ControlOrMeta+z')
    await expect(box.locator('.bn-editor')).not.toContainText('Pasted words')
    await expect(box.locator('.bn-editor')).toContainText('Alpha beta')
  })

  test('C0-5 an empty box: one tap on Paste fills it', async ({ page }) => {
    const box = await boxReady(page, 'allowed', '')
    await paste(page).click()
    await expect(box.locator('.bn-editor')).toHaveText('Pasted words')
  })

  test('C0-5 Safari asks first: the line shows, then the tap on its bubble pastes', async ({
    page,
  }) => {
    const box = await boxReady(page, 'pending', 'Alpha beta')
    await paste(page).click()
    await expect(hint(page)).toHaveText(ASKING)
    await tapBubble(page)
    await expect(hint(page)).toHaveCount(0)
    await expect(box.locator('.bn-editor')).toContainText('Pasted words')
  })

  test('C0-5 refused: nothing is pasted and the words say what to do', async ({
    page,
  }) => {
    const box = await boxReady(page, 'refused', 'Alpha beta')
    await paste(page).click()
    await expect(page.getByText(REFUSED)).toBeVisible()
    await expect(box.locator('.bn-editor')).not.toContainText('Pasted words')
  })
})
