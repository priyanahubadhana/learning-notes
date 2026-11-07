import { runsText, type ExportNode, type ExportPage, type Run } from './model'

/** Words Markdown would read as marks get a backslash. */
const escapeMd = (s: string): string => s.replace(/([\\*_`[\]<>])/g, '\\$1')

/** One run as Markdown, keeping outer spaces outside the marks. */
function runMd(r: Run): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.text)
  const [, pre, core, post] = m ?? ['', '', r.text, '']
  if (core === '') return r.text
  let out = r.code ? `\`${core.replace(/`/g, "'")}\`` : escapeMd(core)
  if (r.strike) out = `~~${out}~~`
  if (r.italic) out = `*${out}*`
  if (r.bold) out = `**${out}**`
  if (r.underline) out = `<u>${out}</u>`
  if (r.href) out = `[${out}](${r.href.replace(/\)/g, '%29')})`
  return pre + out + post
}

const inlineMd = (runs: readonly Run[]): string => runs.map(runMd).join('')

/** Names the picture file for the zip: images/1.png … */
export type ImageName = (id: string) => string | null

function nodeMd(
  nodes: readonly ExportNode[],
  depth: number,
  imageName: ImageName,
  out: string[],
  base: number,
): void {
  const pad = '  '.repeat(depth)
  let counter = 0
  for (const n of nodes) {
    counter = n.kind === 'number' ? counter + 1 : 0
    const text = inlineMd(n.runs)
    const isItem = ['bullet', 'number', 'todo', 'toggle'].includes(n.kind)
    // A list ends with a blank line before anything that is not an item.
    if (!isItem && /^s*(- |d+. )/.test(out[out.length - 1] ?? '')) out.push('')
    switch (n.kind) {
      case 'heading':
        out.push(
          `${'#'.repeat(Math.min(6, base + (n.level ?? 1)))} ${text}`,
          '',
        )
        break
      case 'bullet':
      case 'toggle':
        out.push(`${pad}- ${text}`)
        break
      case 'number':
        out.push(`${pad}${counter}. ${text}`)
        break
      case 'todo':
        out.push(`${pad}- [${n.checked ? 'x' : ' '}] ${text}`)
        break
      case 'quote':
        out.push(`${pad}> ${text}`, '')
        break
      case 'callout':
        out.push(`${pad}> 💡 ${text}`, '')
        break
      case 'card':
        out.push(`${pad}**Q:** ${text}`, '')
        break
      case 'code':
        out.push(
          '```' + (n.lang && n.lang !== 'plaintext' ? n.lang : ''),
          runsText(n.runs),
          '```',
          '',
        )
        break
      case 'divider':
        out.push('---', '')
        break
      case 'image': {
        const file = n.imageId ? imageName(n.imageId) : null
        const target = file ?? n.imageUrl
        if (target) out.push(`![${escapeMd(n.caption ?? '')}](${target})`, '')
        break
      }
      case 'table': {
        const rows = (n.rows ?? []).map((r) =>
          r.map((c) => inlineMd(c).replace(/\|/g, '\\|').replace(/\n/g, ' ')),
        )
        if (rows.length === 0) break
        const width = Math.max(...rows.map((r) => r.length))
        const line = (r: string[]) =>
          `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`
        out.push(line(rows[0]), line(Array(width).fill('---')))
        for (const r of rows.slice(1)) out.push(line(r))
        out.push('')
        break
      }
      case 'plain':
        out.push(runsText(n.runs), '')
        break
      default:
        out.push(`${pad}${text}`, '')
    }
    const listLike = ['bullet', 'number', 'todo', 'toggle'].includes(n.kind)
    nodeMd(
      n.children,
      listLike || n.kind === 'card' ? depth + 1 : depth,
      imageName,
      out,
      base,
    )
  }
}

/** A page (and its sub-pages as deeper headings) as Markdown. */
export function pageMarkdown(
  page: ExportPage,
  imageName: ImageName = () => null,
  level = 1,
): string {
  const out: string[] = [
    `${'#'.repeat(Math.min(6, level))} ${escapeMd(page.title || 'Untitled')}`,
    '',
  ]
  nodeMd(page.nodes, 0, imageName, out, level)
  const text =
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  const subs = page.children.map((c) => pageMarkdown(c, imageName, level + 1))
  return [text, ...subs].join('\n')
}

/** The same content as plain text: no marks, lists with simple signs. */
export function pageText(page: ExportPage, depth = 0): string {
  const out: string[] = []
  const walk = (nodes: readonly ExportNode[], d: number) => {
    let counter = 0
    for (const n of nodes) {
      counter = n.kind === 'number' ? counter + 1 : 0
      const pad = '  '.repeat(d)
      const text = runsText(n.runs)
      if (n.kind === 'bullet' || n.kind === 'toggle')
        out.push(`${pad}• ${text}`)
      else if (n.kind === 'number') out.push(`${pad}${counter}. ${text}`)
      else if (n.kind === 'todo')
        out.push(`${pad}${n.checked ? '☑' : '☐'} ${text}`)
      else if (n.kind === 'divider') out.push('----------')
      else if (n.kind === 'table')
        for (const r of n.rows ?? []) out.push(r.map(runsText).join('\t'))
      else if (n.kind === 'image') {
        if (n.caption) out.push(`[${n.caption}]`)
      } else if (n.kind === 'card') out.push(`Q: ${text}`)
      else out.push(`${pad}${text}`)
      if (n.kind === 'heading' || n.kind === 'paragraph') out.push('')
      walk(
        n.children,
        ['bullet', 'number', 'todo', 'toggle', 'card'].includes(n.kind)
          ? d + 1
          : d,
      )
    }
  }
  out.push((page.title || 'Untitled').toUpperCase(), '')
  walk(page.nodes, depth)
  const text =
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  return [text, ...page.children.map((c) => pageText(c, depth))].join('\n')
}
