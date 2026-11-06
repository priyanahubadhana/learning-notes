/**
 * Picture editing maths (G0): rotate by any angle, crop with a rectangle,
 * fixed ratios, and the pixel box to copy. Pure functions, no DOM, so they
 * are unit-tested; `renderEdit` (browser only) does the canvas drawing.
 */

/** A crop rectangle as fractions (0 to 1) of the rotated picture. */
export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

/** What the sheet changes: a turn in degrees and a crop of the turned picture. */
export interface Edit {
  /** Clockwise degrees, any number (90-steps plus a small straighten). */
  angle: number
  crop: Crop
}

/** The longest side of an edited picture (pixels). */
export const MAX_EDIT_SIDE = 4096
/** The smallest crop side, as a fraction of the picture. */
export const MIN_CROP = 0.04

export const FULL_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 }
export const NO_EDIT: Edit = { angle: 0, crop: FULL_CROP }

/** Is this edit a no-op? */
export const isUnchanged = (e: Edit): boolean =>
  Math.abs(e.angle % 360) < 0.01 &&
  e.crop.x === 0 &&
  e.crop.y === 0 &&
  e.crop.w === 1 &&
  e.crop.h === 1

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

/** Size of the box that holds a w×h picture turned by `angle` degrees. */
export function rotatedSize(
  w: number,
  h: number,
  angle: number,
): { w: number; h: number } {
  const r = (angle * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  // Whole quarter turns are exact (no rounding noise).
  if (s < 1e-9) return { w, h }
  if (c < 1e-9) return { w: h, h: w }
  return { w: w * c + h * s, h: w * s + h * c }
}

/** Keeps a crop inside the picture and at least `MIN_CROP` on each side. */
export function clampCrop(c: Crop): Crop {
  const w = clamp(c.w, MIN_CROP, 1)
  const h = clamp(c.h, MIN_CROP, 1)
  return {
    x: clamp(c.x, 0, 1 - w),
    y: clamp(c.y, 0, 1 - h),
    w,
    h,
  }
}

/** The four corners, named by where they sit. */
export type Corner = 'nw' | 'ne' | 'sw' | 'se'

/**
 * Moves one corner by (dx, dy) fractions; the opposite corner stays still.
 * With `ratio` (width ÷ height in pixels) the box keeps that shape, growing
 * from the fixed corner. `box` is the rotated picture's pixel size.
 */
export function dragCorner(
  crop: Crop,
  corner: Corner,
  dx: number,
  dy: number,
  box: { w: number; h: number },
  ratio: number | null,
): Crop {
  const left = corner === 'nw' || corner === 'sw'
  const top = corner === 'nw' || corner === 'ne'
  // The fixed corner.
  const fx = left ? crop.x + crop.w : crop.x
  const fy = top ? crop.y + crop.h : crop.y
  // The moving corner, kept inside the picture.
  let mx = clamp((left ? crop.x : crop.x + crop.w) + dx, 0, 1)
  let my = clamp((top ? crop.y : crop.y + crop.h) + dy, 0, 1)
  if (ratio) {
    // Width and height in pixels must satisfy w/h = ratio.
    let w = Math.abs(mx - fx) * box.w
    let h = Math.abs(my - fy) * box.h
    if (w / Math.max(h, 1e-6) > ratio) w = h * ratio
    else h = w / ratio
    // Largest box of that shape that still fits on this side.
    const maxW = (left ? fx : 1 - fx) * box.w
    const maxH = (top ? fy : 1 - fy) * box.h
    const k = Math.min(1, maxW / Math.max(w, 1e-6), maxH / Math.max(h, 1e-6))
    w *= k
    h *= k
    mx = left ? fx - w / box.w : fx + w / box.w
    my = top ? fy - h / box.h : fy + h / box.h
  }
  const next = {
    x: Math.min(fx, mx),
    y: Math.min(fy, my),
    w: Math.abs(mx - fx),
    h: Math.abs(my - fy),
  }
  // Too small: stay as before.
  if (next.w < MIN_CROP || next.h < MIN_CROP) return crop
  return next
}

/** Moves the whole crop by (dx, dy) fractions, staying inside the picture. */
export function moveCrop(crop: Crop, dx: number, dy: number): Crop {
  return {
    ...crop,
    x: clamp(crop.x + dx, 0, 1 - crop.w),
    y: clamp(crop.y + dy, 0, 1 - crop.h),
  }
}

/** The biggest centred crop of a shape (ratio = width ÷ height in pixels). */
export function cropForRatio(
  ratio: number,
  box: { w: number; h: number },
): Crop {
  let w = box.w
  let h = w / ratio
  if (h > box.h) {
    h = box.h
    w = h * ratio
  }
  const fw = w / box.w
  const fh = h / box.h
  return { x: (1 - fw) / 2, y: (1 - fh) / 2, w: fw, h: fh }
}

/** Where to copy from and how big the result is (pixels). */
export interface PixelPlan {
  /** The turned picture's size, scaled down if it would pass the limit. */
  turned: { w: number; h: number }
  /** Source box inside the turned picture. */
  sx: number
  sy: number
  sw: number
  sh: number
  /** Size of the result. */
  outW: number
  outH: number
  /** Scale from the original picture's pixels (at most 1). */
  scale: number
}

/**
 * The pixel plan for an edit of a `w`×`h` picture. The result's longest side
 * never passes `maxSide`; a picture is never made bigger than it was.
 */
export function planEdit(
  w: number,
  h: number,
  edit: Edit,
  maxSide = MAX_EDIT_SIDE,
): PixelPlan {
  const box = rotatedSize(w, h, edit.angle)
  const c = clampCrop(edit.crop)
  const cw = box.w * c.w
  const ch = box.h * c.h
  const scale = Math.min(1, maxSide / Math.max(cw, ch))
  const turned = { w: box.w * scale, h: box.h * scale }
  const sw = turned.w * c.w
  const sh = turned.h * c.h
  return {
    turned,
    sx: turned.w * c.x,
    sy: turned.h * c.y,
    sw,
    sh,
    outW: Math.max(1, Math.round(sw)),
    outH: Math.max(1, Math.round(sh)),
    scale,
  }
}

/**
 * Draws an edit (browser only): the picture turned about its centre onto a
 * canvas the size of the turned picture, then the crop copied out. Corners
 * revealed by a free turn are transparent.
 */
export async function renderEdit(
  source: ImageBitmap,
  edit: Edit,
): Promise<{ blob: Blob; width: number; height: number }> {
  const plan = planEdit(source.width, source.height, edit)
  const turned = document.createElement('canvas')
  turned.width = Math.max(1, Math.round(plan.turned.w))
  turned.height = Math.max(1, Math.round(plan.turned.h))
  const g = turned.getContext('2d')
  if (!g) throw new Error('canvas')
  g.translate(turned.width / 2, turned.height / 2)
  g.rotate((edit.angle * Math.PI) / 180)
  g.scale(plan.scale, plan.scale)
  g.drawImage(source, -source.width / 2, -source.height / 2)
  const out = document.createElement('canvas')
  out.width = plan.outW
  out.height = plan.outH
  out
    .getContext('2d')
    ?.drawImage(
      turned,
      plan.sx,
      plan.sy,
      plan.sw,
      plan.sh,
      0,
      0,
      plan.outW,
      plan.outH,
    )
  // WebP keeps see-through corners; a browser without WebP gives PNG.
  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, 'image/webp', 0.9),
  )
  if (!blob) throw new Error('canvas')
  return { blob, width: plan.outW, height: plan.outH }
}
