import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1200, height: 900 } })

test('cost currency: default rupee at 90, pick euro, edit its rate, usage follows, reload keeps it', async ({
  page,
}) => {
  await page.goto('/#/settings/ai')
  await expect(page.getByTestId('cost-currency')).toBeVisible()
  await expect(page.getByTestId('cost-currency-now')).toContainText('INR')
  await expect(page.getByTestId('cost-currency-rate')).toHaveValue('90')
  await expect(page.getByTestId('ai-use-total')).toContainText('₹')

  await page.getByTestId('cost-currency-search').fill('euro')
  await page.getByTestId('cost-currency-EUR').click()
  await expect(page.getByTestId('cost-currency-now')).toContainText('EUR')
  await expect(page.getByTestId('cost-currency-rate')).toHaveValue('1')
  await expect(page.getByTestId('ai-use-total')).toContainText('€')

  await page.getByTestId('cost-currency-rate').fill('0.92')
  await expect(page.getByTestId('cost-currency-changed')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('cost-currency-now')).toContainText('EUR')
  await expect(page.getByTestId('cost-currency-rate')).toHaveValue('0.92')
  await expect(page.getByTestId('ai-use-total')).toContainText('€')
})
