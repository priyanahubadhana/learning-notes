// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Storage safety (docs/features/storage-safety.md, flag storage.safety):
 * the Home Screen notice in a Safari tab, the Show how pop-up, one-tap
 * backup, and calm banners for a full device and a lost database.
 * One test per "When" line of the spec.
 */

const ON = '/?flags=storage.safety'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const OLD_FULL = 'This device is out of space'
const banner = (page: Page) => page.getByTestId('attention-banner')

/** A save refused by the browser (reaches reportError like a real one). */
async function failSave(page: Page, name: string) {
  await page.evaluate((n) => {
    void Promise.reject(Object.assign(new Error('refused'), { name: n }))
  }, name)
}

/**
 * The browser loses its database: every write now throws, like Safari does.
 * (Dexie keeps its own handle on IDBDatabase.transaction, so the writes of
 * the object stores are what a test can reach; the app sees the same error.)
 */
async function loseDatabase(page: Page) {
  await page.evaluate(() => {
    const lost = () => {
      throw new DOMException(
        'Connection to Indexed Database server lost. Refresh the page to try again',
        'UnknownError',
      )
    }
    for (const k of ['put', 'add', 'delete'] as const)
      IDBObjectStore.prototype[k] = lost
  })
}

/** Types without waiting for "saved" (a lost database never saves). */
async function typeWhileLost(page: Page, text: string) {
  await page.locator('.bn-editor').click()
  await page.keyboard.type(text)
}

/** Opens the Safari-tab notice and its "Show how" pop-up. */
async function openHowTo(page: Page) {
  await page.goto(`${ON}#/`)
  const b = banner(page)
  await expect(b).toHaveAttribute('data-code', 'homeScreen')
  const show = b.getByRole('button', { name: 'Show how' })
  await show.click()
  const dlg = page.getByTestId('ss-howto')
  await expect(dlg).toBeVisible()
  return { b, show, dlg }
}

/** Makes a page, then a refused save; returns the warm banner. */
async function fullDevice(page: Page) {
  await page.goto(`${ON}#/`)
  await createNotebook(page, 'Safe', 'First')
  await typeInEditor(page, 'kept words')
  await failSave(page, 'QuotaExceededError')
  const b = banner(page)
  await expect(b).toHaveAttribute('data-code', 'storageFull')
  return b
}

test.describe('Safari tab on iPad', () => {
  test.use({
    userAgent: IPAD_UA,
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
  })

  test('SS-01: the Home Screen notice has its words and Show how', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    await expect(b).toContainText(
      'Keep your notes safe: add this app to your Home Screen.',
    )
    await expect(b.getByRole('button', { name: 'Show how' })).toBeVisible()
  })

  test('SS-01a: after 2 s the notice shows and the page moves down', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'homeScreen')
    await expect(b.getByRole('button', { name: 'Show how' })).toBeVisible()
    await expect(b.getByTestId('fb-banner-x')).toBeVisible()
    const h = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--attn-h'),
    )
    expect(parseInt(h)).toBeGreaterThanOrEqual(44)
  })

  test('SS-01e: signed out, no notice', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      localStorage.removeItem('learning-notes:accountGate.off'),
    )
    await page.goto(`${ON}#/`)
    await page.reload()
    await page.waitForTimeout(2500)
    await expect(banner(page)).toHaveCount(0)
  })

  test('SS-01c: tap ✕, it stays away, also after a reload', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'homeScreen')
    await b.getByTestId('fb-banner-x').click()
    await expect(b).toHaveCount(0)
    await page.reload()
    await page.waitForTimeout(2500)
    await expect(b).toHaveCount(0)
  })

  test('SS-01d: a more urgent alert takes the spot; the notice waits', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'homeScreen')
    await failSave(page, 'QuotaExceededError')
    await expect(b).toHaveAttribute('data-code', 'storageFull')
    await page.reload()
    await expect(b).toHaveAttribute('data-code', 'homeScreen')
  })

  test('SS-02: the pop-up has 3 steps, the why line and its buttons', async ({
    page,
  }) => {
    const { dlg } = await openHowTo(page)
    await expect(dlg.locator('li')).toHaveCount(3)
    await expect(dlg).toContainText('so back up first')
    await expect(
      dlg.getByRole('button', { name: 'Back up first' }),
    ).toBeVisible()
    await expect(dlg.getByRole('button', { name: 'Done' })).toBeVisible()
  })

  test('SS-02a: Show how opens the pop-up with focus inside', async ({
    page,
  }) => {
    const { dlg } = await openHowTo(page)
    await expect(dlg.getByRole('button', { name: 'Close' })).toBeVisible()
    expect(await dlg.evaluate((d) => d.contains(document.activeElement))).toBe(
      true,
    )
  })

  test('SS-02b: Esc, ✕, outside and Done close it; focus returns', async ({
    page,
  }) => {
    const { b, show, dlg } = await openHowTo(page)
    await page.keyboard.press('Escape')
    await expect(dlg).toHaveCount(0)
    await expect(show).toBeFocused()
    await show.click()
    await dlg.getByRole('button', { name: 'Close' }).click()
    await expect(dlg).toHaveCount(0)
    await show.click()
    await page.mouse.click(5, 760)
    await expect(dlg).toHaveCount(0)
    await show.click()
    await dlg.getByRole('button', { name: 'Done' }).click()
    await expect(dlg).toHaveCount(0)
    await expect(show).toBeFocused()
    await expect(b).toBeVisible() // the banner stays after Done
  })

  test('SS-08: a labelled polite region; Tab reaches the button, then ✕', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'homeScreen')
    await expect(b.getByRole('region')).toHaveAccessibleName(/.+/)
    await expect(b).toHaveAttribute('aria-live', 'polite')
    await b.getByRole('button', { name: 'Show how' }).focus()
    await page.keyboard.press('Tab')
    await expect(b.getByTestId('fb-banner-x')).toBeFocused()
  })

  test('SS-06: flag OFF shows no notice', async ({ page }) => {
    await page.goto('/#/')
    await page.waitForTimeout(2500)
    await expect(banner(page)).toHaveCount(0)
  })
})

test.describe('PC Chrome', () => {
  test.use({
    userAgent: CHROME_UA,
    viewport: { width: 1200, height: 800 },
    hasTouch: false,
    isMobile: false,
  })

  test('SS-01b: no Home Screen notice outside a Safari tab', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await page.waitForTimeout(2500)
    await expect(banner(page)).toHaveCount(0)
  })

  test('SS-03: one tap saves one backup file with no question', async ({
    page,
  }) => {
    await page.goto(`${ON}#/settings`)
    const download = page.waitForEvent('download')
    await page.getByTestId('ss-backup-now').click()
    expect((await download).suggestedFilename()).toBeTruthy()
    await expect(page.getByText('Backup saved to Downloads.')).toBeVisible()
  })

  test('SS-03a: Back up on the full banner saves a file', async ({ page }) => {
    const b = await fullDevice(page)
    const download = page.waitForEvent('download')
    await b.getByRole('button', { name: 'Back up' }).click()
    expect((await download).suggestedFilename()).toBeTruthy()
  })

  test('SS-03b: a backup that cannot be made shows Try again', async ({
    page,
  }) => {
    await page.goto(`${ON}#/settings`)
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('blocked')
      }
    })
    const btn = page.getByTestId('ss-backup-now')
    await btn.click()
    await expect(page.getByText('Backup could not be saved.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(btn).toBeEnabled()
  })

  test('SS-03c: Back up now twice quickly saves one file', async ({ page }) => {
    await page.goto(`${ON}#/settings`)
    const btn = page.getByTestId('ss-backup-now')
    await expect(btn).toHaveText('Back up now')
    let files = 0
    page.on('download', () => files++)
    await btn.dblclick()
    await expect(page.getByText('Backup saved to Downloads.')).toBeVisible()
    await expect(btn).toBeEnabled()
    expect(files).toBe(1)
  })

  test('SS-03d: a backup changes no note, setting or Undo step', async ({
    page,
  }) => {
    const b = await fullDevice(page)
    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    const state = () =>
      undo
        .first()
        .isEnabled()
        .catch(() => null)
    const before = await state()
    const download = page.waitForEvent('download')
    await b.getByRole('button', { name: 'Back up' }).click()
    await download
    await expect(page.getByText('Backup saved.')).toBeVisible()
    expect(await state()).toBe(before)
    await expect(page.locator('.bn-editor')).toContainText('kept words')
  })

  test('SS-04: the full banner replaces the old repeated message', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Safe', 'First')
    await failSave(page, 'QuotaExceededError')
    await failSave(page, 'QuotaExceededError')
    const b = banner(page)
    await expect(b).toContainText(
      'This device is full. New changes may not save.',
    )
    await expect(b.locator('[data-kind="storage"]')).toBeVisible()
    await expect(page.getByText(OLD_FULL)).toHaveCount(0)
  })

  test('SS-04a: a refused save shows the warm banner once, no toasts', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Safe', 'First')
    await failSave(page, 'QuotaExceededError')
    await failSave(page, 'QuotaExceededError')
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'storageFull')
    await expect(b.getByRole('button', { name: 'Back up' })).toBeVisible()
    await expect(b.getByTestId('fb-banner-x')).toBeVisible()
    await expect(
      page.getByText('device is full', { exact: false }),
    ).toHaveCount(1)
  })

  test('SS-04b: Back up saves; the toast offers Free up space', async ({
    page,
  }) => {
    const b = await fullDevice(page)
    const download = page.waitForEvent('download')
    await b.getByRole('button', { name: 'Back up' }).click()
    await download
    await expect(page.getByText('Backup saved.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Free up space' }),
    ).toBeVisible()
  })

  test('SS-04c: tap ✕, another refused save brings it back', async ({
    page,
  }) => {
    const b = await fullDevice(page)
    await b.getByTestId('fb-banner-x').click()
    await expect(b).toHaveCount(0)
    await failSave(page, 'QuotaExceededError')
    await expect(b).toHaveAttribute('data-code', 'storageFull')
  })

  test('SS-05: the lost banner says saving is paused and offers Reload', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Safe', 'First')
    await failSave(page, 'QuotaExceededError')
    await failSave(page, 'DatabaseClosedError')
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'storageLost') // lost wins
    await expect(b).toContainText(
      'Saving is paused. Reload to carry on; your notes are safe.',
    )
    await expect(b.getByRole('button', { name: 'Reload' })).toBeVisible()
  })

  test('SS-05a: a lost database shows Reload and keeps my words', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Lost', 'Page')
    await loseDatabase(page)
    await typeWhileLost(page, 'still here')
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'storageLost')
    await expect(b.getByTestId('fb-banner-x')).toBeVisible()
    await expect(page.locator('.bn-editor')).toContainText('still here')
  })

  test('SS-05b: Reload brings my words back and the banner is gone', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Lost', 'Page')
    await loseDatabase(page)
    await typeWhileLost(page, 'still here')
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'storageLost')
    await b.getByRole('button', { name: 'Reload' }).click()
    await page.waitForLoadState('load')
    await expect(page.locator('.bn-editor')).toContainText('still here')
    await page.waitForTimeout(2500)
    await expect(b).toHaveCount(0)
  })

  test('SS-06: flag OFF keeps the old full message', async ({ page }) => {
    await page.goto('/#/')
    await page.waitForTimeout(500)
    await failSave(page, 'QuotaExceededError')
    await expect(page.getByText(OLD_FULL)).toBeVisible()
    await expect(banner(page)).toHaveCount(0)
  })
})

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow', viewport: { width: 1200, height: 800 } })

  test('SS-09: the banners work with no internet', async ({
    page,
    context,
  }) => {
    await page.goto(`${ON}#/`)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true)
    await context.setOffline(true)
    await page.reload()
    // The watcher loads just after start: retry until it has taken the error.
    await expect
      .poll(async () => {
        await failSave(page, 'DatabaseClosedError').catch(() => {})
        return banner(page)
          .getAttribute('data-code', { timeout: 500 })
          .catch(() => null)
      })
      .toBe('storageLost')
    await context.setOffline(false)
  })
})

test.describe('phone', () => {
  test.use({ userAgent: IPAD_UA, viewport: { width: 360, height: 740 } })

  test('SS-07: text wraps, nothing clipped, buttons 44 pt', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    for (const code of ['homeScreen', 'storageFull', 'storageLost']) {
      if (code === 'storageFull') await failSave(page, 'QuotaExceededError')
      if (code === 'storageLost') await failSave(page, 'DatabaseClosedError')
      await expect(b).toHaveAttribute('data-code', code)
      const text = b.locator('.fb-banner__text')
      const lines = await text.evaluate((el) => {
        const cs = getComputedStyle(el)
        const inner =
          el.getBoundingClientRect().height -
          parseFloat(cs.paddingTop) -
          parseFloat(cs.paddingBottom)
        return inner / parseFloat(cs.lineHeight)
      })
      expect(lines).toBeLessThanOrEqual(3.1)
      for (const btn of await b.getByRole('button').all()) {
        const box = (await btn.boundingBox())!
        expect(Math.round(box.height)) // sub-pixel layout
          .toBeGreaterThanOrEqual(44)
        expect(box.x + box.width).toBeLessThanOrEqual(360)
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
  })
})
