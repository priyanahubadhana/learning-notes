import type { CommandGroup } from '../../design/parts/commandListLogic'
import type { StripItem, StripMenuItem } from '../../design/parts/ContextStrip'
import { t, type MessageKey } from '../../i18n/t'

/** "Turn into" choices (id = BlockNote block type + level). */
export const TURN_KINDS = [
  ['paragraph', 'slashMenu.item.text'],
  ['heading1', 'slashMenu.item.heading'],
  ['heading2', 'slashMenu.item.heading2'],
  ['heading3', 'slashMenu.item.heading3'],
  ['bullet', 'slashMenu.item.bullet'],
  ['numbered', 'slashMenu.item.numbered'],
  ['check', 'slashMenu.item.checklist'],
  ['quote', 'slashMenu.item.quote'],
] as const satisfies readonly (readonly [string, MessageKey])[]

/** Text colours (BlockNote's own names). */
export const COLOURS = [
  'default',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
] as const

/** The strip over text (PM-20): Beginner shows Cut, Copy, Paste ▾, Delete, ⋯. */
export function stripItems(
  o: { favourite?: boolean; comment?: boolean } = {},
): StripItem[] {
  const comment: StripItem[] = o.comment
    ? [{ id: 'comment', icon: 'quote', label: t('pageMenus.comment') }]
    : []
  return [
    {
      id: 'paste',
      icon: 'paste',
      label: t('parts.menus.paste'),
      menuTitle: t('parts.menus.pasteAs'),
      menu: [],
    },
    { id: 'copy', icon: 'copy', label: t('parts.menus.copy') },
    { id: 'cut', icon: 'scissors', label: t('parts.menus.cut') },
    { id: 'duplicate', icon: 'duplicate', label: t('parts.menus.duplicate') },
    {
      id: 'turn',
      icon: 'textSize',
      label: t('pageMenus.turnInto'),
      menu: TURN_KINDS.map(([id, key]) => ({ id, label: t(key) })),
    },
    {
      id: 'colour',
      icon: 'palette',
      label: t('pageMenus.colour'),
      menu: COLOURS.map((id) => ({
        id,
        label: t(`pageMenus.colour.${id}` as MessageKey),
      })),
    },
    {
      id: 'favourite',
      icon: 'star',
      label: t(o.favourite ? 'fav.remove' : 'fav.add'),
    },
    ...comment,
    {
      id: 'delete',
      icon: 'trash',
      label: t('parts.menus.delete'),
      danger: true,
    },
  ]
}

/**
 * The ▾ list of Paste (PM-41). Rows that do not apply are left out. `forms`
 * is what the clipboard allows (from the paste planner); null = not known
 * yet (the browser has not allowed a look), so every row stays.
 */
export function pasteMenu(o: {
  box: boolean
  ai: boolean
  forms?: readonly string[] | null
}): StripMenuItem[] {
  const has = (id: string) => !o.forms || o.forms.includes(id)
  const rows: StripMenuItem[] = [
    {
      id: 'keep',
      label: t('parts.menus.pasteKeep'),
      hint: t('parts.menus.pasteKeepHint'),
    },
    {
      id: 'plain',
      label: t('parts.menus.pastePlain'),
      hint: t('parts.menus.pastePlainHint'),
    },
  ]
  if (o.box && has('box')) {
    rows.push({
      id: 'box',
      label: t('pageMenus.pasteBox'),
      hint: t('pageMenus.pasteBoxHint'),
    })
  }
  if (has('table')) {
    rows.push({
      id: 'table',
      label: t('parts.menus.pasteTable'),
      hint: t('parts.menus.pasteTableHint'),
    })
  }
  rows.push({
    id: 'quote',
    label: t('pageMenus.pasteQuote'),
    hint: t('pageMenus.pasteQuoteHint'),
  })
  if (has('link')) {
    rows.push({
      id: 'link',
      label: t('pageMenus.pasteLink'),
      hint: t('pageMenus.pasteLinkHint'),
    })
  }
  if (o.ai && has('cleanup')) {
    rows.push({
      id: 'cleanup',
      label: t('pageMenus.pasteCleanup'),
      hint: t('pageMenus.pasteCleanupHint'),
    })
  }
  return rows
}

/** The "⋯" list (PM-22). `pro` adds the Professional extras (Copy as). */
export function moreCommands(o: { pro: boolean }): CommandGroup[] {
  const items = [
    { id: 'select', label: t('pageMenus.moreSelect'), icon: 'pointer' },
    { id: 'selectAll', label: t('pageMenus.moreSelectAll'), icon: 'grid' },
    { id: 'picture', label: t('pageMenus.moreInsertPicture'), icon: 'image' },
    { id: 'line', label: t('pageMenus.moreInsertLine'), icon: 'minus' },
  ] as CommandGroup['items']
  if (o.pro) {
    items.push(
      {
        id: 'copyMarkdown',
        label: `${t('pageMenus.copyAs')} ${t('pageMenus.copyMarkdown')}`,
        icon: 'copy',
      },
      {
        id: 'copyRich',
        label: `${t('pageMenus.copyAs')} ${t('pageMenus.copyRich')}`,
        icon: 'copy',
      },
      {
        id: 'copyPlain',
        label: `${t('pageMenus.copyAs')} ${t('pageMenus.copyPlain')}`,
        icon: 'copy',
      },
    )
  }
  return [{ id: 'more', label: t('parts.menus.actions'), items }]
}
