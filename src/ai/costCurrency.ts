import { liveQuery } from 'dexie'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { readPref, writePref } from '../app/uiPrefs'
import { currentLocale, t } from '../i18n/t'
import { getSetting, setSetting } from '../settings/settingsService'
import type { SettingDefinition } from '../settings/registry'
import { groupOn, hasOverride } from '../settings/syncPrefs'

/**
 * Cost currency (Settings > AI). Costs are worked out in US dollars; every
 * display shows them in the chosen currency: usd x rate (units per 1 US
 * dollar), formatted with Intl.NumberFormat in the app language. The rate is
 * typed by the owner (no network, no live rates). The value is a normal
 * synced setting (`ai.currency`); a copy in this browser lets the plain
 * (non-async) cost lines read it.
 */

export type CostCurrency = {
  code: string
  /** The rate the user set for each currency (units per 1 US dollar). */
  rates: Record<string, number>
  /** When a rate was last edited (ms since 1970, UTC), or null. */
  changedAt: number | null
}

export const DEFAULT_CURRENCY = 'INR'
export const DEFAULT_INR_RATE = 90
const OLD_RATE_PREF = 'ai.inrPerUsd'
const MIRROR_KEY = 'ai.currency'

export const isRate = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e9
export const isCurrencyCode = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Z]{3}$/.test(v)

export const isCostCurrency = (v: unknown): v is CostCurrency => {
  if (!v || typeof v !== 'object') return false
  const c = v as Partial<CostCurrency>
  return (
    isCurrencyCode(c.code) &&
    !!c.rates &&
    typeof c.rates === 'object' &&
    Object.entries(c.rates).every(([k, r]) => isCurrencyCode(k) && isRate(r)) &&
    (c.changedAt === null || typeof c.changedAt === 'number')
  )
}

export const costCurrencySetting: SettingDefinition<CostCurrency> = {
  id: 'ai.currency',
  labelKey: 'ai.currency.label',
  descriptionKey: 'ai.currency.label',
  category: 'ai',
  scope: 'synced',
  defaultValue: { code: DEFAULT_CURRENCY, rates: {}, changedAt: null },
  isValid: isCostCurrency as (v: unknown) => v is CostCurrency,
  control: { kind: 'number', min: 0, max: 1e9 },
}

/** The rate used until the user edits it: 90 for the rupee, else 1. */
export const defaultRate = (code: string): number =>
  code === 'INR' ? DEFAULT_INR_RATE : 1

export const rateOf = (c: CostCurrency): number =>
  c.rates[c.code] ?? defaultRate(c.code)

/** The currency in use now (from the copy in this browser; INR when none). */
export function readCostCurrency(): CostCurrency {
  const saved = readPref<CostCurrency | null>(
    MIRROR_KEY,
    (v): v is CostCurrency => isCostCurrency(v),
    null,
  )
  if (saved) return saved
  // Older versions kept only the rupee rate (pref ai.inrPerUsd).
  const old = readPref<number | null>(
    OLD_RATE_PREF,
    (v): v is number => isRate(v),
    null,
  )
  return {
    code: DEFAULT_CURRENCY,
    rates: old === null ? {} : { INR: old },
    changedAt: null,
  }
}

/** Converts US dollars to the chosen currency. */
export const toCurrency = (usd: number): number =>
  usd * rateOf(readCostCurrency())

function formatter(code: string, digits: number): Intl.NumberFormat {
  const make = (currency: string) =>
    new Intl.NumberFormat(currentLocale(), {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  try {
    return make(code)
  } catch {
    return make(DEFAULT_CURRENCY)
  }
}

/** An amount already in the chosen currency, e.g. "Rs 0.42" ("under ..."). */
export function formatAmount(amount: number, digits = 2): string {
  const f = formatter(readCostCurrency().code, digits)
  const least = 0.5 / 10 ** digits
  return amount > 0 && amount < least
    ? t('prompts.underAmount', { amount: f.format(1 / 10 ** digits) })
    : f.format(amount)
}

/** US dollars shown in the chosen currency. */
export const formatCost = (usd: number, digits = 2): string =>
  formatAmount(toCurrency(usd), digits)

/** A monthly cap typed in US dollars, shown in the chosen currency. */
export const formatCap = (usd: number): string =>
  formatter(readCostCurrency().code, 0).format(toCurrency(usd))

/** Currency codes the browser knows, each with its name in the app language. */
export function currencyChoices(): { code: string; name: string }[] {
  const codes: string[] =
    (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.('currency') ?? []
  const list = codes.length ? codes : ['INR', 'USD', 'EUR', 'GBP', 'JPY']
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([currentLocale()], { type: 'currency' })
  } catch {
    names = null
  }
  return list.map((code) => ({ code, name: names?.of(code) ?? code }))
}

async function currentValue(db: LearningNotesDB): Promise<CostCurrency> {
  const row = await db.settings.get(costCurrencySetting.id)
  return row ? await getSetting(db, costCurrencySetting) : readCostCurrency()
}

/** Saves the choice (and keeps the copy in this browser equal). */
export async function saveCostCurrency(
  db: LearningNotesDB,
  next: CostCurrency,
): Promise<void> {
  writePref(MIRROR_KEY, next)
  await setSetting(db, costCurrencySetting, next)
}

export const chooseCurrency = async (db: LearningNotesDB, code: string) => {
  const cur = await currentValue(db)
  await saveCostCurrency(db, { ...cur, code })
}

export const changeRate = async (db: LearningNotesDB, rate: number) => {
  const cur = await currentValue(db)
  await saveCostCurrency(db, {
    ...cur,
    rates: { ...cur.rates, [cur.code]: rate },
    changedAt: Date.now(),
  })
}

/**
 * Keeps this browser's copy equal to the synced setting (also when it
 * arrives from another device). With no setting yet, an older rupee rate
 * pref moves into it. Returns a stop function.
 */
export function startCurrencyMirror(db: LearningNotesDB): () => void {
  const sub = liveQuery(() =>
    db.settings.get(costCurrencySetting.id),
  ).subscribe({
    next: (row) => {
      const v = row?.value as JsonValue | undefined
      // This device's own choice (or a group that is off) keeps its copy.
      if (isCostCurrency(v)) {
        if (!hasOverride(costCurrencySetting.id) && groupOn('ai'))
          writePref(MIRROR_KEY, v)
      } else if (!row) {
        const mine = readCostCurrency()
        if (mine.rates.INR !== undefined) void saveCostCurrency(db, mine)
      }
    },
    error: () => undefined,
  })
  return () => sub.unsubscribe()
}

/** Converts an amount in the chosen currency back to US dollars. */
export const fromCurrency = (amount: number): number =>
  amount / rateOf(readCostCurrency())

/** A US-dollar limit as a plain number in the chosen currency (for inputs). */
export const limitToInput = (usd: number): number =>
  Math.round(toCurrency(usd) * 100) / 100
