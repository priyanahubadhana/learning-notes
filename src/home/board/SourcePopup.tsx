import { useEffect, useRef, type RefObject } from 'react'
import { openInTopLayer, type OverlayHandle } from '../../app/overlay'
import { t, type MessageKey } from '../../i18n/t'
import type { WidgetId } from './boardLogic'

/**
 * "Where this comes from": its own pop-up above everything. ✕, Esc and a tap
 * outside close it; the widget behind never changes.
 */
export function SourcePopup({
  id,
  opener,
  onClose,
}: {
  id: WidgetId
  opener: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const handle = useRef<OverlayHandle | null>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const h = openInTopLayer(el, {
      id: `home-source-${id}`,
      layer: 'dialog',
      mode: 'dialog',
      opener: opener.current,
      swallowOutsideTap: true,
      onClose: () => closeRef.current(),
    })
    handle.current = h
    return () => h.close()
  }, [id, opener])
  const name = t(`home.v2.w.${id}` as MessageKey)
  const rows = ['where', 'how', 'build'] as const
  return (
    <dialog
      ref={ref}
      data-testid="home-source-popup"
      aria-label={t('home.v2.sourceFor', { name })}
      onClick={(e) => {
        // A tap on the dimmed backdrop lands on the dialog itself.
        if (e.target === ref.current) handle.current?.close()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-0 text-ink shadow-xl backdrop:bg-black/30"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <h3 className="text-base font-semibold">
          {t('home.v2.sourceFor', { name })}
        </h3>
        <button
          type="button"
          aria-label={t('home.v2.sourceClose')}
          data-testid="home-source-close"
          onClick={() => handle.current?.close()}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3 text-sm">
        {rows.map((row) => (
          <section key={row}>
            <h4 className="font-semibold">
              {t(
                (row === 'where'
                  ? 'home.v2.sourceWhere'
                  : row === 'how'
                    ? 'home.v2.sourceHow'
                    : 'home.v2.sourceBuild') as MessageKey,
              )}
            </h4>
            <p className="text-ink-soft">
              {t(`home.v2.src.${id}.${row}` as MessageKey)}
            </p>
          </section>
        ))}
      </div>
    </dialog>
  )
}
