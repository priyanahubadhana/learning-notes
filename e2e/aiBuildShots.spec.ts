/// <reference lib="dom" />
import { test, type Page } from '@playwright/test'

/**
 * Pictures of the Build screen (flag ai.framework) for gate 3, slice 9b:
 * SHOTS=1 PHASE=before|after. Light, dark and sepia; phone, iPad landscape, PC.
 * The states (plan with steps, cost step, running, finished, error, Activity)
 * are shot only in the "after" phase. Not a test of behaviour.
 */
test.skip(!process.env.SHOTS, 'pictures only on request')
const PHASE = process.env.PHASE ?? 'after'
const OUT = 'screenshots/gate3-9b'
const SIZES = {
  phone: { width: 390, height: 844, touch: true },
  ipad: { width: 1194, height: 834, touch: true },
  pc: { width: 1336, height: 800, touch: false },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const

const PLAN = JSON.stringify({
  steps: [
    {
      id: 's1',
      tool: 'notebooks.create',
      toolVersion: 1,
      args: { title: 'Habits' },
      placement: { in: '$destination' },
    },
    {
      id: 's2',
      tool: 'pages.write_notes',
      toolVersion: 1,
      args: { notebookId: { $from: 's1.notebookId' }, brief: 'Notes' },
      dependsOn: ['s1'],
    },
  ],
})
const PAGE_ANSWER = JSON.stringify({
  page: {
    title: 'Habits',
    summary: 'Short.',
    blocks: [{ type: 'paragraph', text: 'Hello.' }],
  },
})

async function snap(page: Page, name: string) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PHASE}-${name}.png` })
}

for (const [dev, size] of Object.entries(SIZES))
  for (const [tn, theme] of Object.entries(THEMES))
    test(`shots ${dev} ${tn}`, async ({ browser }) => {
      const level = dev === 'pc' ? 'professional' : 'beginner'
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        hasTouch: size.touch,
        isMobile: dev === 'phone',
        storageState: {
          cookies: [],
          origins: [
            {
              origin: new URL(`http://localhost:${process.env.PW_PORT}`).origin,
              localStorage: [
                { name: 'learning-notes:devicePicker.done', value: 'true' },
                { name: 'learning-notes:onboarding.done', value: 'true' },
                { name: 'learning-notes:accountGate.off', value: '1' },
                { name: 'learning-notes:theme', value: JSON.stringify(theme) },
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
      await page.goto('/?flags=ai.framework#/settings/ai')
      await page.getByTestId('aifw-open').click()
      await page.getByTestId('aifw-build').waitFor()
      await snap(page, `build-${dev}-${tn}`)
      if (PHASE === 'before') return context.close()

      // Plan with steps.
      await page.getByTestId('aifw-dest-name').fill('Habits')
      await page.getByTestId('aifw-pick-pages.write_notes').click()
      await page.getByTestId('aifw-pick-cards.make_recall').click()
      await snap(page, `plan-steps-${dev}-${tn}`)
      // Goal plan ready with the cost / consent lines.
      await page.getByTestId('aifw-goal-text').fill('Notes and cards on habits')
      await page.getByTestId('aifw-goal-make').click()
      await snap(page, `goal-ask-${dev}-${tn}`)
      await page.getByTestId('aifw-goal-answer').fill(PLAN)
      await page.getByTestId('aifw-goal-check').click()
      await page.getByTestId('aifw-goal-cost').waitFor()
      await page.waitForTimeout(3500)
      await snap(page, `goal-cost-${dev}-${tn}`)
      // Running, error, finished.
      await page.getByTestId('aifw-goal-run').click()
      await page.getByTestId('aifw-paste').waitFor()
      await snap(page, `running-${dev}-${tn}`)
      await page.getByTestId('aifw-answer').fill('this is not json')
      await page.getByTestId('aifw-submit').click()
      await page.getByTestId('aifw-paste-problems').waitFor()
      await snap(page, `error-${dev}-${tn}`)
      await page.getByTestId('aifw-answer').fill(PAGE_ANSWER)
      await page.getByTestId('aifw-submit').click()
      await page.getByTestId('aifw-preview').waitFor()
      await snap(page, `preview-${dev}-${tn}`)
      await page.getByTestId('aifw-apply').click()
      await page.getByTestId('aifw-done').waitFor()
      await snap(page, `finished-${dev}-${tn}`)
      await page.getByTestId('aifw-tab-activity').click()
      await snap(page, `activity-${dev}-${tn}`)
      await context.close()
    })
