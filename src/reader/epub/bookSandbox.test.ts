// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  BOOK_PAGE_CSP,
  bookGuard,
  cleanBookData,
  hardenBookPage,
} from './bookSandbox'

const XHTML = 'application/xhtml+xml'

const hostile = `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink"><head><title>T</title><meta http-equiv="refresh" content="0;url=javascript:alert(1)"/><base href="https://evil.example/"/><script>parent.hacked=1</script><script src="evil.js"></script></head><body onload="parent.hacked=2"><p onclick="parent.hacked=3" style="color:red">Safe words</p><a href="javascript:parent.hacked=4">link</a><a href=" JavaScript:x">l2</a><a href="data:text/html,&lt;script&gt;x&lt;/script&gt;">l3</a><a href="#n2">ok</a><img src="pic.png" onerror="parent.hacked=5"/><iframe src="x.html"></iframe><object data="x.swf"></object><embed src="x.swf"/><form action="javascript:x"><button formaction="javascript:y">b</button></form><svg xmlns="http://www.w3.org/2000/svg"><a xlink:href="javascript:z"><text>s</text></a><animate attributeName="href" to="javascript:q"/><set attributeName="onclick" to="x"/><script>parent.hacked=6</script></svg></body></html>`

const parse = (s: string, type: DOMParserSupportedType = XHTML) =>
  new DOMParser().parseFromString(s, type)

describe('book page guard (EPUB guard 2)', () => {
  const out = parse(hardenBookPage(hostile, XHTML))

  it('removes every script, frame, object, embed, base and meta refresh', () => {
    for (const sel of [
      'script',
      'iframe',
      'frame',
      'object',
      'embed',
      'base',
      'meta[http-equiv="refresh"]',
    ])
      expect(out.querySelectorAll(sel).length, sel).toBe(0)
    expect(out.getElementsByTagNameNS('*', 'script').length).toBe(0)
  })

  it('removes every on… attribute and every script address', () => {
    for (const el of Array.from(out.getElementsByTagName('*'))) {
      for (const a of Array.from(el.attributes)) {
        expect(a.name.toLowerCase().startsWith('on'), a.name).toBe(false)
        expect(a.value.trim().toLowerCase()).not.toMatch(
          /^(javascript|vbscript|data):/,
        )
      }
    }
  })

  it('removes SVG animations that could set a link or a handler', () => {
    expect(out.getElementsByTagNameNS('*', 'animate').length).toBe(0)
    expect(out.getElementsByTagNameNS('*', 'set').length).toBe(0)
  })

  it('adds the no-scripts rule as the first element of the head', () => {
    const first = out.querySelector('head')!.firstElementChild!
    expect(first.localName).toBe('meta')
    expect(first.getAttribute('http-equiv')).toBe('Content-Security-Policy')
    expect(first.getAttribute('content')).toBe(BOOK_PAGE_CSP)
    expect(BOOK_PAGE_CSP).toContain("script-src 'none'")
    expect(BOOK_PAGE_CSP).toContain("object-src 'none'")
  })

  it('keeps the words, the styles and in-book links', () => {
    expect(out.querySelector('p')!.textContent).toBe('Safe words')
    expect(out.querySelector('p')!.getAttribute('style')).toBe('color:red')
    expect(out.querySelector('a[href="#n2"]')).not.toBeNull()
    expect(out.querySelector('img')!.getAttribute('src')).toBe('pic.png')
  })

  it('works on plain HTML pages without a head', () => {
    const html = parse(
      hardenBookPage(
        '<p onmouseover="x()">Hi</p><script>x()</script>',
        'text/html',
      ),
      'text/html',
    )
    expect(html.querySelector('head > meta')!.getAttribute('content')).toBe(
      BOOK_PAGE_CSP,
    )
    expect(html.querySelectorAll('script').length).toBe(0)
    expect(html.querySelector('p')!.hasAttribute('onmouseover')).toBe(false)
  })

  it('cleans SVG pages too', () => {
    const svg = parse(
      hardenBookPage(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>x()</script><rect/></svg>',
        'image/svg+xml',
      ),
      'image/svg+xml',
    )
    expect(svg.documentElement.hasAttribute('onload')).toBe(false)
    expect(svg.getElementsByTagNameNS('*', 'script').length).toBe(0)
    expect(svg.getElementsByTagNameNS('*', 'rect').length).toBe(1)
  })
})

describe('book resource guard', () => {
  it('cleans page data, keeps pictures and styles, and never lets a script or an unknown page through', async () => {
    const page = await cleanBookData('<p onclick="x">a</p>', 'text/html')
    expect(page.type).toBe('text/html')
    expect(String(page.data)).not.toContain('onclick')
    // A page declared with odd casing or extras is still cleaned.
    const odd = await cleanBookData(
      '<p onclick="x">a</p>',
      'Text/HTML; charset=utf-8',
    )
    expect(odd.type).toBe('text/html')
    expect(String(odd.data)).not.toContain('onclick')
    const blob = new Blob(['x'])
    expect((await cleanBookData(blob, 'image/png')).data).toBe(blob)
    expect((await cleanBookData('a{}', 'text/css')).type).toBe('text/css')
    // Scripts and unknown kinds become plain text, so a frame never runs them.
    expect((await cleanBookData('x()', 'application/javascript')).type).toBe(
      'text/plain',
    )
    expect((await cleanBookData(blob, '')).type).toBe('text/plain')
    expect((await cleanBookData(blob, 'application/x-what')).type).toBe(
      'text/plain',
    )
  })
})

describe('the guard is part of our EPUB loader', () => {
  it('every loader made by makeEpubLoader carries it; scripts are refused', async () => {
    const { makeEpubLoader } = await import('./epubLoader')
    const { zipSync, strToU8 } = await import('fflate')
    const loader = makeEpubLoader(zipSync({ a: strToU8('x') }))
    expect(loader.guard).toBe(bookGuard)
    expect(bookGuard.allow({ isScript: true })).toBe(false)
    expect(bookGuard.allow({ isScript: false })).toBe(true)
    const detail: { data: unknown; type: unknown } = {
      data: '<p onclick="x">a</p>',
      type: 'text/html',
    }
    bookGuard.data(detail)
    expect(detail.type).toBe('text/html')
    expect(String(await detail.data)).not.toContain('onclick')
  })
})
