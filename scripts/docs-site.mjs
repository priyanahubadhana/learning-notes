// Turns the repo's markdown (docs/**) into a formatted, interactive static site (site/).
// No AI, no network: a program. Run: node scripts/docs-site.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked, Renderer } from 'marked'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')
const OUT = path.join(ROOT, 'site')
const GH = 'https://github.com/priyanahubadhana/learning-notes/blob/main/'
const SITE_NAME = 'Learning Notes docs'
const EXCLUDED = ['ARCHIVE.md', 'plans/archive/', 'prototypes/']

const posix = path.posix
const marked = new Marked({ gfm: true })
let ctx = null // per-render state: { rel, headings, ids, assets }

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const plain = (s) =>
  String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
const slug = (s) =>
  plain(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section'

export function isExcluded(rel) {
  return EXCLUDED.some((e) => (e.endsWith('/') ? rel.startsWith(e) : rel === e))
}

function relTo(fromRel, targetRel) {
  return (
    posix.relative(posix.dirname(fromRel), targetRel) ||
    posix.basename(targetRel)
  )
}

function rewriteHref(href, fromRel) {
  if (!href || /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return href
  const m = href.match(/^([^#?]*)([?#].*)?$/)
  const p = decodeURI(m[1])
  const tail = m[2] || ''
  if (!p) return href
  const repoPath = posix.normalize(
    posix.join('docs', posix.dirname(fromRel), p),
  )
  const abs = path.join(ROOT, repoPath)
  if (repoPath.startsWith('..') || !fs.existsSync(abs)) return href
  const inDocs = repoPath.startsWith('docs/')
  const docRel = inDocs ? repoPath.slice(5) : null
  if (inDocs && fs.statSync(abs).isFile()) {
    if (docRel.endsWith('.md')) {
      if (!isExcluded(docRel))
        return relTo(fromRel, docRel.replace(/\.md$/, '.html')) + tail
    } else {
      ctx?.assets.add(docRel)
      return relTo(fromRel, docRel) + tail
    }
  }
  return GH + repoPath + tail
}

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens)
      let id = slug(inner)
      if (ctx) {
        let n = 1
        const base = id
        while (ctx.ids.has(id)) id = `${base}-${++n}`
        ctx.ids.add(id)
        if (depth === 2 || depth === 3)
          ctx.headings.push({ depth, t: plain(inner), id })
      }
      const a =
        depth > 1
          ? `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`
          : ''
      return `<h${depth} id="${id}">${inner}${a}</h${depth}>\n`
    },
    link({ href, title, tokens }) {
      const h = rewriteHref(href, ctx ? ctx.rel : '')
      const t = title ? ` title="${esc(title)}"` : ''
      return `<a href="${esc(h)}"${t}>${this.parser.parseInline(tokens)}</a>`
    },
    image({ href, title, text }) {
      const h = rewriteHref(href, ctx ? ctx.rel : '')
      const t = title ? ` title="${esc(title)}"` : ''
      return `<img src="${esc(h)}" alt="${esc(text)}"${t} loading="lazy">`
    },
    html({ text }) {
      // keep comments and ordinary tags; show things like <date> as text
      const ok =
        /^<(!--|\/?(details|summary|br|kbd|sup|sub|b|i|em|strong|p|div|span|img|a|ul|ol|li|table|thead|tbody|tr|td|th|hr|h[1-6]|code|pre|u|s|figure|figcaption))/i
      return ok.test(text) ? text : esc(text)
    },
    table(token) {
      return `<div class="tw">${Renderer.prototype.table.call(this, token)}</div>`
    },
  },
})

const inline = (s) => marked.parseInline(s)
const cellText = (c) => c.text

function badgesFrom(table) {
  const want = ['Status', 'Switch', 'Phase', 'Last change']
  const badges = []
  const rest = []
  table.header.forEach((h, i) => {
    const name = cellText(h)
    const val = cellText(table.rows[0]?.[i] ?? { text: '' })
    const key = want.find((w) => name.toLowerCase().startsWith(w.toLowerCase()))
    if (key) badges.push({ key, name, val })
    else rest.push({ name, val })
  })
  let html = '<div class="badges">'
  for (const b of badges) {
    const ok =
      b.key === 'Status' &&
      /^(built|verified|live|confirmed)/i.test(b.val.trim())
    const cls = b.key === 'Status' ? `badge status${ok ? ' ok' : ''}` : 'badge'
    html += `<span class="${cls}"><small>${esc(b.name)}</small>${inline(b.val)}</span>`
  }
  html += '</div>'
  if (rest.length) {
    html += '<details class="facts"><summary>More facts</summary><dl>'
    for (const r of rest)
      html += `<dt>${esc(r.name)}</dt><dd>${inline(r.val)}</dd>`
    html += '</dl></details>'
  }
  return { html, status: badges.find((b) => b.key === 'Status')?.val ?? '' }
}

function row(id, label, stmtHtml, buttons, numHtml) {
  const btns = buttons
    .map(
      ([v, t]) =>
        `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`,
    )
    .join('')
  return (
    `<div class="crow" data-id="${id}" data-label="${esc(label)}">` +
    `<div class="stmt">${numHtml}${stmtHtml}</div>` +
    `<div class="acts" role="group" aria-label="${esc(label)}">${btns}</div>` +
    `<textarea rows="2" placeholder="Your note (optional)" aria-label="Note for ${esc(label)}" hidden></textarea>` +
    `</div>`
  )
}

function confirmSheet(table) {
  const btns = [
    ['yes', 'Yes'],
    ['explain', 'Explain again'],
    ['change', 'Change to'],
  ]
  const rows = table.rows.map((r, i) => {
    const num = plain(cellText(r[0])) || String(i + 1)
    const stmt = inline(r.slice(1).map(cellText).join(' '))
    return row(
      `c${num}`,
      `Row ${num}`,
      stmt,
      btns,
      `<span class="num">${esc(num)}.</span>`,
    )
  })
  return `<div class="sheet">${rows.join('')}</div>`
}

function questionWidget(n) {
  return `<div class="qs">${row(
    `q${n}`,
    `Q${n}`,
    `<em>Your answer to Q${n}</em>`,
    [
      ['A', 'A'],
      ['B', 'B'],
      ['other', 'Other'],
    ],
    '',
  )}</div>`
}

/** Split the markdown at the `---` before a heading containing "Bottom layer". */
function splitLayers(md) {
  const re = /\n---[ \t]*\n+(#{1,6}[^\n]*Bottom layer[^\n]*)\n/i
  const m = re.exec(md)
  if (!m) return { top: md, bottom: null }
  return {
    top: md.slice(0, m.index),
    bottom: md.slice(m.index + m[0].length - 1 - m[1].length),
  }
}

function renderTokens(tokens, opts = {}) {
  const out = []
  let mode = null // 'confirm' | 'questions' | 'mustnever'
  let hasWidgets = false
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'heading' && t.depth <= 2) mode = null
    if (t.type === 'heading' && t.depth === 2) {
      if (/confirm sheet/i.test(t.text)) mode = 'confirm'
      else if (/main questionnaire|plan questions/i.test(t.text))
        mode = 'questions'
    }
    if (t.type === 'table' && mode === 'confirm') {
      out.push(confirmSheet(t))
      hasWidgets = true
      mode = null
      continue
    }
    if (t.type === 'paragraph' && mode === 'questions') {
      const q = /^\*\*Q(\d+)\./.exec(t.raw.trim())
      if (q) {
        out.push(marked.parser([t]) + questionWidget(q[1]))
        hasWidgets = true
        continue
      }
    }
    if (t.type === 'paragraph' && /^\*\*Must never/i.test(t.raw.trim())) {
      // the bold label and the list that follows share a red-bordered block
      const next = tokens[i + 1]
      if (next && next.type === 'list') {
        out.push(`<div class="must-never">${marked.parser([t, next])}</div>`)
        i++
        continue
      }
    }
    if (t.type === 'space') continue
    out.push(marked.parser([t]))
  }
  return { html: out.join(''), hasWidgets }
}

function tocHtml(headings) {
  if (headings.length < 2) return ''
  const li = headings
    .map(
      (h) => `<li class="l${h.depth}"><a href="#${h.id}">${esc(h.t)}</a></li>`,
    )
    .join('')
  return `<nav class="toc" aria-label="On this page"><details open><summary>On this page</summary><ul>${li}</ul></details></nav>`
}

function shell({
  title,
  rel,
  bodyHtml,
  toc = '',
  widgets = false,
  home = false,
}) {
  const depth = posix.dirname(rel) === '.' ? 0 : rel.split('/').length - 1
  const base = '../'.repeat(depth)
  const bar = widgets
    ? `<div class="copybar" id="copybar"><span class="count"></span><button class="copy" type="button">Copy my answers</button></div>` +
      `<div class="fallback" id="fallback"><p>Select all and copy this text:</p><textarea readonly aria-label="Your answers"></textarea><button type="button">Close</button></div>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${SITE_NAME}</title>
<link rel="stylesheet" href="${base}assets/site.css">
</head>
<body data-base="${base}" data-page="${esc(rel)}">
<header class="top">
<a class="name" href="${base}index.html">${SITE_NAME}</a>
<div class="search"><input id="q" type="search" placeholder="Search the docs" aria-label="Search the docs" autocomplete="off"><div class="hits" id="hits"></div></div>
</header>
<div class="layout${home ? ' home' : ''}">
${toc}
<main>
${bodyHtml}
</main>
</div>
${bar}
<script src="${base}assets/site.js"></script>
</body>
</html>
`
}

/** Render one markdown file. Returns the page and what the index needs. */
export function render(md, rel) {
  ctx = { rel, headings: [], ids: new Set(), assets: new Set() }
  try {
    const { top, bottom } = splitLayers(md)
    const topTokens = marked.lexer(top)
    let badges = ''
    let status = ''
    const ti = topTokens.findIndex(
      (t) =>
        t.type === 'table' && t.header.some((h) => /status/i.test(cellText(h))),
    )
    if (ti >= 0 && ti < 6) {
      const b = badgesFrom(topTokens[ti])
      badges = b.html
      status = b.status
      topTokens.splice(ti, 1)
    }
    const h1i = topTokens.findIndex(
      (t) => t.type === 'heading' && t.depth === 1,
    )
    const title =
      h1i >= 0 ? plain(inline(topTokens[h1i].text)) : posix.basename(rel, '.md')
    let h1Html = ''
    if (h1i >= 0) {
      h1Html = marked.parser([topTokens[h1i]])
      topTokens.splice(h1i, 1)
    }
    const first = topTokens.find((t) => t.type === 'paragraph')
    const desc = first ? plain(inline(first.text)).slice(0, 140) : ''
    const topR = renderTokens(topTokens)
    let bottomHtml = ''
    let widgets = topR.hasWidgets
    if (bottom) {
      const bt = marked.lexer(bottom)
      const hd = bt.shift()
      const hid = slug(hd.text)
      ctx.ids.add(hid)
      ctx.headings.push({ depth: 2, t: plain(hd.text), id: hid })
      const br = renderTokens(bt)
      widgets = widgets || br.hasWidgets
      bottomHtml = `<details class="bottom" id="${hid}"><summary>${esc(plain(inline(hd.text)))}</summary><div class="inner">${br.html}</div></details>`
    }
    const bodyHtml = badges + h1Html + topR.html + bottomHtml
    const html = shell({
      title,
      rel,
      bodyHtml,
      toc: tocHtml(ctx.headings),
      widgets,
    })
    return {
      html,
      title,
      status,
      desc,
      headings: ctx.headings,
      assets: [...ctx.assets],
    }
  } finally {
    ctx = null
  }
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, data)
}

function copyAsset(rel) {
  const src = path.join(DOCS, rel)
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true })
    fs.copyFileSync(src, path.join(OUT, rel))
  }
}

function card(p, depthPrefix = '') {
  const text =
    `${p.title} ${p.rel} ${p.headings.map((h) => h.t).join(' ')}`.toLowerCase()
  const status = p.status
    ? `<em>${inline(p.status).replace(/<[^>]+>/g, '')}</em>`
    : ''
  return `<a class="card" href="${depthPrefix}${p.out}" data-text="${esc(text)}"><b>${esc(p.title)}</b>${p.desc ? `<span>${esc(p.desc)}</span>` : ''}${status}</a>`
}

function homePage(pages) {
  const by = (rel) => pages.find((p) => p.rel === rel)
  const used = new Set()
  const take = (rels) =>
    rels
      .map((r) => by(r))
      .filter(Boolean)
      .map((p) => (used.add(p.rel), p))
  const galleryCard = {
    title: 'Method v2 pictures',
    rel: 'plans/method-v2/gallery.md',
    out: 'plans/method-v2/gallery.html',
    desc: 'The four approved pictures of the method.',
    headings: [],
    status: '',
  }
  const start = [
    ...take(['METHOD-v2.md', 'plans/phases/phase-pc-1.md']),
    galleryCard,
  ]
  const state = take(['STATE.md'])
  const specs = pages
    .filter(
      (p) =>
        p.rel.startsWith('features/') && !posix.basename(p.rel).startsWith('_'),
    )
    .sort((a, b) => {
      const pa = a.rel.startsWith('features/parts/') ? 0 : 1
      const pb = b.rel.startsWith('features/parts/') ? 0 : 1
      return pa - pb || a.rel.localeCompare(b.rel)
    })
  specs.forEach((p) => used.add(p.rel))
  const plans = pages
    .filter((p) => p.rel.startsWith('plans/') && !used.has(p.rel))
    .sort((a, b) => a.rel.localeCompare(b.rel))
  plans.forEach((p) => used.add(p.rel))
  const history = take([
    'DECISIONS.md',
    'CHANGELOG.md',
    'IDEAS.md',
    'LIMITATIONS.md',
    'ROADMAP.md',
  ])
  const other = pages
    .filter(
      (p) =>
        !used.has(p.rel) &&
        !posix.basename(p.rel).startsWith('_') &&
        !['PENDING.md', 'BUILD-STATE.md', 'HANDOFF.md'].includes(p.rel) &&
        (!p.rel.startsWith('archive/') || p.rel === 'archive/INDEX.md'),
    )
    .sort((a, b) => a.rel.localeCompare(b.rel))
  const sec = (name, list) =>
    list.length
      ? `<section><h2>${name}</h2><div class="cards">${list.map((p) => card(p)).join('')}</div></section>`
      : ''
  const body =
    `<h1>${SITE_NAME}</h1><p>Everything in the repo's docs, formatted. Tap a card, or search above.</p>` +
    sec('Start here', start) +
    sec('State', state) +
    sec('Specs', specs) +
    sec('Plans', plans) +
    sec('Decisions and history', history) +
    sec('Everything else', other)
  return shell({ title: 'Home', rel: 'index.md', bodyHtml: body, home: true })
}

function galleryPage() {
  const dir = path.join(DOCS, 'plans/method-v2')
  const pics = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => /\.png$/i.test(f))
        .sort()
    : []
  const figs = pics
    .map((f) => {
      const cap = f
        .replace(/\.png$/i, '')
        .replace(/^\d+-/, '')
        .replace(/-/g, ' ')
      const n = f.match(/^\d+/)?.[0] ?? ''
      return `<figure><a href="${f}"><img src="${f}" alt="${esc(cap)}" loading="lazy"></a><figcaption>Picture ${n}: ${esc(cap)}</figcaption></figure>`
    })
    .join('')
  const body = `<h1>Method v2 pictures</h1><p>The approved pictures of the method. Tap one to open it full size.</p><div class="gallery">${figs}</div>`
  return shell({
    title: 'Method v2 pictures',
    rel: 'plans/method-v2/gallery.md',
    bodyHtml: body,
  })
}

export function build() {
  fs.rmSync(OUT, { recursive: true, force: true })
  const files = walk(DOCS)
    .map((f) =>
      posix.relative(
        DOCS.split(path.sep).join('/'),
        f.split(path.sep).join('/'),
      ),
    )
    .filter((r) => r.endsWith('.md') && !isExcluded(r))
  const pages = []
  const assets = new Set([
    'plans/method-v2/pictures.html',
    'plans/method-v2/timeline.html',
  ])
  for (const rel of files) {
    const r = render(fs.readFileSync(path.join(DOCS, rel), 'utf8'), rel)
    const out = rel.replace(/\.md$/, '.html')
    write(path.join(OUT, out), r.html)
    r.assets.forEach((a) => assets.add(a))
    pages.push({
      rel,
      out,
      title: r.title,
      status: r.status,
      desc: r.desc,
      headings: r.headings,
    })
  }
  const dir = path.join(DOCS, 'plans/method-v2')
  if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir))
      if (/\.png$/i.test(f)) assets.add(`plans/method-v2/${f}`)
  assets.forEach(copyAsset)
  write(path.join(OUT, 'plans/method-v2/gallery.html'), galleryPage())
  write(path.join(OUT, 'index.html'), homePage(pages))
  const index = pages.map((p) => ({
    title: p.title,
    path: p.out,
    headings: p.headings.map((h) => ({ t: h.t, id: h.id })),
  }))
  index.push({
    title: 'Method v2 pictures',
    path: 'plans/method-v2/gallery.html',
    headings: [],
  })
  write(path.join(OUT, 'assets/search.json'), JSON.stringify(index))
  fs.copyFileSync(
    path.join(ROOT, 'scripts/docs-site/site.css'),
    path.join(OUT, 'assets/site.css'),
  )
  fs.copyFileSync(
    path.join(ROOT, 'scripts/docs-site/site.js'),
    path.join(OUT, 'assets/site.js'),
  )
  write(path.join(OUT, '.nojekyll'), '')
  return pages.length
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const n = build()
  console.log(`docs-site: ${n} pages written to site/`)
}
