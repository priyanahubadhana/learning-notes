import { useLiveQuery } from 'dexie-react-hooks'
import { downloadFile } from '../app/download'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import {
  formatCap,
  formatCost,
  readCostCurrency,
  toCurrency,
} from './costCurrency'
import { listKeys } from './keyStore'
import { modelInfo } from './models'
import { readAiConfig } from './route'
import { readSendLog } from './sendLog'
import { readKeyUsage } from './usage'
import {
  FEATURE_GROUPS,
  buildReport,
  featureGroup,
  fractionOf,
  toCsv,
  type Slice,
} from './usageReport'

/** Calls shown in "Recent calls" (the CSV holds the whole month's log). */
const RECENT = 25

/**
 * Settings › AI › Usage and cost: this month against the limit (a bar), the
 * same total by key, model, feature and notebook, the recent calls, and
 * Export CSV. Built from the no-content send log kept on this device: times,
 * features, models, token counts and costs, never your words or a key.
 */
export function UsageSection({ db }: { db: LearningNotesDB }) {
  const log = readSendLog()
  const report = buildReport(log)
  const keys = listKeys()
  const config = readAiConfig()
  const limitUsd = keys.length
    ? keys.reduce((n, k) => n + (k.capUsd ?? config.capUsd), 0)
    : config.capUsd
  const notebooks = useLiveQuery(
    async () => (await db.notebooks.toArray()).filter(isLive),
    [db],
  )
  const nbName = (id: string) => {
    if (!id) return t('ai.use.noNotebook')
    const n = notebooks?.find((x) => x.id === id)
    return (n && sampleName(n)) || t('ai.use.gone')
  }
  const keyName = (id: string) =>
    id ? (keys.find((k) => k.id === id)?.name ?? t('ai.use.gone')) : ''
  const modelName = (id: string) =>
    modelInfo(id)?.label ?? (id || t('ai.use.unknown'))
  const featureName = (g: string) => t(`ai.use.f.${g}` as MessageKey)
  const frac = fractionOf(report.totalUsd, limitUsd)
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const groups: [MessageKey, Slice[], (id: string) => string][] = [
    ['ai.use.byKey', report.byKey, (id) => keyName(id) || t('ai.use.unknown')],
    ['ai.use.byModel', report.byModel, modelName],
    [
      'ai.use.byFeature',
      FEATURE_GROUPS.map((g) =>
        report.byFeature.find((s) => s.id === g),
      ).filter((s): s is Slice => !!s),
      featureName,
    ],
    ['ai.use.byNotebook', report.byNotebook, nbName],
  ]

  return (
    <section
      data-testid="ai-usage-view"
      aria-labelledby="ai-usage-h"
      className="flex flex-col gap-3"
    >
      <h3 id="ai-usage-h" className="text-sm font-semibold">
        {t('ai.use.title')}
      </h3>
      <div>
        <p className="text-sm" data-testid="ai-use-total">
          {t('ai.use.month', {
            spent: formatCost(report.totalUsd),
            limit: formatCost(limitUsd),
          })}
        </p>
        <div
          role="progressbar"
          aria-label={t('ai.use.title')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(frac * 100)}
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-hover"
        >
          <div
            data-testid="ai-use-bar"
            className="h-full rounded-full bg-accent"
            style={{ width: `${frac * 100}%` }}
          />
        </div>
        <ul data-testid="ai-usage-keys" className="mt-2 text-sm text-muted">
          {keys.map((k) => (
            <li key={k.id}>
              {t('ai.usageKey', {
                name: k.name,
                cost: formatCost(readKeyUsage(k.id).costUsd),
                cap: formatCap(k.capUsd ?? config.capUsd),
              })}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted">
          {t('ai.use.hint', { calls: report.calls, tokens: report.tokens })}
        </p>
      </div>
      {report.calls === 0 ? (
        <p className="text-sm text-muted" data-testid="ai-use-empty">
          {t('ai.use.empty')}
        </p>
      ) : (
        <>
          {groups.map(([title, rows, name]) => (
            <div key={title} data-testid={`ai-use-${title.slice(7)}`}>
              <h4 className="mb-1 text-xs font-medium text-muted">
                {t(title)}
              </h4>
              <ul className="text-sm">
                {rows.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between gap-3 border-t border-line py-1"
                  >
                    <span className="min-w-0 truncate">{name(s.id)}</span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {formatCost(s.costUsd, 4)} ·{' '}
                      {t('ai.use.calls', { count: s.calls })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="mb-1 text-xs font-medium text-muted">
              {t('ai.use.recent')}
            </h4>
            <div className="overflow-x-auto">
              <table
                data-testid="ai-use-recent"
                className="w-full text-left text-xs"
              >
                <thead className="text-muted">
                  <tr>
                    {(
                      [
                        'ai.use.colTime',
                        'ai.use.colFeature',
                        'ai.use.colModel',
                        'ai.use.colIn',
                        'ai.use.colOut',
                        'ai.use.colCost',
                      ] as const
                    ).map((k) => (
                      <th key={k} className="py-1 pr-2 font-medium">
                        {t(k)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {log.slice(0, RECENT).map((e, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1 pr-2">{date.format(e.at)}</td>
                      <td className="py-1 pr-2">
                        {featureName(featureGroup(e.feature))}
                      </td>
                      <td className="py-1 pr-2">{modelName(e.model ?? '')}</td>
                      <td className="py-1 pr-2 tabular-nums">
                        {e.inputTokens ?? '–'}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">
                        {e.outputTokens ?? '–'}
                      </td>
                      <td className="py-1 tabular-nums">
                        {formatCost(e.costUsd, 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button
            type="button"
            data-testid="ai-use-csv"
            className="min-h-11 self-start rounded-lg border border-line px-3 text-sm hover:bg-hover"
            onClick={() =>
              downloadFile(
                `ai-usage-${new Date().toISOString().slice(0, 7)}.csv`,
                toCsv(
                  log,
                  { key: keyName, notebook: nbName, cost: toCurrency },
                  readCostCurrency().code,
                ),
                'text/csv',
              )
            }
          >
            {t('ai.use.csv')}
          </button>
        </>
      )}
      <p className="text-xs text-muted">{t('ai.use.note')}</p>
    </section>
  )
}
