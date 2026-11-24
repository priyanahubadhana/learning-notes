import type { IconName } from '../../tools/icons'
import type { Block } from '../../../core/types'
import { blockText } from '../../../search/searchText'

export type ResKind = 'image' | 'link' | 'ref' | 'note' | 'audio' | 'file'
export type ResFilter = 'all' | ResKind
export type ResScope = 'page' | 'notebook' | 'all'

export const RES_FILTERS: readonly ResFilter[] = [
  'all',
  'image',
  'link',
  'ref',
  'note',
  'audio',
  'file',
]
export const isResFilter = (v: unknown): v is ResFilter =>
  RES_FILTERS.includes(v as ResFilter)
export const isResScope = (v: unknown): v is ResScope =>
  v === 'page' || v === 'notebook' || v === 'all'

export const RES_ICON: Record<ResKind, IconName> = {
  image: 'image',
  link: 'link',
  ref: 'quote',
  note: 'fileText',
  audio: 'mic',
  file: 'paperclip',
}

/** The block types that hold a resource (read by the Resources tab). */
export const RES_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'image',
  'embed',
  'file',
  'quote',
  'callout',
])

/** One thing in the Resources list. */
export interface ResItem {
  id: string
  kind: ResKind
  title: string
  pageId: string
  /** Seconds of a recording, when it is one. */
  durationMs?: number
  /** What "Copy" puts on the clipboard. */
  copy: string
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** The resource a block holds, or null if it holds none (an empty picture slot, an empty quote). */
export function resourceOfBlock(b: Block): ResItem | null {
  const c = b.content
  const base = { id: b.id, pageId: b.pageId }
  switch (b.type) {
    case 'image': {
      const name = str(c.caption) || str(c.name)
      if (!str(c.url)) return null
      return { ...base, kind: 'image', title: name, copy: name }
    }
    case 'embed': {
      const url = str(c.url)
      if (!url) return null
      return { ...base, kind: 'link', title: str(c.caption) || url, copy: url }
    }
    case 'file': {
      const name = str(c.name) || str(c.caption)
      if (!str(c.url) && !name) return null
      return { ...base, kind: 'file', title: name, copy: name }
    }
    case 'quote':
    case 'callout': {
      const text = blockText(c).trim()
      if (!text) return null
      return {
        ...base,
        kind: b.type === 'quote' ? 'ref' : 'note',
        title: clip(text),
        copy: text,
      }
    }
    default:
      return null
  }
}

/** Resources of live blocks, in the order given. */
export function resourcesOfBlocks(blocks: readonly Block[]): ResItem[] {
  const out: ResItem[] = []
  for (const b of blocks) {
    if (b.deletedAt !== null) continue
    const r = resourceOfBlock(b)
    if (r) out.push(r)
  }
  return out
}

/** The kind chip and the Find text. */
export function filterResources(
  items: readonly ResItem[],
  kind: ResFilter,
  query: string,
): ResItem[] {
  const q = query.trim().toLocaleLowerCase()
  return items.filter(
    (r) =>
      (kind === 'all' || r.kind === kind) &&
      (!q || r.title.toLocaleLowerCase().includes(q)),
  )
}

/** Scopes on offer: Beginner has This page and Notebook; `nb.resourceScope` adds Everywhere. */
export function scopesOn(everywhere: boolean): ResScope[] {
  return everywhere ? ['page', 'notebook', 'all'] : ['page', 'notebook']
}

/** The scope in force: a saved Everywhere is not used while the switch is off. */
export function effectiveScope(saved: ResScope, everywhere: boolean): ResScope {
  return !everywhere && saved === 'all' ? 'notebook' : saved
}
