import { useRef, type KeyboardEvent } from 'react'
import { LayoutButton } from './LayoutButton'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import { isApple } from '../keys'
import { isEditorPopup, usePopup } from '../popups'
import { Icon } from './icons'
import { ScrollFade } from './ScrollFade'
import { RibbonOptions } from './RibbonOptions'
import { ToolButton } from './ToolButton'
import {
  TAB_GROUPS,
  groupLabel,
  findTool,
  ribbonGroup,
  tabLabel,
  type TabId,
} from './toolRegistry'
import {
  hiddenTabs,
  ribbonExpanded,
  ribbonOpen,
  ribbonSize,
  ribbonTab,
  stayOpen,
  toggleRibbonBehaviour,
  visibleTabs,
} from './toolbarState'
import { getAppActions } from './toolRuntime'
import { contextTabOn, selectionContext } from './context/contextStore'
import { ContextStrip } from './context/ContextStrip'
import { contextTabLabel } from './context/stripItems'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const tabId = (tab: TabId) => `ribbon-tab-${tab}`
const PANEL_ID = 'ribbon-panel'

/**
 * The full ribbon that replaces the short bar: tabs (File, Home, Insert,
 * Draw, View, Review) and, under the chosen tab, its tools in groups.
 * Two behaviours, in plain words: "Tools close after use" (a tap on a tab
 * shows its tools; they close after a tool is used or a tap outside) and
 * "Tools stay open". Ctrl/Cmd+F1 switches between them. The behaviour button
 * is an icon only (name for screen readers and the tooltip) so the six tabs,
 * the search and the Short bar button fit at iPad widths: when they do not
 * fit in one row, the buttons wrap under the tabs.
 */
export function Ribbon({
  px,
  both,
  activeOf,
  tip,
  hint,
  history,
}: {
  px: number
  /** The short bar shows too ("Ribbon + short bar"). */
  both: boolean
  /** Whether a tool is "on" (bold, a list …). */
  activeOf: (id: string) => boolean
  tip: boolean
  hint: boolean
  /** Undo and Redo are pinned at the left, outside the scrolling tools. */
  history?: { canUndo: boolean; canRedo: boolean }
}) {
  const tab = ribbonTab.useValue()
  const expanded = ribbonExpanded.useValue()
  const stay = stayOpen.useValue()
  const hidden = hiddenTabs.useValue()
  const tabs = visibleTabs(hidden)
  const current = tabs.includes(tab) ? tab : tabs[0]
  const root = useRef<HTMLDivElement>(null)
  const size = Math.max(px, 44)
  const slim = ribbonSize.useValue() === 'slim'

  // "Tools stay open" keeps the tools showing; Slim always shows them (they
  // are the one row of icons).
  const ctx = selectionContext.useValue()
  const ctxOn = contextTabOn.useValue() && ctx !== null
  const shown = stay || expanded || slim || ctxOn

  // The shared pop-up rule: a tap outside, Esc, a scroll, navigating or another
  // pop-up opening closes the tools (unless they stay open).
  usePopup(
    shown && !stay && !slim && !ctxOn,
    () => ribbonExpanded.set(false),
    (el) => el.closest('[data-ribbon]') !== null || isEditorPopup(el),
    {
      onEscape: () =>
        root.current?.querySelector<HTMLElement>(`#${tabId(current)}`)?.focus(),
    },
  )

  const choose = (next: TabId) => {
    contextTabOn.set(false)
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

  const panel =
    ctxOn && ctx ? (
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby="ribbon-tab-ctx"
        className="min-w-0 flex-1"
      >
        <ContextStrip kind={ctx} />
      </div>
    ) : (
      shown && (
        <ScrollFade
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(current)}
          snap
          className={
            slim
              ? 'flex min-w-[9rem] flex-1 basis-48 items-center gap-1'
              : 'flex items-stretch gap-1.5 pb-0.5'
          }
        >
          {TAB_GROUPS[current].map((group) => {
            const tools = ribbonGroup(current, group)
            if (tools.length === 0 || (history && group === 'undoRedo'))
              return null
            return (
              <div
                key={group}
                role="group"
                aria-label={groupLabel(group)}
                className={
                  slim
                    ? 'flex shrink-0 snap-start items-center gap-0.5 border-s border-line ps-1 first:border-s-0 first:ps-0'
                    : 'flex shrink-0 snap-start scroll-ms-1 flex-col rounded-xl border border-line px-1 pt-0.5'
                }
              >
                <div className="flex gap-0.5">
                  {tools.map((tool) => (
                    <ToolButton
                      key={tool.id}
                      tool={tool}
                      px={px}
                      // Slim: icons only, the name is the tooltip and the label.
                      variant={slim ? 'bar' : 'ribbon'}
                      active={activeOf(tool.id) || undefined}
                      tip={slim || tip}
                      hint={hint}
                      onRun={afterUse}
                    />
                  ))}
                </div>
                {!slim && (
                  <span className="px-1 pb-0.5 text-center text-[11px] text-ink-soft">
                    {groupLabel(group)}
                  </span>
                )}
              </div>
            )
          })}
        </ScrollFade>
      )
    )

  const undo = history ? findTool('undo') : undefined
  const redo = history ? findTool('redo') : undefined
  const pinned = history && (undo || redo) && (
    <div
      role="group"
      aria-label={t('main.history')}
      data-slot="history"
      className="flex shrink-0 rounded-xl bg-hover"
    >
      {undo && (
        <ToolButton
          tool={undo}
          px={size}
          variant="bar"
          disabled={!history.canUndo || undefined}
          tip={tip}
        />
      )}
      {redo && (
        <ToolButton
          tool={redo}
          px={size}
          variant="bar"
          disabled={!history.canRedo || undefined}
          tip={tip}
        />
      )}
    </div>
  )

  return (
    <>
      <div
        ref={root}
        data-ribbon
        data-size={slim ? 'slim' : 'full'}
        className="grid grid-cols-[minmax(0,1fr)] gap-0.5 px-0.5"
      >
        <div className="flex flex-wrap items-center gap-x-1">
          {pinned}
          {history && <LayoutButton px={size} />}
          <ScrollFade
            role="tablist"
            aria-label={t('ribbon.label')}
            onKeyDown={arrows}
            className={`flex min-w-0 gap-0.5 ${
              slim ? 'shrink-0' : 'flex-1 basis-[26rem]'
            }`}
          >
            {tabs.map((name) => {
              const on = name === current && !ctxOn
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
                  className={`relative shrink-0 rounded-xl text-sm motion-safe:transition-colors ${
                    slim ? 'px-2.5' : 'px-2.5 min-[1100px]:px-3.5'
                  } ${
                    on
                      ? 'font-semibold text-ink after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:bg-accent'
                      : 'text-ink-soft hover:bg-hover hover:text-ink'
                  }`}
                >
                  {tabLabel(name)}
                </button>
              )
            })}
            {ctx && (
              <button
                id="ribbon-tab-ctx"
                type="button"
                role="tab"
                data-tab="ctx"
                aria-selected={ctxOn}
                aria-controls={ctxOn ? PANEL_ID : undefined}
                tabIndex={ctxOn ? 0 : -1}
                onMouseDown={keepFocus}
                onClick={() => {
                  contextTabOn.set(true)
                  ribbonExpanded.set(true)
                }}
                style={{ minHeight: size, minWidth: 44 }}
                className={`relative shrink-0 rounded-xl px-3.5 text-sm font-semibold text-accent motion-safe:transition-colors ${
                  ctxOn
                    ? 'after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:bg-accent'
                    : 'hover:bg-hover'
                }`}
              >
                {contextTabLabel(ctx)}
              </button>
            )}
          </ScrollFade>
          {slim && panel}
          <div className="ms-auto flex items-center justify-end gap-0.5">
            {!slim && (
              <Tip id="ribbon.behaviour" touchInfo={false}>
                <button
                  type="button"
                  data-bar-btn
                  data-action="ribbonBehaviour"
                  aria-pressed={stay}
                  aria-label={t(stay ? 'ribbon.stay' : 'ribbon.close')}
                  aria-description={getShortcut()}
                  onMouseDown={keepFocus}
                  onClick={() => void toggleRibbonBehaviour()}
                  style={{ minHeight: size, minWidth: size }}
                  className={`${control} !text-ink ${stay ? 'bg-hover' : ''}`}
                >
                  <Icon name={stay ? 'pin' : 'pinOff'} size={18} />
                </button>
              </Tip>
            )}
            <button
              type="button"
              data-bar-btn
              data-action="controlPanel"
              aria-label={t('bar.search')}
              onMouseDown={keepFocus}
              onClick={() => getAppActions()?.openControlPanel()}
              style={{ minHeight: size, minWidth: size }}
              className={control}
            >
              <Icon name="search" />
            </button>
            <RibbonOptions px={size} />
            <button
              type="button"
              data-bar-btn
              data-action="shortBar"
              aria-label={t(both ? 'ribbon.hide' : 'ribbon.shortBar')}
              onMouseDown={keepFocus}
              onClick={() => {
                ribbonOpen.set(false)
                ribbonExpanded.set(false)
              }}
              style={{ minHeight: size, minWidth: slim ? size : undefined }}
              className={`${control} bg-hover !text-ink`}
            >
              <Icon name="chevronUp" size={18} />
              {!slim && t(both ? 'ribbon.hide' : 'ribbon.shortBar')}
            </button>
          </div>
        </div>
        {!slim && panel}
      </div>
    </>
  )
}

function getShortcut(): string {
  return isApple() ? '⌘F1' : 'Ctrl+F1'
}
