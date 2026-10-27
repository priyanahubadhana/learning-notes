import type { VersionBlock } from '../core/types'
import { blockText } from '../search/searchText'

/** A copy's blocks as plain lines, nested ones indented. */
export function previewLines(blocks: VersionBlock[]): string[] {
  const depth = (b: VersionBlock): number => {
    let d = 0
    for (
      let p = blocks.find((x) => x.id === b.parentId);
      p && d < 20;
      p = blocks.find((x) => x.id === p?.parentId)
    ) {
      d++
    }
    return d
  }
  const kids = new Map<string | null, VersionBlock[]>()
  for (const b of blocks) {
    const list = kids.get(b.parentId) ?? []
    list.push(b)
    kids.set(b.parentId, list)
  }
  const lines: string[] = []
  const visit = (parent: string | null) => {
    for (const b of (kids.get(parent) ?? []).sort((a, c) =>
      a.order < c.order ? -1 : 1,
    )) {
      const text = blockText(b.content)
      const mark =
        b.type === 'bulletListItem'
          ? '• '
          : b.type === 'checkListItem'
            ? b.content.checked
              ? '☑ '
              : '☐ '
            : ''
      if (text || b.type === 'divider') {
        lines.push(`${'    '.repeat(depth(b))}${mark}${text || '———'}`)
      }
      visit(b.id)
    }
  }
  visit(null)
  return lines
}
