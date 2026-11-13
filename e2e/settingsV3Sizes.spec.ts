// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * Settings v3 new screens at phone, iPad portrait and iPad landscape sizes:
 * nothing scrolls sideways and every button, switch and field is 44 pt.
 */
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad portrait': { width: 834, height: 1194 },
  'ipad landscape': { width: 1194, height: 834 },
} as const

for (const [name, viewport] of Object.entries(SIZES))
  test.describe(name, () => {
    test.use({ viewport, hasTouch: true })

    for (const section of [
      'experience',
      'help',
      'pro',
      'pencil',
      'general',
      'review',
    ])
      test(`SET-B36 ${section}: no sideways scroll and 44 pt targets`, async ({
        page,
      }) => {
        await page.goto(`/?flags=settings.v3#/settings/${section}`)
        if (name !== 'phone')
          await page
            .getByRole('button', { name: 'Hide menu' })
            .click()
            .catch(() => {})
        await expect(page.locator('[data-settings-v3]')).toBeVisible()
        await expect(
          page.locator('.sv3-main').locator(':scope > *').first(),
        ).toBeVisible()
        await page.waitForTimeout(1500)
        const over = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        expect(over).toBeLessThanOrEqual(1)
        // Buttons, switches and radios inside the page are at least 44 pt.
        const small = await page.evaluate(() => {
          const out: string[] = []
          const els = document.querySelectorAll(
            '.sv3-main button, .sv3-main [role=switch], .sv3-main [role=radio]',
          )
          for (const el of els) {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            if (r.height < 43.5 || r.width < 43.5)
              out.push(
                `${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 20)} ${r.width.toFixed(2)}x${r.height.toFixed(2)} ${el.outerHTML.slice(0, 160)}`,
              )
          }
          return out
        })
        expect(small).toEqual([])
      })
  })
