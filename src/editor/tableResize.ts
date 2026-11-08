import type { BlockNoteEditor } from '@blocknote/core'
import { TableMap } from 'prosemirror-tables'

/**
 * Table sizing by hand: a grip pill on every row border (drag = row height),
 * grip pills on column borders for touch and Pencil (drag = column width),
 * and double-click / double-tap on a column grip = fit the column to its
 * content. Row heights live in the table block's `rowHeights` prop (schema.tsx).
 */
export const MIN_ROW = 24
export const MAX_ROW = 800
export const MIN_COL = 60
export const MAX_COL = 600
const NEAR = 8
const TOUCH_MS = 4000
const DOUBLE_MS = 350
const MAX_ROWS = 200

/**
 * Row heights are CSS variables on the <table> (a change there is ignored by
 * the editor; a style on a row would make it redraw the table): row n gets
 * height var(--ln-rn).
 */
function installRowCss(): HTMLStyleElement {
  const el = document.createElement('style')
  let css = ''
  for (let i = 1; i <= MAX_ROWS; i++) {
    css += `[data-content-type="table"] tr:nth-child(${i}){height:var(--ln-r${i},auto)}`
  }
  el.textContent = css
  document.head.appendChild(el)
  return el
}

/** "60,0,90" -> [60, 0, 90]; bad numbers become 0 (automatic). */
export function parseRowHeights(text: string): number[] {
  if (!text) return []
  return text.split(',').map((x) => {
    const n = Math.round(Number(x))
    return Number.isFinite(n) && n >= MIN_ROW ? Math.min(n, MAX_ROW) : 0
  })
}

/** Sets row `index` to `height` px (0 = automatic) and returns the prop text. */
export function withRowHeight(
  text: string,
  index: number,
  height: number,
): string {
  const list = parseRowHeights(text)
  while (list.length <= index) list.push(0)
  list[index] =
    height <= 0 ? 0 : Math.min(MAX_ROW, Math.max(MIN_ROW, Math.round(height)))
  while (list.length > 0 && list[list.length - 1] === 0) list.pop()
  return list.join(',')
}

/** Column width that fits `content` px of text plus the cell `padding`. */
export function fitColumnWidth(content: number, padding: number): number {
  return Math.min(MAX_COL, Math.max(MIN_COL, Math.ceil(content + padding)))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = BlockNoteEditor<any, any, any>

/** The natural (one-line) width of the cell's text, in screen px. */
function naturalWidth(cell: HTMLElement): number {
  const inner = cell.querySelector<HTMLElement>('p') ?? cell
  const old = [inner.style.whiteSpace, inner.style.width, inner.style.display]
  inner.style.whiteSpace = 'nowrap'
  inner.style.width = 'max-content'
  inner.style.display = 'block'
  const w = inner.getBoundingClientRect().width
  inner.style.whiteSpace = old[0]
  inner.style.width = old[1]
  inner.style.display = old[2]
  return w
}

/** Starts the grips; returns the function that stops them. */
export function installTableResize(editor: Editor): () => void {
  const rowCss = installRowCss()
  const layer = document.createElement('div')
  layer.className = 'ln-grip-layer'
  document.body.appendChild(layer)
  let table: HTMLTableElement | null = null
  let touchMode = false
  let dragging = false
  let hideTimer = 0
  let lastTap = { el: null as Element | null, at: 0 }

  const scaleOf = (el: HTMLElement) => {
    const h = el.offsetHeight
    return h > 0 ? el.getBoundingClientRect().height / h : 1
  }
  const blockOf = (t: HTMLElement) =>
    t.closest<HTMLElement>('[data-id]')?.getAttribute('data-id') ?? null

  const clear = () => {
    layer.replaceChildren()
    table = null
  }
  const hide = () => {
    window.clearTimeout(hideTimer)
    if (!dragging) clear()
  }
  const arm = () => {
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hide, TOUCH_MS)
  }
  const pill = (cls: string, x: number, y: number) => {
    const d = document.createElement('div')
    d.className = `ln-grip ${cls}`
    d.style.left = `${x}px`
    d.style.top = `${y}px`
    layer.appendChild(d)
    return d
  }

  // ---- rows ----------------------------------------------------------------
  const rowHeightsOf = (t: HTMLElement) => {
    const id = blockOf(t)
    const block = id ? editor.getBlock(id) : undefined
    return String((block?.props as { rowHeights?: string })?.rowHeights ?? '')
  }
  const saveHeights = (t: HTMLElement, index: number, height: number) => {
    const id = blockOf(t)
    const block = id ? editor.getBlock(id) : undefined
    if (!id || !block || block.type !== 'table') return
    const old = rowHeightsOf(t)
    const next = withRowHeight(old, index, height)
    if (next !== old) {
      editor.updateBlock(id, { props: { rowHeights: next } } as never)
    }
  }
  /** Puts each table block's saved row heights onto its rows. */
  const applyHeights = () => {
    if (dragging) return
    const root = editor.domElement
    if (!root) return
    for (const t of root.querySelectorAll<HTMLTableElement>(
      '[data-content-type="table"] table',
    )) {
      const list = parseRowHeights(rowHeightsOf(t))
      for (let i = 0; i < MAX_ROWS; i++) {
        const name = `--ln-r${i + 1}`
        const want = list[i] ? `${list[i]}px` : ''
        if (t.style.getPropertyValue(name) === want) continue
        if (want) t.style.setProperty(name, want)
        else t.style.removeProperty(name)
      }
    }
  }
  function rowDown(e: PointerEvent, tr: HTMLTableRowElement, index: number) {
    e.preventDefault()
    e.stopPropagation()
    const p = e.currentTarget as HTMLElement
    p.setPointerCapture(e.pointerId)
    dragging = true
    const t = tr.closest('table')!
    const scale = scaleOf(tr)
    const startH = tr.offsetHeight
    const startY = e.clientY
    let h = startH
    const move = (m: PointerEvent) => {
      h = Math.min(
        MAX_ROW,
        Math.max(MIN_ROW, startH + (m.clientY - startY) / scale),
      )
      t.style.setProperty(`--ln-r${index + 1}`, `${Math.round(h)}px`)
      p.style.top = `${tr.getBoundingClientRect().bottom}px`
    }
    const up = () => {
      p.removeEventListener('pointermove', move)
      p.removeEventListener('pointerup', up)
      p.removeEventListener('pointercancel', up)
      dragging = false
      saveHeights(t, index, h)
      applyHeights()
      if (touchMode) arm()
    }
    p.addEventListener('pointermove', move)
    p.addEventListener('pointerup', up)
    p.addEventListener('pointercancel', up)
  }

  // ---- columns -------------------------------------------------------------
  /** Sets column `col` of `t` to `width` px for every cell in it (one Undo). */
  const setColumnWidth = (t: HTMLTableElement, col: number, width: number) => {
    const view = editor.prosemirrorView
    const cell = t.rows[0]?.cells[0]
    if (!view || !cell) return
    const $cell = view.state.doc.resolve(view.posAtDOM(cell, 0))
    let depth = $cell.depth
    while (depth > 0 && $cell.node(depth).type.name !== 'table') depth--
    if (depth === 0) return
    const tableNode = $cell.node(depth)
    const start = $cell.start(depth)
    const map = TableMap.get(tableNode)
    if (col < 0 || col >= map.width) return
    const tr = view.state.tr
    for (const pos of map.cellsInRect({
      left: col,
      right: col + 1,
      top: 0,
      bottom: map.height,
    })) {
      const node = tableNode.nodeAt(pos)
      if (!node) continue
      const index = node.attrs.colspan === 1 ? 0 : col - map.colCount(pos)
      const colwidth: number[] = node.attrs.colwidth
        ? node.attrs.colwidth.slice()
        : Array<number>(node.attrs.colspan).fill(0)
      if (colwidth[index] === width) continue
      colwidth[index] = width
      tr.setNodeMarkup(start + pos, null, { ...node.attrs, colwidth })
    }
    if (tr.docChanged) view.dispatch(tr)
  }
  const fitColumn = (t: HTMLTableElement, col: number) => {
    let widest = 0
    let padding = 0
    for (const row of t.rows) {
      let c = 0
      for (const cell of row.cells) {
        if (cell.colSpan === 1 && c === col) {
          const st = getComputedStyle(cell)
          padding = Math.max(
            padding,
            parseFloat(st.paddingLeft) + parseFloat(st.paddingRight) + 2,
          )
          widest = Math.max(widest, naturalWidth(cell) / scaleOf(cell))
        }
        c += cell.colSpan
      }
    }
    setColumnWidth(t, col, fitColumnWidth(widest, padding))
    requestAnimationFrame(() => table && render(table, null))
  }
  function colDown(
    e: PointerEvent,
    t: HTMLTableElement,
    col: number,
    p: HTMLElement,
  ) {
    e.preventDefault()
    e.stopPropagation()
    const now = Date.now()
    if (lastTap.el === p && now - lastTap.at < DOUBLE_MS) {
      lastTap = { el: null, at: 0 }
      fitColumn(t, col)
      return
    }
    lastTap = { el: p, at: now }
    let c = 0
    let cell: HTMLElement | undefined
    for (const x of [...t.rows[0].cells]) {
      c += x.colSpan
      if (c - 1 === col) cell = x
    }
    if (!cell) return
    const target = cell
    p.setPointerCapture(e.pointerId)
    dragging = true
    const scale = scaleOf(target)
    const startW = target.getBoundingClientRect().width / scale
    const startX = e.clientX
    const colEl = t.querySelectorAll('col')[col] as HTMLElement | undefined
    let w = startW
    const move = (m: PointerEvent) => {
      w = Math.min(
        MAX_COL,
        Math.max(MIN_COL, startW + (m.clientX - startX) / scale),
      )
      if (colEl) colEl.style.width = `${Math.round(w)}px`
      p.style.left = `${target.getBoundingClientRect().right}px`
    }
    const up = () => {
      p.removeEventListener('pointermove', move)
      p.removeEventListener('pointerup', up)
      p.removeEventListener('pointercancel', up)
      dragging = false
      if (Math.abs(w - startW) > 1) setColumnWidth(t, col, Math.round(w))
      requestAnimationFrame(() => table && render(table, null))
      if (touchMode) arm()
    }
    p.addEventListener('pointermove', move)
    p.addEventListener('pointerup', up)
    p.addEventListener('pointercancel', up)
  }

  // ---- showing the pills ---------------------------------------------------
  /** Draws the pills for `t`: all of them, or only the row border near `nearY`. */
  function render(t: HTMLTableElement, nearY: number | null) {
    layer.replaceChildren()
    table = t
    const box = t.getBoundingClientRect()
    const rows = [...t.rows]
    rows.forEach((tr, i) => {
      const bottom = tr.getBoundingClientRect().bottom
      if (nearY !== null && Math.abs(bottom - nearY) > NEAR) return
      const p = pill('ln-row-grip', box.left + 18, bottom)
      p.addEventListener('pointerdown', (e) => rowDown(e, tr, i))
    })
    if (nearY !== null || !rows[0]) return
    let col = 0
    for (const cell of [...rows[0].cells]) {
      col += cell.colSpan
      const right = cell.getBoundingClientRect().right
      const index = col - 1
      const p = pill('ln-col-grip', right, box.top + 18)
      p.addEventListener('pointerdown', (e) => colDown(e, t, index, p))
    }
  }
  const tableOf = (target: EventTarget | null) =>
    target instanceof Element
      ? target.closest<HTMLTableElement>('[data-content-type="table"] table')
      : null
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || dragging) return
    if (e.target instanceof Element && e.target.closest('.ln-grip')) return
    const t = tableOf(e.target)
    if (!t) return hide()
    touchMode = false
    render(t, e.clientY)
  }
  const onDown = (e: PointerEvent) => {
    if (e.target instanceof Element && e.target.closest('.ln-grip')) return
    const t = tableOf(e.target)
    if (e.pointerType === 'mouse') return t ? undefined : hide()
    if (!t) return hide()
    touchMode = true
    render(t, null)
    arm()
  }
  const onScroll = () => {
    if (!table || dragging) return
    if (!table.isConnected) return clear()
    if (touchMode) render(table, null)
    else clear()
  }
  /** Double-click on the built-in column handle (mouse) fits that column. */
  const onDouble = (e: MouseEvent) => {
    const handle = document.querySelector<HTMLElement>('.column-resize-handle')
    const t = handle ? tableOf(handle) : null
    const cell = handle?.closest<HTMLTableCellElement>('td, th')
    if (!handle || !t || !cell) return
    const r = handle.getBoundingClientRect()
    if (Math.abs(e.clientX - (r.left + r.width / 2)) > 8) return
    let c = 0
    for (const x of [...(cell.parentElement as HTMLTableRowElement).cells]) {
      c += x.colSpan
      if (x === cell) break
    }
    fitColumn(t, c - 1)
  }

  let queued = false
  const mo = new MutationObserver((list) => {
    // Only real table rows changing matters (not the grips BlockNote adds).
    const rows = list.some(
      (m) =>
        m.target instanceof Element &&
        !m.target.closest('.table-widgets-container') &&
        m.target.closest('tbody, table'),
    )
    if (!rows || queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      applyHeights()
    })
  })
  const dom = editor.domElement
  if (dom) mo.observe(dom, { childList: true, subtree: true })
  const off = editor.onChange(() => applyHeights())
  applyHeights()
  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerdown', onDown, true)
  document.addEventListener('dblclick', onDouble, true)
  document.addEventListener('scroll', onScroll, true)
  return () => {
    mo.disconnect()
    off?.()
    document.removeEventListener('pointermove', onMove, true)
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('dblclick', onDouble, true)
    document.removeEventListener('scroll', onScroll, true)
    window.clearTimeout(hideTimer)
    layer.remove()
    rowCss.remove()
  }
}
