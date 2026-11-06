/**
 * Ranking of the device's voices (B4): the best first. "Premium" and
 * "Enhanced" are the better voices an iPad can download (Settings ›
 * Accessibility › Spoken Content › Voices); then voices that run on the
 * device itself; then the rest. Equal ranks are listed by name.
 */

export interface VoiceLike {
  name: string
  localService?: boolean
}

export function voiceRank(voice: VoiceLike): number {
  const name = voice.name.toLowerCase()
  if (name.includes('premium')) return 3
  if (name.includes('enhanced')) return 2
  return voice.localService ? 1 : 0
}

export function rankVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  return [...voices].sort(
    (a, b) => voiceRank(b) - voiceRank(a) || a.name.localeCompare(b.name),
  )
}
