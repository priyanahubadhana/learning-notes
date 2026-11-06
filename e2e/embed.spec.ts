import { expect, test, type Page } from '@playwright/test'

const ID = 'dQw4w9WgXcQ'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
  'base64',
)

// Never load the real player: CI has internet and the real page is slow and
// can change. An empty page stands in for it.
test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>player</title>',
    }),
  )
})

async function insertEmbed(page: Page, address: string) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/video')
  await page.keyboard.press('Enter')
  const input = page.getByRole('textbox', { name: 'Web address' })
  await input.fill(address)
  await input.press('Enter')
}

/** Pretends the player reported a play time (the real one needs internet). */
const reportTime = (page: Page, seconds: number) =>
  page.evaluate((s) => {
    const frame = document.querySelector('iframe')!
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          event: 'infoDelivery',
          info: { currentTime: s },
        }),
        origin: 'https://www.youtube-nocookie.com',
        source: frame.contentWindow,
      }),
    )
  }, seconds)

test('a YouTube link shows a card first and loads the player only after Play', async ({
  page,
}) => {
  await insertEmbed(page, `https://youtu.be/${ID}?t=90`)
  const card = page.locator('[data-embed="youtube"]')
  await expect(card).toBeVisible()
  await expect(card).toContainText('1:30')
  // Nothing is loaded from YouTube yet.
  await expect(page.locator('iframe')).toHaveCount(0)
  await card.getByRole('button', { name: 'Play' }).click()
  const frame = page.locator('iframe')
  await expect(frame).toHaveAttribute(
    'src',
    new RegExp(
      `^https://www\\.youtube-nocookie\\.com/embed/${ID}\\?.*start=90`,
    ),
  )
  await expect(frame).toHaveAttribute('referrerpolicy', /origin/)
  await page.waitForTimeout(1000)
  await page.reload()
  await expect(page.locator('[data-embed="youtube"]')).toContainText('1:30')
})

test('offline, the card says Needs internet and Play waits', async ({
  page,
}) => {
  await insertEmbed(page, `https://www.youtube.com/watch?v=${ID}`)
  await expect(page.locator('[data-embed="youtube"]')).toBeVisible()
  await page.context().setOffline(true)
  await expect(page.getByText('Needs internet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled()
  await page.context().setOffline(false)
  await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled()
})

test('Insert timestamp adds a time link line (from the player, or typed)', async ({
  page,
}) => {
  await insertEmbed(page, `https://youtu.be/${ID}`)
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.locator('iframe')).toBeVisible()
  await reportTime(page, 754.4)
  await page.getByRole('button', { name: 'Insert timestamp' }).click()
  const link = page.locator('.bn-editor a', { hasText: '▶ 12:34' })
  await expect(link).toHaveAttribute(
    'href',
    `https://www.youtube.com/watch?v=${ID}&t=754s`,
  )
})

test('with no time from the player, the time is typed', async ({ page }) => {
  await insertEmbed(page, `https://youtu.be/${ID}`)
  await page.getByRole('button', { name: 'Play' }).click()
  await page.getByRole('button', { name: 'Insert timestamp' }).click()
  await page.getByRole('textbox', { name: 'Time in the video' }).fill('1:05')
  await page.getByRole('textbox', { name: 'Time in the video' }).press('Enter')
  await expect(
    page.locator('.bn-editor a', { hasText: '▶ 1:05' }),
  ).toBeVisible()
})

test('a picture added while the video plays is captioned with the video time', async ({
  page,
}) => {
  await insertEmbed(page, `https://youtu.be/${ID}`)
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.locator('iframe')).toBeVisible()
  await reportTime(page, 100)
  await page.locator('.bn-editor p').last().click()
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({ name: 'shot.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.locator('.bn-editor img').first()).toHaveAttribute(
    'src',
    /^blob:/,
  )
  await expect(page.locator('.bn-editor')).toContainText('▶ 1:40')
})

test('another web address becomes a link card; a bad one is refused', async ({
  page,
}) => {
  await insertEmbed(page, 'javascript:alert(1)')
  await expect(page.getByRole('alert')).toContainText('not a web address')
  const input = page.getByRole('textbox', { name: 'Web address' })
  await input.fill('https://example.com/lesson')
  await input.press('Enter')
  const link = page.locator('[data-embed="link"] a')
  await expect(link).toHaveAttribute('href', 'https://example.com/lesson')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await expect(page.locator('iframe')).toHaveCount(0)
})
