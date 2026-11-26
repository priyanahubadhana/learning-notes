import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { addBox } from './cBoxesHelpers.ts'

/**
 * Re-test 18 Nov, bug 2: on the preview host a plain reload must keep the
 * "Test a phase" switch and the other saved settings. The preview host is
 * served from the local build by a route (.dev is https-only).
 */
const HOST = 'build-next.learning-notes-app.pages.dev'
const PORT = Number(process.env.PW_PORT ?? 5199)
const FLAGS_KEY = 'learning-notes:flags'

test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  baseURL: `https://${HOST}`,
  ignoreHTTPSErrors: true,
  storageState: {
    cookies: [],
    origins: [
      {
        origin: `https://${HOST}`,
        localStorage: [
          { name: 'learning-notes:devicePicker.done', value: 'true' },
          { name: 'learning-notes:onboarding.done', value: 'true' },
          { name: 'learning-notes:toolbar.lastToolOffered', value: 'true' },
          { name: 'learning-notes:accountGate.off', value: '1' },
        ],
      },
    ],
  },
})

test.beforeEach(async ({ context }) => {
  await context.route(`https://${HOST}/**`, async (route) => {
    const url = route
      .request()
      .url()
      .replace(`https://${HOST}`, `http://localhost:${PORT}`)
    await route.fulfill({ response: await route.fetch({ url }) })
  })
})

const read = (page: Page) =>
  page.evaluate(
    (k) => ({
      flags: JSON.parse(localStorage.getItem(k) ?? 'null') as string[] | null,
      marker: localStorage.getItem('learning-notes:preview-phase'),
      probe: localStorage.getItem('learning-notes:probe'),
    }),
    FLAGS_KEY,
  )

test('RB-2 a plain reload keeps the test phase, the user choices and other saved settings', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('main')).toBeAttached({ timeout: 45_000 })
  const first = await read(page)
  // The phase under test went on once and was remembered.
  expect(first.marker).toBe('phase2b')
  expect(first.flags).toContain('textbox.v2')
  // The user turns one switch off and saves another setting.
  await page.evaluate((k) => {
    const list = (JSON.parse(localStorage.getItem(k)!) as string[]).filter(
      (id) => id !== 'page.menus',
    )
    localStorage.setItem(k, JSON.stringify(list))
    localStorage.setItem('learning-notes:probe', '"kept"')
  }, FLAGS_KEY)
  for (let n = 0; n < 2; n++) {
    await page.reload()
    await expect(page.locator('main')).toBeAttached({ timeout: 45_000 })
    const after = await read(page)
    expect(after.marker).toBe('phase2b')
    expect(after.probe).toBe('"kept"')
    expect(after.flags).toContain('textbox.v2')
    expect(after.flags).not.toContain('page.menus')
  }
})

test('RB-4 on the preview host a new page is v2 at once: no hint (owner 19 Nov), first box and a new box look the same', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await seedTwoB(page)
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Equal')
  await expect(page.getByText('Type, or tap anywhere')).toHaveCount(0)
  const main = page.locator('[data-paper-box="main"]')
  await typeInEditor(page, 'First')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(800)
  const extra = await addBox(page, ['Second'])
  const look = (l: Locator) =>
    l.evaluate((el) => {
      const c = el.querySelector('.bn-editor') as HTMLElement
      const b = el.querySelector('.bn-inline-content') as HTMLElement
      const cs = getComputedStyle(c)
      return {
        h: Math.round(c.getBoundingClientRect().height),
        outer: Math.round(el.getBoundingClientRect().height),
        pad: [cs.paddingTop, cs.paddingBottom, cs.paddingLeft, cs.paddingRight],
        font: getComputedStyle(b).fontSize,
      }
    })
  const [m, x] = [await look(main), await look(extra)]
  // Same text size and padding, and each is one line tall. The outer boxes differ by the
  // frame (about 5 px): reported to the owner, not changed here.
  expect(m.font).toEqual(x.font)
  expect(m.pad).toEqual(x.pad)
  expect(m.h).toBeLessThan(40)
  expect(x.h).toBeLessThan(40)
})

async function seedTwoB(page: Page) {
  // The saved choice of a tester with 2B on (the notebook list stays the old one, which the helper knows).
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:flags',
      JSON.stringify([
        'foundation.shell',
        'toolbar.v8',
        'toolbar.menu',
        'page.menus',
        'textbox.v2',
        'settings.v3',
      ]),
    )
    localStorage.setItem('learning-notes:preview-phase', 'phase2b')
  })
}

test('RB-5 with the caret in the first box, a tap in its empty part makes no new line', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await seedTwoB(page)
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Empty tap')
  await typeInEditor(page, 'First')
  const main = page.locator('[data-paper-box="main"]')
  const blocks = main.locator('.bn-block-content')
  await expect(blocks).toHaveCount(1)
  const r = (await main.boundingBox())!
  await page.mouse.click(r.x + r.width - 20, r.y + r.height - 6)
  await page.waitForTimeout(600)
  await expect(blocks).toHaveCount(1)
})
