import { tv } from './tv'

export interface SectionItem {
  id: string
  label: string
  /** Left out for screens that are not a list of rows. */
  count?: number
}

/**
 * SET-B01 / B02: the list of sections. A column on the left from tablet up,
 * a row of chips (scrolls sideways) on a phone. The look switches in CSS.
 */
export function SectionList({
  sections,
  current,
  onPick,
  glow,
}: {
  sections: SectionItem[]
  current: string
  onPick(id: string): void
  /** A section that just moved: it glows for a moment. */
  glow?: string
}) {
  return (
    <nav aria-label={tv('sv3.sections')} className="sv3-sections">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          data-section={s.id}
          aria-current={s.id === current ? 'page' : undefined}
          data-glow={glow === s.id ? 'on' : undefined}
          aria-label={
            s.count === undefined
              ? s.label
              : `${s.label}, ${tv('sv3.sectionCount', { count: s.count })}`
          }
          onClick={() => onPick(s.id)}
          className="sv3-section"
        >
          <span className="sv3-section-name">{s.label}</span>
          {s.count !== undefined && (
            <span className="sv3-section-count" aria-hidden>
              {s.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
