import {
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { t } from '../../i18n/t'
import { SidebarResizer } from '../SidebarResizer'
import type { Space } from '../spaces/spaces'
import { OverSide, PanelSlot, SideSlot } from './ColumnSlots'
import { columnsFor, effectiveSidebarWidth } from './columns'
import { type GearActions } from './GearMenu'
import { Rail } from './Rail'
import { ShellTopBar } from './ShellTopBar'
import { TabBar } from './TabBar'
import { useDue } from './useDue'
import { useEscape } from './useEscape'
import { useFrameSize } from './useFrameSize'
import './shell.css'

/**
 * Everything the frame needs from the app. The app keeps all the state (its
 * routes, saved sidebar width and the rest); the frame only draws it, so
 * there is no second source of truth.
 */
export interface ShellProps {
  space: Space
  spaces: Space[]
  onSelectSpace: (space: Space) => void
  gear: GearActions
  /** Changes whenever the screen changes (closes a sidebar opened over the page). */
  routeKey: string
  title: string | null
  sidebarHidden: boolean
  onToggleSidebar: () => void
  drawerOpen: boolean
  onOpenDrawer: () => void
  onCloseDrawer: () => void
  /** A notebook or book is open, so there is a pages panel to show. */
  hasPanel: boolean
  panelOpen: boolean
  onPanelOpen: (open: boolean) => void
  sidebarWidth: number
  onSidebarWidth: (width: number) => void
  onSearch: () => void
  onSlot: (element: HTMLElement | null) => void
  onStackSlot: (element: HTMLElement | null) => void
  /** The sidebar. `hidden` is true while its toggle has it off. */
  sidebar: (o: { hidden: boolean }) => ReactNode
  /** The pages panel; `docked` false means an overlay (phone). */
  panel: (o: {
    docked: boolean
    width: number
    onClose: () => void
  }) => ReactNode
  /** Under the bars: the page area. */
  children: ReactNode
}

function focusMain() {
  const main = document.querySelector<HTMLElement>('[data-page-scroller]')
  if (!main) return
  main.tabIndex = -1
  main.focus()
}

/** SH-01: the new app frame (rail, top bar, sidebar, pages panel, phone tab bar). */
export default function Shell(p: ShellProps) {
  const {
    space,
    routeKey,
    sidebarHidden,
    onToggleSidebar,
    drawerOpen,
    onCloseDrawer,
    hasPanel,
    panelOpen,
    onPanelOpen,
    sidebarWidth,
    onSidebarWidth,
    onSelectSpace,
    onOpenDrawer,
    onSearch,
    onSlot,
    onStackSlot,
    gear,
    spaces,
    title,
    sidebar,
    panel,
    children,
  } = p
  const { width, height } = useFrameSize()
  const due = useDue(gear.db)
  // The sidebar opened over the page lasts for the screen it was opened on.
  const [overAt, setOverAt] = useState<string | null>(null)
  const sideOver = overAt === routeKey
  const panelShown = hasPanel && panelOpen
  const base = { width, height, sidebarHidden, panelOpen: panelShown }
  const cols = columnsFor({ ...base, sideOver })
  const stepped = columnsFor({ ...base, sideOver: false }).steppedAside

  const closeOver = useCallback(() => setOverAt(null), [])
  const closePanel = useCallback(() => onPanelOpen(false), [onPanelOpen])
  useEscape(cols.sidebar === 'over', closeOver)
  useEscape(cols.phone && cols.panel === 'over', closePanel)

  const toggleSidebar = () =>
    stepped ? setOverAt(sideOver ? null : routeKey) : onToggleSidebar()
  const sidebarOff = stepped ? !sideOver : sidebarHidden
  const drawn = effectiveSidebarWidth(sidebarWidth)

  const nav = {
    spaces,
    current: space,
    onSelect: onSelectSpace,
    due,
    gear,
  }
  const frameStyle: CSSProperties = {
    paddingTop: 'calc(var(--attn-h, 0px) + var(--frame-gap))',
  }

  return (
    <div data-app-shell className="sh-frame bg-wash" style={frameStyle}>
      <button type="button" className="sh-skip" onClick={focusMain}>
        {t('shell.skip')}
      </button>
      <div className="sh-row">
        {!cols.phone && <Rail {...nav} />}
        <SideSlot cols={cols} width={drawn} render={sidebar} />
        {cols.sidebar === 'docked' && (
          <SidebarResizer width={drawn} onChange={onSidebarWidth} />
        )}
        <PanelSlot
          cols={cols}
          render={(o) => panel({ ...o, onClose: closePanel })}
        />
        <div className="sh-main">
          {/* One glass layer for the top bar and the tool bar (blur budget).
              It is a sibling behind the bars, so a floating bar inside is
              never trapped by a backdrop filter on the wrapper. */}
          <div
            data-frame-bars
            className="relative shrink-0 rounded-[var(--r-lg)]"
          >
            <div
              aria-hidden
              className="glass pointer-events-none absolute inset-0 rounded-[inherit] phone:rounded-none phone:border-x-0 phone:border-t-0 phone:shadow-none"
            />
            <ShellTopBar
              space={space}
              title={title}
              sidebarHidden={sidebarOff}
              drawerOpen={drawerOpen}
              onOpenDrawer={onOpenDrawer}
              onToggleSidebar={toggleSidebar}
              panel={
                hasPanel
                  ? { open: panelOpen, onToggle: () => onPanelOpen(!panelOpen) }
                  : undefined
              }
              onSelectSpace={onSelectSpace}
              onSearch={onSearch}
              onSlot={onSlot}
            />
            <div
              ref={onStackSlot}
              data-chrome
              data-bar-slot
              className="relative pb-1 empty:p-0"
            />
          </div>
          {children}
        </div>
        <OverSide cols={cols} render={sidebar} onClose={closeOver} />
        {cols.phone && drawerOpen && (
          // A second way to close the drawer for fingers; the sidebar's own
          // button is the one for keyboards and screen readers.
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="sh-scrim sh-scrim-phone"
            onClick={onCloseDrawer}
          />
        )}
      </div>
      {cols.phone && <TabBar {...nav} />}
    </div>
  )
}
