import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ConfirmDialog } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import {
  claudeDisable,
  claudeEnable,
  claudeSetNotebooks,
  claudeStatus,
  connectedApps,
  revokeApp,
  type ClaudeStatus,
  type ConnectedApp,
  type Reply,
} from '../sync/connectors/claudeServer'
import {
  accountAuth,
  getSyncStatus,
  keyForClaude,
  subscribeSync,
} from '../sync/syncService'
import { UnlockForm } from '../sync/UnlockForm'
import {
  modeOf,
  sameChoice,
  scopeToSend,
  type ChoiceMode,
} from './claudeChoice'

/**
 * Settings › Claude: "Let Claude work with my notes" (online connector B,
 * slice 3). Off until the person turns it on with their sync passphrase. The
 * text says plainly what it means for privacy. Also the Connected apps list
 * with Revoke. All the rules live on the server (supabase/functions/_shared/
 * escrow.ts); this screen only asks and shows.
 */

const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; reason: 'login' | 'unavailable' | 'error' }
  | { kind: 'ready'; status: ClaudeStatus; apps: ConnectedApp[] }

const failure = (r: Reply<unknown>): 'login' | 'unavailable' | 'error' =>
  !r.ok && (r.reason === 'login' || r.reason === 'unavailable')
    ? r.reason
    : 'error'

export function ClaudeSection({ db }: { db: LearningNotesDB }) {
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus)
  const signedIn = sync.phase !== 'signedOut'
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [mode, setMode] = useState<ChoiceMode>('all')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<'saved' | 'error' | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)
  const [busy, setBusy] = useState(false)

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
  const existing = (notebooks ?? []).map((n) => n.id)

  const refresh = useCallback(async () => {
    try {
      const token = await accountAuth().accessToken()
      const status = await claudeStatus(token)
      if (!status.ok) return setLoad({ kind: 'error', reason: failure(status) })
      const apps = status.value.on ? await connectedApps(token) : null
      setMode(modeOf(status.value.notebookIds))
      setPicked(new Set(status.value.notebookIds ?? []))
      setLoad({
        kind: 'ready',
        status: status.value,
        apps: apps?.ok ? apps.value.apps : [],
      })
    } catch {
      setLoad({ kind: 'error', reason: 'error' })
    }
  }, [])

  useEffect(() => {
    if (!signedIn) return
    // Loading from the server is the effect's job; the state it sets is its result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [signedIn, refresh])

  const draft = scopeToSend(mode, picked, existing)

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const choice = (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">
        {t('claude.choice.title')}
      </legend>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="radio"
          name="claude-mode"
          checked={mode === 'all'}
          onChange={() => setMode('all')}
          className="size-5"
          data-testid="claude-mode-all"
        />
        {t('claude.choice.all')}
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="radio"
          name="claude-mode"
          checked={mode === 'some'}
          onChange={() => setMode('some')}
          className="size-5"
          data-testid="claude-mode-some"
        />
        {t('claude.choice.some')}
      </label>
      {mode === 'some' && (
        <ul className="ml-8">
          {(notebooks ?? []).map((n) => (
            <li key={n.id}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={picked.has(n.id)}
                  onChange={() => toggle(n.id)}
                  className="size-5"
                  data-testid="claude-nb"
                />
                {sampleName(n) || t('review.untitled')}
              </label>
            </li>
          ))}
          {draft === undefined && (
            <li className="text-xs text-muted" role="status">
              {t('claude.choice.none')}
            </li>
          )}
        </ul>
      )}
    </fieldset>
  )

  const turnOn = async (secret: string) => {
    if (draft === undefined) return 'error' as const
    try {
      const key = await keyForClaude(secret)
      if (!key) return 'wrong' as const
      const r = await claudeEnable(
        await accountAuth().accessToken(),
        key,
        draft,
      )
      if (!r.ok) {
        setLoad({ kind: 'error', reason: failure(r) })
        return 'error' as const
      }
      await refresh()
      return 'ok' as const
    } catch {
      return 'error' as const
    }
  }

  const saveChoice = async () => {
    if (draft === undefined) return
    setBusy(true)
    setMessage(null)
    try {
      const r = await claudeSetNotebooks(
        await accountAuth().accessToken(),
        draft,
      )
      setMessage(r.ok ? 'saved' : 'error')
      if (r.ok) await refresh()
    } catch {
      setMessage('error')
    }
    setBusy(false)
  }

  const turnOff = async () => {
    setConfirmOff(false)
    setBusy(true)
    setMessage(null)
    try {
      const r = await claudeDisable(await accountAuth().accessToken())
      if (!r.ok) setMessage('error')
      else await refresh()
    } catch {
      setMessage('error')
    }
    setBusy(false)
  }

  const revoke = async (app: ConnectedApp) => {
    setBusy(true)
    try {
      await revokeApp(await accountAuth().accessToken(), app.family)
      await refresh()
    } catch {
      setMessage('error')
    }
    setBusy(false)
  }

  return (
    <section
      data-testid="claude-section"
      className="mb-6 flex flex-col gap-4"
      aria-labelledby="claude-title"
    >
      <h2 id="claude-title" className="text-base font-semibold">
        {t('claude.title')}
      </h2>
      <p className="text-sm">{t('claude.what')}</p>
      <div className="rounded-lg border border-line p-3 text-sm">
        <h3 className="mb-1 font-medium">{t('claude.privacy.title')}</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>{t('claude.privacy.1')}</li>
          <li>{t('claude.privacy.2')}</li>
          <li>{t('claude.privacy.3')}</li>
        </ul>
      </div>

      {!signedIn ? (
        <p className="text-sm" role="status">
          {t('claude.error.login')}
        </p>
      ) : sync.phase === 'needsSetup' ? (
        <p className="text-sm" role="status">
          {t('claude.noSync')}
        </p>
      ) : load.kind === 'loading' ? (
        <p className="text-sm text-muted" role="status">
          {t('claude.loading')}
        </p>
      ) : load.kind === 'error' ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm" role="alert">
            {t(
              load.reason === 'login'
                ? 'claude.error.login'
                : load.reason === 'unavailable'
                  ? 'claude.error.unavailable'
                  : 'claude.error.generic',
            )}
          </p>
          {load.reason !== 'unavailable' && (
            <button
              type="button"
              className={button}
              onClick={() => {
                setLoad({ kind: 'loading' })
                void refresh()
              }}
            >
              {t('claude.retry')}
            </button>
          )}
        </div>
      ) : !load.status.available ? (
        <p className="text-sm" role="status">
          {t('claude.error.unavailable')}
        </p>
      ) : load.status.on ? (
        <>
          <p className="text-sm font-medium" data-testid="claude-state">
            {t('claude.state.on')}
          </p>
          {load.status.lastUsedAt !== null &&
            load.status.expiresAt !== null && (
              <p className="text-sm text-muted">
                {t('claude.lastUsed', {
                  when: when(load.status.lastUsedAt),
                  expires: when(load.status.expiresAt),
                })}
              </p>
            )}
          {choice}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={button}
              disabled={
                busy ||
                draft === undefined ||
                sameChoice(draft, load.status.notebookIds)
              }
              onClick={() => void saveChoice()}
            >
              {t('claude.saveChoice')}
            </button>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setConfirmOff(true)}
              data-testid="claude-off"
            >
              {t('claude.turnOff')}
            </button>
            {message && (
              <span className="text-sm" role="status">
                {t(
                  message === 'saved' ? 'claude.saved' : 'claude.error.generic',
                )}
              </span>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium">
              {t('claude.apps.title')}
            </h3>
            {load.apps.length === 0 ? (
              <p className="text-sm text-muted">{t('claude.apps.none')}</p>
            ) : (
              <ul>
                {load.apps.map((a) => (
                  <li
                    key={a.family}
                    className="flex min-h-11 items-center justify-between gap-3 text-sm"
                    data-testid="claude-app"
                  >
                    <span>
                      {t('claude.apps.row', {
                        name: a.name,
                        when: when(a.lastUsedAt),
                      })}
                    </span>
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      aria-label={t('claude.apps.revokeFor', { name: a.name })}
                      onClick={() => void revoke(a)}
                    >
                      {t('claude.apps.revoke')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium" data-testid="claude-state">
            {t('claude.state.off')}
          </p>
          {choice}
          <UnlockForm
            kinds={['passphrase']}
            title={t('claude.pass.title')}
            help={t('claude.pass.help')}
            submitLabel={t('claude.pass.submit')}
            testId="claude-unlock"
            submit={turnOn}
          />
        </>
      )}
      {confirmOff && (
        <ConfirmDialog
          message={t('claude.turnOff.confirm')}
          confirmLabel={t('claude.turnOff')}
          onConfirm={() => void turnOff()}
          onCancel={() => setConfirmOff(false)}
        />
      )}
    </section>
  )
}
