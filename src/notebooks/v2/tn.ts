import { t, type MessageKey } from '../../i18n/t'
import { enV2Notebooks } from '../../i18n/en/v2/notebooks'

type Strip<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K
export type TnKey = Strip<keyof typeof enV2Notebooks>

/**
 * Text for the new Notebooks screens. Until `enV2Notebooks` is wired into the
 * i18n index, `t()` hands back the key, so fall back to the English table.
 * Once wired, `t()` wins (other languages work).
 */
export function tn(
  key: TnKey,
  params?: Record<string, string | number>,
): string {
  const out = t(key as MessageKey, params)
  if (out !== key) return out
  const table = enV2Notebooks as Record<string, string>
  const count = params?.count
  const form =
    typeof count === 'number' && count !== 1 ? `${key}_other` : `${key}_one`
  const raw = table[form] ?? table[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (m, n: string) =>
    params?.[n] === undefined ? m : String(params[n]),
  )
}
