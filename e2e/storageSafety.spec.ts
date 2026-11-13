// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Storage safety (docs/features/storage-safety.md, flag storage.safety):
 * the Home Screen notice in a Safari tab, the Show how pop-up, one-tap
 * backup, and calm banners for a full device and a lost database.
 */

const ON = '/?flags=storage.safety'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const OLD_FULL = 'This device is out of space'
const banner = (page: Page) => page.getByTestId('attention-banner')

/** A save refused by the browser (reaches reportError like a real one). */
async function failSave(page: Page, name: string) {
  await page.evaluate((n) => {
    void Promise.reject(Object.assign(new Error('refused'), { name: n }))
  }, name)
}

test.describe('Safari tab on iPad', () => {
  test.use({
    userAgent: IPAD_UA,
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
  })

  test('SS-01a/c/d, SS-02a/b, SS-08: notice, Show how, 7-day hide', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'homeScreen')
    await expect(b).toContainText('add this app to your Home Screen')
    await expect(b.getByRole('region')).toHaveAccessibleName(/.+/)
    await expect(b).toHaveAttribute('aria-live', 'polite')
    // The page moves down by the banner's height.
    const h = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--attn-h'),
    )
    expect(parseInt(h)).toBeGreaterThanOrEqual(44)

    // SS-02a: the pop-up, focus inside.
    const show = b.getByRole('button', { name: 'Show how' })
    await show.click()
    const dlg = page.getByTestId('ss-howto')
    await expect(dlg).toBeVisible()
    await expect(dlg.locator('li')).toHaveCount(3)
    await expect(dlg).toContainText('so back up first')
    await expect(
      dlg.getByRole('button', { name: 'Back up first' }),
    ).toBeVisible()
    await expect(dlg.getByRole('button', { name: 'Done' })).toBeVisible()
    await expect(dlg.getByRole('button', { name: 'Close' })).toBeVisible()
    expect(await dlg.evaluate((d) => d.contains(document.activeElement))).toBe(
      true,
    )
    // SS-02b: Esc, ✕, outside and Done close it; focus returns to Show how.
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
    // Banner stays after Done.
    await expect(b).toBeVisible()

    // SS-01d: a more urgent alert takes the one spot; the notice waits.
    await failSave(page, 'QuotaExceededError')
    await expect(b).toHaveAttribute('data-code', 'storageFull')
    await page.reload()
    await expect(b).toHaveAttribute('data-code', 'homeScreen')

    // SS-08: Tab reaches the button, then ✕.
    await show.focus()
    await page.keyboard.press('Tab')
    await expect(b.getByTestId('fb-banner-x')).toBeFocused()

    // SS-01c: ✕ hides it for 7 days, also after a reload.
    await b.getByTestId('fb-banner-x').click()
    await expect(b).toHaveCount(0)
    await page.reload()
    await page.waitForTimeout(2500)
    await expect(b).toHaveCount(0)
  })

  test('SS-06: flag OFF shows no notice', async ({ page }) => {
    await page.goto('/#/')
    await page.waitForTimeout(2500)
    await expect(banner(page)).toHaveCount(0)
  })
})

test.describe('PC Chrome', () => {
  test.use({ viewport: { width: 1200, height: 800 } })

  test('SS-01b: no Home Screen notice outside a Safari tab', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await page.waitForTimeout(2500)
    await expect(banner(page)).toHaveCount(0)
  })

  test('SS-04a/b/c, SS-03a/d: full device banner, Back up, returns', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Safe', 'First')
    await typeInEditor(page, 'kept words')
    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    const undoBefore = await undo
      .first()
      .isEnabled()
      .catch(() => null)

    await failSave(page, 'QuotaExceededError')
    await failSave(page, 'QuotaExceededError')
    const b = banner(page)
    await expect(b).toHaveAttribute('data-code', 'storageFull')
    await expect(b).toContainText('This device is full.')
    await expect(b.locator('[data-kind="storage"]')).toBeVisible()
    // No repeated toasts: the old message stays quiet.
    await expect(
      page.getByText('device is full', { exact: false }),
    ).toHaveCount(1)

    const download = page.waitForEvent('download')
    await b.getByRole('button', { name: 'Back up' }).click()
    expect((await download).suggestedFilename()).toBeTruthy()
    await expect(page.getByText('Backup saved.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Free up space' }),
    ).toBeVisible()
    expect(
      await undo
        .first()
        .isEnabled()
        .catch(() => null),
    ).toBe(undoBefore)
    await expect(page.locator('.bn-editor')).toContainText('kept words')

    // SS-04c: ✕, then another refused save brings it back.
    await b.getByTestId('fb-banner-x').click()
    await expect(b).toHaveCount(0)
    await failSave(page, 'QuotaExceededError')
    await expect(b).toHaveAttribute('data-code', 'storageFull')
  })

  test('SS-05a/b: lost database banner, words kept, Reload', async ({
    page,
  }) => {
    await page.goto(`${ON}#/`)
    await createNotebook(page, 'Lost', 'Page')
    await typeInEditor(page, 'still here')
    await failSave(page, 'QuotaExceededError')
    await failSave(page, 'DatabaseClosedError')
    const b = banner(page)
    // Full and lost together: lost wins.
    await expect(b).toHaveAttribute('data-code', 'storageLost')
    await expect(b).toContainText('Saving is paused.')
    await expect(page.locator('.bn-editor')).toContainText('still here')
    await b.getByRole('button', { name: 'Reload' }).click()
    await page.waitForLoadState('load')
    await expect(page.locator('.bn-editor')).toContainText('still here')
    await page.waitForTimeout(2500)
    await expect(b).toHaveCount(0)
  })

  test('SS-03a/b/c: Back up now in Settings, one file, failure toast', async ({
    page,
  }) => {
    await page.goto(`${ON}#/settings`)
    const btn = page.getByTestId('ss-backup-now')
    await expect(btn).toHaveText('Back up now')
    let files = 0
    page.on('download', () => files++)
    await btn.dblclick()
    await expect(page.getByText('Backup saved to Downloads.')).toBeVisible()
    await expect(btn).toBeEnabled()
    expect(files).toBe(1)

    // SS-03b: the file cannot be made.
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('blocked')
      }
    })
    await btn.click()
    await expect(page.getByText('Backup could not be saved.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
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
