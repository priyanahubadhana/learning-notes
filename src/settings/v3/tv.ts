import { currentLocale } from '../../i18n/t'
import { enSettingsV3 } from '../../i18n/en/settingsV3'
import { esSettingsV3 } from '../../i18n/es/settingsV3'
import { hiSettingsV3 } from '../../i18n/hi/settingsV3'

/** Every v3 text, by key (plural keys without `_one` / `_other`). */
export type V3Key = {
  [K in keyof typeof enSettingsV3]: K extends `${infer B}_${'one' | 'other'}`
    ? B
    : K
}[keyof typeof enSettingsV3]

const tables: Record<string, Record<string, string>> = {
  en: enSettingsV3,
  es: esSettingsV3,
  hi: hiSettingsV3,
}

/**
 * Text of the new Settings screen. The texts live in the slice's own files
 * (`src/i18n/{en,es,hi}/settingsV3.ts`) and load with the screen, so no v3
 * text sits in a shared i18n file. Falls back to English, then to the key.
 */
export function tv(
  key: V3Key,
  params?: Record<string, string | number>,
  language?: string,
) {
  const locale = (language ?? currentLocale()).slice(0, 2)
  const table = tables[locale] ?? enSettingsV3
  const count = params?.count
  const plural =
    typeof count === 'number'
      ? `${key}_${new Intl.PluralRules(language ?? currentLocale()).select(count)}`
      : undefined
  let text =
    (plural && (table[plural] ?? table[`${key}_other`])) ??
    table[key] ??
    (plural && (enSettingsV3 as Record<string, string>)[plural]) ??
    (enSettingsV3 as Record<string, string>)[key] ??
    key
  if (params)
    for (const [k, v] of Object.entries(params))
      text = text.split(`{${k}}`).join(String(v))
  return text
}
