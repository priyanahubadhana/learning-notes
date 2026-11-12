/* ===================== Library v2 ===================== */
Object.assign(U, {
  ktags: [],
  ktAll: false,
  ktSub: true,
  qopen: false,
  stf: 'all',
  sideAll: false,
  ex: {
    scope: 'all',
    hl: true,
    note: true,
    mine: true,
    bm: true,
    cards: true,
    sum: true,
    recap: true,
    tags: true,
    key: false,
    cols: [],
    fmt: 'md',
  },
})
S.prefs.author = false
S.prefs.kstatsBeg = false
S.pins = ['habits', 'focus']
S.tagRecent = ['decisions', 'money', 'learning']
Object.assign(Shell.I, {
  play: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5z"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
})
const TYPES = [
  ['all', 'Everything', 'grid'],
  ['books', 'Books', 'book'],
  ['videos', 'Videos', 'video'],
  ['articles', 'Articles', 'article'],
  ['pasted', 'Pasted', 'paste'],
]
const typeName = (t) => (TYPES.find((x) => x[0] === t) || TYPES[0])[1]
const rer = () => {
  U.book ? renderBookBody() : renderMain(true)
}
/* the side panel tells the page whether shelves are on screen */
function syncSide() {
  const a = $('#app'),
    s = $('#sh-side')
  if (a && s)
    a.classList.toggle('noside', s.dataset.state !== 'dock' || Shell.isPhone())
}
new MutationObserver(syncSide).observe($('#sh-side'), {
  attributes: true,
  attributeFilter: ['data-state'],
})
addEventListener('resize', syncSide)
/* ---------- side panel: where things live (shelves, collections), nothing else ---------- */
function renderSide() {
  const shelf = (id, n, icn) =>
    `<button type="button" class="sb-i" data-a="shelf" data-id="${id}"${!U.book && U.tab === 'books' && U.shelf === id && !U.ktags.length ? ' aria-current="page"' : ''}>${ic(icn || 'folder')}<span class="g">${esc(n)}</span><span class="n">${counts(id)}</span></button>`
  const rec = [...books()].sort(
    (a, b) =>
      (a.opened == null ? 1e6 + a.added : a.opened) -
      (b.opened == null ? 1e6 + b.added : b.opened),
  )
  const list = U.sideAll ? rec : rec.slice(0, 5)
  const top = allTags()
    .map((t) => [t, cntTag(t)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  $('#sh-side').innerHTML =
    `<div class="sh-colhd"><h2>Shelves</h2><button type="button" class="ib sm" data-a="closeside" aria-label="Close the side panel">${ic('x')}</button></div>
 <div class="sh-colscroll" id="sidescroll">
 ${shelf('all', 'All', 'grid')}${shelf('reading', 'Reading now', 'book')}${shelf('want', 'Want to read', 'bookmark')}${shelf('finished', 'Finished', 'check')}
 <div class="sb-h"><span>My collections</span><button type="button" class="ib sm" data-a="newcol" aria-label="New collection">${ic('plus')}</button></div>
 ${S.cols.map((c) => shelf(c.id, c.t, 'folder')).join('') || '<p class="hint" style="padding:4px 8px">No collections yet.</p>'}
 ${
   isPro()
     ? `<div class="sb-h"><span>Tags</span><button type="button" class="lnk" data-a="tagfilter">All tags</button></div>
 ${top.map(([t, n]) => `<button type="button" class="sb-i" data-a="sidetag" data-id="${esc(t)}"${U.ktags.length === 1 && U.ktags[0] === t && !U.book ? ' aria-current="page"' : ''}>${ic('hash')}<span class="g">${esc(t)}</span><span class="n">${n}</span></button>`).join('')}
 ${S.saved.length ? `<div class="sb-h"><span>Saved filters</span></div>${S.saved.map((s) => `<button type="button" class="sb-i" data-a="ksavedgo" data-id="${s.id}">${ic('star')}<span class="g">${esc(s.name)}</span></button>`).join('')}` : ''}`
     : ''
 }
 <div class="sb-h"><span>${U.sideAll ? 'Everything' : 'Recent'}</span>${rec.length > 5 ? `<button type="button" class="lnk" data-a="sideall">${U.sideAll ? 'Show less' : 'Show all'}</button>` : ''}</div>
 ${list.map((b) => `<button type="button" class="sb-i" data-a="open" data-id="${b.id}"${U.book === b.id ? ' aria-current="page"' : ''}>${ic(KI[b.kind])}<span class="g">${esc(b.t)}</span></button>`).join('') || `<p class="hint" style="padding:4px 8px">Your library is empty. Tap Add to bring in a book, a link or a video.</p>`}
 </div>`
  syncSide()
}
/* ---------- the page: title, one Add, one row ---------- */
function libPage() {
  const sn = shelfName(U.shelf),
    so = !!(U.qopen || U.q)
  return `<div class="lib" id="lib"><div class="lh2"><h1>Library</h1>
  ${U.tab === 'books' ? `<button type="button" class="shelfbtn" data-a="shelfmenu" aria-haspopup="menu" aria-label="Shelf: ${esc(sn)}. Choose a shelf">${esc(sn)}${ic('down')}</button>` : ''}<span class="sp"></span>
  <button type="button" class="btn pri" data-a="addmenu" aria-haspopup="menu">${ic('plus')}Add</button></div>
  <div class="drop" role="status">Drop a book, a link or some text anywhere here.</div>
  <div id="busy"></div>
  <div class="trow"><button type="button" class="btn more" data-a="more">${ic('sliders')}More</button><div id="libtabs"></div><button type="button" class="ib${so ? ' on' : ''}" data-a="qopen" aria-label="Search the library" aria-expanded="${so}">${ic('search')}</button></div>
  ${so ? `<div class="qrow">${fld('q', U.q, 'Search titles, authors, highlights and notes', 'Search the library')}</div>` : ''}
  <div id="lbody"></div></div>`
}
function focusSearch() {
  if (U.book) {
    go({ tab: U.tab })
  }
  if (!U.qopen) {
    U.qopen = true
    renderMain(true)
  }
  const q = $('#q')
  if (q) q.focus()
}
function bodyHTML() {
  if ((U.q || U.ktags.length) && U.tab !== 'knowledge') return searchHTML()
  if (U.theme) return themePage(U.theme)
  if (U.tab === 'tags') return tagsHTML()
  if (U.tab === 'books') return booksHTML()
  if (U.tab === 'knowledge') return knowHTML()
  if (U.tab === 'themes') return themesHTML()
  if (U.tab === 'journal') return journalHTML()
  return ''
}
function tagChips() {
  if (!U.ktags.length) return ''
  return `<div class="lrow fchips">${U.ktags.map((t) => `<span class="tg">#${esc(t)}<button type="button" data-a="untagf" data-id="${esc(t)}" aria-label="Remove the tag ${esc(t)}">${ic('x')}</button></span>`).join(U.ktags.length > 1 ? `<span class="hint">${U.ktAll ? 'and' : 'or'}</span>` : '')}<button type="button" class="lnk" data-a="tagfilter">Change</button><span class="hint">Books, videos, notes and highlights with ${U.ktags.length > 1 ? (U.ktAll ? 'all of these tags' : 'any of these tags') : 'this tag'}${U.ktSub ? ' or its sub-tags' : ''}.</span></div>`
}
/* books tab */
function begChips() {
  const c = []
  if (U.type !== 'all')
    c.push(
      `<span class="tg">${typeName(U.type)}<button type="button" data-a="type" data-id="all" aria-label="Show every type again">${ic('x')}</button></span>`,
    )
  if (U.stf !== 'all')
    c.push(
      `<span class="tg">${ST[U.stf]}<button type="button" data-a="stf" data-id="all" aria-label="Show every status again">${ic('x')}</button></span>`,
    )
  return c.length
    ? `<div class="lrow fchips">${c.join('')}<span class="hint">Showing only these. Change it in More.</span></div>`
    : ''
}
function proRow() {
  const isSt = ['reading', 'want', 'finished'].includes(U.shelf)
  const c = (a, icn, label, on) =>
    `<button type="button" class="chip" data-a="${a}" aria-haspopup="menu" aria-pressed="${!!on}">${ic(icn)}${esc(label)}${ic('down')}</button>`
  return `<div class="lrow frow2">${c('typemenu', 'filter', U.type === 'all' ? 'Type' : typeName(U.type), U.type !== 'all')}${isSt ? '' : c('stmenu', 'check', U.stf === 'all' ? 'Status' : ST[U.stf], U.stf !== 'all')}${c('tagfilter', 'tag', U.ktags.length ? '#' + U.ktags.join(', #') : 'Tag', U.ktags.length)}${c('sortmenu', 'sort', SORTS[S.prefs.sort], false)}<span class="sp"></span>
  <div class="seg sm" role="group" aria-label="View"><button type="button" data-a="view" data-id="grid" class="${S.prefs.view === 'grid' ? 'on' : ''}" aria-label="Cover grid">${ic('grid')}</button><button type="button" data-a="view" data-id="list" class="${S.prefs.view === 'list' ? 'on' : ''}" aria-label="List">${ic('list')}</button></div>
  <button type="button" class="chip" data-a="selmode" aria-pressed="${U.selMode}">${ic('selectc')}Select</button></div>`
}
function contHTML() {
  const l = books()
    .filter((b) => b.st === 'reading' && b.opened != null)
    .sort((a, b) => a.opened - b.opened)
  if (!l.length) return ''
  return `<section class="cont" aria-label="Continue reading"><div class="sech"><h2>Continue reading</h2>${l.length > 1 ? `<button type="button" class="lnk" data-a="shelf" data-id="reading">See all ${l.length}</button>` : ''}</div>
 <ul class="contg">${l
   .slice(0, 3)
   .map((b, i) => {
     const p = pct(b)
     return `<li><article class="cc" data-id="${b.id}" data-testid="continue-card"><button type="button" class="ccv" data-a="open" data-id="${b.id}" aria-label="${esc(b.t)}: open the notes page">${sentCover(b)}</button><div class="ccb"><h3>${esc(b.t)}</h3><p>${esc(b.a || KL[b.kind])}</p>
  <div class="plr"><div class="pl" role="progressbar" aria-label="Progress: ${p}%" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>${p}%${b.kind === 'book' ? ' read' : ''}</div>
  <button type="button" class="btn sm${i === 0 ? ' pri' : ''}" data-a="start" data-id="${b.id}">${ic('play')}${ctaLabel(b)}</button></div></article></li>`
   })
   .join('')}</ul></section>`
}
function booksHTML() {
  const list = sorted(
    books().filter(
      (b) =>
        shelfOK(b, U.shelf) &&
        typeOK(b, U.type) &&
        (U.stf === 'all' || b.st === U.stf),
    ),
  )
  const head = isPro() ? proRow() : begChips()
  if (!list.length)
    return (
      head +
      (books().length === 0
        ? es(
            'book',
            'Your library is empty',
            'Add a book (PDF, EPUB or DOCX, DRM-free files only), or capture a link, a video or an article. You can also drop files, links or text here.',
            'Import a book',
            'import',
          )
        : es(
            'book',
            'Nothing here yet.',
            'Try another shelf or type.',
            'Show all',
            'showall',
          ))
    )
  const plain =
    U.shelf === 'all' && U.type === 'all' && U.stf === 'all' && !U.selMode
  return (
    head +
    (plain ? contHTML() : '') +
    `<div class="sech"><h2>${esc(shelfName(U.shelf))}</h2><span class="n">${list.length}</span></div>` +
    (S.prefs.view === 'grid'
      ? `<ul class="grid">${list.map(cardHTML).join('')}</ul>`
      : listHTML(list))
  )
}
function cardHTML(b) {
  const hn = hlOf(b.id).length,
    on = U.sel.has(b.id),
    p = pct(b)
  return `<li><article class="bk v2${on ? ' sel' : ''}" data-id="${b.id}" data-testid="source-card">
  ${U.selMode ? `<button type="button" class="chk" data-a="selbook" data-id="${b.id}" role="checkbox" aria-checked="${on}" aria-label="Select ${esc(b.t)}">${ic('check')}</button>` : ''}
  <button type="button" class="cvb" data-a="open" data-id="${b.id}" aria-label="${esc(b.t)}: open the notes page">${sentCover(b)}${b.st === 'finished' ? `<span class="fin" title="Finished" aria-label="Finished">${ic('check')}</span>` : ''}</button>
  <button type="button" class="ib sm cm" data-a="bmenu" data-id="${b.id}" aria-label="More actions" aria-haspopup="menu" data-testid="source-menu-button">${ic('dots')}</button>
  <div class="bi"><h3>${esc(b.t)}</h3>${S.prefs.author ? `<p>${esc(b.a || KL[b.kind])}</p>` : ''}
   ${b.kind === 'book' && S.prefs.progress && p > 0 && p < 100 ? `<div class="plr"><div class="pl" role="progressbar" aria-label="Reading progress: ${p}%" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>${p}% read</div>` : ''}
   ${isPro() ? `<p class="hint">${ST[b.st]} · ${hn} highlight${hn === 1 ? '' : 's'}${b.cols.length ? ' · ' + b.cols.map((c) => (colOf(c) || {}).t).join(', ') : ''}</p>` : ''}
   <button type="button" class="btn sm cta" data-a="start" data-id="${b.id}">${ctaLabel(b)}</button></div></article></li>`
}
/* ---------- knowledge: straight to the highlights ---------- */
const KV = {
  all: ['All highlights', 'layers', 'Everything you marked, from every book'],
  daily: [
    'Daily Highlights',
    'sparkle',
    'A few old highlights come back each day',
  ],
  study: ['Study prompts', 'journal', 'Chapter recap and reading journal'],
  export: ['Export', 'download', 'Download your notes as a file'],
}
const viewChip = () =>
  `<button type="button" class="chip" data-a="kviewmenu" aria-haspopup="menu" aria-pressed="${U.kview !== 'all'}">${ic(KV[U.kview][1])}${KV[U.kview][0]}${ic('down')}</button>`
function kstatsHTML() {
  if (!S.prefs.kstats || (!isPro() && !S.prefs.kstatsBeg)) return ''
  const hs = U.empty ? [] : S.hls
  return `<div class="lay kst" role="group" aria-label="Your knowledge at a glance"><div><b>${hs.length}</b><span>highlights</span></div><div><b>${hs.filter((h) => h.key).length}</b><span>★ key</span></div><div><b>${hs.filter((h) => h.card).length}</b><span>cards made</span></div><div><b>${U.empty ? 0 : allTags().length}</b><span>tags</span></div><button type="button" class="ib sm kx" data-a="kstatsoff" aria-label="Hide these numbers" title="Hide these numbers (turn them back on in More)">${ic('x')}</button></div>`
}
function knowHTML() {
  const head = kstatsHTML()
  if (U.kview === 'all') return head + knowListHTML()
  return (
    head +
    `<div class="lrow kbar">${viewChip()}</div>` +
    (U.kview === 'daily'
      ? dailyHTML()
      : U.kview === 'study'
        ? studyHTML()
        : exportHTML())
  )
}
function filterBar(scope) {
  const bkn = U.kbook === 'all' ? 'All books' : bk(U.kbook).t,
    col = U.kcol >= 0 ? COLS[U.kcol] : null,
    pro = isPro()
  const c = (a, inner, on) =>
    `<button type="button" class="chip" data-a="${a}" aria-haspopup="menu" aria-pressed="${!!on}">${inner}${ic('down')}</button>`
  return `<div class="lrow kbar">${scope ? '' : viewChip() + c('kbookmenu', ic('book') + esc(bkn.length > 22 ? bkn.slice(0, 21) + '…' : bkn), U.kbook !== 'all')}
  ${c('kcolmenu', `<span class="cd"${col ? ` style="--c:${col[2]}"` : ''}></span>${col ? col[1] : 'Any colour'}`, !!col)}
  ${c('ksortmenu', ic('sort') + { new: 'Newest', book: 'Book order', colour: 'Colour' }[U.ksort], false)}
  ${pro ? c('ktypemenu', ic('filter') + { all: 'Type', hl: 'Highlights', note: 'Notes', bm: 'Bookmarks', key: '★ Key' }[U.ktype], U.ktype !== 'all') + c('tagfilter', ic('tag') + (U.ktags.length ? '#' + U.ktags.map(esc).join(', #') : 'Tag'), U.ktags.length) + c('kdatemenu', ic('clock') + { all: 'Any date', week: 'This week', month: 'This month' }[U.kdate], U.kdate !== 'all') + (scope ? '' : c('ksavedmenu', ic('star') + 'Saved', false)) : ''}
  <span class="sp"></span>${pro ? `<button type="button" class="chip" data-a="selmode" aria-pressed="${U.selMode}">${ic('selectc')}Select</button>` : ''}</div>
 ${U.kcl ? `<div class="lrow fchips"><span class="tg">Collection: ${esc((colOf(U.kcl) || {}).t || '')}<button type="button" data-a="kclcl" aria-label="Remove collection filter">${ic('x')}</button></span></div>` : ''}`
}
/* ---------- export: which books, what to include, only, format (LB1) ---------- */
const EXI = [
  ['hl', 'Highlights', 'The lines you marked'],
  ['note', 'Notes', 'What you wrote next to them'],
  ['mine', 'In my words', 'Your own explanation'],
  ['bm', 'Bookmarks', 'Pages you marked'],
  ['cards', 'Cards', 'Question and answer'],
  ['sum', 'Summaries', 'Your summary of each book'],
  ['recap', 'Chapter recaps', 'One line per chapter'],
  ['tags', 'Tags', 'The tags on each item'],
]
function exData(scope) {
  const x = U.ex,
    sc = scope || x.scope
  const bs =
    sc === 'all'
      ? S.books
      : sc === 'shelf'
        ? S.books.filter((b) => shelfOK(b, U.shelf))
        : [bk(sc)].filter(Boolean)
  const ok = (h) =>
    ((h.type === 'hl' && x.hl) ||
      (h.type === 'note' && x.note) ||
      (h.type === 'bm' && x.bm) ||
      (x.cards && h.card)) &&
    (!x.key || h.key) &&
    (!x.cols.length || x.cols.includes(h.c))
  return bs
    .map((b) => ({
      b,
      hs: hlOf(b.id).filter(ok),
      sum: x.sum && b.sum ? b.sum : '',
      rec: x.recap && S.recaps[b.id] ? S.recaps[b.id] : null,
    }))
    .filter((r) => r.hs.length || r.sum || r.rec)
}
function exportMD(scope) {
  const x = U.ex
  return (
    exData(scope)
      .map(
        ({ b, hs, sum, rec }) =>
          `# ${b.t}${b.a ? ' — ' + b.a : ''}\n\n` +
          (sum ? `## Summary\n\n${sum}\n\n` : '') +
          (rec
            ? `## Chapter recaps\n\n${Object.entries(rec)
                .map(([c, t]) => `- Ch. ${c}: ${t}`)
                .join('\n')}\n\n`
            : '') +
          hs
            .map(
              (h) =>
                `> ${h.q}\n${x.note && h.note ? '\n' + h.note + '\n' : ''}${x.mine && h.mine ? '\n*In my words:* ' + h.mine + '\n' : ''}${x.cards && h.card ? '\n**Q:** ' + h.cq + '\n**A:** ' + h.q + '\n' : ''}\n— Ch. ${h.ch}, ${ago(h.d)}${h.type === 'bm' ? ' · Bookmark' : ''}${x.tags && h.tags.length ? ' · ' + h.tags.map((t) => '#' + t).join(' ') : ''}${h.key ? ' · ★' : ''}\n`,
            )
            .join('\n'),
      )
      .join('\n\n') || '# Nothing to export yet\n'
  )
}
function exportCSV(scope) {
  const x = U.ex,
    q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'
  const cols = ['book', 'chapter', 'colour', 'type', 'key', 'quote']
  if (x.note) cols.push('note')
  if (x.mine) cols.push('in my words')
  if (x.cards) cols.push('card question', 'card answer')
  if (x.tags) cols.push('tags')
  cols.push('date')
  const rows = [cols.join(',')]
  exData(scope).forEach(({ b, hs, sum, rec }) => {
    hs.forEach((h) => {
      const r = [b.t, h.ch, COLS[h.c][1], h.type, h.key ? 'yes' : '', h.q]
      if (x.note) r.push(h.note)
      if (x.mine) r.push(h.mine)
      if (x.cards) r.push(h.card ? h.cq : '', h.card ? h.q : '')
      if (x.tags) r.push(h.tags.join(' '))
      r.push(ago(h.d))
      rows.push(r.map(q).join(','))
    })
    if (sum) rows.push([b.t, '', '', 'summary', '', sum].map(q).join(','))
    if (rec)
      Object.entries(rec).forEach(([c, t]) =>
        rows.push([b.t, c, '', 'chapter recap', '', t].map(q).join(',')),
      )
  })
  return rows.join('\n')
}
function exportHTML() {
  const x = U.ex,
    d = exData(),
    n = d.reduce(
      (s, r) =>
        s +
        r.hs.length +
        (r.sum ? 1 : 0) +
        (r.rec ? Object.keys(r.rec).length : 0),
      0,
    )
  const sw7 = (k, label) =>
    `<button type="button" class="sw" role="switch" aria-checked="${!!x[k]}" aria-label="${esc(label)}" data-a="exsw" data-k="${k}"></button>`
  return `<div class="cardx"><h2>${ic('download')}Export</h2><p>Your notes are never locked in. Choose what goes into the file.</p>
  <div class="glab">Which books</div>
  <select class="sel" id="expB" aria-label="Which books" style="width:100%;max-width:360px"><option value="all"${x.scope === 'all' ? ' selected' : ''}>All books</option>${U.shelf !== 'all' ? `<option value="shelf"${x.scope === 'shelf' ? ' selected' : ''}>Only the shelf “${esc(shelfName(U.shelf))}”</option>` : ''}${S.books.map((b) => `<option value="${b.id}"${x.scope === b.id ? ' selected' : ''}>${esc(b.t)}</option>`).join('')}</select>
  <div class="glab">What to include</div>
  <div class="well exg">${EXI.map(([k, n, s]) => `<div class="frow"><div class="gr"><b>${n}</b><span>${s}</span></div>${sw7(k, 'Include ' + n)}</div>`).join('')}</div>
  <div class="glab">Only</div>
  <div class="well"><div class="frow"><div class="gr"><b>★ Key highlights only</b><span>Leave out everything you did not star</span></div>${sw7('key', 'Key highlights only')}</div>
   <div class="frow"><div class="gr"><b>Colours</b><span>${x.cols.length ? 'Only ' + x.cols.map((i) => COLS[i][1].toLowerCase()).join(', ') : 'Every colour'}</span></div><div class="cols" role="group" aria-label="Only these colours">${COLS.map((c, i) => `<button type="button" class="cdot" style="--c:${c[2]}" aria-pressed="${x.cols.includes(i)}" data-a="excol" data-id="${i}" aria-label="${c[1]}" title="${c[1]}"><i></i></button>`).join('')}</div></div></div>
  <div class="exf"><div class="seg sm" role="group" aria-label="File format"><button type="button" class="${x.fmt === 'md' ? 'on' : ''}" data-a="exfmt" data-id="md">Markdown</button><button type="button" class="${x.fmt === 'csv' ? 'on' : ''}" data-a="exfmt" data-id="csv">CSV</button></div>
   <span class="hint" role="status">${n ? `${n} item${n === 1 ? '' : 's'} from ${d.length} book${d.length === 1 ? '' : 's'}. ${x.fmt === 'md' ? 'Markdown opens in Notion, Obsidian or any text app.' : 'CSV opens in Excel or Google Sheets.'}` : 'Nothing matches yet. Turn something on above.'}</span>
   <button type="button" class="btn pri" data-a="export" data-id="${x.fmt}"${n ? '' : ' disabled'}>${ic('download')}Export</button></div></div>`
}
/* ---------- tags on an item: chips + one button that opens the Tag picker ---------- */
function tagEditor(id, inputId) {
  const it = itemOf(id)
  if (!it) return ''
  const sg = (U.sug[id] || []).filter((t) => !it.tags.includes(t)),
    auto = U.autoT[id] || []
  return `<div class="tgx"><div class="tags">${it.tags.map((t) => `<span class="tg${auto.includes(t) ? ' auto' : ''}">${esc(t)}${auto.includes(t) ? '<i class="aut" title="Added automatically because you accepted this tag before">auto</i>' : ''}<button type="button" data-a="untag" data-id="${id}" data-t="${esc(t)}" aria-label="Remove tag ${esc(t)}">${ic('x')}</button></span>`).join('')}${sg.map((t) => `<span class="tg sug" role="group" aria-label="Suggested tag ${esc(t)}"><span>${esc(t)}</span><button type="button" class="ok" data-a="sugok" data-id="${id}" data-t="${esc(t)}" aria-label="Accept the tag ${esc(t)}">${ic('check')}</button><button type="button" data-a="sugno" data-id="${id}" data-t="${esc(t)}" aria-label="Dismiss the tag ${esc(t)}">${ic('x')}</button></span>`).join('')}${it.tags.length || sg.length ? '' : '<span class="hint">No tags yet.</span>'}</div>
  <div class="lrow" style="margin:6px 0 0"><button type="button" class="btn sm" data-a="tagpick" data-id="${id}" id="${inputId}">${ic('tag')}Add tags</button><button type="button" class="btn sm" data-a="sugget" data-id="${id}">${ic('sparkle')}Suggest tags</button></div></div>`
}
/* ---------- More: a Filter section first ---------- */
function moreBody(t) {
  if (t === 'filter') {
    const ui = D.ui
    const tags = [
      ...new Set([
        ...(S.pins || []),
        ...(S.tagRecent || []),
        ...ui.tags,
        ...allTags(),
      ]),
    ].slice(0, 8)
    return `<div class="glab">Show</div><div class="tiles5">${TYPES.map(([id, n, icn]) => `<button type="button" class="tile7" aria-pressed="${ui.type === id}" data-a="dtype" data-id="${id}">${ic(icn)}<span>${n}</span></button>`).join('')}</div>
  <div class="glab">Tags</div><div class="tags">${tags.map((x) => chip('dtag', x, '#' + x, ui.tags.includes(x))).join('')}</div>
  <div class="acts" style="margin-top:10px"><button type="button" class="btn sm" data-a="dtagall">${ic('tag')}All tags</button></div>
  <p class="note7">A small chip appears above your covers while a filter is on, so you never forget it. Sorting, and covers or list, are under View.</p>`
  }
  let h = moreBody0(t)
  if (t === 'view')
    h += frow(
      'Show the Knowledge numbers in Beginner',
      'They are already on in Professional.',
      dsw('kstatsBeg', 'Show the Knowledge numbers in Beginner'),
    )
  return h
}
/* =====================================================================
   The ONE Tag picker (LB2). Used by: the Library filter, a book's tags,
   a highlight's tags, bulk tag, and the keys # or T. Popover on iPad and
   desktop, bottom sheet on phone.
   ===================================================================== */
const TP = {
  on: false,
  mode: 'filter',
  ids: [],
  q: '',
  act: -1,
  open: {},
  from: null,
}
function tagPath(t) {
  let out = null
  ;(function rec(ns, tr) {
    for (const n of ns) {
      const p = [...tr, n.n]
      if (n.n.toLowerCase() === String(t).toLowerCase()) out = p
      if (n.kids) rec(n.kids, p)
    }
  })(S.tree, [])
  return out || [t]
}
function tpAll() {
  const s = new Set(allTags())
  walk(S.tree, (n, d) => {
    if (d > 1) s.add(n.n)
  })
  return [...s]
}
function fuzzy(q, t) {
  q = q.toLowerCase()
  t = t.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  let i = 0
  for (const ch of t) {
    if (ch === q[i]) i++
  }
  return i === q.length ? 30 : 0
}
function lev(a, b) {
  const m = []
  for (let i = 0; i <= a.length; i++) {
    m[i] = [i]
    for (let j = 1; j <= b.length; j++)
      m[i][j] =
        i === 0
          ? j
          : Math.min(
              m[i - 1][j] + 1,
              m[i][j - 1] + 1,
              m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            )
  }
  return m[a.length][b.length]
}
const nearDup = (v) =>
  tpAll().find(
    (t) =>
      t !== v &&
      (t === v + 's' ||
        v === t + 's' ||
        (v.length > 3 && lev(t, v) <= (v.length > 6 ? 2 : 1))),
  )
function tpPresent() {
  const set = new Set(),
    add = (x) => (x.tags || []).forEach((t) => set.add(t))
  if (U.book) hlOf(U.book).forEach(add)
  else if (U.tab === 'knowledge') {
    const keep = U.ktags
    U.ktags = []
    kfilter().forEach(add)
    U.ktags = keep
  } else
    books()
      .filter((b) => shelfOK(b, U.shelf) && typeOK(b, U.type))
      .forEach((b) => {
        add(b)
        hlOf(b.id).forEach(add)
      })
  ;[...set].forEach((t) =>
    tagPath(t)
      .slice(1)
      .forEach((p) => set.add(p)),
  )
  return set
}
const tpItems = () => TP.ids.map(itemOf).filter(Boolean)
function tpState(t) {
  if (TP.mode === 'filter') return U.ktags.includes(t) ? 'all' : 'none'
  const its = tpItems(),
    n = its.filter((i) => i.tags.includes(t)).length
  return !n ? 'none' : n === its.length ? 'all' : 'some'
}
function tpRecent(t) {
  S.tagRecent = [t, ...(S.tagRecent || []).filter((x) => x !== t)].slice(0, 6)
}
function tpToggle(t) {
  if (TP.mode === 'filter') {
    U.ktags = U.ktags.includes(t)
      ? U.ktags.filter((x) => x !== t)
      : [...U.ktags, t]
    tpRecent(t)
    U.kshow = 40
    rer()
    renderSide()
  } else {
    const its = tpItems(),
      on = tpState(t) === 'all'
    act(on ? 'Remove tag' : 'Add tag', () => {
      tpRecent(t)
      its.forEach((i) => {
        if (on) i.tags = i.tags.filter((x) => x !== t)
        else if (!i.tags.includes(t)) {
          i.tags.push(t)
          if (its.length === 1) remember(t, i)
        }
      })
    })
    pvRefresh()
  }
  tpDraw()
}
function tpRow(t, o) {
  o = o || {}
  const st = tpState(t),
    path = tagPath(t),
    dim = o.present && !o.present.has(t) && st === 'none',
    pin = (S.pins || []).includes(t)
  return `<div class="tprw"><button type="button" class="tpr${dim ? ' dim' : ''}" role="option" aria-selected="${st === 'all'}" data-a="tptog" data-id="${esc(t)}" style="--d:${o.d || 0}"${dim ? ' title="Nothing on this screen has this tag"' : ''}><span class="tpc ${st}">${ic('check')}</span><span class="g"><b>#${esc(t)}</b>${o.path && path.length > 1 ? `<small>${path.map(esc).join(' › ')}</small>` : ''}</span><span class="n">${cntTag(t)}</span></button><button type="button" class="ib sm tpp" data-a="tppin" data-id="${esc(t)}" aria-pressed="${pin}" aria-label="${pin ? 'Unpin' : 'Pin'} #${esc(t)}" title="Pin to the top">${ic('pin')}</button></div>`
}
function tpBody() {
  const q = TP.q.trim(),
    nq = normTag(q),
    present = TP.mode === 'filter' ? tpPresent() : null,
    byUse = (a, b) => cntTag(b) - cntTag(a)
  let h = ''
  if (nq) {
    const res = tpAll()
      .map((t) => [
        t,
        Math.max(
          fuzzy(nq, t),
          tagPath(t).some((p) => p.toLowerCase().includes(q.toLowerCase()))
            ? 40
            : 0,
        ),
      ])
      .filter((x) => x[1] > 0)
      .sort((a, b) => b[1] - a[1] || cntTag(b[0]) - cntTag(a[0]))
      .map((x) => x[0])
    h += res.map((t) => tpRow(t, { path: true, present })).join('')
    const exact = tpAll().some((t) => t === nq)
    if (!exact && TP.mode === 'assign') {
      const dup = nearDup(nq),
        par = parentsFor(1)
      h += `<div class="tpnew"><button type="button" class="tpr" data-a="tpcreate" data-id="${esc(nq)}">${ic('plus')}<span class="g"><b>Create #${esc(nq)}</b></span></button>
   <label>Put it under<select class="sel" id="tpparent" aria-label="Put the new tag under"><option value="">Nothing (decide later)</option>${par.map((p) => `<option value="${esc(p.n)}">${esc(tagPath(p.n).join(' › '))}</option>`).join('')}</select></label>
   ${dup ? `<div class="hm" role="status">This looks like <b>#${esc(dup)}</b>, which you already have. <button type="button" class="lnk" data-a="tptog" data-id="${esc(dup)}">Use #${esc(dup)}</button></div>` : ''}</div>`
    } else if (!res.length)
      h += `<p class="hint" style="padding:14px 10px">No tag matches “${esc(q)}”.</p>`
  } else {
    const all = tpAll(),
      pins = (S.pins || []).filter((t) => all.includes(t)),
      rec = (S.tagRecent || [])
        .filter((t) => !pins.includes(t) && all.includes(t))
        .slice(0, 4)
    const its = tpItems(),
      sug =
        TP.mode === 'assign' && its.length === 1
          ? suggestTags(its[0]).filter((t) => !its[0].tags.includes(t))
          : []
    if (pins.length)
      h +=
        `<div class="glab">Pinned</div>` +
        pins.map((t) => tpRow(t, { present })).join('')
    if (rec.length)
      h +=
        `<div class="glab">Recent</div>` +
        rec.map((t) => tpRow(t, { present })).join('')
    if (sug.length)
      h +=
        `<div class="glab">Suggested for this ${its[0].t != null ? 'item' : 'highlight'}</div>` +
        sug.map((t) => tpRow(t, {})).join('')
    h += `<div class="glab">Browse</div>`
    const inTree = new Set()
    walk(S.tree, (n) => inTree.add(n.n))
    const sub = (n, d) =>
      [...(n.kids || [])]
        .sort((a, b) => byUse(a.n, b.n))
        .map((k) => tpRow(k.n, { d, present }) + sub(k, d + 1))
        .join('')
    h += S.tree
      .map((c) => {
        const op = !!TP.open[c.n]
        let cn = 0
        walk(c.kids || [], () => cn++)
        return `<button type="button" class="tpr tpcat" data-a="tpcat" data-id="${esc(c.n)}" aria-expanded="${op}">${ic('chev')}<span class="g"><b>${esc(c.n)}</b></span><span class="n">${cn} tag${cn === 1 ? '' : 's'}</span></button>${op ? sub(c, 1) : ''}`
      })
      .join('')
    const loose = all.filter((t) => !inTree.has(t)).sort(byUse)
    if (loose.length) {
      const op = !!TP.open['~']
      h += `<button type="button" class="tpr tpcat" data-a="tpcat" data-id="~" aria-expanded="${op}">${ic('chev')}<span class="g"><b>Not in a category yet</b></span><span class="n">${loose.length} tags</span></button>${op ? loose.map((t) => tpRow(t, { d: 1, present })).join('') : ''}`
    }
  }
  if (TP.mode === 'filter')
    h += `<div class="well tpo"><div class="frow"><div class="gr"><b>Match</b><span>${U.ktAll ? 'Items that have every ticked tag' : 'Items that have at least one ticked tag'}</span></div><div class="seg sm" role="group" aria-label="Match"><button type="button" class="${U.ktAll ? '' : 'on'}" data-a="tpmatch" data-id="any">Any</button><button type="button" class="${U.ktAll ? 'on' : ''}" data-a="tpmatch" data-id="all">All</button></div></div>
  <div class="frow"><div class="gr"><b>Include sub-tags</b><span>#habits also finds #routines</span></div><button type="button" class="sw" role="switch" aria-checked="${U.ktSub}" aria-label="Include sub-tags" data-a="tpsub"></button></div></div>`
  return h
}
function tpDraw() {
  const b = $('#tpb')
  if (!b || !TP.on) return
  const y = b.scrollTop
  b.innerHTML = tpBody()
  b.scrollTop = y
  const rows = $$('#tpb .tpr')
  if (TP.act >= rows.length) TP.act = rows.length - 1
  if (rows[TP.act]) {
    rows[TP.act].classList.add('act')
    rows[TP.act].scrollIntoView({ block: 'nearest' })
  }
  const f = $('#tpf'),
    n = TP.mode === 'filter' ? U.ktags.length : 0
  f.innerHTML =
    TP.mode === 'filter'
      ? `<button type="button" class="btn sm" data-a="tpclear"${n ? '' : ' disabled'}>Clear</button><span class="hint">${n ? n + ' ticked' : 'Tick one or more'}</span><button type="button" class="btn sm pri" data-a="tpclose">Done</button>`
      : `<span class="hint">Saved as you tap. Undo works.</span><button type="button" class="btn sm pri" data-a="tpclose">Done</button>`
}
function tpOpen(o) {
  Shell.closePop()
  TP.on = true
  TP.mode = o.mode
  TP.ids = o.ids || []
  TP.q = ''
  TP.act = -1
  TP.from = o.anchor || null
  let sc = $('#tpsc')
  if (!sc) {
    sc = document.createElement('div')
    sc.id = 'tpsc'
    document.body.appendChild(sc)
    sc.addEventListener('click', tpClose)
  }
  let p = $('#tpk')
  if (!p) {
    p = document.createElement('aside')
    p.id = 'tpk'
    p.setAttribute('role', 'dialog')
    document.body.appendChild(p)
  }
  const its = tpItems(),
    title =
      TP.mode === 'filter'
        ? 'Filter by tag'
        : its.length === 1
          ? 'Tags for “' +
            (its[0].t != null ? its[0].t : 'this highlight') +
            '”'
          : 'Tag ' + its.length + ' items'
  p.setAttribute('aria-label', title)
  p.innerHTML = `<div class="tph"><b>${esc(title)}</b><button type="button" class="ib" data-a="tpclose" aria-label="Close">${ic('x')}</button></div>
  <div class="tpq"><input class="inp" id="tpq" type="text" placeholder="${TP.mode === 'filter' ? 'Search tags' : 'Search or create a tag'}" aria-label="Search tags" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-controls="tpb" aria-expanded="true"></div>
  <div id="tpb" role="listbox" aria-multiselectable="true" aria-label="Tags"></div><div class="tpf" id="tpf"></div>`
  const phone = Shell.isPhone()
  p.classList.toggle('sheet', phone)
  sc.classList.toggle('dim', phone)
  sc.classList.add('on')
  p.classList.add('on')
  tpDraw()
  decoAll()
  if (!phone) {
    const a =
      o.anchor && o.anchor.isConnected
        ? o.anchor.getBoundingClientRect()
        : { left: innerWidth / 2 - 174, bottom: 120, top: 120 }
    const w = p.offsetWidth,
      hh = Math.max(p.offsetHeight, 440)
    let top = a.bottom + 8
    if (top + hh > innerHeight - 12) top = Math.max(12, innerHeight - 12 - hh)
    p.style.left = Math.max(12, Math.min(innerWidth - w - 12, a.left)) + 'px'
    p.style.top = top + 'px'
  } else {
    p.style.left = ''
    p.style.top = ''
  }
  const q = $('#tpq')
  if (q) q.focus()
}
function tpClose() {
  if (!TP.on) return
  TP.on = false
  const p = $('#tpk'),
    sc = $('#tpsc')
  if (p) p.classList.remove('on')
  if (sc) sc.classList.remove('on')
  const f = TP.from
  if (f && f.isConnected) {
    try {
      f.focus()
    } catch (_) {}
  }
}
document.addEventListener('input', (e) => {
  if (e.target.id === 'tpq') {
    TP.q = e.target.value
    TP.act = TP.q.trim() ? 0 : -1
    tpDraw()
  }
})
document.addEventListener('change', (e) => {
  if (e.target.id === 'expB') {
    U.ex.scope = e.target.value
    renderBody()
    const s = $('#expB')
    if (s) s.focus()
  }
})
document.addEventListener(
  'keydown',
  (e) => {
    if (TP.on) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        tpClose()
        return
      }
      if (e.target.id === 'tpparent') return
      const rows = $$('#tpb .tpr')
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!rows.length) return
        TP.act =
          (TP.act + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) %
          rows.length
        rows.forEach((r, i) => r.classList.toggle('act', i === TP.act))
        rows[TP.act].scrollIntoView({ block: 'nearest' })
        return
      }
      if (e.key === 'Enter' && e.target.id === 'tpq') {
        e.preventDefault()
        const r = rows[TP.act < 0 ? 0 : TP.act]
        if (r && (TP.q.trim() || TP.act >= 0)) r.click()
        return
      }
      return
    }
    const t = e.target,
      typing =
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
    if (t && t.id === 'q' && e.key === 'Escape' && U.qopen && !U.q) {
      U.qopen = false
      renderMain(true)
      const s = $('[data-a=qopen]')
      if (s) s.focus()
      return
    }
    if (
      typing ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      Shell.sheet.isOpen() ||
      $('#sh-dialog.on')
    )
      return
    if (e.key === '#' || e.key === 't' || e.key === 'T') {
      e.preventDefault()
      const ids = aiTarget()
      if (ids.length)
        tpOpen({
          mode: 'assign',
          ids,
          anchor: $('[data-a=tagpick]') || $('[data-a=bulktag]'),
        })
      else
        tpOpen({
          mode: 'filter',
          anchor: $('[data-a=tagfilter]') || $('[data-a=more]'),
        })
    }
  },
  true,
)
/* ---------- actions (new ones, and old ones that now behave differently) ---------- */
function act2(a, id, b, e) {
  const mi = (act, did, icn, label, on, n) =>
    `<button type="button" class="mi${on ? ' on' : ''}" role="menuitemradio" aria-checked="${!!on}" data-a="${act}" data-id="${esc(did)}">${ic(icn)}${esc(label)}${n != null ? `<span class="n">${n}</span>` : ''}</button>`
  switch (a) {
    case 'qopen': {
      const on = !(U.qopen || U.q)
      U.qopen = on
      if (!on) U.q = ''
      renderMain(true)
      const q = $('#q')
      if (on && q) q.focus()
      else {
        const s = $('[data-a=qopen]')
        if (s) s.focus()
      }
      return true
    }
    case 'addmenu': {
      const big = (act, icn, t, s) =>
        `<button type="button" class="mi big" role="menuitem" data-a="${act}"><span class="ti">${ic(icn)}</span><span><b>${t}</b><small>${s}</small></span></button>`
      Shell.pop(
        b,
        big(
          'import',
          'upload',
          'Import a book',
          'A PDF, EPUB or DOCX file from this device',
        ) +
          big(
            'capture',
            'link',
            'Capture a link, video or text',
            'Save an article, a YouTube video or pasted text',
          ) +
          big(
            'prompts',
            'sparkle',
            'Prompts',
            'Ready-made prompts for your AI',
          ) +
          `<div class="cap">DRM-free files only. You can also drop files, links or text anywhere on this page.</div>`,
      )
      return true
    }
    case 'shelfmenu':
      Shell.pop(
        b,
        [
          ['all', 'All', 'grid'],
          ['reading', 'Reading now', 'book'],
          ['want', 'Want to read', 'bookmark'],
          ['finished', 'Finished', 'check'],
        ]
          .map(([s, n, i]) => mi('shelf', s, i, n, U.shelf === s, counts(s)))
          .join('') +
          (S.cols.length ? '<div class="lbl">My collections</div>' : '') +
          S.cols
            .map((c) =>
              mi('shelf', c.id, 'folder', c.t, U.shelf === c.id, counts(c.id)),
            )
            .join('') +
          `<hr><button type="button" class="mi" role="menuitem" data-a="newcol">${ic('plus')}New collection</button>`,
      )
      return true
    case 'typemenu':
      Shell.pop(
        b,
        TYPES.map(([t, n, i]) => mi('type', t, i, n, U.type === t)).join(''),
      )
      return true
    case 'type':
      Shell.closePop()
      return false
    case 'stmenu':
      Shell.pop(
        b,
        mi('stf', 'all', 'grid', 'Any status', U.stf === 'all') +
          ['reading', 'want', 'finished']
            .map((s) =>
              mi(
                'stf',
                s,
                { reading: 'book', want: 'bookmark', finished: 'check' }[s],
                ST[s],
                U.stf === s,
              ),
            )
            .join(''),
      )
      return true
    case 'stf':
      Shell.closePop()
      U.stf = id
      renderMain(true)
      return true
    case 'start':
      Shell.closePop()
      return false
    case 'showall':
      Object.assign(U, {
        shelf: 'all',
        type: 'all',
        stf: 'all',
        q: '',
        qopen: false,
        ktags: [],
      })
      renderMain(true)
      renderSide()
      return true
    case 'tagfilter':
    case 'ktagmenu':
      tpOpen({ mode: 'filter', anchor: b })
      return true
    case 'tagpick':
      tpOpen({ mode: 'assign', ids: [id], anchor: b })
      return true
    case 'bulktag':
      if (U.sel.size) tpOpen({ mode: 'assign', ids: [...U.sel], anchor: b })
      return true
    case 'untagf':
      U.ktags = U.ktags.filter((t) => t !== id)
      rer()
      renderSide()
      return true
    case 'cleartag':
      U.ktags = []
      rer()
      renderSide()
      return true
    case 'ktag':
      Shell.closePop()
      U.ktags = id === 'all' ? [] : [id]
      rer()
      return true
    case 'sidetag':
      if (Shell.col('side') === 'over') Shell.col('side', 'hidden')
      U.ktags = U.ktags.length === 1 && U.ktags[0] === id ? [] : [id]
      if (U.book || U.tab === 'knowledge' || U.theme) go({ tab: 'books' })
      else {
        renderMain(true)
        renderSide()
      }
      return true
    case 'sideall':
      U.sideAll = !U.sideAll
      renderSide()
      return true
    case 'kclear':
      Object.assign(U, {
        kview: 'all',
        kbook: 'all',
        kcol: -1,
        ktype: 'all',
        ktags: [],
        kdate: 'all',
        kcl: null,
        q: '',
      })
      renderMain(true)
      return true
    case 'kviewmenu':
      Shell.pop(
        b,
        Object.entries(KV)
          .map(
            ([k, v]) =>
              `<button type="button" class="mi big${U.kview === k ? ' on' : ''}" role="menuitemradio" aria-checked="${U.kview === k}" data-a="kview" data-id="${k}"><span class="ti">${ic(v[1])}</span><span><b>${v[0]}</b><small>${v[2]}</small></span></button>`,
          )
          .join(''),
      )
      return true
    case 'kview':
    case 'ksort':
    case 'ktype':
    case 'kdate':
    case 'ksaved':
    case 'ksave':
    case 'kbook':
      Shell.closePop()
      return false
    case 'kcolmenu':
      Shell.pop(
        b,
        `<div class="lbl">Show one colour</div><div class="swg cols">${COLS.map((c, i) => `<button type="button" class="cdot" style="--c:${c[2]}" aria-pressed="${U.kcol === i}" data-a="kcol" data-id="${i}" aria-label="${c[1]}" title="${c[1]}"><i></i></button>`).join('')}</div>${U.kcol >= 0 ? `<button type="button" class="mi" role="menuitem" data-a="kcol" data-id="${U.kcol}">${ic('x')}Any colour</button>` : ''}`,
      )
      return true
    case 'kcol':
      Shell.closePop()
      return false
    case 'ksavedmenu':
      Shell.pop(
        b,
        (S.saved.length
          ? '<div class="lbl">Saved filters</div>' +
            S.saved
              .map(
                (s) =>
                  `<button type="button" class="mi" role="menuitem" data-a="ksaved" data-id="${s.id}">${ic('star')}${esc(s.name)}</button>`,
              )
              .join('') +
            '<hr>'
          : '') +
          `<button type="button" class="mi" role="menuitem" data-a="ksave">${ic('save')}Save this filter</button>`,
      )
      return true
    case 'ksavedgo':
      if (Shell.col('side') === 'over') Shell.col('side', 'hidden')
      if (U.book || U.tab !== 'knowledge' || U.theme) {
        U.kview = 'all'
        go({ tab: 'knowledge' })
      }
      act1('ksaved', id, b, e)
      return true
    case 'exsw': {
      const k = b.dataset.k
      U.ex[k] = !U.ex[k]
      renderBody()
      const n = $('[data-a=exsw][data-k=' + k + ']')
      if (n) n.focus()
      return true
    }
    case 'excol': {
      const i = +id
      U.ex.cols = U.ex.cols.includes(i)
        ? U.ex.cols.filter((x) => x !== i)
        : [...U.ex.cols, i].sort()
      renderBody()
      return true
    }
    case 'exfmt':
      U.ex.fmt = id
      renderBody()
      return true
    case 'export': {
      const md = U.ex.fmt === 'md'
      download(
        md ? 'learning-notes-highlights.md' : 'learning-notes-highlights.csv',
        md ? exportMD() : exportCSV(),
        md ? 'text/markdown' : 'text/csv',
      )
      T('Exported a ' + (md ? 'Markdown' : 'CSV') + ' file')
      return true
    }
    case 'dtype':
      D.ui.type = id
      Shell.sheet.draw()
      return true
    case 'dtag':
      D.ui.tags = D.ui.tags.includes(id)
        ? D.ui.tags.filter((t) => t !== id)
        : [...D.ui.tags, id]
      Shell.sheet.draw()
      return true
    case 'dtagall':
      Shell.sheet.close(true)
      setTimeout(
        () => tpOpen({ mode: 'filter', anchor: $('[data-a=more]') }),
        80,
      )
      return true
    case 'tptog':
      tpToggle(id)
      return true
    case 'tppin': {
      const on = (S.pins || []).includes(id)
      S.pins = on ? S.pins.filter((t) => t !== id) : [...(S.pins || []), id]
      tpDraw()
      return true
    }
    case 'tpcat':
      TP.open[id] = !TP.open[id]
      tpDraw()
      return true
    case 'tpcreate': {
      const par = ($('#tpparent') || {}).value || ''
      const its = tpItems()
      act('Create tag', () => {
        its.forEach((i) => {
          if (!i.tags.includes(id)) i.tags.push(id)
        })
        if (par) placeUnder(id, par)
        tpRecent(id)
      })
      pvRefresh()
      TP.q = ''
      const q = $('#tpq')
      if (q) {
        q.value = ''
        q.focus()
      }
      tpDraw()
      T('Tag #' + id + ' created' + (par ? ' under ' + par : ''), undo)
      return true
    }
    case 'tpclear':
      U.ktags = []
      rer()
      renderSide()
      tpDraw()
      return true
    case 'tpmatch':
      U.ktAll = id === 'all'
      rer()
      tpDraw()
      return true
    case 'tpsub':
      U.ktSub = !U.ktSub
      rer()
      tpDraw()
      return true
    case 'tpclose':
      tpClose()
      return true
  }
  return false
}
