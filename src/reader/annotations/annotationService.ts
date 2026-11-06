import type { LearningNotesDB } from '../../core/db'
import { getLive, isLive, newRecordFields } from '../../core/records'
import { isAnchor, isQuote, MAX_NOTE_LENGTH } from '../../core/sourceCheck'
import type {
  Annotation,
  AnnotationAnchor,
  HighlightColour,
} from '../../core/types'

/**
 * Highlights, notes and bookmarks of books and note pages (C4). A thin layer
 * over the `annotations` table: soft deletes (Undo restores), never touches
 * the pages it points at.
 */

export interface NewAnnotation {
  pageId: string
  kind: Annotation['kind']
  anchor: AnnotationAnchor
  colour?: HighlightColour
  quote?: Annotation['quote']
  note?: string
  chapter?: string
  origin?: Annotation['origin']
}

/** Most annotations kept per page (a safety cap). */
export const MAX_ANNOTATIONS_PER_PAGE = 20_000

export async function createAnnotation(
  db: LearningNotesDB,
  input: NewAnnotation,
): Promise<Annotation> {
  if (!isAnchor(input.anchor)) throw new Error('Bad annotation anchor')
  if (input.quote && !isQuote(input.quote)) throw new Error('Bad quote')
  const note = input.note?.slice(0, MAX_NOTE_LENGTH)
  const annotation: Annotation = {
    ...newRecordFields(),
    pageId: input.pageId,
    kind: input.kind,
    anchor: input.anchor,
    origin: input.origin ?? 'user',
    ...(input.colour ? { colour: input.colour } : {}),
    ...(input.quote ? { quote: input.quote } : {}),
    ...(note ? { note } : {}),
    ...(input.chapter ? { chapter: input.chapter.slice(0, 300) } : {}),
  }
  await db.annotations.add(annotation)
  return annotation
}

/** Live annotations of a page, oldest first. */
export async function listAnnotations(
  db: LearningNotesDB,
  pageId: string,
): Promise<Annotation[]> {
  const rows = await db.annotations.where('pageId').equals(pageId).toArray()
  return rows.filter(isLive).sort((a, b) => a.createdAt - b.createdAt)
}

/** Every live highlight on the device, newest first (daily review, search). */
export async function listAllHighlights(
  db: LearningNotesDB,
  limit = 2000,
): Promise<Annotation[]> {
  const rows = await db.annotations
    .orderBy('updatedAt')
    .reverse()
    .filter((a) => isLive(a) && a.kind === 'highlight' && !!a.quote)
    .limit(limit)
    .toArray()
  return rows
}

export async function updateAnnotation(
  db: LearningNotesDB,
  id: string,
  changes: Partial<Pick<Annotation, 'note' | 'colour' | 'savedTo' | 'cardIds'>>,
): Promise<void> {
  await getLive(db.annotations, id)
  const note =
    changes.note === undefined
      ? undefined
      : changes.note.slice(0, MAX_NOTE_LENGTH)
  await db.annotations.update(id, {
    ...changes,
    ...(note === undefined ? {} : { note }),
    updatedAt: Date.now(),
  })
}

/** Soft delete; `restoreAnnotation` is the Undo. */
export async function deleteAnnotation(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.annotations.update(id, { deletedAt: now, updatedAt: now })
}

export async function restoreAnnotation(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.annotations.update(id, { deletedAt: null, updatedAt: Date.now() })
}

// ---- Locators and quotes ----

/** The reader locator of an annotation (`pdf:<page>:<y>` / `epub:<cfi>`), or null. */
export function locatorOf(anchor: AnnotationAnchor): string | null {
  if (anchor.type === 'pdf') {
    const y = anchor.rects.length >= 2 ? anchor.rects[1] : 0
    return `pdf:${anchor.page}:${Math.min(1, Math.max(0, y)).toFixed(4)}`
  }
  if (anchor.type === 'epub') return `epub:${anchor.cfi}`
  return null
}

/**
 * A text-quote selector from a selection inside `full` text: the words, and
 * 40 characters either side, to find the spot again if the text moved.
 */
export function makeQuote(
  full: string,
  start: number,
  end: number,
): NonNullable<Annotation['quote']> {
  return {
    exact: full.slice(start, end).slice(0, 5000),
    prefix: full.slice(Math.max(0, start - 40), start),
    suffix: full.slice(end, end + 40),
  }
}

/**
 * Finds a quote again in changed text. Prefers the place where the words and
 * their surroundings both fit; falls back to the words alone. Returns the
 * start index, or -1.
 */
export function reanchor(
  full: string,
  quote: NonNullable<Annotation['quote']>,
): number {
  if (!quote.exact) return -1
  let best = -1
  let bestScore = -1
  let from = 0
  for (;;) {
    const at = full.indexOf(quote.exact, from)
    if (at === -1) break
    const before = full.slice(Math.max(0, at - quote.prefix.length), at)
    const after = full.slice(
      at + quote.exact.length,
      at + quote.exact.length + quote.suffix.length,
    )
    // How much of the surroundings still matches, nearest characters first.
    let score = 0
    while (
      score < before.length &&
      before[before.length - 1 - score] ===
        quote.prefix[quote.prefix.length - 1 - score]
    ) {
      score++
    }
    let k = 0
    while (k < after.length && after[k] === quote.suffix[k]) k++
    score += k
    if (score > bestScore) {
      best = at
      bestScore = score
    }
    from = at + 1
  }
  return best
}

// ---- Filters and export ----

export interface AnnotationFilter {
  type?: Annotation['kind']
  colour?: HighlightColour
  chapter?: string
}

export function filterAnnotations(
  list: readonly Annotation[],
  filter: AnnotationFilter,
): Annotation[] {
  return list.filter(
    (a) =>
      (!filter.type || a.kind === filter.type) &&
      (!filter.colour || a.colour === filter.colour) &&
      (!filter.chapter || a.chapter === filter.chapter),
  )
}

/** A short place label: "p. 12" for a PDF, the chapter for an EPUB. */
export function placeLabel(a: Annotation): string {
  if (a.anchor.type === 'pdf') return `p. ${a.anchor.page}`
  return a.chapter ?? ''
}

/**
 * Highlights as a Markdown document: quote, note, location and a link back.
 * `linkFor` makes the address (the app address with the locator).
 */
export function exportMarkdown(
  title: string,
  list: readonly Annotation[],
  linkFor: (a: Annotation) => string | null,
  labels: { heading: string; location: (where: string) => string },
): string {
  const lines = [`# ${labels.heading}`, '']
  for (const a of list) {
    if (a.kind === 'bookmark' && !a.note) continue
    const quote = a.quote?.exact.replace(/\s+/g, ' ').trim()
    if (quote) lines.push(`> ${quote}`)
    if (a.note) lines.push('', a.note.trim())
    const where = placeLabel(a)
    const link = linkFor(a)
    const tail = [
      where ? labels.location(where) : '',
      link ? `[↗](${link})` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    if (tail) lines.push('', tail)
    lines.push('')
  }
  void title
  return lines.join('\n').trimEnd() + '\n'
}
