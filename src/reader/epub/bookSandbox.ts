/**
 * EPUB guard 2 (DECISIONS 13 Nov, "EPUB on iPad"). Book frames run with
 * `allow-same-origin allow-scripts` (WebKit delivers no taps otherwise, bug
 * 218086), so no book may bring code: every page is cleaned before it becomes
 * a frame, and gets a "no scripts" rule of its own that holds even where the
 * site header is missing (dev server, a preview host). Pictures and media may
 * only come from the book itself (blob:/data:): an outside address would tell
 * its website that the book was opened.
 */

/** The rule put first in every book page's head. */
export const BOOK_PAGE_CSP =
  "script-src 'none'; object-src 'none'; img-src blob: data:; media-src blob: data:"

const XHTML_NS = 'http://www.w3.org/1999/xhtml'

/** Elements that run code, load other pages or redirect: removed outright. */
const DROP = new Set([
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'base',
  'portal',
  'handler',
  'listener',
])
/** SVG animation elements, dropped when they would set a link or a handler. */
const ANIMATE = new Set(['set', 'animate', 'animatetransform', 'animatemotion'])

/** Picture and font addresses written inline stay; other data: pages go. */
const SAFE_DATA =
  /^data:(image\/(png|gif|jpe?g|webp|avif|bmp)|font\/|application\/(x-)?font)/

/** True when an address would run code or open a page made of data. */
function badAddress(value: string): boolean {
  // Browsers ignore spaces and control characters inside the scheme.
  // eslint-disable-next-line no-control-regex
  const v = value.replace(/[\u0000- \u007f]/g, '').toLowerCase()
  if (/^(javascript|vbscript|livescript):/.test(v)) return true
  return v.startsWith('data:') && !SAFE_DATA.test(v)
}

function cleanElement(el: Element) {
  for (const a of Array.from(el.attributes)) {
    const name = a.localName.toLowerCase()
    if (name.startsWith('on') || name === 'srcdoc' || badAddress(a.value))
      el.removeAttributeNode(a)
  }
}

/** Cleans one parsed page in place. */
function cleanDocument(doc: Document) {
  for (const el of Array.from(doc.getElementsByTagName('*'))) {
    if (!el.isConnected) continue
    const name = el.localName.toLowerCase()
    const target = (el.getAttribute('attributeName') ?? '').toLowerCase()
    const equiv = (el.getAttribute('http-equiv') ?? '').toLowerCase()
    if (
      DROP.has(name) ||
      (ANIMATE.has(name) && /^(on|href$|xlink:href$|src$)/.test(target)) ||
      (name === 'meta' && (equiv === 'refresh' || equiv === 'set-cookie'))
    ) {
      el.remove()
      continue
    }
    cleanElement(el)
  }
  const root = doc.documentElement
  if (!root || root.localName.toLowerCase() !== 'html') return // SVG page
  const ns = root.namespaceURI === XHTML_NS ? XHTML_NS : null
  const make = (tag: string) =>
    ns ? doc.createElementNS(ns, tag) : doc.createElement(tag)
  let head = Array.from(root.children).find(
    (c) => c.localName.toLowerCase() === 'head',
  )
  if (!head) {
    head = make('head')
    root.insertBefore(head, root.firstChild)
  }
  const meta = make('meta')
  meta.setAttribute('http-equiv', 'Content-Security-Policy')
  meta.setAttribute('content', BOOK_PAGE_CSP)
  head.insertBefore(meta, head.firstChild)
}

/** A cleaned copy of one book page (XHTML, HTML, SVG or other XML). */
export function hardenBookPage(text: string, type: string): string {
  const parseAs = (
    ['application/xhtml+xml', 'text/html', 'image/svg+xml'].includes(type)
      ? type
      : 'application/xml'
  ) as DOMParserSupportedType
  let doc = new DOMParser().parseFromString(text, parseAs)
  if (parseAs !== 'text/html' && doc.getElementsByTagName('parsererror').length)
    doc = new DOMParser().parseFromString(text, 'text/html')
  cleanDocument(doc)
  if (doc.contentType === 'text/html') {
    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`
  }
  return new XMLSerializer().serializeToString(doc)
}

/**
 * The kind a book file is served as. Pages and XML are cleaned; pictures,
 * fonts, sound, video and styles pass; anything else (scripts, unknown or
 * missing kinds) becomes plain text, so a frame can never run it.
 */
export function bookDataType(type: unknown): string {
  const t = String(type ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (t === 'application/xhtml+xml' || t === 'text/html') return t
  if (t === 'image/svg+xml') return t
  if (/^(application|text)\/([\w.-]+\+)?xml$/.test(t)) return t
  if (/^image\/(png|gif|jpe?g|webp|avif|bmp|x-icon)$/.test(t)) return t
  if (/^(font|audio|video)\//.test(t)) return t
  if (/^application\/(x-)?font-|^application\/vnd\.ms-opentype$/.test(t))
    return t
  if (t === 'text/css') return t
  return 'text/plain'
}

const isPage = (type: string) =>
  type === 'application/xhtml+xml' ||
  type === 'text/html' ||
  type.endsWith('xml')

/** Cleans one file's content for the type `bookDataType` gave. */
export async function cleanBookPayload(
  data: unknown,
  type: string,
): Promise<unknown> {
  if (!isPage(type)) return data
  const text =
    typeof data === 'string'
      ? data
      : data instanceof Blob
        ? await data.text()
        : String(data ?? '')
  return hardenBookPage(text, type)
}

/** Both at once (tests and simple callers). */
export async function cleanBookData(
  data: unknown,
  type: unknown,
): Promise<{ data: unknown; type: string }> {
  const t = bookDataType(type)
  return { data: await cleanBookPayload(await data, t), type: t }
}

/**
 * The guard foliate's loader calls for every file (patch 3 in
 * src/vendor/foliate-js/README.md): scripts are never loaded, every page is
 * cleaned. It runs before foliate's own style fix-ups, which read `type` at
 * once, so the type stays a plain string here.
 */
export const bookGuard = {
  allow: (detail: { isScript: boolean }) => !detail.isScript,
  data: (detail: { data: unknown; type: unknown }) => {
    const type = bookDataType(detail.type)
    const data = detail.data
    detail.type = type
    detail.data = Promise.resolve(data).then((d) => cleanBookPayload(d, type))
  },
}
