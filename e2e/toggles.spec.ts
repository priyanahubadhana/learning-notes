// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Toggle sweep (Phase A4, R4-18): every toggle button on the ribbon turns
 * off with a second tap and the ribbon stays on the same tab.
 */

test.use({ hasTouch: true })

async function openPage(page: Page) {
  await startInMode(page, 'touch')
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:toolbar.ribbon', 'true')
  })
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.keyboard.press('Control+A')
}

for (const tab of ['Home', 'Insert', 'Draw', 'View', 'Review']) {
  test(`ribbon toggles on the ${tab} tab turn off on a second tap`, async ({
    page,
  }) => {
    await openPage(page)
    const bar = dockedBar(page)
    const tabButton = bar.getByRole('tab', { name: tab, exact: true })
    if ((await tabButton.count()) === 0) test.skip()
    await tabButton.click()
    const panel = bar.locator('[role="tabpanel"]')
    const reopen = async () => {
      // The ribbon closes after a tool unless it is pinned; the tab stays.
      if ((await panel.count()) === 0) await tabButton.click()
    }
    const names = await panel
      .locator('button[aria-pressed]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')!))
    // Lock to reading cannot be left with Exit (that is its point).
    for (const name of names.filter((n) => !/^Lock/.test(n))) {
      const button = () =>
        panel
          .locator('button[aria-pressed]')
          .and(page.getByLabel(name, { exact: true }))
      await reopen()
      const start = await button().getAttribute('aria-pressed')
      await button().click()
      if ((await tabButton.count()) === 0) {
        // Reading mode (and what starts it) covers the bar by design: leave it
        // and check the ribbon is still on the tab it was on (owner note 18).
        // TEMP CI debug (remove)
        console.log(
          '[rddbg] after',
          name,
          await page.evaluate(
            () =>
              [...document.querySelectorAll('[data-testid=reader-exit]')]
                .map((b) => {
                  const out = []
                  for (let e: Element | null = b; e; e = e.parentElement) {
                    const c = getComputedStyle(e)
                    const r = e.getBoundingClientRect()
                    out.push(
                      e.tagName +
                        '.' +
                        (e.getAttribute('class') ?? '').slice(0, 40) +
                        ' d=' +
                        c.display +
                        ' v=' +
                        c.visibility +
                        ' o=' +
                        c.opacity +
                        ' ' +
                        [r.x, r.y, r.width, r.height].map(Math.round).join(','),
                    )
                  }
                  return out.join(' < ')
                })
                .join(' || ') +
              ' fs=' +
              !!document.fullscreenElement +
              ' html=' +
              document.documentElement.className,
          ),
        )
        await page.getByRole('button', { name: 'Exit reading' }).first().click()
        // The restored selection opens its own context tab (by design); a caret
        // puts the bar back on the tab it remembered.
        await page.locator('.bn-editor').click()
        await expect(tabButton, `${name} stays on ${tab}`).toHaveAttribute(
          'aria-selected',
          'true',
        )
        continue
      }
      await reopen()
      await button().click()
      await reopen()
      await expect(button(), `${name} back to ${start}`).toHaveAttribute(
        'aria-pressed',
        start!,
      )
      await expect(tabButton, `${name} stays on ${tab}`).toHaveAttribute(
        'aria-selected',
        'true',
      )
    }
  })
}
