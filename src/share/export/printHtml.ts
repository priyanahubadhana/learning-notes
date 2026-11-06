import type { ExportNode, ExportPage, Run } from './model'

/**
 * A printable page: one self-contained HTML document with print CSS, shown
 * in a hidden frame and sent to `print()` ("Save as PDF" on iPad and PC).
 * Pure text in, text out, so it can be tested without a browser.
 */

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const safeHref = (h: string): string | null =>
  /^(https?:|mailto:)/i.test(h) ? h : null

function runHtml(r: Run): string {
  let out = esc(r.text).replace(/\n/g, '<br>')
  if (r.code) out = `<code>${out}</code>`
  if (r.bold) out = `<strong>${out}</strong>`
  if (r.italic) out = `<em>${out}</em>`
  if (r.underline) out = `<u>${out}</u>`
  if (r.strike) out = `<s>${out}</s>`
  const style = [
    r.color ? `color:${r.color}` : '',
    r.bg ? `background:${r.bg}` : '',
  ]
    .filter(Boolean)
    .join(';')
  if (style) out = `<span style="${style}">${out}</span>`
  const href = r.href ? safeHref(r.href) : null
  return href ? `<a href="${esc(href)}">${out}</a>` : out
}

const inline = (runs: readonly Run[]): string => runs.map(runHtml).join('')

function nodesHtml(
  nodes: readonly ExportNode[],
  imageUrl: (id: string) => string | undefined,
  base: number,
): string {
  const out: string[] = []
  let i = 0
  while (i < nodes.length) {
    const n = nodes[i]
    // Consecutive list items of one kind share one list.
    if (n.kind === 'bullet' || n.kind === 'number' || n.kind === 'toggle') {
      const tag = n.kind === 'number' ? 'ol' : 'ul'
      const items: string[] = []
      while (
        i < nodes.length &&
        (nodes[i].kind === n.kind ||
          (n.kind === 'bullet' && nodes[i].kind === 'toggle'))
      ) {
        const m = nodes[i]
        items.push(
          `<li>${inline(m.runs)}${m.children.length ? nodesHtml(m.children, imageUrl, base) : ''}</li>`,
        )
        i++
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }
    i++
    const kids = n.children.length
      ? `<div class="kids">${nodesHtml(n.children, imageUrl, base)}</div>`
      : ''
    switch (n.kind) {
      case 'heading':
        out.push(
          `<h${Math.min(6, base + (n.level ?? 1))}>${inline(n.runs)}</h${Math.min(6, base + (n.level ?? 1))}>${kids}`,
        )
        break
      case 'todo':
        out.push(
          `<p class="todo">${n.checked ? '&#9745;' : '&#9744;'} ${inline(n.runs)}</p>${kids}`,
        )
        break
      case 'quote':
        out.push(`<blockquote>${inline(n.runs)}${kids}</blockquote>`)
        break
      case 'callout':
        out.push(`<p class="callout">&#128161; ${inline(n.runs)}</p>${kids}`)
        break
      case 'card':
        out.push(
          `<p class="card"><strong>Q:</strong> ${inline(n.runs)}</p>${kids}`,
        )
        break
      case 'code':
        out.push(`<pre>${esc(n.runs.map((r) => r.text).join(''))}</pre>`)
        break
      case 'divider':
        out.push('<hr>')
        break
      case 'image': {
        const src = n.imageId ? imageUrl(n.imageId) : undefined
        if (src)
          out.push(
            `<figure><img src="${esc(src)}" alt="${esc(n.caption ?? '')}">${n.caption ? `<figcaption>${esc(n.caption)}</figcaption>` : ''}</figure>`,
          )
        else if (n.imageUrl && safeHref(n.imageUrl))
          out.push(`<p><a href="${esc(n.imageUrl)}">${esc(n.imageUrl)}</a></p>`)
        break
      }
      case 'table':
        out.push(
          `<table>${(n.rows ?? [])
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`,
            )
            .join('')}</table>`,
        )
        break
      case 'plain':
        out.push(`<pre>${esc(n.runs.map((r) => r.text).join(''))}</pre>`)
        break
      default:
        out.push(`<p>${inline(n.runs) || '&nbsp;'}</p>${kids}`)
    }
  }
  return out.join('')
}

function pageHtml(
  page: ExportPage,
  level: number,
  imageUrl: (id: string) => string | undefined,
  inkUrl: (p: ExportPage) => string | undefined,
): string {
  const ink = inkUrl(page)
  return (
    `<section class="page"><h${Math.min(6, level)} class="title">${esc(page.title || 'Untitled')}</h${Math.min(6, level)}>` +
    nodesHtml(page.nodes, imageUrl, level) +
    (ink ? `<figure><img class="ink" src="${esc(ink)}" alt=""></figure>` : '') +
    `</section>` +
    page.children.map((c) => pageHtml(c, level + 1, imageUrl, inkUrl)).join('')
  )
}

const CSS = `
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { font: 11pt/1.55 -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", sans-serif; color: #1d1d1f; margin: 0; }
h1,h2,h3,h4,h5,h6 { line-height: 1.25; margin: 1.1em 0 .35em; break-after: avoid; }
h1 { font-size: 22pt; } h2 { font-size: 17pt; } h3 { font-size: 14pt; } h4,h5,h6 { font-size: 12pt; }
p { margin: .35em 0; } ul,ol { margin: .3em 0; padding-inline-start: 1.5em; }
blockquote { margin: .5em 0; padding-inline-start: 1em; border-inline-start: 3px solid #c7c7cc; color: #3a3a3c; font-style: italic; }
.callout { background: #f5f5f7; padding: .5em .8em; border-radius: 6px; }
.kids { margin-inline-start: 1.5em; }
pre, code { font-family: Consolas, "SF Mono", Menlo, monospace; }
pre { background: #f5f5f7; padding: .6em .8em; white-space: pre-wrap; border-radius: 6px; font-size: 9.5pt; }
table { border-collapse: collapse; margin: .5em 0; width: 100%; }
td { border: 1px solid #c7c7cc; padding: 4px 8px; vertical-align: top; }
img { max-width: 100%; height: auto; } figure { margin: .6em 0; break-inside: avoid; }
figcaption { color: #6e6e73; font-size: 9.5pt; }
hr { border: 0; border-top: 1px solid #c7c7cc; margin: 1em 0; }
.page { break-after: page; } .page:last-child { break-after: auto; }
a { color: #0b57d0; }
`

/** The whole printable document for some pages (sub-pages follow their page). */
export function printHtml(
  pages: readonly ExportPage[],
  options: {
    title?: string
    lang?: string
    imageUrl?: (id: string) => string | undefined
    inkUrl?: (p: ExportPage) => string | undefined
  } = {},
): string {
  const imageUrl = options.imageUrl ?? (() => undefined)
  const inkUrl = options.inkUrl ?? (() => undefined)
  return (
    `<!doctype html><html lang="${esc(options.lang ?? 'en')}"><head><meta charset="utf-8">` +
    `<title>${esc(options.title ?? '')}</title><style>${CSS}</style></head><body>` +
    pages.map((p) => pageHtml(p, 1, imageUrl, inkUrl)).join('') +
    `</body></html>`
  )
}
