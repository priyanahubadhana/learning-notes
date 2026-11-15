import type { BoxStyle } from '../../../../../core/boxStyle'
import type { MessageKey } from '../../../../../i18n/t'
import type { IconName } from '../../../icons'

/**
 * What the Text cards hold (toolbar.v8, slice 1e; TB-41, TB-42). Every Format
 * tile runs a tool of the one registry (`runTool`), so nothing is copied.
 */

export type FormatLook =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'icon'

export interface FormatTile {
  /** A tool id of toolRegistry.ts (the key-point star is `mark:key`). */
  tool: string
  label: MessageKey
  /** The style draws itself in its own look; `icon` draws the icon instead. */
  look: FormatLook
  icon?: IconName
  /** Does something once (a heading, indent, a divider): a button, not a switch. */
  action?: boolean
  /** The editor style this tile shows as pressed. */
  style?: 'bold' | 'italic' | 'underline' | 'strike' | 'code'
}

export type FormatTabId = 'text' | 'style' | 'paragraph' | 'advanced'

/** A row of tool tiles inside a tab (the other groups are drawn by the card). */
export interface FormatGroup {
  id: string
  title: MessageKey
  columns: number
  tiles: FormatTile[]
}

export interface FormatTabDef {
  id: FormatTabId
  title: MessageKey
  groups: FormatGroup[]
}

const tile = (
  tool: string,
  label: MessageKey,
  look: FormatLook,
  more: Partial<FormatTile> = {},
): FormatTile => ({ tool, label, look, ...more })

const tl = (id: string) => `tool.${id}` as MessageKey

/** Which Professional switches are on (TB-41). */
export interface FormatUnlocks {
  textFonts: boolean
  textMarks: boolean
}

/** Beginner Text size: three steps of the note size (percent). */
export const TEXT_SIZE_STEPS = [
  { id: 'small', pct: 90, label: 'v8.format.size.small' },
  { id: 'body', pct: 100, label: 'v8.format.size.body' },
  { id: 'large', pct: 130, label: 'v8.format.size.large' },
] as const satisfies readonly { id: string; pct: number; label: MessageKey }[]

/**
 * TB-41 (v9): three tabs, a fourth (Advanced) with `tb.textFonts`. The tool
 * tiles of each tab; Text size, fonts, colours and line height are drawn by
 * the card itself (they are not tools).
 */
export function formatTabs(u: FormatUnlocks): FormatTabDef[] {
  const emphasis = [
    tile('bold', tl('bold'), 'bold', { style: 'bold' }),
    tile('italic', tl('italic'), 'italic', { style: 'italic' }),
    tile('underline', tl('underline'), 'underline', { style: 'underline' }),
    tile('strike', tl('strike'), 'strike', { style: 'strike' }),
  ]
  const blocks = [
    tile('callout', tl('callout'), 'icon', { icon: 'sparkles' }),
    tile('divider', tl('divider'), 'icon', { icon: 'minus', action: true }),
  ]
  if (u.textMarks)
    blocks.push(tile('code', tl('code'), 'code', { style: 'code' }))
  const tabs: FormatTabDef[] = [
    {
      id: 'text',
      title: 'v8.format.text',
      groups: [
        {
          id: 'emphasis',
          title: 'v8.format.g.emphasis',
          columns: 4,
          tiles: emphasis,
        },
        {
          id: 'marks',
          title: 'v8.format.g.marks',
          columns: 4,
          tiles: [tile('mark:key', 'v8.format.star', 'icon', { icon: 'star' })],
        },
      ],
    },
    {
      id: 'style',
      title: 'v8.format.style',
      groups: [
        {
          id: 'headings',
          title: 'v8.format.g.headings',
          columns: 3,
          tiles: [
            tile('heading1', tl('heading1'), 'h1', { action: true }),
            tile('heading2', tl('heading2'), 'h2', { action: true }),
            tile('heading3', tl('heading3'), 'h3', { action: true }),
          ],
        },
        {
          id: 'lists',
          title: 'v8.format.g.lists',
          columns: 3,
          tiles: [
            tile('bulletList', tl('bulletList'), 'icon', { icon: 'list' }),
            tile('numberedList', tl('numberedList'), 'icon', {
              icon: 'numbered',
            }),
            tile('checklist', tl('checklist'), 'icon', { icon: 'checklist' }),
            tile('indent', tl('indent'), 'icon', {
              icon: 'indent',
              action: true,
            }),
            tile('outdent', tl('outdent'), 'icon', {
              icon: 'outdent',
              action: true,
            }),
          ],
        },
        {
          id: 'blocks',
          title: 'v8.format.g.blocks',
          columns: 3,
          tiles: blocks,
        },
      ],
    },
    {
      id: 'paragraph',
      title: 'v8.format.paragraph',
      groups: [
        {
          id: 'align',
          title: 'v8.format.g.align',
          columns: 3,
          tiles: [
            tile('alignLeft', tl('alignLeft'), 'icon', { icon: 'alignLeft' }),
            tile('alignCenter', tl('alignCenter'), 'icon', {
              icon: 'alignCenter',
            }),
            tile('alignRight', tl('alignRight'), 'icon', {
              icon: 'alignRight',
            }),
          ],
        },
      ],
    },
  ]
  if (u.textFonts)
    tabs.push({ id: 'advanced', title: 'v8.format.advanced', groups: [] })
  return tabs
}

export interface BoxLook {
  id: string
  label: MessageKey
  style: BoxStyle
}

/** The quick looks of the Box card (Beginner and Professional). */
export const BOX_LOOKS: readonly BoxLook[] = [
  { id: 'plain', label: 'v8.box.look.plain', style: {} },
  {
    id: 'outline',
    label: 'v8.box.look.outline',
    style: { border: 'line', borderW: 1, radius: 8, pad: 8 },
  },
  {
    id: 'soft',
    label: 'v8.box.look.soft',
    style: { bg: 'dark', radius: 12, pad: 12 },
  },
  {
    id: 'note',
    label: 'v8.box.look.note',
    style: { bg: 'yellow', radius: 4, pad: 8 },
  },
  {
    id: 'sticky',
    label: 'v8.box.look.sticky',
    style: { bg: 'yellow', radius: 4, pad: 12, shadow: true },
  },
  {
    id: 'card',
    label: 'v8.box.look.card',
    style: { bg: 'white', radius: 12, pad: 12, shadow: true },
  },
]
