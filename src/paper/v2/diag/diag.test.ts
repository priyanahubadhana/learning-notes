// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { markSaved, markUnsaved } from '../../../app/saveStatus'
import {
  BOX_EVENTS,
  reactionOf,
  startBoxPencilLog,
  type BoxEntry,
} from './boxPencilLog'
import {
  capped,
  copyText,
  diagHost,
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
    expect(diagHost('build-next.learning-notes-app.pages.dev')).toBe(true)
    expect(diagHost('learning-notes-app.pages.dev')).toBe(false)
    expect(diagHost('localhost')).toBe(false)
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
        boxSelected: false,
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
})
