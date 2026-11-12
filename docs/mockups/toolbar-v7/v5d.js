/* ============ v5: Elements (stickers, arrows, emoji, badges, animated GIFs) ============
   Insert > Elements opens one card: header with Edit, search, category tabs, a grid of previews. Tap = it lands on the page (drag it like any object).
   Edit: move up/down, rename, delete (with Undo), Add your own. A "Recent elements" row sits in All tools > Shapes & aids. */
const ES = (p, c) =>
  '<svg viewBox="0 0 24 24" class="elsvg" style="color:' +
  c +
  '" aria-hidden="true">' +
  p +
  '</svg>'
const EP = {
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  alert:
    '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  ques: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  goal: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  aR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  aL: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  aU: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  aD: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  aBent: '<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  aCurve:
    '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
  aDiag: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  aLoop:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  spark:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',
}
const EB = (t, c) =>
  '<span class="elbadge" style="--bc:' + c + '">' + t + '</span>'
const EE = (g) => '<span class="elemo" aria-hidden="true">' + g + '</span>'
/* [category, id, name, search words, preview/object html, width on the page] */
const ELB = [
  ['Study', 'bulb', 'Big idea', 'light lamp think', ES(EP.bulb, '#f0b94a'), 72],
  [
    'Study',
    'warn',
    'Warning',
    'important alert careful',
    ES(EP.alert, '#ef7a6f'),
    72,
  ],
  ['Study', 'ques', 'Question', 'help ask why', ES(EP.ques, '#5aa9ff'), 72],
  [
    'Study',
    'well',
    'Well done',
    'check tick correct yes',
    ES(EP.ok, '#4cc38a'),
    72,
  ],
  ['Study', 'fav', 'Favourite', 'star best', ES(EP.star, '#f0b94a'), 72],
  ['Study', 'book', 'Book', 'read study', ES(EP.book, '#a48df5'), 72],
  ['Study', 'goal', 'Goal', 'target aim', ES(EP.goal, '#ef7a6f'), 72],
  ['Study', 'time', 'Deadline', 'clock time due', ES(EP.clock, '#9a98a8'), 72],
  ['Arrows', 'aR', 'Arrow right', 'next', ES(EP.aR, '#5aa9ff'), 72],
  ['Arrows', 'aL', 'Arrow left', 'back', ES(EP.aL, '#5aa9ff'), 72],
  ['Arrows', 'aU', 'Arrow up', 'increase', ES(EP.aU, '#4cc38a'), 72],
  ['Arrows', 'aD', 'Arrow down', 'decrease', ES(EP.aD, '#ef7a6f'), 72],
  ['Arrows', 'aB', 'Bent arrow', 'turn then', ES(EP.aBent, '#a48df5'), 72],
  ['Arrows', 'aC', 'Curved arrow', 'undo back', ES(EP.aCurve, '#a48df5'), 72],
  ['Arrows', 'aG', 'Diagonal arrow', 'grow', ES(EP.aDiag, '#f0b94a'), 72],
  ['Arrows', 'aP', 'Loop arrows', 'repeat cycle', ES(EP.aLoop, '#4cc38a'), 72],
  ['Emoji', 'e1', 'Smile', 'happy face', EE('\u{1F600}'), 64],
  ['Emoji', 'e2', 'Love it', 'heart eyes', EE('\u{1F60D}'), 64],
  ['Emoji', 'e3', 'Party', 'celebrate', EE('\u{1F389}'), 64],
  ['Emoji', 'e4', 'Thumbs up', 'good yes', EE('\u{1F44D}'), 64],
  ['Emoji', 'e5', 'On fire', 'hot', EE('\u{1F525}'), 64],
  ['Emoji', 'e6', 'Brain', 'think smart', EE('\u{1F9E0}'), 64],
  ['Emoji', 'e7', 'Rocket', 'fast launch', EE('\u{1F680}'), 64],
  ['Emoji', 'e8', 'Wow', 'amazed star', EE('\u{1F929}'), 64],
  [
    'Badges',
    'b1',
    'Must know',
    'important exam',
    EB('Must know', '#ef7a6f'),
    120,
  ],
  ['Badges', 'b2', 'Revise', 'review again', EB('Revise', '#5aa9ff'), 100],
  ['Badges', 'b3', 'Easy', 'simple', EB('Easy', '#4cc38a'), 84],
  ['Badges', 'b4', 'Hard', 'difficult', EB('Hard', '#f0b94a'), 84],
  ['Badges', 'b5', 'Exam', 'test', EB('Exam', '#a48df5'), 84],
  ['Badges', 'b6', 'New', 'fresh', EB('New', '#5aa9ff'), 76],
  ['Badges', 'b7', 'Mastered', 'done learned', EB('Mastered', '#4cc38a'), 110],
  ['Badges', 'b8', 'Tricky', 'careful', EB('Tricky', '#ef7a6f'), 92],
  [
    'GIFs',
    'g1',
    'Spinning star',
    'animated turn',
    ES(EP.star, '#f0b94a').replace('class="elsvg"', 'class="elsvg gspin"'),
    80,
  ],
  [
    'GIFs',
    'g2',
    'Beating heart',
    'animated love',
    ES(EP.heart, '#ef7a6f').replace('class="elsvg"', 'class="elsvg gbeat"'),
    80,
  ],
  [
    'GIFs',
    'g3',
    'Bouncing ball',
    'animated',
    ' <span class="gball" aria-hidden="true"></span>',
    64,
  ],
  [
    'GIFs',
    'g4',
    'Sparkles',
    'animated shine',
    ES(EP.spark, '#f0b94a').replace('class="elsvg"', 'class="elsvg gtwinkle"'),
    80,
  ],
  [
    'GIFs',
    'g5',
    'Waving hand',
    'animated hello',
    EE('\u{1F44B}').replace('elemo', 'elemo gwave'),
    72,
  ],
  [
    'GIFs',
    'g6',
    'Confetti',
    'animated party',
    ' <span class="gconf" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>',
    80,
  ],
].map(([cat, id, name, kw, html, w]) => ({
  cat,
  id: 'el-' + id,
  name,
  kw,
  html,
  w,
}))
const ELCATS = ['Recent', 'Study', 'Arrows', 'Emoji', 'Badges', 'GIFs', 'Mine']
{
  const had = !!ST.el
  ST.el = Object.assign(
    { recent: [], order: {}, names: {}, gone: [], mine: [] },
    ST.el || {},
  )
  if (!had) ST.el.recent = ['el-bulb', 'el-ques', 'el-well', 'el-goal']
}
const EL = { open: false, cat: 'Study', q: '', edit: false }
const elAll = () =>
  ELB.concat(ST.el.mine.map((m) => Object.assign({}, m, { cat: 'Mine' }))).map(
    (x) => Object.assign({}, x, { name: ST.el.names[x.id] || x.name }),
  )
const elFind = (id) => elAll().find((x) => x.id === id)
const elList = (cat) => {
  const all = elAll().filter(
      (x) => x.cat === cat && !ST.el.gone.includes(x.id),
    ),
    ord = ST.el.order[cat] || []
  return all.sort((a, b) => {
    const ia = ord.indexOf(a.id),
      ib = ord.indexOf(b.id)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })
}
const elRecent = () =>
  ST.el.recent.map(elFind).filter((x) => x && !ST.el.gone.includes(x.id))
const elVisible = () => {
  const q = EL.q.trim().toLowerCase()
  if (q)
    return elAll().filter(
      (x) =>
        !ST.el.gone.includes(x.id) &&
        (x.name + ' ' + (x.kw || '') + ' ' + x.cat).toLowerCase().includes(q),
    )
  return EL.cat === 'Recent' ? elRecent() : elList(EL.cat)
}
const elcard = document.createElement('div')
elcard.id = 'elcard'
elcard.className = 'pop col ecard acard glass blur nofocus'
elcard.setAttribute('role', 'dialog')
elcard.setAttribute('aria-label', 'Elements')
elcard.setAttribute('aria-hidden', 'true')
$('#bars').append(elcard)
const elFile = document.createElement('input')
elFile.type = 'file'
elFile.accept = 'image/*'
elFile.hidden = true
elFile.id = 'elFile'
elFile.setAttribute('aria-label', 'Choose a picture')
document.body.append(elFile)
const elTile = (x) =>
  '<button class="eltile' +
  (x.cat === 'GIFs' ? ' isgif' : '') +
  '" role="listitem" data-el="ins" data-id="' +
  x.id +
  '" aria-label="' +
  esc(x.name) +
  '"><span class="elprev">' +
  x.html +
  '</span><span class="elname">' +
  esc(x.name) +
  '</span></button>'
function elRows(items) {
  const isR = EL.cat === 'Recent' && !EL.q.trim()
  return items
    .map(
      (x, i) =>
        '<div class="elrow" role="listitem" data-id="' +
        x.id +
        '"><span class="elprev">' +
        x.html +
        '</span><span class="elname">' +
        esc(x.name) +
        '</span>' +
        (isR
          ? ''
          : '<button class="sq" data-el="up" data-id="' +
            x.id +
            '" aria-label="Move ' +
            esc(x.name) +
            ' earlier"' +
            (i === 0 ? ' disabled' : '') +
            '>' +
            svg('up') +
            '</button><button class="sq" data-el="down" data-id="' +
            x.id +
            '" aria-label="Move ' +
            esc(x.name) +
            ' later"' +
            (i === items.length - 1 ? ' disabled' : '') +
            '>' +
            svg('down') +
            '</button><button class="sq" data-el="ren" data-id="' +
            x.id +
            '" aria-label="Rename ' +
            esc(x.name) +
            '">' +
            svg('pencil') +
            '</button>') +
        '<button class="sq dz" data-el="del" data-id="' +
        x.id +
        '" aria-label="Delete ' +
        esc(x.name) +
        '">' +
        svg('trash') +
        '</button></div>',
    )
    .join('')
}
function elGrid() {
  const g = $('#elPane', elcard)
  if (!g) return
  g.style.maxHeight = ''
  const items = elVisible(),
    q = EL.q.trim()
  let h = ''
  if (!items.length)
    h =
      '<p class="elempty">' +
      (q
        ? 'No elements match “' + esc(q) + '”. Try another word.'
        : EL.cat === 'Recent'
          ? 'Elements you use show up here.'
          : EL.cat === 'Mine'
            ? 'Nothing of your own yet.'
            : 'Nothing here. Elements you delete can come back with Undo, or add your own.') +
      '</p>'
  else
    h = EL.edit
      ? '<div class="ellist" role="list">' + elRows(items) + '</div>'
      : '<div class="elgrid" role="list">' +
        items.map(elTile).join('') +
        '</div>'
  if (EL.edit && EL.cat === 'Recent' && !q)
    h += enote(
      'Recent follows what you use. Delete removes an element from this list only.',
    )
  if ((EL.edit || EL.cat === 'Mine') && !q)
    h +=
      '<button class="abtn" data-el="add">' +
      svg('plus') +
      '<span>Add your own</span><small>a picture from your device</small></button>'
  g.innerHTML = h
  fitCard(elcard)
  const c = $('#elClr', elcard)
  if (c) c.hidden = !EL.q
  $$('.ctab', elcard).forEach((t) => {
    const on = !q && t.dataset.cat === EL.cat
    t.classList.toggle('on', on)
    t.setAttribute('aria-selected', on)
  })
}
function elHtml() {
  return (
    '<div class="ch"><strong>Elements</strong><button class="edbtn' +
    (EL.edit ? ' on' : '') +
    '" data-el="edit" aria-pressed="' +
    EL.edit +
    '">' +
    (EL.edit ? 'Done' : 'Edit') +
    '</button><button class="sq" data-el="close" aria-label="Close">✕</button></div>' +
    '<div class="elsearch">' +
    svg('search') +
    '<input id="elQ" type="text" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search elements" aria-label="Search elements" value="' +
    esc(EL.q) +
    '"><button class="elclr" id="elClr" data-el="clr" aria-label="Clear search"' +
    (EL.q ? '' : ' hidden') +
    '>' +
    svg('xmark') +
    '</button></div>' +
    '<div class="ctabs" role="tablist" aria-label="Element categories">' +
    ELCATS.map(
      (c) =>
        '<button class="ctab" role="tab" data-cat="' +
        c +
        '" aria-selected="false">' +
        c +
        '</button>',
    ).join('') +
    '</div>' +
    '<div class="cpane elpane" id="elPane" role="tabpanel"></div>'
  )
}
function renderEl() {
  if (EL.open && R.acard) EL.open = false
  const on =
    EL.open && R.tool === 'insert' && R.optsOn && !R.reading && !R.tbHidden
  elcard.classList.toggle('show', on)
  elcard.setAttribute('aria-hidden', !on)
  if (!on) {
    if (!EL.open) EL.edit = false
    return
  }
  const q = $('#elQ', elcard),
    had = q && document.activeElement === q,
    ss = q ? q.selectionStart : 0
  fillCard(elcard, elHtml())
  elGrid()
  placeCard(elcard)
  fitCard(elcard)
  if (had) {
    const n = $('#elQ', elcard)
    n.focus()
    try {
      n.setSelectionRange(ss, ss)
    } catch (_) {}
  }
}
function elOpen(on) {
  if (on === undefined) on = !EL.open
  EL.open = on
  if (on) {
    R.acard = false
    R.ecard = false
    R.lcard = false
    EL.cat = elRecent().length ? 'Recent' : 'Study'
    EL.q = ''
    EL.edit = false
    if (!R.optsOn) R.optsOn = true
    if (ST.min.opts) setMin('opts', false)
  }
  renderOpts()
}
function elNoteRecent(id) {
  ST.el.recent = [id, ...ST.el.recent.filter((x) => x !== id)].slice(0, 10)
  save()
  ACHIPS_refresh()
}
function elInsert(id) {
  const it = elFind(id)
  if (!it) return
  if (['pen', 'eraser', 'lasso', 'read'].includes(R.tool)) setTool('text', true)
  const s = freeSpot(),
    b = makeBox({
      t: 'pic',
      x: s.x,
      y: s.y,
      w: (it.w || 72) + 'px',
      size: 'body',
      st: 'none',
      h:
        '<div class="pic el" data-el="' +
        it.id +
        '" role="img" aria-label="' +
        esc(it.name) +
        '">' +
        it.html +
        '</div>',
    })
  select(b)
  commit()
  elNoteRecent(id)
  if (EL.open) elGrid()
}
/* the card's own taps */
elcard.addEventListener('click', (e) => {
  const b = e.target.closest('[data-el],[data-cat]')
  if (!b) return
  if (b.dataset.cat) {
    EL.cat = b.dataset.cat
    EL.q = ''
    const q = $('#elQ', elcard)
    if (q) q.value = ''
    elGrid()
    const p = $('#elPane', elcard)
    if (p) p.scrollTop = 0
    return
  }
  const k = b.dataset.el,
    id = b.dataset.id
  if (k === 'close') {
    elOpen(false)
  } else if (k === 'ins') {
    elInsert(id)
  } else if (k === 'edit') {
    EL.edit = !EL.edit
    renderEl()
  } else if (k === 'clr') {
    EL.q = ''
    const q = $('#elQ', elcard)
    if (q) {
      q.value = ''
      q.focus()
    }
    elGrid()
  } else if (k === 'add') {
    elFile.value = ''
    elFile.click()
  } else if (k === 'up' || k === 'down') {
    const cat = EL.cat,
      ids = elList(cat).map((x) => x.id),
      i = ids.indexOf(id),
      j = k === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    ST.el.order[cat] = ids
    save()
    elGrid()
    const nb = $('[data-el="' + k + '"][data-id="' + id + '"]', elcard)
    if (nb && !nb.disabled) nb.focus()
  } else if (k === 'ren') {
    const it = elFind(id)
    Shell.ask('Rename this element', it.name, (v) => {
      v = (v || '').trim().slice(0, 24)
      if (!v) return
      const taken = elAll().some(
        (x) => x.id !== id && x.name.toLowerCase() === v.toLowerCase(),
      )
      if (taken) {
        toast('That name is already used. Pick another.')
        return
      }
      ST.el.names[id] = v
      save()
      ACHIPS_refresh()
      elGrid()
    })
  } else if (k === 'del') {
    const it = elFind(id)
    if (!it) return
    if (EL.cat === 'Recent' && !EL.q.trim()) {
      const i = ST.el.recent.indexOf(id)
      ST.el.recent.splice(i, 1)
      save()
      ACHIPS_refresh()
      elGrid()
      toastAct('Removed from Recent', 'Undo', () => {
        ST.el.recent.splice(i, 0, id)
        save()
        ACHIPS_refresh()
        elGrid()
      })
      return
    }
    const mineI = ST.el.mine.findIndex((m) => m.id === id)
    let gone = null
    if (mineI >= 0) gone = ST.el.mine.splice(mineI, 1)[0]
    else ST.el.gone.push(id)
    save()
    ACHIPS_refresh()
    elGrid()
    toastAct('“' + it.name + '” deleted', 'Undo', () => {
      if (gone) ST.el.mine.splice(mineI, 0, gone)
      else ST.el.gone = ST.el.gone.filter((x) => x !== id)
      save()
      ACHIPS_refresh()
      if (EL.open) elGrid()
    })
  }
})
elcard.addEventListener('input', (e) => {
  if (e.target.id !== 'elQ') return
  EL.q = e.target.value
  elGrid()
})
elcard.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && e.target.id === 'elQ') {
    if (EL.q) {
      EL.q = ''
      e.target.value = ''
      elGrid()
      e.stopPropagation()
    }
  }
})
elFile.addEventListener('change', () => {
  const f = elFile.files && elFile.files[0]
  if (!f) return
  if (f.size > 400 * 1024) {
    toast('That picture is too big for this demo. Try one under 400 KB.')
    return
  }
  const r = new FileReader()
  r.onload = () => {
    let nm =
        (f.name || 'My picture').replace(/\.[^.]+$/, '').slice(0, 24) ||
        'My picture',
      n = 2,
      base = nm
    while (elAll().some((x) => x.name.toLowerCase() === nm.toLowerCase()))
      nm = base + ' ' + n++
    ST.el.mine.push({
      id: 'my-' + uid(),
      name: nm,
      kw: 'mine my own',
      html: '<img class="elimg" alt="" src="' + r.result + '">',
      w: 120,
    })
    try {
      save()
    } catch (_) {}
    EL.cat = 'Mine'
    EL.q = ''
    renderEl()
  }
  r.readAsDataURL(f)
})
/* hooks: the pill button, the card inside the one-card rules, placement */
{
  const ia0 = insertAct
  insertAct = function (k) {
    if (k === 'elements') {
      elOpen()
      return
    }
    return ia0.apply(this, arguments)
  }
}
{
  const ra1 = renderAcard
  renderAcard = function () {
    ra1()
    fitCard(acard)
    renderEl()
  }
}
{
  const po1 = placeOpts
  placeOpts = function () {
    po1()
    placeCard(elcard)
  }
}
{
  const co = cardOpen,
    cc = closeCards
  cardOpen = function () {
    return co() || (EL.open && elcard.classList.contains('show'))
  }
  closeCards = function () {
    cc()
    if (EL.open) {
      EL.open = false
      renderEl()
    }
  }
}
{
  const st0 = setTool
  setTool = function (t, q) {
    if (t !== 'insert' && EL.open) {
      EL.open = false
      EL.edit = false
    }
    return st0(t, q)
  }
}
/* All tools > Shapes & aids: the Recent elements row */
const ELBASE = ALLTABS['Shapes & aids'].slice()
function ACHIPS_refresh() {
  elRecent()
    .slice(0, 8)
    .forEach((x) => {
      ACHIP[x.name] = {
        ic: () => '<span class="elthumb">' + x.html + '</span>',
        f: () => elInsert(x.id),
      }
    })
  const ch = $('#allChips')
  if (ch) ch.dataset.t = ''
  if (typeof renderAll === 'function') renderAll()
}
ACHIP['See all elements'] = {
  ic: () => svg('sticker'),
  f: () => {
    if (R.tool !== 'insert') setTool('insert')
    EL.open = true
    R.acard = false
    EL.cat = elRecent().length ? 'Recent' : 'Study'
    EL.q = ''
    EL.edit = false
    renderOpts()
  },
}
Object.defineProperty(ALLTABS, 'Shapes & aids', {
  enumerable: true,
  configurable: true,
  get() {
    const r = elRecent().slice(0, 4)
    r.forEach((x) => {
      ACHIP[x.name] = {
        ic: () => '<span class="elthumb">' + x.html + '</span>',
        f: () => elInsert(x.id),
      }
    })
    return [
      ...ELBASE,
      '#Recent elements',
      ...r.map((x) => x.name),
      'See all elements',
    ]
  },
})
