/**
 * Scan to PDF, the picture maths (Q8): find the sheet in a photo, straighten
 * it into a flat rectangle, and clean the colours. Plain arrays only (no
 * canvas), so it is tested without a browser. Free and on the device: nothing
 * is sent anywhere.
 */

export interface Pic {
  /** RGBA, 4 numbers per pixel. */
  data: Uint8ClampedArray | number[]
  width: number
  height: number
}

export interface Pt {
  x: number
  y: number
}

/** The four corners: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt]

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/** The whole picture, a little inside its edges (the starting guess). */
export function insetQuad(w: number, h: number, margin = 0.04): Quad {
  const mx = w * margin
  const my = h * margin
  return [
    { x: mx, y: my },
    { x: w - mx, y: my },
    { x: w - mx, y: h - my },
    { x: mx, y: h - my },
  ]
}

/** Shrinks a picture so its longer side is at most `max` (box average). */
export function shrink(img: Pic, max: number): Pic {
  const s = Math.min(1, max / Math.max(img.width, img.height))
  if (s >= 1) return img
  const w = Math.max(1, Math.round(img.width * s))
  const h = Math.max(1, Math.round(img.height * s))
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * img.height) / h)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * img.height) / h))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * img.width) / w)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * img.width) / w))
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4
          r += img.data[i]!
          g += img.data[i + 1]!
          b += img.data[i + 2]!
          n++
        }
      }
      const o = (y * w + x) * 4
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
      out[o + 3] = 255
    }
  }
  return { data: out, width: w, height: h }
}

function grayOf(img: Pic): Float32Array {
  const g = new Float32Array(img.width * img.height)
  for (let i = 0; i < g.length; i++) {
    g[i] =
      0.299 * img.data[i * 4]! +
      0.587 * img.data[i * 4 + 1]! +
      0.114 * img.data[i * 4 + 2]!
  }
  return g
}

/** 3 by 3 average, once. */
function blur(g: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(g.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          s += g[yy * w + xx]!
          n++
        }
      }
      out[y * w + x] = s / n
    }
  }
  return out
}

/** The brightness that best splits dark from light (Otsu). */
export function otsu(g: Float32Array): number {
  const hist = new Array<number>(256).fill(0)
  for (const v of g) hist[Math.min(255, Math.max(0, Math.round(v)))]!++
  const total = g.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]!
  let sumB = 0
  let wB = 0
  let best = 0
  let level = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]!
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) {
      best = between
      level = t
    }
  }
  return level
}

/**
 * Finds the sheet: the biggest bright area, its four extreme corners. Returns
 * null when no clear sheet is there (the person then drags the corners).
 */
export function detectCorners(img: Pic): Quad | null {
  const small = shrink(img, 220)
  const { width: w, height: h } = small
  if (w < 8 || h < 8) return null
  const g = blur(grayOf(small), w, h)
  const level = otsu(g)
  const bright = new Uint8Array(w * h)
  let count = 0
  for (let i = 0; i < g.length; i++) {
    if (g[i]! > level) {
      bright[i] = 1
      count++
    }
  }
  // A picture that is all light or all dark has no sheet edge to find.
  if (count < w * h * 0.12 || count > w * h * 0.97) return null
  // Biggest connected bright area (4 neighbours).
  const label = new Int32Array(w * h)
  let bestLabel = 0
  let bestSize = 0
  let next = 0
  const stack: number[] = []
  for (let s = 0; s < bright.length; s++) {
    if (!bright[s] || label[s]) continue
    next++
    let size = 0
    stack.push(s)
    label[s] = next
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % w
      const y = (p - x) / w
      if (x > 0 && bright[p - 1] && !label[p - 1]) {
        label[p - 1] = next
        stack.push(p - 1)
      }
      if (x < w - 1 && bright[p + 1] && !label[p + 1]) {
        label[p + 1] = next
        stack.push(p + 1)
      }
      if (y > 0 && bright[p - w] && !label[p - w]) {
        label[p - w] = next
        stack.push(p - w)
      }
      if (y < h - 1 && bright[p + w] && !label[p + w]) {
        label[p + w] = next
        stack.push(p + w)
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestLabel = next
    }
  }
  if (bestSize < w * h * 0.15) return null
  // The extreme points of the area.
  let tl = { v: Infinity, x: 0, y: 0 }
  let br = { v: -Infinity, x: 0, y: 0 }
  let tr = { v: -Infinity, x: 0, y: 0 }
  let bl = { v: Infinity, x: 0, y: 0 }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (label[y * w + x] !== bestLabel) continue
      const s = x + y
      const d = x - y
      if (s < tl.v) tl = { v: s, x, y }
      if (s > br.v) br = { v: s, x, y }
      if (d > tr.v) tr = { v: d, x, y }
      if (d < bl.v) bl = { v: d, x, y }
    }
  }
  const k = img.width / w
  const quad: Quad = [tl, tr, br, bl].map((p) => ({
    x: Math.min(img.width, (p.x + 0.5) * k),
    y: Math.min(img.height, (p.y + 0.5) * (img.height / h)),
  })) as Quad
  // A sliver or a twisted shape is not a sheet.
  const area = quadArea(quad)
  if (area < img.width * img.height * 0.12) return null
  if (area < bestSize * k * (img.height / h) * 0.6) return null
  return quad
}

/** Area of a four-sided shape (shoelace). */
export function quadArea(q: Quad): number {
  let s = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]!
    const b = q[(i + 1) % 4]!
    s += a.x * b.y - b.x * a.y
  }
  return Math.abs(s) / 2
}

/** Sides the straightened page should have: the mean of opposite sides. */
export function outputSize(q: Quad, max = 2200): { w: number; h: number } {
  const w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2
  const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2
  const s = Math.min(1, max / Math.max(w, h, 1))
  return {
    w: Math.max(1, Math.round(w * s)),
    h: Math.max(1, Math.round(h * s)),
  }
}

/** Solves A x = b for a small square system (Gauss, partial pivoting). */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r
    }
    ;[a[c], a[p]] = [a[p]!, a[c]!]
    ;[b[c], b[p]] = [b[p]!, b[c]!]
    const d = a[c]![c]!
    if (Math.abs(d) < 1e-12) return new Array<number>(n).fill(0)
    for (let r = c + 1; r < n; r++) {
      const f = a[r]![c]! / d
      for (let k = c; k < n; k++) a[r]![k]! -= f * a[c]![k]!
      b[r]! -= f * b[c]!
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]!
    for (let k = r + 1; k < n; k++) s -= a[r]![k]! * x[k]!
    x[r] = s / a[r]![r]!
  }
  return x
}

/** The map from the flat rectangle (0..w, 0..h) onto the four corners. */
export function homography(q: Quad, w: number, h: number): number[] {
  const dst: Pt[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i]!
    const { x: u, y: v } = q[i]!
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  return [...solve(a, b), 1]
}

/** The straightened page: the sheet inside `q`, drawn flat at `w` by `h`. */
export function warp(img: Pic, q: Quad, w: number, h: number): Pic {
  const H = homography(q, w, h)
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const den = H[6]! * px + H[7]! * py + 1
      const u = (H[0]! * px + H[1]! * py + H[2]!) / den - 0.5
      const v = (H[3]! * px + H[4]! * py + H[5]!) / den - 0.5
      const x0 = Math.floor(u)
      const y0 = Math.floor(v)
      const fx = u - x0
      const fy = v - y0
      const o = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const at = (xx: number, yy: number) =>
          img.data[
            (Math.min(img.height - 1, Math.max(0, yy)) * img.width +
              Math.min(img.width - 1, Math.max(0, xx))) *
              4 +
              c
          ]!
        const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
        const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
        out[o + c] = top * (1 - fy) + bottom * fy
      }
      out[o + 3] = 255
    }
  }
  return { data: out, width: w, height: h }
}

export type Look = 'colour' | 'gray' | 'document'

/**
 * Colour as taken, grey, or "document": text turned dark and the paper white
 * (each pixel against the average of its surroundings), good for printed pages.
 */
export function enhance(img: Pic, look: Look): Pic {
  if (look === 'colour') return img
  const { width: w, height: h } = img
  const g = grayOf(img)
  const out = new Uint8ClampedArray(w * h * 4)
  if (look === 'gray') {
    for (let i = 0; i < g.length; i++) {
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = g[i]!
      out[i * 4 + 3] = 255
    }
    return { data: out, width: w, height: h }
  }
  // Average of a window around each pixel, from an integral image.
  const I = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += g[y * w + x]!
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1]! + row
    }
  }
  const r = Math.max(4, Math.round(Math.min(w, h) / 16))
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w, x + r + 1)
      const sum =
        I[y1 * (w + 1) + x1]! -
        I[y0 * (w + 1) + x1]! -
        I[y1 * (w + 1) + x0]! +
        I[y0 * (w + 1) + x0]!
      const mean = sum / ((x1 - x0) * (y1 - y0))
      const v = g[y * w + x]!
      // Paper (about the local average) goes white; clearly darker goes dark.
      const t = (v - mean * 0.78) / (mean * 0.22 + 1)
      const o = Math.max(0, Math.min(1, t)) * 255
      const i = (y * w + x) * 4
      out[i] = out[i + 1] = out[i + 2] = o
      out[i + 3] = 255
    }
  }
  return { data: out, width: w, height: h }
}
