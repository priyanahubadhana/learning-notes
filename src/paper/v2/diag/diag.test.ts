// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { diagGate } from '../../../app/diagGate'
import { createAutosaver } from '../../../editor/autosave'
import { markSaved, markUnsaved } from '../../../app/saveStatus'
import {
  BOX_EVENTS,
  boxStateOf,
  caretPoint,
  pointOf,
  reactionOf,
  startBoxPencilLog,
  type BoxEntry,
} from './boxPencilLog'
import {
  capped,
  copyText,
  deferredSave,
  diagPanelShown,
  KEEP,
  loadRows,
  saveRows,
} from './diagStore'
import {
  blockKindOf,
  recentError,
  startSaveStateLog,
  type SaveEntry,
} from './saveStateLog'

describe('2B.2 where it runs', () => {
  it('records only on the preview address; the panel needs ?boxlog=1', () => {
    expect(diagGate(true)).toBe(true)
    expect(diagGate(false)).toBe(false)
    expect(diagPanelShown('?boxlog=1')).toBe(true)
    expect(diagPanelShown('')).toBe(false)
    expect(diagPanelShown('?boxlog=0')).toBe(false)
  })
})

describe('2B.2 the kept log', () => {
  it('keeps the newest 300', () => {
    expect(KEEP).toBe(300)
    expect(capped(Array.from({ length: 500 }, (_, i) => i))).toHaveLength(300)
  })
  it('saves and loads from the device, and survives a broken store', () => {
    const mem = new Map<string, string>()
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    }
    saveRows(
      store,
      'k',
      Array.from({ length: 400 }, (_, i) => ({ i })),
    )
    expect(loadRows(store, 'k')).toHaveLength(300)
    mem.set('k', '{not json')
    expect(loadRows(store, 'k')).toEqual([])
    expect(loadRows(undefined, 'k')).toEqual([])
  })
  it('Copy gives one line per entry, oldest first', () => {
    const text = copyText({ box: [{ a: 2 }, { a: 1 }], save: [] })
    expect(text).toBe('# box (2)\n{"a":1}\n{"a":2}\n# save (0)')
  })
})

describe('box log', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  it('lists the events it records and reads reactions as words', () => {
    expect(BOX_EVENTS).toContain('pointerdown')
    expect(BOX_EVENTS).toContain('dblclick')
    expect(
      reactionOf({
        selection: 'caret',
        editableFocused: true,
        boxState: 'idle',
      }),
    ).toBe('sel=caret keys=on box=idle')
  })
  it('logs a tap inside a box with pointer type and position, never its text', () => {
    document.body.innerHTML =
      '<div data-paper-box><p id="p">my secret note text</p></div><div id="out">outside</div>'
    let rows: BoxEntry[] = []
    const stop = startBoxPencilLog([], (r) => (rows = r))
    const fire = (id: string) =>
      document.getElementById(id)!.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          clientX: 10,
          clientY: 20,
        }),
      )
    fire('out')
    expect(rows).toHaveLength(0)
    fire('p')
    stop()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'pointerdown', x: 10, y: 20 })
    expect(JSON.stringify(rows)).not.toContain('secret')
  })
  it('folds a drag into one row', () => {
    document.body.innerHTML = '<div data-paper-box><p id="p">x</p></div>'
    let rows: BoxEntry[] = []
    const stop = startBoxPencilLog([], (r) => (rows = r))
    const p = document.getElementById('p')!
    p.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    for (let i = 0; i < 50; i++)
      p.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    stop()
    expect(rows).toHaveLength(2)
    expect(rows[0].count).toBe(50)
  })
})

describe('save log', () => {
  it('names the block kind and recent error only', () => {
    document.body.innerHTML =
      '<div data-content-type="checkListItem"><span id="s">buy milk</span></div>'
    expect(blockKindOf(document.getElementById('s'))).toBe('checkListItem')
    expect(blockKindOf(null)).toBe('-')
    expect(recentError({ name: 'QuotaExceededError', t: 1000 }, 2000)).toBe(
      'QuotaExceededError',
    )
    expect(recentError({ name: 'X', t: 0 }, 9000)).toBe('-')
    expect(recentError(null, 1)).toBe('-')
  })
  it('logs "not saved yet" and "saved" once each, with online and block kind', () => {
    document.body.innerHTML =
      '<div data-content-type="checkListItem"><span id="s" tabindex="0">private text</span></div>'
    document.getElementById('s')!.focus()
    let rows: SaveEntry[] = []
    const stop = startSaveStateLog([], (r) => (rows = r))
    const token = {}
    markUnsaved(token)
    markUnsaved(token) // the same token again: no second entry
    markSaved(token)
    stop()
    expect(rows.map((r) => r.state)).toEqual(['saved', 'unsaved'])
    expect(rows[1]).toMatchObject({ blockKind: 'checkListItem', online: true })
    expect(JSON.stringify(rows)).not.toContain('private')
  })

  it('a failed autosave gives the real error name, and autosave behaves as before', async () => {
    document.body.innerHTML =
      '<div data-content-type="checkListItem"><span id="s" tabindex="0">x</span></div>'
    document.getElementById('s')!.focus()
    let rows: SaveEntry[] = []
    const stop = startSaveStateLog([], (r) => (rows = r))
    const onError = vi.fn()
    const err = new DOMException('full', 'QuotaExceededError')
    const a = createAutosaver(() => Promise.reject(err), 10, onError)
    a.schedule()
    await a.flush()
    a.dispose()
    stop()
    // The save still reports its error, stays unsaved and will retry.
    expect(onError).toHaveBeenCalledWith(err)
    expect(a.failed()).toBe(true)
    expect(rows[0]).toMatchObject({
      state: 'unsaved',
      error: 'QuotaExceededError',
      blockKind: 'checkListItem',
    })
  })
})

describe('2B.2 review fixes', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })
  it('reads the box state marks BoxFrame really sets', () => {
    const mk = (attrs: string) => {
      document.body.innerHTML = `<div data-paper-box ${attrs}></div>`
      return document.querySelector('[data-paper-box]')
    }
    expect(boxStateOf(mk(''))).toBe('idle')
    expect(boxStateOf(mk('data-picked'))).toBe('picked')
    expect(boxStateOf(mk('data-picked data-typing'))).toBe('typing')
    expect(boxStateOf(mk('data-picked data-dragging'))).toBe('dragging')
    expect(boxStateOf(null)).toBe('idle')
  })
  it('takes the position of a touch from changedTouches, then touches', () => {
    const e = (o: object) => o as unknown as Event
    expect(
      pointOf(e({ changedTouches: [{ clientX: 12.4, clientY: 30 }] })),
    ).toEqual({ x: 12, y: 30 })
    expect(pointOf(e({ touches: [{ clientX: 5, clientY: 6 }] }))).toEqual({
      x: 5,
      y: 6,
    })
    expect(pointOf(e({ clientX: 7, clientY: 8 }))).toEqual({ x: 7, y: 8 })
    expect(pointOf(e({}))).toEqual({ x: 0, y: 0 })
  })
  it('a touch tap is logged with its real position', () => {
    document.body.innerHTML = '<div data-paper-box><p id="p">x</p></div>'
    let rows: BoxEntry[] = []
    const stop = startBoxPencilLog([], (r) => (rows = r))
    const ev = new Event('touchstart', { bubbles: true }) as Event & {
      changedTouches: unknown
    }
    ev.changedTouches = [{ clientX: 40, clientY: 50, touchType: 'stylus' }]
    document.getElementById('p')!.dispatchEvent(ev)
    stop()
    expect(rows[0]).toMatchObject({ x: 40, y: 50, touchType: 'stylus' })
  })
  it('gives the caret place as numbers, -1 without a caret', async () => {
    expect(caretPoint()).toEqual({ x: -1, y: -1 })
    document.body.innerHTML =
      '<div data-paper-box><p id="p">some words</p></div>'
    const r = document.createRange()
    r.setStart(document.getElementById('p')!.firstChild!, 3)
    r.collapse(true)
    r.getClientRects = () =>
      [
        { left: 33.4, top: 21.2, width: 1, height: 16 },
      ] as unknown as DOMRectList
    const sel = document.getSelection()!
    sel.removeAllRanges()
    sel.addRange(r)
    const orig = Selection.prototype.getRangeAt
    Selection.prototype.getRangeAt = () => r
    expect(caretPoint()).toEqual({ x: 33, y: 21 })
    Selection.prototype.getRangeAt = orig
    // and a logged tap carries it next to x and y
    let rows: BoxEntry[] = []
    const stop = startBoxPencilLog([], (rr) => (rows = rr))
    document
      .getElementById('p')!
      .dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 5))
    stop()
    expect(typeof rows[0].caretX).toBe('number')
    expect(typeof rows[0].caretY).toBe('number')
  })
  it('writes to the device only after a change, once per delay', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const later = deferredSave(write, 1000)
    vi.advanceTimersByTime(10_000)
    expect(write).not.toHaveBeenCalled() // nothing changed: nothing written
    later.changed()
    later.changed()
    later.changed()
    vi.advanceTimersByTime(999)
    expect(write).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(write).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10_000)
    expect(write).toHaveBeenCalledTimes(1)
    later.changed()
    later.flush() // page hide: written at once
    expect(write).toHaveBeenCalledTimes(2)
    later.flush() // nothing pending: nothing written
    expect(write).toHaveBeenCalledTimes(2)
  })
})
