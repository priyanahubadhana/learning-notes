import { en } from './en'

/**
 * Translation helper: `t('settings.title')` → "Settings".
 *
 * - `{name}` placeholders are filled from `params` (numbers are formatted for
 *   the current language, e.g. 1,000 vs 1.000).
 * - Plurals: `t('settings.count', { count: 3 })` picks `settings.count_other`
 *   using the browser's plural rules for the language.
 * - A missing key returns the key itself, so a gap is visible but never crashes.
 */

type PluralForm = Intl.LDMLPluralRule
type BaseKey<K> = K extends `${infer B}_${PluralForm}` ? B : K

/** Every valid key (plural keys are used without their `_one`/`_other` suffix). */
export type MessageKey = BaseKey<keyof typeof en>

type Messages = Partial<Record<string, string>>

let locale = 'en'
let messages: Messages = en
let pluralRules = new Intl.PluralRules(locale)
let numberFormat = new Intl.NumberFormat(locale)

/** Switches language. Keys missing from `next` fall back to English. */
export function setMessages(nextLocale: string, next: Messages): void {
  locale = nextLocale
  messages = { ...en, ...next }
  pluralRules = new Intl.PluralRules(locale)
  numberFormat = new Intl.NumberFormat(locale)
}

/** The current language code (for `Intl` date/number formatting). */
export const currentLocale = (): string => locale

/**
 * Locale for dates and times: the app's language in the style of the
 * user's own region, e.g. app "en" with browser "en-IN" → "12 Nov", with
 * "en-US" → "Nov 12".
 */
export const dateLocale = (): string =>
  // The forced day/month order only exists for English; Hindi and Spanish
  // keep their own month and day names.
  locale.startsWith('en') && dateStyle === 'dayFirst'
    ? 'en-GB'
    : locale.startsWith('en') && dateStyle === 'monthFirst'
      ? 'en-US'
      : withRegion(locale, globalThis.navigator?.languages?.[0])

/** How dates are written (Settings › Date style); Auto follows the browser. */
export type DateStyle = 'auto' | 'dayFirst' | 'monthFirst'
let dateStyle: DateStyle = 'auto'
export function setDateStyle(style: DateStyle): void {
  dateStyle = style
}

/** `appLocale` with the region of `browserLocale`, if it has one. */
export function withRegion(appLocale: string, browserLocale?: string): string {
  try {
    const region = browserLocale && new Intl.Locale(browserLocale).region
    return region
      ? new Intl.Locale(appLocale, { region }).toString()
      : appLocale
  } catch {
    return appLocale
  }
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const count = params?.count
  const text =
    (typeof count === 'number'
      ? (messages[`${key}_${pluralRules.select(count)}`] ??
        messages[`${key}_other`])
      : undefined) ??
    messages[key] ??
    key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    if (value === undefined) return match
    return typeof value === 'number' ? numberFormat.format(value) : value
  })
}
