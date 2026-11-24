import { t, type MessageKey } from '../../i18n/t'
import type { enPartsArrange } from '../../i18n/en/parts/arrange'
import type { enPartsCore } from '../../i18n/en/parts/core'
import type { enPartsDrag } from '../../i18n/en/parts/drag'

export type PartsCoreKey = keyof (typeof enPartsCore &
  typeof enPartsDrag &
  typeof enPartsArrange)

/** Text for the shared parts, through t() (other languages included). */
export function tp(
  key: PartsCoreKey,
  params?: Record<string, string | number>,
): string {
  return t(key as unknown as MessageKey, params)
}
