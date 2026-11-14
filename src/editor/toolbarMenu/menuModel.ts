/**
 * The ⋯ toolbar menu, redesigned (2A.2, flag `toolbar.menu`): which item goes
 * in which group. Pure, so a test can check that nothing of the old flat
 * list was dropped. The screen part is ToolbarMenuV2.tsx.
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

export interface MenuLayout {
  /** The short row of the most used actions (icon and label). */
  top: MenuItemId[]
  /** Text styles shown as toggles. */
  styles: string[]
  copy: MenuItemId[]
  /** Behind "More ▾": the rare items. */
  more: { fixed: MenuItemId[]; actions: string[] }
}

const STYLE_IDS = ['bold', 'italic', 'underline', 'strike', 'code']

export function menuLayout(opts: {
  /** The ribbon is the bar showing: "All tools" is not needed. */
  ribbon: boolean
  /** A free-floating bar: it can be put back. */
  freePos: boolean
  /** Ids of every bar action, in the Edit bar order. */
  actionIds: string[]
}): MenuLayout {
  const { ribbon, freePos, actionIds } = opts
  return {
    top: ribbon
      ? ['edit', 'search', 'done']
      : ['edit', 'allTools', 'search', 'done'],
    styles: STYLE_IDS.filter((id) => actionIds.includes(id)),
    copy: ['copyPlain', 'copyMarkdown', 'pastePlain', 'copyPictures'],
    more: {
      fixed: freePos ? ['barSettings', 'resetPos'] : ['barSettings'],
      actions: actionIds.filter((id) => !STYLE_IDS.includes(id)),
    },
  }
}

/** A shortcut hint, only for mouse and keyboard (never on touch screens). */
export function hintFor(
  opts: { touch: boolean; enabled: boolean },
  hint?: string,
): string | undefined {
  return opts.touch || !opts.enabled ? undefined : hint
}
