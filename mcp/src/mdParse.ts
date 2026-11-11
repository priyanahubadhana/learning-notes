import type { SpecBlock } from '../../src/connector/spec'

/**
 * Markdown -> spec blocks, for append_to_page. Reads headings (# to ###; deeper
 * levels become ###), paragraphs, bullet / numbered / to-do lists (nested by
 * indent), quotes, fenced code, dividers and pipe tables. Inline styles (bold,
 * italic, code, https links) stay in the text and are turned into rich text
 * by the shared builder. Anything else is plain text: no HTML, no scripts.
 * The result is checked by spec.ts, which also sets the size limits.
 */

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const DIVIDER = /^\s*([-*_])(\s*\1){2,}\s*$/
const SEPARATOR = /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/

const cells = (line: string): string[] => {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

export function markdownToBlocks(markdown: string): SpecBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const out: SpecBlock[] = []
  let stack: { indent: number; block: SpecBlock }[] = []
  let para: string[] = []
  let quoting = false
  const flush = () => {
    if (para.length) out.push({ type: 'paragraph', text: para.join(' ') })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const wasQuote = quoting
    quoting = false
    if (/^\s*```/.test(line)) {
      flush()
      stack = []
      const lang = line.trim().slice(3).trim()
      const body: string[] = []
      i++
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i]))
        body.push(lines[i++])
      out.push({
        type: 'codeBlock',
        ...(lang ? { language: lang.split(/\s/)[0] } : {}),
        text: body.join('\n'),
      })
      continue
    }
    if (line.trim() === '') {
      flush()
      stack = []
      continue
    }
    const trimmed = line.trim()
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(trimmed)
    if (heading) {
      flush()
      stack = []
      out.push({
        type: 'heading',
        level: Math.min(heading[1].length, 3) as 1 | 2 | 3,
        text: heading[2],
      })
      continue
    }
    if (DIVIDER.test(line)) {
      flush()
      stack = []
      out.push({ type: 'divider' })
      continue
    }
    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      flush()
      stack = []
      const prev = out[out.length - 1]
      if (wasQuote && prev?.type === 'quote')
        prev.text = `${prev.text}\n${quote[1]}`
      else out.push({ type: 'quote', text: quote[1] })
      quoting = true
      continue
    }
    if (trimmed.startsWith('|')) {
      flush()
      stack = []
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        if (!SEPARATOR.test(lines[i].trim())) rows.push(cells(lines[i]))
        i++
      }
      i--
      if (rows.length) out.push({ type: 'table', rows })
      continue
    }
    const item = LIST.exec(line)
    if (item) {
      flush()
      const indent = item[1].replace(/\t/g, '    ').length
      let block: SpecBlock
      const todo = /^\[([ xX])\]\s+(.*)$/.exec(item[3])
      if (todo) {
        block = {
          type: 'checkListItem',
          checked: todo[1] !== ' ',
          text: todo[2],
        }
      } else {
        block = {
          type: /^\d/.test(item[2]) ? 'numberedListItem' : 'bulletListItem',
          text: item[3],
        }
      }
      while (stack.length && stack[stack.length - 1].indent >= indent)
        stack.pop()
      const parent = stack[stack.length - 1]?.block
      if (parent) (parent.children ??= []).push(block)
      else out.push(block)
      stack.push({ indent, block })
      continue
    }
    // A plain line: part of the current paragraph.
    stack = []
    para.push(trimmed)
  }
  flush()
  return out
}
