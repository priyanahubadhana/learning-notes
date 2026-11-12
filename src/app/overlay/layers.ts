/** One table of stacking layers, bottom to top. */
export const LAYERS = {
  bar: 100,
  pill: 200,
  menu: 300,
  card: 400,
  sheet: 500,
  dialog: 600,
  toast: 700,
} as const

export type Layer = keyof typeof LAYERS

/** `--z-bar:100;--z-pill:200;...` */
export function layerCssVars(): string {
  return (
    (Object.keys(LAYERS) as Layer[])
      .map((k) => `--z-${k}:${LAYERS[k]}`)
      .join(';') + ';'
  )
}

/** Sets every `--z-<layer>` variable on `root`. */
export function applyLayerVars(
  root: HTMLElement = document.documentElement,
): void {
  for (const k of Object.keys(LAYERS) as Layer[])
    root.style.setProperty(`--z-${k}`, String(LAYERS[k]))
}
