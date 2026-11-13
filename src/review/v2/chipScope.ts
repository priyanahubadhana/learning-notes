import type { ReviewScope } from '../../recall/reviewService'

/** Chip keys: "all", "wrong" or "deck:<id>". */
export type ChipKey = string

export const chipKey = (s: ReviewScope): ChipKey =>
  s.kind === 'wrong' ? 'wrong' : s.kind === 'deck' ? `deck:${s.deckId}` : 'all'

export const chipScope = (k: ChipKey): ReviewScope =>
  k === 'wrong'
    ? { kind: 'wrong' }
    : k.startsWith('deck:')
      ? { kind: 'deck', deckId: k.slice(5) }
      : { kind: 'all' }
