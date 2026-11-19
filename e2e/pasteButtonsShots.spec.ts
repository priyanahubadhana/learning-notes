// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * First-look pictures of Paste ▾ in the Pencil buttons (flag page.menus ON):
 * Pencil and Touch mode, light and dark, iPad sideways; the ▾ menu and More;
 * the hold bar; the phone. Written to screenshots/paste-buttons/<project>/
 * (it is a picture maker, it checks nothing).
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const HTML = '<p><b>bold</b> and <i>rich</i> words</p>'
const TEXT = 'bold and rich words'

async function show(
  page: Page,
  mode: 'touch' | 'pencil',
  theme: string,
  keys: Record<string, unknown> = {},
) {
  await page.addInitScript(
    ([html, text]) => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          read: async () => [
            {
              types: ['text/html', 'text/plain'],
              getType: async (type: string) =>
                new Blob([type === 'text/html' ? html : text], { type }),
            },
          ],
          readText: async () => text,
        },
        configurable: true,
      })
    },
    [HTML, TEXT] as const,
  )
  await openNote(page, mode, {
    flags: ['page.menus', 'foundation.shell'],
    'advanced.holdMenu': 600,
    ...keys,
  })
  await page.evaluate(
    (th) => document.documentElement.setAttribute('data-theme', th),
    theme,
  )
  await tool(page, 'Text').click()
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('End')
  await page.waitForTimeout(500)
}

for (const mode of ['pencil', 'touch'] as const)
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`paste pictures: ${mode} ${tname}`, async ({ page }, info) => {
      const out = `screenshots/paste-buttons/${info.project.name}`
      mkdirSync(out, { recursive: true })
      await show(page, mode, theme)
      await page.screenshot({ path: `${out}/1-${mode}-row-${tname}.png` })
      await page.locator('[data-action="pasteMore"]').click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${out}/2-${mode}-menu-${tname}.png` })
      await page.locator('[data-paste-option="more"]').click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${out}/3-${mode}-more-${tname}.png` })
    })

test('paste pictures: touch with the floating bar', async ({ page }, info) => {
  const out = `screenshots/paste-buttons/${info.project.name}`
  mkdirSync(out, { recursive: true })
  await show(page, 'touch', 'day', { 'toolbar.miniKeys': true })
  await page.screenshot({ path: `${out}/4-touch-floating-light.png` })
})

test('paste pictures: the hold bar on an empty spot', async ({
  page,
}, info) => {
  const out = `screenshots/paste-buttons/${info.project.name}`
  mkdirSync(out, { recursive: true })
  await show(page, 'touch', 'day')
  await page.waitForTimeout(3300)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.evaluate(() => {
    const r = document
      .querySelector('.bn-block-content')!
      .getBoundingClientRect()
    const x = r.right - 24
    const y = r.top + r.height / 2
    document.elementFromPoint(x, y)!.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 71,
        clientX: x,
        clientY: y,
        bubbles: true,
        isPrimary: true,
        buttons: 1,
      }),
    )
  })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/5-hold-bar-light.png` })
})

test('paste pictures: iPad upright and phone', async ({ page }, info) => {
  const out = `screenshots/paste-buttons/${info.project.name}`
  mkdirSync(out, { recursive: true })
  await page.setViewportSize({ width: 834, height: 1194 })
  await show(page, 'pencil', 'day')
  await page.screenshot({ path: `${out}/6-pencil-upright-light.png` })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/7-pencil-phone-light.png` })
  await page.locator('[data-action="pasteMore"]').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/8-pencil-phone-menu-light.png` })
})
