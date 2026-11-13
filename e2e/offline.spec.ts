import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { setTitle, cornerAction } from './helpers.ts'

test.use({ serviceWorkers: 'allow' })

test('the app and its notes open with no internet', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await setTitle(page, 'Written before going offline')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('aside')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Written before going offline',
  )
})

test('no update is offered to a first-time visitor', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect(page.getByRole('button', { name: 'Update' })).toBeHidden()
})

test('the built app works under the live security rules', async ({ page }) => {
  const blocked: string[] = []
  await page.exposeFunction('reportBlocked', (what: string) =>
    blocked.push(what),
  )
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const report = (window as unknown as Record<string, (s: string) => void>)
        .reportBlocked
      report(`${e.violatedDirective}: ${e.blockedURI}`)
    })
    localStorage.setItem('learning-notes:theme', '"night"')
  })
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain(
    "frame-ancestors 'self'",
  )
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).click()
  await page.keyboard.type('Checked')
  await page.keyboard.press('Enter')
  await page.keyboard.type('A line of notes')
  await expect(page.getByText('A line of notes')).toBeVisible()
  // The theme file ran before the app started.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await cornerAction(page, 'Settings')
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible()
  expect(blocked).toEqual([])
})

test('the build says which commit it is, in version.json and This device', async ({
  page,
}) => {
  const { commit } = JSON.parse(await readFile('dist/version.json', 'utf8'))
  expect(commit).toMatch(/^[0-9a-f]{40}$/)
  await page.goto('/#/settings')
  await expect(page.getByRole('main')).toContainText(
    `App version: ${commit.slice(0, 7)}`,
  )
})

test('a missing page is not kept for offline use', async () => {
  const worker = await readFile('dist/sw.js', 'utf8')
  expect(worker).not.toContain('404.html')
  await expect(readFile('dist/404.html', 'utf8')).resolves.toContain('href="/"')
})
