import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import { resolveChoice } from './syncService'
import type { SyncChoiceCounts } from './syncStatus'

const row =
  'flex min-h-11 w-full flex-col items-start rounded-lg border border-line px-4 py-2 text-left hover:bg-hover disabled:opacity-50'

/**
 * Signed back in after a remote sign-out, and this device has changes the
 * cloud does not: how to join them. Merge both is the default; nothing is
 * deleted (the other version always goes to the page's History).
 */
export function SyncChoiceDialog({ counts }: { counts: SyncChoiceCounts }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])
  const pick = (p: 'merge' | 'here' | 'there') => {
    setBusy(true)
    void resolveChoice(p)
  }
  const line = (pages: number, items: number) =>
    pages > 0
      ? t('sync.choice.pages', { count: pages })
      : items > 0
        ? t('sync.choice.items', { count: items })
        : t('sync.choice.nothing')
  return (
    <dialog
      ref={ref}
      role="alertdialog"
      data-testid="sync-choice"
      aria-labelledby="sc-title"
      aria-describedby="sc-text"
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 id="sc-title" className="mb-1.5 text-[15px] font-semibold">
        {t('sync.choice.title')}
      </h2>
      <div id="sc-text" className="mb-4 space-y-1 text-sm text-muted">
        <p>{t('sync.choice.text')}</p>
        <p data-testid="choice-here">
          {t('sync.choice.here', {
            n: line(counts.pagesHere, counts.itemsHere),
          })}
        </p>
        <p data-testid="choice-there">
          {t('sync.choice.there', {
            n: line(counts.pagesThere, counts.itemsThere),
          })}
        </p>
        <p>{t('sync.choice.safe')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={() => pick('merge')}
          className="flex min-h-11 w-full flex-col items-start rounded-lg bg-accent px-4 py-2 text-left text-white disabled:opacity-50"
        >
          <span className="text-sm font-semibold">
            {t('sync.choice.merge')}
          </span>
          <span className="text-xs opacity-90">
            {t('sync.choice.mergeHelp')}
          </span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => pick('here')}
          className={row}
        >
          <span className="text-sm font-medium">
            {t('sync.choice.useHere')}
          </span>
          <span className="text-xs text-muted">
            {t('sync.choice.hereHelp')}
          </span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => pick('there')}
          className={row}
        >
          <span className="text-sm font-medium">
            {t('sync.choice.useThere')}
          </span>
          <span className="text-xs text-muted">
            {t('sync.choice.thereHelp')}
          </span>
        </button>
      </div>
    </dialog>
  )
}
