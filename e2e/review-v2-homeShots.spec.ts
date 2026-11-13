import { expect, test, type Page } from '@playwright/test'
import {
  closeCorner,
  createNotebook,
  makeCard,
  openSidebar,
} from './helpers.ts'

/**
 * Pictures of Review v2 slice 8b (Professional home and the More sheet) for
 * gate 3: Day / Night / Sepia x iPad landscape / iPad portrait / phone / PC.
 * Only with SHOTS=1 (`SHOTS=1 npx playwright test review-v2-homeShots`).
 */
const OUT = 'docs/mockups/review-v2-8b-shots'
const SIZES = {
  'ipad-landscape': { width: 1194, height: 834 },
  'ipad-portrait': { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  pc: { width: 1336, height: 720 },
} as const

test.skip(!process.env.SHOTS, 'pictures only on request')

async function goHome(page: Page, phone: boolean) {
  if (phone) {
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: /^Review(?! this)/ })
      .click()
    await expect(page.getByTestId('rv2-show')).toBeVisible()
    await page.evaluate(() => (location.hash = '#/'))
  } else {
    await closeCorner(page)
    await page.locator('[data-space="review"]').click()
  }
  await expect(page.getByTestId('rv2-start')).toBeVisible()
}

for (const theme of ['day', 'night', 'sepia'] as const)
  for (const [name, viewport] of Object.entries(SIZES)) {
    test(`shot 8b ${theme} ${name}`, async ({ browser }) => {
      test.setTimeout(120_000)
      const base =
        process.env.PW_BASE ?? `http://localhost:${process.env.PW_PORT}`
      const phone = name === 'phone'
      const context = await browser.newContext({
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
                  value: JSON.stringify({
                    level: 'professional',
                    unlocked: [],
                  }),
                },
              ],
            },
          ],
        },
      })
      const page = await context.newPage()
      await page.clock.install()
      await page.goto('/?flags=review.v2')
      await createNotebook(page, 'Cardiology', 'Heart sounds')
      for (let i = 1; i <= 2; i++) {
        if (i > 1) await page.keyboard.press('Enter')
        await makeCard(page, `What causes heart sound ${i}?`, i)
      }
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            const open = indexedDB.open('learning-notes')
            open.onsuccess = () => {
              const db = open.result
              const tx = db.transaction('decks', 'readwrite')
              ;['Heart', 'Lungs', 'Valves'].forEach((n, i) =>
                tx.objectStore('decks').add({
                  id: crypto.randomUUID(),
                  createdAt: 1,
                  updatedAt: 1,
                  deletedAt: null,
                  name: n,
                  order: String.fromCharCode(97 + i),
                  colour: ['#4f8a6b', '#4a74b8', '#b5793a'][i],
                  scope: { notebookIds: [], pageIds: [], withSubpages: true },
                  tagIds: [],
                  tagMode: 'any',
                  states: ['all'],
                }),
              )
              tx.oncomplete = () => {
                db.close()
                resolve()
              }
            }
          }),
      )
      await page.reload()
      await goHome(page, phone)
      const shot = async (state: string) => {
        await page.mouse.move(viewport.width - 2, viewport.height - 2)
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${OUT}/${theme}-${name}-${state}.png` })
      }
      await shot('home')
      await page.getByTestId('rv2-more').click()
      await expect(page.getByTestId('more-sheet')).toBeVisible()
      await shot('more')
      await context.close()
    })
  }
