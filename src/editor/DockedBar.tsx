import {
  BlockTypeSelect,
  CreateLinkButton,
  FileCaptionButton,
  FileDeleteButton,
  FileDownloadButton,
  FilePreviewButton,
  FileRenameButton,
  FileReplaceButton,
  useBlockNoteEditor,
  useEditorDOMElement,
  useEditorFocus,
} from '@blocknote/react'
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AppUiContext } from '../app/appUi'
import { isApple } from '../app/keys'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import {
  useBarSettings,
  useKeyboardInset,
  usePinned,
  writePinned,
} from '../settings/deviceModeSettings'
import { keepKnown } from '../app/deviceMode'
import { EditBarPanel } from './EditBarPanel'
import {
  allActionIds,
  useBarActions,
  type BarAction,
  type Editor,
} from './barActions'
import { clearSelection } from './lineActions'
import { ColorButton, ColorPanel } from './ColorPicker'
import {
  copyAs,
  copyPageWithPictures,
  pastePlainFromClipboard,
} from './clipboard'

/**
 * The formatting bar for touch screens and the Pencil: docked under the top
 * bar (Touch) or at the bottom (Pencil), instead of the floating toolbar.
 * It shows the text style menu, the buttons the user pinned, then More and
 * Done. Everything else the floating toolbar can do is under More.
 */

/** Keeps the editor's selection and keyboard when a bar button is pressed. */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

export function DockedBar({ slot }: { slot: HTMLElement | null }) {
  const editor = useBlockNoteEditor() as unknown as Editor
  const mounted = useEditorDOMElement(editor as never)
  if (!slot || !mounted) return null
  return createPortal(<Bar editor={editor} />, slot)
}

function Bar({ editor }: { editor: Editor }) {
  const settings = useBarSettings()
  const { placement, buttonPx, hoverTips, shortcutHints, autoHide } = settings
  const bottom = placement === 'bottom'
  const actions = useBarActions(editor)
  const pinned = keepKnown(usePinned(), allActionIds())
  const inset = useKeyboardInset()
  const [panel, setPanel] = useState<'more' | 'menu' | 'color' | 'edit' | null>(
    null,
  )
  const { toast } = useContext(AppUiContext)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [focusInBar, setFocusInBar] = useState(false)
  const editorFocused = useEditorFocus()
  const wrapper = useRef<HTMLDivElement>(null)

  const byId = new Map(actions.map((a) => [a.id, a]))
  const onBar = pinned.flatMap((id) => byId.get(id) ?? [])
  const inMore = actions.filter((a) => !pinned.includes(a.id))
  const selecting = editor.getSelectedText().length > 0
  const shown =
    !autoHide || editorFocused || focusInBar || selecting || panel !== null

  // The sticky section chips of a long page sit just below a top bar: while
  // the bar is there, its height is shared as --dock-top.
  useLayoutEffect(() => {
    const el = wrapper.current
    const root = document.documentElement
    if (!el || bottom) return
    const apply = () =>
      root.style.setProperty('--dock-top', el.offsetHeight + 'px')
    apply()
    const watch = new ResizeObserver(apply)
    watch.observe(el)
    return () => {
      watch.disconnect()
      root.style.removeProperty('--dock-top')
    }
  }, [bottom])

  // The open tray closes on Esc or a tap anywhere else.
  useEffect(() => {
    if (panel === null) return
    const close = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target || wrapper.current?.contains(target)) return
      // Popups opened by BlockNote's own buttons live next to the editor.
      if (target.closest('.bn-container') && !target.closest('.bn-editor')) {
        return
      }
      setPanel(null)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setPanel(null)
      if (panel === 'menu') menuButton.current?.focus()
    }
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel])

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
    ].filter((b) => !(b as HTMLButtonElement).disabled)
    const at = buttons.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    const next = at + (e.key === 'ArrowRight' ? 1 : -1)
    buttons[(next + buttons.length) % buttons.length]?.focus()
  }

  const barStyle = bottom
    ? {
        bottom: inset,
        paddingBottom: inset > 0 ? 0 : 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }
    : undefined

  return (
    <div
      ref={wrapper}
      data-bar="docked"
      data-placement={placement}
      style={{
        ...barStyle,
        visibility: shown ? 'visible' : 'hidden',
      }}
      onFocus={() => setFocusInBar(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocusInBar(false)
        }
      }}
      className={`${
        bottom ? 'fixed inset-x-0 z-10 border-t' : 'relative -mx-14 border-b'
      } border-line bg-bg`}
    >
      <div
        role="toolbar"
        aria-label={t('bar.label')}
        onKeyDown={arrowKeys}
        className="flex items-center gap-1 px-3 py-1.5"
      >
        <div
          // Scrolls sideways on a narrow screen; More and Done stay in view.
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          <div
            // The text style menu (paragraph, heading, list…).
            className="shrink-0"
            style={{ minHeight: buttonPx }}
          >
            <BlockTypeSelect />
          </div>
          <Sep />
          {onBar.map((action) => (
            <BarSlot key={action.id} action={action}>
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
          ))}
        </div>
        <Tip id="bar.menu" touchInfo={false}>
          <button
            ref={menuButton}
            type="button"
            data-bar-btn
            data-action="toolbarMenu"
            aria-label={t('bar.menu')}
            title={hoverTips ? t('bar.menu') : undefined}
            aria-expanded={panel === 'menu'}
            aria-haspopup="true"
            onMouseDown={keepFocus}
            onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
            style={{ minHeight: buttonPx, minWidth: buttonPx }}
            className="shrink-0 rounded-lg px-2.5 text-lg leading-none hover:bg-hover"
          >
            <span aria-hidden>⋯</span>
          </button>
        </Tip>
        <Tip id="bar.more" touchInfo={false}>
          <button
            type="button"
            data-bar-btn
            aria-expanded={panel === 'more'}
            aria-haspopup="true"
            onMouseDown={keepFocus}
            onClick={() => setPanel(panel === 'more' ? null : 'more')}
            style={{ minHeight: buttonPx, minWidth: buttonPx }}
            className="shrink-0 rounded-lg px-2.5 text-sm whitespace-nowrap hover:bg-hover"
          >
            {t('bar.more')} <span aria-hidden>▾</span>
          </button>
        </Tip>
        <button
          type="button"
          data-bar-btn
          onMouseDown={keepFocus}
          onClick={done}
          style={{ minHeight: buttonPx, minWidth: buttonPx }}
          className="shrink-0 rounded-lg px-2.5 text-sm font-semibold whitespace-nowrap text-accent hover:bg-hover"
        >
          {t('bar.done')}
        </button>
      </div>

      {panel === 'more' && (
        <Tray bottom={bottom}>
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
        <Tray bottom={bottom} wide>
          <ColorPanel editor={editor} px={buttonPx} />
        </Tray>
      )}
      {panel === 'menu' && (
        <Tray bottom={bottom} label={t('bar.menu')} focusFirst>
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
          <MenuItem px={buttonPx} accent onClick={() => setPanel('edit')}>
            {t('bar.edit')}
          </MenuItem>
        </Tray>
      )}
      {panel === 'edit' && (
        <Tray bottom={bottom} wide>
          <EditBarPanel
            actions={actions}
            pinned={pinned}
            mode={settings.mode}
            onPinned={writePinned}
            onClose={() => setPanel(null)}
          />
        </Tray>
      )}
    </div>
  )
}

const Sep = () => (
  <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-line" />
)

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
      className={`shrink-0 rounded-lg px-2.5 text-sm whitespace-nowrap hover:bg-hover aria-disabled:opacity-40 ${
        action.active ? 'bg-hover text-accent' : ''
      } ${action.id === 'newLine' ? 'text-accent' : ''}`}
    >
      {action.face}
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
    <span data-action={action.id} className="shrink-0">
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
  children,
}: {
  bottom: boolean
  wide?: boolean
  label?: string
  /** Moves the keyboard focus into the tray (the toolbar menu). */
  focusFirst?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusFirst) ref.current?.querySelector<HTMLElement>('button')?.focus()
  }, [focusFirst])
  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button')]
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
      className={`absolute right-3 z-40 grid max-h-[75vh] max-w-[calc(100vw-24px)] gap-0.5 overflow-y-auto rounded-xl border border-ink-soft bg-bg p-1.5 shadow-lg ${
        wide ? 'w-[340px]' : 'min-w-[230px]'
      } ${bottom ? 'bottom-full mb-1' : 'top-full mt-1'}`}
    >
      {children}
    </div>
  )
}
