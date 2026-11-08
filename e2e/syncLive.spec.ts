// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, openPage } from './helpers.ts'
import { PASS, device, lines, makeServer } from './syncMock.ts'

/**
 * Real-time sync (R6-13) with a mocked connector: two browser contexts (two
 * devices) share one in-memory "server" (syncMock.ts) and the test pings
 * every open page after each save, like Supabase Realtime. An edit on A
 * shows on B's open page without a reload, B's caret stays put, and B's own
 * typing reaches A the same way.
 */

test.use({ viewport: { width: 1200, height: 800 } })

test('an edit on A shows on B’s open page live; B’s caret and typing are kept', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const { serve, pages, state } = makeServer()

  // Device A: a page with two lines, then sync set up.
  const a = await device(browser, serve, pages)
  await a.goto('/')
  await createNotebook(a, 'Live NB', 'Shared')
  await a.locator('.bn-editor').click()
  await a.keyboard.type('first line')
  await a.keyboard.press('Enter')
  await a.keyboard.type('second line')
  await a.waitForTimeout(800)

  await a.goto('/#/settings/sync')
  const sa = a.getByTestId('sync-section')
  await sa.getByRole('button', { name: 'Sign in with Google' }).click()
  await sa.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sa.getByLabel('Type it again').fill(PASS)
  await sa.getByRole('button', { name: 'Lock my notes and start' }).click()
  const code = (
    await a.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  await sa
    .getByLabel(/last four letters/)
    .fill(code.replace(/-/g, '').slice(-4))
  await sa.getByRole('button', { name: 'I saved it' }).click()
  await expect(a.getByTestId('sync-status')).toContainText('Last synced')
  await expect(a.getByTestId('sync-live')).toContainText('Live')
  expect(JSON.stringify(state)).not.toContain('first line')

  // Device B: unlock, open the same page, put the caret at the end of line 2.
  const b = await device(browser, serve, pages)
  await b.goto('/#/settings/sync')
  const sb = b.getByTestId('sync-section')
  await sb.getByRole('button', { name: 'Sign in with Google' }).click()
  await sb.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(b.getByTestId('sync-status')).toContainText('Last synced', {
    timeout: 20_000,
  })
  await b.goto('/')
  await openPage(b, 'Shared')
  await expect(b.locator('.bn-editor')).toContainText('second line')
  await b.locator('.bn-editor .bn-block-content').nth(1).click()
  await b.keyboard.press('End')
  await b.evaluate(() => {
    ;(window as unknown as { __stayed: boolean }).__stayed = true
  })

  // A edits line 1; B sees it without a reload.
  await a.goto('/')
  await openPage(a, 'Shared')
  await a.locator('.bn-editor .bn-block-content').nth(0).click()
  await a.keyboard.press('End')
  await a.keyboard.type(' plus A')
  await expect(b.locator('.bn-editor')).toContainText('first line plus A', {
    timeout: 20_000,
  })
  expect(
    await b.evaluate(
      () => (window as unknown as { __stayed?: boolean }).__stayed,
    ),
  ).toBe(true)

  // B's caret is still at the end of line 2: typing lands there.
  await b.keyboard.type(' then B')
  expect(await lines(b)).toEqual(['first line plus A', 'second line then B'])

  // And B's typing reaches A's open page live.
  await expect(a.locator('.bn-editor')).toContainText('second line then B', {
    timeout: 20_000,
  })
  expect(await lines(a)).toEqual(['first line plus A', 'second line then B'])
})
