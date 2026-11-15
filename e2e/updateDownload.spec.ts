// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { cornerAction } from './helpers.ts'

/**
 * P1.8: the must-have download against the REAL built file list (no mock of
 * /precache.json). The list named empty chunks that the build never writes;
 * the live preview (Cloudflare Pages) answers 404 for them, the local preview
 * answers with the app page instead. These tests make the local preview act
 * like the live one, so a list that names a file the server cannot send fails
 * here as it did on the iPad.
 */
const FLAG = '/?flags=update.v2'
const notice = (page: Page) => page.locator('[data-mandatory-update]')

/** Like Cloudflare Pages: a file that is not in the build is a 404, not the app page. */
async function likeTheLiveServer(page: Page, missing?: (u: string) => boolean) {
  await page.route('**/assets/**', async (r) => {
    const path = new URL(r.request().url()).pathname
    if (missing?.(path)) return r.fulfill({ status: 404, body: 'Not found' })
    const res = await r.fetch()
    const body = await res.body()
    if (/text\/html/.test(res.headers()['content-type'] ?? ''))
      return r.fulfill({
        status: 404,
        body: 'Not found',
        contentType: 'text/html',
      })
    return r.fulfill({ response: res, body })
  })
}

async function openAbout(page: Page) {
  await page.goto(FLAG)
  await cornerAction(page, 'Settings')
  await expect(page.locator('[data-about]')).toBeVisible()
}

test('P1.8 every file in the built list is served, not empty, with its type', async ({
  page,
}) => {
  await page.goto(FLAG)
  const bad = await page.evaluate(async () => {
    const { files } = (await (
      await fetch(`/precache.json?t=${Date.now()}`, { cache: 'no-store' })
    ).json()) as { files: { u: string; s: number }[] }
    const type: Record<string, RegExp> = {
      js: /javascript/,
      css: /text\/css/,
      woff2: /font\/woff2/,
      wasm: /application\/wasm/,
      svg: /image\/svg/,
      png: /image\/png/,
      html: /text\/html/,
    }
    const out: string[] = []
    for (const f of files) {
      if (f.s <= 0) {
        out.push(`${f.u} is empty`)
        continue
      }
      const res = await fetch(f.u, { cache: 'no-store' })
      const ext = f.u.split('.').pop() ?? ''
      const ct = res.headers.get('content-type') ?? ''
      if (!res.ok) out.push(`${f.u}: ${res.status}`)
      else if (!type[ext]?.test(ct)) out.push(`${f.u}: ${ct}`)
      await res.arrayBuffer()
    }
    return out
  })
  expect(bad).toEqual([])
})

// Nothing cached: the download fetches the whole real list.
test.describe('P1.8 nothing in the offline copy', () => {
  test.use({ serviceWorkers: 'block' })

  test('P1.8 Pretend downloads the real list and restarts on the same page', async ({
    page,
  }) => {
    await likeTheLiveServer(page)
    await openAbout(page)
    const url = page.url()
    await page.evaluate(() => {
      ;(window as never as { __same?: number }).__same = 1
      new MutationObserver(() => {
        const p = document
          .querySelector('[data-mandatory-update]')
          ?.getAttribute('data-phase')
        if (p)
          sessionStorage.setItem(
            'p18',
            (sessionStorage.getItem('p18') ?? '') + p + ',',
          )
      }).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
      })
    })
    await page.locator('[data-about-pretend]').click()
    await expect
      .poll(
        () =>
          page
            .evaluate(() => (window as never as { __same?: number }).__same)
            .catch(() => 'reloading'),
        { timeout: 25_000 },
      )
      .toBeUndefined()
    expect(page.url()).toBe(url)
    const seen = await page.evaluate(() => sessionStorage.getItem('p18'))
    expect(seen).toContain('installing')
    expect(seen).not.toContain('failed')
  })

  test('P1.8 a listed file the server lacks: "did not finish", Not now goes back to the app', async ({
    page,
  }) => {
    await page.goto(FLAG)
    await expect(page.locator('aside')).toBeVisible()
    const victim = await page.evaluate(async () => {
      const { files } = (await (
        await fetch(`/precache.json?t=${Date.now()}`, { cache: 'no-store' })
      ).json()) as { files: { u: string; s: number }[] }
      return files.find((f) => f.s > 0 && f.u.endsWith('.css'))!.u
    })
    await likeTheLiveServer(page, (u) => u === victim)
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('learning-notes:test-required-update'),
      ),
    )
    await expect(notice(page)).toHaveAttribute('data-phase', 'failed', {
      timeout: 20_000,
    })
    const back = notice(page).getByRole('button', { name: 'Not now' })
    await expect(back).toBeVisible()
    const box = await back.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await back.click()
    await expect(notice(page)).toHaveCount(0)
    expect(
      await page.evaluate(() =>
        document.getElementById('root')?.hasAttribute('inert'),
      ),
    ).toBe(false)
    // The app is usable again.
    await expect(page.locator('aside')).toBeVisible()
  })
})
