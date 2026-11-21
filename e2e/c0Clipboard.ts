// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/** What the stand-in clipboard does on a read (check C0, 20 Nov 2026). */
export type Mode = 'allowed' | 'refused' | 'pending'
const HTML = '<p><b>bold</b> and <i>rich</i> words</p>'
const TEXT = 'bold and rich words'

/**
 * A clipboard the page reads: allowed, refused (NotAllowedError, as Safari
 * answers when its black bubble is not tapped) or pending (Safari waiting for
 * a tap on its bubble; `window.__clip.tapBubble()` is that tap). It counts its
 * reads and holds only the text given here.
 */
export async function stubClipboard(
  page: Page,
  mode: Mode,
  text = TEXT,
  html = HTML,
) {
  await page.addInitScript(
    ([m, h, tx]) => {
      const w = window as unknown as {
        __clip: { reads: number; tapBubble: () => void; text: string }
      }
      let release: () => void = () => {}
      const items = () => [
        {
          types: h ? ['text/html', 'text/plain'] : ['text/plain'],
          getType: async (type: string) =>
            new Blob([type === 'text/html' ? h : w.__clip.text], { type }),
        },
      ]
      const gate = () =>
        m === 'refused'
          ? Promise.reject(new DOMException('denied', 'NotAllowedError'))
          : m === 'pending'
            ? new Promise<void>((r) => (release = r))
            : Promise.resolve()
      w.__clip = { reads: 0, tapBubble: () => release(), text: tx }
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: async () => {
            w.__clip.reads++
            await gate()
            return items()
          },
          readText: async () => {
            w.__clip.reads++
            await gate()
            return w.__clip.text
          },
          writeText: async () => {},
          write: async () => {},
        },
      })
      Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: { query: async () => ({ state: 'granted' }) },
      })
    },
    [mode, html, text] as const,
  )
}

/** A page with the new tool bar (toolbar.v8) and the Paste buttons (page.menus). */
export async function openV8(
  page: Page,
  mode: 'computer' | 'touch' | 'pencil',
  extraFlags: string[] = [],
) {
  const { createNotebook, startInMode, typeInEditor } =
    await import('./helpers.ts')
  await page.addInitScript(
    (f) => {
      localStorage.setItem('learning-notes:flags', JSON.stringify(f))
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      )
      localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
    },
    ['toolbar.v8', 'page.menus', ...extraFlags],
  )
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

/** The caret at the end of the page's first line. */
export async function caretAtEnd(page: Page) {
  // The Text tool takes the ink pad away from the page.
  const text = page.getByTestId('v8-tool-text')
  if ((await text.getAttribute('data-active')) !== 'true') await text.click()
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('End')
}
