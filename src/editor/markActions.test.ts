import { describe, expect, it } from 'vitest'
import { markWholeBlock } from './markActions'

function fakeEditor() {
  const calls: unknown[] = []
  return {
    calls,
    updateBlock: (_block: unknown, update: unknown) => calls.push(update),
  } as never as Parameters<typeof markWholeBlock>[0] & { calls: unknown[] }
}
const run = (text: string, styles: Record<string, unknown> = {}) => ({
  type: 'text',
  text,
  styles,
})

describe('markWholeBlock', () => {
  it('marks every text run, leaving other inline content alone', () => {
    const editor = fakeEditor()
    const link = { type: 'noteLink', props: { pageId: 'p' } }
    markWholeBlock(
      editor,
      { content: [run('a'), link, run('b', { bold: true })] },
      'key',
    )
    expect(editor.calls).toEqual([
      {
        content: [
          { type: 'text', text: 'a', styles: { mark: 'key' } },
          link,
          { type: 'text', text: 'b', styles: { bold: true, mark: 'key' } },
        ],
      },
    ])
  })

  it('removes the label when the whole line has it already', () => {
    const editor = fakeEditor()
    markWholeBlock(
      editor,
      { content: [run('a', { mark: 'key' }), run('b', { mark: 'key' })] },
      'key',
    )
    expect(JSON.stringify(editor.calls)).not.toContain('mark')
  })

  it('does nothing for a block without text', () => {
    const editor = fakeEditor()
    markWholeBlock(editor, { content: undefined }, 'key')
    markWholeBlock(editor, { content: [] }, 'key')
    expect(editor.calls).toEqual([])
  })
})
