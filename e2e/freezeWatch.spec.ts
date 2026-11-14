import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openSearchPopup,
  typeInEditor,
} from './helpers.ts'

/**
 * F7 (iPad, 14 Nov): the screen sometimes froze. The freeze recorder (on
 * the preview only; here with its test switch) notes every main-thread
 * block of 500 ms or more. This walks the iPad checklist flows with the
 * checklist's switches ON and expects no block at all.
 */

const CHECKLIST_FLAGS = [
  'foundation.shell',
  'toolbar.v8',
  'settings.v3',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'update.v2',
  'page.menus',
  'storage.safety',
]

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:perf.freezeWatch', '1')
  })
})

interface Moment {
  kind: string
  ms: number
  route: string
  panel?: string
  action?: string
}

async function freezes(page: Page): Promise<Moment[]> {
  return page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide')) // writes what is waiting
    const raw = localStorage.getItem('learning-notes:perf.slow')
    return raw ? (JSON.parse(raw) as Moment[]) : []
  })
}

const LONG_TEXT = Array.from(
  { length: 12 },
  (_, i) => `Line ${i + 1} of the long note about recall and memory.`,
).join(' ')

test('F7: the checklist flows never block the screen for 500 ms or more', async ({
  page,
}, info) => {
  test.setTimeout(240_000)
  await page.goto('/#/')
  await createNotebook(page, 'Freeze check', 'First page')
  await typeInEditor(page, LONG_TEXT)
  const first = new URL(page.url()).hash
  await addPage(page, 'Freeze check', 'Second page')
  await typeInEditor(page, LONG_TEXT)
  const second = new URL(page.url()).hash

  // Part 1: the owner's notes are there; the checklist's switches go ON.
  await page.evaluate(
    (flags) =>
      localStorage.setItem('learning-notes:flags', JSON.stringify(flags)),
    CHECKLIST_FLAGS,
  )
  await page.evaluate(() => localStorage.removeItem('learning-notes:perf.slow'))
  await page.goto('/#/')
  await expect(page.locator('main')).toBeVisible()
  const go = (hash: string) => page.evaluate((h) => (location.hash = h), hash)

  // Part 2: move between the screens, twice.
  for (let round = 0; round < 2; round++) {
    for (const hash of [
      '#/',
      '#/library',
      '#/notebooks',
      '#/search',
      '#/settings',
      '#/review',
    ]) {
      await go(hash)
      await page.waitForTimeout(700)
    }
    await go(first)
    await page.waitForTimeout(700)
  }

  // Turn the iPad sideways and back (step 6).
  const size = page.viewportSize()!
  await page.setViewportSize({ width: size.height, height: size.width })
  await page.waitForTimeout(1000)
  await page.setViewportSize(size)
  await page.waitForTimeout(1000)

  // Search everything, then close it.
  const popup = await openSearchPopup(page)
  await page.keyboard.type('recall')
  await page.waitForTimeout(800)
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)

  await go(second)
  await page.waitForTimeout(700)
  await typeInEditor(page, ' more words')
  await page.waitForTimeout(1500)

  const list = (await freezes(page)).filter((m) => m.ms >= 500)
  await info.attach('freezes.json', {
    body: JSON.stringify(list, null, 2),
    contentType: 'application/json',
  })
  console.log('F7 freezes', info.project.name, JSON.stringify(list))
  expect(list).toEqual([])
})

test('F7: a real block is noted with its route, panel and last tap', async ({
  page,
}) => {
  await page.goto('/#/settings')
  await expect(page.locator('main')).toBeVisible()
  await page.waitForTimeout(1500) // the recorder chunk is loaded
  await page.getByRole('main').getByRole('heading').first().click()
  await page.evaluate(() => {
    const end = performance.now() + 1200
    while (performance.now() < end) {
      // hold the main thread, like a freeze
    }
  })
  await page.waitForTimeout(800)
  const list = await freezes(page)
  const block = list.find((m) => m.ms >= 500)
  expect(block, JSON.stringify(list)).toBeTruthy()
  expect(block!.route).toBe('#/settings')
  expect(block!.action).toMatch(/^tap /)
})
