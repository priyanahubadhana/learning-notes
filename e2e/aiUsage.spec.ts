// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** AI page order, AI-off card, Usage and cost, Connections (9 Nov 2026). */

test.use({ viewport: { width: 1200, height: 900 } })

async function seed(page: Page, enabled: boolean) {
  await page.goto('/')
  await page.evaluate((on) => {
    const now = Date.now()
    localStorage.setItem(
      'learning-notes:ai.keys',
      JSON.stringify([
        {
          id: 'k1',
          provider: 'anthropic',
          name: 'Claude main',
          key: 'sk-ant-test-1234567890',
        },
      ]),
    )
    localStorage.setItem('learning-notes:ai.enabled', JSON.stringify(on))
    localStorage.setItem(
      'learning-notes:ai.sendLog',
      JSON.stringify([
        {
          at: now,
          feature: 'askBook',
          host: 'api.anthropic.com',
          keyId: 'k1',
          model: 'claude-sonnet-5-5',
          inputTokens: 1200,
          outputTokens: 300,
          costUsd: 0.5,
        },
        {
          at: now - 1000,
          feature: 'cleanup',
          host: 'api.anthropic.com',
          keyId: 'k1',
          model: 'claude-sonnet-5-5',
          inputTokens: 100,
          outputTokens: 50,
          costUsd: 0.1,
        },
      ]),
    )
  }, enabled)
}

test('AI off: calm card with Turn on AI that works in place', async ({
  page,
}) => {
  await seed(page, false)
  await page.goto('/#/settings/ai')
  const card = page.getByTestId('ai-off-card')
  await expect(card).toContainText('AI is off')
  await card.getByTestId('ai-off-turn-on').click()
  await expect(page.getByTestId('ai-enable')).toBeChecked()
  await expect(card).toHaveCount(0)
})

test('usage and cost: total, bar, by feature, recent calls, CSV without content', async ({
  page,
}) => {
  await seed(page, true)
  await page.goto('/#/settings/ai')
  const total = page.getByTestId('ai-use-total')
  await expect(total).toContainText('This month')
  await expect(total).toContainText('₹54')
  await expect(page.getByTestId('ai-use-bar')).toBeVisible()
  await expect(page.getByTestId('ai-use-byFeature')).toContainText(
    'Ask this book',
  )
  await expect(page.getByTestId('ai-use-byFeature')).toContainText(
    'Clean up with AI',
  )
  await expect(page.getByTestId('ai-use-recent')).toContainText('1200')
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('ai-use-csv').click(),
  ])
  const path = await dl.path()
  const csv = (await import('node:fs')).readFileSync(path, 'utf8')
  expect(csv).toContain(
    'time_utc,feature,model,key,notebook,tokens_in,tokens_out,cost_INR',
  )
  expect(csv).toContain('Claude main')
  expect(csv).not.toContain('sk-ant')
})

test('monthly limit is typed in the chosen currency and kept in dollars', async ({
  page,
}) => {
  await seed(page, true)
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-cap').fill('450')
  const cap = await page.evaluate(() =>
    localStorage.getItem('learning-notes:ai.cap'),
  )
  expect(Number(cap)).toBeCloseTo(5)
})

test('Connections lists the key, no placeholder, and leads to AI', async ({
  page,
}) => {
  await seed(page, true)
  await page.goto('/#/settings/apis')
  const sec = page.getByTestId('connections-section')
  await expect(sec).toContainText('Claude main')
  await expect(sec.getByTestId('conn-status')).toContainText('Ready to use')
  await expect(page.locator('body')).not.toContainText(
    'arrive in a later phase',
  )
  await expect(page.locator('body')).not.toContainText(
    'Nothing is connected yet',
  )
  await sec.getByTestId('conn-manage').click()
  await expect(page.getByTestId('ai-section')).toBeVisible()
  await page.getByTestId('ai-open-permissions').click()
  await expect(page.getByTestId('permissions-section')).toBeVisible()
})
