import { t, type MessageKey } from '../../i18n/t'
import type { enPartsStep3 } from '../../i18n/en/parts/step3'

type Step3Key = keyof typeof enPartsStep3
type Base<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K
export type PartsStep3Key = Base<Step3Key>

/** Text for the step 3 parts, through t() (other languages included). */
export function tp3(
  key: PartsStep3Key,
  params?: Record<string, string | number>,
): string {
  return t(key as unknown as MessageKey, params)
}
