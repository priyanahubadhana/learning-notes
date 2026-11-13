/// <reference lib="dom" />
import { test, type Page } from '@playwright/test'

/**
 * Pictures of the Studio and Workflows screens (flag ai.framework) for gate 3,
 * slice 9 part 6: SHOTS=1. Light, dark and sepia; Beginner and Professional;
 * phone, iPad landscape, iPad portrait, PC. Real data (workflows saved through
 * Studio), toasts closed. Not a test of behaviour.
 */
test.skip(!process.env.SHOTS, 'pictures only on request')
const OUT = process.env.SHOTS_OUT ?? 'screenshots/gate3-9-6'
const SIZES = {
  phone: { width: 390, height: 844, touch: true },
  'ipad-landscape': { width: 1194, height: 834, touch: true },
  'ipad-portrait': { width: 820, height: 1180, touch: true },
  pc: { width: 1336, height: 800, touch: false },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const
const LEVELS = ['beginner', 'professional'] as const

async function snap(page: Page, name: string) {
  await page
    .getByTestId('aifw-toast')
    .waitFor({ state: 'detached' })
    .catch(() => undefined)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

for (const [dev, size] of Object.entries(SIZES))
  for (const [tn, theme] of Object.entries(THEMES))
    for (const level of LEVELS)
      test(`shots ${dev} ${tn} ${level}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          hasTouch: size.touch,
          isMobile: dev === 'phone',
          storageState: {
            cookies: [],
            origins: [
              {
                origin: new URL(`http://localhost:${process.env.PW_PORT}`)
                  .origin,
                localStorage: [
                  { name: 'learning-notes:devicePicker.done', value: 'true' },
                  { name: 'learning-notes:onboarding.done', value: 'true' },
                  { name: 'learning-notes:accountGate.off', value: '1' },
                  {
                    name: 'learning-notes:theme',
                    value: JSON.stringify(theme),
                  },
                  {
                    name: 'learning-notes:level',
                    value: JSON.stringify({ level, unlocked: [] }),
                  },
                ],
              },
            ],
          },
        })
        const page = await context.newPage()
        const tag = `${dev}-${tn}-${level}`
        await page.goto('/?flags=ai.framework#/settings/ai')
        await page.getByTestId('aifw-open').click()
        await page.getByTestId('aifw-tab-studio').click()
        await page.getByTestId('aifw-studio').waitFor()
        await snap(page, `studio-empty-${tag}`)

        // Tick, place, undo: the plan with "Where it goes" and Undo/Redo.
        await page.getByTestId('aifw-tile-notes').click()
        await page.getByTestId('aifw-tile-map').click()
        await page.getByTestId('aifw-tile-cards').click()
        await page.getByTestId('aifw-dest-name').fill('Habits that stick')
        await page.getByTestId('aifw-tile-cloze').click()
        await page.getByTestId('aifw-studio-undo').click()
        await snap(page, `studio-plan-${tag}`)

        // Save three real workflows, rate and type them.
        const make = async (name: string, tile: string) => {
          await page.getByTestId('aifw-tab-studio').click()
          await page.getByTestId(`aifw-tile-${tile}`).click()
          await page.getByTestId('aifw-dest-name').fill(name)
          await page.getByTestId('aifw-studio-save').click()
        }
        // Clear the ticks above first: a fresh Studio state keeps them, so untick.
        for (const id of ['notes', 'map', 'cards'])
          await page.getByTestId(`aifw-tile-${id}`).click()
        await make('Podcast to notes', 'notes')
        await page.getByTestId('aifw-tile-notes').click()
        await make('Book to cards', 'cards')
        await page.getByTestId('aifw-tile-cards').click()
        await make('Video to mind map', 'map')
        await page.getByTestId('aifw-tab-workflows').click()
        const rate = page.getByTestId('aifw-wf-rate')
        await rate.nth(0).selectOption('3')
        await rate.nth(1).selectOption('5')
        await rate.nth(2).selectOption('4')
        await snap(page, `workflows-list-${tag}`)

        await page.getByTestId('aifw-wf-more').click()
        await page.getByTestId('aifw-wf-minrating').selectOption('4')
        await page.getByTestId('aifw-wf-view-save').click()
        await page.getByTestId('aifw-wf-view-name').fill('Best ones')
        await snap(page, `workflows-naming-${tag}`)
        await page.getByTestId('aifw-wf-view-ok').click()
        await snap(page, `workflows-view-${tag}`)
        await context.close()
      })
