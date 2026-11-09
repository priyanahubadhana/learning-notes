import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { dateLocale, t } from '../i18n/t'
import { getSetting } from '../settings/settingsService'
import {
  changeRate,
  chooseCurrency,
  costCurrencySetting,
  currencyChoices,
  isRate,
  rateOf,
} from './costCurrency'

const field =
  'min-h-11 rounded-lg border border-line bg-bg px-2 text-sm outline-none focus:border-accent'

/**
 * Settings > AI > Cost currency: any currency (searchable) and its rate per
 * 1 US dollar (typed by hand; no live rates). Synced like any setting.
 */
export function CostCurrencyPicker({
  db,
  onChange,
}: {
  db: LearningNotesDB
  /** Called after a save, so the cost lines around it redraw. */
  onChange?: () => void
}) {
  const cur = useLiveQuery(() => getSetting(db, costCurrencySetting), [db])
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string | null>(null)
  const all = useMemo(() => currencyChoices(), [])
  if (!cur) return null
  const q = query.trim().toLowerCase()
  const shown = (
    q
      ? all.filter(
          (c) =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q),
        )
      : all
  ).slice(0, 40)
  const name = all.find((c) => c.code === cur.code)?.name ?? cur.code
  return (
    <div className="flex flex-col gap-2" data-testid="cost-currency">
      <h3 className="text-sm font-medium">{t('ai.currency.label')}</h3>
      <p className="text-sm text-muted" data-testid="cost-currency-now">
        {cur.code} · {name}
      </p>
      <input
        type="search"
        value={query}
        placeholder={t('ai.currency.search')}
        aria-label={t('ai.currency.search')}
        data-testid="cost-currency-search"
        onChange={(e) => setQuery(e.target.value)}
        className={`${field} max-w-[16rem]`}
      />
      <ul
        className="max-h-44 max-w-[16rem] overflow-y-auto rounded-lg border border-line"
        data-testid="cost-currency-list"
      >
        {shown.map((c) => (
          <li key={c.code}>
            <button
              type="button"
              aria-pressed={c.code === cur.code}
              data-testid={`cost-currency-${c.code}`}
              onClick={() => {
                setDraft(null)
                void chooseCurrency(db, c.code).then(onChange)
              }}
              className={`min-h-11 w-full px-2 text-left text-sm ${
                c.code === cur.code ? 'bg-accent/15 font-medium' : ''
              }`}
            >
              {c.code} · {c.name}
            </button>
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-1 text-sm">
        {t('ai.currency.rate', { code: cur.code })}
        <input
          type="number"
          min={0}
          step="any"
          value={draft ?? String(rateOf(cur))}
          data-testid="cost-currency-rate"
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && isRate(n))
              void changeRate(db, n).then(onChange)
          }}
          onBlur={() => setDraft(null)}
          className={`${field} max-w-[10rem]`}
        />
      </label>
      {cur.changedAt !== null && (
        <p className="text-xs text-muted" data-testid="cost-currency-changed">
          {t('ai.currency.changed', {
            date: new Intl.DateTimeFormat(dateLocale(), {
              dateStyle: 'medium',
            }).format(cur.changedAt),
          })}
        </p>
      )}
    </div>
  )
}
