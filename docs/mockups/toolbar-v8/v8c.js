/* ============ v8c: V4 custom tools (Professional; Beginner can unlock them) ============
   ★ at the end of every tool row saves the setup you have NOW as a one-tap tool: any mix of Pen, Shape, Eraser, Lasso and Text box.
   The save sheet asks for a name, a picture and WHERE it sits (row + position) and shows the toolbar as it will look.
   Hold a custom tool for Edit mode (drag to reorder, tap to change, ✕ to remove). More › Custom tools manages them all.
   The row never scrolls sideways: tools that do not fit fold into one "⋯ n" button. */
if (!ST.ct || !Array.isArray(ST.ct.list)) {
  ST.ct = { list: [], unlock: false, seq: 1 }
}
const CT = { edit: false, draft: null, fresh: null, suppress: false, ht: 0 }
const ctOn = () => isPro() || !!ST.ct.unlock
const CTROWS = [
  ['main', 'Main bar'],
  ['text', 'Text'],
  ['pen', 'Pen'],
  ['shapes', 'Shapes'],
  ['eraser', 'Eraser'],
  ['lasso', 'Lasso'],
]
const ctRowName = (r) =>
  r === 'main' ? 'Main bar' : CTROWS.find((x) => x[0] === r)[1] + ' row'
const CTPART = {
  pen: 'pen',
  text: 'box',
  shapes: 'shape',
  eraser: 'eraser',
  lasso: 'lasso',
}
const CTSH = {
  free: ['Freehand', 'pen'],
  line: ['Line', 'diagonal'],
  arrow: ['Arrow', 'arrow'],
  box: ['Box', 'square'],
  oval: ['Oval', 'oval'],
  triangle: ['Triangle', 'triangle'],
  tape: ['Tape', 'tape'],
}
const ctColName = (c, hl) =>
  ((hl ? HLCOL : PENCOL).find((x) => x[1] === c) || ['Own colour'])[0]
const ctFont = (v) =>
  (FONTS.find((f) => f[1] === (v.ff || 'inherit')) || ['Default'])[0]
const CTP = {
  pen: {
    n: 'Pen',
    tab: 'pen',
    get: () => {
      const hl = R.pen === 'Highlighter'
      return {
        pen: R.pen,
        col: hl ? R.hlCol : R.penCol,
        size: hl ? R.hlSize : R.size,
        exact: hl ? null : PN.exact,
        ls: PN.ls,
        pOn: PN.pOn,
        press: PN.press,
        smooth: PN.smooth,
        sharp: PN.sharp,
        op: HN.op,
      }
    },
    set: (p) => {
      R.pen = p.pen
      if (p.pen === 'Highlighter') {
        R.hlCol = p.col
        R.hlSize = p.size
        HN.op = p.op
      } else {
        R.penCol = p.col
        R.size = p.size
        PN.exact = p.exact
        PN.ls = p.ls
        PN.pOn = p.pOn
        PN.press = p.press
        PN.smooth = p.smooth
        PN.sharp = p.sharp
      }
    },
    sum: (p) =>
      pname(p.pen) +
      ' · ' +
      (p.exact != null ? p.exact + ' px' : p.size) +
      ' · ' +
      ctColName(p.col, p.pen === 'Highlighter'),
    pv: (p) => v7Sample(TYPEK[p.pen], cdot(p.col), 30, 14),
  },
  shape: {
    n: 'Shape',
    tab: 'shapes',
    get: () => ({ shape: PN.shape }),
    set: (p) => {
      PN.shape = p.shape
    },
    sum: (p) => (CTSH[p.shape] || CTSH.line)[0],
    pv: (p) => svg((CTSH[p.shape] || CTSH.line)[1]),
  },
  eraser: {
    n: 'Eraser',
    tab: 'eraser',
    get: () => ({
      mode: E.mode,
      size: E.size,
      hlOnly: E.hlOnly,
      ret: E.ret,
      beg: R.eraser,
    }),
    set: (p) => {
      E.mode = p.mode
      E.size = p.size
      E.hlOnly = p.hlOnly
      E.ret = p.ret
      R.eraser = p.beg
    },
    sum: (p) =>
      isPro()
        ? { precise: 'Precise', standard: 'Standard', stroke: 'Whole stroke' }[
            p.mode
          ] +
          ' · ' +
          ['Thin', 'Medium', 'Thick'][p.size] +
          (p.hlOnly ? ' · highlights only' : '')
        : p.beg,
    pv: (p) =>
      '<i class="v7edot" style="width:' +
      [8, 13, 18][p.size] +
      'px;height:' +
      [8, 13, 18][p.size] +
      'px"></i>',
  },
  lasso: {
    n: 'Lasso',
    tab: 'lasso',
    get: () => ({
      shape: ST.lasso.shape,
      ink: ST.lasso.ink,
      pictures: ST.lasso.pictures,
      text: ST.lasso.text,
      beg: R.lassoMode,
    }),
    set: (p) => {
      ST.lasso.shape = p.shape
      ST.lasso.ink = p.ink
      ST.lasso.pictures = p.pictures
      ST.lasso.text = p.text
      R.lassoMode = p.beg
    },
    sum: (p) =>
      isPro()
        ? (p.shape === 'rect' ? 'Rectangle' : 'Free-hand') +
          ' · picks ' +
          (['ink', 'pictures', 'text'].filter((k) => p[k]).join(', ') ||
            'nothing')
        : p.beg,
    pv: (p) =>
      svg(
        (isPro() ? p.shape === 'rect' : p.beg === 'Rectangle')
          ? 'square'
          : 'lasso',
      ),
  },
  box: {
    n: 'Text box',
    tab: 'text',
    get: () => {
      const b = curBox()
      return {
        v: { ...curV() },
        size: b ? b.dataset.size || 'body' : R.defSize || 'body',
      }
    },
    set: (p) => {
      setStyle(p.v, true)
      setStyle({ ff: p.v.ff || null })
      const b = curBox()
      if (!b) R.defSize = p.size
    },
    sum: (p) => styleName(p.v) + ' · ' + ctFont(p.v) + ' font',
    pv: (p) => bprev(p.v),
  },
}
const CTKEYS = ['pen', 'shape', 'eraser', 'lasso', 'box']
const ctGet = (id) => ST.ct.list.find((t) => t.id === id)
const ctIn = (row) => ST.ct.list.filter((t) => t.row === row)
const ctMain = (t) => {
  const k = CTPART[t.row]
  if (k && t.parts[k]) return k
  return CTKEYS.find((k) => t.parts[k])
}
const ctTab = (t) => {
  const k = ctMain(t)
  let tab = CTP[k].tab
  if (tab === 'pen' && t.parts.shape && t.parts.shape.shape !== 'free')
    tab = 'shapes'
  return tab
}
const ctSum = (t) =>
  CTKEYS.filter((k) => t.parts[k])
    .map((k) => CTP[k].n + ': ' + CTP[k].sum(t.parts[k]))
    .join(' + ')
const ctMatch = (t) =>
  V.tab === ctTab(t) &&
  CTKEYS.every(
    (k) =>
      !t.parts[k] ||
      JSON.stringify(CTP[k].get()) === JSON.stringify(t.parts[k]),
  )
function ctPrev(t) {
  if (t.icon && t.icon !== 'auto')
    return '<span class="v8ctp">' + svg(t.icon) + '</span>'
  const k = ctMain(t)
  return (
    '<span class="v8ctp">' +
    (k ? CTP[k].pv(t.parts[k]) : svg('star')) +
    '</span>'
  )
}
function ctNat(r) {
  if (r === 'main')
    return ['Text', 'Pen', 'Eraser', 'Shapes', 'Lasso', 'Insert']
  const pro = isPro()
  return {
    text: pro
      ? ['Box', 'Format', 'Style', 'B', 'I', 'List']
      : ['Box', 'Format', 'B', 'I'],
    pen: ['Pen type', 'Size', 'Colour', 'Feel', 'Favourites'],
    shapes: ['Shape', 'Size', 'Colour'],
    eraser: pro ? ['Mode', 'Size', 'Options'] : ['Mode'],
    lasso: pro ? ['Select', 'Menu', 'Layers'] : ['Shape', 'Actions'],
  }[r]
}

/* ---- the order model: natives are fixed, custom tools sit before native number `pos` ---- */
function ctSeq(row) {
  const N = ctNat(row).length,
    cs = ctIn(row),
    seq = []
  for (let i = 0; i < N; i++) {
    cs.forEach((c) => {
      if (Math.min(c.pos, N) === i) seq.push({ c })
    })
    seq.push({ n: i })
  }
  cs.forEach((c) => {
    if (c.pos >= N) seq.push({ c })
  })
  return seq
}
function ctApply(row, seq) {
  let nat = 0
  const order = []
  seq.forEach((it) => {
    if ('n' in it) nat++
    else {
      it.c.pos = nat
      order.push(it.c)
    }
  })
  ST.ct.list = ST.ct.list.filter((t) => t.row !== row).concat(order)
  save()
  ctRender()
}
function ctMoveBefore(id, target) {
  const t = ctGet(id)
  if (!t) return
  const seq = ctSeq(t.row).filter((it) => !(it.c && it.c.id === id))
  let i = seq.length
  if (target) {
    const j = seq.findIndex((it) =>
      target.ct ? it.c && it.c.id === target.ct : it.n === target.nat,
    )
    if (j >= 0) i = j
  }
  seq.splice(i, 0, { c: t })
  ctApply(t.row, seq)
}
function ctNudge(id, d) {
  const t = ctGet(id)
  if (!t) return false
  const seq = ctSeq(t.row),
    i = seq.findIndex((it) => it.c && it.c.id === id),
    j = i + d
  if (j < 0 || j >= seq.length) return false
  const x = seq[i]
  seq[i] = seq[j]
  seq[j] = x
  ctApply(t.row, seq)
  return true
}
const ctCanNudge = (id, d) => {
  const t = ctGet(id),
    seq = ctSeq(t.row),
    i = seq.findIndex((it) => it.c && it.c.id === id)
  return i + d >= 0 && i + d < seq.length
}

/* ---- buttons on the bars ---- */
function ctBtn(t) {
  const b = document.createElement('button')
  b.type = 'button'
  const used = ctMatch(t)
  b.className =
    'v8ct' + (used ? ' used' : '') + (CT.fresh === t.id ? ' v8new' : '')
  b.dataset.ct = t.id
  b.setAttribute('aria-label', 'Custom tool: ' + t.name)
  b.setAttribute('aria-pressed', used)
  b.dataset.tip = CT.edit ? 'Drag to move, tap to change' : ctSum(t)
  b.innerHTML =
    ctPrev(t) +
    '<span class="nm">' +
    esc(t.name) +
    '</span><span class="rm" role="button" aria-label="Remove ' +
    esc(t.name) +
    '">' +
    svg('xmark') +
    '</span>'
  return b
}
function ctFold(host, measure, after) {
  if (innerWidth <= 640) return
  const hid = []
  let cts = $$('.v8ct', host),
    o = null
  const over = () => measure.scrollWidth > measure.clientWidth + 1
  if (over() && cts.length) host.classList.add('v8tight')
  while (over() && cts.length) {
    const b = cts.pop()
    hid.unshift(b.dataset.ct)
    b.remove()
    if (!o) {
      o = document.createElement('button')
      o.type = 'button'
      o.className = 'v8ovf'
      o.dataset.ctx = 'ovf'
      after(o)
    }
    o.dataset.ids = hid.join(',')
    o.setAttribute('aria-label', hid.length + ' more custom tools')
    o.dataset.tip = hid.length + ' more custom tools'
    o.innerHTML = svg('more') + '<span>' + hid.length + '</span>'
  }
}
function ctRow() {
  const row = $('#opts .v6row')
  if (!row) return
  row.classList.toggle('v8editing', CT.edit && ctOn())
  if (!ctOn()) return
  const nat = [...row.children].filter((c) => c.classList.contains('v6b'))
  ctIn(V.tab).forEach((t) => {
    const b = ctBtn(t),
      i = Math.min(t.pos, nat.length)
    if (i >= nat.length) row.append(b)
    else row.insertBefore(b, nat[i])
  })
  const g = document.createElement('span')
  g.className = 'v8grow'
  row.append(g)
  if (CT.edit)
    row.insertAdjacentHTML(
      'beforeend',
      '<span class="v8hint">Drag to reorder · tap to change</span><button type="button" class="v8done" data-ctx="done" aria-label="Done editing custom tools">' +
        svg('check2') +
        'Done</button>',
    )
  else
    row.insertAdjacentHTML(
      'beforeend',
      '<button type="button" class="v8star" data-ctx="save" aria-label="Save this setup as a custom tool" data-tip="Save this setup as a custom tool">' +
        svg('starplus') +
        '</button>',
    )
  ctFold(row, row, (o) => g.after(o))
}
function ctBar() {
  tb.classList.toggle('v8editing', CT.edit && ctOn())
  if (!ctOn()) return
  const g = $('.v6tools', tb)
  if (!g) return
  const nat = [...g.children]
  ctIn('main').forEach((t) => {
    const b = ctBtn(t),
      i = Math.min(t.pos, nat.length)
    if (i >= nat.length) g.append(b)
    else g.insertBefore(b, nat[i])
  })
  ctFold(g, tb, (o) => g.append(o))
}
{
  const ro8 = renderOpts
  renderOpts = function () {
    ro8()
    ctRow()
  }
}
{
  const rt8 = renderToolbar
  renderToolbar = function () {
    rt8()
    ctBar()
  }
}
function ctRender() {
  renderToolbar()
  if (CT.fresh)
    setTimeout(() => {
      CT.fresh = null
    }, 1300)
}
addEventListener('resize', () => {
  if (ST.ct.list.length && ctOn()) renderToolbar()
})

/* ---- use, save, remove ---- */
function ctUse(id) {
  const t = ctGet(id)
  if (!t) return
  const snap = v8Snap(),
    was = V.tab
  V8.noFb++
  try {
    CTKEYS.forEach((k) => {
      if (t.parts[k]) CTP[k].set(t.parts[k])
    })
    save()
    v6Tool(ctTab(t))
    renderToolbar()
  } finally {
    V8.noFb--
  }
  $$('#barbox .v8ct[data-ct="' + id + '"]').forEach((b) => {
    if (!v7RM()) b.classList.add('v7pop')
  })
  v8Toast('“' + t.name + '” is ready', () => {
    v8Restore(snap)
    v6Tool(was)
    renderToolbar()
    toast('Back to how it was')
  })
}
function ctRemove(id) {
  const i = ST.ct.list.findIndex((t) => t.id === id)
  if (i < 0) return
  const t = ST.ct.list.splice(i, 1)[0]
  save()
  if (!ST.ct.list.length) CT.edit = false
  ctRender()
  rerender()
  v8Toast('Removed “' + t.name + '”', () => {
    ST.ct.list.splice(Math.min(i, ST.ct.list.length), 0, t)
    save()
    CT.fresh = t.id
    ctRender()
    rerender()
    toast('“' + t.name + '” is back')
  })
}
function ctDraftName(k, p) {
  const n =
    k === 'pen'
      ? pname(p.pen)
      : k === 'box'
        ? styleName(p.v) + ' box'
        : k === 'shape'
          ? CTP.shape.sum(p)
          : CTP[k].n
  return n.slice(0, 16)
}
function ctNew() {
  const row = V.tab,
    k = CTPART[row],
    parts = {},
    inc = {}
  CTKEYS.forEach((x) => {
    parts[x] = CTP[x].get()
    inc[x] = x === k
  })
  if (row === 'shapes') inc.pen = true
  CT.draft = {
    id: null,
    name: ctDraftName(k, parts[k]),
    icon: 'auto',
    row,
    pos: ctNat(row).length,
    parts,
    inc,
  }
  ctSheet()
}
function ctEdit(id) {
  const t = ctGet(id)
  if (!t) return
  const parts = {},
    inc = {}
  CTKEYS.forEach((x) => {
    inc[x] = !!t.parts[x]
    parts[x] = t.parts[x]
      ? JSON.parse(JSON.stringify(t.parts[x]))
      : CTP[x].get()
  })
  CT.draft = {
    id,
    name: t.name,
    icon: t.icon || 'auto',
    row: t.row,
    pos: Math.min(t.pos, ctNat(t.row).length),
    parts,
    inc,
  }
  ctSheet()
}
const ctDraftTool = () => {
  const d = CT.draft,
    parts = {}
  CTKEYS.forEach((k) => {
    if (d.inc[k]) parts[k] = d.parts[k]
  })
  return {
    id: d.id || '_draft',
    name: d.name,
    icon: d.icon,
    row: d.row,
    pos: d.pos,
    parts,
  }
}
const CTICONS = [
  'auto',
  'star',
  'pen',
  'brush',
  'pencil',
  'hlight',
  'typeic',
  'square',
  'eraser',
  'lasso',
  'shapes',
  'tag',
  'sparkle',
]
function ctSheet() {
  const d = CT.draft
  if (!d) return
  openSheet(
    '<h3>' +
      (d.id ? 'Edit custom tool' : 'Save as a custom tool') +
      '</h3><p class="muted">One tap brings this exact setup back.</p>' +
      '<div class="v8lab">Name</div><div class="v8ctl"><span id="ctPv"></span><span class="v8clr"><input class="field" id="ctName" maxlength="16" autocomplete="off" aria-label="Name" value="' +
      esc(d.name) +
      '"><button type="button" data-ctx="clr" aria-label="Clear the name">' +
      svg('xmark') +
      '</button></span></div>' +
      '<div class="v8lab">Picture</div><div class="v8icons" id="ctIcons" role="radiogroup" aria-label="Picture"></div>' +
      '<div class="v8lab">What it sets</div><div class="v8well" id="ctParts"></div><p class="v8note">It keeps the settings you have right now. Switch on parts from other tools to mix them.</p>' +
      (d.id
        ? '<button type="button" class="v8wide" data-ctx="recap">' +
          svg('rotcw') +
          'Update to my current setup</button>'
        : '') +
      '<div class="v8lab">Where it sits</div><div class="v8rows" id="ctRows" role="radiogroup" aria-label="Row"></div><div class="v8pos" id="ctPos"></div><div class="v8tbp" id="ctTbp" aria-label="Toolbar preview"></div>' +
      (d.id
        ? '<button type="button" class="v8wide dz" data-ctx="del">' +
          svg('trash') +
          'Remove this tool</button>'
        : ''),
    '<button class="lay" data-ctx="cancel">' +
      svg('xmark') +
      'Cancel</button><button class="lay primary" id="ctOk" data-ctx="ok">' +
      svg('check2') +
      (d.id ? 'Save changes' : 'Save tool') +
      '</button>',
    ctSheet,
  )
  ctSync()
  ctNoFocus()
}
function ctNoFocus() {
  setTimeout(() => {
    const a = document.activeElement
    if (a && a.tagName === 'INPUT' && sheet.contains(a) && !CT.typing) a.blur()
  }, 45)
}
function ctSync() {
  const d = CT.draft
  if (!d || !$('#ctParts')) return
  const t = ctDraftTool(),
    nat = ctNat(d.row),
    N = nat.length
  d.pos = Math.max(0, Math.min(d.pos, N))
  $('#ctPv').innerHTML = ctPrev(t)
  $('#ctIcons').innerHTML = CTICONS.map(
    (ic) =>
      '<button type="button" role="radio" aria-checked="' +
      (d.icon === ic) +
      '" class="' +
      (d.icon === ic ? 'on' : '') +
      '" data-ctx="icon" data-v="' +
      ic +
      '" aria-label="' +
      (ic === 'auto' ? 'Live preview' : ic + ' icon') +
      '">' +
      (ic === 'auto'
        ? ctPrev({ ...t, icon: 'auto' }) + '<small>Live</small>'
        : svg(ic)) +
      '</button>',
  ).join('')
  $('#ctParts').innerHTML = CTKEYS.map(
    (k) =>
      '<button type="button" class="v8part" role="switch" data-v8quiet aria-checked="' +
      !!d.inc[k] +
      '" data-ctx="part" data-k="' +
      k +
      '" aria-label="' +
      CTP[k].n +
      '"><span class="v8ctp">' +
      CTP[k].pv(d.parts[k]) +
      '</span><span class="tx"><b>' +
      CTP[k].n +
      '</b><i>' +
      esc(CTP[k].sum(d.parts[k])) +
      '</i></span><span class="sw2" aria-hidden="true"></span></button>',
  ).join('')
  $('#ctRows').innerHTML = CTROWS.map(
    ([r, n]) =>
      '<button type="button" role="radio" aria-checked="' +
      (d.row === r) +
      '" class="' +
      (d.row === r ? 'on' : '') +
      '" data-ctx="row" data-v="' +
      r +
      '">' +
      n +
      '</button>',
  ).join('')
  $('#ctPos').innerHTML =
    '<button type="button" data-ctx="pos" data-d="-1" aria-label="Move earlier"' +
    (d.pos <= 0 ? ' disabled' : '') +
    '>' +
    svg('chevL') +
    '</button><span class="where">' +
    (d.pos === 0
      ? '<b>First</b> in the ' + ctRowName(d.row).toLowerCase()
      : 'After <b>' + nat[d.pos - 1] + '</b>') +
    '</span><button type="button" data-ctx="pos" data-d="1" aria-label="Move later"' +
    (d.pos >= N ? ' disabled' : '') +
    '>' +
    svg('chevR') +
    '</button>'
  $('#ctTbp').innerHTML = ctPicture()
  $('#ctOk').disabled = !d.name.trim() || !CTKEYS.some((k) => d.inc[k])
}
function ctPicture() {
  const d = CT.draft,
    me = '<span class="c me">' + esc(d.name.trim() || 'New tool') + '</span>'
  const line = (row) => {
    const nat = ctNat(row),
      N = nat.length,
      cs = ctIn(row).filter((c) => c.id !== d.id)
    let h = ''
    for (let i = 0; i <= N; i++) {
      cs.forEach((c) => {
        if (Math.min(c.pos, N) === i)
          h += '<span class="c ct">' + esc(c.name) + '</span>'
      })
      if (d.row === row && d.pos === i) h += me
      if (i < N) h += '<span class="c">' + nat[i] + '</span>'
    }
    return h
  }
  const tool = d.row === 'main' ? V.tab : d.row
  return (
    '<span class="cap">' +
    (d.row === 'main'
      ? 'On the main bar, whatever tool you are using.'
      : 'Shows when you are on ' +
        CTROWS.find((x) => x[0] === d.row)[1] +
        '.') +
    '</span><div class="bar"><div class="r' +
    (d.row === 'main' ? '' : ' dim') +
    '">' +
    line('main') +
    '<span class="sp"></span><span class="c">' +
    svg('more') +
    '</span></div>' +
    '<div class="r' +
    (d.row === 'main' ? ' dim' : '') +
    '">' +
    line(tool) +
    '<span class="c star">' +
    svg('starplus') +
    '</span></div></div>'
  )
}
function ctSave() {
  const d = CT.draft
  if (!d) return
  const name = d.name.trim().slice(0, 16)
  if (!name || !CTKEYS.some((k) => d.inc[k])) return
  const parts = {}
  CTKEYS.forEach((k) => {
    if (d.inc[k]) parts[k] = d.parts[k]
  })
  const before = JSON.stringify(ST.ct.list)
  let t
  if (d.id) {
    t = ctGet(d.id)
    ST.ct.list = ST.ct.list.filter((x) => x.id !== d.id)
    Object.assign(t, { name, icon: d.icon, parts })
  } else t = { id: 'ct' + ST.ct.seq++, name, icon: d.icon, parts }
  t.row = d.row
  t.pos = d.pos
  const seq = ctSeq(d.row),
    N = ctNat(d.row).length
  let i = seq.findIndex((it) => it.n === d.pos)
  if (i < 0 || d.pos >= N) i = seq.length
  seq.splice(i, 0, { c: t })
  CT.draft = null
  CT.fresh = t.id
  closeSheet()
  ctApply(d.row, seq)
  v8Toast(
    (d.id ? 'Saved “' : 'Added “') +
      name +
      '” to the ' +
      ctRowName(t.row).toLowerCase(),
    () => {
      ST.ct.list = JSON.parse(before)
      save()
      ctRender()
      toast(d.id ? 'Changes undone' : '“' + name + '” removed')
    },
  )
}

/* ---- the manager: use on top, manage below (owner-ui-patterns 10) ---- */
function ctManager() {
  const L = ST.ct.list,
    on = ctOn()
  CT.draft = null
  const tiles = L.map(
    (t) =>
      '<button type="button" class="v8tile" data-ctx="use" data-id="' +
      t.id +
      '" aria-label="Use ' +
      esc(t.name) +
      '">' +
      ctPrev(t) +
      '<span>' +
      esc(t.name) +
      '</span><small>' +
      ctRowName(t.row) +
      '</small></button>',
  ).join('')
  const rows = L.map(
    (t) =>
      '<div class="v8mrow" data-id="' +
      t.id +
      '">' +
      ctPrev(t) +
      '<input class="field" data-ctx="rename" data-id="' +
      t.id +
      '" data-noclr maxlength="16" autocomplete="off" aria-label="Name of ' +
      esc(t.name) +
      '" value="' +
      esc(t.name) +
      '"><span></span><span class="wh">' +
      ctRowName(t.row) +
      ' · ' +
      esc(
        CTKEYS.filter((k) => t.parts[k])
          .map((k) => CTP[k].n)
          .join(' + '),
      ) +
      '</span>' +
      '<div class="acts"><button type="button" data-ctx="nudge" data-d="-1" data-id="' +
      t.id +
      '" aria-label="Move ' +
      esc(t.name) +
      ' earlier"' +
      (ctCanNudge(t.id, -1) ? '' : ' disabled') +
      '>' +
      svg('chevL') +
      '</button><button type="button" data-ctx="nudge" data-d="1" data-id="' +
      t.id +
      '" aria-label="Move ' +
      esc(t.name) +
      ' later"' +
      (ctCanNudge(t.id, 1) ? '' : ' disabled') +
      '>' +
      svg('chevR') +
      '</button>' +
      '<button type="button" data-ctx="edit" data-id="' +
      t.id +
      '">' +
      svg('sliders') +
      'Change</button><button type="button" data-ctx="dup" data-id="' +
      t.id +
      '">' +
      svg('dup') +
      'Duplicate</button><button type="button" class="dz" data-ctx="rm" data-id="' +
      t.id +
      '" aria-label="Delete ' +
      esc(t.name) +
      '">' +
      svg('trash') +
      '</button></div></div>',
  ).join('')
  openSheet(
    '<h3>Custom tools</h3><p class="muted">Your own one-tap tools. Each one brings back a setup you saved.</p>' +
      (isPro()
        ? ''
        : '<div class="v8well"><button type="button" class="v8part" role="switch" aria-checked="' +
          !!ST.ct.unlock +
          '" data-ctx="unlock" aria-label="Custom tools"><span class="tx"><b>Custom tools</b><i>A Professional feature you can use in Beginner.</i></span><span class="sw2" aria-hidden="true"></span></button></div>') +
      (L.length
        ? '<div class="v8lab">Use</div><div class="v8tiles">' +
          tiles +
          '</div><div class="v8lab">Manage</div><div class="v8well">' +
          rows +
          '</div>' +
          (on
            ? '<button type="button" class="v8wide" data-ctx="editmode">' +
              svg('move') +
              'Reorder on the toolbar</button>'
            : '')
        : '<div class="v8empty">' +
          svg('starplus') +
          '<span>No custom tools yet.<br>Set a tool up the way you like it, then tap ★ at the end of its row.</span></div>'),
    '<button class="lay primary" data-act="close">' +
      svg('check2') +
      'Done</button>',
    ctManager,
  )
  ctNoFocus()
}
function v8MoreRows(pane) {
  const ref = $('[data-z=cust]', pane) || $('[data-z=sett]', pane)
  if (!ref || $('[data-ctx]', pane)) return
  const n = ST.ct.list.length
  ref.insertAdjacentHTML(
    'afterend',
    ctOn()
      ? '<button class="mrow" data-ctx="manager" aria-label="Custom tools">' +
          svg('starplus') +
          '<span class="mt"><b>Custom tools</b><i>' +
          (n
            ? n + ' saved. Use, rename, reorder or remove them.'
            : 'Save a setup as a one-tap tool with ★.') +
          '</i></span>' +
          svg('chevR') +
          '</button>'
      : '<button class="mrow" role="switch" aria-checked="false" data-ctx="unlock" aria-label="Custom tools">' +
          svg('starplus') +
          '<span class="mt"><b>Custom tools</b><i>A Professional feature. Turn it on to save your own one-tap tools.</i></span><span class="sw2" aria-hidden="true"></span></button>',
  )
}

/* ---- taps ---- */
document.addEventListener('click', (e) => {
  const el = e.target.closest && e.target.closest('[data-ct],[data-ctx]')
  if (!el) return
  if (el.dataset.ct && !el.dataset.ctx) {
    e.stopPropagation()
    if (CT.suppress) {
      CT.suppress = false
      return
    }
    const id = el.dataset.ct
    if (e.target.closest('.rm') && CT.edit) {
      ctRemove(id)
      return
    }
    if (CT.edit) {
      ctEdit(id)
      return
    }
    ctUse(id)
    return
  }
  const k = el.dataset.ctx,
    d = CT.draft,
    ds = el.dataset
  if (el.tagName === 'INPUT') return
  e.stopPropagation()
  if (k === 'save') {
    v6Close()
    v6Sync()
    ctNew()
  } else if (k === 'done') {
    CT.edit = false
    ctRender()
  } else if (k === 'ovf') {
    const ids = (ds.ids || '').split(',').filter(Boolean)
    if (menu.classList.contains('show') && V.menuFor === 'ctovf') {
      closeMenu()
      V.menuFor = null
      return
    }
    v6Close()
    renderOpts()
    V.menuFor = 'ctovf'
    const a =
      [...document.querySelectorAll('#barbox .v8ovf')].find(
        (x) => x.dataset.ids === ds.ids,
      ) ||
      document.querySelector('#barbox .v8ovf') ||
      el
    openMenu(
      [
        ...ids.map((id) => {
          const t = ctGet(id)
          return { t: t.name, f: () => ctUse(id) }
        }),
        { t: 'Manage custom tools…', f: () => ctManager() },
      ],
      a,
      'More custom tools',
    )
  } else if (k === 'manager') {
    if (MC.open) moreClose()
    ctManager()
  } else if (k === 'unlock') {
    ST.ct.unlock = !ST.ct.unlock
    save()
    if (!ST.ct.unlock) CT.edit = false
    renderToolbar()
    if (MC.open) renderMore()
    rerender()
    const on = ST.ct.unlock
    v8Toast('Custom tools turned ' + (on ? 'on' : 'off'), () => {
      ST.ct.unlock = !on
      save()
      renderToolbar()
      if (MC.open) renderMore()
      rerender()
      toast('Custom tools ' + (on ? 'are off again' : 'are on again'))
    })
  } else if (k === 'use') {
    closeSheet()
    ctUse(ds.id)
  } else if (k === 'edit') {
    ctEdit(ds.id)
  } else if (k === 'rm') {
    ctRemove(ds.id)
  } else if (k === 'dup') {
    const t = ctGet(ds.id)
    if (!t) return
    const c = JSON.parse(JSON.stringify(t))
    c.id = 'ct' + ST.ct.seq++
    c.name = t.name.slice(0, 14) + ' 2'
    ST.ct.list.splice(ST.ct.list.indexOf(t) + 1, 0, c)
    save()
    CT.fresh = c.id
    ctRender()
    rerender()
    toast('Duplicated “' + t.name + '”')
  } else if (k === 'nudge') {
    if (ctNudge(ds.id, +ds.d)) {
      rerender()
      const r = $('.v8mrow[data-id="' + ds.id + '"]')
      if (r && !v7RM()) r.classList.add('v8rowglow')
    }
  } else if (k === 'editmode') {
    closeSheet()
    const t = ST.ct.list[0]
    CT.edit = true
    if (t && t.row !== 'main' && !ctIn(V.tab).length && !ctIn('main').length)
      v6Tool(t.row)
    ctRender()
    toast('Edit mode: drag to reorder, tap a tool to change it')
  } else if (!d) return
  else if (k === 'cancel') {
    CT.draft = null
    closeSheet()
  } else if (k === 'ok') ctSave()
  else if (k === 'clr') {
    d.name = ''
    const i = $('#ctName')
    i.value = ''
    i.focus()
    ctSync()
  } else if (k === 'icon') {
    d.icon = ds.v
    ctSync()
  } else if (k === 'part') {
    const on = !d.inc[ds.k]
    if (!on && CTKEYS.filter((x) => d.inc[x]).length <= 1) {
      toast('A tool needs at least one part')
      return
    }
    d.inc[ds.k] = on
    ctSync()
  } else if (k === 'row') {
    d.row = ds.v
    d.pos = ctNat(d.row).length
    ctSync()
  } else if (k === 'pos') {
    d.pos += +ds.d
    ctSync()
  } else if (k === 'recap') {
    CTKEYS.forEach((x) => {
      if (d.inc[x]) d.parts[x] = CTP[x].get()
    })
    ctSync()
    toast('Now holds your current setup')
  } else if (k === 'del') {
    const id = d.id
    CT.draft = null
    closeSheet()
    ctRemove(id)
  }
})
document.addEventListener('input', (e) => {
  const i = e.target
  if (!i || !i.dataset) return
  if (i.id === 'ctName' && CT.draft) {
    CT.draft.name = i.value
    const me = $('#ctTbp .me')
    if (me) me.textContent = i.value.trim() || 'New tool'
    $('#ctOk').disabled =
      !i.value.trim() || !CTKEYS.some((k) => CT.draft.inc[k])
  } else if (i.dataset.ctx === 'rename') {
    CT.typing = true
    const t = ctGet(i.dataset.id),
      v = i.value.trim()
    if (t && v) {
      t.name = v.slice(0, 16)
      save()
      ctRender()
    }
  }
})
document.addEventListener('change', (e) => {
  const i = e.target
  if (i && i.dataset && i.dataset.ctx === 'rename') {
    CT.typing = false
    const t = ctGet(i.dataset.id)
    if (!t) return
    if (!i.value.trim()) i.value = t.name
    const s = $('.v8tile[data-id="' + t.id + '"]>span:not(.v8ctp)', sheet)
    if (s) s.textContent = t.name
  }
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && CT.edit && !sheet.classList.contains('show')) {
    CT.edit = false
    ctRender()
  }
  if (e.key === 'Enter' && e.target && e.target.id === 'ctName') {
    e.preventDefault()
    ctSave()
  }
})

/* ---- hold to edit, then drag to reorder (pointer capture, a drop line shows where it lands) ---- */
const ctLine = document.createElement('div')
ctLine.className = 'v8dropline'
ctLine.hidden = true
document.body.append(ctLine)
let CTD = null
const ctItems = (box) =>
  [...box.children].filter((c) => c.matches('.v8ct,.v6b,.ic'))
document.addEventListener(
  'pointerdown',
  (e) => {
    const b = e.target.closest && e.target.closest('#barbox .v8ct')
    if (!b || e.button) return
    if (!CT.edit) {
      clearTimeout(CT.ht)
      CT.hx = e.clientX
      CT.hy = e.clientY
      CT.ht = setTimeout(() => {
        CT.ht = 0
        CT.edit = true
        CT.suppress = true
        ctRender()
        toast('Edit mode: drag to reorder, tap a tool to change it')
      }, 550)
      return
    }
    if (e.target.closest('.rm')) return
    CTD = {
      b,
      id: b.dataset.ct,
      x0: e.clientX,
      moved: false,
      box: b.parentElement,
      idx: -1,
    }
    try {
      b.setPointerCapture(e.pointerId)
    } catch (_) {}
  },
  true,
)
document.addEventListener(
  'pointermove',
  (e) => {
    if (CT.ht && Math.hypot(e.clientX - CT.hx, e.clientY - CT.hy) > 8) {
      clearTimeout(CT.ht)
      CT.ht = 0
    }
    if (!CTD) return
    const dx = e.clientX - CTD.x0
    if (!CTD.moved && Math.abs(dx) < 6) return
    CTD.moved = true
    CTD.b.classList.add('drag')
    CTD.b.style.translate = dx + 'px 0'
    const its = ctItems(CTD.box).filter((x) => x !== CTD.b)
    let idx = its.findIndex((x) => {
      const r = x.getBoundingClientRect()
      return e.clientX < r.left + r.width / 2
    })
    if (idx < 0) idx = its.length
    CTD.idx = idx
    const ref = its[idx],
      prev = its[idx - 1],
      br = CTD.box.getBoundingClientRect(),
      x = ref
        ? ref.getBoundingClientRect().left - 3
        : prev
          ? prev.getBoundingClientRect().right + 1
          : br.left
    ctLine.style.cssText =
      'left:' +
      Math.round(x) +
      'px;top:' +
      Math.round(br.top + 7) +
      'px;height:' +
      Math.round(br.height - 14) +
      'px'
    ctLine.hidden = false
    e.preventDefault()
  },
  true,
)
;['pointerup', 'pointercancel'].forEach((n) =>
  document.addEventListener(
    n,
    () => {
      clearTimeout(CT.ht)
      CT.ht = 0
      if (!CTD) return
      const d = CTD
      CTD = null
      ctLine.hidden = true
      d.b.classList.remove('drag')
      d.b.style.translate = ''
      if (!d.moved) return
      CT.suppress = true
      setTimeout(() => {
        CT.suppress = false
      }, 60)
      const its = ctItems(d.box).filter((x) => x !== d.b),
        ref = its[d.idx]
      ctMoveBefore(
        d.id,
        ref
          ? ref.dataset.ct
            ? { ct: ref.dataset.ct }
            : { nat: its.filter((x) => !x.dataset.ct).indexOf(ref) }
          : null,
      )
    },
    true,
  ),
)
{
  const st8 = setTool
  setTool = function (t, q) {
    if (CT.edit && t !== 'pen' && t !== R.tool) CT.edit = false
    return st8(t, q)
  }
}
