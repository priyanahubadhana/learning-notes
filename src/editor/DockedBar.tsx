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
} from '../settings/deviceModeSettings'
import { keepKnown } from '../app/deviceMode'
import { Icon } from '../app/tools/icons'
import { SetSwitch } from '../app/tools/SetSwitch'
import { ToolButton } from '../app/tools/ToolButton'
import { activeSet, useSetTools } from '../app/tools/toolbarState'
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
  return createPortal(<Bar editor={editor} />, slot)
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

function Bar({ editor }: { editor: Editor }) {
  const settings = useBarSettings()
  const { placement, buttonPx, hoverTips, shortcutHints, autoHide } = settings
  const bottom = placement === 'bottom'
  const actions = useBarActions(editor)
  const set = activeSet.useValue()
  const listed = useSetTools(set)
  const known = [...allActionIds(), ...allTools().map((tool) => tool.id)]
  const onSet = keepKnown(listed, known)
  const inset = useKeyboardInset()
  const [panel, setPanel] = useState<Panel | null>(null)
  const { toast } = useContext(AppUiContext)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [focusInBar, setFocusInBar] = useState(false)
  const editorFocused = useEditorFocus()
  const wrapper = useRef<HTMLDivElement>(null)
  const isActive = useToolActive(editor)
  useAutoBarSet()

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
    ].filter((b) => (b as HTMLButtonElement).disabled !== true)
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
        tip={hoverTips}
        hint={shortcutHints}
      />
    )
  }

  const END_BUTTON =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors'

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
        bottom ? 'fixed inset-x-0 z-10' : 'relative -mx-14'
      } bg-bg supports-[backdrop-filter]:bg-bg/60 supports-[backdrop-filter]:backdrop-blur-md`}
    >
      <div
        role="toolbar"
        aria-label={t('bar.label')}
        onKeyDown={arrowKeys}
        className="mx-3 my-1.5 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-1.5 gap-y-0.5 rounded-2xl border border-line bg-bg px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.07)] supports-[backdrop-filter]:bg-bg/80 supports-[backdrop-filter]:backdrop-blur-xl phone:grid-cols-[auto_minmax(0,1fr)_auto]"
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
          <Tip id="bar.allTools" touchInfo={false}>
            <button
              type="button"
              data-bar-btn
              data-action="allTools"
              aria-expanded={panel === 'menu'}
              aria-haspopup="true"
              onMouseDown={keepFocus}
              onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
              style={{ minHeight: Math.max(buttonPx, 44) }}
              className={`${END_BUTTON} bg-hover px-3 text-sm font-medium !text-ink`}
            >
              <Icon name="layoutGrid" size={18} />
              {t('bar.allTools')}
            </button>
          </Tip>
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

      {panel === 'more' && (
        <Tray bottom={bottom}>
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
            mode={settings.mode}
            onClose={() => setPanel(null)}
          />
        </Tray>
      )}
    </div>
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
      className={`absolute right-3 z-40 grid max-h-[75vh] max-w-[calc(100vw-24px)] gap-0.5 overflow-y-auto rounded-2xl border border-ink-soft bg-bg p-1.5 shadow-lg ${
        wide ? 'w-[340px]' : 'min-w-[230px]'
      } ${bottom ? 'bottom-full mb-1' : 'top-full'}`}
    >
      {children}
    </div>
  )
}
