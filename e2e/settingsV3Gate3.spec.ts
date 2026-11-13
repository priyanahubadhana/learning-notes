import { expect, test } from '@playwright/test'

/** Gate 3 fix list, 3 Settings v3 (13 Nov 2026). */
const V3 = '/?flags=settings.v3,foundation.shell#/settings'
const PHONE = { width: 390, height: 844 }
const IPAD = { width: 834, height: 1194 }

test.describe('phone', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true })

  test('1 the gear (More) is lit while Settings is open, not Notebooks', async ({
    page,
  }) => {
    await page.goto(V3)
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    await expect(
      page.locator('[data-shell-tabbar] [data-testid="corner-button"]'),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      page.locator('[data-shell-tabbar] [data-space][aria-current="page"]'),
    ).toHaveCount(0)
  })

  test('2 the selected section chip is the lilac style, no ink outline', async ({
    page,
  }) => {
    await page.goto(V3)
    const cur = page.locator('.sv3-section[aria-current="page"]')
    await expect(cur).toBeVisible()
    const s = await cur.evaluate((el) => {
      const c = getComputedStyle(el)
      const probe = document.createElement('i')
      probe.style.background = 'var(--color-accent-soft)'
      probe.style.color = 'var(--color-accent)'
      document.body.appendChild(probe)
      const p = getComputedStyle(probe)
      const out = {
        bg: c.backgroundColor === p.backgroundColor,
        color: c.color === p.color,
        border: c.borderTopColor,
      }
      probe.remove()
      return out
    })
    expect(s.bg).toBe(true)
    expect(s.color).toBe(true)
    expect(s.border).toBe('rgba(0, 0, 0, 0)')
  })

  test('9 no key names on touch (General, device card)', async ({ page }) => {
    await page.goto(`${V3}/general`)
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    await expect(page.getByText('Ctrl+Shift+K')).toHaveCount(0)
  })

  test('6 Sync: What syncs uses switches, and the sign-in link is the accent colour', async ({
    page,
  }) => {
    await page.goto(`${V3}/sync`)
    const sync = page.getByTestId('sync-section')
    await expect(sync).toBeVisible()
    await expect(sync.locator('input[type="checkbox"]')).toHaveCount(0)
    const link = sync.getByRole('button', { name: 'Sign in from Account' })
    await expect(link).toBeVisible()
    const same = await link.evaluate((el) => {
      const probe = document.createElement('i')
      probe.style.color = 'var(--color-accent)'
      document.body.appendChild(probe)
      const ok = getComputedStyle(el).color === getComputedStyle(probe).color
      probe.remove()
      return ok
    })
    expect(same).toBe(true)
  })

  test('7 Account: the sign-in rows are 44 pt with 12 px padding', async ({
    page,
  }) => {
    await page.goto(`${V3}/account`)
    const row = page.locator('[data-account="code"]')
    await expect(row).toBeVisible()
    const m = await row.evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        h: el.getBoundingClientRect().height,
        pt: parseFloat(s.paddingTop),
        pl: parseFloat(s.paddingLeft),
      }
    })
    expect(m.h).toBeGreaterThanOrEqual(44)
    expect(m.pt).toBeGreaterThanOrEqual(12)
    expect(m.pl).toBeGreaterThanOrEqual(12)
  })
})

test.describe('iPad portrait', () => {
  test.use({ viewport: IPAD, hasTouch: true })

  test('8 the Preview pill is docked at the right edge and the last row clears it', async ({
    page,
  }) => {
    await page.goto(V3)
    const pill = (await page.locator('[data-preview-pill]').boundingBox())!
    expect(pill.x + pill.width).toBeGreaterThan(IPAD.width - 40)
    expect(pill.x + pill.width).toBeLessThanOrEqual(IPAD.width)
    const pad = await page
      .locator('[data-settings-v3]')
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
    expect(pad).toBeGreaterThanOrEqual(100)
  })
})

test.describe('iPad landscape', () => {
  test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

  test('5 Day starts at opens the shared ▾ card (no browser drop-down) and sets the value', async ({
    page,
  }) => {
    await page.goto(`${V3}/general`)
    await page.getByRole('button', { name: 'Hide menu' }).click()
    const r = page.locator('[data-setting-id="general.dayStartHour"]')
    await expect(r).toBeVisible()
    await expect(r.locator('select')).toHaveCount(0)
    await r.locator('[data-popup-trigger]').click()
    await page.getByRole('radio', { name: /^0?4:00/ }).click()
    await expect(r.locator('[data-row-preview]')).toContainText(/0?4:00/)
  })

  test('3 a row with nothing to draw shows no empty box', async ({ page }) => {
    await page.goto(`${V3}/review`)
    const prev = page.locator(
      '[data-setting-id="review.scheduler"] [data-row-preview]',
    )
    await expect(prev).toHaveAttribute('data-picture', 'none')
    expect((await prev.boundingBox())!.height).toBeLessThan(2)
  })

  test('4 Reduce glass preview: one line of words, no diagonal stripes', async ({
    page,
  }) => {
    await page.goto(`${V3}/general`)
    await page.getByRole('button', { name: 'Hide menu' }).click()
    const g = page.locator('[data-setting-id="general.reduceGlass"]')
    await expect(g.locator('[data-glass-preview]')).toBeVisible()
    const line = g.locator('.sv3-rowprev-text')
    const h = await line.evaluate(
      (el) =>
        el.getBoundingClientRect().height /
        parseFloat(getComputedStyle(el).lineHeight),
    )
    expect(h).toBeLessThan(1.6)
    const img = await g
      .locator('.sv3-glass-stage')
      .evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(img).not.toContain('repeating')
  })
})
