import type { CSSProperties } from 'react'
import { isTagColor } from './tagTools'

/**
 * Inline style giving a chip its tag's colour (none = grey; index.css).
 * Only the app's own colours are used, whatever is stored.
 */
export const tagColorStyle = (color?: string): CSSProperties | undefined =>
  isTagColor(color) ? ({ '--tag-color': color } as CSSProperties) : undefined
