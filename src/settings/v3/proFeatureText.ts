import { currentLocale } from '../../i18n/t'
import { esProFeatureText } from '../../i18n/es/proFeatureText'
import { hiProFeatureText } from '../../i18n/hi/proFeatureText'
import { PRO_FEATURE_TEXT } from './proFeatureText.gen'

type Pair = readonly [string, string]

const tables: Record<string, Record<string, Pair>> = {
  en: PRO_FEATURE_TEXT,
  es: esProFeatureText,
  hi: hiProFeatureText,
}

/**
 * Name and plain line of one Professional feature in the current language
 * (English is generated from the spec; Spanish and Hindi live in
 * `src/i18n/{es,hi}/proFeatureText.ts`). Falls back to English, then to the id.
 */
export function proFeatureText(id: string, language?: string): Pair {
  const locale = (language ?? currentLocale()).slice(0, 2)
  return tables[locale]?.[id] ?? PRO_FEATURE_TEXT[id] ?? [id, '']
}
