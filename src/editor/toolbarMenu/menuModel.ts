/**
 * The ⋯ toolbar menu, redesigned (2A.2, flag `toolbar.menu`): which item goes
 * in which group, and which items the bar already shows (those are left out,
 * so the menu stays short; they stay on the bar, in All tools and in search).
 * Pure, so a test can check that nothing is dropped. The screen part is
 * ToolbarMenuV2.tsx.
 */

export type MenuItemId =
  | 'edit'
  | 'allTools'
  | 'search'
  | 'done'
  | 'copyPlain'
  | 'copyMarkdown'
  | 'pastePlain'
  | 'copyPictures'
  | 'barSettings'
  | 'resetPos'

export type GroupId = 'style' | 'arrange' | 'study' | 'copy' | 'bar'

export interface MenuGroup {
  id: GroupId
  /** Action ids and MenuItemIds, in order. */
  items: string[]
}

export interface MenuLayout {
  /** The short row of the most used actions (icon and label). */
  top: MenuItemId[]
  /** The folded groups (a group with nothing left is not listed). */
  groups: MenuGroup[]
  /** Items left out because the bar already shows them. */
  onBar: string[]
}

/** Text style toggles (drawn as tiles). */
export const STYLE_TILES = ['bold', 'italic', 'underline', 'strike', 'code']
const ARRANGE = [
  'alignLeft',
  'alignCenter',
  'alignRight',
  'indent',
  'outdent',
  'newLine',
]
const COPY: MenuItemId[] = [
  'copyPlain',
  'copyMarkdown',
  'pastePlain',
  'copyPictures',
]

export function menuLayout(opts: {
  /** The ribbon is the bar showing: "All tools" is not needed. */
  ribbon: boolean
  /** A free-floating bar: it can be put back. */
  freePos: boolean
  /** Ids of every bar action, in the Edit bar order. */
  actionIds: string[]
  /** Ids the bar already shows (see onBarIds). */
  onBar?: ReadonlySet<string>
}): MenuLayout {
  const { ribbon, freePos, actionIds } = opts
  const onBar = opts.onBar ?? new Set<string>()
  const known = new Set<string>([...STYLE_TILES, ...ARRANGE, 'color', 'link'])
  const isStudy = (id: string) =>
    id.startsWith('mark:') || id === 'blank' || id === 'card'
  const style = [
    ...STYLE_TILES.filter((id) => actionIds.includes(id)),
    ...actionIds.filter((id) => id === 'color' || id === 'link'),
  ]
  const arrange = [
    ...ARRANGE.filter((id) => actionIds.includes(id)),
    // An action this list does not know yet still gets a place.
    ...actionIds.filter((id) => !known.has(id) && !isStudy(id)),
  ]
  const all: MenuGroup[] = [
    { id: 'style', items: style },
    { id: 'arrange', items: arrange },
    { id: 'study', items: actionIds.filter(isStudy) },
    { id: 'copy', items: [...COPY] },
    {
      id: 'bar',
      items: freePos ? ['barSettings', 'resetPos'] : ['barSettings'],
    },
  ]
  const hidden: string[] = []
  const groups = all
    .map((g) => ({
      ...g,
      items: g.items.filter((id) => {
        const on = g.id !== 'bar' && onBar.has(id)
        if (on) hidden.push(id)
        return !on
      }),
    }))
    .filter((g) => g.items.length > 0)
  return {
    top: ribbon
      ? ['edit', 'search', 'done']
      : ['edit', 'allTools', 'search', 'done'],
    groups,
    onBar: hidden,
  }
}

/** Every item id the layout shows or leaves out because the bar has it. */
export const layoutIds = (l: MenuLayout): string[] => [
  ...l.top,
  ...l.groups.flatMap((g) => g.items),
  ...l.onBar,
]

/** What the Text pill's options and the Insert pill's options stand for. */
const TEXT_OPTION_ITEMS: Record<string, string[]> = {
  bold: ['bold'],
  italic: ['italic'],
  underline: ['underline'],
  textColor: ['color'],
  align: ['alignLeft', 'alignCenter', 'alignRight'],
  keyPoint: ['mark:key'],
}
const INSERT_OPTION_ITEMS: Record<string, string[]> = { card: ['card'] }

/**
 * The menu items the user's bar already offers: tools on the main bar, the
 * options of the Text and Insert pills while those tools are on the bar, and
 * tools pinned to the bar. Re-read whenever the bar changes.
 */
export function onBarIds(bar: {
  main: readonly string[]
  extras: readonly string[]
  textOptions: readonly string[]
  insertOptions: readonly string[]
}): Set<string> {
  const out = new Set<string>(bar.extras)
  if (bar.main.includes('newLine')) out.add('newLine')
  if (bar.main.includes('text'))
    for (const o of bar.textOptions)
      for (const id of TEXT_OPTION_ITEMS[o] ?? []) out.add(id)
  if (bar.main.includes('insert'))
    for (const o of bar.insertOptions)
      for (const id of INSERT_OPTION_ITEMS[o] ?? []) out.add(id)
  return out
}

/** A shortcut hint, only for mouse and keyboard (never on touch screens). */
export function hintFor(
  opts: { touch: boolean; enabled: boolean },
  hint?: string,
): string | undefined {
  return opts.touch || !opts.enabled ? undefined : hint
}
