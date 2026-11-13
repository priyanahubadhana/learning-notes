import { test, type Page } from '@playwright/test'
import {
  openById,
  panel,
  row,
  seedNotebook,
  tabButton,
} from './notebooksV2PanelHelpers.ts'

/**
 * Pictures of the left panel for the slice-4 gate (run on purpose:
 * `SHOTS=1 npx playwright test e2e/notebooksV2PanelShots.spec.ts`).
 * Beginner / Professional x Day / Night x iPad landscape / phone, flag
 * notebooks.v2 forced ON. Pictures go to
 * docs/mockups/notebooks-search-build-shots/panel-*.png.
 */
const OUT = 'docs/mockups/notebooks-search-build-shots'
const SIZES = {
  ipad: { width: 1194, height: 834 },
  phone: { width: 390, height: 844 },
} as const

test.use({ hasTouch: true })
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')

const text = (s: string) => [{ type: 'text', text: s, styles: {} }]

async function shown(page: Page) {
  const toggle = page.getByTestId('panel-toggle')
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.tap()
  await panel(page).waitFor()
  await panel(page).evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  )
  await page.waitForTimeout(500)
}

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night'] as const)
    for (const [size, viewport] of Object.entries(SIZES)) {
      test(`panel shots ${level} ${theme} ${size}`, async ({ page }) => {
        test.setTimeout(180_000)
        await page.setViewportSize({ width: 1336, height: 720 })
        await page.addInitScript(
          ([l, th]) => {
            try {
              if (!sessionStorage.getItem('shots-set')) {
                sessionStorage.setItem('shots-set', '1')
                localStorage.setItem(
                  'learning-notes:level',
                  JSON.stringify({ level: l, unlocked: [] }),
                )
                localStorage.setItem('learning-notes:theme', JSON.stringify(th))
              }
            } catch {
              /* storage blocked */
            }
          },
          [level, theme] as const,
        )
        await page.goto('/?flags=notebooks.v2')
        const ids = await seedNotebook(page, 'Biology', 'Welcome', [
          {
            title: 'Cells and membranes',
            lines: [
              'Every living thing is made of cells.',
              'A membrane keeps the inside apart from the outside.',
              'Pores let small things pass.',
            ],
            heads: [
              [1, 'Cells'],
              [2, 'Membrane'],
              [3, 'Pores'],
              [1, 'Energy'],
            ],
            blocks: [
              {
                type: 'embed',
                content: {
                  url: 'https://example.org/cells',
                  provider: 'link',
                  caption: 'Cell atlas',
                },
              },
              {
                type: 'callout',
                content: {
                  text: text('Mnemonic: PMAT for mitosis'),
                  emoji: '💡',
                },
              },
              {
                type: 'quote',
                content: { text: text('Hooke (1665) Micrographia') },
              },
            ],
          },
          {
            title: 'Cell sub-page',
            parent: 'Cells and membranes',
            lines: ['Nucleus'],
          },
          {
            title: 'Genetics',
            lines: [
              'DNA carries the instructions.',
              'Genes are short stretches.',
            ],
            heads: [[1, 'DNA']],
          },
          { title: 'Ecology', lines: ['Food webs.'], locked: true },
          { title: 'A rather long page name that wraps onto a second line' },
        ])
        await page.setViewportSize(viewport)
        await openById(page, ids['Cells and membranes'])
        await shown(page)
        const name = (kind: string) =>
          `${OUT}/panel-${kind}-${level}-${theme}-${size}.png`
        await page.screenshot({ path: name('pages') })
        // Organise with one page picked: the Object bar.
        await panel(page).getByTestId('lpv2-organise').tap()
        await row(page, 'Genetics').tap()
        await page.waitForTimeout(400)
        await page.screenshot({ path: name('organise') })
        await panel(page).getByTestId('lpv2-organise').tap()
        // The Context strip on a held thumbnail (right-click shows the same).
        await row(page, 'Genetics').click({ button: 'right' })
        await page.getByTestId('lpv2-strip').waitFor()
        await page.waitForTimeout(400)
        await page.screenshot({ path: name('strip') })
        await page.keyboard.press('Escape')
        await tabButton(page, 'Outline').tap()
        await page.waitForTimeout(700)
        await page.screenshot({ path: name('outline') })
        await tabButton(page, 'Resources').tap()
        await page.waitForTimeout(500)
        await panel(page)
          .getByTestId('lpv2-scope')
          .getByRole('button', { name: 'Notebook' })
          .tap()
        await page.waitForTimeout(500)
        await page.screenshot({ path: name('resources') })
      })
    }
