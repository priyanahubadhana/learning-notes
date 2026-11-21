import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * B10-11: Settings names the paste choice "Keep look", the same words as the
 * Paste menu, with and without the page.menus switch.
 */
const group = (page: import('@playwright/test').Page) =>
  page.getByRole('group', { name: 'Paste as' })

for (const flags of ['', '?flags=page.menus'])
  test(`B10-11 Settings says "Keep look" ${flags || '(switch off)'}`, async ({
    page,
  }) => {
    await page.goto(`/${flags}#/settings/general`)
    await expect(
      group(page).getByRole('button', { name: 'Keep look' }),
    ).toBeVisible()
    await expect(group(page).getByText(/keep format|original/i)).toHaveCount(0)
  })

const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
}
const taken: string[] = []
for (const [name, size] of Object.entries(SIZES))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`B10-11 pictures: ${name} ${tname}`, async ({ page }, info) => {
      await page.setViewportSize(size)
      await page.goto('/#/settings/general')
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      await group(page).scrollIntoViewIfNeeded()
      const out = `screenshots/b10-11/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-11 Settings: Paste as, Keep look\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
