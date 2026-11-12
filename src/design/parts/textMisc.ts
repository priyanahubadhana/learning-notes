import { t, type MessageKey } from '../../i18n/t'
import { enPartsMisc } from '../../i18n/en/parts/misc'

type Strip<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K
export type MiscKey = Strip<keyof typeof enPartsMisc>

/**
 * Text for the misc shared parts. Until the manager wires `enPartsMisc` into
 * the i18n index, `t()` hands back the key itself, so fall back to the
 * English text here. Once wired, `t()` wins (so other languages work).
 */
export function tp(
  key: MiscKey,
  params?: Record<string, string | number>,
): string {
  const out = t(key as MessageKey, params)
  if (out !== key) return out
  const table = enPartsMisc as Record<string, string>
  const count = params?.count
  const form =
    typeof count === 'number' && count !== 1 ? `${key}_other` : `${key}_one`
  const raw = table[form] ?? table[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (m, n: string) =>
    params?.[n] === undefined ? m : String(params[n]),
  )
}
