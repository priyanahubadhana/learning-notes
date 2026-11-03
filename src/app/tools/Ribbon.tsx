import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import { isApple } from '../keys'
import { Icon } from './icons'
import { ToolButton } from './ToolButton'
import {
  TAB_GROUPS,
  groupLabel,
  ribbonGroup,
  tabLabel,
  type TabId,
} from './toolRegistry'
import {
  hiddenTabs,
  ribbonExpanded,
  ribbonOpen,
  ribbonTab,
  stayOpen,
  toggleRibbonBehaviour,
  visibleTabs,
} from './toolbarState'
import { getAppActions } from './toolRuntime'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const tabId = (tab: TabId) => `ribbon-tab-${tab}`
const PANEL_ID = 'ribbon-panel'

/**
 * The full ribbon that replaces the short bar: tabs (File, Home, Insert,
 * Draw, View, Review) and, under the chosen tab, its tools in groups.
 * Two behaviours, in plain words: "Tools close after use" (a tap on a tab
 * shows its tools; they close after a tool is used or a tap outside) and
 * "Tools stay open". Ctrl/Cmd+F1 switches between them.
 */
export function Ribbon({
  px,
  activeOf,
  tip,
  hint,
}: {
  px: number
  /** Whether a tool is "on" (bold, a list …). */
  activeOf: (id: string) => boolean
  tip: boolean
  hint: boolean
}) {
  const tab = ribbonTab.useValue()
  const expanded = ribbonExpanded.useValue()
  const stay = stayOpen.useValue()
  const hidden = hiddenTabs.useValue()
  const tabs = visibleTabs(hidden)
  const current = tabs.includes(tab) ? tab : tabs[0]
  const root = useRef<HTMLDivElement>(null)
  const size = Math.max(px, 44)

  // "Tools stay open" keeps the tools showing.
  const shown = stay || expanded

  // A tap or Esc outside closes the tools (unless they stay open).
  useEffect(() => {
    if (!shown || stay) return
    const onDown = (e: Event) => {
      const wrapper = root.current?.closest('[data-bar="docked"]')
      if (wrapper && wrapper.contains(e.target as Node)) return
      if ((e.target as HTMLElement | null)?.closest('.bn-container')) return
      ribbonExpanded.set(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      ribbonExpanded.set(false)
      root.current?.querySelector<HTMLElement>(`#${tabId(current)}`)?.focus()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [shown, stay, current])

  const choose = (next: TabId) => {
    if (next === current && shown && !stay) ribbonExpanded.set(false)
    else {
      ribbonTab.set(next)
      ribbonExpanded.set(true)
    }
  }

  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const at = tabs.indexOf(
      (document.activeElement as HTMLElement | null)?.dataset.tab as TabId,
    )
    const last = tabs.length - 1
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? last
          : (at + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    const list = e.currentTarget
    list.querySelector<HTMLElement>(`[data-tab="${tabs[next]}"]`)?.focus()
  }

  const afterUse = () => {
    if (!stay) ribbonExpanded.set(false)
  }

  const control =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm whitespace-nowrap text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors'

  return (
    <div ref={root} data-ribbon className="grid gap-1 px-0.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1 phone:grid-cols-1">
        <div
          role="tablist"
          aria-label={t('ribbon.label')}
          onKeyDown={arrows}
          className="flex min-w-0 gap-0.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {tabs.map((name) => {
            const on = name === current
            return (
              <button
                key={name}
                id={tabId(name)}
                type="button"
                role="tab"
                data-tab={name}
                aria-selected={on}
                aria-controls={on && shown ? PANEL_ID : undefined}
                tabIndex={on ? 0 : -1}
                onMouseDown={keepFocus}
                onClick={() => choose(name)}
                style={{ minHeight: size }}
                className={`relative shrink-0 rounded-xl px-4 text-sm motion-safe:transition-colors ${
                  on
                    ? 'font-semibold text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-accent'
                    : 'text-ink-soft hover:bg-hover hover:text-ink'
                }`}
              >
                {tabLabel(name)}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-end gap-1 phone:justify-between">
          <Tip id="ribbon.behaviour" touchInfo={false}>
            <button
              type="button"
              data-bar-btn
              data-action="ribbonBehaviour"
              aria-pressed={stay}
              title={`${t(stay ? 'ribbon.stay' : 'ribbon.close')} (${getShortcut()})`}
              onMouseDown={keepFocus}
              onClick={() => void toggleRibbonBehaviour()}
              style={{ minHeight: size }}
              className={`${control} ${stay ? 'bg-hover !text-ink' : ''}`}
            >
              <Icon name={stay ? 'pin' : 'pinOff'} size={18} />
              {t(stay ? 'ribbon.stay' : 'ribbon.close')}
            </button>
          </Tip>
          <button
            type="button"
            data-bar-btn
            data-action="controlPanel"
            aria-label={t('bar.search')}
            title={t('bar.search')}
            onMouseDown={keepFocus}
            onClick={() => getAppActions()?.openControlPanel()}
            style={{ minHeight: size, minWidth: size }}
            className={control}
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            data-bar-btn
            data-action="shortBar"
            onMouseDown={keepFocus}
            onClick={() => {
              ribbonOpen.set(false)
              ribbonExpanded.set(false)
            }}
            style={{ minHeight: size }}
            className={`${control} bg-hover !text-ink`}
          >
            <Icon name="chevronUp" size={18} />
            {t('ribbon.shortBar')}
          </button>
        </div>
      </div>
      {shown && (
        <div
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(current)}
          className="flex items-stretch gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {TAB_GROUPS[current].map((group) => {
            const tools = ribbonGroup(current, group)
            if (tools.length === 0) return null
            return (
              <div
                key={group}
                role="group"
                aria-label={groupLabel(group)}
                className="flex shrink-0 flex-col rounded-xl border border-line px-1 pt-1"
              >
                <div className="flex gap-0.5">
                  {tools.map((tool) => (
                    <ToolButton
                      key={tool.id}
                      tool={tool}
                      px={px}
                      variant="ribbon"
                      active={activeOf(tool.id) || undefined}
                      tip={tip}
                      hint={hint}
                      onRun={afterUse}
                    />
                  ))}
                </div>
                <span className="px-1 pb-0.5 text-center text-[11px] text-ink-soft">
                  {groupLabel(group)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getShortcut(): string {
  return isApple() ? '⌘F1' : 'Ctrl+F1'
}
