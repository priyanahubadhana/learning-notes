/**
 * Source-aware paste: knows the shapes of clipboard HTML that other apps
 * write (Google Docs, Word, Apple Notes, Notion, ChatGPT / Claude / Gemini
 * on the web) and turns them into plain, structural HTML before the
 * sanitiser (clipboard.ts) keeps only safe tags. Also reads Markdown-looking
 * text and tree drawings (├── └──) that arrive as plain text.
 * Pure: works on a detached document, nothing runs or loads.
 */

export type PasteSource =
  | 'notion'
  | 'gdocs'
  | 'word'
  | 'apple'
  | 'chat' // ChatGPT, Claude, Gemini and other AI web chats
  | 'web'

/** Guesses where clipboard HTML came from (for logs and rules, not trust). */
export function detectSource(html: string): PasteSource {
  if (/id=["']docs-internal-guid/i.test(html)) return 'gdocs'
  if (
    /class=["']?Mso|xmlns:o=|urn:schemas-microsoft-com:office|mso-/i.test(html)
  )
    return 'word'
  if (/class=["'][^"']*(notion|toggle|bulleted-list|numbered-list)/i.test(html))
    return 'notion'
  if (
    /<(message-content|code-block|model-response|response-container|table-block)\b|data-path-to-node|data-message-author-role|class=["'][^"']*(font-claude|markdown prose|prose )/i.test(
      html,
    )
  )
    return 'chat'
  if (
    /class=["']?(Apple-|p\d+\b)|<meta name=["']Generator["'] content=["']Cocoa/i.test(
      html,
    )
  )
    return 'apple'
  return 'web'
}

// ---- Style to meaning --------------------------------------------------

const styleOf = (el: Element) => (el.getAttribute('style') ?? '').toLowerCase()

function isBoldStyle(style: string): boolean {
  const m = /font-weight\s*:\s*(bold|bolder|[5-9]00)/.exec(style)
  return !!m
}

/**
 * Inline styles (Google Docs, Word, Apple Notes, web pages write bold and
 * italic as styles on spans) become real tags, which the sanitiser keeps.
 */
function stylesToTags(doc: Document): void {
  for (const el of [...doc.body.querySelectorAll('span, font, p, div, li')]) {
    const s = styleOf(el)
    if (!s) continue
    const isSpan = el.tagName === 'SPAN' || el.tagName === 'FONT'
    if (!isSpan) continue // blocks keep their own meaning; only runs wrap
    const wraps: string[] = []
    if (isBoldStyle(s)) wraps.push('strong')
    if (/font-style\s*:\s*italic/.test(s)) wraps.push('em')
    if (/text-decoration[^;]*underline/.test(s)) wraps.push('u')
    if (/text-decoration[^;]*line-through/.test(s)) wraps.push('s')
    if (/font-family[^;]*(monospace|courier|consolas|menlo|monaco)/.test(s))
      wraps.push('code')
    if (wraps.length === 0) continue
    let inner: Node[] = [...el.childNodes]
    for (const tag of wraps) {
      const wrap = doc.createElement(tag)
      wrap.append(...inner)
      inner = [wrap]
    }
    el.replaceChildren(...inner)
  }
}

/** Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-…">. */
function unwrapDocsGuid(doc: Document): void {
  for (const b of [...doc.querySelectorAll('[id^="docs-internal-guid"]')]) {
    b.replaceWith(...b.childNodes)
  }
  for (const b of [...doc.querySelectorAll('b, strong')]) {
    if (/font-weight\s*:\s*(normal|400)/.test(styleOf(b))) {
      b.replaceWith(...b.childNodes)
    }
  }
}

/**
 * Google Docs writes every list item in its own <ul> with aria-level; join
 * neighbouring ones into one nested list.
 */
function nestFlatLists(doc: Document): void {
  const lists = [...doc.body.querySelectorAll('ul, ol')].filter(
    (l) =>
      l.children.length === 1 &&
      l.firstElementChild?.hasAttribute('aria-level'),
  )
  for (const first of lists) {
    if (!first.isConnected) continue
    const root = first.cloneNode(false) as Element
    const stack: { level: number; list: Element }[] = [{ level: 1, list: root }]
    let cur: Element | null = first
    const group: Element[] = []
    while (
      cur &&
      (cur.tagName === 'UL' || cur.tagName === 'OL') &&
      cur.children.length === 1 &&
      cur.firstElementChild?.hasAttribute('aria-level')
    ) {
      group.push(cur)
      cur = cur.nextElementSibling
    }
    for (const l of group) {
      const li = l.firstElementChild!
      const level = Math.max(1, Number(li.getAttribute('aria-level')) || 1)
      while (stack.length > 1 && stack[stack.length - 1].level > level) {
        stack.pop()
      }
      let top = stack[stack.length - 1]
      if (level > top.level) {
        const parentLi = top.list.lastElementChild
        const sub = l.cloneNode(false) as Element
        if (parentLi) parentLi.appendChild(sub)
        else top.list.appendChild(sub)
        top = { level, list: sub }
        stack.push(top)
      }
      top.list.appendChild(li)
    }
    first.replaceWith(root)
    for (const l of group) if (l !== first) l.remove()
  }
}

/**
 * Word writes list items as <p class="MsoListParagraph…" style="mso-list:l0
 * level2 lfo1"> with the bullet as text. Rebuild real nested lists.
 */
function wordLists(doc: Document): void {
  const isItem = (el: Element | null): el is Element =>
    !!el &&
    el.tagName === 'P' &&
    (/mso-list\s*:\s*l\d+/i.test(el.getAttribute('style') ?? '') ||
      /MsoListParagraph/i.test(el.className))
  for (const first of [...doc.body.querySelectorAll('p')]) {
    if (!first.isConnected || !isItem(first)) continue
    const group: Element[] = []
    let cur: Element | null = first
    while (isItem(cur)) {
      group.push(cur)
      cur = cur.nextElementSibling
    }
    const root = doc.createElement('ul')
    const stack: { level: number; list: Element }[] = [{ level: 1, list: root }]
    let rootOrdered = false
    group.forEach((p, i) => {
      const level = Number(
        /level(\d+)/i.exec(p.getAttribute('style') ?? '')?.[1] ?? 1,
      )
      // The bullet or number is text (or a mso-list:Ignore span): drop it.
      const text = p.textContent ?? ''
      const ordered = /^\s*(\d+|[a-z]|[ivx]+)[.)]\s/i.test(text)
      for (const ignore of [...p.querySelectorAll('span')]) {
        if (/mso-list\s*:\s*ignore/i.test(ignore.getAttribute('style') ?? '')) {
          ignore.remove()
        }
      }
      const li = doc.createElement('li')
      li.append(...p.childNodes)
      if (!p.querySelector('span[style*="mso-list"]')) {
        // Bullet glyphs typed as characters (·, o, §, 1.) at the start.
        const first = li.firstChild
        if (first?.nodeType === Node.TEXT_NODE) {
          first.textContent = (first.textContent ?? '').replace(
            /^\s*(?:[·•o§▪–-]|\d+[.)]|[a-z][.)])\s+/i,
            '',
          )
        }
      }
      if (i === 0) rootOrdered = ordered
      while (stack.length > 1 && stack[stack.length - 1].level > level) {
        stack.pop()
      }
      let top = stack[stack.length - 1]
      if (level > top.level) {
        const sub = doc.createElement(ordered ? 'ol' : 'ul')
        const parentLi = top.list.lastElementChild
        if (parentLi) parentLi.appendChild(sub)
        else top.list.appendChild(sub)
        top = { level, list: sub }
        stack.push(top)
      }
      top.list.appendChild(li)
    })
    const out = rootOrdered ? doc.createElement('ol') : root
    if (rootOrdered) out.append(...root.childNodes)
    first.replaceWith(out)
    for (const p of group) if (p !== first) p.remove()
  }
}

/**
 * Apple Notes and some pages show a heading as a paragraph holding one large
 * bold run: make it a heading (by size).
 */
function sizedHeadings(doc: Document): void {
  for (const p of [...doc.body.querySelectorAll('p, div')]) {
    if (p.querySelector('p, div, ul, ol, table, li')) continue
    const text = (p.textContent ?? '').trim()
    if (!text || text.length > 140) continue
    let size = 0
    let bold = false
    for (const el of [p, ...p.querySelectorAll('*')]) {
      const s = styleOf(el)
      const m = /font-size\s*:\s*([\d.]+)(px|pt)/.exec(s)
      if (m) size = Math.max(size, Number(m[1]) * (m[2] === 'pt' ? 1.333 : 1))
      if (isBoldStyle(s) || el.tagName === 'B' || el.tagName === 'STRONG') {
        bold = true
      }
    }
    if (!bold) continue
    const tag = size >= 24 ? 'h1' : size >= 20 ? 'h2' : size >= 17 ? 'h3' : ''
    if (!tag) continue
    const h = doc.createElement(tag)
    h.textContent = text
    p.replaceWith(h)
  }
}

/** AI chats: custom elements become blocks; code blocks keep only the code. */
function chatShapes(doc: Document): void {
  for (const el of [
    ...doc.body.querySelectorAll('code-block, [class*="code-block"]'),
  ]) {
    const pre = el.querySelector('pre')
    if (pre && el.tagName.includes('-')) el.replaceWith(pre)
  }
  for (const el of [...doc.body.querySelectorAll('*')]) {
    if (el.tagName.includes('-') && el.isConnected) {
      const div = doc.createElement('div')
      div.append(...el.childNodes)
      el.replaceWith(div)
    }
  }
  // role="heading" aria-level="2" on a div or p
  for (const el of [...doc.body.querySelectorAll('[role="heading"]')]) {
    const level = Math.min(
      3,
      Math.max(1, Number(el.getAttribute('aria-level')) || 2),
    )
    const h = doc.createElement(`h${level}`)
    h.append(...el.childNodes)
    el.replaceWith(h)
  }
}

/** Task-list inputs become "[ ] " / "[x] " prefixes our list reader understands. */
function checkboxes(doc: Document): void {
  for (const input of [
    ...doc.body.querySelectorAll('input[type="checkbox"]'),
  ]) {
    const li = input.closest('li')
    const mark = input.hasAttribute('checked') ? '☑ ' : '☐ '
    input.replaceWith(doc.createTextNode(mark))
    if (li)
      li.setAttribute('data-ln-task', mark.startsWith('☑') ? 'done' : 'todo')
  }
}

/** Makes the document structural; called by the sanitiser before it filters. */
export function normalizePasteDoc(doc: Document, source: PasteSource): void {
  if (source === 'gdocs') {
    unwrapDocsGuid(doc)
    nestFlatLists(doc)
  }
  if (source === 'word') wordLists(doc)
  if (source === 'chat') chatShapes(doc)
  checkboxes(doc)
  stylesToTags(doc)
  if (source === 'apple' || source === 'gdocs' || source === 'web') {
    sizedHeadings(doc)
  }
}

// ---- Markdown and tree text ----------------------------------------------

/** A line drawn like a folder tree. */
export const isTreeLine = (line: string): boolean =>
  /[├└│]/.test(line) || /^\s*[|`]-{2,}\s/.test(line)

/**
 * Splits text into runs of ordinary lines and runs of tree-drawing lines (a
 * title line directly above a tree, like "project/", stays with the tree).
 * Null when no tree is present.
 */
export function treeSegments(
  text: string,
): { code: boolean; text: string }[] | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  if (!lines.some(isTreeLine)) return null
  const out: { code: boolean; text: string }[] = []
  let i = 0
  while (i < lines.length) {
    if (isTreeLine(lines[i])) {
      let j = i
      // blank lines inside the tree stay if more tree follows
      while (
        j < lines.length &&
        (isTreeLine(lines[j]) ||
          (lines[j].trim() === '' &&
            j + 1 < lines.length &&
            isTreeLine(lines[j + 1])))
      ) {
        j++
      }
      const start = i
      const prev = out[out.length - 1]
      // The root line right above the first tree line joins the tree.
      if (prev && !prev.code) {
        const pl = prev.text.split('\n')
        const root = pl[pl.length - 1]
        if (root.trim() !== '' && /[/\\]\s*$|^\S+$/.test(root.trim())) {
          pl.pop()
          prev.text = pl.join('\n')
          if (prev.text === '') out.pop()
          out.push({
            code: true,
            text: [root, ...lines.slice(start, j)].join('\n'),
          })
          i = j
          continue
        }
      }
      out.push({ code: true, text: lines.slice(start, j).join('\n') })
      i = j
    } else {
      let j = i
      while (j < lines.length && !isTreeLine(lines[j])) j++
      out.push({ code: false, text: lines.slice(i, j).join('\n') })
      i = j
    }
  }
  return out
}

/** Markdown text with every un-fenced tree drawing put in a code fence. */
export function fenceTrees(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let inFence = false
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      out.push(line)
      i++
      continue
    }
    if (!inFence && isTreeLine(line)) {
      let j = i
      while (j < lines.length && isTreeLine(lines[j])) j++
      // the root line above joins the tree
      const prev = out[out.length - 1]
      let root: string | undefined
      if (
        prev &&
        /^[^\s#>*-][^\s]*[/\\]?$/.test(prev.trim()) &&
        prev.trim() !== ''
      ) {
        root = out.pop()
      }
      out.push(
        '```',
        ...(root !== undefined ? [root] : []),
        ...lines.slice(i, j),
        '```',
      )
      i = j
      continue
    }
    out.push(line)
    i++
  }
  return out.join('\n')
}

/** Does plain text look like Markdown (AI chats, .md files)? */
export function looksLikeMarkdown(text: string): boolean {
  if (text.length < 4 || text.length > 400_000) return false
  const t = text.replace(/\r\n?/g, '\n')
  let signals = 0
  if (/^(```|~~~)/m.test(t)) signals += 2
  if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/m.test(t)) signals += 2
  if (/^#{1,6}\s+\S/m.test(t)) signals += 1
  if ((t.match(/^\s*([-*+]|\d+[.)])\s+\S/gm) ?? []).length >= 2) signals += 1
  if (/\*\*[^*\n]+\*\*/.test(t)) signals += 1
  if (/^>\s+\S/m.test(t)) signals += 1
  if (/\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/.test(t)) signals += 1
  if (/^\s*[-*]\s+\[[ xX]\]\s/m.test(t)) signals += 1
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/m.test(t)) signals += 1
  return signals >= 2
}

/** HTML that holds real structure (not just paragraphs and spans)? */
export function htmlHasStructure(cleanHtml: string): boolean {
  return /<(h[1-6]|ul|ol|table|pre|blockquote|hr|details|img)\b/i.test(
    cleanHtml,
  )
}

/** HTML with any formatting at all (marks or structure)? */
export function htmlHasFormatting(cleanHtml: string): boolean {
  return (
    htmlHasStructure(cleanHtml) ||
    /<(strong|b|em|i|u|s|del|a|code|mark|sub|sup)\b/i.test(cleanHtml)
  )
}

/** Pipe-table rows from Markdown text (header row first), or null. */
export function markdownTableRows(text: string): string[][] | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const rows: string[][] = []
  let seen = false
  for (const line of lines) {
    const l = line.trim()
    if (!l.startsWith('|') && !/\S\s*\|\s*\S/.test(l)) {
      if (seen) break
      continue
    }
    const cells = l
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) {
      seen = true
      continue
    }
    rows.push(cells)
    seen = seen || rows.length > 0
  }
  if (rows.length < 2 || !lines.some((l) => /^\s*\|?\s*:?-{3,}/.test(l)))
    return null
  const cols = Math.max(...rows.map((r) => r.length))
  return rows.map((r) => [...r, ...Array(cols - r.length).fill('')])
}
