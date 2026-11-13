import { describe, expect, it } from 'vitest'
import { limitsLeft } from './limits'

describe('Limits today line (RV-B08)', () => {
  it('new left = limit minus done, never below 0; no review limit = null', () => {
    expect(
      limitsLeft(
        { newLimit: 20, reviewLimit: null },
        { newDone: 3, reviewsDone: 0 },
      ),
    ).toEqual({ newLeft: 17, reviewsLeft: null })
    expect(
      limitsLeft(
        { newLimit: 2, reviewLimit: 5 },
        { newDone: 3, reviewsDone: 9 },
      ),
    ).toEqual({ newLeft: 0, reviewsLeft: 0 })
  })
})
