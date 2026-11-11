/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../core/testing'
import { parseImageRef } from './imageRef'
import {
  displayUrl,
  hasWebPictures,
  isApproved,
  approveRemote,
  isPlaceholder,
  localizeHtml,
  localizeMarkdown,
  localizeUrl,
  placeholderSrc,
  resolveForCopy,
  unapproveRemote,
} from './remoteImages'

const png = () =>
  new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })

describe('web pictures never load silently', () => {
  beforeEach(() => {
    unapproveRemote('https://a.test/x.png')
  })

  it('shows a card (a data: image) for a web picture until it is approved', () => {
    const url = 'https://a.test/x.png'
    const shown = displayUrl(url)
    expect(shown.startsWith('data:image/svg+xml')).toBe(true)
    expect(isPlaceholder(shown)).toBe(true)
    expect(decodeURIComponent(shown)).toContain('Load remote image')
    expect(decodeURIComponent(shown)).toContain('a.test')
    approveRemote(url)
    expect(isApproved(url)).toBe(true)
    expect(displayUrl(url)).toBe(url)
  })

  it('leaves local pictures and data: pictures alone', () => {
    expect(displayUrl('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA',
    )
    expect(displayUrl('lnimg:abc')).toBe('lnimg:abc')
  })

  it('a hostile address cannot break out of the card', () => {
    const card = decodeURIComponent(placeholderSrc('https://x"><script>.test/'))
    expect(card).not.toContain('<script')
  })

  it('detects web pictures in pasted HTML and Markdown', () => {
    expect(hasWebPictures('<p><img src="https://a.test/x.png"></p>')).toBe(true)
    expect(hasWebPictures('<p><img src="data:image/png;base64,AA"></p>')).toBe(
      false,
    )
    expect(hasWebPictures('![alt](https://a.test/x.png)')).toBe(true)
    expect(hasWebPictures('[link](https://a.test/x.png)')).toBe(false)
  })

  it('copying never swaps the card in or fetches a picture behind it', async () => {
    const editor = { resolveFileUrl: async (u: string) => displayUrl(u) }
    expect(await resolveForCopy(editor, 'https://b.test/y.png')).toBe(
      'https://b.test/y.png',
    )
  })
})

describe('copying web pictures into the app on paste', () => {
  it('stores the picture and swaps the address for a local reference', async () => {
    const db = createTestDb()
    const fetcher = vi.fn(async () => png())
    const out = await localizeHtml(
      db,
      '<p>hi <img src="https://c.test/1.png"> <img src="https://c.test/1.png"></p>',
      fetcher,
    )
    expect(fetcher).toHaveBeenCalledTimes(1) // the same address is stored once
    const srcs = [
      ...new DOMParser().parseFromString(out, 'text/html').images,
    ].map((i) => i.getAttribute('src')!)
    expect(srcs).toHaveLength(2)
    expect(srcs[0]).toBe(srcs[1])
    const id = parseImageRef(srcs[0])
    expect(id).not.toBeNull()
    expect((await db.images.get(id!))?.type).toBe('image/png')
  })

  it('keeps the web address (the card covers it) when the server forbids a copy', async () => {
    const db = createTestDb()
    const html = '<p><img src="https://d.test/2.png"></p>'
    const out = await localizeHtml(db, html, async () => null)
    expect(out).toContain('https://d.test/2.png')
    expect(await db.images.count()).toBe(0)
  })

  it('does not wait longer than the budget for a slow picture', async () => {
    const db = createTestDb()
    const started = Date.now()
    const out = await localizeHtml(
      db,
      '<p><img src="https://e.test/slow.png"></p>',
      () => new Promise(() => undefined),
      60,
    )
    expect(Date.now() - started).toBeLessThan(1000)
    expect(out).toContain('https://e.test/slow.png')
  })

  it('does Markdown pictures too, and never plain http', async () => {
    const db = createTestDb()
    const md = '![cat](https://f.test/c.png) ![old](http://f.test/o.png)'
    const out = await localizeMarkdown(db, md, async () => png())
    expect(out).toMatch(/!\[cat\]\(lnimg:[0-9a-f-]{36}\)/)
    expect(out).toContain('![old](http://f.test/o.png)')
    expect(
      await localizeUrl(db, 'http://f.test/o.png', async () => png()),
    ).toBeNull()
  })

  it('rejects something that is not a picture type', async () => {
    const db = createTestDb()
    const out = await localizeHtml(
      db,
      '<img src="https://g.test/s.svg">',
      async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }),
    )
    expect(out).toContain('https://g.test/s.svg')
    expect(await db.images.count()).toBe(0)
  })
})
