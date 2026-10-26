import type { ReactNode } from 'react'
import { tagColorStyle } from './tagStyle'

/**
 * How a tag looks everywhere (page chips, tags in text, menus): a small
 * rounded "#name", parents shown faintly ("#medicine/cardio"), grey unless
 * the tag has a colour: chips (and the sidebar list) get a soft tint of it,
 * the tag picker menu a dot.
 * Styles in index.css (`.tag-chip`).
 */
export function TagLabel({
  names,
  color,
  dot = false,
}: {
  /** The tag's levels, top first. */
  names: readonly string[]
  color?: string
  /** Show the colour as a dot (lists; chips use a tint instead). */
  dot?: boolean
}) {
  return (
    <>
      {dot && color && <span aria-hidden className="tag-dot" />}#
      {names.length > 1 && (
        <span className="tag-parents">{names.slice(0, -1).join('/')}/</span>
      )}
      {names.at(-1)}
    </>
  )
}

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
