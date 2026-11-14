import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { Banner } from '../../design/parts/Banner'
import type { BannerItem } from '../../design/parts/bannerQueue'
import { Dialog } from '../../design/parts/Dialogs'
import { createOverlayManager, openInTopLayer } from '../overlay'
import { browserSnooze, snooze, type Attention } from './attentionLevel'
import { backUpWithToast } from './storageSafetyBackup'

/** SS-02: three steps and the why line; tap outside closes it too. */
function HomeScreenHelp({ onClose }: { onClose(): void }) {
  // React events bubble out of the dialog's portal: a tap on its dim layer closes it.
  return (
    <div
      className="contents"
      onPointerDown={(e) => {
        const el = e.target as HTMLElement
        if (el.classList.contains('fb-dialog-layer')) onClose()
      }}
    >
      <Dialog
        title={t('storageSafety.howTitle')}
        onCancel={onClose}
        onMain={onClose}
        mainLabel={t('storageSafety.done')}
        cancelLabel={null}
        data-testid="ss-howto"
      >
        <ol className="list-decimal space-y-1 ps-5">
          <li>{t('storageSafety.step1')}</li>
          <li>{t('storageSafety.step2')}</li>
          <li>{t('storageSafety.step3')}</li>
        </ol>
        <p className="mt-2 text-muted">{t('storageSafety.why')}</p>
        <button
          type="button"
          className="fb-btn mt-3"
          data-testid="ss-backup-first"
          onClick={() => void backUpWithToast()}
        >
          {t('storageSafety.backUpFirst')}
        </button>
      </Dialog>
    </div>
  )
}

/**
 * The banner sits in the top layer like the toasts, with a private manager:
 * Esc and outside taps never close it, and it never closes other overlays.
 */
const bannerLayer = createOverlayManager({
  onEscape: () => () => {},
  onPointerDown: () => () => {},
  onBackground: () => () => {},
})

const KIND = { homeScreen: 'install', storageFull: 'storage' } as const

/**
 * The three storage safety alerts drawn with the shared Banner part (D1).
 * Fixed at the top (top layer); the page moves down by its height (--attn-h).
 */
export function StorageSafetyBanner({
  attention,
  session,
  onDismissed,
}: {
  attention: Attention
  session: number
  onDismissed: () => void
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [help, setHelp] = useState(false)
  // Safari does not focus a button on tap, so the pop-up cannot find where to
  // return to: put focus back on "Show how" ourselves (SS-02b).
  const closeHelp = () => {
    setHelp(false)
    window.setTimeout(
      () =>
        wrap.current
          ?.querySelector<HTMLElement>('[data-testid="fb-banner-action"]')
          ?.focus(),
      0,
    )
  }
  useEffect(() => {
    const root = document.documentElement
    const el = wrap.current
    if (!el) return
    const size = () =>
      root.style.setProperty('--attn-h', `${el.offsetHeight}px`)
    size()
    const layer = openInTopLayer(
      el,
      { id: 'storage-banner', layer: 'bar' },
      bannerLayer,
    )
    const watch = new ResizeObserver(size)
    watch.observe(el)
    return () => {
      watch.disconnect()
      layer.close()
      root.style.removeProperty('--attn-h')
    }
  }, [])
  const code = attention.code
  const action: BannerItem['action'] =
    code === 'homeScreen'
      ? { label: t('storageSafety.showHow'), run: () => setHelp(true) }
      : code === 'storageFull'
        ? {
            label: t('storageSafety.backUp'),
            run: () => void backUpWithToast('full'),
          }
        : { label: t('storageSafety.reload'), run: () => location.reload() }
  const item: BannerItem = {
    id: code,
    kind: code === 'homeScreen' ? KIND.homeScreen : KIND.storageFull,
    text: t(
      code === 'homeScreen'
        ? 'storageSafety.homeScreen'
        : code === 'storageFull'
          ? 'storageSafety.full'
          : 'storageSafety.lost',
    ),
    action,
  }
  return (
    <div
      ref={wrap}
      aria-live="polite"
      data-chrome
      data-testid="attention-banner"
      data-code={code}
      className="fixed inset-x-0 top-0 bottom-auto m-0 h-auto w-full max-w-none overflow-visible border-0 bg-[var(--color-bg)] px-0 pb-0 pt-[env(safe-area-inset-top)] text-ink"
    >
      <Banner
        item={item}
        onClose={() => {
          snooze(attention, browserSnooze(), Date.now(), session)
          onDismissed()
        }}
      />
      {help ? <HomeScreenHelp onClose={closeHelp} /> : null}
    </div>
  )
}
