import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  cardRecordCount,
  typeInEditor,
  waitForSaved,
  openSidebar,
} from './helpers.ts'

/**
 * Pictures of Review v2 for gate 3: Beginner / Professional x Day / Night /
 * Sepia x iPad landscape / iPad portrait / phone / PC. States: home, front,
 * back, waiting, done, nothing due, and (own run) no cards.
 * Only with SHOTS=1 (`SHOTS=1 npx playwright test reviewV2Shots`).
 */
const OUT = 'docs/mockups/review-v2-build-shots'
const SIZES = {
  'ipad-landscape': { width: 1194, height: 834 },
  'ipad-portrait': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  pc: { width: 1336, height: 720 },
} as const
const ONLY_SIZE = process.env.SHOT_SIZE

test.skip(!process.env.SHOTS, 'pictures only on request')

async function seed(page: Page, n: number) {
  await page.goto('/?flags=review.v2')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  for (let i = 1; i <= n; i++) {
    const question = `What causes heart sound ${i}?`
    if (i === 1) await typeInEditor(page, question)
    else {
      // Back out of the previous answer so it does not swallow the next question.
      await page.keyboard.press('Enter')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.type(question)
      await waitForSaved(page)
    }
    await page
      .locator('.bn-block-content', { hasText: question })
      .first()
      .hover()
    await page.locator('.bn-side-menu [draggable="true"]').click()
    await page.getByRole('menuitem', { name: 'Make card' }).click()
    await page.keyboard.type(`Because of valve ${i} closing`)
    await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(i)
  }
}

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['day', 'night', 'sepia'] as const)
    for (const [name, viewport] of Object.entries(SIZES)) {
      if (ONLY_SIZE && ONLY_SIZE !== name) continue
      test(`shot ${level} ${theme} ${name}`, async ({ browser }) => {
        test.setTimeout(120_000)
        const base =
          process.env.PW_BASE ?? `http://localhost:${process.env.PW_PORT}`
        const phone = name === 'phone'
        const open = () =>
          browser.newContext({
            viewport,
            hasTouch: name !== 'pc',
            isMobile: phone,
            storageState: {
              cookies: [],
              origins: [
                {
                  origin: new URL(base).origin,
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
        let context = await open()
        let page = await context.newPage()
        await page.clock.install()
        // No hover in the pictures: the pointer rests in a blank corner.
        const shot = async (state: string) => {
          await page.mouse.move(viewport.width - 2, viewport.height - 2)
          await page.waitForTimeout(250)
          await page.screenshot({
            path: `${OUT}/${level}-${theme}-${name}-${state}.png`,
          })
        }
        const pause = () => page.waitForTimeout(500)

        // A notebook with no cards yet: Review home with its empty state.
        await page.goto('/?flags=review.v2')
        await createNotebook(page, 'Cardiology', 'Heart sounds')
        if (phone) {
          await (
            await openSidebar(page)
          )
            .getByRole('button', { name: /^Review(?! this)/ })
            .click()
          await page.evaluate(() => (location.hash = '#/'))
        } else {
          await closeCorner(page)
          await page.locator('[data-space="review"]').click()
        }
        await expect(page.getByTestId('rv2-no-cards')).toBeVisible()
        await pause()
        await shot('no-cards')
        await context.close()
        context = await open()
        page = await context.newPage()
        await page.clock.install()

        await seed(page, 2)
        if (phone) {
          await (
            await openSidebar(page)
          )
            .getByRole('button', { name: /^Review(?! this)/ })
            .click()
          await expect(page.getByTestId('rv2-show')).toBeVisible()
          // Phone: the menu opens the session; the plain address is Review home.
          await page.evaluate(() => (location.hash = '#/'))
        } else {
          await closeCorner(page)
          await page.locator('[data-space="review"]').click()
        }
        await expect(page.getByTestId('rv2-start')).toBeVisible()
        await pause()
        await shot('home')

        await page.getByTestId('rv2-start').click()
        await expect(page.getByTestId('rv2-show')).toBeVisible()
        await pause()
        await shot('front')
        await page.getByTestId('rv2-show').click()
        await expect(page.getByTestId('rv2-rates')).toBeVisible()
        await page.waitForTimeout(700)
        await shot('back')
        await page.getByRole('button', { name: /^Easy/ }).click()
        await expect(page.getByTestId('rv2-show')).toBeVisible()
        await page.getByTestId('rv2-show').click()
        await page.getByRole('button', { name: /^Again/ }).click()
        await expect(page.getByTestId('rv2-waiting')).toBeVisible()
        await pause()
        await shot('waiting')
        await page.clock.fastForward(30 * 60_000)
        await expect(page.getByTestId('rv2-show')).toBeVisible()
        await page.getByTestId('rv2-show').click()
        await page.getByRole('button', { name: /^Easy/ }).click()
        await expect(page.getByTestId('rv2-done')).toBeVisible()
        await pause()
        await shot('done')
        await page.getByTestId('rv2-close').click()
        await expect(page.getByTestId('rv2-nothing')).toBeVisible()
        await pause()
        await shot('nothing-due')
        await context.close()
      })
    }
