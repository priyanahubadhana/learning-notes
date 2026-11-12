/**
 * SH-14: the shell's layer scale (shell-spec 8), bottom to top. The numbers
 * are the `--z-*` tokens in src/design/tokens.css. New floating shell parts
 * (sheet, dialog, pop menu, toast, chips, floating bar) sit in the browser's
 * top layer in opening order (see `useTopLayer`), so they need no stacking number of
 * their own; this table is the order they must keep and the one the area
 * slices map today's loose values onto.
 */
export const SHELL_LAYERS = {
  tabbar: 30,
  fbar: 40,
  chip: 41,
  drawerScrim: 59,
  drawer: 60,
  sheetScrim: 79,
  sheet: 80,
  dialog: 85,
  pop: 86,
  tagpick: 88,
  toast: 90,
} as const

export type ShellLayer = keyof typeof SHELL_LAYERS

const CSS_NAME: Record<ShellLayer, string> = {
  tabbar: '--z-tabbar',
  fbar: '--z-fbar',
  chip: '--z-chip',
  drawerScrim: '--z-drawer-scrim',
  drawer: '--z-drawer',
  sheetScrim: '--z-sheet-scrim',
  sheet: '--z-sheet',
  dialog: '--z-dialog',
  pop: '--z-pop',
  tagpick: '--z-tagpick',
  toast: '--z-toast',
}

/** `var(--z-sheet)` for a layer. */
export const layerVar = (layer: ShellLayer): string => `var(${CSS_NAME[layer]})`

/** The token name of a layer, e.g. `--z-sheet`. */
export const layerToken = (layer: ShellLayer): string => CSS_NAME[layer]

/** True when `upper` paints above `lower`. */
export const isAbove = (upper: ShellLayer, lower: ShellLayer): boolean =>
  SHELL_LAYERS[upper] > SHELL_LAYERS[lower]
