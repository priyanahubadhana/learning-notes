import type { Editor } from '../editor/barActions'

type Inline = { type?: string; text?: string; content?: unknown }

/** The plain words of some blocks, one line per block. */
export function blocksText(editor: Editor, ids: readonly string[]): string {
  const words = (content: unknown): string => {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''
    return (content as Inline[])
      .map((c) => (c.text !== undefined ? c.text : words(c.content)))
      .join('')
  }
  return ids
    .map((id) => words((editor.getBlock(id) as { content?: unknown })?.content))
    .filter((line) => line !== '')
    .join('\n')
}
