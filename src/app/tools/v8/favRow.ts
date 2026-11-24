import { useEffect } from 'react'
import { t, type MessageKey } from '../../../i18n/t'
import { currentRunner } from '../toolRuntime'
import { memStore } from '../store'
import { applyFav, favKind, favs2, migrateOnce, type Fav2 } from './favs2'

const k = (key: string) => key as MessageKey

/** The favourites of the whole bar, with today's pen favourites brought over once. */
export function useFavs(): Fav2[] {
  useEffect(() => migrateOnce(), [])
  return favs2.useValue()
}

/** The favourite that was just saved: its chip glows once (TB-52, TB-70). */
export const justAdded = memStore<string | null>(null)

/** What a chip says: the person's own name, else the type or the tool. */
export function favName(f: Fav2): string {
  if (f.name) return f.name
  const kind = favKind(f)
  if (f.tool === 'pen')
    return t(k(`v8.pen.type.${kind === 'pen' ? 'fountain' : kind}`))
  if (f.tool === 'eraser')
    return t(k(`ink.eraser.${kind === 'eraser' ? 'standard' : kind}`))
  if (f.tool === 'lasso' && kind !== 'lasso')
    return t(k(`v8.favs.kind.${kind}`))
  return t(k(`v8.tool.${f.tool}`))
}

/** What a screen reader hears: the name, then the tool when it is not obvious. */
export const favLabel = (f: Fav2): string =>
  f.tool === 'pen' && f.size !== undefined
    ? `${favName(f)}, ${t(k(`v8.pen.size.${f.size}`))}`
    : favName(f)

/** Applies a favourite in one step and says so, with an Undo (TB-51). */
export function chooseFav(f: Fav2): void {
  const undo = applyFav(f)
  currentRunner().app?.toast(t('v8.fav.applied', { name: favName(f) }), {
    label: t('v8.bar.undo'),
    icon: 'undo',
    onSelect: undo,
  })
}

/**
 * The favourite that moved between two orders. A swap of neighbours is the
 * same for either of them, so `prefer` (the one whose button was pressed)
 * wins when it is one of the two.
 */
export function movedId(
  before: readonly { id: string }[],
  after: readonly { id: string }[],
  prefer?: string,
): string | undefined {
  if (before.length !== after.length) return undefined
  const ids = (l: readonly { id: string }[], skip: string) =>
    l
      .filter((x) => x.id !== skip)
      .map((x) => x.id)
      .join('|')
  const found = after.filter(
    (x, i) => before[i].id !== x.id && ids(before, x.id) === ids(after, x.id),
  )
  return found.find((x) => x.id === prefer)?.id ?? found[0]?.id
}
