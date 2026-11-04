import { currentRunner } from '../tools/toolRuntime'

export interface Heading {
  id: string
  text: string
  level: number
}

type BlockLike = {
  id: string
  type: string
  props?: { level?: number }
  content?: unknown
  children?: BlockLike[]
}

/** The headings of the open page, in order (for the jump list). */
export function pageHeadings(): Heading[] {
  const editor = currentRunner().editor as unknown as {
    document: BlockLike[]
  } | null
  const out: Heading[] = []
  const walk = (blocks: BlockLike[]) => {
    for (const b of blocks) {
      if (b.type === 'heading' && Array.isArray(b.content)) {
        const text = (b.content as { text?: string }[])
          .map((c) => c.text ?? '')
          .join('')
          .trim()
        if (text) out.push({ id: b.id, text, level: b.props?.level ?? 1 })
      }
      if (b.children?.length) walk(b.children)
    }
  }
  if (editor) walk(editor.document)
  return out
}
