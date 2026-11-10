import { t } from '../i18n/t'
import { db } from '../core/db'
import { useCanGoBack, useCanGoForward } from './navHistory'
import { PanelLeft, RefreshCw } from 'lucide-react'
import { useSyncedSetting } from '../settings/useSetting'
import { showRefreshSetting } from '../settings/builtinSettings'
import { MenuIcon } from './ui'
import { DeviceModeButton } from './DeviceModeMenu'
import { showToolBar, useShowBarButton } from './tools/toolbarVisibility'

const ICON_BUTTON =
  'size-11 shrink-0 items-center justify-center rounded-lg text-ink-soft enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-35'

/** The bar above every screen: menu, ← →, then the screen's own items. */
export function TopBar({
  title,
  sidebarHidden,
  drawerOpen,
  onOpenDrawer,
  onToggleSidebar,
  panel,
  onSlot,
}: {
  /** The screen's name; pages put their own path here instead. */
  title: string | null
  sidebarHidden: boolean
  drawerOpen: boolean
  onOpenDrawer: () => void
  onToggleSidebar: () => void
  /** The left panel button (D1): shown while a page is open. */
  panel?: { open: boolean; onToggle: () => void }
  onSlot: (element: HTMLElement | null) => void
}) {
  const canGoBack = useCanGoBack()
  const canGoForward = useCanGoForward()
  const toggleName = t(sidebarHidden ? 'nav.showMenu' : 'nav.hideMenu')
  // While the tool bar is off, the way back stays in sight.
  const barOff = useShowBarButton()
  const showRefresh = useSyncedSetting(db, showRefreshSetting)

  return (
    <header
      data-chrome
      style={{
        paddingTop: 'var(--top-clear)',
        paddingLeft: 'max(8px, env(safe-area-inset-left))',
        paddingRight: 'max(8px, env(safe-area-inset-right))',
      }}
      className="relative flex min-h-13 shrink-0 items-center gap-0.5 "
    >
      {panel && (
        <button
          type="button"
          data-testid="panel-toggle"
          aria-label={t('lp.open')}
          aria-pressed={panel.open}
          onClick={panel.onToggle}
          className={`flex aria-pressed:text-accent ${ICON_BUTTON}`}
        >
          <PanelLeft aria-hidden size={20} strokeWidth={1.6} />
        </button>
      )}
      {/* Phones: a drawer over the page. Elsewhere: hide or show the sidebar. */}
      <button
        type="button"
        aria-label={t('nav.openMenu')}
        aria-controls="sidebar"
        aria-expanded={drawerOpen}
        onClick={onOpenDrawer}
        className={`hidden phone:flex ${ICON_BUTTON}`}
      >
        <MenuIcon />
      </button>
      <button
        type="button"
        aria-label={toggleName}
        aria-controls="sidebar"
        aria-expanded={!sidebarHidden}
        onClick={onToggleSidebar}
        className={`flex phone:hidden ${ICON_BUTTON}`}
      >
        <MenuIcon />
      </button>
      <button
        type="button"
        aria-label={t('nav.back')}
        disabled={!canGoBack}
        onClick={() => history.back()}
        className={`flex ${ICON_BUTTON}`}
      >
        <span aria-hidden className="text-xl leading-none">
          ←
        </span>
      </button>
      <button
        type="button"
        aria-label={t('nav.forward')}
        disabled={!canGoForward}
        onClick={() => history.forward()}
        className={`flex ${ICON_BUTTON}`}
      >
        <span aria-hidden className="text-xl leading-none">
          →
        </span>
      </button>
      {showRefresh === 'on' && (
        <button
          type="button"
          data-testid="topbar-refresh"
          aria-label={t('nav.refresh')}
          onClick={() =>
            void import('./softRefresh').then((m) => m.refreshNow())
          }
          className={`flex ${ICON_BUTTON}`}
        >
          <RefreshCw aria-hidden size={18} strokeWidth={1.6} />
        </button>
      )}
      <div
        ref={onSlot}
        className="flex min-w-0 flex-1 items-center gap-1 ps-1.5"
      >
        {title && <span className="min-w-0 truncate text-sm">{title}</span>}
      </div>
      <DeviceModeButton />
      {barOff && (
        <button
          type="button"
          data-testid="show-tool-bar"
          onClick={showToolBar}
          className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-xs text-ink-soft hover:bg-hover hover:text-ink"
        >
          {t('bar.show')}
        </button>
      )}
    </header>
  )
}
