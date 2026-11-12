/**
 * The fixed list of tours that can be downloaded (own site only, plain data,
 * checked by a SHA-256 of the file's canonical JSON). A tour is only a list
 * of Settings rows to show one by one; its words come from the rows
 * themselves, so a tour never carries text or code. Nothing is downloaded
 * until the person taps Download.
 */
export interface TourEntry {
  id: string
  /** Same-origin path of the file. */
  url: string
  /** Size shown before the download (bytes). */
  bytes: number
  sha256: string
}

export const TOUR_LIST: readonly TourEntry[] = [
  {
    id: 'srs',
    url: '/tours/srs.json',
    bytes: 192,
    sha256: '098ef9c9b710bcb80ae90cc5c0a320da91c6b761ce82acb6709fcf3fe948348f',
  },
  {
    id: 'pencil',
    url: '/tours/pencil.json',
    bytes: 216,
    sha256: 'ba7356c94fde4d4fa36671b44c419aa69f7f58989e84296ce4e8433df868c974',
  },
  {
    id: 'toolbar',
    url: '/tours/toolbar.json',
    bytes: 193,
    sha256: 'fffd31e07e6a4659598036d8845f64f58cb7c609f97c6610fe93798124a7640f',
  },
]

/** The built-in guide follows the experience: the rows it walks through. */
export const GUIDE_STEPS = {
  new: [
    'general.theme',
    'general.language',
    'general.showHelp',
    'general.defaultPaper',
    'review.newPerDay',
    'review.scheduler',
  ],
  little: [
    'general.theme',
    'general.language',
    'general.showHelp',
    'general.defaultPaper',
    'general.dateStyle',
    'general.pathStyle',
    'review.newPerDay',
    'review.scheduler',
    'review.maxPerDay',
    'advanced.barPlacement',
  ],
  expert: [
    'general.theme',
    'general.reduceGlass',
    'general.newPageStudy',
    'review.scheduler',
    'review.targetMemory',
    'advanced.holdMenu',
    'advanced.pencilLab',
  ],
} as const

export interface Tour {
  id: string
  steps: { setting: string }[]
}

const MAX_STEPS = 40

/** Plain data only: anything that is not a short list of row ids is refused. */
export function parseTour(text: string): Tour | null {
  try {
    const v: unknown = JSON.parse(text)
    if (typeof v !== 'object' || v === null) return null
    const { id, steps } = v as Record<string, unknown>
    if (typeof id !== 'string' || !Array.isArray(steps)) return null
    if (steps.length === 0 || steps.length > MAX_STEPS) return null
    const out: Tour['steps'] = []
    for (const s of steps) {
      const setting = (s as Record<string, unknown> | null)?.setting
      if (typeof setting !== 'string' || setting.length > 80) return null
      out.push({ setting })
    }
    return { id, steps: out }
  } catch {
    return null
  }
}
