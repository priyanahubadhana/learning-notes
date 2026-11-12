/* ==== shell.js · the ONE shared app shell for every mock-up (12 Nov 2026) ====
   Paste this whole file first in a mock's <script>. See shell-spec.md.
   Needs in the page:  <nav id="sh-rail">  <header id="sh-top">  (optional: <aside id="sh-side">, <aside id="sh-panel">, .sh-main)
   Everything else (tab bar, scrim, sheet, dialog, pop, toast, chip dock) is created here.

   UNIVERSAL AI BAR (13 Nov 2026): every top bar gets ONE "AI" button (before the page's own actions). It opens an AI bar
   (a small panel under the button; a bottom sheet at 640 px and below) holding every AI action: Copy prompt, Paste the answer,
   Suggest tags, Summarise, Make cards, Send to Claude (Claude through the connector is the default AI source; nothing is sent in a mock).
   API (all optional; with none of it the bar still works with honest demo toasts):
     Shell.ai.page({
       context:()=>({title:'Atomic Habits', text:'the text the AI should read', prompt:'optional instruction that replaces the default'}),
       handlers:{copy, tags, summarise, cards, send: ctx=>{}, paste:(answerText,ctx)=>{}},   // override a built-in action
       actions:[{id:'x', label:'Auto-tag everything', desc:'one line', icon:'tag', run:ctx=>{}}]  // page-specific rows under "On this page"
     })                                  // call again whenever the page changes: it REPLACES the previous registration. Shell.ai.page(null) clears it.
     Shell.ai.open(anchor?) / .close() / .toggle() / .isOpen()
     Shell.top({ai:false}) or Shell.mount({ai:false}) hides the button on a page that must not have it.
   The bar closes before a handler runs, so a handler can call Shell.toast / Shell.dialog freely. Esc, the scrim and the close button dismiss it. */
const Shell = (() => {
  const $ = (s) => document.querySelector(s)
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    )
  /* ---- the icon set: 24 grid, 1.6 stroke, round caps (Lucide style). One name = one drawing. ---- */
  const I = {
    /* rail: kept */
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
    gear: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
    /* rail: redesigned (U2). A = the pick, B = the alternative. */
    libraryA:
      '<path d="M3 20.5h18"/><rect x="4" y="5" width="4" height="12.5" rx="1"/><rect x="8" y="8" width="4" height="9.5" rx="1"/><path d="m13.6 7.4 3.5-1 3 10.2-3.5 1z"/>',
    libraryB:
      '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    notebooksA:
      '<path d="M12.5 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5.5"/><path d="M3 7.5h4M3 12h4M3 16.5h4"/><path d="m14.3 20.7.6-2.7 4.8-4.8a1.45 1.45 0 0 1 2.05 2.05L17 20.1z"/>',
    notebooksB:
      '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7.5h4M3 12h4M3 16.5h4"/><path d="M11 8h5M11 12h5M11 16h3"/>',
    reviewA:
      '<rect x="3" y="7.5" width="14.5" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10.5"/><path d="m7 14.2 2.4 2.4 4.4-5"/>',
    reviewB:
      '<path d="M20.5 11A8.5 8.5 0 0 0 5.6 6.4L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M3.5 13a8.5 8.5 0 0 0 14.9 4.6l2.1-2.1"/><path d="M20.5 20.5v-5h-5"/><rect x="9" y="9.5" width="6" height="5" rx="1"/>',
    /* top bar + chrome */
    sidebar:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    panel:
      '<rect x="3" y="4" width="5" height="4" rx="1"/><rect x="3" y="10" width="5" height="4" rx="1"/><rect x="3" y="16" width="5" height="4" rx="1"/><path d="M12 6h9M12 12h9M12 18h6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    fwd: '<path d="m9 18 6-6-6-6"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    sliders:
      '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
    minim: '<path d="M5 12h9"/><path d="m10 8 4 4-4 4"/><path d="M19 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    save: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    trash:
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/><path d="M10 11v5M14 11v5"/>',
    device:
      '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a3 3 0 0 1 5.6 1c0 2-3 2.3-3 4"/><path d="M12 17h.01"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  }
  const warned = new Set()
  const ic = (n, cls) => {
    if (!I[n]) {
      if (!warned.has(n)) {
        warned.add(n)
        console.warn('[shell] missing icon "' + n + '"')
      }
      n = 'help'
    }
    return (
      '<svg viewBox="0 0 24 24"' +
      (cls ? ' class="' + cls + '"' : '') +
      ' aria-hidden="true">' +
      I[n] +
      '</svg>'
    )
  }
  /* AI bar icons (added only when a page has not already defined the same name) */
  {
    const A = {
      sparkle:
        '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',
      copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      paste:
        '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
      send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
      tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
      article:
        '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h6"/><path d="M8 13h8M8 17h5"/>',
      layers:
        '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    }
    for (const k in A) if (!I[k]) I[k] = A[k]
  }
  /* ---- persisted shell state (one key for every mock) ---- */
  const KEY = 'ln-shell-v1'
  let st = {
    theme: null,
    mode: 'beg',
    min: {},
    hpos: {},
    tabs: {},
    minUsed: false,
  }
  try {
    Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}'))
  } catch (_) {}
  st.hpos = st.hpos || {}
  st.tabs = st.tabs || {}
  st.custom = st.custom || {}
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st))
    } catch (_) {}
  }
  /* ---- spaces: the ONE order ---- */
  const SPACES = [
    ['home', 'Home'],
    ['library', 'Library'],
    ['notebooks', 'Notebooks'],
    ['review', 'Review'],
  ]
  /* owner-chosen rail icons: Library A, Notebooks B, Review B (everything else A). A page may override with Shell.rail({icons:{library:'B'}}). */
  const ICONSET = { library: 'A', notebooks: 'B', review: 'B' }
  const spaceIcon = (k) =>
    k === 'home'
      ? 'home'
      : k + ((cfg.icons && cfg.icons[k]) || ICONSET[k] || 'A')
  let cfg = {
    space: 'notebooks',
    due: 0,
    hidden: [],
    onSpace: null,
    onCorner: null,
    corner: null,
    onChange: null,
  }
  const el = (tag, id, cls, attrs) => {
    let n = document.getElementById(id)
    if (!n) {
      n = document.createElement(tag)
      n.id = id
      if (cls) n.className = cls
      document.body.appendChild(n)
    }
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k])
    return n
  }
  /* ---- theme ---- */
  const themeName = () => {
    const t = document.documentElement.dataset.theme
    return t === 'light'
      ? 'Day'
      : t === 'sepia'
        ? 'Sepia'
        : t === 'dark'
          ? 'Night'
          : matchMedia('(prefers-color-scheme: light)').matches
            ? 'Day'
            : 'Night'
  }
  function setTheme(n) {
    document.documentElement.dataset.theme =
      n === 'Day' ? 'light' : n === 'Sepia' ? 'sepia' : 'dark'
    st.theme = n
    save()
    renderRail()
    if (cfg.onChange) cfg.onChange('theme', n)
  }
  /* ---- mode: 'beg' | 'pro' (the only two spellings) ---- */
  function setMode(m) {
    st.mode = m === 'pro' ? 'pro' : 'beg'
    save()
    const a = $('.sh-wrap')
    if (a) a.dataset.mode = st.mode
    document
      .querySelectorAll('[data-sh-mode]')
      .forEach((b) => b.classList.toggle('on', b.dataset.shMode === st.mode))
    if (cfg.onChange) cfg.onChange('mode', st.mode)
  }
  /* ---- rail + phone tab bar ---- */
  function railBtn(k, n, phone) {
    const on = cfg.space === k
    return (
      '<button type="button" class="ib' +
      (on ? ' on' : '') +
      '" data-sh-space="' +
      k +
      '" aria-label="' +
      n +
      '" title="' +
      n +
      '"' +
      (on ? ' aria-current="page"' : '') +
      '>' +
      ic(spaceIcon(k)) +
      (phone ? '<span class="lbl">' + n + '</span>' : '') +
      (k === 'review' && cfg.due
        ? '<span class="bd">' + cfg.due + '</span>'
        : '') +
      '</button>'
    )
  }
  function renderRail() {
    const vis = SPACES.filter(
      (s) => s[0] === 'notebooks' || !cfg.hidden.includes(s[0]),
    )
    const night = themeName() === 'Night'
    const r = $('#sh-rail')
    if (r)
      r.innerHTML =
        '<div class="mk" aria-hidden="true">L</div>' +
        vis.map((s) => railBtn(s[0], s[1])).join('') +
        '<span class="grow"></span><button type="button" class="ib" data-sh-theme aria-label="Switch to ' +
        (night ? 'Day' : 'Night') +
        '" title="Day / Night">' +
        ic(night ? 'sun' : 'moon') +
        '</button><button type="button" class="ib" data-sh-corner aria-label="Settings and more" title="Settings and more" aria-haspopup="menu">' +
        ic('gear') +
        '</button>'
    const t = el('nav', 'sh-tabbar', 'sh-tabbar glass', {
      'aria-label': 'Spaces',
    })
    t.innerHTML =
      vis.map((s) => railBtn(s[0], s[1], true)).join('') +
      '<button type="button" class="ib" data-sh-corner aria-label="Settings and more" aria-haspopup="menu">' +
      ic('gear') +
      '<span class="lbl">More</span></button>'
  }
  /* ---- top bar ---- */
  let top = {
    crumbs: [],
    saved: '',
    actions: '',
    side: false,
    panel: false,
    nav: true,
  }
  let aiOn = false,
    aiPaste = false,
    aiFrom = null
  function renderTop(o) {
    Object.assign(top, o || {})
    const t = $('#sh-top')
    if (!t) return
    const c = top.crumbs
    t.innerHTML =
      (top.side
        ? '<button type="button" class="ib" data-sh-toggle="side" aria-label="Show or hide the sidebar" title="Sidebar">' +
          ic('sidebar') +
          '</button>'
        : '') +
      (top.panel
        ? '<button type="button" class="ib" data-sh-toggle="panel" aria-label="Show or hide the page panel" title="Pages · Outline · Resources">' +
          ic('panel') +
          '</button>'
        : '') +
      (top.nav
        ? '<button type="button" class="ib sm" data-sh-nav="back" aria-label="Back">' +
          ic('back') +
          '</button><button type="button" class="ib sm" data-sh-nav="fwd" aria-label="Forward">' +
          ic('fwd') +
          '</button>'
        : '') +
      '<nav class="sh-crumbs" aria-label="Where you are">' +
      c
        .map((x, i) =>
          i < c.length - 1
            ? '<button type="button" data-sh-crumb="' +
              i +
              '">' +
              esc(x) +
              '</button>' +
              ic('chev')
            : '<b>' + esc(x) + '</b>',
        )
        .join('') +
      '</nav>' +
      (top.saved
        ? '<span class="sh-saved">' + esc(top.saved) + '</span>'
        : '') +
      '<button type="button" class="ib" data-sh-search aria-label="Search (Ctrl K)" title="Search (Ctrl K)">' +
      ic('search') +
      '</button>' +
      (top.ai === false || cfg.ai === false
        ? ''
        : '<button type="button" class="ib sh-aib' +
          (aiOn ? ' on' : '') +
          '" data-sh-ai aria-label="AI" title="AI: copy a prompt, paste the answer, suggest tags" aria-haspopup="dialog" aria-expanded="' +
          aiOn +
          '">' +
          ic('sparkle') +
          '<span>AI</span></button>') +
      (top.actions || '')
  }
  /* ---- side columns: 'dock' | 'over' | 'hidden' ---- */
  function col(which, state) {
    const n = $('#sh-' + which)
    if (!n) return null
    if (state) {
      n.dataset.state = state
      syncScrim()
    }
    return n.dataset.state || 'dock'
  }
  const isPhone = () => innerWidth <= 640
  function toggleCol(which) {
    const s = col(which)
    if (isPhone() || s === 'over') {
      col(which, s === 'over' ? 'hidden' : 'over')
      return
    }
    col(which, s === 'dock' ? 'hidden' : 'dock')
  }
  function syncScrim() {
    const any = ['side', 'panel'].some((w) => {
      const n = $('#sh-' + w)
      return n && n.dataset.state === 'over'
    })
    const hi = sheetOn || dialogOn
    const s = el('div', 'sh-scrim', 'sh-scrim')
    s.classList.toggle('on', any || hi)
    s.classList.toggle('hi', hi)
  }
  /* ---- toast: one at a time, pill, bottom centre; Undo keeps it 6 s ---- */
  let tT = null,
    tUndo = null
  function toast(msg, undo) {
    const t = el('div', 'sh-toast', 'sh-toast', {
      role: 'status',
      'aria-live': 'polite',
    })
    clearTimeout(tT)
    tUndo = undo || null
    t.innerHTML =
      '<span>' +
      esc(msg) +
      '</span>' +
      (undo ? '<button type="button" data-sh-undo>Undo</button>' : '')
    t.classList.toggle('on', true)
    tT = setTimeout(() => t.classList.remove('on'), undo ? 6000 : 2600)
  }
  /* ---- pop menu, anchored to a button ---- */
  function pop(anchor, html) {
    const p = el('div', 'sh-pop', 'sh-pop', { role: 'menu' })
    p.innerHTML = html
    p.hidden = false
    const r = anchor.getBoundingClientRect(),
      w = p.offsetWidth,
      h = p.offsetHeight
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px'
    p.style.top =
      Math.max(8, Math.min(innerHeight - h - 8, r.bottom + 4)) + 'px'
    p._a = anchor
    return p
  }
  function closePop() {
    const p = $('#sh-pop')
    if (p) p.hidden = true
  }
  /* ---- the More sheet: fixed place, full height, header + picker + tabs stay put, only the body scrolls ---- */
  let sheetOn = false,
    sh = null
  function sheetOpen(o) {
    sh = Object.assign(
      {
        title: 'More',
        sub: '',
        picker: null,
        tabs: [],
        tab: null,
        body: () => '',
        hint: 'Changes apply when you tap ✓',
        onClose: null,
      },
      o,
    )
    if (!sh.tab && sh.tabs.length) sh.tab = sh.tabs[0][0]
    sheetOn = true
    sheetDraw(true)
    el('div', 'sh-sheet', 'sh-sheet').classList.add('on')
    syncScrim()
  }
  function sheetDraw(full) {
    const s = el('div', 'sh-sheet', 'sh-sheet', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': sh.title,
    })
    const tabs = typeof sh.tabs === 'function' ? sh.tabs() : sh.tabs
    if (!tabs.some((t) => t[0] === sh.tab)) sh.tab = tabs[0] ? tabs[0][0] : null
    if (full || !s.querySelector('.sh-sbody')) {
      s.innerHTML =
        '<div class="sh-shd"><span class="ib on" style="cursor:default" aria-hidden="true">' +
        ic('sliders') +
        '</span><div class="gr"><h3></h3><p></p></div><button type="button" class="ib" data-sh-sheet="cancel" aria-label="Close without saving">' +
        ic('x') +
        '</button></div><div class="sh-spick"></div><div class="sh-stabs"><div class="utabs scrollx" role="tablist"></div><div class="track"><i></i></div></div><div class="sh-sbody" tabindex="-1"></div><div class="sh-sft"><span class="gr"></span><button type="button" class="btn" data-sh-sheet="cancel">Cancel</button><button type="button" class="btn pri" data-sh-sheet="apply">' +
        ic('check') +
        'Done</button></div>'
    }
    s.querySelector('h3').textContent = sh.title
    s.querySelector('.sh-shd p').textContent =
      typeof sh.sub === 'function' ? sh.sub() : sh.sub
    s.querySelector('.sh-sft .gr').textContent = sh.hint
    const pk = s.querySelector('.sh-spick')
    const keepX = pk.firstElementChild ? pk.firstElementChild.scrollLeft : 0
    pk.innerHTML = sh.picker ? sh.picker() : ''
    pk.hidden = !sh.picker
    if (pk.firstElementChild) pk.firstElementChild.scrollLeft = keepX
    const tb = s.querySelector('.utabs')
    const tx = tb.scrollLeft
    tb.innerHTML = tabs
      .map(
        (t) =>
          '<button type="button" role="tab" aria-selected="' +
          (t[0] === sh.tab) +
          '" data-sh-tab="' +
          t[0] +
          '" class="' +
          (t[0] === sh.tab ? 'on' : '') +
          '">' +
          esc(t[1]) +
          '</button>',
      )
      .join('')
    tb.scrollLeft = tx
    track(tb, s.querySelector('.sh-stabs .track'))
    const b = s.querySelector('.sh-sbody')
    const y = full ? 0 : b.scrollTop
    b.innerHTML = sh.body(sh.tab)
    b.scrollTop = y
    if (sh.after) sh.after()
  }
  function sheetClose(commit) {
    if (!sheetOn) return
    sheetOn = false
    const s = $('#sh-sheet')
    if (s) s.classList.remove('on')
    syncScrim()
    const f = sh && sh.onClose
    if (f) f(!!commit)
  }
  /* ---- small dialogs (ask a name, confirm): centred, content-sized ---- */
  let dialogOn = false
  function dialog(html, wire) {
    const d = el('div', 'sh-dialog', 'sh-dialog', {
      role: 'dialog',
      'aria-modal': 'true',
    })
    d.innerHTML =
      html +
      '<button type="button" class="ib sh-dx" data-sh-dx aria-label="Close" title="Close">' +
      ic('x') +
      '</button>'
    d.classList.add('on')
    dialogOn = true
    syncScrim()
    if (wire) wire(d)
  }
  function dialogClose() {
    const was = dialogOn
    const d = $('#sh-dialog')
    if (d) d.classList.remove('on')
    dialogOn = false
    syncScrim()
    if (was) document.dispatchEvent(new Event('sh-dialog-closed'))
  }
  function ask(title, val, cb) {
    dialog(
      '<h3>' +
        esc(title) +
        '</h3><input class="inp" id="sh-ask" value="' +
        esc(val) +
        '" aria-label="' +
        esc(title) +
        '"><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn pri" data-ok>Done</button></div>',
      (d) => {
        const i = d.querySelector('#sh-ask')
        i.focus()
        i.select()
        const ok = () => {
          const v = i.value.trim()
          dialogClose()
          cb(v)
        }
        d.querySelector('[data-ok]').onclick = ok
        d.querySelector('[data-x]').onclick = dialogClose
        i.onkeydown = (e) => {
          if (e.key === 'Enter') ok()
        }
      },
    )
  }
  function confirmBox(msg, okLabel, cb, note) {
    dialog(
      '<h3>' +
        esc(msg) +
        '</h3><p class="mini" style="margin:0">' +
        esc(note || 'You can undo this.') +
        '</p><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn dng" data-ok>' +
        esc(okLabel) +
        '</button></div>',
      (d) => {
        d.querySelector('[data-x]').onclick = dialogClose
        d.querySelector('[data-ok]').onclick = () => {
          dialogClose()
          cb()
        }
      },
    )
  }
  /* ---- floating bars + minimise chips ---- */
  const bars = {}
  function bar(key, o) {
    bars[key] = Object.assign(
      { label: key, icon: 'sliders', html: '', show: true },
      o,
    )
    drawBars()
  }
  function drawBars() {
    const host = $('.sh-main') || document.body
    const dock = el('div', 'sh-mdock', 'sh-mdock')
    for (const k in bars) {
      const b = bars[k]
      let n = document.getElementById('sh-fbar-' + k)
      if (!n) {
        n = document.createElement('div')
        n.id = 'sh-fbar-' + k
        n.className = 'sh-fbar glass'
        n.setAttribute('role', 'toolbar')
        host.appendChild(n)
      }
      n.setAttribute('aria-label', b.label)
      const min = !!st.min[k]
      n.hidden = !b.show || min
      n.innerHTML =
        b.html +
        '<span class="sep"></span><button type="button" class="ib minb" data-sh-min="' +
        k +
        '" aria-label="Minimise ' +
        esc(b.label) +
        '" title="Minimise to the edge">' +
        ic('minim') +
        '</button>'
      handle(
        'bar-' + k,
        b.show && min
          ? {
              icon: b.icon,
              label: b.label,
              onTap: () => {
                st.min[k] = false
                save()
                drawBars()
              },
            }
          : null,
      )
    }
    dock.innerHTML = ''
    document.documentElement.style.setProperty(
      '--sh-bar',
      Object.keys(bars).some((k) => bars[k].show && !st.min[k])
        ? '60px'
        : '0px',
    )
  }
  /* ---- thin scroll track under any sideways row ---- */
  function track(sc, tr) {
    if (!sc || !tr) return
    const i = tr.querySelector('i')
    const up = () => {
      const r = sc.clientWidth / Math.max(1, sc.scrollWidth)
      tr.classList.toggle('off', r >= 0.999)
      i.style.width = r * 100 + '%'
      i.style.left = (sc.scrollLeft / Math.max(1, sc.scrollWidth)) * 100 + '%'
    }
    sc.onscroll = up
    up()
  }
  /* ---- minimise button: pulse gently every few minutes until it has been used once ---- */
  let pulseT = null
  function pulse() {
    document.querySelectorAll('.minb').forEach((b) => {
      b.classList.remove('pulse')
      void b.offsetWidth
      b.classList.add('pulse')
    })
  }
  function minUsed() {
    if (st.minUsed) return
    st.minUsed = true
    save()
    clearInterval(pulseT)
    document
      .querySelectorAll('.minb.pulse')
      .forEach((b) => b.classList.remove('pulse'))
  }
  function startPulse() {
    if (st.minUsed) return
    setTimeout(() => {
      if (!st.minUsed) pulse()
    }, 45000)
    pulseT = setInterval(() => {
      if (!st.minUsed) pulse()
    }, 180000)
  }
  /* ---- edge handle: a minimised bar shown as a small handle on the left/right edge; drag anywhere, tap restores ---- */
  const clampY = (y) => Math.max(64, Math.min(innerHeight - 80, y))
  function placeHandle(h, key) {
    const p = st.hpos[key] || {
      side: 'r',
      y:
        Math.round(innerHeight * 0.35) +
        64 *
          Math.max(0, [...document.querySelectorAll('.sh-handle')].indexOf(h)),
    }
    h.dataset.side = p.side
    h.style.top = clampY(p.y) + 'px'
    h.style.left = p.side === 'l' ? '0px' : 'auto'
    h.style.right = p.side === 'r' ? '0px' : 'auto'
  }
  function handle(key, o) {
    let h = document.getElementById('sh-h-' + key)
    if (!o) {
      if (h) h.remove()
      return
    }
    if (!h) {
      h = document.createElement('button')
      h.type = 'button'
      h.id = 'sh-h-' + key
      h.className = 'sh-handle'
      document.body.appendChild(h)
      let d = null
      h.addEventListener('pointerdown', (e) => {
        if (e.button) return
        try {
          h.setPointerCapture(e.pointerId)
        } catch (_) {}
        const r = h.getBoundingClientRect()
        d = {
          id: e.pointerId,
          ox: e.clientX - r.left,
          oy: e.clientY - r.top,
          sx: e.clientX,
          sy: e.clientY,
          moved: false,
        }
      })
      h.addEventListener('pointermove', (e) => {
        if (!d || e.pointerId !== d.id) return
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6)
          return
        d.moved = true
        h.classList.add('drag')
        h.style.right = 'auto'
        h.style.left = e.clientX - d.ox + 'px'
        h.style.top = e.clientY - d.oy + 'px'
      })
      const end = (e) => {
        if (!d || e.pointerId !== d.id) return
        const m = d.moved
        d = null
        h.classList.remove('drag')
        if (m) {
          const r = h.getBoundingClientRect()
          st.hpos[key] = {
            side: r.left + r.width / 2 < innerWidth / 2 ? 'l' : 'r',
            y: Math.round(clampY(r.top)),
          }
          save()
          h.dataset.side = st.hpos[key].side
          placeHandle(h, key)
          return
        }
        if (e.type === 'pointerup' && h._o && h._o.onTap) h._o.onTap()
      }
      h.addEventListener('pointerup', end)
      h.addEventListener('pointercancel', end)
      h.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (h._o && h._o.onTap) h._o.onTap()
        }
      })
    }
    h._o = o
    h.innerHTML = ic(o.icon || 'sliders')
    h.setAttribute('aria-label', 'Show ' + o.label + ' (drag to move)')
    h.title = 'Show ' + o.label + ' · drag to move'
    placeHandle(h, key)
  }
  addEventListener('resize', () =>
    document
      .querySelectorAll('.sh-handle')
      .forEach((h) => placeHandle(h, h.id.slice(5))),
  )
  /* ---- tabs: ONE customisable tab row for every space (+ add, edit, remove, reorder) ----
    Shell.tabs(key,{host:'#ptabs',catalog:[{id,label,icon?,pro?}],defaults:[ids],cur:()=>id,onPick:id=>{},onChange:()=>{},utabs:true (underline style for a stand-alone row)}) -> {draw,list,add,remove,reset,move,rename} */
  const tabSets = {}
  function tabs(key, o) {
    const T = (tabSets[key] = Object.assign(
      { key, catalog: [], defaults: [] },
      o,
    ))
    const cus = () => st.custom[key] || []
    const cat = (id) => {
      const c = T.catalog.find((c) => c.id === id)
      if (c) return c
      const u = cus().find((c) => c.id === id)
      return u ? Object.assign({ custom: true, icon: 'star' }, u) : null
    }
    const ok = (id) => {
      const c = cat(id)
      return c && !(c.pro && st.mode !== 'pro')
    }
    const raw = () => {
      let l = st.tabs[key]
      if (!Array.isArray(l) || !l.length) l = T.defaults.map((id) => ({ id }))
      return l.filter((x) => cat(x.id))
    }
    T.list = () =>
      raw()
        .filter((x) => ok(x.id))
        .map((x) => ({
          id: x.id,
          label: x.label || cat(x.id).label,
          icon: cat(x.id).icon,
          custom: !!cat(x.id).custom,
          src: cat(x.id).src,
        }))
    const put = (l) => {
      st.tabs[key] = l
      save()
    }
    T.add = (id) => {
      const l = raw()
      if (!l.some((x) => x.id === id)) {
        l.push({ id })
        put(l)
      }
      T.draw()
      if (T.onChange) T.onChange('add', id)
    }
    T.remove = (id) => {
      const l = raw()
      if (T.list().length <= 1) return false
      put(l.filter((x) => x.id !== id))
      if (cus().some((c) => c.id === id)) {
        st.custom[key] = cus().filter((c) => c.id !== id)
        save()
      }
      T.draw()
      if (T.onChange) T.onChange('remove', id)
      return true
    }
    T.reset = () => {
      delete st.tabs[key]
      delete st.custom[key]
      save()
      T.draw()
      if (T.onChange) T.onChange('reset')
    }
    T.rename = (id, label) => {
      const l = raw()
      const x = l.find((y) => y.id === id)
      const cu = cus().find((y) => y.id === id)
      if (cu) {
        const v = String(label || '')
          .trim()
          .slice(0, 24)
        if (v) {
          cu.label = v
          save()
          T.draw()
          if (T.onChange) T.onChange('rename', id)
        }
        return
      }
      if (x) {
        const v = String(label || '')
          .trim()
          .slice(0, 24)
        if (v && v !== cat(id).label) x.label = v
        else delete x.label
        put(l)
        T.draw()
      }
    }
    /* Create your own tab: Shell.tabs(key,{sources:()=>[{kind:'filter',title:'Saved filters',items:[{id,label}]},...], onCustom:tab=>{}}). A custom tab points at ONE source 'kind:id'. */
    T.srcList = () =>
      typeof T.sources === 'function'
        ? T.sources().filter((g) => g.items && g.items.length)
        : []
    T.addCustom = (label, src) => {
      label = String(label || '')
        .trim()
        .slice(0, 24)
      if (!label || !src) return null
      const id =
        'cu' + Date.now().toString(36) + Math.floor(Math.random() * 1e3)
      ;(st.custom[key] = cus()).push({ id, label, src })
      const l = raw()
      l.push({ id })
      put(l)
      T.draw()
      if (T.onChange) T.onChange('add', id)
      return id
    }
    T.setSrc = (id, src) => {
      const c = cus().find((x) => x.id === id)
      if (c) {
        c.src = src
        save()
        if (T.onChange) T.onChange('src', id)
      }
    }
    T.move = (ids) => {
      const l = raw()
      const by = Object.fromEntries(l.map((x) => [x.id, x]))
      const vis = ids.map((i) => by[i]).filter(Boolean)
      const hid = l.filter((x) => !ids.includes(x.id))
      put(vis.concat(hid))
      T.draw()
      if (T.onChange) T.onChange('move')
    }
    T.draw = () => {
      const h = typeof T.host === 'string' ? $(T.host) : T.host
      if (!h) return
      const cur = T.cur ? T.cur() : null
      const old = h.querySelector('.sh-tscroll')
      const kx = old ? old.scrollLeft : 0
      h.classList.add('sh-tabs')
      h.dataset.tabkey = key
      h.innerHTML =
        '<div class="sh-trow"><div class="sh-tscroll" role="presentation">' +
        T.list()
          .map(
            (t) =>
              '<button type="button" role="tab" aria-selected="' +
              (t.id === cur) +
              '" data-sh-pt="' +
              t.id +
              '" class="' +
              (t.id === cur ? 'on' : '') +
              '">' +
              esc(t.label) +
              '</button>',
          )
          .join('') +
        '</div><button type="button" class="sh-tplus" data-sh-tplus="' +
        key +
        '" aria-label="Add or edit tabs" title="Add or edit tabs" aria-haspopup="menu">' +
        ic('plus') +
        '</button></div><div class="track"><i></i></div>'
      if (T.utabs) h.querySelector('.sh-trow').classList.add('utabs')
      const sc = h.querySelector('.sh-tscroll')
      sc.scrollLeft = kx
      const on = sc.querySelector('.on')
      if (on) {
        const l = on.offsetLeft,
          r = l + on.offsetWidth
        if (l < sc.scrollLeft) sc.scrollLeft = l - 8
        else if (r > sc.scrollLeft + sc.clientWidth)
          sc.scrollLeft = r - sc.clientWidth + 8
      }
      track(sc, h.querySelector('.track'))
    }
    T.pick = (id) => {
      const c = cat(id)
      if (c && c.custom && T.onCustom)
        T.onCustom({ id, label: c.label, src: c.src })
      else if (T.onPick) T.onPick(id)
    }
    T.menu = (btn) => {
      const have = new Set(T.list().map((t) => t.id))
      const rest = T.catalog.filter((c) => ok(c.id) && !have.has(c.id))
      const p = pop(
        btn,
        '<div class="lbl">Add a tab</div>' +
          (rest.length
            ? rest
                .map(
                  (c) =>
                    '<button type="button" class="mi" role="menuitem" data-sh-tadd="' +
                    key +
                    ':' +
                    c.id +
                    '">' +
                    ic(c.icon || 'plus') +
                    esc(c.label) +
                    (c.desc ? '<small>' + esc(c.desc) + '</small>' : '') +
                    '</button>',
                )
                .join('')
            : '<div class="mini" style="padding:6px 10px">All tabs are already here.</div>') +
          '<hr><button type="button" class="mi" role="menuitem" data-sh-tedit="' +
          key +
          '">' +
          ic('sliders') +
          'Edit tabs…</button>',
      )
      p.classList.add('sh-tpop')
    }
    const srcOpts = (cur) => {
      const gs = T.srcList()
      let h = gs
        .map(
          (g) =>
            '<optgroup label="' +
            esc(g.title) +
            '">' +
            g.items
              .map((i) => {
                const v = g.kind + ':' + i.id
                return (
                  '<option value="' +
                  esc(v) +
                  '"' +
                  (v === cur ? ' selected' : '') +
                  '>' +
                  esc(i.label) +
                  '</option>'
                )
              })
              .join('') +
            '</optgroup>',
        )
        .join('')
      if (
        cur &&
        !gs.some((g) => g.items.some((i) => g.kind + ':' + i.id === cur))
      )
        h =
          '<option value="' +
          esc(cur) +
          '" selected>Source missing</option>' +
          h
      return h
    }
    T.create = () => {
      const gs = T.srcList()
      dialog(
        '<h3>Create your own tab</h3><p class="mini" style="margin:0 0 8px">Name it, then point it at one thing to show.</p><label class="sh-flab">Name<input class="inp" id="sh-cn" maxlength="24" placeholder="For example, Exam prep" aria-label="Tab name"></label><label class="sh-flab">Shows<select class="inp" id="sh-cs" aria-label="Source">' +
          srcOpts('') +
          '</select></label><p class="mini" id="sh-ce" style="color:var(--danger);margin:6px 0 0;min-height:1.2em" role="alert"></p><div class="ft"><button type="button" class="btn" data-cm="back">Back</button><button type="button" class="btn pri" data-cm="ok">' +
          ic('check') +
          'Create tab</button></div>',
        (d) => {
          const n = d.querySelector('#sh-cn'),
            s = d.querySelector('#sh-cs'),
            er = d.querySelector('#sh-ce')
          setTimeout(() => n.focus(), 60)
          const go = () => {
            const nm = n.value.trim()
            if (!nm) {
              er.textContent = 'Give the tab a name.'
              n.focus()
              return
            }
            if (!s.value) {
              er.textContent = 'Pick what the tab shows.'
              return
            }
            if (
              T.list().some((t) => t.label.toLowerCase() === nm.toLowerCase())
            ) {
              er.textContent = 'A tab with this name already exists.'
              n.focus()
              return
            }
            const id = T.addCustom(nm, s.value)
            if (id) {
              T.edit()
              toast('Tab "' + nm + '" added')
            }
          }
          d.addEventListener('click', (e) => {
            const b = e.target.closest('[data-cm]')
            if (!b) return
            if (b.dataset.cm === 'back') T.edit()
            else go()
          })
          n.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              go()
            }
          })
        },
      )
    }
    T.edit = () => {
      const rows = () =>
        T.list()
          .map(
            (t, i, a) =>
              '<div class="sh-trw" data-id="' +
              t.id +
              '"><button type="button" class="ib sm gp" data-gp aria-label="Drag to reorder ' +
              esc(t.label) +
              '" title="Drag to reorder">' +
              ic('grip') +
              '</button><input value="' +
              esc(t.label) +
              '" maxlength="24" aria-label="Tab name" data-tn="' +
              t.id +
              '"><button type="button" class="ib sm" data-tm="up:' +
              t.id +
              '" aria-label="Move up"' +
              (i ? '' : ' disabled') +
              '>' +
              ic('up') +
              '</button><button type="button" class="ib sm" data-tm="dn:' +
              t.id +
              '" aria-label="Move down"' +
              (i < a.length - 1 ? '' : ' disabled') +
              '>' +
              ic('down') +
              '</button><button type="button" class="ib sm rm" data-tm="rm:' +
              t.id +
              '" aria-label="Remove tab"' +
              (a.length > 1 ? '' : ' disabled') +
              '>' +
              ic('trash') +
              '</button>' +
              (t.custom
                ? '<label class="sh-tsrc"><span>Shows</span><select data-ts="' +
                  t.id +
                  '" aria-label="What ' +
                  esc(t.label) +
                  ' shows">' +
                  srcOpts(t.src) +
                  '</select></label>'
                : '') +
              '</div>',
          )
          .join('')
      dialog(
        '<h3>Edit tabs</h3><p class="mini" style="margin:0 0 6px">Rename, reorder with the handle or arrows, remove. Use + to add more.</p><div class="sh-tedit" id="sh-tedit">' +
          rows() +
          '</div>' +
          (T.srcList().length
            ? '<button type="button" class="btn sh-tcreate" data-tm="create">' +
              ic('plus') +
              'Create your own tab</button>'
            : '') +
          '<div class="ft"><button type="button" class="btn" data-tm="reset">Reset to default</button><button type="button" class="btn pri" data-tm="done">Done</button></div>',
        (d) => {
          const box = d.querySelector('#sh-tedit')
          const redo = () => {
            box.innerHTML = rows()
          }
          d.addEventListener('click', (e) => {
            const b = e.target.closest('[data-tm]')
            if (!b) return
            const [k, id] = b.dataset.tm.split(':')
            if (k === 'done') {
              dialogClose()
              return
            }
            if (k === 'create') {
              T.create()
              return
            }
            if (k === 'reset') {
              T.reset()
              redo()
              return
            }
            const ids = T.list().map((t) => t.id),
              i = ids.indexOf(id)
            if (k === 'up' && i > 0) {
              ids.splice(i - 1, 0, ids.splice(i, 1)[0])
              T.move(ids)
              redo()
            } else if (k === 'dn' && i < ids.length - 1) {
              ids.splice(i + 1, 0, ids.splice(i, 1)[0])
              T.move(ids)
              redo()
            } else if (k === 'rm') {
              if (T.remove(id)) redo()
            }
          })
          box.addEventListener('change', (e) => {
            if (e.target.dataset.tn)
              T.rename(e.target.dataset.tn, e.target.value)
            else if (e.target.dataset.ts)
              T.setSrc(e.target.dataset.ts, e.target.value)
          })
          box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.dataset.tn) e.target.blur()
          })
          let dr = null
          box.addEventListener('pointerdown', (e) => {
            const g = e.target.closest('[data-gp]')
            if (!g) return
            e.preventDefault()
            const row = g.closest('.sh-trw')
            dr = { row, id: e.pointerId }
            g.setPointerCapture(e.pointerId)
            row.classList.add('drag')
          })
          box.addEventListener('pointermove', (e) => {
            if (!dr || e.pointerId !== dr.id) return
            const sib = [...box.children].filter((r) => r !== dr.row)
            let before = null
            for (const r of sib) {
              const b = r.getBoundingClientRect()
              if (e.clientY < b.top + b.height / 2) {
                before = r
                break
              }
            }
            box.insertBefore(dr.row, before)
          })
          const end = (e) => {
            if (!dr || e.pointerId !== dr.id) return
            dr.row.classList.remove('drag')
            dr = null
            T.move([...box.children].map((r) => r.dataset.id))
            redo()
          }
          box.addEventListener('pointerup', end)
          box.addEventListener('pointercancel', end)
        },
      )
    }
    T.draw()
    return T
  }
  /* ---- history: ONE Undo / Redo for every mock (buttons, Ctrl Z / Ctrl Y / Ctrl Shift Z, enabled state) ----
    const H=Shell.history({undo:fn,redo:fn,can:()=>[canUndo,canRedo]});  H.html() -> the two top-bar icon buttons;  H.sync() after every change.
    Own buttons already in the page: pass els:()=>({undo:el,redo:el}), click:false (page wires the click), keys:false, disCls:'dis'. */
  function history(o) {
    const H = Object.assign({ keys: true, click: true, disCls: '' }, o)
    const els = () =>
      H.els
        ? H.els()
        : {
            undo: document.querySelector('[data-sh-hist=undo]'),
            redo: document.querySelector('[data-sh-hist=redo]'),
          }
    H.html = () => {
      const c = H.can()
      return ['undo', 'redo']
        .map((k, i) => {
          const l = k === 'undo' ? 'Undo' : 'Redo',
            key = k === 'undo' ? 'Ctrl Z' : 'Ctrl Y'
          return (
            '<button type="button" class="ib" data-sh-hist="' +
            k +
            '" aria-label="' +
            l +
            ' (' +
            key +
            ')" title="' +
            l +
            ' (' +
            key +
            ')"' +
            (c[i] ? '' : ' disabled') +
            '>' +
            ic(k) +
            '</button>'
          )
        })
        .join('')
    }
    H.sync = () => {
      const c = H.can(),
        e = els()
      ;['undo', 'redo'].forEach((k, i) => {
        const b = e[k]
        if (!b) return
        const d = !c[i]
        if (b.classList.contains('ib')) b.disabled = d
        b.setAttribute('aria-disabled', d)
        if (H.disCls) b.classList.toggle(H.disCls, d)
      })
    }
    hists.push(H)
    return H
  }
  const hists = []
  document.addEventListener(
    'keydown',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const k = e.key.toLowerCase(),
        t = e.target
      if (
        t &&
        (t.isContentEditable ||
          (/^(input|textarea|select)$/i.test(t.tagName) &&
            !/^(range|checkbox|radio|button)$/.test(t.type || '')))
      )
        return
      const H = hists.find((h) => h.keys)
      if (!H) return
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        H.undo()
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        H.redo()
      }
    },
    true,
  )
  /* ---- clear (x) button: ONE for every text field. Shell.clearable(root,ok) wraps now; Shell.autoClear(ok) keeps wrapping new fields.
    ok(input) -> false to skip. Opt out in markup with data-noclr. The button shows only while the field has text (:placeholder-shown), so
    changing .value from code needs nothing. Clearing fires input + change, then refocuses. ---- */
  const CSEL =
    'input:not([type=range]):not([type=time]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]):not([type=color]):not([readonly]),textarea'
  function clearable(root, ok) {
    ;(root || document.body).querySelectorAll(CSEL).forEach((i) => {
      if (i.closest('.sh-clr,[data-noclr]') || (ok && !ok(i))) return
      const act = document.activeElement === i
      let s = null,
        e = null
      try {
        s = i.selectionStart
        e = i.selectionEnd
      } catch (_) {}
      const w = document.createElement('span')
      w.className = 'sh-clr' + (i.tagName === 'TEXTAREA' ? ' ta' : '')
      i.parentNode.insertBefore(w, i)
      w.appendChild(i)
      if (!i.getAttribute('placeholder')) i.setAttribute('placeholder', ' ')
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'ib sm sh-clrb'
      b.setAttribute(
        'aria-label',
        'Clear ' + (i.getAttribute('aria-label') || 'field'),
      )
      b.title = 'Clear'
      b.innerHTML = ic('x')
      w.appendChild(b)
      if (act) {
        i.focus()
        try {
          if (s != null) i.setSelectionRange(s, e)
        } catch (_) {}
      }
    })
  }
  let acOk = null,
    acQ = 0
  function autoClear(ok) {
    acOk = ok || null
    clearable(document.body, acOk)
    if (autoClear.on) return
    autoClear.on = true
    new MutationObserver(() => {
      if (acQ) return
      acQ = requestAnimationFrame(() => {
        acQ = 0
        clearable(document.body, acOk)
      })
    }).observe(document.body, { childList: true, subtree: true })
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.sh-clrb')
    if (!b) return
    const i = b.parentNode.querySelector('input,textarea')
    if (!i) return
    i.value = ''
    i.dispatchEvent(new Event('input', { bubbles: true }))
    i.dispatchEvent(new Event('change', { bubbles: true }))
    i.focus()
  })
  /* ---- the quiet corner (gear): the same list everywhere ---- */
  function cornerHTML() {
    return (
      '<div class="lbl">Settings and more</div>' +
      [
        ['settings', 'gear', 'Settings'],
        ['save', 'save', 'Save &amp; restore'],
        ['trash', 'trash', 'Trash'],
        ['device', 'device', 'Device mode'],
        ['help', 'help', 'Help'],
      ]
        .map(
          (x) =>
            '<button type="button" class="mi" role="menuitem" data-sh-q="' +
            x[0] +
            '">' +
            ic(x[1]) +
            x[2] +
            '</button>',
        )
        .join('') +
      '<hr><div style="padding:4px 6px"><div class="seg sm" role="group" aria-label="Theme">' +
      ['Day', 'Night', 'Sepia']
        .map(
          (t) =>
            '<button type="button" data-sh-th="' +
            t +
            '" class="' +
            (themeName() === t ? 'on' : '') +
            '">' +
            t +
            '</button>',
        )
        .join('') +
      '</div></div>'
    )
  }
  /* ---- universal AI bar: one button in every top bar, one panel (bottom sheet on phones) ---- */
  const AI = { ctx: null, h: {}, extra: [] }
  function aiPage(o) {
    o = o || {}
    AI.ctx = o.context || null
    AI.h = o.handlers || {}
    AI.extra = o.actions || []
    if (aiOn) aiDraw()
  }
  const aiCtx = () => {
    let c = {}
    try {
      c = (AI.ctx && AI.ctx()) || {}
    } catch (_) {}
    return Object.assign({ title: '', text: '', prompt: '' }, c)
  }
  const AI_ASK = {
    copy: 'Read the text below and help me learn from it.',
    tags: 'Suggest 3 to 5 short tags for the text below. Reply with one tag per line.',
    summarise: 'Summarise the text below in 5 bullet points, in plain words.',
    cards: 'Write 8 short question-and-answer cards from the text below.',
  }
  const aiPromptText = (kind, c) =>
    (c.prompt || AI_ASK[kind] || AI_ASK.copy) +
    '\n\n' +
    (c.title ? c.title + '\n\n' : '') +
    c.text
  const AI_ROWS = [
    [
      'copy',
      'copy',
      'Copy prompt',
      'A ready prompt with this page’s text, for any AI tool.',
    ],
    ['paste', 'paste', 'Paste the answer', 'Bring the AI’s answer back here.'],
    ['tags', 'tag', 'Suggest tags', 'Ideas you can accept or dismiss.'],
    ['summarise', 'article', 'Summarise', 'A short summary in plain words.'],
    ['cards', 'layers', 'Make cards', 'Question cards from the key ideas.'],
    [
      'send',
      'send',
      'Send to Claude',
      'Through your Claude connector. Uses your own plan.',
    ],
  ]
  const aiRow = (id, icon, label, desc) =>
    '<button type="button" class="sh-ai-row" data-sh-ai-act="' +
    esc(id) +
    '"' +
    (id === 'paste' ? ' aria-expanded="' + aiPaste + '"' : '') +
    '>' +
    ic(icon) +
    '<span><b>' +
    esc(label) +
    '</b>' +
    (desc ? '<small>' + esc(desc) + '</small>' : '') +
    '</span></button>'
  function aiHTML() {
    const c = aiCtx()
    return (
      '<div class="sh-ai-grip" aria-hidden="true"></div><div class="sh-ai-hd"><span class="sh-ai-mk">' +
      ic('sparkle') +
      '</span><div class="sh-ai-tt"><b>AI</b><small>Claude, through your connector</small></div><button type="button" class="ib sm" data-sh-ai-x aria-label="Close the AI bar" title="Close">' +
      ic('x') +
      '</button></div>' +
      (c.title
        ? '<div class="sh-ai-ctx">Working on <b>' + esc(c.title) + '</b></div>'
        : '') +
      '<div class="sh-ai-body"><div class="sh-ai-list">' +
      AI_ROWS.map((r) => aiRow(r[0], r[1], r[2], r[3])).join('') +
      '</div>' +
      (AI.extra.length
        ? '<div class="sh-ai-g">On this page</div><div class="sh-ai-list">' +
          AI.extra
            .map((x) =>
              aiRow('x:' + x.id, x.icon || 'sparkle', x.label, x.desc || ''),
            )
            .join('') +
          '</div>'
        : '') +
      (aiPaste
        ? '<div class="sh-ai-paste"><label for="sh-ai-ta">Paste the AI answer</label><textarea id="sh-ai-ta" class="inp" rows="4" placeholder="Paste the answer here…"></textarea><div class="ft"><button type="button" class="btn" data-sh-ai-act="paste">Cancel</button><button type="button" class="btn pri" data-sh-ai-use>Use answer</button></div></div>'
        : '') +
      '<p class="sh-ai-foot">Nothing is sent until you choose. Any other AI can be added later.</p></div>'
    )
  }
  function aiDraw() {
    const p = $('#sh-ai')
    if (!p) return
    const keep = $('#sh-ai-ta')
    const v = keep ? keep.value : ''
    p.innerHTML = aiHTML()
    const t = $('#sh-ai-ta')
    if (t && v) t.value = v
  }
  function aiPlace(a) {
    const p = $('#sh-ai')
    if (!p) return
    if (innerWidth <= 640) {
      p.style.left = p.style.top = p.style.right = ''
      return
    }
    const r = (
        a ||
        document.querySelector('[data-sh-ai]') ||
        document.body
      ).getBoundingClientRect(),
      w = Math.min(380, innerWidth - 16)
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px'
    p.style.top = Math.max(8, r.bottom + 6) + 'px'
  }
  function aiOpen(a) {
    const p = el('aside', 'sh-ai', 'sh-ai', {
      role: 'dialog',
      'aria-label': 'AI',
    })
    el('div', 'sh-ai-sc', 'sh-ai-sc')
    closePop()
    aiFrom = a || document.querySelector('[data-sh-ai]')
    aiOn = true
    aiPaste = false
    aiDraw()
    aiPlace(aiFrom)
    void p.offsetWidth
    p.classList.add('on')
    $('#sh-ai-sc').classList.add('on')
    syncAiBtn()
    setTimeout(() => {
      const f = p.querySelector('.sh-ai-row')
      if (f && aiOn) f.focus()
    }, 60)
  }
  function aiClose(quiet) {
    if (!aiOn) return
    aiOn = false
    const p = $('#sh-ai'),
      s = $('#sh-ai-sc')
    if (p) p.classList.remove('on')
    if (s) s.classList.remove('on')
    syncAiBtn()
    const f = aiFrom
    aiFrom = null
    if (!quiet && f && f.isConnected)
      try {
        f.focus()
      } catch (_) {}
  }
  function aiToggle(a) {
    aiOn ? aiClose() : aiOpen(a)
  }
  function syncAiBtn() {
    document.querySelectorAll('[data-sh-ai]').forEach((b) => {
      b.classList.toggle('on', aiOn)
      b.setAttribute('aria-expanded', aiOn)
    })
  }
  function aiCopy(t) {
    try {
      navigator.clipboard.writeText(t).catch(() => {})
    } catch (_) {}
  }
  function aiRun(id) {
    const c = aiCtx()
    if (id === 'paste') {
      aiPaste = !aiPaste
      aiDraw()
      if (aiPaste)
        setTimeout(() => {
          const t = $('#sh-ai-ta')
          if (t) t.focus()
        }, 30)
      return
    }
    if (id.indexOf('x:') === 0) {
      const x = AI.extra.find((y) => y.id === id.slice(2))
      aiClose(true)
      if (x && x.run) x.run(c)
      return
    }
    const f = AI.h[id]
    aiClose(true)
    if (f) {
      f(c)
      return
    }
    if (id === 'copy') {
      aiCopy(aiPromptText('copy', c))
      toast('Prompt copied. Paste it into your AI tool.')
      return
    }
    if (id === 'send') {
      toast(
        'Sent to Claude through the connector (demo). The answer will come back here.',
      )
      return
    }
    toast(
      'This page does not use “' +
        ({ tags: 'Suggest tags', summarise: 'Summarise', cards: 'Make cards' }[
          id
        ] || id) +
        '” yet.',
    )
  }
  function aiUse() {
    const t = $('#sh-ai-ta'),
      v = t ? t.value.trim() : ''
    if (!v) {
      toast('Paste the answer first')
      if (t) t.focus()
      return
    }
    const c = aiCtx(),
      f = AI.h.paste
    aiClose(true)
    if (f) f(v, c)
    else toast('Answer received (demo). This page does not use it yet.')
  }
  addEventListener('resize', () => {
    if (aiOn) aiPlace(aiFrom)
  })
  /* ---- one delegated listener for the whole shell ---- */
  document.addEventListener('click', (e) => {
    const T = e.target
    if (!T.closest) return
    let b
    if (T.closest('.minb')) minUsed()
    if ((b = T.closest('[data-sh-ai]'))) {
      aiToggle(b)
      return
    }
    if (T.closest('[data-sh-ai-x]')) {
      aiClose()
      return
    }
    if ((b = T.closest('[data-sh-ai-act]'))) {
      aiRun(b.dataset.shAiAct)
      return
    }
    if (T.closest('[data-sh-ai-use]')) {
      aiUse()
      return
    }
    if (T.id === 'sh-ai-sc') {
      aiClose()
      return
    }
    if (T.closest('[data-sh-dx]')) {
      dialogClose()
      return
    }
    if ((b = T.closest('[data-sh-pt]'))) {
      const h = b.closest('[data-tabkey]'),
        S = h && tabSets[h.dataset.tabkey]
      if (S) {
        S.pick(b.dataset.shPt)
        S.draw()
      }
      return
    }
    if ((b = T.closest('[data-sh-tplus]'))) {
      const S = tabSets[b.dataset.shTplus]
      if (S) S.menu(b)
      return
    }
    if ((b = T.closest('[data-sh-tadd]'))) {
      const [k, id] = b.dataset.shTadd.split(':'),
        S = tabSets[k]
      closePop()
      if (S) {
        S.add(id)
        S.pick(id)
        S.draw()
      }
      return
    }
    if ((b = T.closest('[data-sh-tedit]'))) {
      const S = tabSets[b.dataset.shTedit]
      closePop()
      if (S) S.edit()
      return
    }
    if ((b = T.closest('[data-sh-space]'))) {
      const k = b.dataset.shSpace
      if (cfg.onSpace && cfg.onSpace(k) === false) return
      cfg.space = k
      renderRail()
      return
    }
    if (T.closest('[data-sh-theme]')) {
      setTheme(themeName() === 'Night' ? 'Day' : 'Night')
      return
    }
    if ((b = T.closest('[data-sh-corner]'))) {
      pop(b, cornerHTML())
      return
    }
    if ((b = T.closest('[data-sh-th]'))) {
      setTheme(b.dataset.shTh)
      b.parentElement
        .querySelectorAll('button')
        .forEach((x) => x.classList.toggle('on', x === b))
      return
    }
    if ((b = T.closest('[data-sh-q]'))) {
      closePop()
      if (cfg.onCorner) cfg.onCorner(b.dataset.shQ)
      return
    }
    if ((b = T.closest('[data-sh-toggle]'))) {
      toggleCol(b.dataset.shToggle)
      if (cfg.onChange) cfg.onChange('col', b.dataset.shToggle)
      return
    }
    if ((b = T.closest('[data-sh-mode]'))) {
      setMode(b.dataset.shMode)
      return
    }
    if ((b = T.closest('[data-sh-min]'))) {
      st.min[b.dataset.shMin] = true
      save()
      drawBars()
      return
    }
    if ((b = T.closest('[data-sh-unmin]'))) {
      st.min[b.dataset.shUnmin] = false
      save()
      drawBars()
      return
    }
    if ((b = T.closest('[data-sh-hist]'))) {
      const H = hists.find((h) => h.click)
      if (H) H[b.dataset.shHist]()
      return
    }
    if (T.closest('[data-sh-undo]')) {
      const u = tUndo
      tUndo = null
      $('#sh-toast').classList.remove('on')
      if (u) u()
      return
    }
    if ((b = T.closest('[data-sh-tab]')) && sh) {
      sh.tab = b.dataset.shTab
      sheetDraw(false)
      $('#sh-sheet .sh-sbody').scrollTop = 0
      return
    }
    if ((b = T.closest('[data-sh-sheet]'))) {
      sheetClose(b.dataset.shSheet === 'apply')
      return
    }
    if (T.id === 'sh-scrim') {
      if (dialogOn) return
      if (sheetOn) {
        sheetClose(false)
        return
      }
      ;['side', 'panel'].forEach((w) => {
        if (col(w) === 'over') col(w, 'hidden')
      })
      return
    }
  })
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (aiOn && !e.target.closest('#sh-ai,[data-sh-ai],#sh-pop,#sh-dialog'))
        aiClose(true)
      const p = $('#sh-pop')
      if (
        p &&
        !p.hidden &&
        !e.target.closest('#sh-pop') &&
        !(p._a && p._a.contains(e.target))
      )
        closePop()
    },
    true,
  )
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (aiOn && !($('#sh-pop') && !$('#sh-pop').hidden) && !dialogOn) {
      aiClose()
      return
    }
    const p = $('#sh-pop')
    if (p && !p.hidden) {
      closePop()
      return
    }
    if (dialogOn) {
      dialogClose()
      return
    }
    if (sheetOn) {
      sheetClose(false)
      return
    }
    ;['side', 'panel'].forEach((w) => {
      if (col(w) === 'over') col(w, 'hidden')
    })
  })
  function mount(o) {
    Object.assign(cfg, o || {})
    if (st.theme)
      document.documentElement.dataset.theme =
        st.theme === 'Day' ? 'light' : st.theme === 'Sepia' ? 'sepia' : 'dark'
    el('div', 'sh-scrim', 'sh-scrim')
    el('div', 'sh-toast', 'sh-toast', { role: 'status', 'aria-live': 'polite' })
    const p = el('div', 'sh-pop', 'sh-pop')
    p.hidden = true
    el('div', 'sh-sheet', 'sh-sheet')
    el('div', 'sh-dialog', 'sh-dialog')
    el('div', 'sh-mdock', 'sh-mdock')
    renderRail()
    renderTop()
    startPulse()
    const a = $('.sh-wrap')
    if (a) a.dataset.mode = st.mode
    document
      .querySelectorAll('[data-sh-mode]')
      .forEach((b) => b.classList.toggle('on', b.dataset.shMode === st.mode))
  }
  return {
    I,
    ic,
    esc,
    SPACES,
    mount,
    rail: (o) => {
      Object.assign(cfg, o || {})
      renderRail()
    },
    top: renderTop,
    col,
    toggleCol,
    isPhone,
    toast,
    pop,
    closePop,
    ask,
    confirm: confirmBox,
    dialog,
    dialogClose,
    sheet: {
      open: sheetOpen,
      draw: () => {
        if (sheetOn) sheetDraw(false)
      },
      close: sheetClose,
      isOpen: () => sheetOn,
      tab: (t) => {
        if (t && sh) {
          sh.tab = t
        }
        return sh && sh.tab
      },
    },
    ai: {
      page: aiPage,
      open: aiOpen,
      close: aiClose,
      toggle: aiToggle,
      isOpen: () => aiOn,
    },
    history,
    clearable,
    autoClear,
    bar,
    drawBars,
    isMin: (k) => !!st.min[k],
    track,
    tabs,
    handle,
    pulse,
    minUsed,
    setMin: (k, v) => {
      st.min[k] = !!v
      save()
      drawBars()
    },
    cornerHTML,
    theme: themeName,
    setTheme,
    mode: () => st.mode,
    setMode,
    /* legacy: older mocks call Shell.icons('A'). The owner-chosen per-space rail icons win, so this only reports them. */
    icons: () => Object.assign({}, ICONSET, cfg.icons || {}),
  }
})()
/* ==== end shell.js ==== */
