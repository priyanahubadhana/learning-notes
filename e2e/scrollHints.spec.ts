/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { cornerAction } from './helpers.ts'

/** Adds a tall list to the page, as any long list in the app would be. */
async function addList(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.id = 'hint-list'
    box.style.cssText =
      'position:fixed;left:40%;top:80px;width:200px;height:150px;overflow-y:auto;background:#fff;z-index:5'
    box.innerHTML = '<div style="height:900px">long</div>'
    document.body.appendChild(box)
  })
}

test('long lists fade at the hidden edge and show a slim bar while scrolling', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('aside').waitFor({ state: 'attached' })
  await addList(page)
  const list = page.locator('#hint-list')
  await expect(list).toHaveAttribute('data-scroll-more', 'bottom')

  await list.evaluate((el) => (el.scrollTop = 200))
  await expect(list).toHaveAttribute('data-scroll-more', 'both')
  await expect(page.locator('.scroll-hint-thumb')).toHaveClass(/is-on/)
  // It fades away after about a second.
  await expect(page.locator('.scroll-hint-thumb')).not.toHaveClass(/is-on/, {
    timeout: 3000,
  })

  await list.evaluate((el) => (el.scrollTop = 10000))
  await expect(list).toHaveAttribute('data-scroll-more', 'top')
})

test('the Settings switch is there, and off means no hints', async ({
  page,
}) => {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  await expect(page.getByText('Scroll hints', { exact: true })).toBeVisible()
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.scrollHints', '"off"'),
  )
  await page.goto('/')
  await page.locator('aside').waitFor({ state: 'attached' })
  await addList(page)
  await page.locator('#hint-list').evaluate((el) => (el.scrollTop = 100))
  await page.waitForTimeout(700)
  await expect(page.locator('#hint-list')).not.toHaveAttribute(
    'data-scroll-more',
    /.+/,
  )
  await expect(page.locator('.scroll-hint-thumb')).not.toHaveClass(/is-on/)
})
