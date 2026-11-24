// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import {
  closeSidebarIfNarrow,
  createNotebook,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/** First-look pictures for 2A.5 (only with SHOTS=1; not part of the suites). */
const OUT = process.env.SHOTS_OUT ?? 'docs/mockups/2a5-shots'
const sizes = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
}
test.skip(!process.env.SHOTS, 'pictures only on request')
test.use({ hasTouch: true })

async function run(
  page: Page,
  theme: 'day' | 'night',
  level: 'beginner' | 'professional',
  size: keyof typeof sizes,
) {
  await page.setViewportSize(sizes[size])
  await page.addInitScript(
    (l) =>
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: [] }),
      ),
    level,
  )
  await startInTheme(page, theme)
  await startInMode(page, 'touch')
  await page.goto(
    '/?flags=foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2',
  )
  await createNotebook(page, 'Biology', 'First')
  await closeSidebarIfNarrow(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
  const base = `${OUT}/${theme}-${level}-${size}`
  const shot = async (n: string) => {
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${base}-${n}.png` })
  }
  await shot('bar')
  if (await page.getByTestId('v8-chip-pen.type').isVisible()) {
    await page.getByTestId('v8-chip-pen.type').click()
    await shot('type')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  if (await page.getByTestId('v8-chip-pen.size').isVisible()) {
    await page.getByTestId('v8-chip-pen.size').click()
    await shot('size')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  if (await page.getByTestId('v8-chip-pen.colour').isVisible()) {
    await page.getByTestId('v8-chip-pen.colour').click()
    await shot('colour')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  if (await page.getByTestId('v8-chip-pen.feel').isVisible()) {
    await page.getByTestId('v8-chip-pen.feel').click()
    await shot('feel')
  }
  const card = page.getByTestId('v8-card-pen.feel')
  if (!(await card.isVisible())) {
    const more = page.getByTestId('v8-row-more')
    if (await more.isVisible()) {
      await more.click({ timeout: 2000 }).catch(() => {})
      await shot('more')
    }
    return
  }
  for (const tab of ['Aids', 'Page']) {
    const t = card.getByRole('tab', { name: tab })
    if (await t.count()) {
      await t.click()
      await shot(tab.toLowerCase())
    }
  }
}

mkdirSync(OUT, { recursive: true })
const names: string[] = []
for (const theme of ['night', 'day'] as const)
  for (const level of ['beginner', 'professional'] as const)
    for (const size of Object.keys(sizes) as (keyof typeof sizes)[]) {
      const n = `${theme} ${level} ${size}`
      names.push(n)
      test(`2A.5 picture ${n}`, async ({ page }) => {
        await run(page, theme, level, size)
        const html = await page.evaluate(
          () => document.documentElement.dataset.theme,
        )
        writeFileSync(`${OUT}/${theme}-${level}-${size}.theme.txt`, `${html}\n`)
      })
    }
