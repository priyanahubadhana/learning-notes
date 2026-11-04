import {
  BlockTypeSelect,
  CreateLinkButton,
  FileCaptionButton,
  FileDeleteButton,
  FileDownloadButton,
  FilePreviewButton,
  FileRenameButton,
  FileReplaceButton,
  useActiveStyles,
  useBlockNoteEditor,
  useEditorDOMElement,
  useEditorFocus,
} from '@blocknote/react'
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { Place } from '../app/tools/toolbarState'
import { AppUiContext } from '../app/appUi'
import { isApple } from '../app/keys'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import { useBarSettings } from '../settings/deviceModeSettings'
import { keepKnown } from '../app/deviceMode'
import { redoDepth, undoDepth } from 'prosemirror-history'
import { Icon } from '../app/tools/icons'
import { SetSwitch } from '../app/tools/SetSwitch'
import { ToolButton } from '../app/tools/ToolButton'
import { Ribbon } from '../app/tools/Ribbon'
import { barGroups } from '../app/tools/barLayout'
import { resetFreePos } from '../app/tools/freeBar'
import { isEditorPopup, usePopup } from '../app/popups'
import { BarStack } from './BarStack'
import { useBarLayout } from './useBarLayout'
import {
  PLACES,
  activeSet,
  ribbonExpanded,
  ribbonOpen,
  ribbonTab,
  tabForSet,
  toggleRibbonBehaviour,
  useSetTools,
} from '../app/tools/toolbarState'
import { allTools, findTool } from '../app/tools/toolRegistry'
import { getAppActions, setBarUi } from '../app/tools/toolRuntime'
import { useAutoBarSet } from '../app/tools/useAutoBarSet'
import { EditBarPanel } from './EditBarPanel'
import {
  allActionIds,
  useBarActions,
  type BarAction,
  type Editor,
} from './barActions'
import { clearSelection } from './lineActions'
import { ColorButton, ColorPanel } from './ColorPicker'
import { PopupHeader } from '../app/tools/PopupClose'
import {
  copyAs,
  copyPageWithPictures,
  pastePlainFromClipboard,
} from './clipboard'

/**
 * The short bar for touch screens and the Pencil: docked under the top bar
 * (or at the bottom). A Write · Draw · Read switch picks the tool set; each
 * set shows the tools the user chose. "All tools" and the search icon sit at
 * the end, then the ⋯ Toolbar menu and Done. Everything the floating toolbar
 * can do is in the ⋯ menu and under More.
 */

/** Keeps the editor's selection and keyboard when a bar button is pressed. */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/** Buttons that show their words instead of an icon. */
const TEXT_FACES = new Set(['blank', 'card', 'newLine'])
const hasTextFace = (id: string) => id.startsWith('mark:') || TEXT_FACES.has(id)

type Panel = 'more' | 'menu' | 'color' | 'edit'

export function DockedBar({ slot }: { slot: HTMLElement | null }) {
  const editor = useBlockNoteEditor() as unknown as Editor
  const mounted = useEditorDOMElement(editor as never)
  if (!slot || !mounted) return null
  return <Bar editor={editor} slot={slot} />
}

/** Which tools are "on" now (bold, a list, the highlight …). */
function useToolActive(editor: Editor): (id: string) => boolean {
  const styles = useActiveStyles(editor) as Record<string, unknown>
  const type = editor.getTextCursorPosition().block.type
  return (id) => {
    if (id === 'highlight') return styles.backgroundColor === 'yellow'
    if (id === 'bulletList') return type === 'bulletListItem'
    if (id === 'numberedList') return type === 'numberedListItem'
    if (id === 'checklist') return type === 'checkListItem'
    if (id === 'quote') return type === 'quote'
    return false
  }
}

/** Is there anything to undo or redo? Re-read whenever the page changes. */
function useHistoryState(editor: Editor) {
  const read = () => {
    const state = editor.prosemirrorView?.state
    return state
      ? { canUndo: undoDepth(state) > 0, canRedo: redoDepth(state) > 0 }
      : { canUndo: false, canRedo: false }
  }
  const [value, setValue] = useState(read)
  useEffect(() => {
    const update = () => {
      const next = read()
      setValue((old) =>
        old.canUndo === next.canUndo && old.canRedo === next.canRedo
          ? old
          : next,
      )
    }
    update()
    const offChange = editor.onChange(update)
    const offSelect = editor.onSelectionChange(update)
    return () => {
      offChange?.()
      offSelect?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])
  return value
}

function Bar({ editor, slot }: { editor: Editor; slot: HTMLElement }) {
  const settings = useBarSettings()
  const { buttonPx, hoverTips, shortcutHints, autoHide } = settings
  const layout = useBarLayout()
  const groups = barGroups(layout)
  const actions = useBarActions(editor)
  const set = activeSet.useValue()
  const ribbon = layout.ribbon !== null
  const both = layout.ribbon !== null && layout.short !== null
  const listed = useSetTools(set)
  const known = [...allActionIds(), ...allTools().map((tool) => tool.id)]
  const onSet = keepKnown(listed, known)
  const [panel, setPanel] = useState<Panel | null>(null)
  const { toast } = useContext(AppUiContext)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [focusInBar, setFocusInBar] = useState(false)
  const [freeFraction, setFreeFraction] = useState(1)
  const editorFocused = useEditorFocus()
  const isActive = useToolActive(editor)
  const history = useHistoryState(editor)
  useAutoBarSet()

  // Ctrl/Cmd+F1: "Tools close after use" or "Tools stay open".
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'F1' || !(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const stay = toggleRibbonBehaviour()
      getAppActions()?.toast(t(stay ? 'ribbon.stayOn' : 'ribbon.stayOff'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // "All tools": the ribbon opens on the tab of the set showing.
  const openRibbon = () => {
    ribbonTab.set(tabForSet(set))
    ribbonExpanded.set(true)
    ribbonOpen.set(true)
    setPanel(null)
  }

  // Tools run by the ribbon or the control panel can open a tray.
  useEffect(() => {
    setBarUi({ openPanel: (name) => setPanel(name) })
    return () => setBarUi(null)
  }, [])

  const byId = new Map(actions.map((a) => [a.id, a]))
  const inMore = actions.filter((a) => !listed.includes(a.id))
  const selecting = editor.getSelectedText().length > 0
  const shown =
    !autoHide || editorFocused || focusInBar || selecting || panel !== null

  // The open tray follows the shared pop-up rule (src/app/popups.ts): it
  // closes on a choice, a tap outside, another pop-up, Esc, or a page scroll.
  usePopup(
    panel !== null,
    () => setPanel(null),
    // BlockNote's own pop-ups (opened by its buttons) live next to the editor.
    (el) => el.closest('[data-bar="tray"]') !== null || isEditorPopup(el),
    {
      onEscape: () => {
        if (panel === 'menu') menuButton.current?.focus()
      },
    },
  )

  // Tapping empty page space clears the selection (and the keyboard).
  useEffect(() => {
    const onTap = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (
        !target?.closest('main') ||
        target.closest(
          'button, a, input, textarea, select, label, [role="dialog"], [role="menu"], .bn-container, [data-bar]',
        )
      ) {
        return
      }
      clearSelection(editor)
      setPanel(null)
    }
    document.addEventListener('click', onTap)
    return () => document.removeEventListener('click', onTap)
  }, [editor])

  const done = () => {
    clearSelection(editor)
    setPanel(null)
  }

  const arrowKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const buttons = [
      ...e.currentTarget.querySelectorAll<HTMLElement>('[data-bar-btn]'),
    ].filter((b) => (b as HTMLButtonElement).disabled !== true)
    const at = buttons.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    const next = at + (e.key === 'ArrowRight' ? 1 : -1)
    buttons[(next + buttons.length) % buttons.length]?.focus()
  }

  const buttonFor = (id: string): ReactNode => {
    const action = byId.get(id)
    if (action) {
      return (
        <BarSlot key={id} action={action}>
          {action.special ? (
            <SpecialButton
              action={action}
              editor={editor}
              px={buttonPx}
              colorOpen={panel === 'color'}
              onColor={() => setPanel(panel === 'color' ? null : 'color')}
            />
          ) : (
            <BarButton
              action={action}
              px={buttonPx}
              tip={hoverTips}
              hint={shortcutHints}
            />
          )}
        </BarSlot>
      )
    }
    const tool = findTool(id)
    if (!tool) return null
    if (id === 'more') {
      return (
        <Tip key={id} id="bar.more" touchInfo={false}>
          <button
            type="button"
            data-bar-btn
            data-action="more"
            data-popup-trigger
            aria-expanded={panel === 'more'}
            aria-haspopup="true"
            onMouseDown={keepFocus}
            onClick={() => setPanel(panel === 'more' ? null : 'more')}
            style={{ minHeight: buttonPx, minWidth: buttonPx }}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-xl px-2.5 text-sm whitespace-nowrap text-ink-soft hover:bg-hover hover:text-ink"
          >
            {t('bar.more')} <Icon name="chevronDown" size={16} />
          </button>
        </Tip>
      )
    }
    return (
      <ToolButton
        key={id}
        tool={tool}
        px={buttonPx}
        variant="bar"
        active={isActive(id) || undefined}
        disabled={
          (id === 'undo' && !history.canUndo) ||
          (id === 'redo' && !history.canRedo)
            ? true
            : undefined
        }
        tip={hoverTips}
        hint={shortcutHints}
      />
    )
  }

  const END_BUTTON =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors'

  const pillClass = (place: Place) =>
    `${place === 'free' ? 'mx-0' : 'mx-3'} my-1 items-center rounded-2xl border border-line bg-bg px-1.5 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.07)] supports-[backdrop-filter]:bg-bg/80 supports-[backdrop-filter]:backdrop-blur-xl`

  const focusHandlers = {
    onFocus: () => setFocusInBar(true),
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setFocusInBar(false)
      }
    },
  }

  const ribbonPill = (place: Place) => (
    <div
      key="ribbon"
      role="toolbar"
      data-pill="ribbon"
      aria-label={t(both ? 'ribbon.pill' : 'bar.label')}
      onKeyDown={arrowKeys}
      {...focusHandlers}
      className={pillClass(place)}
    >
      <Ribbon
        px={buttonPx}
        both={both}
        activeOf={(id) => byId.get(id)?.active ?? isActive(id)}
        tip={hoverTips}
        hint={shortcutHints}
      />
    </div>
  )

  const shortPill = (place: Place) => (
    <div
      key="short"
      role="toolbar"
      data-pill="short"
      aria-label={t('bar.label')}
      onKeyDown={arrowKeys}
      {...focusHandlers}
      className={`${pillClass(place)} grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-x-1.5 gap-y-0.5 phone:grid-cols-[auto_minmax(0,1fr)_auto]`}
    >
      <div className="col-start-1 row-start-1">
        <SetSwitch px={buttonPx} />
      </div>
      <div
        data-slot="tools"
        // Scrolls sideways on a narrow screen; the end buttons stay in view.
        className="col-start-2 flex min-w-0 items-center gap-1 overflow-x-auto phone:col-span-2 phone:col-start-1 phone:row-start-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {onSet.map(buttonFor)}
      </div>
      <div className="col-start-3 flex items-center gap-1 phone:row-start-1">
        {!ribbon && (
          <Tip id="bar.allTools" touchInfo={false}>
            <button
              type="button"
              data-bar-btn
              data-action="allTools"
              aria-expanded={ribbon}
              onMouseDown={keepFocus}
              onClick={openRibbon}
              style={{ minHeight: Math.max(buttonPx, 44) }}
              className={`${END_BUTTON} bg-hover px-3 text-sm font-medium !text-ink`}
            >
              <Icon name="layoutGrid" size={18} />
              {t('bar.allTools')}
            </button>
          </Tip>
        )}
        <Tip id="bar.search" touchInfo={false}>
          <button
            type="button"
            data-bar-btn
            data-action="controlPanel"
            aria-label={t('bar.search')}
            title={t('bar.search')}
            onMouseDown={keepFocus}
            onClick={() => getAppActions()?.openControlPanel()}
            style={{
              minHeight: Math.max(buttonPx, 44),
              minWidth: Math.max(buttonPx, 44),
            }}
            className={END_BUTTON}
          >
            <Icon name="search" />
          </button>
        </Tip>
      </div>
      <div className="col-start-4 flex items-center gap-1 phone:col-start-3 phone:row-start-2">
        <Tip id="bar.menu" touchInfo={false}>
          <button
            ref={menuButton}
            type="button"
            data-bar-btn
            data-action="toolbarMenu"
            data-popup-trigger
            aria-label={t('bar.menu')}
            title={hoverTips ? t('bar.menu') : undefined}
            aria-expanded={panel === 'menu'}
            aria-haspopup="true"
            onMouseDown={keepFocus}
            onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
            style={{
              minHeight: Math.max(buttonPx, 44),
              minWidth: Math.max(buttonPx, 44),
            }}
            className={END_BUTTON}
          >
            <Icon name="more" />
          </button>
        </Tip>
        <button
          type="button"
          data-bar-btn
          onMouseDown={keepFocus}
          onClick={done}
          style={{
            minHeight: Math.max(buttonPx, 44),
            minWidth: Math.max(buttonPx, 44),
          }}
          className="shrink-0 rounded-xl px-2.5 text-sm font-semibold whitespace-nowrap text-ink hover:bg-hover"
        >
          {t('bar.done')}
        </button>
      </div>
    </div>
  )

  // Trays open from the short bar (or the ribbon, when it is the only bar).
  const trayPlace: Place | null = layout.short ?? layout.ribbon
  const up = (place: Place) =>
    place === 'bottom' || (place === 'free' && freeFraction > 0.5)

  const tray = (place: Place) => {
    const bottom = up(place)
    return (
      <>
        {panel === 'more' && (
          <Tray bottom={bottom} onClose={() => setPanel(null)}>
            <div
              // The text style menu (paragraph, heading, list …).
              className="px-1"
              style={{ minHeight: Math.max(buttonPx, 44) }}
            >
              <BlockTypeSelect />
            </div>
            {inMore.map((action) => (
              <MoreRow
                key={action.id}
                action={action}
                px={buttonPx}
                hint={shortcutHints}
                onColor={() => setPanel('color')}
              />
            ))}
            <div
              // File buttons (caption, replace, …) show only on a picture.
              className="flex flex-wrap gap-1 empty:hidden"
            >
              <FileCaptionButton />
              <FileReplaceButton />
              <FileRenameButton />
              <FileDownloadButton />
              <FilePreviewButton />
              <FileDeleteButton />
            </div>
            <hr className="my-1 border-line" />
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() => setPanel('edit')}
              style={{ minHeight: Math.max(buttonPx, 44) }}
              className="rounded-lg px-3 text-left text-sm font-semibold text-accent hover:bg-hover"
            >
              {t('bar.edit')}
            </button>
          </Tray>
        )}
        {panel === 'color' && (
          <Tray bottom={bottom} wide onClose={() => setPanel(null)}>
            <ColorPanel
              editor={editor}
              px={buttonPx}
              onDone={() => setPanel(null)}
            />
          </Tray>
        )}
        {panel === 'menu' && (
          <Tray
            bottom={bottom}
            label={t('bar.menu')}
            focusFirst
            onClose={() => setPanel(null)}
          >
            {actions.map((action) => (
              <MoreRow
                key={action.id}
                action={action}
                px={buttonPx}
                hint={shortcutHints}
                onColor={() => setPanel('color')}
              />
            ))}
            <hr className="my-1 border-line" />
            <MenuItem
              px={buttonPx}
              onClick={() => {
                void copyAs(editor, 'plain', toast)
                setPanel(null)
              }}
            >
              {t('copy.plain')}
            </MenuItem>
            <MenuItem
              px={buttonPx}
              onClick={() => {
                void copyAs(editor, 'markdown', toast)
                setPanel(null)
              }}
            >
              {t('copy.markdown')}
            </MenuItem>
            <MenuItem
              px={buttonPx}
              hint={isApple() ? '⌘⇧V' : 'Ctrl+Shift+V'}
              onClick={() => {
                void pastePlainFromClipboard(editor, toast)
                setPanel(null)
              }}
            >
              {t('paste.plain')}
            </MenuItem>
            <MenuItem
              px={buttonPx}
              onClick={() => {
                void copyPageWithPictures(editor, toast)
                setPanel(null)
              }}
            >
              {t('copy.pictures')}
            </MenuItem>
            <hr className="my-1 border-line" />
            {(layout.short === 'free' || layout.ribbon === 'free') && (
              <MenuItem
                px={buttonPx}
                onClick={() => {
                  resetFreePos()
                  setPanel(null)
                }}
              >
                {t('bar.resetPos')}
              </MenuItem>
            )}
            <MenuItem px={buttonPx} accent onClick={() => setPanel('edit')}>
              {t('bar.edit')}
            </MenuItem>
          </Tray>
        )}
        {panel === 'edit' && (
          <Tray bottom={bottom} wide onClose={() => setPanel(null)}>
            <EditBarPanel
              actions={actions}
              mode={settings.mode}
              onClose={() => setPanel(null)}
            />
          </Tray>
        )}
      </>
    )
  }

  return (
    <>
      {PLACES.map((place) => {
        const kinds = groups[place]
        if (kinds.length === 0) return null
        return createPortal(
          <BarStack
            key={place}
            place={place}
            kind={kinds.includes('short') ? 'short' : 'ribbon'}
            hidden={place !== 'free' && !shown}
            onFraction={setFreeFraction}
          >
            {kinds.map((kind) =>
              kind === 'ribbon' ? ribbonPill(place) : shortPill(place),
            )}
            {trayPlace === place && tray(place)}
          </BarStack>,
          slot,
          place,
        )
      })}
    </>
  )
}

/** The "↵ New line" button gets a tip; the others sit on the bar as they are. */
function BarSlot({
  action,
  children,
}: {
  action: BarAction
  children: ReactNode
}) {
  return action.id === 'newLine' ? (
    <Tip id="bar.newLine" touchInfo={false} className="inline-flex shrink-0">
      {children}
    </Tip>
  ) : (
    <>{children}</>
  )
}

function BarButton({
  action,
  px,
  tip,
  hint,
}: {
  action: BarAction
  px: number
  tip: boolean
  hint: boolean
}) {
  const title = tip
    ? action.label + (hint && action.hint ? ` (${action.hint})` : '')
    : undefined
  const tool = findTool(action.id)
  const text = hasTextFace(action.id) || !tool
  return (
    <button
      type="button"
      data-bar-btn
      data-action={action.id}
      aria-label={action.label}
      aria-pressed={action.active ?? undefined}
      aria-disabled={action.disabled || undefined}
      title={title}
      onMouseDown={keepFocus}
      onClick={() => !action.disabled && action.run?.()}
      style={{ minHeight: px, minWidth: px }}
      className={`relative shrink-0 rounded-xl px-2.5 text-sm whitespace-nowrap text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors aria-disabled:opacity-40 ${
        text ? '' : 'grid place-items-center'
      } ${action.active ? 'bg-hover !text-accent' : ''} ${
        action.id === 'newLine' ? '!text-accent' : ''
      }`}
    >
      {text || !tool ? action.face : <Icon name={tool.icon} />}
      {action.active && !text && (
        <span
          aria-hidden
          className="absolute bottom-1 left-1/2 h-0.5 w-3.5 -translate-x-1/2 rounded-full bg-current"
        />
      )}
    </button>
  )
}

/** The colour button (ours, see ColorPicker.tsx) and BlockNote's link button. */
function SpecialButton({
  action,
  editor,
  px,
  colorOpen,
  onColor,
}: {
  action: BarAction
  editor: Editor
  px: number
  colorOpen: boolean
  onColor: () => void
}) {
  return (
    <span
      data-action={action.id}
      data-popup-trigger={action.special === 'color' || undefined}
      className="shrink-0"
    >
      {action.special === 'color' ? (
        <ColorButton
          editor={editor}
          px={px}
          open={colorOpen}
          onClick={onColor}
        />
      ) : (
        <CreateLinkButton />
      )}
    </span>
  )
}

/** A text row in the toolbar menu. */
function MenuItem({
  px,
  hint,
  accent,
  onClick,
  children,
}: {
  px: number
  hint?: string
  accent?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={keepFocus}
      onClick={onClick}
      style={{ minHeight: Math.max(px, 44) }}
      className={`flex items-center justify-between gap-4 rounded-lg px-3 text-left text-sm hover:bg-hover ${
        accent ? 'font-semibold text-accent' : ''
      }`}
    >
      <span>{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </button>
  )
}

function MoreRow({
  action,
  px,
  hint,
  onColor,
}: {
  action: BarAction
  px: number
  hint: boolean
  onColor?: () => void
}) {
  const min = Math.max(px, 44)
  if (action.special === 'color') {
    return (
      <button
        type="button"
        data-action={action.id}
        onMouseDown={keepFocus}
        onClick={onColor}
        style={{ minHeight: min }}
        className="flex items-center justify-between gap-4 rounded-lg px-3 text-left text-sm hover:bg-hover"
      >
        <span>{action.label}</span>
        <span aria-hidden>▸</span>
      </button>
    )
  }
  if (action.special) {
    return (
      <div
        data-action={action.id}
        className="flex items-center justify-between gap-3 px-3 text-sm"
        style={{ minHeight: min }}
      >
        <span>{action.label}</span>
        <CreateLinkButton />
      </div>
    )
  }
  return (
    <button
      type="button"
      data-action={action.id}
      aria-pressed={action.active ?? undefined}
      aria-disabled={action.disabled || undefined}
      onMouseDown={keepFocus}
      onClick={() => !action.disabled && action.run?.()}
      style={{ minHeight: min }}
      className={`flex items-center justify-between gap-4 rounded-lg px-3 text-left text-sm hover:bg-hover aria-disabled:opacity-40 ${
        action.active ? 'bg-hover text-accent' : ''
      }`}
    >
      <span>{action.label}</span>
      {hint && action.hint && (
        <span className="text-xs text-muted">{action.hint}</span>
      )}
    </button>
  )
}

/** The panel under (or above) the bar for More and Edit bar. */
function Tray({
  bottom,
  wide,
  label,
  focusFirst,
  onClose,
  children,
}: {
  bottom: boolean
  /** The ✕ in the top corner (and every other way out) calls this. */
  onClose: () => void
  wide?: boolean
  label?: string
  /** Moves the keyboard focus into the tray (the toolbar menu). */
  focusFirst?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusFirst) {
      ref.current
        ?.querySelector<HTMLElement>('button:not([data-popup-close])')
        ?.focus({ preventScroll: true })
    }
  }, [focusFirst])
  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = [
      ...e.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([data-popup-close])',
      ),
    ]
    const at = items.indexOf(document.activeElement as HTMLElement)
    e.preventDefault()
    const next = at + (e.key === 'ArrowDown' ? 1 : -1)
    items[(next + items.length) % items.length]?.focus()
  }
  return (
    <div
      ref={ref}
      role={label ? 'group' : undefined}
      aria-label={label}
      onKeyDown={label ? arrows : undefined}
      data-bar="tray"
      className={`absolute right-3 z-40 grid max-h-[75vh] max-w-[calc(100vw-24px)] gap-0.5 overflow-y-auto rounded-2xl border border-ink-soft bg-bg p-1.5 shadow-lg ${
        wide ? 'w-[340px]' : 'min-w-[230px]'
      } ${bottom ? 'bottom-full mb-1' : 'top-full'}`}
    >
      <PopupHeader title={label} onClose={onClose} />
      {children}
    </div>
  )
}
