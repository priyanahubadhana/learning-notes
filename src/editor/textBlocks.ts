import type { BlockInput } from '../core/blockBulk'
import type { JsonObject, JsonValue } from '../core/types'
import { isHttpsUrl } from '../core/sourceCheck'

/**
 * Plain text, Markdown and (already cleaned) HTML to block inputs, for
 * Capture (CR1), the AI notes import (CR2) and DOCX books (C1). Only the rich
 * text run shape `{ type: 'text', text, styles }` and `{ type: 'link', href,
 * content }` is used, the same shape `mapping.ts` stores; nothing here knows
 * more of the editor than that.
 */

type Run = JsonObject

const run = (text: string, styles: JsonObject = {}): Run => ({
  type: 'text',
  text,
  styles,
})

/** Paragraph/heading/list content from runs. */
const para = (text: Run[]): BlockInput => ({
  type: 'paragraph',
  content: { text },
})

/** Longest single block text kept (a pasted wall of text is split earlier). */
const MAX_BLOCK_CHARS = 5000

/** Splits very long text at sentence ends so no block is enormous. */
function splitLong(text: string): string[] {
  if (text.length <= MAX_BLOCK_CHARS) return [text]
  const out: string[] = []
  let rest = text
  while (rest.length > MAX_BLOCK_CHARS) {
    let cut = rest.lastIndexOf('. ', MAX_BLOCK_CHARS)
    if (cut < MAX_BLOCK_CHARS / 2) cut = rest.lastIndexOf(' ', MAX_BLOCK_CHARS)
    if (cut < 1) cut = MAX_BLOCK_CHARS
    out.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) out.push(rest)
  return out
}

/** Inline Markdown: **bold**, *italic*, `code`, [text](https://link). */
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = []
  const pattern =
    /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0
    if (at > last) runs.push(run(text.slice(last, at)))
    if (m[1] ?? m[2]) runs.push(run(m[1] ?? m[2], { bold: true }))
    else if (m[3]) runs.push(run(m[3], { italic: true }))
    else if (m[4]) runs.push(run(m[4], { code: true }))
    else if (m[5] && isHttpsUrl(m[6])) {
      runs.push({
        type: 'link',
        href: m[6],
        content: [run(m[5])] as JsonValue[],
      })
    } else runs.push(run(m[0]))
    last = at + m[0].length
  }
  if (last < text.length) runs.push(run(text.slice(last)))
  return runs.length ? runs : []
}

/** Text of a line with its Markdown list/heading marker removed, and the kind. */
function classify(line: string): BlockInput | null {
  const heading = /^(#{1,6})\s+(.*)$/.exec(line)
  if (heading) {
    return {
      type: 'heading',
      content: {
        level: Math.min(heading[1].length, 3),
        text: inlineRuns(heading[2].trim()),
      },
    }
  }
  const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
  if (bullet) {
    return {
      type: 'bulletListItem',
      content: { text: inlineRuns(bullet[1].trim()) },
    }
  }
  const numbered = /^\s*\d{1,3}[.)]\s+(.*)$/.exec(line)
  if (numbered) {
    return {
      type: 'numberedListItem',
      content: { text: inlineRuns(numbered[1].trim()) },
    }
  }
  return null
}

/**
 * Plain text or simple Markdown to blocks. Lines that start a heading or a
 * list item become that block; other lines join into paragraphs split at
 * blank lines. Indented list items nest under the item above.
 */
export function markdownToBlocks(source: string): BlockInput[] {
  const out: BlockInput[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length === 0) return
    for (const part of splitLong(paragraph.join(' ').replace(/\s+/g, ' '))) {
      out.push(para(inlineRuns(part)))
    }
    paragraph = []
  }
  // Nesting: the last top-level list item collects deeper-indented items.
  let parent: BlockInput | null = null
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (line.trim() === '') {
      flush()
      parent = null
      continue
    }
    const block = classify(line)
    if (!block) {
      parent = null
      const quote = /^>\s?(.*)$/.exec(line)
      paragraph.push((quote ? quote[1] : line).trim())
      continue
    }
    flush()
    const indent = /^\s*/.exec(line)?.[0].length ?? 0
    const isList = block.type !== 'heading'
    if (isList && indent >= 2 && parent) {
      ;(parent.children ??= []).push(block)
    } else {
      out.push(block)
      parent = isList ? block : null
    }
  }
  flush()
  return out
}

// ---- HTML (already cleaned by sanitizePastedHtml) ----

function styleOf(el: Element, styles: JsonObject): JsonObject {
  const tag = el.tagName.toLowerCase()
  if (tag === 'strong' || tag === 'b') return { ...styles, bold: true }
  if (tag === 'em' || tag === 'i') return { ...styles, italic: true }
  if (tag === 'u') return { ...styles, underline: true }
  if (tag === 'code') return { ...styles, code: true }
  return styles
}

function runsOf(node: Node, styles: JsonObject = {}): Run[] {
  const out: Run[] = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ')
      if (text) out.push(run(text, styles))
    } else if (child.nodeType === 1) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'br') out.push(run(' ', styles))
      else if (tag === 'a') {
        const href = el.getAttribute('href') ?? ''
        const inner = runsOf(el, styles)
        if (isHttpsUrl(href) && inner.length) {
          out.push({ type: 'link', href, content: inner as JsonValue[] })
        } else out.push(...inner)
      } else if (!['script', 'style', 'img'].includes(tag)) {
        out.push(...runsOf(el, styleOf(el, styles)))
      }
    }
  })
  return out
}

/** Trims the first and last run so blocks do not start or end with spaces. */
function trimRuns(runs: Run[]): Run[] {
  if (runs.length === 0) return runs
  const copy = runs.map((r) => ({ ...r }))
  const first = copy[0]
  const last = copy[copy.length - 1]
  if (first.type === 'text') first.text = String(first.text).replace(/^\s+/, '')
  if (last.type === 'text') last.text = String(last.text).replace(/\s+$/, '')
  return copy.filter((r) => r.type !== 'text' || r.text !== '')
}

/**
 * Cleaned HTML to blocks: headings h1 to h6 (levels above 3 become 3),
 * paragraphs, quotes and preformatted text as paragraphs, lists (nested).
 * `levelShift` lowers every heading level (1 = h1 becomes level 2).
 */
export function htmlToBlocks(html: string, levelShift = 0): BlockInput[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: BlockInput[] = []

  const listItems = (list: Element, type: string): BlockInput[] =>
    Array.from(list.children)
      .filter((li) => li.tagName.toLowerCase() === 'li')
      .map((li) => {
        const nested = Array.from(li.children).filter((c) =>
          ['ul', 'ol'].includes(c.tagName.toLowerCase()),
        )
        const clone = li.cloneNode(true) as Element
        clone.querySelectorAll('ul, ol').forEach((n) => n.remove())
        const children = nested.flatMap((n) =>
          listItems(
            n,
            n.tagName.toLowerCase() === 'ol'
              ? 'numberedListItem'
              : 'bulletListItem',
          ),
        )
        return {
          type,
          content: { text: trimRuns(runsOf(clone)) },
          ...(children.length ? { children } : {}),
        }
      })

  const walk = (parent: Element) => {
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName.toLowerCase()
      if (/^h[1-6]$/.test(tag)) {
        const runs = trimRuns(runsOf(el))
        if (runs.length) {
          out.push({
            type: 'heading',
            content: {
              level: Math.min(Number(tag[1]) + levelShift, 3),
              text: runs,
            },
          })
        }
      } else if (tag === 'ul') out.push(...listItems(el, 'bulletListItem'))
      else if (tag === 'ol') out.push(...listItems(el, 'numberedListItem'))
      else if (['p', 'blockquote', 'pre', 'figcaption'].includes(tag)) {
        const runs = trimRuns(runsOf(el))
        if (runs.length) out.push(para(runs))
      } else if (tag === 'table') {
        el.querySelectorAll('tr').forEach((tr) => {
          const text = Array.from(tr.children)
            .map((c) => (c.textContent ?? '').trim())
            .join(' · ')
          if (text) out.push(para([run(text)]))
        })
      } else walk(el)
    }
  }
  walk(doc.body)
  // Loose text with no block tags: treat it as plain text.
  if (out.length === 0 && (doc.body.textContent ?? '').trim()) {
    return markdownToBlocks(doc.body.textContent ?? '')
  }
  return out
}
