// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { openPill, option, tool } from './mainBarHelpers.ts'

/**
 * Ink replay with audio (G2): a drawing written while recording remembers the
 * moment; selecting it with the Lasso offers "Play the recording from here",
 * which opens the Audio list and starts the sound at that moment. A made-up
 * microphone (a quiet tone) stands in for the real one.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext()
      const dest = ctx.createMediaStreamDestination()
      const osc = ctx.createOscillator()
      osc.connect(dest)
      osc.start()
      return dest.stream
    }
  })
})

test('a drawing made while recording plays the recording from that moment', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(800)
  await openPill(page, 'Insert', 'insert')
  await option(page, 'Audio').click()
  await expect(page.getByTestId('audio-record')).toContainText('Stop')
  await page.waitForTimeout(2500) // some sound before the drawing

  const box = await textBox(page)
  const y = box.y + 150
  const a: [number, number] = [box.x + 400, y]
  const b: [number, number] = [box.x + 640, y]
  await stroke(page, line(a, b))
  await expectStrokes(page, 1)
  await page.waitForTimeout(1500)
  await page.getByTestId('audio-record').click() // Stop
  await expect(page.getByTestId('recording-row')).toHaveCount(1)

  // A drawing from before any recording would not offer replay; this one does.
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500) // the closed pill gives the page its room back
  const dy = (await textBox(page)).y - box.y
  const loop = [
    [a[0] - 20, y + dy + 25],
    [a[0] - 20, y + dy - 25],
    [b[0] + 20, y + dy - 25],
    [b[0] + 20, y + dy + 25],
    [a[0] - 18, y + dy + 23],
  ] as [number, number][]
  await stroke(
    page,
    loop.slice(1).flatMap((c, i) => line(loop[i], c, 10)),
  )
  await page.locator('[data-ink-action="more"]').click()
  const replay = page.locator('[data-ink-action="replay"]')
  await expect(replay).toBeVisible()
  await replay.click()

  // The sound starts about two seconds in, not at the beginning.
  const audio = page.getByTestId('audio-panel').locator('audio')
  await expect(audio).toHaveCount(1)
  await expect
    .poll(
      () =>
        audio.evaluate((el: HTMLAudioElement) => ({
          t: el.currentTime,
          paused: el.paused,
        })),
      { timeout: 10_000 },
    )
    .toMatchObject({ t: expect.any(Number) })
  await expect
    .poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime), {
      timeout: 10_000,
    })
    .toBeGreaterThan(1.5)
})

test('a drawing made without a recording offers no replay', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(800)
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 400, y], [box.x + 640, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const dy = (await textBox(page)).y - box.y
  const pts = [
    [box.x + 380, y + dy + 25],
    [box.x + 380, y + dy - 25],
    [box.x + 660, y + dy - 25],
    [box.x + 660, y + dy + 25],
    [box.x + 382, y + dy + 23],
  ] as [number, number][]
  await stroke(
    page,
    pts.slice(1).flatMap((c, i) => line(pts[i], c, 10)),
  )
  await expect(page.locator('[data-ink-action="duplicate"]')).toBeVisible()
  await page.locator('[data-ink-action="more"]').click()
  await expect(page.locator('[data-ink-action="replay"]')).toHaveCount(0)
})
