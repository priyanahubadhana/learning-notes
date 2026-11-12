// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { cornerAction, createNotebook } from './helpers.ts'

/**
 * Update flow v2 (slice 10, flag update.v2): the must-have rule and the
 * full-screen notice. The test door "learning-notes:test-required-update"
 * pretends a must-have version was found; /version.json is mocked where the
 * rule itself is tested.
 */
const FLAG = '/?flags=update.v2'
const notice = (page: Page) => page.locator('[data-mandatory-update]')
const blocked = (page: Page) =>
  page.evaluate(() => document.getElementById('root')?.hasAttribute('inert'))

/** The download is one slow file that the test lets go when it wants to. */
async function slowDownload(page: Page) {
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => (release = r))
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [{ u: '/__v2-slow.bin', s: 1000 }] } }),
  )
  await page.route('**/__v2-slow.bin', async (r) => {
    await gate
    await r.fulfill({ body: 'x'.repeat(1000) })
  })
  return release
}

async function start(page: Page, url = FLAG) {
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [] } }),
  )
  await page.goto(url)
  await createNotebook(page, 'Test NB', 'First page')
}

const pretend = (page: Page, detail?: object) =>
  page.evaluate(
    (d) =>
      window.dispatchEvent(
        new CustomEvent('learning-notes:test-required-update', { detail: d }),
      ),
    detail ?? null,
  )

const applied = (page: Page) =>
  page.evaluate(
    () =>
      (window as never as { __requiredApplied?: boolean }).__requiredApplied,
  )

const versionJson = (page: Page, body: object) =>
  page.route('**/version.json*', (r) => r.fulfill({ json: body }))

test('U2 a higher level shows the notice with the reason and counts down', async ({
  page,
}) => {
  await versionJson(page, { commit: 'zzzz999', level: 2, reason: 'datafix' })
  await page.goto(FLAG)
  await expect(notice(page)).toBeVisible({ timeout: 5000 })
  await expect(notice(page)).toHaveAttribute('role', 'alertdialog')
  await expect(notice(page)).toContainText(
    'This fixes a problem with saved notes.',
  )
  await expect(page.locator('[data-countdown-number]')).toHaveText(/^[1-5]$/)
  expect(await blocked(page)).toBe(true)
  await expect(notice(page)).toHaveAttribute(
    'data-phase',
    /downloading|installing/,
    { timeout: 9000 },
  )
})

test('U3 a skipped must-have version (level 2 above mine) still shows the notice', async ({
  page,
}) => {
  await versionJson(page, { commit: 'zzzz999', level: 3 })
  await page.goto(FLAG)
  await expect(notice(page)).toBeVisible({ timeout: 5000 })
  await expect(notice(page)).toContainText(
    'Your notes are stored in a new way.',
  )
})

for (const [name, body] of [
  ['no level', { commit: 'zzzz999' }],
  ['a text level', { commit: 'zzzz999', level: '2' }],
  ['a lower level', { commit: 'zzzz999', level: 0 }],
  ['the same level', { commit: 'zzzz999', level: 1 }],
] as const) {
  test(`U1/U4 ${name}: no full-screen notice`, async ({ page }) => {
    await versionJson(page, body)
    await start(page)
    await page.waitForTimeout(3500)
    await expect(notice(page)).toHaveCount(0)
  })
}

test('U5 Not now pauses the countdown; the app stays blocked', async ({
  page,
}) => {
  await start(page)
  await pretend(page)
  await expect(notice(page)).toContainText('Downloading starts in')
  await notice(page).getByRole('button', { name: 'Not now' }).click()
  await expect(notice(page)).toHaveAttribute('data-phase', 'paused')
  await expect(notice(page)).toContainText(
    'Paused. The app needs this update to keep your notes safe.',
  )
  await page.waitForTimeout(1200)
  await expect(notice(page)).toHaveAttribute('data-phase', 'paused')
  await expect(
    notice(page).getByRole('button', { name: 'Update now' }),
  ).toBeVisible()
  expect(await blocked(page)).toBe(true)
})

test('U6 Cancel while downloading pauses; Update now starts again', async ({
  page,
}) => {
  await start(page)
  const release = await slowDownload(page)
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('data-phase', 'downloading', {
    timeout: 9000,
  })
  await notice(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(notice(page)).toHaveAttribute('data-phase', 'paused')
  release()
  await notice(page).getByRole('button', { name: 'Update now' }).click()
  await expect.poll(() => applied(page), { timeout: 12_000 }).toBe(true)
})

test('U7 installing blocks keys; U9 no restart in 6 s shows Try again', async ({
  page,
}) => {
  await start(page)
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('data-phase', 'installing', {
    timeout: 12_000,
  })
  await page.keyboard.press('Escape')
  await page.keyboard.type('zzz')
  await expect(notice(page)).toContainText('Installing')
  await expect.poll(() => applied(page)).toBe(true)
  await expect(notice(page)).toContainText('The update did not finish', {
    timeout: 9000,
  })
  await expect(
    notice(page).getByRole('button', { name: 'Try again' }),
  ).toBeVisible()
})

test('U8 a change that is not saved keeps the restart back', async ({
  page,
}) => {
  await start(page)
  await pretend(page, { unsaved: true })
  await expect(notice(page)).toContainText(
    'Your last change is not saved yet',
    { timeout: 20_000 },
  )
  expect(await applied(page)).toBeFalsy()
  await expect(
    notice(page).getByRole('button', { name: 'Try again' }),
  ).toBeVisible()
})

test('U10 offline: the notes stay open, the countdown starts when back online', async ({
  page,
  context,
}) => {
  await start(page)
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('data-phase', 'countdown')
  await context.setOffline(true)
  await expect(notice(page)).toHaveAttribute('data-phase', 'offline')
  await expect(notice(page)).toContainText(
    'Connect to the internet to finish this update. Your notes are safe.',
  )
  // Never locked out: the page behind is not blocked.
  expect(await blocked(page)).toBeFalsy()
  await context.setOffline(false)
  await expect(notice(page)).toHaveAttribute('data-phase', 'countdown')
})

test('U11 a second tab that upgraded the notes asks this tab to update', async ({
  page,
}) => {
  await start(page)
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const open = indexedDB.open('learning-notes', 99_999)
        open.onsuccess = () => {
          open.result.close()
          done()
        }
        open.onerror = () => done()
        open.onblocked = () => done()
      }),
  )
  await expect(notice(page)).toBeVisible({ timeout: 8000 })
  await expect(notice(page)).toContainText(
    'Your notes are stored in a new way.',
  )
})

test('U13 flag off: the old screen and the marker rule only', async ({
  page,
}) => {
  await versionJson(page, { commit: 'zzzz999', level: 5 })
  await start(page, '/')
  await page.waitForTimeout(3500)
  await expect(notice(page)).toHaveCount(0)
  await pretend(page)
  await expect(notice(page)).toContainText('Downloading starts in')
  await expect(
    notice(page).getByRole('button', { name: 'Cancel' }),
  ).toBeVisible()
})

test('U16 reduced motion: numbers change, ring does not animate', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await start(page)
  await pretend(page)
  await expect(page.locator('[data-ring-arc]')).toHaveCSS(
    'transition-property',
    'none',
  )
  const first = await page.locator('[data-countdown-number]').textContent()
  await expect(page.locator('[data-countdown-number]')).not.toHaveText(first!)
})

test('U17 alertdialog, focus on the button, one announcement per phase', async ({
  page,
}) => {
  await start(page)
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('role', 'alertdialog')
  await expect(
    notice(page).getByRole('button', { name: 'Not now' }),
  ).toBeFocused()
  const live = notice(page).locator('[role=status].sr-only')
  await expect(live).toHaveText('The update starts in 5 seconds.')
  await page.waitForTimeout(2200)
  await expect(live).toHaveText('The update starts in 5 seconds.')
})

test('phone: buttons are at least 44 px tall and wide enough', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await start(page)
  await pretend(page)
  await page.waitForTimeout(1200) // the fade-in ends
  const b = await notice(page)
    .getByRole('button', { name: 'Not now' })
    .boundingBox()
  expect(b!.height).toBeGreaterThanOrEqual(44)
  expect(b!.width).toBeGreaterThanOrEqual(112)
})

async function openAbout(page: Page) {
  await page.goto(FLAG)
  await cornerAction(page, 'Settings')
  await expect(page.locator('[data-about]')).toBeVisible()
}

test('U14 About shows version, level, last check and Check for updates now', async ({
  page,
}) => {
  await openAbout(page)
  const about = page.locator('[data-about]')
  await expect(about).toContainText('Version ')
  await expect(about).toContainText('Update level 1')
  await about.getByRole('button', { name: 'Check for updates now' }).click()
  await expect(about).toContainText('Last checked for updates:', {
    timeout: 15_000,
  })
})

test('U14 a check that finds a must-have version starts the notice', async ({
  page,
}) => {
  await openAbout(page)
  await versionJson(page, { commit: 'zzzz999', level: 2 })
  await page
    .locator('[data-about]')
    .getByRole('button', { name: 'Check for updates now' })
    .click()
  await expect(notice(page)).toBeVisible({ timeout: 8000 })
})

test('U14 Beginner without the unlock sees only the check button', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    ),
  )
  await openAbout(page)
  const about = page.locator('[data-about]')
  await expect(about).not.toContainText('Update level')
  await expect(
    about.getByRole('button', { name: 'Check for updates now' }),
  ).toBeVisible()
})

test('U15 the reason line opens a plain explanation, closed with the cross', async ({
  page,
}) => {
  await start(page)
  await pretend(page, { reason: 'datafix' })
  await notice(page).locator('[data-update-reason]').click()
  const pop = notice(page).locator('[data-update-details]')
  await expect(pop).toContainText('repairs some saved notes')
  await pop.getByRole('button', { name: 'Close' }).click()
  await expect(pop).toHaveCount(0)
})
