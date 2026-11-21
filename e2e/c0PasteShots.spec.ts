// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { caretAtEnd, openV8, stubClipboard } from './c0Clipboard.ts'

/**
 * First-look pictures of the hint line next to Paste (C0-4, C0-6): Safari's
 * bubble is waiting. Light and dark; iPad upright and sideways; phone. A
 * picture maker: it writes screenshots/c0-paste/<project>/ and an index.
 */
const SIZES = {
  'ipad-sideways': { width: 1180, height: 820 },
  'ipad-upright': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const

const taken: string[] = []

for (const [name, size] of Object.entries(SIZES))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`C0-4 pictures: ${name} ${tname}`, async ({ page }, info) => {
      await page.setViewportSize(size)
      await stubClipboard(page, 'pending')
      await openV8(page, 'pencil')
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme,
      )
      await caretAtEnd(page)
      const btn = page.getByTestId('top-paste').locator('[data-action="paste"]')
      await btn.scrollIntoViewIfNeeded()
      await btn.click()
      await expect(page.getByTestId('paste-ask-hint')).toBeVisible()
      const out = `screenshots/c0-paste/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# C0 Paste hint line (Safari's bubble waiting)\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
