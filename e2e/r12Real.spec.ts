/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, startInTheme } from './helpers.ts'
import { openById, openPanel, seedNotebook } from './notebooksV2PanelHelpers.ts'

/**
 * R12 on the real surfaces (foundation.shell ON): the tool bar's ⋯ menu, the
 * Pages panel, the Box card, the Settings ▾ sheet, the colour card and the
 * phone ⋯ tray, in light and dark. Each one that scrolls and paints a solid
 * background must have no mask on it; the picture of each goes to
 * docs/mockups/r12-shots/ (index.md there).
 */
test.use({ hasTouch: true })

const SHOTS = 'docs/mockups/r12-shots'
const V8 = 'foundation.shell,toolbar.v8,toolbar.menu,textbox.v2'
const PHONE = { width: 390, height: 844 }

type Surface = {
  name: string
  phone?: boolean
  open: (page: Page) => Promise<void>
  root: string
}

async function inApp(page: Page, flags: string) {
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${flags}`)
  await createNotebook(page, 'Biology', 'First')
}

const surfaces: Surface[] = [
  {
    name: 'toolbar-more-menu',
    root: '[data-testid="v8-card-fold.bar"]',
    open: async (page) => {
      await inApp(page, V8)
      await page.locator('[data-testid="v8-more"]').click()
    },
  },
  {
    name: 'pages-panel',
    root: '[data-testid="left-panel"]',
    open: async (page) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'learning-notes:flags',
          '["foundation.shell","notebooks.v2"]',
        ),
      )
      await page.goto('/?flags=notebooks.v2')
      const pages = Array.from({ length: 14 }, (_, i) => ({
        title: `Page ${String(i + 2).padStart(2, '0')}`,
        lines: ['line'],
      }))
      const ids = await seedNotebook(page, 'Panel book', 'Page 01', pages)
      await openById(page, ids['Page 01'])
      await openPanel(page)
    },
  },
  {
    name: 'box-card',
    root: '[data-testid="v8-card-text.boxset"]',
    open: async (page) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: 'professional', unlocked: [] }),
        ),
      )
      await inApp(page, V8)
      await page.locator('.bn-editor').first().click()
      await page.locator('[data-testid="v8-tool-text"]').click()
      const chip = page.locator('[data-testid="v8-chip-text.boxset"]')
      if (await chip.isVisible()) await chip.click()
      else {
        await page.getByTestId('v8-row-more').click()
        await page.getByTestId('v8-fold-boxset').click()
      }
    },
  },
  {
    name: 'colour-card',
    root: '[data-testid="v8-card-shapes.colour"]',
    open: async (page) => {
      await inApp(page, V8)
      // Shapes sits in the ⋯ tray when the bar is short (2A.15 "all tools in the tray").
      const shapes = page.locator('[data-testid="v8-tool-shapes"]')
      if (await shapes.isVisible()) await shapes.click()
      else {
        await page.getByTestId('v8-more').click()
        await page
          .getByRole('dialog', { name: 'More' })
          .getByRole('button', { name: 'Shapes' })
          .click()
      }
      await page.locator('[data-testid="v8-chip-shapes.colour"]').click()
    },
  },
  {
    name: 'settings-sheet',
    phone: true,
    root: '[data-preview-sheet]',
    open: async (page) => {
      await page.goto('/?flags=foundation.shell,settings.v3#/settings/general')
      await page.locator('[data-preview-pill]').tap()
    },
  },
  {
    name: 'phone-more-tray',
    phone: true,
    root: '[data-bar="tray"]',
    open: async (page) => {
      await inApp(page, 'foundation.shell')
      await page.locator('[data-action="toolbarMenu"]').click()
    },
  },
]

/** Every box that scrolls up and down, with a solid background, and its mask. */
const solidScrollers = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((e) => {
        const cs = getComputedStyle(e)
        return (
          (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
          e.scrollHeight - e.clientHeight > 1 &&
          e.tagName !== 'MAIN' &&
          !/, 0\)$|^transparent$/.test(cs.backgroundColor) &&
          !/, 0\.\d+\)$/.test(cs.backgroundColor)
        )
      })
      .map((e) => {
        const cs = getComputedStyle(e)
        return {
          what: `${e.tagName}.${(e.getAttribute('class') ?? '').slice(0, 40)}`,
          mask: cs.maskImage || cs.webkitMaskImage || 'none',
        }
      }),
  )

for (const theme of ['day', 'night'] as const)
  for (const s of surfaces)
    test(`R12 real: ${s.name} (${theme}) is solid and takes a picture`, async ({
      page,
    }) => {
      await page.setViewportSize(s.phone ? PHONE : { width: 820, height: 480 })
      await startInTheme(page, theme)
      await s.open(page)
      await expect(page.locator(s.root)).toBeVisible()
      await page.waitForTimeout(900)
      await page.locator(s.root).dispatchEvent('pointerdown') // the hints look at a touched list
      await page.waitForTimeout(500)
      for (const l of await solidScrollers(page))
        expect(
          l.mask === 'none' || l.mask === '',
          `${s.name}: ${l.what} is masked (${l.mask})`,
        ).toBe(true)
      await page.screenshot({
        path: `${SHOTS}/${s.name}-${theme}-${s.phone ? 'phone' : 'ipad-short'}.png`,
      })
    })
