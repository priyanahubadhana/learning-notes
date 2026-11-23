// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { cornerAction, createNotebook } from './helpers.ts'
import {
  COMMIT_A,
  COMMIT_B,
  ensureBuilds,
  startSite,
  type Site,
} from './u0aUpdateRepro.helper.ts'
import { UPDATE_LEVEL as MINE } from '../src/app/updateLevel.ts'

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
  await versionJson(page, {
    commit: 'zzzz999',
    level: MINE + 1,
    reason: 'datafix',
  })
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
  await versionJson(page, { commit: 'zzzz999', level: MINE + 2 })
  await page.goto(FLAG)
  await expect(notice(page)).toBeVisible({ timeout: 5000 })
  await expect(notice(page)).toContainText(
    'Your notes are stored in a new way.',
  )
})

for (const [name, body] of [
  ['no level', { commit: 'zzzz999' }],
  ['a text level', { commit: 'zzzz999', level: String(MINE + 1) }],
  ['a lower level', { commit: 'zzzz999', level: MINE - 1 }],
  ['the same level', { commit: 'zzzz999', level: MINE }],
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
  await expect(notice(page)).toContainText('Starts in')
  await notice(page).getByRole('button', { name: 'Not now' }).click()
  await expect(notice(page)).toHaveAttribute('data-phase', 'paused')
  await expect(notice(page)).toContainText(
    'The app needs this update to keep your notes safe.',
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
  await versionJson(page, { commit: 'zzzz999', level: MINE + 4 })
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

test('U14 Settings shows the version once (Update card), About the level, last check and Check for updates now', async ({
  page,
}) => {
  await openAbout(page)
  const about = page.locator('[data-about]')
  // U0c: the version shows once, on the Update card at the top of Settings.
  await expect(page.locator('[data-update-card]')).toContainText(/[0-9a-f]{7}/)
  await expect(about).not.toContainText('Version ')
  await expect(about).toContainText(`Update level ${MINE}`)
  await about.getByRole('button', { name: 'Check for updates now' }).click()
  await expect(about).toContainText('Last checked for updates:', {
    timeout: 15_000,
  })
})

test('U14 a check that finds a must-have version starts the notice', async ({
  page,
}) => {
  await openAbout(page)
  await versionJson(page, { commit: 'zzzz999', level: MINE + 1 })
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

test('U2 the About test button pretends a must-have update', async ({
  page,
}) => {
  await openAbout(page)
  await page.locator('[data-about-pretend]').click()
  await expect(notice(page)).toContainText('Starts in')
})

test('P1.3 the About test button reloads on the same page and keeps the offline copy', async ({
  page,
}) => {
  await page.route('**/precache.json*', (r) =>
    r.fulfill({ json: { files: [] } }),
  )
  await openAbout(page)
  const url = page.url()
  await page.evaluate(async () => {
    ;(window as never as { __same?: number }).__same = 1
    await caches.open('p13-offline-copy')
  })
  await page.locator('[data-about-pretend]').click()
  await expect(notice(page)).toBeVisible()
  // The page restarts by itself: the marker set before is gone.
  await expect
    .poll(
      () =>
        page
          .evaluate(() => (window as never as { __same?: number }).__same)
          .catch(() => 'reloading'),
      { timeout: 30_000 },
    )
    .toBeUndefined()
  expect(page.url()).toBe(url)
  // The offline copy is not dropped.
  expect(await page.evaluate(() => caches.keys())).toContain('p13-offline-copy')
})

// The held request must reach the test's route, not the offline copy.
test.describe('L13', () => {
  test.use({ serviceWorkers: 'block' })
  test('L13 a slow real restart (Safari revalidates everything) never shows "did not finish"', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.route('**/precache.json*', (r) =>
      r.fulfill({ json: { files: [] } }),
    )
    await openAbout(page)
    const url = page.url()
    await page.evaluate(() => {
      ;(window as never as { __same?: number }).__same = 1
    })
    // The restart (a plain reload) is held for 9 s, longer than the 6 s limit.
    await page.route('**/*', async (r) => {
      if (r.request().isNavigationRequest()) {
        await new Promise((ok) => setTimeout(ok, 9_000))
      }
      await r.continue()
    })
    // A held page cannot be read, so the notice phases are written to
    // sessionStorage (it survives the reload) and read afterwards.
    await page.evaluate(() => {
      new MutationObserver(() => {
        const p = document
          .querySelector('[data-mandatory-update]')
          ?.getAttribute('data-phase')
        if (p)
          sessionStorage.setItem(
            'l13',
            (sessionStorage.getItem('l13') ?? '') + p + ',',
          )
      }).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
      })
    })
    await page.locator('[data-about-pretend]').click()
    await expect
      .poll(() => applied(page).catch(() => true), { timeout: 30_000 })
      .toBe(true)
    await expect
      .poll(
        () =>
          page
            .evaluate(() => (window as never as { __same?: number }).__same)
            .catch(() => 'reloading'),
        { timeout: 30_000 },
      )
      .toBeUndefined()
    expect(page.url()).toBe(url)
    // (a) The restarted page starts clean: no saved notice comes back.
    await page.waitForTimeout(1500)
    await expect(notice(page)).toHaveCount(0)
    // Through the 9 s hold the notice never said it failed.
    const seen = await page.evaluate(() => sessionStorage.getItem('l13'))
    expect(seen).toContain('installing')
    expect(seen).not.toContain('failed')
  })
})

test('P1.3 a file that never arrives ends in Try again, never stuck', async ({
  page,
}) => {
  test.setTimeout(90_000)
  // No notebook needed: the shared createNotebook helper raced its own name
  // dialog under load and was the cause of the flake, not the stall limit.
  await page.goto(FLAG)
  await expect(page.locator('aside')).toBeVisible()
  await slowDownload(page) // the file is never let go
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('data-phase', 'downloading', {
    timeout: 10_000,
  })
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
    timeout: 40_000,
  })
  await expect(
    notice(page).getByRole('button', { name: /Try again|Retry/ }),
  ).toBeVisible()
})

test('T29 Airplane mode in the countdown: the note stays 10 s and both buttons work', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000)
  // Safari in Airplane mode keeps saying "online" and sends no events.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', { get: () => true })
    const add = window.addEventListener.bind(window)
    window.addEventListener = ((type: string, ...rest: unknown[]) =>
      type === 'offline' || type === 'online'
        ? undefined
        : (add as (...a: unknown[]) => void)(type, ...rest)) as typeof add
  })
  await page.route('**/precache.json*', (r) =>
    r.fulfill({
      json: {
        files: [
          { u: '/__t29-a.bin', s: 1000 },
          { u: '/__t29-b.bin', s: 1000 },
          { u: '/__t29-c.bin', s: 1000 },
        ],
      },
    }),
  )
  await page.goto(FLAG)
  await createNotebook(page, 'Test NB', 'First page')
  await pretend(page)
  await expect(notice(page)).toHaveAttribute('data-phase', 'countdown')
  await context.setOffline(true)
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
    timeout: 15_000,
  })
  // Stays: sampled over 10 s, it never changes or goes.
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000)
    await expect(notice(page)).toHaveAttribute('data-phase', 'failed')
  }
  const again = notice(page).getByRole('button', { name: 'Try again' })
  const notNow = notice(page).getByRole('button', { name: 'Not now' })
  await expect(again).toBeVisible()
  await expect(notNow).toBeVisible()
  await again.click()
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
    timeout: 15_000,
  })
  await notice(page).getByRole('button', { name: 'Not now' }).click()
  await expect(page.locator('[data-update-waiting]')).toBeVisible()
})

test('T29 offline with no file list: failed with Try again, never installing, never a restart', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', { get: () => true })
    const add = window.addEventListener.bind(window)
    window.addEventListener = ((type: string, ...rest: unknown[]) =>
      type === 'offline' || type === 'online'
        ? undefined
        : (add as (...a: unknown[]) => void)(type, ...rest)) as typeof add
  })
  // No route mock: /precache.json is really unreachable once offline.
  await page.goto(FLAG)
  await createNotebook(page, 'Test NB', 'First page')
  await page.evaluate(() => {
    const w = window as never as { __seen: string[]; __still: boolean }
    w.__still = true // a restart would drop this
    w.__seen = []
    new MutationObserver(() => {
      const p = document
        .querySelector('[data-mandatory-update]')
        ?.getAttribute('data-phase')
      if (p && w.__seen.at(-1) !== p) w.__seen.push(p)
    }).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    })
  })
  // "real": a restart is a plain page reload.
  await pretend(page, { real: true })
  await expect(notice(page)).toHaveAttribute('data-phase', 'countdown')
  await context.setOffline(true)
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
    timeout: 15_000,
  })
  await page.waitForTimeout(8000)
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed')
  // Back online, a newer version is found and a new worker takes over: the
  // note stays until the person chooses (nothing restarts by itself).
  await context.setOffline(false)
  await page.route('**/version.json*', (r) =>
    r.fulfill({ json: { commit: 'zzzzzzz' } }),
  )
  await page.evaluate(() => {
    const sw = navigator.serviceWorker
    sw.dispatchEvent(new Event('controllerchange'))
    sw.dispatchEvent(new Event('controllerchange'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })
  await page.waitForTimeout(24_000)
  await expect(notice(page)).toHaveAttribute('data-phase', 'failed')
  const w = await page.evaluate(() => {
    const x = window as never as { __seen: string[]; __still: boolean }
    return { seen: x.__seen, still: x.__still }
  })
  expect(w.still).toBe(true)
  expect(w.seen).not.toContain('installing')
  await expect(
    notice(page).getByRole('button', { name: 'Try again' }),
  ).toBeVisible()
  await expect(
    notice(page).getByRole('button', { name: 'Not now' }),
  ).toBeVisible()
})

// ---------------------------------------------------------------------------
// U0c: scenarios S1 to S7 of docs/features/update-v2.md, on U0a's two real
// builds (A runs, B is served from one origin while the app runs). The slow
// line answers every file late. Switch update.v2 is ON in these tests.
// ---------------------------------------------------------------------------
test.describe('U0c scenarios S1 to S7 (two real builds)', () => {
  test.describe.configure({ mode: 'default', timeout: 330_000 })
  test.use({ serviceWorkers: 'allow', storageState: undefined })

  const PORT = Number(process.env.PW_PORT ?? 5199) + 40
  let site: Site
  test.beforeAll(async ({ browserName }, info) => {
    void browserName
    // test-guard-reason: two production builds need more time, not weaker checks
    test.setTimeout(900_000)
    await ensureBuilds()
    site = await startSite(PORT + info.parallelIndex)
  })
  test.afterAll(async () => site?.close())
  test.beforeEach(() => {
    site.serve('a')
    site.slow(0)
    site.hits.length = 0
  })

  const entryOf = (dir: 'a' | 'b') =>
    /src="(\/assets\/index-[^"]+\.js)"/.exec(
      readFileSync(`.u0a/${dir}/index.html`, 'utf8'),
    )![1]
  const running = (page: Page) =>
    page.evaluate(
      () =>
        document
          .querySelector<HTMLScriptElement>(
            'script[type=module][src*="/assets/index-"]',
          )
          ?.getAttribute('src') ?? '',
    )
  const comeToFront = (page: Page) =>
    page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  const pillText = (page: Page) =>
    page
      .locator('[data-update-pill]')
      .innerText({ timeout: 500 })
      .then((x) => x.replace(/\s+/g, ' ').trim())
      .catch(() => '-')
  const isBlocked = (page: Page) =>
    page.evaluate(() => document.getElementById('root')?.hasAttribute('inert'))

  const PREFS: Record<string, string> = {
    'learning-notes:devicePicker.done': 'true',
    'learning-notes:onboarding.done': 'true',
    'learning-notes:toolbar.lastToolOffered': 'true',
    'learning-notes:accountGate.off': '1',
    'learning-notes:firstUse.seen': '["lasso","writePad","layers","paperBox"]',
    'learning-notes:general.pasteMode': '"keep"',
    'learning-notes:general.openNotebookAt': '"tabs"',
    'learning-notes:flags': '["update.versionLine","update.v2"]',
  }

  /** Opens A with update.v2 on and a pill trace in sessionStorage. */
  async function open(page: Page, auto = true) {
    await page.addInitScript(
      ([prefs, autoOn]) => {
        for (const [k, v] of Object.entries(prefs))
          if (localStorage.getItem(k) === null) localStorage.setItem(k, v)
        if (!autoOn)
          localStorage.setItem('learning-notes:general.autoUpdate', '"off"')
        const log = (m: string) => {
          try {
            const a = JSON.parse(sessionStorage.getItem('u0c') || '[]')
            a.push([Date.now(), m])
            sessionStorage.setItem('u0c', JSON.stringify(a))
          } catch {
            /* no storage: no trace */
          }
        }
        log('page start')
        let last = ''
        new MutationObserver(() => {
          // The status pill and, while it is asked, the 3 s prompt (toast).
          const parts = [
            ...document.querySelectorAll<HTMLElement>(
              '[data-update-prompt], [data-update-pill]',
            ),
          ].map((n) => n.innerText.trim().replace(/\s+/g, ' '))
          const text = parts.length ? parts.join(' ') : '-'
          if (text !== last) {
            last = text
            log(`pill="${text}"`)
          }
        }).observe(document, {
          subtree: true,
          childList: true,
          characterData: true,
        })
      },
      [PREFS, auto] as const,
    )
    await page.goto(site.url + '/')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true)
  }
  const trace = (page: Page) =>
    page
      .evaluate(() => JSON.parse(sessionStorage.getItem('u0c') || '[]'))
      .catch(() => []) as Promise<[number, string][]>

  test('S1 plain case: download to 100, one 3-second prompt with Cancel, restart into B, "Updated to"', async ({
    page,
  }) => {
    site.slow(100)
    await open(page)
    site.serve('b')
    await comeToFront(page)
    const prompt = page.locator('[data-update-prompt]')
    await expect(prompt).toBeVisible({ timeout: 120_000 })
    await expect(prompt).toContainText(/Restarting in [123] s/)
    const cancel = prompt.getByRole('button', { name: 'Cancel' })
    await expect(cancel).toBeVisible()
    expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await expect
      .poll(() => running(page).catch(() => ''), { timeout: 60_000 })
      .toBe(entryOf('b'))
    await expect(
      page.getByText(`Updated to version ${COMMIT_B.slice(0, 7)}`),
    ).toBeVisible({ timeout: 20_000 })
    // Asked once only: one restart, so two page starts in all.
    const rows = await trace(page)
    expect(rows.filter(([, m]) => m === 'page start').length).toBe(2)
  })

  test('S2 required update: edits paused, download, restart into B', async ({
    page,
  }) => {
    site.slow(100)
    await open(page)
    // The live version.json says: must-have (a higher level).
    await page.route('**/version.json*', (r) =>
      r.fulfill({
        json: {
          commit: COMMIT_B,
          required: true,
          level: 99,
          reason: 'storage',
        },
      }),
    )
    site.serve('b')
    await comeToFront(page)
    await expect(page.locator('[data-mandatory-update]')).toBeVisible({
      timeout: 60_000,
    })
    expect(await isBlocked(page)).toBe(true)
    await expect
      .poll(() => running(page).catch(() => ''), { timeout: 200_000 })
      .toBe(entryOf('b'))
  })

  test('S3 slow line (1000 ms a file): never "Restarting" before 100 percent, no loop, B runs', async ({
    page,
  }) => {
    // test-guard-reason: a slow line needs a longer wait, not weaker checks
    test.setTimeout(400_000)
    await open(page) // A loads at full speed; only B's download is slow
    site.slow(1000)
    site.serve('b')
    await comeToFront(page)
    await expect
      .poll(() => running(page).catch(() => ''), { timeout: 330_000 })
      .toBe(entryOf('b'))
    const rows = (await trace(page)).map(([, m]) => m)
    expect(rows.filter((m) => m === 'page start').length).toBeLessThanOrEqual(2)
    const firstRestart = rows.findIndex((m) => /Restarting/.test(m))
    expect(firstRestart).toBeGreaterThan(-1)
    const pcts = rows
      .slice(0, firstRestart)
      .map((m) => /[(]([0-9]+)%[)]/.exec(m))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => Number(m[1]))
    expect(pcts.every((n) => n <= 100)).toBe(true)
    expect(pcts.at(-1) ?? 0).toBeGreaterThanOrEqual(100)
  })

  test('S3b a restart that does not come: "The update did not finish" with Try again, never a reload onto the old version', async ({
    page,
  }) => {
    // A new worker that stays installing (a very slow line), then a restart
    // is asked for (the test door says a version is ready, apply does nothing).
    await open(page) // A loads at full speed; only B's download is slow
    site.slow(120_000)
    site.serve('b')
    await comeToFront(page)
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const r = await navigator.serviceWorker.getRegistration()
          return !!r?.installing
        }),
      )
      .toBe(true)
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('learning-notes:test-update', {
          detail: { stuck: true },
        }),
      ),
    )
    await expect(
      page.getByText('The update did not finish').first(),
    ).toBeVisible({ timeout: 60_000 })
    await expect(
      page.getByRole('button', { name: 'Try again' }).first(),
    ).toBeVisible()
    expect(await running(page)).toBe(entryOf('a'))
    expect(
      (await trace(page)).filter(([, m]) => m === 'page start').length,
    ).toBe(1)
  })

  test('S4 after the update, closing and opening again: no download, "Up to date" with the new version', async ({
    page,
    context,
  }) => {
    site.slow(100)
    await open(page)
    site.serve('b')
    await comeToFront(page)
    await expect
      .poll(() => running(page).catch(() => ''), { timeout: 120_000 })
      .toBe(entryOf('b'))
    await page.waitForTimeout(3000)
    await page.close()
    const before = site.hits.length
    const again = await context.newPage()
    await again.goto(site.url + '/')
    await again.waitForTimeout(8000)
    expect(
      site.hits
        .slice(before)
        .filter((h) => h.path.startsWith('/assets/') && h.dir === 'b'),
    ).toHaveLength(0)
    await cornerAction(again, 'Settings')
    const card = again.locator('[data-update-card]')
    await expect(card).toContainText(COMMIT_B.slice(0, 7))
    await expect(card).toContainText('Up to date')
  })

  test('S5 Settings first page: the Update card is at the top, version once, Check now works', async ({
    page,
  }) => {
    await open(page, false)
    await cornerAction(page, 'Settings')
    const card = page.locator('[data-update-card]')
    await expect(card).toBeVisible()
    await expect(card).toContainText(COMMIT_A.slice(0, 7))
    const text = await card.innerText()
    expect(text.split(COMMIT_A.slice(0, 7)).length - 1).toBe(1)
    const check = card.getByRole('button', { name: 'Check now' })
    expect((await check.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    site.serve('b')
    await check.click()
    await expect(card).toHaveAttribute('data-update-state', 'ready', {
      timeout: 60_000,
    })
    await expect(
      card.getByRole('button', { name: 'Update', exact: true }),
    ).toBeVisible()
  })

  test('S6 Cancel on the prompt: the app keeps working, "Update postponed", no restart', async ({
    page,
  }) => {
    site.slow(100)
    await open(page)
    site.serve('b')
    await comeToFront(page)
    const prompt = page.locator('[data-update-prompt]')
    await expect(prompt).toBeVisible({ timeout: 120_000 })
    await prompt.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('[data-update-pill]')).toContainText(
      'Update postponed',
    )
    await page.waitForTimeout(6000)
    expect(await running(page)).toBe(entryOf('a'))
    expect(await isBlocked(page)).toBeFalsy()
  })

  test('S7 offline during the download: it goes on by itself when the line is back', async ({
    page,
    context,
  }) => {
    site.slow(300)
    await open(page)
    site.serve('b')
    await comeToFront(page)
    await expect
      .poll(async () => /Downloading/.test(await pillText(page)), {
        timeout: 60_000,
      })
      .toBe(true)
    await context.setOffline(true)
    await page.waitForTimeout(3000)
    // Notes stay usable offline: the app is still there.
    expect(await running(page)).toBe(entryOf('a'))
    await context.setOffline(false)
    await expect
      .poll(() => running(page).catch(() => ''), { timeout: 240_000 })
      .toBe(entryOf('b'))
  })
})
