import { describe, expect, it } from 'vitest'
import type { Card } from '../core/types'
import { newCard } from './cardService'
import {
  afterRating,
  currentCard,
  nextWaitingAt,
  putBack,
  releaseWaiting,
  skipCurrent,
  startSession,
} from './reviewSession'

const NOW = 1_000_000
const card = (id: string, due = NOW): Card => ({
  ...newCard({ id, pageId: 'p' }, 'nb', 'main', 0),
  id,
  due,
})
const ids = (cards: Card[]) => cards.map((c) => c.id)

describe('review session', () => {
  it('Again on a due card hides it until its time is up', () => {
    let s = startSession([card('a'), card('b')])
    s = afterRating(s, 'again', card('a', NOW + 600_000), true)
    expect(ids(s.queue)).toEqual(['b'])
    expect(nextWaitingAt(s)).toBe(NOW + 600_000)

    // Not yet: still hidden, even with nothing else left.
    s = afterRating(
      s,
      'good',
      { ...card('b', NOW + 86_400_000), intervalDays: 1 },
      true,
    )
    s = releaseWaiting(s, NOW + 599_000)
    expect(currentCard(s)).toBeNull()
    expect(s.waiting).toHaveLength(1)

    // Time is up: it comes back first.
    s = releaseWaiting(s, NOW + 600_000)
    expect(currentCard(s)?.id).toBe('a')
    expect(s.waiting).toEqual([])
    expect(s.done).toBe(2)
  })

  it('released cards go before the rest of the queue', () => {
    let s = startSession([card('a'), card('b'), card('c')])
    s = afterRating(s, 'again', card('a', NOW + 10), true)
    s = releaseWaiting(s, NOW + 10)
    expect(ids(s.queue)).toEqual(['a', 'b', 'c'])
  })

  it('practice: Again on a not-due card comes back a few cards later', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id, NOW + 1e9))
    let s = startSession(cards)
    s = afterRating(s, 'again', cards[0], false)
    expect(ids(s.queue)).toEqual(['b', 'c', 'd', 'a', 'e'])
    expect(s.waiting).toEqual([])
    // Last card left: it simply repeats.
    s = startSession([cards[0]])
    s = afterRating(s, 'again', cards[0], false)
    expect(ids(s.queue)).toEqual(['a'])
  })

  it('a card moved to a day gap leaves the session', () => {
    let s = startSession([card('a'), card('b')])
    s = afterRating(
      s,
      'hard',
      { ...card('a', NOW + 86_400_000), intervalDays: 1 },
      true,
    )
    expect(ids(s.queue)).toEqual(['b'])
    expect(s.waiting).toEqual([])
  })

  it('Good on a card still in short steps (FSRS new card) waits too', () => {
    let s = startSession([card('a'), card('b')])
    s = afterRating(s, 'good', card('a', NOW + 600_000), true)
    expect(ids(s.queue)).toEqual(['b'])
    expect(ids(s.waiting)).toEqual(['a'])
  })

  it('other ratings in practice take the card out', () => {
    let s = startSession([card('a'), card('b')])
    s = afterRating(s, 'good', card('a'), false)
    expect(ids(s.queue)).toEqual(['b'])
  })

  it('suspend skips the card; Undo puts it back in front', () => {
    let s = startSession([card('a'), card('b')])
    s = skipCurrent(s)
    expect(ids(s.queue)).toEqual(['b'])
    s = putBack(s, card('a'))
    expect(ids(s.queue)).toEqual(['a', 'b'])
    expect(s.done).toBe(0)
  })
})
