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
  /** The editor style this tile shows as pressed. */
  style?: 'bold' | 'italic' | 'underline' | 'strike' | 'code'
}

export interface FormatSection {
  id: 'text' | 'style' | 'paragraph' | 'advanced'
  title: MessageKey
  tiles: FormatTile[]
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

/** Text · Style · Paragraph, then Advanced when a Professional switch is on. */
export function formatSections(u: FormatUnlocks): FormatSection[] {
  const style: FormatTile[] = [
    tile('bold', tl('bold'), 'bold', { style: 'bold' }),
    tile('italic', tl('italic'), 'italic', { style: 'italic' }),
    tile('underline', tl('underline'), 'underline', { style: 'underline' }),
    tile('strike', tl('strike'), 'strike', { style: 'strike' }),
  ]
  if (u.textMarks)
    style.push(tile('code', tl('code'), 'code', { style: 'code' }))
  const sections: FormatSection[] = [
    {
      id: 'text',
      title: 'v8.format.text',
      tiles: [
        tile('heading1', tl('heading1'), 'h1'),
        tile('heading2', tl('heading2'), 'h2'),
        tile('heading3', tl('heading3'), 'h3'),
      ],
    },
    { id: 'style', title: 'v8.format.style', tiles: style },
    {
      id: 'paragraph',
      title: 'v8.format.paragraph',
      tiles: [
        tile('bulletList', tl('bulletList'), 'icon', { icon: 'list' }),
        tile('mark:key', 'v8.format.star', 'icon', { icon: 'star' }),
        tile('numberedList', tl('numberedList'), 'icon', { icon: 'numbered' }),
        tile('checklist', tl('checklist'), 'icon', { icon: 'checklist' }),
        tile('indent', tl('indent'), 'icon', { icon: 'indent' }),
        tile('outdent', tl('outdent'), 'icon', { icon: 'outdent' }),
        tile('alignLeft', tl('alignLeft'), 'icon', { icon: 'alignLeft' }),
        tile('alignCenter', tl('alignCenter'), 'icon', { icon: 'alignCenter' }),
        tile('alignRight', tl('alignRight'), 'icon', { icon: 'alignRight' }),
        tile('callout', tl('callout'), 'icon', { icon: 'sparkles' }),
        tile('divider', tl('divider'), 'icon', { icon: 'minus' }),
      ],
    },
  ]
  if (u.textFonts)
    sections.push({
      id: 'advanced',
      title: 'v8.format.advanced',
      tiles: [
        tile('font', tl('font'), 'icon', { icon: 'font' }),
        tile('textSize', tl('textSize'), 'icon', { icon: 'textSize' }),
        tile('color', tl('color'), 'icon', { icon: 'palette' }),
        tile('highlight', tl('highlight'), 'icon', { icon: 'highlighter' }),
      ],
    })
  return sections
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
