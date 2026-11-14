/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, startInMode } from './helpers.ts'
import {
  lockScreen,
  lockThisPage,
  openLockedPage,
  openLockSettings,
  setCode,
} from './lockHelpers.ts'

/**
 * R8: texts that are not in the first download (en/late) load after the first
 * screen. This holds that load back and checks that the first screen shows no
 * raw text keys (like "sidebar.title"), so moving more texts out of the first
 * download can never show keys on screen.
 */
const KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/

/** While `state.on`, the late texts arrive 2.5 s late (set it just before the reload). */
async function holdLateTexts(
  page: import('@playwright/test').Page,
  state = { on: true },
) {
  await page.route('**/assets/*.js', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    // shell.notSaved lives only in the late texts (and the translations).
    if (
      state.on &&
      body.includes('shell.notSaved') &&
      !body.includes('react-dom')
    )
      await new Promise((r) => setTimeout(r, 2500))
    await route.fulfill({ response, body })
  })
  return state
}

async function visibleKeys(page: import('@playwright/test').Page) {
  return page.evaluate((src) => {
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

// A screen restored from the address or from the last visit is drawn on a
// reload; it must wait for the texts, not show raw keys (R8 review 1).
test.describe('reload with the late texts held back', () => {
  for (const hash of ['#/settings', '#/settings/appearance']) {
    test(`R8 a reload on ${hash} shows no raw text keys`, async ({ page }) => {
      await startInMode(page, 'touch')
      await holdLateTexts(page)
      await page.goto('/' + hash)
      await page.locator('aside').waitFor({ state: 'attached' })
      await page.waitForTimeout(600)
      expect(await visibleKeys(page)).toEqual([])
    })
  }

  test('R8 a reload on an open page shows no raw text keys', async ({
    page,
  }) => {
    await startInMode(page, 'touch')
    const hold = await holdLateTexts(page, { on: false })
    await page.goto('/')
    await createNotebook(page, 'Diary', 'Open page')
    await expect(
      page.getByRole('textbox', { name: 'Page title' }),
    ).toBeVisible()
    hold.on = true
    await page.reload()
    await page.locator('aside').waitFor({ state: 'attached' })
    await page.waitForTimeout(600)
    expect(await visibleKeys(page)).toEqual([])
  })

  test('R8 a reload on a locked page and a locked notebook shows no raw text keys', async ({
    page,
  }) => {
    await startInMode(page, 'touch')
    const hold = await holdLateTexts(page, { on: false })
    await page.goto('/')
    await createNotebook(page, 'Diary', 'Open page')
    await openLockSettings(page)
    await setCode(page, 'PIN', '4821')
    await openLockedPage(page, 'Open page')
    await lockThisPage(page)
    hold.on = true
    await page.reload()
    await page.locator('aside').waitFor({ state: 'attached' })
    await page.waitForTimeout(600)
    expect(await visibleKeys(page)).toEqual([])
    // The notebook itself, locked from its tab menu.
    hold.on = false
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Diary', exact: true })
      .first()
      .click()
    await page.getByRole('button', { name: 'Tab options' }).click()
    await page.getByRole('menuitem', { name: 'Lock this notebook' }).click()
    await expect(lockScreen(page)).toContainText('This notebook is locked.')
    hold.on = true
    await page.reload()
    await page.locator('aside').waitFor({ state: 'attached' })
    await page.waitForTimeout(600)
    expect(await visibleKeys(page)).toEqual([])
  })
})

test('R8 a late pack that never answers does not leave a blank screen; the texts fill in once it comes', async ({
  page,
}) => {
  await startInMode(page, 'touch')
  let release: () => void = () => {}
  const released = new Promise<void>((r) => (release = r))
  await page.route('**/assets/*.js', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    if (body.includes('shell.notSaved') && !body.includes('react-dom'))
      await released
    await route.fulfill({ response, body })
  })
  const started = Date.now()
  void page.goto('/', { waitUntil: 'commit' })
  await page
    .locator('aside')
    .waitFor({ state: 'attached', timeout: 3500 + 1500 })
  expect(Date.now() - started).toBeLessThan(3500 + 1500) // 3 s cap + load time
  release()
  // The texts update in place, with no reload.
  await expect
    .poll(async () => (await visibleKeys(page)).length, { timeout: 8000 })
    .toBe(0)
})
