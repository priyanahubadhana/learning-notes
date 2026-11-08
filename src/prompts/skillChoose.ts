import { levelOf, type SkillResult } from './skillFormat'
import type { Chosen } from './skillSave'

/** What is unticked in the preview, by position in the result. */
export interface Off {
  points: ReadonlySet<number>
  cards: ReadonlySet<number>
  pages: ReadonlySet<number>
  sources: ReadonlySet<number>
}

export const NOTHING_OFF: Off = {
  points: new Set(),
  cards: new Set(),
  pages: new Set(),
  sources: new Set(),
}

export interface Sections {
  summary: boolean
  keywords: boolean
  mindMap: boolean
  rows: boolean
  pages: boolean
  cards: boolean
  sources: boolean
}

/**
 * The preview's result after the user's edits and unticks: unticked items
 * are gone, cards keep pointing at their (renumbered) point, a point whose
 * sources were all unticked becomes unchecked, a section switched off is empty.
 */
export function choose(
  result: SkillResult,
  off: Off,
  sections: Sections,
): Chosen {
  const keptSources = new Set(
    result.sources.filter((_, i) => !off.sources.has(i)).map((s) => s.n),
  )
  const newIndex = new Map<number, number>()
  const points = result.points.flatMap((p, i) => {
    if (off.points.has(i)) return []
    newIndex.set(i, newIndex.size)
    const cited = p.sources.filter((n) => keptSources.has(n))
    const stars = Math.min(10, Math.max(1, Math.round(p.stars)))
    return [
      {
        ...p,
        stars,
        level: levelOf(stars),
        sources: cited,
        checked: p.checked && cited.length > 0,
      },
    ]
  })
  return {
    result: {
      ...result,
      summary: sections.summary ? result.summary : '',
      keywords: sections.keywords ? result.keywords : [],
      sources: sections.sources
        ? result.sources.filter((_, i) => !off.sources.has(i))
        : [],
      points,
      pages: sections.pages
        ? result.pages.filter((_, i) => !off.pages.has(i))
        : [],
      cards: sections.cards
        ? result.cards.flatMap((c, i) =>
            off.cards.has(i)
              ? []
              : [
                  {
                    ...c,
                    point:
                      c.point === null ? null : (newIndex.get(c.point) ?? null),
                  },
                ],
          )
        : [],
    },
    make: {
      summary: sections.summary,
      keywords: sections.keywords,
      mindMap: sections.mindMap,
      rows: sections.rows,
      cards: sections.cards,
    },
  }
}
