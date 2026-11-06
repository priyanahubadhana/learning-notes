import type { LearningNotesDB } from '../core/db'
import { orderBetween } from '../core/order'
import { descendantIds, newRecordFields } from '../core/records'
import type { Card, Deck, DeckState, Tag } from '../core/types'
import { listPages } from '../pages/pageService'

/**
 * Decks (E1): live filters over cards. A deck stores where its cards live
 * (notebooks and pages), which tags they carry and which states count; the
 * cards are found again each time, so a deck refills by itself. This file
 * only finds cards and counts them; `reviewService.getReviewQueue` applies
 * the daily limits, pauses and everything else on top, for every scope alike.
 */

export type DeckDraft = Pick<Deck, 'name'> &
  Partial<Omit<Deck, 'id' | 'name' | 'order'>>

/** Decks in their order (not deleted). */
export async function listDecks(db: LearningNotesDB): Promise<Deck[]> {
  const all = await db.decks.toArray()
  return all
    .filter((d) => d.deletedAt === null)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
}

export async function getDeck(
  db: LearningNotesDB,
  id: string,
): Promise<Deck | undefined> {
  const deck = await db.decks.get(id)
  return deck && deck.deletedAt === null ? deck : undefined
}

/** Makes a deck at the end of the list. */
export async function createDeck(
  db: LearningNotesDB,
  draft: DeckDraft,
): Promise<Deck> {
  return db.transaction('rw', db.decks, async () => {
    const last = (await listDecks(db)).at(-1)
    const deck: Deck = {
      ...newRecordFields(),
      scope: { notebookIds: [], pageIds: [], withSubpages: true },
      tagIds: [],
      tagMode: 'any',
      states: ['all'],
      ...draft,
      name: draft.name.trim().slice(0, 100) || 'Deck',
      order: orderBetween(last?.order ?? null, null),
    }
    await db.decks.add(deck)
    return deck
  })
}

/** Changes a deck's name, colour, scope, tags or states. */
export async function updateDeck(
  db: LearningNotesDB,
  id: string,
  changes: Partial<Omit<Deck, 'id' | 'order' | 'createdAt'>>,
): Promise<void> {
  const next = { ...changes, updatedAt: Date.now() }
  if (typeof next.name === 'string') {
    next.name = next.name.trim().slice(0, 100) || 'Deck'
  }
  await db.decks.update(id, next)
}

/** Removes a deck (soft delete). The cards and notes are not touched. */
export async function deleteDeck(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.decks.update(id, { deletedAt: now, updatedAt: now })
}

/** A card's state for a deck's counts (new cards first, then by interval). */
export function cardState(card: Card): Exclude<DeckState, 'all'> {
  if (card.reps === 0) return 'new'
  return card.intervalDays === 0 ? 'learning' : 'due'
}

/**
 * The cards a deck covers, before pauses and daily limits: by place, then
 * tags, then states. `now` decides which cards count as due.
 */
export async function deckCards(
  db: LearningNotesDB,
  deck: Deck,
  now: number,
): Promise<Card[]> {
  const cards = await cardsInPlace(db, deck)
  const byTag = await filterByTags(db, cards, deck)
  const wanted = new Set(deck.states.length ? deck.states : ['all'])
  if (wanted.has('all')) return byTag
  return byTag.filter((c) => {
    const state = cardState(c)
    return wanted.has(state) && c.due <= now
  })
}

/** Where the deck looks: whole notebooks, pages (with sub-pages), or all. */
async function cardsInPlace(db: LearningNotesDB, deck: Deck): Promise<Card[]> {
  const { notebookIds, pageIds, withSubpages, notebookKinds } = deck.scope
  const notebooks = new Set(notebookIds)
  if (notebookKinds?.length) {
    const kinds = new Set(notebookKinds)
    const all = await db.notebooks.toArray()
    for (const n of all) {
      if (n.deletedAt === null && n.kind && kinds.has(n.kind)) {
        notebooks.add(n.id)
      }
    }
  }
  if (notebooks.size === 0 && pageIds.length === 0) {
    return db.cards.toArray()
  }
  const found = new Map<string, Card>()
  if (notebooks.size > 0) {
    for (const c of await db.cards
      .where('notebookId')
      .anyOf([...notebooks])
      .toArray()) {
      found.set(c.id, c)
    }
  }
  if (pageIds.length > 0) {
    const ids = new Set(pageIds)
    if (withSubpages) {
      const pagesByNotebook = new Map<
        string,
        Awaited<ReturnType<typeof listPages>>
      >()
      for (const pageId of pageIds) {
        const page = await db.pages.get(pageId)
        if (!page) continue
        let list = pagesByNotebook.get(page.notebookId)
        if (!list) {
          list = await listPages(db, page.notebookId)
          pagesByNotebook.set(page.notebookId, list)
        }
        for (const id of descendantIds(list, pageId)) ids.add(id)
      }
    }
    for (const c of await db.cards
      .where('pageId')
      .anyOf([...ids])
      .toArray()) {
      found.set(c.id, c)
    }
  }
  return [...found.values()]
}

/** A tag and all its sub-tags, any depth. */
function withSubTags(tags: readonly Tag[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const tag of tags) {
      if (tag.parentId && out.has(tag.parentId) && !out.has(tag.id)) {
        out.add(tag.id)
        grew = true
      }
    }
  }
  return out
}

/** Keeps cards whose block has the tags (any or all; sub-tags count). */
async function filterByTags(
  db: LearningNotesDB,
  cards: Card[],
  deck: Deck,
): Promise<Card[]> {
  if (deck.tagIds.length === 0 || cards.length === 0) return cards
  const tags = await db.tags.toArray()
  const groups = deck.tagIds.map((id) => withSubTags(tags, id))
  const rows = await db.blockTags
    .where('blockId')
    .anyOf([...new Set(cards.map((c) => c.blockId))])
    .toArray()
  const tagsOf = new Map<string, Set<string>>()
  for (const r of rows) {
    const set = tagsOf.get(r.blockId) ?? new Set<string>()
    set.add(r.tagId)
    tagsOf.set(r.blockId, set)
  }
  // The page's own tags count for every card on it (inherited).
  const pageIds = [...new Set(cards.map((c) => c.pageId))]
  const pages = await db.pages.bulkGet(pageIds)
  const pageTags = new Map(pageIds.map((id, i) => [id, pages[i]?.tagIds ?? []]))
  const has = (card: Card, group: Set<string>) =>
    [
      ...(tagsOf.get(card.blockId) ?? []),
      ...(pageTags.get(card.pageId) ?? []),
    ].some((id) => group.has(id))
  return cards.filter((c) =>
    deck.tagMode === 'all'
      ? groups.every((g) => has(c, g))
      : groups.some((g) => has(c, g)),
  )
}
