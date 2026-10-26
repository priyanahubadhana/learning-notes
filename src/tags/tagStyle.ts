import type { CSSProperties } from 'react'

/** Inline style giving a chip its tag's colour (none = grey; index.css). */
export const tagColorStyle = (color?: string): CSSProperties | undefined =>
  color ? ({ '--tag-color': color } as CSSProperties) : undefined
