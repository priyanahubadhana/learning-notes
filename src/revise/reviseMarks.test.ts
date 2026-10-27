import { describe, expect, it } from 'vitest'
import { groupMarks, marksOfBlock } from './reviseMarks'

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

  it('ignores unknown labels, blank marks and blocks without text', () => {
    expect(marksOfBlock(block(run('x', 'nonsense'), run('  ', 'key')))).toEqual(
      [],
    )
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
