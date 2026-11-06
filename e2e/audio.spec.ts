import { expect, test } from '@playwright/test'
import { openNote, openPill, option, pill } from './mainBarHelpers.ts'

/**
 * Audio recording: Insert › Audio records the microphone into the page; the
 * Audio list in the left panel plays it and deletes it safely. A made-up
 * microphone (a quiet tone) stands in for the real one.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices
    md.getUserMedia = async () => {
      const ctx = new AudioContext()
      const dest = ctx.createMediaStreamDestination()
      const osc = ctx.createOscillator()
      osc.connect(dest)
      osc.start()
      return dest.stream
    }
  })
})

const panel = (page: import('@playwright/test').Page) =>
  page.getByTestId('audio-panel')

test('record, stop, play, delete with Undo, and delete forever', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Insert', 'insert')
  await option(page, 'Audio').click()

  // The Audio list opens and the recording runs.
  await expect(panel(page)).toBeVisible()
  const record = page.getByTestId('audio-record')
  await expect(record).toContainText('Stop')
  await page.waitForTimeout(1500)
  await record.click()
  await expect(page.getByTestId('recording-row')).toHaveCount(1)
  await expect(page.getByTestId('recording-row')).toContainText('Recording')

  // It plays (a player appears).
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(panel(page).locator('audio')).toHaveCount(1)

  // Delete is soft: Undo brings it back.
  await page.getByRole('button', { name: /^Delete: / }).click()
  await expect(page.getByTestId('recording-row')).toHaveCount(0)
  await page.getByText('Undo', { exact: true }).click()
  await expect(page.getByTestId('recording-row')).toHaveCount(1)

  // Delete again; it waits in Deleted recordings until erased on purpose.
  await page.getByRole('button', { name: /^Delete: / }).click()
  await panel(page)
    .getByText(/Deleted recordings \(1\)/)
    .click()
  await panel(page).getByRole('button', { name: 'Delete forever' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete forever' })
    .click()
  await expect(panel(page).getByText(/Deleted recordings/)).toHaveCount(0)
})

test('the recording keeps running with the list closed and shows a chip', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Insert', 'insert')
  await expect(pill(page)).toBeVisible()
  await option(page, 'Audio').click()
  await panel(page)
    .getByRole('button', { name: 'Close the audio list' })
    .click()
  const chip = page.getByTestId('recording-chip')
  await expect(chip).toBeVisible()
  await chip.getByRole('button', { name: 'Stop recording' }).click()
  await expect(chip).toHaveCount(0)
})
