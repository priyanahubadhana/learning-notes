import { useState, useSyncExternalStore } from 'react'
import { keySyncOn, setKeySync } from '../ai/keySync'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { t } from '../i18n/t'
import { OnOff } from '../design/parts/OnOff'
import {
  resetAllToSynced,
  restoreOverrides,
  setGroupOn,
} from './settingsMirror'
import { SYNC_GROUPS } from './syncGroups'
import {
  groupOn,
  overrideIds,
  subscribeSyncPrefs,
  syncPrefsEpoch,
} from './syncPrefs'
import { isTracking } from '../sync/device'

/**
 * Settings › Sync › What syncs: one switch per group of settings. The
 * switches are for this device only. The AI keys row is the opt-in, end to
 * end locked copy of the keys (AI settings has the same switch).
 */
export function WhatSyncs({
  db,
  signedIn,
}: {
  db: LearningNotesDB
  signedIn: boolean
}) {
  useSyncExternalStore(subscribeSyncPrefs, syncPrefsEpoch)
  const [keysOn, setKeysOn] = useState(keySyncOn)
  const [undo, setUndo] = useState<Record<string, JsonValue> | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canKeys = signedIn && isTracking()
  // Shown at once; the real switch follows when the values are set aside.
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const reset = () => {
    if (overrideIds().length === 0) {
      setUndo(null)
      setMessage(t('syncWhat.nothingToReset'))
      return
    }
    setUndo(resetAllToSynced())
    setMessage(t('syncWhat.resetDone'))
  }

  return (
    <div data-testid="what-syncs" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t('syncWhat.title')}</h3>
      <p className="text-sm text-muted">{t('syncWhat.intro')}</p>
      <ul className="flex flex-col">
        {SYNC_GROUPS.map((g) => {
          const keys = g.id === 'aiKeys'
          const checked = keys ? keysOn : (pending[g.id] ?? groupOn(g.id))
          const disabled = keys ? !canKeys : !signedIn
          return (
            <li key={g.id} className="py-1">
              <div className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
                <span>{t(g.labelKey)}</span>
                <OnOff
                  checked={checked}
                  disabled={disabled}
                  testId={`sync-group-${g.id}`}
                  label={t('syncWhat.switch', { group: t(g.labelKey) })}
                  onChange={(on) => {
                    if (keys) {
                      setKeysOn(on)
                      void setKeySync(db, on)
                    } else {
                      setPending((p) => ({ ...p, [g.id]: on }))
                      void setGroupOn(g.id, on).finally(() =>
                        setPending((p) =>
                          Object.fromEntries(
                            Object.entries(p).filter(([k]) => k !== g.id),
                          ),
                        ),
                      )
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted">
                {t(g.listKey)}
                {disabled && !signedIn && ` ${t('syncWhat.signedOut')}.`}
              </p>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="reset-device-settings"
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover"
          onClick={reset}
        >
          {t('syncWhat.resetDevice')}
        </button>
        {message && (
          <span role="status" className="text-sm text-muted">
            {message}
          </span>
        )}
        {undo && (
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm text-accent underline hover:bg-hover"
            onClick={() => {
              restoreOverrides(undo)
              setUndo(null)
              setMessage(null)
            }}
          >
            {t('syncWhat.undo')}
          </button>
        )}
      </div>
    </div>
  )
}
