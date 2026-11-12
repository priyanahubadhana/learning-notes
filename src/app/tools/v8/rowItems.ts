import type { IconName } from '../icons'
import type { MessageKey } from '../../../i18n/t'
import type { V8ToolId } from './registryV8'

/**
 * What each tool shows in the tool row (second line). Slice 1b draws the
 * chips and opens an empty card; the card contents come with 1c to 1f, and
 * the Favourites chips with 1g. Order follows the spec (TB-21, TB-40).
 */
export type ItemKind = 'menu' | 'toggle'

export interface RowItem {
  id: string
  tool: V8ToolId
  kind: ItemKind
  label: MessageKey
  icon?: IconName
  /** A round dot instead of an icon: size or the current colour. */
  dot?: 'size' | 'colour'
  /** Card width rule: pick = choose one thing, panel = adjust several. */
  card: 'pick' | 'panel'
  /** Toggles only: the text style it switches. */
  style?: 'bold' | 'italic'
}

const menu = (
  tool: V8ToolId,
  id: string,
  label: MessageKey,
  more: Partial<RowItem> = {},
): RowItem => ({ id, tool, kind: 'menu', label, card: 'pick', ...more })

export const ROW_ITEMS: Record<V8ToolId, readonly RowItem[]> = {
  text: [
    menu('text', 'box', 'v8.item.box', { icon: 'square', card: 'panel' }),
    menu('text', 'format', 'v8.item.format', {
      icon: 'textSize',
      card: 'panel',
    }),
    {
      id: 'bold',
      tool: 'text',
      kind: 'toggle',
      label: 'v8.item.bold',
      icon: 'bold',
      card: 'pick',
      style: 'bold',
    },
    {
      id: 'italic',
      tool: 'text',
      kind: 'toggle',
      label: 'v8.item.italic',
      icon: 'italic',
      card: 'pick',
      style: 'italic',
    },
  ],
  pen: [
    menu('pen', 'type', 'v8.item.type', { icon: 'penTool' }),
    menu('pen', 'size', 'v8.item.size', { dot: 'size' }),
    menu('pen', 'colour', 'v8.item.colour', { dot: 'colour' }),
    menu('pen', 'feel', 'v8.item.feel', { icon: 'sliders', card: 'panel' }),
  ],
  eraser: [
    menu('eraser', 'mode', 'v8.item.mode', { icon: 'eraser' }),
    menu('eraser', 'size', 'v8.item.size', { dot: 'size' }),
  ],
  shapes: [
    menu('shapes', 'shape', 'v8.item.shape', { icon: 'shapes' }),
    menu('shapes', 'size', 'v8.item.size', { dot: 'size' }),
    menu('shapes', 'colour', 'v8.item.colour', { dot: 'colour' }),
  ],
  lasso: [
    menu('lasso', 'shape', 'v8.item.shape', { icon: 'lasso' }),
    menu('lasso', 'actions', 'v8.item.actions', {
      icon: 'list',
      card: 'panel',
    }),
  ],
  // Insert has no row of its own: its card hangs from the Insert button.
  insert: [],
}

export const cardIdOf = (item: RowItem): string => `${item.tool}.${item.id}`

/** The card a second tap on the active tool opens (TB-04). */
export function firstCardOf(tool: V8ToolId): string {
  if (tool === 'insert') return 'insert'
  const first = ROW_ITEMS[tool].find((i) => i.kind === 'menu')
  return first ? cardIdOf(first) : tool
}

/** Title key and width rule of any v8 card id. */
export function cardInfo(id: string): {
  title: MessageKey
  size: 'pick' | 'panel'
} {
  if (id === 'insert') return { title: 'v8.tool.insert', size: 'panel' }
  if (id === 'fold.bar' || id === 'fold.row')
    return { title: 'v8.fold.title', size: 'pick' }
  for (const items of Object.values(ROW_ITEMS))
    for (const item of items)
      if (cardIdOf(item) === id) return { title: item.label, size: item.card }
  return { title: 'v8.fold.title', size: 'pick' }
}
