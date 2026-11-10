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
  Suspense,
  lazy,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { Place } from '../app/tools/toolbarState'
import { AppUiContext } from '../app/appUi'
import { isApple } from '../app/keys'
import { t } from '../i18n/t'
import { useBarSettings } from '../settings/deviceModeSettings'
import { historyState } from '../core/historySteps'
import { padHistoryState } from './writePad/padHistory'
import { MainBarRow } from '../app/tools/main/MainBar'
import { HoverName } from '../app/tools/HoverName'
import { MiniToolbar } from '../app/tools/main/MiniToolbar'
import { MicroBar } from '../app/tools/main/MicroBar'
import { MiniKeys } from '../app/tools/main/MiniKeysStrip'
import { OptionsPill } from '../app/tools/main/OptionsPill'
import { TOP_GAP } from '../app/tools/main/pillRoom'
import { closePill } from '../app/tools/main/mainTools'
import { usePenPicksPen } from '../app/tools/main/penPicks'
import { Ribbon } from '../app/tools/Ribbon'
import { openOnContext } from '../app/tools/context/contextStore'
import { ContextBar } from '../app/tools/context/ContextStrip'
import { barGroups } from '../app/tools/barLayout'
import { resetFreePos } from '../app/tools/freeBar'
import { isEditorPopup, usePopup } from '../app/popups'
import { BarStack } from './BarStack'
import { ToolsBoundary } from '../app/tools/ToolsBoundary'
import { useBarLayout } from './useBarLayout'
import {
  PLACES,
  activeSet,
  ribbonExpanded,
  ribbonOpen,
  ribbonTab,
  tabForSet,
  toggleRibbonBehaviour,
} from '../app/tools/toolbarState'
import { getAppActions, setBarUi } from '../app/tools/toolRuntime'
import { EditBarPanel } from './EditBarPanel'
import { useBarActions, type BarAction, type Editor } from './barActions'
import { clearSelection } from './lineActions'
import { ColorPanel } from './ColorPicker'
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

const LazyEditToolbar = lazy(() =>
  import('../app/tools/main/EditToolbarSheet').then((m) => ({
    default: m.EditToolbarSheet,
  })),
)

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

function Bar({ editor, slot }: { editor: Editor; slot: HTMLElement }) {
  const settings = useBarSettings()
  const { buttonPx, hoverTips, shortcutHints, autoHide } = settings
  const layout = useBarLayout()
  const groups = barGroups(layout)
  const actions = useBarActions(editor)
  const ribbon = layout.ribbon !== null
  const both = layout.ribbon !== null && layout.short !== null
  // R8-1: the page keeps a top gap just tall enough for the options pill, so
  // a pill docked at the top sits in it and opening it never moves the page.
  const gap = layout.short === 'top'
  useLayoutEffect(() => {
    if (!gap) return
    const root = document.documentElement.style
    root.setProperty('--page-top-gap', `${TOP_GAP}px`)
    return () => {
      root.removeProperty('--page-top-gap')
    }
  }, [gap])
  const [panel, setPanel] = useState<Panel | null>(null)
  // The Edit toolbar sheet is its own dialog, not a tray: a tap inside it
  // must not count as a tap outside the bar's pop-ups.
  const [sheet, setSheet] = useState(false)
  const openSheet = () => {
    setPanel(null)
    setSheet(true)
  }
  const { toast } = useContext(AppUiContext)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [focusInBar, setFocusInBar] = useState(false)
  const [freeFraction, setFreeFraction] = useState(1)
  const editorFocused = useEditorFocus()
  const isActive = useToolActive(editor)
  const pageHistory = historyState.useValue()
  const pad = padHistoryState.useValue()
  const history = {
    canUndo: pageHistory.canUndo || pad.canUndo,
    canRedo: pageHistory.canRedo || pad.canRedo,
  }
  usePenPicksPen()

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
    ribbonTab.set(tabForSet(activeSet.get()))
    openOnContext() // a selection (picture, table …) opens its own tab
    ribbonExpanded.set(true)
    ribbonOpen.set(true)
    setPanel(null)
  }

  // The options pill belongs to the main bar: it goes when the bar goes.
  useEffect(() => {
    if (layout.short === null) closePill()
  }, [layout.short])

  // Tools run by the ribbon or the control panel can open a tray.
  useEffect(() => {
    setBarUi({ openPanel: (name) => setPanel(name) })
    return () => setBarUi(null)
  }, [])

  const byId = new Map(actions.map((a) => [a.id, a]))
  const inMore = actions
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

  const pillClass = (place: Place) =>
    `${place === 'free' ? 'mx-0' : 'mx-3'} my-1 items-center rounded-2xl border border-line bg-bg px-1.5 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.07)]`

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
        history={history}
        px={buttonPx}
        both={both}
        activeOf={(id) => byId.get(id)?.active ?? isActive(id)}
        tip={hoverTips}
        hint={shortcutHints}
      />
    </div>
  )

  // The main bar: one solid row (redesign step 2), the same on every device.
  const shortPill = (place: Place) => (
    <div
      key="short"
      role="toolbar"
      data-pill="short"
      aria-label={t('bar.label')}
      onKeyDown={arrowKeys}
      {...focusHandlers}
      className={
        place === 'free'
          ? 'relative rounded-2xl border border-ink-soft bg-bg px-1.5 py-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.16)]'
          : 'relative border-y border-line bg-bg px-2 py-1 phone:px-1'
      }
    >
      <MainBarRow
        editor={editor}
        px={buttonPx}
        tips={hoverTips}
        history={history}
        menuOpen={panel === 'menu'}
        menuRef={menuButton}
        onMenu={() => setPanel(panel === 'menu' ? null : 'menu')}
      />
      <ContextBar up={up(place)} />
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
              onClick={() => openSheet()}
              style={{ minHeight: Math.max(buttonPx, 44) }}
              className="rounded-lg px-3 text-left text-sm font-semibold text-accent hover:bg-hover"
            >
              {t('editBar.open')}
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
            <MenuItem px={buttonPx} accent onClick={() => openSheet()}>
              {t('editBar.open')}
            </MenuItem>
            {!ribbon && (
              <MenuItem px={buttonPx} onClick={openRibbon}>
                {t('bar.allTools')}
              </MenuItem>
            )}
            <MenuItem
              px={buttonPx}
              onClick={() => {
                setPanel(null)
                getAppActions()?.openControlPanel()
              }}
            >
              {t('bar.search')}
            </MenuItem>
            <MenuItem px={buttonPx} onClick={done}>
              {t('bar.done')}
            </MenuItem>
            <MenuItem px={buttonPx} onClick={() => setPanel('edit')}>
              {t('bar.edit')}
            </MenuItem>
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
            <hr className="my-1 border-line" />
            {actions.map((action) => (
              <MoreRow
                key={action.id}
                action={action}
                px={buttonPx}
                hint={shortcutHints}
                onColor={() => setPanel('color')}
              />
            ))}
          </Tray>
        )}
        {sheet && (
          <Suspense fallback={null}>
            <LazyEditToolbar onClose={() => setSheet(false)} />
          </Suspense>
        )}
        {panel === 'edit' && (
          <Tray bottom={bottom} wide onClose={() => setPanel(null)}>
            <EditBarPanel mode={settings.mode} onClose={() => setPanel(null)} />
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
      <ToolsBoundary name="selection bar">
        <MiniToolbar editor={editor} />
        <MicroBar editor={editor} />
        <MiniKeys editor={editor} />
      </ToolsBoundary>
      <HoverName />
      {layout.short !== null && (
        <ToolsBoundary name="options pill">
          <OptionsPill editor={editor} barPlace={layout.short} />
        </ToolsBoundary>
      )}
    </>
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
