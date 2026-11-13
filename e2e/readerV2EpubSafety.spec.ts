// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Frame, Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makeEpub, makeHostileEpub } from './fixtures/books.ts'

/**
 * Slice 7 (reader v2), EPUB guard 3 (DECISIONS 13 Nov, "EPUB on iPad"): book
 * frames may run scripts (WebKit needs it for taps), so a hostile book must
 * still run nothing - no inline script, no script file, no on… handler, no
 * javascript: link, no nested frame. Runs on Chromium and the iPad stand-in.
 */
test.use({ viewport: { width: 1200, height: 900 } })

async function openBook(page: Page, buffer: Buffer) {
  await page.goto('/?flags=reader.v2')
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'book.epub',
    mimeType: 'application/epub+zip',
    buffer,
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

async function bookFrame(page: Page, text: string): Promise<Frame> {
  let found: Frame | null = null
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue
          const body = await f
            .evaluate(() => document.body?.innerText ?? '')
            .catch(() => '')
          if (body.includes(text)) {
            found = f
            return true
          }
        }
        return false
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  return found!
}

const ranAnywhere = async (page: Page) => {
  const out: unknown[] = []
  for (const f of page.frames()) {
    const v = await f
      .evaluate(
        () => (window as unknown as { __bookRan?: unknown }).__bookRan ?? null,
      )
      .catch(() => null)
    if (v !== null) out.push(v)
  }
  return out
}

test('a hostile EPUB runs nothing: no inline or external script, no on… handler, no javascript: link, no nested frame', async ({
  page,
}) => {
  await openBook(page, makeHostileEpub())
  const frame = await bookFrame(page, 'quick brown fox')
  const info = await frame.evaluate(() => ({
    scripts: document.getElementsByTagNameNS('*', 'script').length,
    frames: document.querySelectorAll('iframe, frame, object, embed').length,
    refresh: document.querySelectorAll('meta[http-equiv="refresh"]').length,
    // The reader adds its own style tags at the top later; the first thing
    // after them is the page rule, before anything the book brought.
    first:
      Array.from(document.head?.children ?? []).find(
        (c) => c.localName !== 'style',
      )?.outerHTML ?? '',
    handlers: Array.from(document.getElementsByTagName('*')).flatMap((el) =>
      Array.from(el.attributes)
        .filter((a) => /^on/i.test(a.name))
        .map((a) => a.name),
    ),
  }))
  expect(info.scripts).toBe(0)
  expect(info.frames).toBe(0)
  expect(info.refresh).toBe(0)
  expect(info.handlers).toEqual([])
  expect(info.first).toContain('Content-Security-Policy')
  expect(info.first).toContain("script-src 'none'")
  // Try every trigger a reader could cause: hover, tap, the bad link.
  const p = frame.locator('p').first()
  await p.hover()
  await p.click()
  await frame.locator('#jslink').click()
  // A script that still slipped into the page is blocked by the page rule
  // (an inline script runs at once when added, or never).
  const injected = await frame.evaluate(() => {
    const s = document.createElement('script')
    s.textContent = 'window.__injected = 1'
    document.head.append(s)
    return (window as unknown as { __injected?: number }).__injected ?? null
  })
  expect(injected).toBeNull()
  expect(await ranAnywhere(page)).toEqual([])
  expect(await page.title()).not.toContain('ran:')
  // The book is still open and readable.
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await bookFrame(page, 'quick brown fox')
})

test('book frames take events on WebKit: the frame sandbox allows scripts and keeps the same origin', async ({
  page,
}) => {
  await openBook(page, makeEpub('The Story'))
  const frame = await bookFrame(page, 'quick brown fox')
  const sandbox = await frame.evaluate(
    () => window.frameElement?.getAttribute('sandbox') ?? '',
  )
  expect(sandbox.split(/\s+/).sort()).toEqual([
    'allow-same-origin',
    'allow-scripts',
  ])
  // The no-scripts page rule is in every ordinary book page too.
  const first = await frame.evaluate(
    () =>
      Array.from(document.head?.children ?? [])
        .find((c) => c.localName !== 'style')
        ?.getAttribute('content') ?? '',
  )
  expect(first).toContain("script-src 'none'")
})

test('a book picture from another website is never fetched (no "this book was opened" signal)', async ({
  page,
}) => {
  const hits: string[] = []
  await page.route('https://tracker.example/**', (route) => {
    hits.push(route.request().url())
    return route.fulfill({ status: 200, body: '' })
  })
  await openBook(page, makeHostileEpub())
  const frame = await bookFrame(page, 'quick brown fox')
  const rule = await frame.evaluate(
    () =>
      Array.from(document.head?.children ?? [])
        .find((c) => c.localName !== 'style')
        ?.getAttribute('content') ?? '',
  )
  expect(rule).toContain('img-src blob: data:')
  await page.waitForTimeout(1000)
  expect(hits).toEqual([])
})
