import { t, type MessageKey } from '../../i18n/t'
import type { enPartsFeedback } from '../../i18n/en/parts/feedback'

export type FeedbackKey = keyof typeof enPartsFeedback

/** Words for the feedback parts, through t() (other languages included). */
export function tf(
  key: FeedbackKey,
  params?: Record<string, string | number>,
): string {
  return t(key as unknown as MessageKey, params)
}
