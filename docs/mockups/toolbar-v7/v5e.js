/* ============ v5e: owner round fixes (T1 groups, T2 pen order, T3/T5/T6 Text bar, T5 Shapes slot) ============ */
/* a card setting that is ONE choice: a button with a down arrow that opens a small menu (Line, Page style) */
const LS_N = { solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted' },
  PAPER_N = { blank: 'Blank', lined: 'Lined', grid: 'Grid', dots: 'Dots' }
function mchip(id, label, cur, ic) {
  return (
    '<button class="abtn pickchip" data-m="' +
    id +
    '" aria-haspopup="menu" aria-label="' +
    label +
    ': ' +
    cur +
    '">' +
    (ic ? svg(ic) : '') +
    '<span>' +
    label +
    '</span><small>' +
    cur +
    '</small>' +
    svg('chevD') +
    '</button>'
  )
}
const MCH = {
  ls: () => ({
    t: 'Line style',
    items: Object.entries(LS_N).map(([v, n]) => ({
      t: n,
      on: PN.ls === v,
      f: () => {
        PN.ls = v
        save()
        renderOpts()
      },
    })),
  }),
  paper: () => ({
    t: 'Page style',
    items: Object.entries(PAPER_N).map(([v, n]) => ({
      t: n,
      on: PN.paper === v,
      f: () => {
        setPaper(v)
        renderOpts()
      },
    })),
  }),
}
acard.addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]')
  if (!b || !MCH[b.dataset.m]) return
  e.stopPropagation()
  const m = MCH[b.dataset.m]()
  openMenu(m.items, b, m.t)
})

/* ---- Pen pill: Type ▾, Size ▾, 4 colours + ▾, Favourites ▾ (nothing repeated in the card) ---- */
function pillTidy(row) {
  ;[...row.children].forEach((el) => {
    if (!el.classList.contains('sep') || el.classList.contains('minsep')) return
    const p = el.previousElementSibling,
      n = el.nextElementSibling
    if (
      !p ||
      p.classList.contains('sep') ||
      p.classList.contains('pgrip') ||
      !n ||
      n.classList.contains('sep') ||
      n.classList.contains('minsep') ||
      n.classList.contains('minb')
    )
      el.remove()
  })
}
function penPillV5() {
  const row = $('.prow', opts)
  if (!row) return
  const pro = isPro(),
    isHl = R.pen === 'Highlighter'
  const mk = (cls, html, label, fn) => {
    const b = document.createElement('button')
    b.className = 'opt chev ' + cls
    b.setAttribute('aria-haspopup', 'menu')
    b.setAttribute('aria-label', label)
    b.dataset.tip = label
    b.innerHTML = html
    b.onclick = () => fn(b)
    return b
  }
  const ts = $$('.ptype', row)
  if (ts.length && !pro)
    ts.forEach(
      (x) => (x.hidden = true),
    ) /* Beginner: pen types live in the card tiles only */
  else if (ts.length) {
    const k = TYPEK[R.pen],
      tc = k === 'hl' ? R.hlCol : R.penCol === 'auto' ? 'var(--ink)' : R.penCol
    ts[0].before(
      mk(
        'pchip',
        '<span class="ptype pmini on">' +
          penSvg(k, tc) +
          '</span><span>' +
          pname(R.pen) +
          '</span>',
        'Pen type: ' + pname(R.pen),
        (b) =>
          openMenu(
            [
              { h: 'Pen type' },
              ...PTYPES.map((n) => ({
                t: pname(n),
                on: R.pen === n,
                f: () => {
                  R.pen = n
                  renderOpts()
                },
              })),
            ],
            b,
          ),
      ),
    )
    ts.forEach((x) => x.remove())
  }
  const szs = $$('.opt', row).filter((x) =>
    /^(Fine|Medium|Bold)$/.test(x.getAttribute('aria-label') || ''),
  )
  if (szs.length) {
    const cur = isHl ? R.hlSize : R.size,
      exact = pro && !isHl && PN.exact != null,
      w = { Fine: 1.5, Medium: 3, Bold: 5.5 }[cur] || 3
    const sch = mk(
      'schip',
      '<svg class="ln" viewBox="0 0 24 24"><path d="M4 12h16" style="stroke-width:' +
        (isHl ? w * 1.7 : w) +
        '"/></svg><span>' +
        (exact ? PN.exact + ' px' : cur) +
        '</span>',
      'Size: ' + (exact ? PN.exact + ' px' : cur),
      (b) =>
        openMenu(
          [
            { h: 'Size' },
            ...['Fine', 'Medium', 'Bold'].map((n) => ({
              t: n,
              on: !exact && cur === n,
              f: () => {
                if (isHl) R.hlSize = n
                else {
                  R.size = n
                  PN.exact = null
                  save()
                }
                renderOpts()
              },
            })),
            ...(pro && !isHl
              ? [{ t: 'Exact thickness…', f: () => openPenAt('stroke') }]
              : []),
          ],
          b,
        ),
    )
    szs.forEach((x) => x.remove())
    const pc = $('.pchip', row)
    if (pc) pc.after(sch)
    else row.prepend(sch)
  }
  const dots = $$('.dot', row),
    cur = isHl ? R.hlCol : R.penCol
  if (dots.length) {
    const keep = new Set(),
      on = dots.find((d) => d.classList.contains('on'))
    if (on) keep.add(on)
    dots.forEach((d) => {
      if (keep.size < 4) keep.add(d)
    })
    const kept = dots.filter((d) => keep.has(d))
    dots.forEach((d) => {
      if (!keep.has(d)) d.remove()
    })
    const setC = (c) => {
      if (isHl) R.hlCol = c
      else R.penCol = c
      renderOpts()
    }
    const all = (isHl ? HLCOL : PENCOL).map(([n, c]) => ({
        t: n,
        c: c === 'auto' ? 'var(--ink)' : c,
        on: cur === c,
        f: () => setC(c),
      })),
      cust = (pro ? (isHl ? HN.cust : PN.cust) : []).map((c) => ({
        t: 'Custom ' + c,
        c,
        on: cur === c,
        f: () => setC(c),
      }))
    const cb = mk('ccaret', svg('palette'), 'All colours', (b) =>
      openMenu(
        [
          { h: 'Colour' },
          ...all,
          ...cust,
          ...(pro
            ? [{ t: 'Add a colour…', f: () => openPenAt('colour') }]
            : []),
        ],
        b,
      ),
    )
    kept[kept.length - 1].after(cb)
    const ad = $('.addc', row)
    if (ad) ad.remove()
    $$('.favp', row).forEach((x) => x.remove())
    const favs = isHl ? HN.favs : PN.favs,
      applyF = (f) => {
        R.pen = f.pen
        if (f.pen === 'Highlighter') {
          R.hlCol = f.col
          R.hlSize = f.size
        } else {
          R.penCol = f.col
          R.size = f.size
          PN.exact = f.exact == null ? null : f.exact
        }
        save()
        renderOpts()
      }
    cb.after(
      mk('fchip', svg('star'), 'Favourites', (b) =>
        openMenu(
          [
            { h: 'Favourites' },
            ...favs.map((f, i) => ({
              t: 'Favourite ' + (i + 1) + ': ' + pname(f.pen),
              c: cdot(f.col),
              f: () => applyF(f),
            })),
            {
              t: 'Save this pen as a favourite',
              f: () => {
                if (favs.length >= 6) {
                  toast('Up to 6 favourites: remove one in More')
                  return
                }
                favs.push({
                  pen: R.pen,
                  col: isHl ? R.hlCol : R.penCol,
                  size: isHl ? R.hlSize : R.size,
                  exact: PN.exact,
                })
                save()
                toast('Saved as a favourite')
                renderOpts()
              },
            },
          ],
          b,
        ),
      ),
    )
  }
  pillTidy(row)
}

/* ---- Text bar: its own bar. Box ▾ and Layout, Aa font/size, headings, every list, B I U S, indent, align, callout, divider, code ---- */
{
  const lc0 = listCmd
  listCmd = function (k) {
    if (k !== 'star') return lc0(k)
    const t = focusTarget()
    if (!t) {
      toast('Tap a text box first')
      return
    }
    fmt('insertUnorderedList')
    const sl = getSelection()
    let n = sl.anchorNode
    n = n && (n.nodeType === 3 ? n.parentElement : n)
    const ul = n && n.closest ? n.closest('ul,ol') : null
    if (ul) {
      ul.classList.remove('chk')
      ul.classList.toggle('star')
    }
    flush()
  }
}
TEXTACT['Star list'] = () => listCmd('star')
TOOLICON['Star list'] = 'star'
if (!ALLTABS.Text.includes('Star list'))
  ALLTABS.Text.splice(ALLTABS.Text.indexOf('Bullet list') + 1, 0, 'Star list')
function textBarV5() {
  opts.innerHTML = ''
  opts.classList.add('col')
  R.sub = null
  const pro = isPro(),
    row = document.createElement('div')
  const add = (html, label, fn, cls, data) => {
    const b = document.createElement('button')
    b.className = 'opt' + (cls ? ' ' + cls : '')
    b.innerHTML = html
    b.setAttribute('aria-label', label)
    b.dataset.tip = label
    if (data) Object.assign(b.dataset, data)
    b.onclick = () => fn(b)
    row.append(b)
    return b
  }
  const sep = () => {
    const s = document.createElement('span')
    s.className = 'sep'
    row.append(s)
  }
  const act = (n) => () => TEXTACT[n]()
  const g = document.createElement('button')
  g.className = 'opt pgrip'
  g.innerHTML = svg('grip')
  g.setAttribute('aria-label', 'Move these options')
  g.dataset.tip = 'Drag to an edge'
  row.append(g)
  caret('acard', 'More text options', row)
  sep()
  const v = curV(),
    nm = styleName(v)
  add(
    bprev(v) +
      '<span class="bl"><small>Box</small><b>' +
      esc(nm) +
      '</b></span>',
    'Box style: ' + nm,
    (b) =>
      openMenu(
        [
          { h: 'Box style' },
          ...['plain', 'sticky', 'callout'].map((id) => {
            const p = PRESETS.find((x) => x[0] === id)
            return {
              t: p[1],
              on: sameV(p[2], curV()),
              f: () => {
                setStyle(p[2], true)
                if (!curBox())
                  toast(
                    'New boxes will be ' +
                      p[1] +
                      '. Tap a box to change that box',
                  )
                renderOpts()
              },
            }
          }),
          { t: 'More box settings…', f: () => openBoxStyle() },
        ],
        b,
      ),
    'bst chev',
  ).setAttribute('aria-haspopup', 'menu')
  const lon = R.acard && R.ctab.text === 'layout'
  add(
    'Layout',
    'Layout',
    () => {
      R.ctab.text = 'layout'
      R.acard = !lon
      R.tabIn = true
      renderOpts()
      R.tabIn = false
    },
    lon ? 'on' : '',
  )
  if (pro)
    add(
      'Width',
      'Width',
      (b) =>
        openMenu(
          [
            { h: 'Width' },
            ...[
              ['Auto', 'auto'],
              ['Narrow', 160],
              ['Medium', 280],
              ['Wide', 'wide'],
            ].map(([n, x]) => ({ t: n, f: () => setWidth(x) })),
          ],
          b,
        ),
      'chev',
    )
  sep()
  const fsNow =
      parseFloat(
        curBox() ? curBox().style.getPropertyValue('--fs') : ST.boxDef.fs,
      ) || 1,
    ff = v.ff || 'inherit'
  add(
    'Aa',
    'Font and size',
    (b) =>
      openMenu(
        [
          { h: 'Font' },
          ...FONTS.map(([n, x]) => ({
            t: n,
            on: ff === x,
            f: () => tcardClick('font', x),
          })),
          { h: 'Size' },
          ...FSIZES.map((z) => ({
            t: Math.round(z * 100) + '%',
            on: Math.abs(fsNow - z) < 0.03,
            f: () => tcardClick('fsize', z),
          })),
        ],
        b,
      ),
    'chev',
  )
  sep()
  ;[
    ['Heading 1', 'H1'],
    ['Heading 2', 'H2'],
    ['Heading 3', 'H3'],
  ].forEach(([n, t]) => add(t, n, act(n), 'hd'))
  {
    const blk = curBlock()
    add(
      '<span>' +
        esc((TSTYLES.find((x) => x[1] === blk) || TSTYLES[4])[0]) +
        '</span>',
      'Text style',
      (b) =>
        openMenu(
          [
            { h: 'Text style' },
            ...TSTYLES.map(([n, tag]) => ({
              t: n,
              on: curBlock() === tag,
              f: () => {
                blockStyle(tag)
                renderOpts()
              },
            })),
          ],
          b,
        ),
      'chev',
    )
  }
  sep()
  ;[
    ['Bullet list', 'list'],
    ['Star list', 'star'],
    ['Numbered list', 'olist'],
    ['Checklist', 'checks'],
    ['Toggle list', 'toglist'],
  ].forEach(([n, ic]) => add(svg(ic), n, act(n)))
  sep()
  add('B', 'Bold', act('Bold'), 'b', { fmt: 'bold' })
  add('I', 'Italic', act('Italic'), 'i', { fmt: 'italic' })
  add('U', 'Underline', act('Underline'), 'u', { fmt: 'underline' })
  add('S', 'Strikethrough', act('Strikethrough'), 's', { fmt: 'strikeThrough' })
  sep()
  add(svg('outdent'), 'Outdent', act('Outdent'))
  add(svg('indent'), 'Indent', act('Indent'))
  add(
    svg('alignL'),
    'Align',
    (b) =>
      openMenu(
        [
          { h: 'Align' },
          ...alignCmds.map(([n, cmd]) => ({ t: n, f: () => fmt(cmd) })),
        ],
        b,
      ),
    'chev',
  )
  sep()
  add(svg('quote'), 'Callout', act('Callout'))
  add(svg('minus'), 'Divider', act('Divider'))
  add(svg('code'), 'Inline code', act('Inline code'))
  sep()
  add(
    svg('palette'),
    'Text colour',
    (b) =>
      openMenu(
        [
          { h: 'Text colour' },
          ...PENCOL.map(([n, c]) => ({
            t: n,
            c: c === 'auto' ? 'var(--ink)' : c,
            f: () => fmt('foreColor', c === 'auto' ? css('--ink') : c),
          })),
        ],
        b,
      ),
    'chev',
  )
  add(
    svg('hlight'),
    'Highlight colour',
    (b) =>
      openMenu(
        [
          { h: 'Highlight colour' },
          ...HLCOL.map(([n, c]) => ({
            t: n,
            c,
            f: () => fmt('hiliteColor', hexA(c)),
          })),
        ],
        b,
      ),
    'chev',
  )
  row.insertAdjacentHTML('beforeend', minHtml('opts', 'opt'))
  const h = document.createElement('div')
  h.className = 'bs2'
  row.className = 'prow'
  h.append(row)
  opts.append(h)
  hscroll(h, row)
  pinMore()
  pillTidy(row)
  placeOpts()
  updateFmtState()
}
{
  const ro0 = renderOpts
  renderOpts = function () {
    ro0()
    if (R.tool === 'pen') penPillV5()
    else if (R.tool === 'text') textBarV5()
  }
}

/* ---- Shapes & edits: a top-bar slot in both modes. Professional gets every option, no folding ---- */
{
  const rt1 = renderToolbar
  renderToolbar = function () {
    rt1()
    const b = $('#tb [data-id=shapes]')
    if (b && isPro()) {
      b.dataset.tip = 'Shapes & edits'
      b.setAttribute('aria-label', 'Shapes & edits')
      const n = $('.name', b)
      if (n) n.textContent = 'Shapes'
    }
  }
}

/* ---- All tools > Shapes & aids: organised groups that wrap, no long strip to scroll ---- */
{
  const ra0 = renderAll
  renderAll = function () {
    ra0()
    const ch = $('#allChips'),
      row = ch && $('.row', ch)
    if (!row) return
    if (R.allTab !== 'Shapes & aids') {
      row.classList.remove('grouped')
      return
    }
    row.classList.add('grouped')
    if (row.querySelector(':scope>.alab')) {
      const kids = [...row.children]
      row.innerHTML = ''
      let g = null
      kids.forEach((k) => {
        if (k.classList.contains('alab')) {
          g = document.createElement('div')
          g.className = 'agrp'
          g.setAttribute('role', 'group')
          g.setAttribute('aria-label', k.textContent)
          g.append(k)
          const c = document.createElement('div')
          c.className = 'agc'
          g.append(c)
          row.append(g)
        } else if (g) g.lastChild.append(k)
      })
      row.parentElement._m && row.parentElement._m()
    }
  }
}
