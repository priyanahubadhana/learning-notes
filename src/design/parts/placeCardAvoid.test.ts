import { describe, expect, it } from 'vitest'
import { placeCard } from './useAnchoredCard'

const VP = { width: 820, height: 1180 }
const SIZE = { width: 304, height: 480 }
const ANCHOR = { left: 702, top: 176, width: 44, height: 44 }
// The selected picture, right under the chip's column (iPad portrait).
const PICTURE = { left: 420, top: 630, width: 310, height: 150 }

const overlaps = (
  p: { left: number; top: number },
  r: { left: number; top: number; width: number; height: number },
) =>
  p.left < r.left + r.width &&
  p.left + SIZE.width > r.left &&
  p.top < r.top + r.height &&
  p.top + SIZE.height > r.top

describe('placeCard keeps clear of a picture', () => {
  it('without a picture it hangs below the chip, as before', () => {
    const p = placeCard(ANCHOR, SIZE, VP)
    expect(p.side).toBe('below')
    expect(overlaps(p, PICTURE)).toBe(true)
  })
  it('with the picture it moves beside it and never covers it', () => {
    const p = placeCard(ANCHOR, SIZE, VP, PICTURE)
    expect(p.side).not.toBe('below')
    expect(overlaps(p, PICTURE)).toBe(false)
    expect(p.left).toBeGreaterThanOrEqual(12)
    expect(p.left + SIZE.width).toBeLessThanOrEqual(VP.width - 12)
  })
  it('a picture far from the card changes nothing', () => {
    const far = { left: 20, top: 900, width: 200, height: 100 }
    expect(placeCard(ANCHOR, SIZE, VP, far)).toEqual(
      placeCard(ANCHOR, SIZE, VP),
    )
  })
})
