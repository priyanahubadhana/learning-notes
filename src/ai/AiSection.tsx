import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { t } from '../i18n/t'
import { AI_KEYS, DEFAULT_CAP_USD } from './aiRun'
import { forgetKey, getKey, maskKey, setKey } from './keyStore'
import {
  PROVIDERS,
  PROVIDER_IDS,
  isProviderId,
  type ProviderId,
} from './provider'
import { isCap, readUsage } from './usage'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isText = (v: unknown): v is string => typeof v === 'string'

/**
 * Settings › AI: off by default; the provider, the user's own key (kept on
 * this device only), the monthly cap, this month's use, and the notebooks
 * that may use AI.
 */
export function AiSection({ db }: { db: LearningNotesDB }) {
  const [enabled, setEnabled] = usePref(AI_KEYS.enabled, isBool, false)
  const [provider, setProvider] = usePref<ProviderId>(
    AI_KEYS.provider,
    isProviderId,
    'anthropic',
  )
  const [model, setModel] = usePref(AI_KEYS.model, isText, '')
  const [cap, setCap] = usePref(AI_KEYS.cap, isCap, DEFAULT_CAP_USD)
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)
  const [keyNow, setKeyNow] = useState(() => getKey(provider))
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
      <label className="flex flex-col gap-1 text-sm">
        {t('ai.provider')}
        <select
          value={provider}
          data-testid="ai-provider"
          onChange={(e) => {
            const next = e.target.value as ProviderId
            setProvider(next)
            setModel('')
            setKeyNow(getKey(next))
            setDraft('')
          }}
          className={field}
        >
          {PROVIDER_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`ai.provider.${id}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor="ai-key">{t('ai.key')}</label>
        {keyNow ? (
          <div className="flex flex-wrap items-center gap-2">
            <span data-testid="ai-key-masked">
              {t('ai.keyMasked', { masked: maskKey(keyNow) })}
            </span>
            <button
              type="button"
              data-testid="ai-key-forget"
              onClick={() => {
                forgetKey(provider)
                setKeyNow('')
              }}
              className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
            >
              {t('ai.keyForget')}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              id="ai-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              data-testid="ai-key"
              onChange={(e) => {
                setDraft(e.target.value)
                setBad(false)
              }}
              className={`${field} max-w-sm`}
            />
            <button
              type="button"
              data-testid="ai-key-save"
              onClick={() => {
                if (setKey(provider, draft)) {
                  setKeyNow(getKey(provider))
                  setDraft('')
                } else setBad(true)
              }}
              className="min-h-11 rounded-lg bg-accent px-4 font-medium text-white hover:opacity-90"
            >
              {t('ai.keySave')}
            </button>
          </div>
        )}
        {bad && (
          <p role="alert" className="text-red-600">
            {t('ai.keyBad')}
          </p>
        )}
        <p className="text-xs text-muted">{t('ai.keyWarning')}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t('ai.model')}
        <input
          value={model}
          placeholder={PROVIDERS[provider].defaultModel}
          maxLength={80}
          onChange={(e) => setModel(e.target.value)}
          data-testid="ai-model"
          className={`${field} max-w-sm`}
        />
      </label>
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
      <p className="text-sm text-muted" data-testid="ai-usage">
        {t('ai.usage', {
          cost: `$${usage.costUsd.toFixed(2)}`,
          tokens: usage.inputTokens + usage.outputTokens,
        })}
      </p>
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
