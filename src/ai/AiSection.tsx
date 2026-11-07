import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { t } from '../i18n/t'
import { AI_KEYS, DEFAULT_CAP_USD } from './aiRun'
import { AiKeys } from './AiKeys'
import { listKeys, type AiKey } from './keyStore'
import { ModelCards } from './ModelCards'
import { MODELS } from './models'
import { isCap, readKeyUsage, readUsage } from './usage'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
const isStringMap = (v: unknown): v is Record<string, string> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string')

function choiceValue(
  c: { keyId: string; model: string } | undefined,
  keys: readonly AiKey[],
): string {
  return c && keys.some((k) => k.id === c.keyId) ? `${c.keyId}|${c.model}` : ''
}

/**
 * Settings › AI: off by default; the provider, the user's own key (kept on
 * this device only), the monthly cap, this month's use, and the notebooks
 * that may use AI.
 */
export function AiSection({ db }: { db: LearningNotesDB }) {
  const [enabled, setEnabled] = usePref(AI_KEYS.enabled, isBool, false)
  const [cap, setCap] = usePref(AI_KEYS.cap, isCap, DEFAULT_CAP_USD)
  const [order, setOrder] = usePref<string[]>(AI_KEYS.order, isStrings, [])
  const [keyFor, setKeyFor] = usePref<Record<string, string>>(
    AI_KEYS.keyFor,
    isStringMap,
    {},
  )
  const [keys, setKeys] = useState(() => listKeys())
  const [, bump] = useState(0)
  const refresh = () => {
    setKeys(listKeys())
    bump((n) => n + 1)
  }
  const usage = readUsage()
  const notebooks = useLiveQuery(
    async () =>
      (await db.notebooks.toArray())
        .filter(
          (n) =>
            isLive(n) &&
            (!n.kind || n.kind === 'books' || n.kind === 'sources'),
        )
        .sort((a, b) => a.order.localeCompare(b.order)),
    [db],
  )

  const field =
    'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
  return (
    <section data-testid="ai-section" className="mb-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold">{t('ai.title')}</h2>
      <p className="text-sm text-muted">{t('ai.intro')}</p>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          data-testid="ai-enable"
          className="size-5"
        />
        {t('ai.enable')}
      </label>
      <AiKeys keys={keys} defaultCap={cap} onChange={refresh} />
      <ModelCards
        keys={keys}
        order={order}
        keyFor={keyFor}
        onOrder={setOrder}
        onKeyFor={(m, k) => setKeyFor({ ...keyFor, [m]: k })}
      />
      <label className="flex flex-col gap-1 text-sm">
        {t('ai.cap')}
        <input
          type="number"
          min={0}
          max={10000}
          step={1}
          value={cap}
          data-testid="ai-cap"
          onChange={(e) => {
            const n = Number(e.target.value)
            if (isCap(n)) setCap(n)
          }}
          className={`${field} max-w-[10rem]`}
        />
      </label>
      <div>
        <p className="text-sm text-muted" data-testid="ai-usage">
          {t('ai.usage', {
            cost: `$${usage.costUsd.toFixed(2)}`,
            tokens: usage.inputTokens + usage.outputTokens,
          })}
        </p>
        <ul data-testid="ai-usage-keys" className="text-sm text-muted">
          {keys.map((k) => (
            <li key={k.id}>
              {t('ai.usageKey', {
                name: k.name,
                cost: `$${readKeyUsage(k.id).costUsd.toFixed(2)}`,
                cap: `$${k.capUsd ?? cap}`,
              })}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium">{t('ai.allowTitle')}</h3>
        <ul>
          {(notebooks ?? []).map((n) => (
            <li key={n.id}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  role="switch"
                  checked={!!n.allowAi}
                  data-testid="ai-allow"
                  aria-label={t('ai.allowNotebook', { name: n.title })}
                  onChange={(e) =>
                    void db.notebooks.update(n.id, {
                      allowAi: e.target.checked ? true : undefined,
                      updatedAt: Date.now(),
                    })
                  }
                  className="size-5"
                />
                {n.title || t('review.untitled')}
              </label>
              <label className="mb-2 ml-8 flex flex-wrap items-center gap-2 text-xs text-muted">
                {t('ai.nb.uses')}
                <select
                  data-testid="ai-nb-choice"
                  aria-label={t('ai.nb.choiceFor', { name: n.title })}
                  value={choiceValue(n.aiChoice, keys)}
                  onChange={(e) => {
                    const [keyId, model] = e.target.value.split('|')
                    void db.notebooks.update(n.id, {
                      aiChoice: keyId && model ? { keyId, model } : undefined,
                      updatedAt: Date.now(),
                    })
                  }}
                  className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
                >
                  <option value="">{t('ai.nb.default')}</option>
                  {keys.flatMap((k) =>
                    MODELS.filter((m) => m.provider === k.provider).map((m) => (
                      <option key={k.id + m.id} value={`${k.id}|${m.id}`}>
                        {k.name} · {m.label}
                      </option>
                    )),
                  )}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
