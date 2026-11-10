import { useEffect } from 'react'
import { t } from '../i18n/t'
import { updateStatus } from './updateStatus'

const mb = (n: number) => (n / 1048576).toFixed(1)

/** The small, never-blocking update status (item 24), bottom-left. */
export default function UpdatePill() {
  const s = updateStatus.useValue()
  // Answers (not progress) go away by themselves.
  const brief = ['current', 'offline', 'failed', 'updated'].includes(s.phase)
  useEffect(() => {
    if (!brief) return
    const id = setTimeout(() => updateStatus.set({ phase: 'idle' }), 4000)
    return () => clearTimeout(id)
  }, [brief, s.phase])
  if (s.phase === 'idle') return null
  let text: string
  switch (s.phase) {
    case 'checking':
      text = t('upd.checking')
      break
    case 'downloading': {
      const total = s.total ?? 0
      text =
        total > 0
          ? t('upd.downloading', {
              loaded: mb(s.loaded ?? 0),
              total: mb(total),
              pct: Math.round(((s.loaded ?? 0) / total) * 100),
            })
          : t('upd.downloadingStart')
      if (s.etaS) text += ' · ' + t('upd.slow', { s: s.etaS })
      break
    }
    case 'installing':
      text = t('upd.installing')
      break
    case 'ready':
      text = t('upd.ready')
      break
    case 'updating':
      text = t('upd.updating')
      break
    case 'updated':
      text = t('upd.updated', { version: s.version ?? '' })
      break
    case 'current':
      text = t('upd.current')
      break
    case 'offline':
      text = t('upd.offline')
      break
    default:
      text = t('upd.failed')
  }
  const pct =
    s.phase === 'downloading' && s.total
      ? Math.min(100, ((s.loaded ?? 0) / s.total) * 100)
      : null
  return (
    <div
      role="status"
      aria-live="polite"
      data-chrome
      data-update-pill
      className="pointer-events-none fixed bottom-16 left-3 z-40 max-w-[min(320px,calc(100vw-24px))] rounded-xl border border-line bg-surface-3 px-3 py-2 text-[13px] text-ink shadow-[var(--elev-2)] phone:bottom-20"
    >
      <span>{text}</span>
      {pct !== null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
