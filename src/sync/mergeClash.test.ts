import { describe, expect, it } from 'vitest'
import { independentEdit } from './clash'
import { formatHlc } from './hlc'
import { mergeRecord } from './merge'

const blk = (text: string) => ({
  deletedAt: null,
  type: 'paragraph',
  content: { text },
})
const hlc = (ms: number, deviceId: string) => formatHlc({ ms, n: 0, deviceId })

describe('clash only for real independent edits (bug batch 2, item 1)', () => {
  it('an earlier or shorter state of the same line is no clash', () => {
    const r = mergeRecord(
      'blocks',
      { value: blk('On get text'), hlc: hlc(2, 'A'), dirty: true },
      { value: blk('On'), hlc: hlc(1, 'B') },
    )
    expect(r).toEqual({ action: 'keep' })
  })
  it('our own echo coming back is no clash', () => {
    const r = mergeRecord(
      'blocks',
      { value: blk('hello world'), hlc: hlc(5, 'A'), dirty: true },
      { value: blk('something else'), hlc: hlc(3, 'A') },
    )
    expect(r).toEqual({ action: 'keep' })
  })
  it('different edits made at the same time on two devices are a clash', () => {
    const r = mergeRecord(
      'blocks',
      { value: blk('Hello A'), hlc: hlc(2, 'A'), dirty: true },
      { value: blk('Hello B'), hlc: hlc(1, 'B') },
    )
    expect(r).toHaveProperty('loser')
  })
  it('three-way: the base, ours and earlier states never clash', () => {
    expect(independentEdit('On', 'On get text', 'On')).toBe(false)
    expect(independentEdit('On', 'On get text', 'On get')).toBe(false)
    expect(independentEdit('On', 'On get text', 'On get text')).toBe(false)
    expect(independentEdit('On', 'On get text', '')).toBe(false)
    expect(independentEdit('On', 'On get text', 'On went home')).toBe(true)
  })
})
