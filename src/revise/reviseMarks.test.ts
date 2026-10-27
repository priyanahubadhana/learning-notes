import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_LABELS,
  groupMarks,
  isLabelList,
  markName,
  marksOfBlock,
  setMarkLabels,
} from './reviseMarks'

const run = (text: string, mark?: string, bold = false) => ({
  type: 'text',
  text,
  styles: { ...(mark && { mark }), ...(bold && { bold: true }) },
})
const block = (...runs: ReturnType<typeof run>[]) =>
  ({ id: 'b1', pageId: 'p1', content: { text: runs } }) as never

describe('revise marks', () => {
  it('finds marked runs, joining neighbours with the same label', () => {
    const marks = marksOfBlock(
      block(
        run('The '),
        run('first heart', 'key'),
        run(' sound', 'key', true),
        run(' is '),
        run('S1', 'keyword'),
      ),
    )
    expect(marks).toEqual([
      { label: 'key', text: 'first heart sound', pageId: 'p1', blockId: 'b1' },
      { label: 'keyword', text: 'S1', pageId: 'p1', blockId: 'b1' },
    ])
  })

  it('keeps marks of removed labels, ignores blank marks and blocks without text', () => {
    expect(
      marksOfBlock(block(run('x', 'removed-label'), run('  ', 'key'))).map(
        (m) => [m.label, m.text],
      ),
    ).toEqual([['removed-label', 'x']])
    expect(
      marksOfBlock({ id: 'b', pageId: 'p', content: {} } as never),
    ).toEqual([])
  })

  it('groups by label in the fixed order', () => {
    const marks = marksOfBlock(
      block(
        run('a', 'formula'),
        run(' / '),
        run('b', 'key'),
        run(' / '),
        run('c', 'formula'),
      ),
    )
    expect(groupMarks(marks).map((g) => [g.label, g.marks.length])).toEqual([
      ['key', 1],
      ['formula', 2],
    ])
  })
})

describe('custom labels', () => {
  const custom = '5c1d2e3f-0000-4000-8000-123456789abc'
  afterEach(() => setMarkLabels(DEFAULT_LABELS))

  it('validates a label list: built-ins kept, safe ids, palette colours', () => {
    expect(isLabelList(DEFAULT_LABELS)).toBe(true)
    expect(
      isLabelList([
        ...DEFAULT_LABELS,
        { id: custom, name: 'Exam', color: '#8a5cf6' },
      ]),
    ).toBe(true)
    expect(isLabelList(DEFAULT_LABELS.slice(1))).toBe(false) // a built-in is missing
    expect(
      isLabelList([
        ...DEFAULT_LABELS,
        { id: 'a"b', name: 'x', color: '#8a5cf6' },
      ]),
    ).toBe(false)
    expect(
      isLabelList([...DEFAULT_LABELS, { id: custom, name: 'x', color: 'red' }]),
    ).toBe(false)
    expect(
      isLabelList([
        ...DEFAULT_LABELS,
        { id: 'key', name: 'dup', color: '#8a5cf6' },
      ]),
    ).toBe(false)
    expect(
      isLabelList([
        ...DEFAULT_LABELS,
        { id: custom, name: 'x'.repeat(41), color: '#8a5cf6' },
      ]),
    ).toBe(false)
  })

  it('uses the set names and keeps marks of removed labels in their own group', () => {
    setMarkLabels([
      { ...DEFAULT_LABELS[0], name: 'Big idea' },
      ...DEFAULT_LABELS.slice(1),
      { id: custom, name: 'Exam', color: '#8a5cf6' },
    ])
    expect(markName('key')).toBe('Big idea')
    expect(markName(custom)).toBe('Exam')
    const marks = [
      { label: custom, text: 'a', pageId: 'p', blockId: 'b' },
      { label: 'key', text: 'b', pageId: 'p', blockId: 'b' },
      { label: 'gone-label', text: 'c', pageId: 'p', blockId: 'b' },
    ]
    expect(groupMarks(marks).map((g) => g.label)).toEqual([
      'key',
      custom,
      'gone-label',
    ])
    setMarkLabels(DEFAULT_LABELS) // the custom label is deleted
    expect(markName(custom)).toBe('Other')
  })
})
