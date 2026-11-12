import { t, type MessageKey } from '../../i18n/t'
import { enPartsArrange } from '../../i18n/en/parts/arrange'
import { enPartsCore } from '../../i18n/en/parts/core'
import { enPartsDrag } from '../../i18n/en/parts/drag'

const table = { ...enPartsCore, ...enPartsDrag, ...enPartsArrange }
export type PartsCoreKey = keyof typeof table

/**
 * Text for the shared parts. Goes through `t()`; until the manager registers
 * `enPartsCore` in the i18n index, `t()` returns the key, so we fall back to
 * the English text here (and fill `{name}` placeholders).
 */
export function tp(
  key: PartsCoreKey,
  params?: Record<string, string | number>,
): string {
  const got = t(key as unknown as MessageKey, params)
  if (got !== key) return got
  let s: string = table[key]
  if (params)
    for (const [k, v] of Object.entries(params))
      s = s.split(`{${k}}`).join(String(v))
  return s
}
