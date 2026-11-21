// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, pageAction } from './helpers.ts'

/**
 * B10-9 (from slice/shell-fixes e8f5b6a0, shell spec: a toast is a pill 24 px
 * above the bottom, or 24 px above the phone tab bar and never lying on it).
 */
const barTops = (page: Page) =>
  page
    .locator('nav')
    .filter({ has: page.locator('[data-space]') })
    .evaluateAll((navs) =>
      navs
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.height > 0)
        .map((r) => r.top),
    )

/** Space between the toast's bottom and `edge`, once the toast stands still. */
async function gapAbove(page: Page, edge: () => Promise<number>) {
  const toast = page.getByRole('status')
  await expect(toast).toBeVisible()
  let gap = -1
  await expect
    .poll(
      async () => {
        const a = (await toast.boundingBox())!
        await page.waitForTimeout(250)
        const b = (await toast.boundingBox())!
        gap = (await edge()) - (b.y + b.height)
        return a.y === b.y
      },
      { timeout: 8000 },
    )
    .toBe(true)
  return gap
}

async function deleteChild(page: Page, nb: string) {
  await createNotebook(page, nb, 'Parent')
  await addPage(page, nb, 'Child')
  await pageAction(page, 'Delete page')
}

test.describe('toast above the phone tab bar', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
  for (const flags of ['', '?flags=foundation.shell'])
    test(`B10-9 a toast sits 24 px above the tab bar (${flags || 'default'})`, async ({
      page,
    }) => {
      await page.goto('/' + flags)
      await deleteChild(page, 'Toast NB')
      const tops = await barTops(page)
      expect(tops.length).toBeGreaterThan(0)
      const gap = await gapAbove(page, async () =>
        Math.min(...(await barTops(page))),
      )
      expect(gap).toBeGreaterThanOrEqual(23)
    })

  test('B10-9 turned to landscape, the next toast is still 24 px above the bar', async ({
    page,
  }) => {
    await page.goto('/?flags=foundation.shell')
    await createNotebook(page, 'Turn NB', 'Parent')
    await addPage(page, 'Turn NB', 'Child')
    await page.setViewportSize({ width: 844, height: 390 })
    await pageAction(page, 'Delete page')
    const gap = await gapAbove(page, async () =>
      Math.min(...(await barTops(page))),
    )
    expect(gap).toBeGreaterThanOrEqual(23)
  })
})

test('B10-9 on a computer a toast is 24 px above the bottom, centred', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1336, height: 800 })
  await page.goto('/')
  await deleteChild(page, 'Wide NB')
  const gap = await gapAbove(page, async () => 800)
  expect(Math.round(gap)).toBe(24)
  const t = (await page.getByRole('status').boundingBox())!
  expect(Math.abs(t.x + t.width / 2 - 668)).toBeLessThanOrEqual(2)
})

const taken: string[] = []
for (const [name, size] of Object.entries({
  phone: { width: 390, height: 844 },
  'ipad-upright': { width: 820, height: 1180 },
}))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`B10-9 pictures: ${name} ${tname}`, async ({ page }, info) => {
      await page.setViewportSize(size)
      await page.goto('/')
      await deleteChild(page, 'Pic NB')
      await page.evaluate(
        (t) => document.documentElement.setAttribute('data-theme', t),
        theme,
      )
      await expect(page.getByRole('status')).toBeVisible()
      await page.waitForTimeout(600)
      const out = `screenshots/b10-9/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-9 Toast position\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
