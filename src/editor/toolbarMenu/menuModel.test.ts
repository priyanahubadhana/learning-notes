import { describe, expect, it } from 'vitest'
import { hintFor, menuLayout } from './menuModel'

const ACTIONS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'mark:key',
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

function everything(l: ReturnType<typeof menuLayout>): string[] {
  return [...l.top, ...l.styles, ...l.copy, ...l.more.fixed, ...l.more.actions]
}

describe('toolbar menu layout (2A.2)', () => {
  it('keeps every item of the old menu, once each', () => {
    const l = menuLayout({ ribbon: false, freePos: true, actionIds: ACTIONS })
    const all = everything(l)
    for (const id of [...OLD_FIXED, 'resetPos', ...ACTIONS]) {
      expect(all, id).toContain(id)
    }
    expect(new Set(all).size).toBe(all.length)
  })

  it('drops All tools when the ribbon is open, and Reset only for a free bar', () => {
    const l = menuLayout({ ribbon: true, freePos: false, actionIds: ACTIONS })
    expect(everything(l)).not.toContain('allTools')
    expect(everything(l)).not.toContain('resetPos')
  })

  it('has a short top row of the most used actions', () => {
    const l = menuLayout({ ribbon: false, freePos: false, actionIds: ACTIONS })
    expect(l.top).toEqual(['edit', 'allTools', 'search', 'done'])
    expect(l.top.length).toBeLessThanOrEqual(4)
  })

  it('groups text styles, copy and paste, and puts the rare items under More', () => {
    const l = menuLayout({ ribbon: false, freePos: true, actionIds: ACTIONS })
    expect(l.styles).toEqual(['bold', 'italic', 'underline', 'strike', 'code'])
    expect(l.copy).toEqual([
      'copyPlain',
      'copyMarkdown',
      'pastePlain',
      'copyPictures',
    ])
    expect(l.more.fixed).toEqual(['barSettings', 'resetPos'])
    expect(l.more.actions).toEqual(ACTIONS.slice(5))
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
