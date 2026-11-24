import { t, type MessageKey } from '../../i18n/t'
import { enV2Search } from '../../i18n/en/v2/search'

export type TsKey = keyof typeof enV2Search

/**
 * Text for the new Search. Until `enV2Search` is wired into the i18n index,
 * `t()` hands back the key, so fall back to the English table. Once wired,
 * `t()` wins (other languages work).
 */
export function ts(
  key: TsKey,
  params?: Record<string, string | number>,
): string {
  const out = t(key as MessageKey, params)
  if (out !== key) return out
  return (enV2Search[key] as string).replace(/\{(\w+)\}/g, (m, n: string) =>
    params?.[n] === undefined ? m : String(params[n]),
  )
}
