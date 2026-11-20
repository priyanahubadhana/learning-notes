// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Paste ▾ in the Pencil buttons (owner, 19 Nov 2026, picture paste-mock2) and
 * the paste bugs B9 (caret lost) and B10 (hold shows no paste). Flag page.menus.
 *
 * The clipboard is a stand-in the page reads (read() with HTML + text), so the
 * run is the same on chromium and ipad-webkit: WebKit cannot be given a real
 * clipboard-read permission in Playwright, and a real one needs a user gesture.
 * Permission denial is tested by a stand-in that throws.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const HTML = '<p><b>bold</b> and <i>rich</i> words</p>'
const TEXT = 'bold and rich words'
const FLAGS = { flags: ['page.menus'], 'advanced.holdMenu': 600 }

async function stubClipboard(page: Page, denied = false) {
  await page.addInitScript(
    ([html, text, no]) => {
      const clip = {
        read: async () => {
          if (no) throw new DOMException('denied', 'NotAllowedError')
          return [
            {
              types: ['text/html', 'text/plain'],
              getType: async (type: string) =>
                new Blob([type === 'text/html' ? html : text], { type }),
            },
          ]
        },
        readText: async () => {
          if (no) throw new DOMException('denied', 'NotAllowedError')
          return text
        },
      }
      Object.defineProperty(navigator, 'clipboard', {
        value: clip,
        configurable: true,
      })
      Object.defineProperty(navigator, 'permissions', {
        value: { query: async () => ({ state: 'granted' }) },
        configurable: true,
      })
    },
    [HTML, TEXT, denied] as const,
  )
}

async function open(
  page: Page,
  mode: 'computer' | 'touch' | 'pencil' = 'pencil',
  denied = false,
  keys: Record<string, unknown> = {},
) {
  await stubClipboard(page, denied)
  await openNote(page, mode, { ...FLAGS, ...keys })
}

const topPaste = (page: Page) => page.getByTestId('top-paste')
const floating = (page: Page) => page.locator('[data-mini-keys]')
const editor = (page: Page) => page.locator('.bn-editor')

/** Caret at the end of the first line, in the page's text. */
async function caretAtEnd(page: Page) {
  await tool(page, 'Text').click()
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('End')
}

for (const mode of ['pencil', 'touch', 'computer'] as const) {
  test(`${mode} mode: the top row has Mic and Paste ▾`, async ({ page }) => {
    await open(page, mode)
    await expect(topPaste(page)).toBeVisible()
    await expect(page.locator('[data-action="miniKeys"]')).toBeVisible()
  })
}

for (const mode of ['touch', 'computer'] as const)
  test(`${mode}: Enter and Backspace are not in the top row (owner: Pencil mode only); Mic and Paste ▾ sit together`, async ({
    page,
  }) => {
    await open(page, mode)
    await expect(page.locator('[data-bar-tool="newLine"]')).toHaveCount(0)
    await expect(page.locator('[data-bar-tool="backspace"]')).toHaveCount(0)
    const mic = (await page.locator('[data-action="miniKeys"]').boundingBox())!
    const paste = (await topPaste(page).boundingBox())!
    expect(paste.x - (mic.x + mic.width)).toBeLessThan(8)
  })

test('pencil: Mic, Backspace, Enter, Paste ▾ sit together in that order', async ({
  page,
}) => {
  await open(page, 'pencil')
  await expect(page.locator('[data-bar-tool="newLine"]')).toBeVisible()
  await expect(page.locator('[data-bar-tool="backspace"]')).toBeVisible()
  const x = async (sel: string) =>
    (await page.locator(sel).first().boundingBox())!.x
  const mic = await x('[data-action="miniKeys"]')
  const back = await x('[data-bar-tool="backspace"]')
  const enter = await x('[data-bar-tool="newLine"]')
  const paste = await x('[data-testid="top-paste"]')
  expect(Math.max(mic, back, enter)).toBeLessThan(paste)
  expect(mic).toBeLessThan(Math.min(back, enter))
  expect(paste - Math.max(back, enter)).toBeLessThan(120)
})

test('pencil: the floating bar stays hidden while the top row shows the buttons, even when switched on', async ({
  page,
}) => {
  await open(page, 'pencil', false, { 'toolbar.miniKeys': true })
  await expect(topPaste(page)).toBeVisible()
  await expect(floating(page)).toHaveCount(0)
})

test('pencil: the floating bar shows while the mic listens, with Paste ▾', async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Fake {
      lang = ''
      continuous = false
      interimResults = false
      onstart: (() => void) | null = null
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        void Promise.resolve().then(() => this.onstart?.())
      }
      stop() {
        this.onend?.()
      }
    }
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = Fake
  })
  await open(page, 'pencil')
  await caretAtEnd(page)
  await page.locator('[data-action="miniKeys"]').click()
  await expect(floating(page)).toBeVisible()
  await expect(floating(page).getByTestId('floating-paste')).toBeVisible()
  await floating(page).locator('[data-keys="mic"]').click()
  await expect(floating(page)).toHaveCount(0)
})

test('touch: the floating bar still follows its own switch, with Paste ▾', async ({
  page,
}) => {
  await open(page, 'touch', false, { 'toolbar.miniKeys': true })
  await expect(floating(page)).toBeVisible()
  await expect(floating(page).getByTestId('floating-paste')).toBeVisible()
})

test('a tap on Paste keeps the formatting (Settings default: Keep look)', async ({
  page,
}) => {
  await open(page)
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="paste"]').click()
  await expect(editor(page).locator('strong, b').first()).toHaveText('bold')
})

test('▾ lists Keep look (ticked) and Plain text; Plain text pastes no formatting', async ({
  page,
}) => {
  await open(page)
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="pasteMore"]').click()
  const menu = page.getByRole('menu', { name: 'Paste as' })
  await expect(menu.locator('[data-paste-option="keep"]')).toContainText(
    'Keep look',
  )
  await expect(menu.locator('[data-paste-option="plain"]')).toContainText(
    'Plain text',
  )
  await expect(menu.locator('[data-paste-option="keep"] svg')).toHaveCount(1)
  await expect(menu).not.toContainText('Clean up with AI')
  await menu.locator('[data-paste-option="plain"]').click()
  await expect(editor(page)).toContainText('bold and rich words')
  await expect(editor(page).locator('strong, b')).toHaveCount(0)
})

test('More opens Match style, As quote, Link / Embed; no AI', async ({
  page,
}) => {
  await open(page)
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="pasteMore"]').click()
  const menu = page.getByRole('menu', { name: 'Paste as' })
  await expect(menu.locator('[data-paste-option="quote"]')).toHaveCount(0)
  await menu.locator('[data-paste-option="more"]').click()
  for (const [id, name] of [
    ['match', 'Match style'],
    ['quote', 'As quote'],
    ['link', 'Link / Embed'],
  ] as const)
    await expect(menu.locator(`[data-paste-option="${id}"]`)).toContainText(
      name,
    )
  await expect(menu).not.toContainText('Clean up with AI')
  await menu.locator('[data-paste-option="quote"]').click()
  await expect(editor(page).locator('[data-content-type="quote"]')).toHaveCount(
    1,
  )
})

test('B9: pasting from the button and from ▾ keeps the caret in the box', async ({
  page,
}) => {
  await open(page)
  await caretAtEnd(page)
  const inEditor = () =>
    page.evaluate(() => !!document.activeElement?.closest('.bn-editor'))
  await topPaste(page).locator('[data-action="paste"]').click()
  await expect(editor(page)).toContainText('bold and rich words')
  expect(await inEditor()).toBe(true)
  await page.keyboard.type('ZZ')
  await expect(editor(page)).toContainText('bold and rich wordsZZ')
  await topPaste(page).locator('[data-action="pasteMore"]').click()
  expect(await inEditor()).toBe(true)
  await page
    .getByRole('menu', { name: 'Paste as' })
    .locator('[data-paste-option="plain"]')
    .click()
  expect(await inEditor()).toBe(true)
  await page.keyboard.type('QQ')
  await expect(editor(page)).toContainText('QQ')
})

test('a clipboard the browser refuses gives a short message, not a crash', async ({
  page,
}) => {
  await open(page, 'pencil', true)
  await caretAtEnd(page)
  await topPaste(page).locator('[data-action="paste"]').click()
  await expect(
    page
      .getByText(/could not|blocked|Allow|Paste with|Not pasted yet/i)
      .first(),
  ).toBeVisible()
})

/** A hold of `type` on the empty part of the first line (right of its text). */
async function holdEmpty(page: Page, type: 'pen' | 'touch') {
  await page.waitForTimeout(3300) // no Pencil hold right after writing (item 5)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.evaluate((kind) => {
    const block = document.querySelector('.bn-block-content')!
    const r = block.getBoundingClientRect()
    const x = r.right - 24
    const y = r.top + r.height / 2
    const el = document.elementFromPoint(x, y)!
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: kind,
        pointerId: 71,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        buttons: 1,
      }),
    )
  }, type)
  await page.waitForTimeout(1100)
}

for (const type of ['pen', 'touch'] as const) {
  test(`B10: a ${type} hold on an empty spot shows our bar with Paste, not Cut or Copy`, async ({
    page,
  }) => {
    await open(page, 'touch')
    await holdEmpty(page, type)
    const strip = page.getByTestId('page-strip')
    await expect(strip).toBeVisible()
    await expect(strip.getByTestId('cs-paste')).toBeVisible()
    await expect(strip.getByTestId('cs-copy')).toHaveCount(0)
    await expect(strip.getByTestId('cs-cut')).toHaveCount(0)
  })
}
