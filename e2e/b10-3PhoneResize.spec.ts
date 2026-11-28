// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from './frameFixture.ts'
import { centre, dot, drag, phoneBox, rect } from './phoneResizeHelpers.ts'

/**
 * B10-3 (R18): on a phone a dot grabbed right after the box is picked still
 * resizes it all the way (the bar moving the page up once must not cost the
 * resize), and the south dot can take the box to the end of the page.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 3,
})

test('B10-3 a south dot grabbed at once after picking resizes the box fully', async ({
  page,
}) => {
  const box = await phoneBox(page, 'B103', ['Alpha beta', 'Gamma'], {
    tall: true,
    settle: false,
    low: true,
  })
  const f = await rect(box)
  const s = await centre(dot(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 120 })
  // The page may have moved once under the finger; the box is as tall as asked.
  expect((await rect(box)).height).toBeGreaterThan(f.height + 100)
})

test('B10-3 the south dot takes the box to the end of the page', async ({
  page,
}) => {
  const box = await phoneBox(page, 'B103e', ['Alpha beta', 'Gamma'], {
    low: true,
    tall: true,
  })
  const sheet = page.locator('[data-paper-box="main"]').first()
  const s = await centre(dot(box, 's'))
  await drag(page, s, { x: s.x, y: s.y + 400 })
  const b = await rect(box)
  const view = page.viewportSize()!
  expect(b.height).toBeGreaterThan(300)
  expect(b.y + b.height).toBeGreaterThan(view.height * 0.6)
  await expect(sheet).toBeVisible()
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
    test(`B10-3 pictures: ${name} ${tname}`, async ({ page }, info) => {
      const box = await phoneBox(page, 'B103p', ['Alpha beta', 'Gamma'], {
        tall: true,
        low: true,
      })
      const s = await centre(dot(box, 's'))
      await drag(page, s, { x: s.x, y: s.y - 40 })
      if (name !== 'phone') await page.setViewportSize(size)
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      await page.waitForTimeout(500)
      const out = `screenshots/b10-3/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-3 Phone box resize (dots)\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
