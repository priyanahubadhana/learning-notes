import { TAG_COLORS } from '../../tags/tagTools'

/**
 * Choice options store one of the tag colours. In charts each maps to a
 * themed chart colour slot (index.css `--chart-N`) of the same hue, so a
 * "Done" option is green in its chip and in every chart.
 */
const SLOT_OF: Record<(typeof TAG_COLORS)[number], number> = {
  '#2f6feb': 4, // blue (slot 1 is the accent violet)
  '#c8402f': 2, // red
  '#2e9e6b': 3, // green
  '#8a5cf6': 1, // purple = the accent
  '#d9822b': 5, // orange
  '#c2417f': 6, // pink
}

/** The chart slot (1–6) for a stored option colour, or null. */
export function tagColorSlot(color: string): number | null {
  return SLOT_OF[color as (typeof TAG_COLORS)[number]] ?? null
}
