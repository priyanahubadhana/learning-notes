// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from './frameFixture.ts'
import { createNotebook, openSidebar } from './helpers.ts'

/**
 * B10-8 (P-18): the sidebar page menu draws line icons only (no text
 * characters, no emoji), and on a phone its list does not cover the page's
 * own title row.
 */
test.use({ hasTouch: true, isMobile: true })

async function openMenu(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Anatomy', 'First')
  const side = await openSidebar(page)
  const row = side.getByRole('button', { name: 'More for First' })
  await row.tap()
  const menu = page.getByRole('menu').last()
  await expect(menu).toBeVisible()
  return { side, menu }
}

const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-upright': { width: 820, height: 1180 },
}

for (const [name, size] of Object.entries(SIZES))
  test(`B10-8 page menu: line icons only, title uncovered (${name})`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    const { side, menu } = await openMenu(page)
    const items = menu.getByRole('menuitem')
    expect(await items.count()).toBeGreaterThan(3)
    for (let i = 0; i < (await items.count()); i++) {
      const icon = items.nth(i).locator('span[aria-hidden]').first()
      await expect(icon.locator('svg')).toHaveCount(1)
      expect(((await icon.textContent()) ?? '').trim()).toBe('')
    }
    // The list never covers the page's own name in the row.
    const title = (await side
      .getByRole('button', { name: 'First', exact: true })
      .boundingBox())!
    const m = (await menu.boundingBox())!
    const cut =
      Math.min(title.x + title.width, m.x + m.width) > Math.max(title.x, m.x) &&
      Math.min(title.y + title.height, m.y + m.height) > Math.max(title.y, m.y)
    expect(cut, 'the menu covers the page title').toBe(false)
  })

const taken: string[] = []
for (const [name, size] of Object.entries(SIZES))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`B10-8 pictures: ${name} ${tname}`, async ({ page }, info) => {
      await page.setViewportSize(size)
      await openMenu(page)
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      const out = `screenshots/b10-8/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-8 Sidebar page menu\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
