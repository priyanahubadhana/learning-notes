/** What is left of today's limits (the "Limits today" line on Review home). */
export interface LimitSettings {
  newLimit: number
  /** null = no limit on reviews. */
  reviewLimit: number | null
}

export interface DoneToday {
  newDone: number
  reviewsDone: number
}

export function limitsLeft(
  s: LimitSettings,
  done: DoneToday,
): { newLeft: number; reviewsLeft: number | null } {
  return {
    newLeft: Math.max(0, s.newLimit - done.newDone),
    reviewsLeft:
      s.reviewLimit === null
        ? null
        : Math.max(0, s.reviewLimit - done.reviewsDone),
  }
}
