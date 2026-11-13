import type { MessageKey } from '../../i18n/t'

/**
 * The 8 Review card types (docs/features/review-v2.md). Beginner sees the
 * first two; the rest need `study.cardTypes`. Only Question / answer and
 * Blanks can be made today; the others are listed and wait for the Review
 * editor, so no stored shape changes here.
 */
export type CardTypeId =
  'qa' | 'cloze' | 'picture' | 'vocab' | 'tf' | 'reverse' | 'occl' | 'draw'

export const CARD_TYPES: { id: CardTypeId; label: MessageKey }[] = [
  { id: 'qa', label: 'st5.type.qa' },
  { id: 'cloze', label: 'st5.type.cloze' },
  { id: 'picture', label: 'st5.type.picture' },
  { id: 'vocab', label: 'st5.type.vocab' },
  { id: 'tf', label: 'st5.type.tf' },
  { id: 'reverse', label: 'st5.type.reverse' },
  { id: 'occl', label: 'st5.type.occl' },
  { id: 'draw', label: 'st5.type.draw' },
]

/** Types a person can pick: two for Beginner, all eight when unlocked. */
export const offeredTypes = (all: boolean) =>
  all ? CARD_TYPES : CARD_TYPES.slice(0, 2)

/** The types that can be made today. */
export const isMakeable = (id: CardTypeId) => id === 'qa' || id === 'cloze'
