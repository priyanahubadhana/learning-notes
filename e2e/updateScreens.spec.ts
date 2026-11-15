// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * P1.8 (finish): every stage of the must-have update looks and acts like
 * panel 5 of the approved Phase 1 fixes picture, and none of them is a dead
 * end ("it can never get stuck"). Behind the switch update.v2.
 */
const FLAG = '/?flags=update.v2'
const notice = (page: Page) => page.locator('[data-mandatory-update]')
const pill = (page: Page) => page.locator('[data-update-waiting]')
const blocked = (page: Page) =>
  page.evaluate(() => document.getElementById('root')?.hasAttribute('inert'))
const phase = (p: Page, name: string, timeout = 12_000) =>
  expect(notice(p)).toHaveAttribute('data-phase', name, { timeout })

/** One file that is never let go: the download stays in "downloading". */
async function gatedFile(page: Page) {
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [{ u: '/__scr.bin', s: 3_400_000 }] } }),
  )
  await page.route('**/__scr.bin', () => new Promise<void>(() => {}))
}

/** A listed file the server refuses: the download fails at once. */
async function failingFile(page: Page) {
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [{ u: '/__scr-bad.bin', s: 1000 }] } }),
  )
  await page.route('**/__scr-bad.bin', (r) => r.fulfill({ status: 404 }))
}

async function open(page: Page) {
  await page.goto(FLAG)
  await expect(page.locator('#root > *').first()).toBeAttached()
}
const pretend = (page: Page) =>
  page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('learning-notes:test-required-update'),
    ),
  )

/** After the 200 ms fade-in (it scales the block a little). */
const box = async (loc: ReturnType<Page['locator']>) => {
  await loc.page().waitForTimeout(350)
  return (await loc.boundingBox())!
}

test('stage 1 countdown: ring, "Starts in", every note is kept, Not now and Update now', async ({
  page,
}) => {
  await gatedFile(page)
  await open(page)
  await pretend(page)
  await phase(page, 'countdown')
  await expect(page.locator('[data-countdown-ring]')).toBeVisible()
  await expect(notice(page).locator('h1')).toHaveText('A must-have update')
  await expect(notice(page)).toContainText(
    'Your notes are stored in a new way.',
  )
  await expect(page.locator('[data-update-starts]')).toHaveText(
    /^Starts in ([2-5] seconds|1 second)$/,
  )
  await expect(notice(page)).toContainText(
    'Every note is kept. The app reopens on this page.',
  )
  const now = notice(page).getByRole('button', { name: 'Update now' })
  const later = notice(page).getByRole('button', { name: 'Not now' })
  expect((await box(now)).height).toBeGreaterThanOrEqual(44)
  expect((await box(later)).height).toBeGreaterThanOrEqual(44)
  // "Not now" sits left of "Update now" (the picture).
  expect((await box(later)).x).toBeLessThan((await box(now)).x)
  expect(await blocked(page)).toBe(true)
  // Update now skips the wait.
  await now.click()
  await phase(page, 'downloading')
})

test('stage 2 downloading: icon, size, honest time left, Cancel leads to Paused', async ({
  page,
}) => {
  await gatedFile(page)
  await open(page)
  await pretend(page)
  await notice(page).getByRole('button', { name: 'Update now' }).click()
  await phase(page, 'downloading')
  await expect(notice(page).locator('h1')).toHaveText('Downloading the update')
  await expect(page.locator('[data-update-icon]')).toBeVisible()
  await expect(page.locator('[data-update-percent]')).toHaveText('0%')
  // Before 3 seconds of measuring: no made-up time.
  await expect(page.locator('[data-update-eta]')).toContainText(
    'Working out the time…',
  )
  await expect(page.locator('[data-update-eta]')).toContainText('MB')
  // No "slow" note this early (needs 8 seconds in a row).
  await expect(page.locator('[data-update-slow]')).toHaveCount(0)
  await notice(page).getByRole('button', { name: 'Cancel' }).click()
  await phase(page, 'paused')
  await expect(notice(page).locator('h1')).toHaveText('Paused')
  await expect(notice(page)).toContainText(
    'The app needs this update to keep your notes safe.',
  )
  await expect(page.locator('[data-update-icon]')).toBeVisible()
  expect(await blocked(page)).toBe(true)
  // The way forward from Paused.
  await notice(page).getByRole('button', { name: 'Update now' }).click()
  await phase(page, 'downloading')
})

test('stage 2b really slow: the note comes only after 8 seconds, with the true speed', async ({
  page,
}) => {
  await gatedFile(page)
  await open(page)
  await pretend(page)
  await notice(page).getByRole('button', { name: 'Update now' }).click()
  await phase(page, 'downloading')
  await page.waitForTimeout(5000)
  await expect(page.locator('[data-update-slow]')).toHaveCount(0)
  await expect(page.locator('[data-update-slow]')).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-update-slow]')).toContainText(
    /Your connection is slow right now \(about \d+ KB\/s\)\. You can leave this screen open; it carries on by itself\./,
  )
  // It is not a dead end: Cancel is still there.
  await expect(
    notice(page).getByRole('button', { name: 'Cancel' }),
  ).toBeVisible()
})

test('stage 3 installing: shield, plain words, no buttons, ends by itself in Try again', async ({
  page,
}) => {
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [] } }),
  )
  await open(page)
  await pretend(page)
  await phase(page, 'installing', 14_000)
  await expect(notice(page).locator('h1')).toHaveText('Installing…')
  await expect(notice(page)).toContainText(
    'Keeping every note safe. This takes a few seconds.',
  )
  await expect(page.locator('[data-update-icon]')).toBeVisible()
  await expect(
    notice(page).locator('button:not([data-update-reason])'),
  ).toHaveCount(0)
  // The restart does not come in this test: it must not stay here.
  await phase(page, 'failed', 12_000)
  await expect(
    notice(page).getByRole('button', { name: 'Try again' }),
  ).toBeVisible()
})

test('stage 4 did not finish: Not now, Try again, Copy details; Not now opens the notes with a pill', async ({
  page,
}) => {
  await failingFile(page)
  await open(page)
  await pretend(page)
  await phase(page, 'failed', 14_000)
  await expect(notice(page).locator('h1')).toHaveText(
    'The update did not finish',
  )
  await expect(notice(page)).toContainText(
    'Nothing was installed and nothing was lost. Check your connection and try again.',
  )
  await expect(notice(page)).toContainText(
    '"Not now" opens your notes as they are.',
  )
  const again = notice(page).getByRole('button', { name: 'Try again' })
  const later = notice(page).getByRole('button', { name: 'Not now' })
  const copy = notice(page).getByRole('button', { name: 'Copy details' })
  for (const b of [again, later, copy])
    expect((await box(b)).height).toBeGreaterThanOrEqual(44)
  expect((await box(later)).x).toBeLessThan((await box(again)).x)
  // Copy details copies plain words and says so.
  await page.evaluate(() => {
    ;(window as never as { __copied: string }).__copied = ''
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          ;(window as never as { __copied: string }).__copied = t
        },
      },
    })
  })
  await copy.click()
  await expect(
    notice(page).getByRole('button', { name: 'Copied' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => (window as never as { __copied: string }).__copied,
    ),
  ).toMatch(/The update did not finish: the download failed after \d+ s\./)
  // Not now: back in the app, a small pill, nothing blocked.
  await later.click()
  await expect(notice(page)).toHaveCount(0)
  await expect(pill(page)).toBeVisible()
  await expect(pill(page)).toContainText('Must-have update waiting')
  expect(await blocked(page)).toBeFalsy()
  const pillBtn = pill(page).getByRole('button', { name: 'Try again' })
  expect((await box(pillBtn)).height).toBeGreaterThanOrEqual(44)
  // Try again from the pill: the screen is back and blocks again.
  await pillBtn.click()
  await expect(pill(page)).toHaveCount(0)
  await expect(notice(page)).toBeVisible()
  expect(await blocked(page)).toBe(true)
})

test('stage 5 offline: never blocked, a small note, goes on by itself when back', async ({
  page,
  context,
}) => {
  await gatedFile(page)
  await open(page)
  await pretend(page)
  await phase(page, 'countdown')
  await context.setOffline(true)
  await phase(page, 'offline')
  expect(await blocked(page)).toBeFalsy()
  await context.setOffline(false)
  await phase(page, 'countdown')
})

test('no stage is a dead end: each blocked stage has a visible way forward', async ({
  page,
}) => {
  await gatedFile(page)
  await open(page)
  await pretend(page)
  const way = async () => {
    const n = await notice(page)
      .getByRole('button')
      .filter({ hasText: /Not now|Update now|Cancel|Try again/ })
      .count()
    expect(n).toBeGreaterThan(0)
  }
  await phase(page, 'countdown')
  await way()
  await notice(page).getByRole('button', { name: 'Update now' }).click()
  await phase(page, 'downloading')
  await way()
  await notice(page).getByRole('button', { name: 'Cancel' }).click()
  await phase(page, 'paused')
  await way()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('the did-not-finish screen fits, buttons stack full width, Try again on top', async ({
    page,
  }) => {
    await failingFile(page)
    await open(page)
    await pretend(page)
    await phase(page, 'failed', 14_000)
    const again = notice(page).getByRole('button', { name: 'Try again' })
    const later = notice(page).getByRole('button', { name: 'Not now' })
    const a = await box(again)
    const l = await box(later)
    expect(a.width).toBeGreaterThan(300)
    expect(l.width).toBeGreaterThan(300)
    expect(a.y).toBeLessThan(l.y)
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true)
  })
})
