import type { CSSProperties, ReactNode } from 'react'

/**
 * How a tag looks everywhere (page chips, tags in text, menus): a small
 * rounded "#name", parents shown faintly ("#medicine/cardio"), grey unless
 * the tag has a colour. Styles in index.css (`.tag-chip`).
 */
export function TagLabel({
  names,
  color,
}: {
  /** The tag's levels, top first. */
  names: readonly string[]
  color?: string
}) {
  return (
    <>
      {color && <span aria-hidden className="tag-dot" />}#
      {names.length > 1 && (
        <span className="tag-parents">{names.slice(0, -1).join('/')}/</span>
      )}
      {names.at(-1)}
    </>
  )
}

/** Inline style giving a chip its tag's colour (none = grey). */
export const tagColorStyle = (color?: string): CSSProperties | undefined =>
  color ? ({ '--tag-color': color } as CSSProperties) : undefined

/** A tag chip; a button when `onClick` is set. */
export function TagChip({
  names,
  color,
  onClick,
  title,
  className: extra = '',
  children,
}: {
  names: readonly string[]
  color?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  title?: string
  className?: string
  children?: ReactNode
}) {
  const className = `${color ? 'tag-chip tag-chip-colored' : 'tag-chip'} ${extra}`
  const label = <TagLabel names={names} color={color} />
  if (!onClick) {
    return (
      <span className={className} style={tagColorStyle(color)} title={title}>
        {label}
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={tagColorStyle(color)}
      title={title}
    >
      {label}
      {children}
    </button>
  )
}
