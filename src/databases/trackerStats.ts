import type { Card } from '../core/types'
import { t, type MessageKey } from '../i18n/t'
import type { ChoiceOption } from './columnTypes'
import { localDay } from './formula/formulaValue'

/**
 * Study tracker numbers: for each lesson (a top-level page, with its
 * sub-pages), what its cards say about how well it is learnt. Worked out
 * from the cards only (each card keeps its newest answer), so it stays
 * fast with tens of thousands of cards. Pure (loading is in trackerLoad.ts).
 */

/** How well one card is known, from its review gap (owner, 2026-10-27). */
export type CardLevel = 'new' | 'learning' | 'familiar' | 'mastered'
export const CARD_LEVELS: readonly CardLevel[] = [
  'new',
  'learning',
  'familiar',
  'mastered',
]
/** A gap under this many days = Learning; from here up to MASTERED_DAYS = Familiar. */
const FAMILIAR_DAYS = 1
/** A gap of this many days or more = Mastered. */
const MASTERED_DAYS = 21

/** A lesson's status. Order = Board column order. */
export type LessonStatus = 'notStarted' | 'learning' | 'review' | 'mastered'
export const LESSON_STATUSES: readonly LessonStatus[] = [
  'notStarted',
  'learning',
  'review',
  'mastered',
]

/** Under this share correct a lesson is still Learning. */
const LEARNING_BELOW = 0.75
/** Mastered needs at least this share correct … */
const MASTERED_CORRECT = 0.9
/** … and at least this share of its cards at card level Mastered. */
const MASTERED_CARDS = 0.8

export interface LessonStats {
  /** Cards that count (active, with a question). */
  cards: number
  /** Learnt cards (not new) whose due time has come. */
  due: number
  /** Cards never reviewed. */
  fresh: number
  /** Cards answered at least once (a review or Practice anyway). */
  answered: number
  /** Of those, cards whose newest answer was not Again. */
  correct: number
  /** Newest answer on any card (UTC ms), null = none. */
  lastRevisedAt: number | null
  levels: Record<CardLevel, number>
}

export const noStats = (): LessonStats => ({
  cards: 0,
  due: 0,
  fresh: 0,
  answered: 0,
  correct: 0,
  lastRevisedAt: null,
  levels: { new: 0, learning: 0, familiar: 0, mastered: 0 },
})

export function cardLevel(
  card: Pick<Card, 'reps' | 'intervalDays'>,
): CardLevel {
  if (card.reps === 0) return 'new'
  if (card.intervalDays < FAMILIAR_DAYS) return 'learning'
  return card.intervalDays < MASTERED_DAYS ? 'familiar' : 'mastered'
}

/** Adds one card to a lesson's numbers. */
export function addCard(stats: LessonStats, card: Card, now: number): void {
  const level = cardLevel(card)
  stats.cards++
  stats.levels[level]++
  if (level === 'new') stats.fresh++
  else if (card.due <= now) stats.due++
  if (card.lastReviewAt !== undefined) {
    stats.answered++
    if (card.lastRating !== 'again') stats.correct++
    if (
      stats.lastRevisedAt === null ||
      card.lastReviewAt > stats.lastRevisedAt
    ) {
      stats.lastRevisedAt = card.lastReviewAt
    }
  }
}

/** Share of answered cards whose newest answer was not Again (null = none answered). */
export const correctShare = (s: LessonStats): number | null =>
  s.answered === 0 ? null : s.correct / s.answered

/**
 * The status the app works out: Not started (nothing answered) · Learning
 * (under 75 % correct) · Mastered (90 %+ correct, nothing due, no new
 * cards and 80 %+ of the cards at level Mastered) · Review (in between).
 */
export function autoStatus(s: LessonStats): LessonStatus {
  const share = correctShare(s)
  if (share === null) return 'notStarted'
  if (share < LEARNING_BELOW) return 'learning'
  const solid = s.levels.mastered >= MASTERED_CARDS * s.cards
  return share >= MASTERED_CORRECT && s.due === 0 && s.fresh === 0 && solid
    ? 'mastered'
    : 'review'
}

// ------------------------------------------------------------------ names

export const statusName = (status: LessonStatus): string =>
  t(`tracker.status.${status}` as MessageKey)

const STATUS_COLORS: Record<LessonStatus, string | undefined> = {
  notStarted: undefined,
  learning: '#d9822b',
  review: '#2f6feb',
  mastered: '#2e9e6b',
}

/** The Status column's options (a fixed list: ids are the status keys). */
export function statusOptions(): ChoiceOption[] {
  return LESSON_STATUSES.map((id) => {
    const color = STATUS_COLORS[id]
    return { id, name: statusName(id), ...(color && { color }) }
  })
}

export const isLessonStatus = (v: unknown): v is LessonStatus =>
  LESSON_STATUSES.includes(v as LessonStatus)

export const levelName = (level: CardLevel): string =>
  t(`tracker.level.${level}` as MessageKey)

/** One-line meaning of a card level, for tooltips and help. */
export const levelMeaning = (level: CardLevel): string =>
  t(`tracker.level.${level}.meaning` as MessageKey)

// ------------------------------------------------------------------ rows

/** What a Study tracker row shows, with where each part comes from. */
export interface TrackerRow {
  stats: LessonStats
  auto: LessonStatus
  /** Status the user set (📌), null = automatic. */
  override: LessonStatus | null
  /** The status shown: the override, else the automatic one. */
  status: LessonStatus
}

export function trackerRow(stats: LessonStats, stored: unknown): TrackerRow {
  const auto = autoStatus(stats)
  const override = isLessonStatus(stored) ? stored : null
  return { stats, auto, override, status: override ?? auto }
}

/** "5 due · 20 new", "3 due", "20 new", "All done" (no cards: ""). */
export function cardsDueText(s: LessonStats): string {
  if (s.cards === 0) return ''
  if (s.due === 0 && s.fresh === 0) return t('tracker.cardsDue.none')
  const parts: string[] = []
  if (s.due > 0) parts.push(t('tracker.cardsDue.due', { n: String(s.due) }))
  if (s.fresh > 0) parts.push(t('tracker.cardsDue.new', { n: String(s.fresh) }))
  return parts.join(' · ')
}

/** "3 New · 2 Learning · 4 Familiar · 1 Mastered" (levels with no cards left out). */
export function levelsText(s: LessonStats): string {
  return CARD_LEVELS.filter((l) => s.levels[l] > 0)
    .map((l) => `${s.levels[l]} ${levelName(l)}`)
    .join(' · ')
}

/** Last revised as the day it happened (the user's own day). */
export const lastRevisedDay = (s: LessonStats): string | null =>
  s.lastRevisedAt === null ? null : localDay(s.lastRevisedAt)
