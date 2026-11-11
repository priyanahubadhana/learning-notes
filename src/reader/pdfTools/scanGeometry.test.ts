import { describe, expect, it } from 'vitest'
import {
  detectCorners,
  enhance,
  homography,
  insetQuad,
  outputSize,
  quadArea,
  warp,
  type Pic,
  type Quad,
} from './scanGeometry'

/** A dark table with a bright sheet inside the given corners. */
function photo(w: number, h: number, q: Quad, paper = 225, table = 40): Pic {
  const data = new Uint8ClampedArray(w * h * 4)
  const inside = (px: number, py: number) => {
    let sign = 0
    for (let i = 0; i < 4; i++) {
      const a = q[i]!
      const b = q[(i + 1) % 4]!
      const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x)
      if (cross === 0) continue
      const s = cross > 0 ? 1 : -1
      if (sign === 0) sign = s
      else if (s !== sign) return false
    }
    return true
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = inside(x + 0.5, y + 0.5) ? paper : table
      const i = (y * w + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { data, width: w, height: h }
}

const near = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  tol: number,
) => Math.hypot(a.x - b.x, a.y - b.y) <= tol

describe('finding the sheet', () => {
  it('finds an upright sheet on a dark table', () => {
    const q: Quad = [
      { x: 40, y: 30 },
      { x: 260, y: 30 },
      { x: 260, y: 270 },
      { x: 40, y: 270 },
    ]
    const found = detectCorners(photo(300, 300, q))!
    expect(found).not.toBeNull()
    found.forEach((p, i) => expect(near(p, q[i]!, 8)).toBe(true))
  })

  it('finds a tilted sheet', () => {
    const q: Quad = [
      { x: 70, y: 20 },
      { x: 280, y: 60 },
      { x: 240, y: 280 },
      { x: 30, y: 230 },
    ]
    const found = detectCorners(photo(300, 300, q))!
    expect(found).not.toBeNull()
    found.forEach((p, i) => expect(near(p, q[i]!, 10)).toBe(true))
  })

  it('gives up on an empty picture so the person drags the corners', () => {
    const flat = photo(200, 200, insetQuad(200, 200, 0), 200, 200)
    expect(detectCorners(flat)).toBeNull()
    expect(
      detectCorners({ data: new Uint8ClampedArray(16), width: 2, height: 2 }),
    ).toBeNull()
  })

  it('starts from a frame a little inside the picture', () => {
    const q = insetQuad(100, 200, 0.1)
    expect(q[0]).toEqual({ x: 10, y: 20 })
    expect(q[2]).toEqual({ x: 90, y: 180 })
  })
})

describe('straightening', () => {
  it('measures the output page from the corners', () => {
    const q: Quad = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 300 },
      { x: 0, y: 300 },
    ]
    expect(outputSize(q)).toEqual({ w: 200, h: 300 })
    expect(outputSize(q, 150)).toEqual({ w: 100, h: 150 })
    expect(quadArea(q)).toBe(60000)
  })

  it('maps the rectangle corners onto the quad corners', () => {
    const q: Quad = [
      { x: 20, y: 10 },
      { x: 180, y: 30 },
      { x: 170, y: 190 },
      { x: 10, y: 150 },
    ]
    const H = homography(q, 100, 50)
    const map = (x: number, y: number) => {
      const d = H[6]! * x + H[7]! * y + 1
      return {
        x: (H[0]! * x + H[1]! * y + H[2]!) / d,
        y: (H[3]! * x + H[4]! * y + H[5]!) / d,
      }
    }
    expect(near(map(0, 0), q[0], 1e-6)).toBe(true)
    expect(near(map(100, 0), q[1], 1e-6)).toBe(true)
    expect(near(map(100, 50), q[2], 1e-6)).toBe(true)
    expect(near(map(0, 50), q[3], 1e-6)).toBe(true)
  })

  it('cuts the tilted sheet out as a flat, all-paper page', () => {
    const q: Quad = [
      { x: 70, y: 20 },
      { x: 280, y: 60 },
      { x: 240, y: 280 },
      { x: 30, y: 230 },
    ]
    const pic = photo(300, 300, q)
    const found = detectCorners(pic)!
    const { w, h } = outputSize(found)
    const flat = warp(pic, found, w, h)
    // the middle is paper, and almost every pixel is paper
    let paper = 0
    for (let i = 0; i < w * h; i++) if (flat.data[i * 4]! > 150) paper++
    expect(paper / (w * h)).toBeGreaterThan(0.93)
  })

  it('keeps a mark where it belongs', () => {
    // a dark dot at (25%, 25%) of an upright sheet stays at (25%, 25%)
    const q: Quad = [
      { x: 50, y: 50 },
      { x: 250, y: 50 },
      { x: 250, y: 250 },
      { x: 50, y: 250 },
    ]
    const pic = photo(300, 300, q)
    for (let y = 95; y < 105; y++) {
      for (let x = 95; x < 105; x++) {
        const i = (y * 300 + x) * 4
        pic.data[i] = pic.data[i + 1] = pic.data[i + 2] = 0
      }
    }
    const flat = warp(pic, q, 200, 200)
    expect(flat.data[(50 * 200 + 50) * 4]).toBeLessThan(40)
    expect(flat.data[(150 * 200 + 150) * 4]).toBeGreaterThan(200)
  })
})

describe('looks', () => {
  const mix = (): Pic => {
    const data = new Uint8ClampedArray(40 * 40 * 4)
    for (let i = 0; i < 1600; i++) {
      // grey paper with a dark line in the middle and a shadow gradient
      const x = i % 40
      const shade = 200 - x
      const v = Math.floor(i / 40) === 20 ? shade - 120 : shade
      data[i * 4] = v
      data[i * 4 + 1] = v
      data[i * 4 + 2] = v
      data[i * 4 + 3] = 255
    }
    return { data, width: 40, height: 40 }
  }

  it('leaves colour alone and makes grey with equal channels', () => {
    const src = mix()
    expect(enhance(src, 'colour')).toBe(src)
    const g = enhance(src, 'gray')
    expect(g.data[0]).toBe(g.data[1])
  })

  it('document look: paper white, ink dark, even with a shadow', () => {
    const d = enhance(mix(), 'document')
    const at = (x: number, y: number) => d.data[(y * 40 + x) * 4]!
    expect(at(5, 5)).toBeGreaterThan(230)
    expect(at(33, 5)).toBeGreaterThan(230)
    expect(at(5, 20)).toBeLessThan(60)
    expect(at(33, 20)).toBeLessThan(60)
  })
})
