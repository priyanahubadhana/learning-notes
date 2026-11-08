// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Browser, type Page } from '@playwright/test'
import { openPage, pageAction } from './helpers.ts'
import { device, lines, makeServer, setupA, setupB } from './syncMock.ts'

/**
 * Two devices type in the same line at the same moment (before either hears
 * of the other). They must agree on their own, both keep the other version
 * in History, and both show the "Changed on two devices" bar until a choice
 * is made (which syncs).
 */

test.use({ viewport: { width: 1200, height: 800 } })

const bar = (p: Page) => p.getByTestId('clash-bar')

async function clash(browser: Browser) {
  const { serve, pages, gate } = makeServer()
  const a = await device(browser, serve, pages)
  await setupA(a, ['hello world'])
  const b = await device(browser, serve, pages)
  await setupB(b)
  await a.goto('/')
  await openPage(a, 'Shared')
  for (const p of [a, b]) {
    await p.locator('.bn-editor .bn-block-content').nth(0).click()
    await p.keyboard.press('End')
  }
  gate.close()
  await Promise.all([a.keyboard.type(' AAA'), b.keyboard.type(' BBB')])
  await a.waitForTimeout(1200) // both saved here, nothing sent yet
  gate.open()
  // They agree without a reload, and the bar shows on both.
  await expect
    .poll(async () => (await lines(a))[0] === (await lines(b))[0], {
      timeout: 20_000,
    })
    .toBe(true)
  await expect(bar(a)).toBeVisible({ timeout: 20_000 })
  await expect(bar(b)).toBeVisible({ timeout: 20_000 })
  const text = (await lines(a))[0]
  expect(text === 'hello world AAA' || text === 'hello world BBB').toBe(true)
  const other = text.endsWith('AAA') ? 'BBB' : 'AAA'
  await expect(bar(a)).toContainText(other)
  return { a, b, text, other }
}

test('simultaneous typing converges live and shows the bar on both', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const { a, b, text, other } = await clash(browser)
  expect(await lines(b)).toEqual([text])
  // Page History keeps the other version on both devices.
  for (const p of [a, b]) {
    await pageAction(p, 'History')
    const dialog = p.getByRole('dialog', { name: 'Page history' })
    let found = false
    const items = dialog.getByRole('listitem')
    await expect(items.first()).toBeVisible()
    for (let i = 0; i < (await items.count()) && !found; i++) {
      await items.nth(i).getByRole('button').click()
      found = await dialog
        .getByText(`hello world ${other}`)
        .first()
        .waitFor({ timeout: 1500 })
        .then(
          () => true,
          () => false,
        )
    }
    expect(found, `History on ${p === a ? 'A' : 'B'}`).toBe(true)
    await dialog.getByRole('button', { name: 'Close' }).click()
  }
})

test('Keep mine clears the bar on both devices', async ({ browser }) => {
  test.setTimeout(120_000)
  const { a, b, text } = await clash(browser)
  await bar(a).getByRole('button', { name: 'Keep mine' }).click()
  await expect(bar(a)).toBeHidden()
  await expect(bar(b)).toBeHidden({ timeout: 20_000 })
  expect(await lines(a)).toEqual([text])
  expect(await lines(b)).toEqual([text])
})

test('Use other swaps the text on both devices; Undo takes it back', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const { a, b, text, other } = await clash(browser)
  await bar(b).getByRole('button', { name: 'Use other' }).click()
  const swapped = `hello world ${other}`
  await expect(bar(b)).toBeHidden()
  await expect(bar(a)).toBeHidden({ timeout: 20_000 })
  await expect.poll(() => lines(a), { timeout: 20_000 }).toEqual([swapped])
  expect(await lines(b)).toEqual([swapped])
  await b.locator('.bn-editor .bn-block-content').nth(0).click()
  await b.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => lines(b)).toEqual([text])
  await expect.poll(() => lines(a), { timeout: 20_000 }).toEqual([text])
})

test('Keep both inserts the other version below, on both devices', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const { a, b, text, other } = await clash(browser)
  await bar(a).getByRole('button', { name: 'Keep both' }).click()
  const both = [text, `hello world ${other}`]
  await expect(bar(a)).toBeHidden()
  await expect(bar(b)).toBeHidden({ timeout: 20_000 })
  await expect.poll(() => lines(a)).toEqual(both)
  await expect.poll(() => lines(b), { timeout: 20_000 }).toEqual(both)
})
