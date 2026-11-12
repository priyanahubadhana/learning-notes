import { Fragment, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { t, type MessageKey } from '../../i18n/t'
import { db } from '../../core/db'
import { useDeviceSetting, useSyncedSetting } from '../../settings/useSetting'
import {
  deviceModeSetting,
  showRefreshSetting,
  showUndoRedoSetting,
} from '../../settings/builtinSettings'
import { useSyncLabel } from '../../sync/useSyncLabel'
import { DeviceModeButton } from '../DeviceModeMenu'
import { useCanGoBack, useCanGoForward } from '../navHistory'
import type { Space } from '../spaces/spaces'
import { padHistoryState } from '../../editor/writePad/padHistory'
import { HistoryButtons } from '../tools/HistoryButtons'
import { showToolBar, useShowBarButton } from '../tools/toolbarVisibility'
import { crumbsFor } from './crumbs'
import { statusFor } from './status'
import { showHistoryPair } from './historyTips'
import { ShellIcon } from './shellIcons'
import { ViewToggle } from './ViewToggle'
import { useReaderInset } from './useReaderInset'
import type { ShellIconName } from './shellPaths'
import { hasUnsaved, onUnsavedChange } from '../saveStatus'

export interface ShellTopBarProps {
  space: Space
  /** The screen's name; a page puts its own path here. */
  title: string | null
  sidebarHidden: boolean
  /** The sidebar is on the rail for lack of room: its button opens it over the page, like a drawer. */
  steppedAside?: boolean
  drawerOpen: boolean
  onOpenDrawer: () => void
  onToggleSidebar: () => void
  /** The pages panel button: only while a notebook or book is open. */
  panel?: { open: boolean; onToggle: () => void }
  onSelectSpace: (space: Space) => void
  onSearch: () => void
  /** The slot where a screen puts its own top-bar items. */
  onSlot: (element: HTMLElement | null) => void
}

function Btn({
  icon,
  label,
  onClick,
  disabled,
  pressed,
  testId,
  className = '',
  controls,
  expanded,
  lead,
}: {
  icon: ShellIconName
  label: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  testId?: string
  className?: string
  controls?: string
  expanded?: boolean
  /** A leading menu button: the reader's bars start after it. */
  lead?: boolean
}) {
  return (
    <button
      type="button"
      className={`sh-tb ${className}`}
      aria-label={label}
      disabled={disabled}
      aria-pressed={pressed}
      aria-controls={controls}
      aria-expanded={expanded}
      data-testid={testId}
      data-lead={lead ? '' : undefined}
      onClick={onClick}
    >
      <ShellIcon name={icon} size={20} />
    </button>
  )
}

/**
 * SH-04: the one top bar (52 px, flat). Left to right: sidebar toggle, pages
 * panel toggle, Back, Forward, Undo, Redo, breadcrumbs (the slot where a
 * screen adds its own items), status, Refresh, Device mode, Search.
 */
export function ShellTopBar(props: ShellTopBarProps) {
  const {
    space,
    title,
    sidebarHidden,
    steppedAside,
    drawerOpen,
    onOpenDrawer,
    onToggleSidebar,
    panel,
    onSelectSpace,
    onSearch,
    onSlot,
  } = props
  const barRef = useRef<HTMLElement | null>(null)
  useReaderInset(barRef)
  const canGoBack = useCanGoBack()
  const canGoForward = useCanGoForward()
  const barOff = useShowBarButton()
  // The editor toolbar's pair counted the Write pad's steps too; so does this one.
  const pad = padHistoryState.useValue()
  const [mode] = useDeviceSetting(deviceModeSetting)
  const [undoPref] = useDeviceSetting(showUndoRedoSetting)
  const showRefresh = useSyncedSetting(db, showRefreshSetting)
  const unsaved = useSyncExternalStore(onUnsavedChange, hasUnsaved)
  const sync = useSyncLabel()
  const spaceName = t(`space.${space}` as MessageKey)
  const crumbs = crumbsFor(space, spaceName, title, !!panel)
  const toggleName = steppedAside
    ? t(sidebarHidden ? 'nav.openMenu' : 'nav.hideMenu')
    : t(sidebarHidden ? 'nav.showMenu' : 'nav.hideMenu')
  const status = statusFor({
    unsaved,
    syncLabel: sync?.display === 'offline' ? sync.label : null,
    editing: !!panel,
  })

  return (
    <header
      ref={barRef}
      data-chrome
      data-shell-top
      aria-label={t('shell.top')}
      className="sh-top"
    >
      {/* Phones: a drawer over the page. Elsewhere: hide or show the sidebar. */}
      <span className="sh-phone-only">
        <Btn
          icon="sidebar"
          label={t('nav.openMenu')}
          controls="sidebar"
          expanded={drawerOpen}
          lead
          onClick={onOpenDrawer}
        />
      </span>
      <span className="sh-wide-only">
        <Btn
          icon="sidebar"
          label={toggleName}
          controls="sidebar"
          expanded={!sidebarHidden}
          lead
          onClick={onToggleSidebar}
        />
      </span>
      {panel && (
        <Btn
          icon="panel"
          label={t('lp.open')}
          testId="panel-toggle"
          pressed={panel.open}
          lead
          onClick={panel.onToggle}
        />
      )}
      <Btn
        icon="back"
        label={t('nav.back')}
        disabled={!canGoBack}
        onClick={() => history.back()}
      />
      <Btn
        className="sh-hide-narrow"
        icon="fwd"
        label={t('nav.forward')}
        disabled={!canGoForward}
        onClick={() => history.forward()}
      />
      {showHistoryPair(mode, undoPref) && (
        <HistoryButtons className="sh-history" tips also={pad} />
      )}
      <div ref={onSlot} className="sh-slot">
        <nav aria-label={t('shell.crumbs')} className="sh-crumbs">
          {crumbs.map((c, i) => {
            const plain = !c.space
            return (
              <Fragment key={i}>
                {i > 0 && <ShellIcon name="chevR" size={14} />}
                {plain ? (
                  <b aria-current="page">{c.label}</b>
                ) : (
                  <button
                    type="button"
                    onClick={() => c.space && onSelectSpace(c.space)}
                  >
                    {c.label}
                  </button>
                )}
              </Fragment>
            )
          })}
        </nav>
      </div>
      {status && (
        <span
          // Only a problem is announced; "Saved" is quiet text.
          role={unsaved || sync?.display === 'offline' ? 'status' : undefined}
          className="sh-status"
          data-testid="shell-status"
        >
          {status}
        </span>
      )}
      {showRefresh === 'on' && (
        <Btn
          icon="refresh"
          label={t('nav.refresh')}
          testId="topbar-refresh"
          onClick={() =>
            void import('../softRefresh').then((m) => m.refreshNow())
          }
        />
      )}
      <span className="sh-hide-phone">
        <DeviceModeButton />
      </span>
      <ViewToggle />
      <Btn
        icon="search"
        label={t('shell.search')}
        testId="shell-search"
        onClick={onSearch}
      />
      {barOff && (
        <button
          type="button"
          data-testid="show-tool-bar"
          onClick={showToolBar}
          className="sh-pill"
        >
          {t('bar.show')}
        </button>
      )}
    </header>
  )
}
