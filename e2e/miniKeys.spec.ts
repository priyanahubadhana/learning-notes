// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, pref, tool } from './mainBarHelpers.ts'

/**
 * The mini keyboard strip (round 5): a toolbar toggle shows it; the mic types
 * what is heard into the caret (or asks for the keyboard mic), Enter adds a
 * line, Backspace deletes; it is dragged to an edge and remembered.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const toggle = (page: Page) => page.locator('[data-action="miniKeys"]')
const strip = (page: Page) => page.locator('[data-mini-keys]')

/** A recognizer that "hears" one phrase shortly after start. */
async function fakeSpeech(page: Page, phrase: string | null) {
  await page.addInitScript((said) => {
    const w = window as unknown as Record<string, unknown>
    delete w.SpeechRecognition
    delete w.webkitSpeechRecognition
    if (said === null) return
    class Fake {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(
          () =>
            this.onresult?.({
              resultIndex: 0,
              results: [{ isFinal: true, 0: { transcript: said } }],
            }),
          40,
        )
      }
      stop() {
        this.onend?.()
      }
    }
    w.SpeechRecognition = Fake
  }, phrase)
}

test('the toggle shows the strip; Enter and Backspace work on the page', async ({
  page,
}) => {
  await fakeSpeech(page, null)
  await openNote(page)
  await expect(strip(page)).toHaveCount(0)
  await toggle(page).click()
  await expect(strip(page)).toBeVisible()
  expect(await pref<boolean>(page, 'toolbar.miniKeys')).toBe(true)
  const blocks = page.locator('.bn-block-content')
  const before = await blocks.count()
  await tool(page, 'Text').click()
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('End')
  await strip(page).locator('[data-keys="enter"]').click()
  await expect(blocks).toHaveCount(before + 1)
  await page.keyboard.type('ab')
  await strip(page).getByRole('button', { name: 'Backspace' }).click()
  await expect(page.locator('.bn-block-content').nth(1)).toHaveText('a')
})

test('the mic types what is heard into the caret', async ({ page }) => {
  await fakeSpeech(page, 'hello world')
  await openNote(page)
  await toggle(page).click()
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('End')
  await strip(page).locator('[data-keys="mic"]').click()
  await expect(page.locator('.bn-editor')).toContainText('DNAhello world')
})

test('without speech recognition the mic asks for the keyboard microphone', async ({
  page,
}) => {
  await fakeSpeech(page, null)
  await openNote(page)
  await toggle(page).click()
  await strip(page).locator('[data-keys="mic"]').click()
  await expect(page.getByText(/microphone on the keyboard/)).toBeVisible()
  await expect(page.locator('.bn-editor')).toHaveAttribute('inputmode', 'text')
})

test('drag the strip to an edge: it snaps and is remembered after a reload', async ({
  page,
}) => {
  await fakeSpeech(page, null)
  await openNote(page)
  await toggle(page).click()
  await expect(strip(page)).toBeVisible()
  await page.waitForTimeout(300)
  const grip = (await strip(page).locator('[data-keys="grip"]').boundingBox())!
  const gx = grip.x + grip.width / 2
  const gy = grip.y + grip.height / 2
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(60, 400, { steps: 8 })
  await page.mouse.up()
  await expect(strip(page)).toHaveAttribute('data-edge', 'left')
  const saved = await pref<{ edge: string }>(page, 'toolbar.miniKeysPlace')
  expect(saved?.edge).toBe('left')
  await page.reload()
  await expect(strip(page)).toHaveAttribute('data-edge', 'left')
})
