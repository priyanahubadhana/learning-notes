import { onPrefChangedExternally } from '../app/uiPrefs'
import { useEffect, useState } from 'react'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { isTracking } from '../sync/device'
import { AI_KEYS, DEFAULT_CAP_USD } from './aiRun'
import { AiKeys } from './AiKeys'
import { AiOffCard } from './AiOffCard'
import { CostCurrencyPicker } from './CostCurrencyPicker'
import { fromCurrency, limitToInput, readCostCurrency } from './costCurrency'
import { ClaudeSkillCard } from './ClaudeSkillCard'
import { keySyncOn, onKeysArrived, setKeySync } from './keySync'
import { listKeys } from './keyStore'
import { ModelCards } from './ModelCards'
import { isCap } from './usage'
import { UsageSection } from './UsageSection'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
const isStringMap = (v: unknown): v is Record<string, string> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string')

/**
 * Settings › AI, in one order: (a) on or off, (b) keys, their default model
 * and key syncing, (c) the spending limit in the chosen currency, (d) usage
 * and cost. Which notebooks may use AI is Settings › Permissions (linked).
 */
export function AiSection({
  db,
  onGo,
}: {
  db: LearningNotesDB
  onGo?: (category: string) => void
}) {
  const [enabled, setEnabled] = usePref(AI_KEYS.enabled, isBool, false)
  const [cap, setCap] = usePref(AI_KEYS.cap, isCap, DEFAULT_CAP_USD)
  const [order, setOrder] = usePref<string[]>(AI_KEYS.order, isStrings, [])
  const [keyFor, setKeyFor] = usePref<Record<string, string>>(
    AI_KEYS.keyFor,
    isStringMap,
    {},
  )
  // A limit that arrived from another device replaces what the box shows.
  const [capFrom, setCapFrom] = useState(0)
  useEffect(
    () =>
      onPrefChangedExternally((k) => {
        if (k === AI_KEYS.cap) setCapFrom((n) => n + 1)
      }),
    [],
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
  const code = readCostCurrency().code

  const field =
    'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
  const head = 'text-sm font-semibold'
  return (
    <section data-testid="ai-section" className="mb-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold">{t('ai.title')}</h2>
      <p className="text-sm text-muted">{t('ai.intro')}</p>

      {/* (a) On or off */}
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
      {!enabled && <AiOffCard here onTurnOn={() => setEnabled(true)} />}

      {/* (b) Keys, default model */}
      <h3 className={head} data-setting-id="ai.keyList">
        {t('ai.sec.keys')}
      </h3>
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

      {/* (c) Spending */}
      <h3 className={head}>{t('ai.sec.spending')}</h3>
      <label className="flex flex-col gap-1 text-sm">
        {t('ai.cap', { currency: code })}
        <input
          key={`${code}${readCostCurrency().rates[code]}-${capFrom}`}
          type="number"
          min={0}
          step="any"
          defaultValue={limitToInput(cap)}
          data-testid="ai-cap"
          onChange={(e) => {
            const usd = fromCurrency(Number(e.target.value))
            if (e.target.value !== '' && isCap(usd)) setCap(usd)
          }}
          className={`${field} max-w-[10rem]`}
        />
      </label>
      <p className="text-xs text-muted">
        {t('ai.cap.hint', { currency: code })}
      </p>
      <CostCurrencyPicker db={db} onChange={() => bump((n) => n + 1)} />

      {/* (d) Usage and cost */}
      <h3 className={head}>{t('ai.sec.usage')}</h3>
      <UsageSection db={db} />

      <ClaudeSkillCard />
      <div
        className="flex flex-col items-start gap-1"
        data-testid="ai-perm-moved"
      >
        <p className="text-sm text-muted">{t('ai.perm.moved')}</p>
        {onGo && (
          <button
            type="button"
            data-testid="ai-open-permissions"
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
            onClick={() => onGo('permissions')}
          >
            {t('ai.perm.open')}
          </button>
        )}
      </div>
    </section>
  )
}
