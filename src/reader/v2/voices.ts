import { prefStore } from '../../app/tools/store'
import { voiceRank, type VoiceLike } from '../../app/reading/voices'

/**
 * Listen voices (slice 7b, RD-B44). Only the browser's own speechSynthesis,
 * and only voices that run on the device: a voice that is not `localService`
 * would send the text over the network, so it is never listed or used.
 */
export interface ListenVoice extends VoiceLike {
  voiceURI: string
  lang: string
}

export type VoiceGroupId = 'premium' | 'enhanced' | 'device' | 'other'
export const VOICE_GROUPS: readonly VoiceGroupId[] = [
  'premium',
  'enhanced',
  'device',
  'other',
]

export interface VoiceGroup<V extends ListenVoice = ListenVoice> {
  id: VoiceGroupId
  voices: V[]
}

/** Voices that run on the device itself. Network voices are dropped. */
export const onDeviceVoices = <V extends ListenVoice>(
  voices: readonly V[],
): V[] => voices.filter((v) => v.localService === true)

const sameLang = (a: string, b: string) =>
  a.slice(0, 2).toLowerCase() === b.slice(0, 2).toLowerCase()

/**
 * Premium and Enhanced (any language), On-device (the book's language) and
 * Other (on-device voices of other languages). Pinned voices of the language
 * come first in their group, then the rest by name. Empty groups are left out.
 */
export function groupVoices<V extends ListenVoice>(
  voices: readonly V[],
  lang: string,
  pins: readonly string[] = [],
): VoiceGroup<V>[] {
  const rows = onDeviceVoices(voices)
  const by: Record<VoiceGroupId, V[]> = {
    premium: [],
    enhanced: [],
    device: [],
    other: [],
  }
  for (const v of rows) {
    const rank = voiceRank(v)
    const g: VoiceGroupId =
      rank === 3
        ? 'premium'
        : rank === 2
          ? 'enhanced'
          : !lang || sameLang(v.lang, lang)
            ? 'device'
            : 'other'
    by[g].push(v)
  }
  const pinned = (v: V) => (pins.includes(v.voiceURI) ? 0 : 1)
  return VOICE_GROUPS.map((id) => ({
    id,
    voices: by[id].sort(
      (a, b) => pinned(a) - pinned(b) || a.name.localeCompare(b.name),
    ),
  })).filter((g) => g.voices.length > 0)
}

/** Pinned voices per language (a list of voiceURIs per two-letter code). Kept in the device's saved preferences. */
export type PinMap = Record<string, string[]>
export const voicePins = prefStore<PinMap>(
  'reading.voicePins',
  (v): v is PinMap =>
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every(
      (x) => Array.isArray(x) && x.every((y) => typeof y === 'string'),
    ),
  {},
)

export const langKey = (lang: string) => lang.slice(0, 2).toLowerCase() || 'en'

export const pinsFor = (map: PinMap, lang: string): string[] =>
  map[langKey(lang)] ?? []

/** Pins or unpins one voice for a language; returns a new map. */
export function togglePin(map: PinMap, lang: string, uri: string): PinMap {
  const k = langKey(lang)
  const cur = pinsFor(map, lang)
  const next = cur.includes(uri) ? cur.filter((x) => x !== uri) : [...cur, uri]
  const out = { ...map }
  if (next.length) out[k] = next
  else delete out[k]
  return out
}
