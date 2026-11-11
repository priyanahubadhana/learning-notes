import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../app/ui'
import { t } from '../i18n/t'
import { getConnectors, type ConnectorDevice } from './connectors'

const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'

const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

/**
 * Settings › Account › Connected computers: the PCs where the local Claude
 * connector (mcp/) is set up, each with Revoke. Revoke is enforced by the
 * database, so the computer is cut off at once, even before its pass runs out.
 */
export function ConnectedComputers() {
  const [list, setList] = useState<ConnectorDevice[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [asking, setAsking] = useState<ConnectorDevice | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const [reload, setReload] = useState(0)
  useEffect(() => {
    let live = true
    const store = getConnectors().records
    void (store.connectorDevices?.() ?? Promise.resolve([])).then(
      (l) => {
        if (!live) return
        setList(l)
        setLoadFailed(false)
      },
      () => live && setLoadFailed(true),
    )
    return () => {
      live = false
    }
  }, [reload])

  const revoke = async (d: ConnectorDevice) => {
    setBusy(true)
    setFailed(false)
    try {
      await getConnectors().records.revokeConnectorDevice?.(d.sessionId)
      setReload((n) => n + 1)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const live = (list ?? []).filter((d) => d.revokedAt === null)
  const gone = (list ?? []).filter((d) => d.revokedAt !== null).slice(0, 3)
  return (
    <div className="flex flex-col gap-3" data-testid="connected-computers">
      <p className="text-sm text-muted">{t('computers.hint')}</p>
      {loadFailed && (
        <p role="alert" className="text-sm text-danger">
          {t('computers.loadFailed')}
        </p>
      )}
      {list && live.length === 0 && !loadFailed && (
        <p className="text-sm">{t('computers.empty')}</p>
      )}
      <ul className="flex flex-col gap-2">
        {[...live, ...gone].map((d) => (
          <li
            key={d.sessionId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
            data-testid="computer-row"
          >
            <div className={d.revokedAt ? 'opacity-60' : ''}>
              <p className="text-sm font-medium">
                {d.name} <span className="text-muted">({d.deviceId})</span>
              </p>
              <p className="text-xs text-muted">
                {d.revokedAt
                  ? `${t('computers.revoked')} · ${when(d.revokedAt)}`
                  : t('computers.lastSeen', { when: when(d.lastSeenAt) })}
              </p>
            </div>
            {!d.revokedAt && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => setAsking(d)}
              >
                {t('computers.revoke')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('computers.failed')}
        </p>
      )}
      {asking && (
        <ConfirmDialog
          message={t('computers.revokeConfirm', { name: asking.name })}
          confirmLabel={t('computers.revokeGo')}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            const d = asking
            setAsking(null)
            void revoke(d)
          }}
        />
      )}
    </div>
  )
}
