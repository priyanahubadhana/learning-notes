import { t, type MessageKey } from '../../i18n/t'
import type { enPartsMisc } from '../../i18n/en/parts/misc'

type Strip<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K
export type MiscKey = Strip<keyof typeof enPartsMisc>

/** Text for the misc shared parts, through t(). */
export function tp(
  key: MiscKey,
  params?: Record<string, string | number>,
): string {
  return t(key as MessageKey, params)
}
