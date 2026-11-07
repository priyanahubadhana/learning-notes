// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { currentBar, pinTool, resolveBar, saveBar, unpinTool } from './barOrder'
import { extraTools, mainList, resetMainState } from './mainTools'

beforeEach(() => {
  localStorage.clear()
  resetMainState()
})

describe('bar order (R7-11, R7-12)', () => {
  it('without a saved order: main tools, then pinned tools', () => {
    expect(resolveBar([], ['text', 'pen'], ['writePad'])).toEqual([
      'm:text',
      'm:pen',
      'x:writePad',
    ])
  })

  it('a pinned tool can sit between main tools; stale tokens are ignored; new ones go last', () => {
    expect(
      resolveBar(
        ['m:text', 'x:writePad', 'x:gone', 'm:pen'],
        ['text', 'pen', 'read'],
        ['writePad'],
      ),
    ).toEqual(['m:text', 'x:writePad', 'm:pen', 'm:read'])
  })

  it('saveBar splits tokens into the two lists and keeps the order', () => {
    saveBar(['x:writePad', 'm:text', 'm:read'])
    expect(mainList.get()).toEqual(['text', 'read'])
    expect(extraTools.get()).toEqual(['writePad'])
    expect(currentBar()).toEqual(['x:writePad', 'm:text', 'm:read'])
  })

  it('a newly pinned tool goes first by default, or where dropped', () => {
    pinTool('writePad')
    expect(currentBar()[0]).toBe('x:writePad')
    pinTool('find', 3)
    expect(currentBar()[3]).toBe('x:find')
    unpinTool('writePad')
    expect(extraTools.get()).toEqual(['find'])
  })
})
