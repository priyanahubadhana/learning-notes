/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { startInMode } from './helpers.ts'

/**
 * R8: texts that are not in the first download (en/late) load after the first
 * screen. This holds that load back and checks that the first screen shows no
 * raw text keys (like "sidebar.title"), so moving more texts out of the first
 * download can never show keys on screen.
 */
/** Already late before R8 (the welcome title flashes its key today); not made worse here. */
const KNOWN_EARLY = new Set(['welcome.title'])
const KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/

async function holdLateTexts(page: import('@playwright/test').Page) {
  await page.route('**/assets/*.js', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    // shell.notSaved lives only in the late texts (and the translations).
    if (body.includes('shell.notSaved') && !body.includes('react-dom'))
      await new Promise((r) => setTimeout(r, 6000))
    await route.fulfill({ response, body })
  })
}

async function visibleKeys(page: import('@playwright/test').Page) {
  return page
    .evaluate((src) => {
      const re = new RegExp(src)
      const found = new Set<string>()
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const bits = [
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
          el.getAttribute('placeholder'),
          el.children.length === 0 ? el.textContent : null,
        ]
        for (const b of bits) {
          const s = b?.trim()
          if (s && re.test(s)) found.add(s)
        }
      }
      return [...found]
    }, KEY.source)
    .then((keys) => keys.filter((k) => !KNOWN_EARLY.has(k)))
}

for (const [name, size] of [
  ['iPad', { width: 820, height: 1180 }],
  ['phone', { width: 390, height: 800 }],
  ['computer', { width: 1280, height: 800 }],
] as const) {
  test(`R8 the first screen shows no raw text keys before the late texts arrive (${name})`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await startInMode(page, name === 'computer' ? 'computer' : 'touch')
    await holdLateTexts(page)
    await page.goto('/')
    await page.locator('aside, nav[aria-label]').first().waitFor({
      state: 'attached',
    })
    await page.waitForTimeout(800)
    expect(await visibleKeys(page)).toEqual([])
  })
}

// The very first start: nothing answered yet (device picker, welcome, sign-in gate).
test.describe('first start, nothing answered', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test('R8 the first start shows no raw text keys before the late texts arrive', async ({
    page,
  }) => {
    await holdLateTexts(page)
    await page.goto('/')
    await page.waitForTimeout(1500)
    expect(await visibleKeys(page)).toEqual([])
  })
  test('R8 the sign-in gate shows no raw text keys before the late texts arrive', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      for (const [k, v] of [
        ['devicePicker.done', 'true'],
        ['onboarding.done', 'true'],
      ])
        localStorage.setItem('learning-notes:' + k, v)
    })
    await holdLateTexts(page)
    await page.goto('/')
    await page.waitForTimeout(1500)
    expect(await visibleKeys(page)).toEqual([])
  })
})
