import { describe, expect, it } from 'vitest'
import { blocksText } from './blocksText'

describe('blocksText', () => {
  it('joins the words of the blocks, one line each, links included', () => {
    const blocks: Record<string, unknown> = {
      a: { content: [{ type: 'text', text: 'The nucleus' }] },
      b: {
        content: [
          { type: 'text', text: 'see ' },
          { type: 'link', content: [{ type: 'text', text: 'DNA' }] },
        ],
      },
      c: { content: [] },
    }
    const editor = { getBlock: (id: string) => blocks[id] }
    expect(blocksText(editor as never, ['a', 'b', 'c'])).toBe(
      'The nucleus\nsee DNA',
    )
  })
})
