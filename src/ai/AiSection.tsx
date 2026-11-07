import { useEffect, useState } from 'react'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { isTracking } from '../sync/device'
import { AI_KEYS, DEFAULT_CAP_USD } from './aiRun'
import { AiKeys } from './AiKeys'
import { keySyncOn, onKeysArrived, setKeySync } from './keySync'
import { listKeys } from './keyStore'
import { ModelCards } from './ModelCards'
import { isCap, readKeyUsage, readUsage } from './usage'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
const isStringMap = (v: unknown): v is Record<string, string> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string')

/**
 * Settings › AI: off by default; the provider, the user's own key (kept on
 * this device only), the monthly cap, and this month's use. Which notebooks may
 * use AI is Settings › Permissions.
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
  // Keys on all devices (R6-2): the switch, and a refresh when keys arrive.
  const [keysSync, setKeysSync] = useState(keySyncOn)
  const canSyncKeys = isTracking()
  useEffect(
    () =>
      onKeysArrived(() => {
        setKeysSync(keySyncOn())
        refresh()
      }),
    [],
  )
  const usage = readUsage()

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
      <div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            role="switch"
            checked={keysSync}
            disabled={!canSyncKeys}
            data-testid="ai-keys-sync"
            onChange={(e) => {
              const on = e.target.checked
              setKeysSync(on)
              void setKeySync(db, on).then(refresh)
            }}
            className="size-5"
          />
          {t('ai.keysSync')}
        </label>
        <p className="ml-8 text-xs text-muted">
          {canSyncKeys ? t('ai.keysSync.hint') : t('ai.keysSync.needsSync')}
        </p>
      </div>
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
      <p className="text-sm text-muted" data-testid="ai-perm-moved">
        {t('ai.perm.moved')}
      </p>
    </section>
  )
}
