import { describe, expect, it } from 'vitest'
import { hintFor, layoutIds, menuLayout, onBarIds } from './menuModel'

const ACTIONS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'mark:key',
  'mark:keyword',
  'blank',
  'card',
  'newLine',
  'alignLeft',
  'alignCenter',
  'alignRight',
  'color',
  'indent',
  'outdent',
  'link',
]

/** Everything the old flat ⋯ menu offered (DockedBar before 2A.2), by id. */
const OLD_FIXED = [
  'edit',
  'allTools',
  'search',
  'done',
  'barSettings',
  'copyPlain',
  'copyMarkdown',
  'pastePlain',
  'copyPictures',
]

const BAR = {
  main: ['text', 'pen', 'newLine', 'insert'],
  extras: [] as string[],
  textOptions: [
    'bold',
    'italic',
    'underline',
    'textColor',
    'align',
    'keyPoint',
  ],
  insertOptions: ['table', 'card'],
}

describe('toolbar menu layout (2A.2)', () => {
  it('with nothing on the bar, keeps every item of the old menu, once each', () => {
    const l = menuLayout({ ribbon: false, freePos: true, actionIds: ACTIONS })
    const all = layoutIds(l)
    for (const id of [...OLD_FIXED, 'resetPos', ...ACTIONS]) {
      expect(all, id).toContain(id)
    }
    expect(new Set(all).size).toBe(all.length)
    expect(l.onBar).toEqual([])
  })

  it('1: leaves out what the bar already shows, and nothing else is lost', () => {
    const l = menuLayout({
      ribbon: false,
      freePos: false,
      actionIds: ACTIONS,
      onBar: onBarIds(BAR),
    })
    const shown = l.groups.flatMap((g) => g.items)
    for (const id of [
      'bold',
      'italic',
      'underline',
      'color',
      'alignLeft',
      'alignCenter',
      'alignRight',
      'mark:key',
      'newLine',
      'card',
    ]) {
      expect(shown, id).not.toContain(id)
      expect(l.onBar, id).toContain(id)
    }
    for (const id of ['strike', 'code', 'indent', 'outdent', 'link', 'blank']) {
      expect(shown, id).toContain(id)
    }
    // Together the menu and the bar still hold every action.
    for (const id of ACTIONS) expect(layoutIds(l), id).toContain(id)
  })

  it('1: it follows the bar: a tool taken off the bar comes back into the menu', () => {
    const before = onBarIds(BAR)
    const after = onBarIds({ ...BAR, main: ['text', 'pen', 'insert'] })
    expect(before.has('newLine')).toBe(true)
    expect(after.has('newLine')).toBe(false)
    const l = menuLayout({
      ribbon: false,
      freePos: false,
      actionIds: ACTIONS,
      onBar: after,
    })
    expect(l.groups.flatMap((g) => g.items)).toContain('newLine')
  })

  it('1: options only count while their tool is on the bar; pinned tools count', () => {
    expect(onBarIds({ ...BAR, main: ['pen'] }).has('bold')).toBe(false)
    expect(
      onBarIds({ ...BAR, main: ['pen'], extras: ['strike'] }).has('strike'),
    ).toBe(true)
  })

  it('a group with nothing left is not listed, and the bar group is never hidden', () => {
    const all = new Set([
      ...ACTIONS,
      'copyPlain',
      'copyMarkdown',
      'pastePlain',
      'copyPictures',
      'barSettings',
    ])
    const l = menuLayout({
      ribbon: false,
      freePos: false,
      actionIds: ACTIONS,
      onBar: all,
    })
    expect(l.groups.map((g) => g.id)).toEqual(['bar'])
  })

  it('2: a short top row of four, then at most five folded groups', () => {
    const l = menuLayout({ ribbon: false, freePos: true, actionIds: ACTIONS })
    expect(l.top).toEqual(['edit', 'allTools', 'search', 'done'])
    expect(l.groups.map((g) => g.id)).toEqual([
      'style',
      'arrange',
      'study',
      'copy',
      'bar',
    ])
  })

  it('drops All tools when the ribbon is open, and Reset only for a free bar', () => {
    const l = menuLayout({ ribbon: true, freePos: false, actionIds: ACTIONS })
    expect(layoutIds(l)).not.toContain('allTools')
    expect(layoutIds(l)).not.toContain('resetPos')
  })

  it('an action the lists do not know yet still gets a place', () => {
    const l = menuLayout({
      ribbon: false,
      freePos: false,
      actionIds: [...ACTIONS, 'newThing'],
    })
    expect(layoutIds(l)).toContain('newThing')
  })
})

describe('shortcut hints (R3)', () => {
  it('shows no key names on a touch screen', () => {
    expect(hintFor({ touch: true, enabled: true }, '⌘⇧V')).toBeUndefined()
  })
  it('keeps them for mouse and keyboard when hints are on', () => {
    expect(hintFor({ touch: false, enabled: true }, 'Ctrl+B')).toBe('Ctrl+B')
    expect(hintFor({ touch: false, enabled: false }, 'Ctrl+B')).toBeUndefined()
  })
})
