/* ---------- Workflows v4: a database view with the app-wide filter bar ---------- */
const WF0 = {
  q: '',
  tags: [],
  tmode: 'any',
  jt: [],
  ai: [],
  star: 0,
  uses: 0,
  sort: 'rating',
}
const SORTS = {
  rating: ['Rating', (a, b) => b.star - a.star],
  used: ['Most used', (a, b) => b.uses - a.uses],
  name: ['Name', (a, b) => a.n.localeCompare(b.n)],
  recent: ['Recently run', (a, b) => a.last - b.last],
}
const wfF = () => {
  const W = S.W
  return {
    q: W.q.trim(),
    tags: W.tags.slice().sort(),
    tmode: W.tags.length > 1 ? W.tmode : 'any',
    jt: W.jt.slice().sort(),
    ai: W.ai.slice().sort(),
    star: W.star,
    uses: W.uses,
    sort: W.sort,
  }
}
const wfSame = (f) =>
  JSON.stringify(
    Object.assign({}, WF0, f, {
      tags: (f.tags || []).slice().sort(),
      jt: (f.jt || []).slice().sort(),
      ai: (f.ai || []).slice().sort(),
    }),
  ) === JSON.stringify(wfF())
const wfMatch = (w) => {
  const W = S.W,
    q = W.q.toLowerCase().trim()
  return (
    (!q ||
      (w.n + ' ' + w.tags.join(' ') + ' ' + w.jt + ' ' + w.ai)
        .toLowerCase()
        .includes(q)) &&
    (!W.tags.length ||
      (W.tmode === 'all'
        ? W.tags.every((t) => w.tags.includes(t))
        : W.tags.some((t) => w.tags.includes(t)))) &&
    (!W.jt.length || W.jt.includes(w.jt)) &&
    (!W.ai.length || W.ai.includes(w.ai)) &&
    w.star >= W.star &&
    w.uses >= W.uses
  )
}
const wfChips = () => {
  const W = S.W,
    c = []
  if (W.q.trim()) c.push(['q', '', '“' + W.q.trim() + '”'])
  W.tags.forEach((t) => c.push(['tags', t, '#' + t]))
  if (W.tags.length > 1 && W.tmode === 'all')
    c.push(['tmode', '', 'Has all tags'])
  W.jt.forEach((t) => c.push(['jt', t, 'For: ' + t]))
  W.ai.forEach((t) => c.push(['ai', t, 'AI: ' + t]))
  if (W.star) c.push(['star', '', 'Rating ' + W.star + '+'])
  if (W.uses) c.push(['uses', '', 'Used ' + W.uses + '+ times'])
  return c
}
const wfMoreN = () => {
  const W = S.W
  return W.jt.length + W.ai.length + (W.star ? 1 : 0) + (W.uses ? 1 : 0)
}
function workflows() {
  const W = S.W,
    L = S.wfs.filter(wfMatch).sort(SORTS[W.sort][1]),
    chips = wfChips(),
    act = chips.filter((c) => c[0] !== 'tmode').length,
    mn = wfMoreN(),
    cur = S.wviews.find((v) => wfSame(v.f)),
    plain = wfSame(WF0)
  const tgl = (a, v, on, l) =>
    '<button type="button" class="tag btn2" data-a="' +
    a +
    '" data-v="' +
    v +
    '" aria-pressed="' +
    on +
    '">' +
    l +
    '</button>'
  let h =
    '<section class="card" aria-label="Workflows"><div class="ch"><h2>Workflows</h2><button type="button" class="btn sm" data-a="newwf">' +
    IC('plus') +
    'New workflow</button></div><p class="lead">A workflow is a saved plan you can run again. Filter them like any list in the app.</p>' +
    '<div class="fline"><button type="button" class="btn more" data-a="wmore" aria-expanded="' +
    !!W.more +
    '">' +
    IC('sliders') +
    'More filters' +
    (mn ? ' · ' + mn : '') +
    '</button><input class="inp" id="wq" type="search" placeholder="Search workflows" value="' +
    esc(W.q) +
    '" aria-label="Search workflows">' +
    '<button type="button" class="chip' +
    (W.tags.length ? ' on' : '') +
    '" data-a="wtags" aria-haspopup="dialog">' +
    IC('tag') +
    '<span>Tags' +
    (W.tags.length ? ' · ' + W.tags.length : '') +
    '</span>' +
    IC('down') +
    '</button><button type="button" class="chip" data-a="wsort" aria-haspopup="dialog">' +
    IC('sort') +
    '<span>' +
    SORTS[W.sort][0] +
    '</span>' +
    IC('down') +
    '</button></div>' +
    (W.more
      ? '<div class="well fmore"><span class="lbl">For</span><div class="tg" role="group" aria-label="For">' +
        ['Video', 'Article', 'Book', 'Audio']
          .map((x) => tgl('wjt', x, W.jt.includes(x), x))
          .join('') +
        '</div><span class="lbl">AI</span><div class="tg" role="group" aria-label="AI">' +
        ['Claude', 'Any']
          .map((x) =>
            tgl('wai', x, W.ai.includes(x), x === 'Any' ? 'Any AI' : x),
          )
          .join('') +
        '</div><span class="lbl">Rating at least</span><div class="seg sm" role="group" aria-label="Rating at least">' +
        [
          [0, 'Any'],
          [3, '3+'],
          [4, '4+'],
          [4.5, '4.5+'],
        ]
          .map(
            (x) =>
              '<button type="button" class="' +
              (W.star === x[0] ? 'on' : '') +
              '" aria-pressed="' +
              (W.star === x[0]) +
              '" data-a="wstar" data-v="' +
              x[0] +
              '">' +
              x[1] +
              '</button>',
          )
          .join('') +
        '</div><span class="lbl">Times used at least</span><div class="seg sm" role="group" aria-label="Times used at least">' +
        [
          [0, 'Any'],
          [10, '10+'],
          [25, '25+'],
        ]
          .map(
            (x) =>
              '<button type="button" class="' +
              (W.uses === x[0] ? 'on' : '') +
              '" aria-pressed="' +
              (W.uses === x[0]) +
              '" data-a="wuses" data-v="' +
              x[0] +
              '">' +
              x[1] +
              '</button>',
          )
          .join('') +
        '</div></div>'
      : '') +
    '<div class="vrow" role="group" aria-label="Saved views">' +
    tgl('wview', '', plain, 'All workflows') +
    S.wviews
      .map(
        (v) =>
          '<span class="tag v' +
          (cur === v ? ' on' : '') +
          '"><button type="button" data-a="wview" data-v="' +
          v.id +
          '" aria-pressed="' +
          (cur === v) +
          '">' +
          esc(v.n) +
          '</button><button type="button" class="ib" data-a="wvrm" data-v="' +
          v.id +
          '" aria-label="Delete the view ' +
          esc(v.n) +
          '" title="Delete view">' +
          IC('x') +
          '</button></span>',
      )
      .join('') +
    (!plain && !cur
      ? '<button type="button" class="mt" style="margin-left:0" data-a="wsave">' +
        IC('plus') +
        'Save this view</button>'
      : '') +
    '</div>' +
    '<div class="acts2">' +
    chips
      .map(
        (c) =>
          '<span class="tag">' +
          esc(c[2]) +
          '<button type="button" class="ib" data-a="wchip" data-k="' +
          c[0] +
          '" data-v="' +
          esc(c[1]) +
          '" aria-label="Remove filter ' +
          esc(c[2]) +
          '">' +
          IC('x') +
          '</button></span>',
      )
      .join('') +
    (act
      ? '<button type="button" class="mt" style="margin-left:0" data-a="wclear">Clear all</button>'
      : '') +
    '<span class="cnt" role="status" aria-live="polite">' +
    (act ? L.length + ' of ' + S.wfs.length : S.wfs.length) +
    ' workflow' +
    (S.wfs.length === 1 ? '' : 's') +
    '</span></div>' +
    '<div class="rtab"><div class="rr hd"><span>Name</span><span>Rating</span><span>For</span><span>Used</span><span></span><span></span></div>' +
    (L.length
      ? L.map(
          (w) =>
            '<div class="rr"><div class="nm"><b>' +
            esc(w.n) +
            '</b><div class="tg">' +
            w.tags
              .map(
                (t) =>
                  '<span class="tag" style="padding-right:10px">#' +
                  t +
                  '</span>',
              )
              .join('') +
            '</div></div><div class="c">' +
            stars(w.star) +
            '</div><div class="c" data-l="For">' +
            esc(w.jt) +
            '</div><div class="c us" data-l="Used">' +
            w.uses +
            ' times</div><div class="go"><button type="button" class="btn sm" data-a="rate" data-id="' +
            w.id +
            '" aria-haspopup="menu">' +
            IC('star') +
            (w.my ? w.my + '★' : 'Rate') +
            '</button></div><div class="go row" style="flex-wrap:nowrap">' +
            chip() +
            '<button type="button" class="btn sm pri" data-a="runwf" data-id="' +
            w.id +
            '">' +
            IC('play') +
            'Run</button><button type="button" class="ib sm" data-a="editwf" data-id="' +
            w.id +
            '" aria-label="Edit ' +
            esc(w.n) +
            '" title="Edit">' +
            IC('dots') +
            '</button></div></div>',
        ).join('')
      : '<div class="empty" style="margin-top:12px">No workflow matches these filters.<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn" data-a="wclear">Clear all</button></div></div>') +
    '</div></section>'
  if (S.sug.length)
    h +=
      '<section class="card pc" aria-label="Prompt checker"><div class="ch"><h2>Prompt checker</h2><span class="mini">Claude reviews your workflows and suggests updates</span><button type="button" class="btn sm" data-a="check">' +
      IC('wand') +
      'Check now</button></div>' +
      S.sug
        .map(
          (g) =>
            '<div class="sg"><b>' +
            esc(g.t) +
            ' <span class="mini">· ' +
            esc(wfName(g.wf)) +
            '</span></b><p>' +
            esc(g.d) +
            '</p><div class="row"><button type="button" class="btn sm pri" data-a="sugok" data-id="' +
            g.id +
            '">Accept</button><button type="button" class="btn sm" data-a="sugno" data-id="' +
            g.id +
            '">Not now</button></div></div>',
        )
        .join('') +
      '</section>'
  return h
}
/* the universal pop-over for the Tag picker and Sort: stays open while you tick, closes on Done, outside tap or Esc */
let FP = null
function fpopClose() {
  const p = $('#fpop')
  if (p) p.remove()
  if (FP) {
    const a = $(FP.sel)
    if (a) a.setAttribute('aria-expanded', 'false')
  }
  FP = null
}
function fpopDraw() {
  if (!FP) return
  let p = $('#fpop')
  const f = document.activeElement && document.activeElement.id === 'tpq',
    pos = f ? document.activeElement.selectionStart : 0
  if (!p) {
    p = document.createElement('div')
    p.className = 'fpop'
    p.id = 'fpop'
    p.setAttribute('role', 'dialog')
    p.setAttribute('aria-label', FP.label)
    document.body.appendChild(p)
  }
  const y = (p.querySelector('.fl2') || {}).scrollTop || 0
  p.innerHTML = FP.draw()
  const l = p.querySelector('.fl2')
  if (l) l.scrollTop = y
  const a = $(FP.sel)
  if (a && innerWidth > 640) {
    const r = a.getBoundingClientRect(),
      w = p.offsetWidth,
      hh = p.offsetHeight
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px'
    p.style.top =
      Math.max(8, Math.min(innerHeight - hh - 8, r.bottom + 8)) + 'px'
  }
  if (a) a.setAttribute('aria-expanded', 'true')
  if (f) {
    const i = $('#tpq')
    if (i) {
      i.focus()
      try {
        i.setSelectionRange(pos, pos)
      } catch (_) {}
    }
  }
  Shell.clearable(p, (i) => i.id === 'tpq')
}
function fpop(sel, label, draw) {
  if (FP && FP.sel === sel) {
    fpopClose()
    return
  }
  fpopClose()
  Shell.closePop()
  FP = { sel, label, draw }
  fpopDraw()
}
function tagPicker() {
  const W = S.W,
    q = (S.tq || '').toLowerCase().trim(),
    all = [...new Set(S.wfs.flatMap((w) => w.tags))].sort(),
    L = all.filter((t) => !q || t.includes(q))
  return (
    '<div class="fh"><b>Tags</b><button type="button" class="ib sm" data-a="fpx" aria-label="Close" title="Close">' +
    IC('x') +
    '</button></div>' +
    '<div class="seg sm" role="group" aria-label="Match">' +
    [
      ['any', 'Has any'],
      ['all', 'Has all'],
    ]
      .map(
        (x) =>
          '<button type="button" class="' +
          (W.tmode === x[0] ? 'on' : '') +
          '" aria-pressed="' +
          (W.tmode === x[0]) +
          '" data-a="tmode" data-v="' +
          x[0] +
          '">' +
          x[1] +
          '</button>',
      )
      .join('') +
    '</div>' +
    '<input class="inp" id="tpq" type="search" placeholder="Find a tag" value="' +
    esc(S.tq || '') +
    '" aria-label="Find a tag">' +
    '<div class="fl2">' +
    (L.length
      ? L.map(
          (t) =>
            '<label class="fo"><input type="checkbox" data-a="tpick" data-v="' +
            t +
            '" ' +
            (W.tags.includes(t) ? 'checked' : '') +
            '><span>#' +
            t +
            '</span><small>' +
            S.wfs.filter((w) => w.tags.includes(t)).length +
            '</small></label>',
        ).join('')
      : '<p class="note" style="padding:10px 8px">No tag matches.</p>') +
    '</div>' +
    '<div class="ff"><button type="button" class="btn sm" data-a="tpclear"' +
    (W.tags.length ? '' : ' disabled') +
    '>Clear</button><button type="button" class="btn sm pri" data-a="fpx">Done</button></div>'
  )
}
const sortPicker = () =>
  '<div class="fh"><b>Sort by</b><button type="button" class="ib sm" data-a="fpx" aria-label="Close" title="Close">' +
  IC('x') +
  '</button></div>' +
  Object.keys(SORTS)
    .map(
      (k) =>
        '<button type="button" class="fo" role="radio" aria-checked="' +
        (S.W.sort === k) +
        '" data-a="sortpick" data-v="' +
        k +
        '"><span class="rd"></span><span>' +
        SORTS[k][0] +
        '</span></button>',
    )
    .join('')

/* ---------- Activity ---------- */
function activity() {
  return (
    '<section class="card" aria-label="Activity"><div class="ch"><h2>What the AI changed</h2><span class="mini">' +
    S.act.filter((a) => !a.un).length +
    ' active</span></div><ul class="al">' +
    S.act
      .map(
        (a) =>
          '<li class="' +
          (a.un ? 'un' : '') +
          '"><span class="ico">' +
          IC(a.ico) +
          '</span><div class="g"><b>' +
          esc(a.t) +
          '</b><small>' +
          esc(a.d) +
          ' · ' +
          esc(a.w) +
          '</small>' +
          (a.job ? more('ad' + a.id, 'Steps') : '') +
          '</div><button type="button" class="btn sm" data-a="actundo" data-id="' +
          a.id +
          '">' +
          (a.un ? 'Redo' : 'Undo') +
          '</button>' +
          (a.job && S.open['ad' + a.id] ? jobDetail(a.job) : '') +
          '</li>',
      )
      .join('') +
    '</ul></section>' +
    (S.cost.hist
      ? '<section class="card"><div class="ch"><h2>Usage and spend</h2><button type="button" class="btn sm" data-a="usage">Open history</button></div><p class="lead" style="margin:0">' +
        budget().txt +
        '. ' +
        S.usage.length +
        ' runs so far, ' +
        S.usage.filter((u) => u.c === 0).length +
        ' of them free.</p></section>'
      : '')
  )
}
