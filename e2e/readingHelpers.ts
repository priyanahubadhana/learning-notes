// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'

/** The Read switch of the short bar. */
export const readSwitch = (page: Page) =>
  page
    .locator('[data-main-bar]')
    .getByRole('button', { name: 'Read', exact: true })
export const writeSwitch = (page: Page) =>
  page
    .locator('[data-main-bar]')
    .getByRole('button', { name: 'Text', exact: true })

/** The Reading frame (always there; `data-view` says how it is on). */
export const frame = (page: Page) => page.getByTestId('reading-frame')

/** A tool on the short bar by its name. */
/** A tool of the Read pill (pinned open, with every Read option shown, by `showReadTools`). */
export const barTool = (page: Page, name: string): Locator =>
  page
    .locator('[data-options-pill="read"]')
    .getByRole('button', { name, exact: true })

/** Before the first load: the Read pill stays open and shows all its options. */
export async function showReadTools(page: Page) {
  await page.addInitScript(() => {
    const set = (k: string, v: unknown) =>
      localStorage.setItem('learning-notes:' + k, JSON.stringify(v))
    set('toolbar.pillPinned', true)
    set('toolbar.pills', {
      read: [
        'aa',
        'contents',
        'bookmarks',
        'listen',
        'find',
        'lineFocus',
        'lock',
        'selfTest',
        'exit',
      ],
    })
  })
}

const PARAGRAPH =
  'The heart pumps blood through the body. It has four chambers and four valves. The valves keep blood moving one way. Each beat is a squeeze and a rest.'

/** Types a small book into the open page: `chapters` headings, 4 paragraphs each. */
export async function writeBook(page: Page, chapters = 3) {
  await page.locator('.bn-editor').click()
  for (let c = 1; c <= chapters; c++) {
    await page.keyboard.type(`# Chapter ${c}`)
    await page.keyboard.press('Enter')
    for (let p = 1; p <= 4; p++) {
      await page.keyboard.type(`${PARAGRAPH} Part ${c}.${p}`)
      await page.keyboard.press('Enter')
    }
  }
  await page.waitForTimeout(900) // autosave
}

/** Replaces speechSynthesis with a pretend one that logs what is spoken. */
export async function mockSpeech(page: Page, msPerWord = 40) {
  await page.addInitScript((ms) => {
    type Utter = {
      text: string
      rate: number
      voice: { voiceURI: string } | null
      lang: string
      onstart?: () => void
      onend?: () => void
      onboundary?: (e: { name: string; charIndex: number }) => void
      onerror?: (e: { error: string }) => void
    }
    class FakeUtterance {
      text: string
      rate = 1
      voice: { voiceURI: string } | null = null
      lang = ''
      onstart?: () => void
      onend?: () => void
      onboundary?: (e: { name: string; charIndex: number }) => void
      onerror?: (e: { error: string }) => void
      constructor(text: string) {
        this.text = text
      }
    }
    const log: { text: string; rate: number; voice: string | null }[] = []
    let current: Utter | null = null
    let timers: ReturnType<typeof setTimeout>[] = []
    const synth = {
      speaking: false,
      paused: false,
      getVoices: () => [
        { voiceURI: 'v-daniel', name: 'Daniel', lang: 'en-GB' },
        { voiceURI: 'v-samantha', name: 'Samantha', lang: 'en-US' },
      ],
      addEventListener: () => {},
      removeEventListener: () => {},
      speak(u: Utter) {
        log.push({
          text: u.text,
          rate: u.rate,
          voice: u.voice?.voiceURI ?? null,
        })
        current = u
        synth.speaking = true
        const words = [...u.text.matchAll(/\S+/g)]
        let i = 0
        const step = () => {
          if (current !== u) return
          if (i === 0) u.onstart?.()
          if (i < words.length) {
            u.onboundary?.({ name: 'word', charIndex: words[i].index ?? 0 })
            i++
            timers.push(setTimeout(step, ms))
          } else {
            synth.speaking = false
            current = null
            u.onend?.()
          }
        }
        timers.push(setTimeout(step, 10))
      },
      cancel() {
        current = null
        synth.speaking = false
        timers.forEach(clearTimeout)
        timers = []
      },
      pause() {},
      resume() {},
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: synth,
      configurable: true,
    })
    ;(window as unknown as Record<string, unknown>).SpeechSynthesisUtterance =
      FakeUtterance
    ;(window as unknown as Record<string, unknown>).__speech = log
  }, msPerWord)
}

/** What the pretend voice was asked to say so far. */
export const spoken = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __speech: { text: string; rate: number; voice: string | null }[]
        }
      ).__speech,
  )

/** The word being spoken, as marked on the page ("" when none). */
export const markedWord = (page: Page) =>
  page.evaluate(() => {
    const h = CSS.highlights.get('reading-word')
    return h ? [...h].map((r) => r.toString()).join('') : ''
  })

/** Sets a device setting before the app starts. */
export async function presetSetting(page: Page, key: string, value: unknown) {
  await page.addInitScript(
    ([k, v]) => localStorage.setItem(`learning-notes:${k}`, JSON.stringify(v)),
    [key, value] as const,
  )
}

export async function openPanel(page: Page, tool: string, dialog: string) {
  if (tool === 'Text size' || tool === 'Font') {
    // The Look panel is reached from Aa › More › All reading settings.
    await barTool(page, 'Reading look (Aa)').click()
    await page
      .locator('[data-pill-card]')
      .getByRole('tab', { name: 'More' })
      .click()
    await page
      .locator('[data-pill-card]')
      .getByRole('button', { name: 'All reading settings' })
      .click()
  } else {
    const names: Record<string, string> = {
      'Read aloud': 'Listen',
      'Contents and bookmarks': 'Contents',
    }
    await barTool(page, names[tool] ?? tool).click()
  }
  const panel = page.getByRole('dialog', { name: dialog })
  await expect(panel).toBeVisible()
  return panel
}
