import { t, type MessageKey } from '../../i18n/t'
import { enPartsFeedback } from '../../i18n/en/parts/feedback'

export type FeedbackKey = keyof typeof enPartsFeedback

/** Words for the feedback parts. `t()` wins once registered; English is the fallback. */
export function tf(
  key: FeedbackKey,
  params?: Record<string, string | number>,
): string {
  const out = t(key as unknown as MessageKey, params)
  if (out !== key) return out
  return enPartsFeedback[key].replace(/\{(\w+)\}/g, (m, n: string) =>
    params?.[n] === undefined ? m : String(params[n]),
  )
}
