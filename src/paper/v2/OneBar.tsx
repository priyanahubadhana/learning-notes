import {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import { onRouted } from '../../app/input/eventRouter'
import { Icon } from '../../app/tools/icons'
import { tokenCss } from '../../core/boxStyle'
import type { PaperBox } from '../../core/types'
import { TEXT_HEX } from '../../editor/colorData'
import { t } from '../../i18n/t'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { openBoxStyle } from '../boxStyleBus'
import { BOX_COLOURS } from '../boxes'
import {
  alignNow,
  cutBox,
  currentSize,
  currentStyles,
  editorOf,
  listNow,
  pasteInto,
  setAlign,
  setColour,
  setFont,
  setList,
  setSize,
  toggleHighlight,
  toggleStyle,
  type PasteHow,
} from './oneBarOps'
import { FONT_FACE_STYLE } from '../../editor/lookStyle'
import { listenOneBar, type OneBarPop } from './oneBarBus'
import {
  AlignPop,
  BiPop,
  ColourPop,
  FontPop,
  ListPop,
  PastePop,
  Pop,
  SizePop,
} from './oneBarPops'
import '../../design/parts/partsMisc.css'
import { DockZones } from './oneBarDock'
import { useGripDrag } from './oneBarGrip'
import type { BarPlace } from './oneBarDockModel'
import './oneBar.css'
import './oneBarB.css'

/**
 * Box bar part A (switch textbox.v2): the ONE bar of a selected box. Text
 * look (colour, size, font, B/I, align, list), the fill square, then Cut,
 * Paste ▾, Delete and ⋯. Every button opens a small strip right under it
 * (oneBarPops.tsx). The bar never takes the caret or the selection: a press on
 * it keeps focus where it was, so a tap types, selects and draws nothing. On a
 * phone the bar is shorter and Font, List, Cut, Paste and Delete live under ⋯.
 * Approved picture: docs/mockups/box-bar/index.html.
 */
/** What the bar stands for when no box is the target (a pinned bar, nothing selected). */
const NO_BOX: PaperBox = { id: '', x: 0, y: 0, w: 0 }

export default function OneBarView({
  pageId,
  box: boxProp,
  canEdit,
  compact,
  onDelete,
  onMenu,
  onLine,
  mover,
}: {
  pageId: string
  /** The box the bar acts on; none = a pinned bar with nothing selected (box buttons off). */
  box: PaperBox | undefined
  canEdit: boolean
  /** A narrow page (a phone, or a column under 640 px): the short bar. */
  compact: boolean
  onDelete: () => void
  onMenu: (at: DOMRect) => void
  onLine: (line: 'tight' | 'loose' | undefined) => void
  /** Moving, docking and pinning (part B); left out, the grip is only a picture. */
  mover?: {
    place: BarPlace | null
    vertical: boolean
    dock?: string
    onLive: (at: { left: number; top: number } | null) => void
    onDrop: (p: Pick<BarPlace, 'side' | 'left' | 'top'>) => void
    onPin: () => void
  }
}) {
  const box = boxProp ?? NO_BOX
  const off = !boxProp
  const { toast } = useContext(AppUiContext)
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<OneBarPop | null>(null)
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const phone = usePhone()
  const short = compact || phone
  const ed = off ? undefined : editorOf(pageId, box.id)
  const drag = useGripDrag({
    bar: () => root.current,
    onLive: mover?.onLive ?? (() => {}),
    onDrop: mover?.onDrop ?? (() => {}),
  })

  // The strips show what the words have now: draw again when they change.
  useEffect(() => {
    if (!ed) return
    const a = ed.onChange(redraw)
    const b = ed.onSelectionChange(redraw)
    return () => {
      a?.()
      b?.()
    }
  }, [ed])

  // The phone's ⋯ list opens Font, List and Paste here.
  useEffect(
    () =>
      listenOneBar((m) => {
        if (m.kind === 'pop' && m.boxId === box.id) setOpen(m.pop)
      }),
    [box.id],
  )

  // A tap outside the bar, or Esc, closes the open strip.
  useEffect(() => {
    if (!open) return
    const offDown = onRouted('pointerdown', (e) => {
      const el = e.target as Element | null
      if (el?.closest('[data-onebar-pop], [data-onebar-item]')) return
      setOpen(null)
    })
    const offKey = onRouted('keydown', (e) => {
      if (e.key === 'Escape') setOpen(null)
    })
    return () => {
      offDown()
      offKey()
    }
  }, [open])

  const styles = ed ? currentStyles(ed) : {}
  const boxEl = document.querySelector(
    '[data-paper-box="' + CSS.escape(box.id) + '"]',
  )
  const size = ed ? currentSize(ed, boxEl) : 16
  const colourNow =
    typeof styles.textColor === 'string' ? styles.textColor : 'default'
  const faceNow =
    typeof styles[FONT_FACE_STYLE] === 'string'
      ? (styles[FONT_FACE_STYLE] as string)
      : 'default'
  const fill =
    tokenCss(box.style?.bg) ??
    (box.colour ? BOX_COLOURS[box.colour] : undefined)
  const locked = !!box.locked

  const choose = (fn: () => void, close = true) => {
    if (ed) fn()
    if (close) setOpen(null)
  }

  const copyFailed = () => toast(t('paper.box.copyFailed'))
  const cut = async () => {
    if (!(await cutBox(pageId, box.id, onDelete))) copyFailed()
  }
  const paste = async (how: PasteHow) => {
    if (!ed) return
    setOpen(null)
    if (!(await pasteInto(ed, how))) toast(t('onebar.paste.failed'))
  }

  const toggle = (id: OneBarPop) => setOpen((o) => (o === id ? null : id))

  /** One bar item: its button, and its strip right under it when open. */
  const item = (id: OneBarPop, button: ReactNode, pop: ReactNode) => (
    <span className="ob1-it" data-onebar-item={id} key={id}>
      {button}
      {open === id && (
        <Pop
          id={id}
          boxId={box.id}
          onClose={() => setOpen(null)}
          column={id === 'font' || id === 'paste'}
        >
          {pop}
        </Pop>
      )}
    </span>
  )
  const btn = (
    id: OneBarPop,
    label: string,
    inner: ReactNode,
    extra?: { w?: boolean },
  ) => (
    <button
      type="button"
      className={`pm-ob__btn ob1-btn${extra?.w ? ' ob1-w' : ''}`}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open === id}
      aria-pressed={open === id}
      data-testid={`ob-${id}`}
      disabled={off}
      onClick={() => toggle(id)}
    >
      {inner}
    </button>
  )

  const colour = item(
    'colour',
    btn(
      'colour',
      t('onebar.colour'),
      <i
        className="ob1-circle"
        style={{ background: TEXT_HEX[colourNow] ?? 'var(--color-ink)' }}
      />,
    ),
    <ColourPop
      now={colourNow}
      onPick={(c) => choose(() => setColour(ed!, 'textColor', c))}
    />,
  )
  const sizeItem = item(
    'size',
    btn('size', t('onebar.size'), <span className="ob1-size">{size}</span>),
    <SizePop
      value={size}
      onSet={(n) => choose(() => setSize(ed!, n), false)}
    />,
  )
  const font = item(
    'font',
    btn(
      'font',
      t('onebar.font'),
      <b className="ob1-aa" aria-hidden="true">
        Aa
      </b>,
    ),
    <FontPop
      now={faceNow}
      onPick={(f) =>
        choose(() => {
          if (f === 'default') {
            ed!.removeStyles({ [FONT_FACE_STYLE]: 'x' } as never)
          } else setFont(ed!, f)
        })
      }
    />,
  )
  const bi = item(
    'bi',
    btn(
      'bi',
      t('onebar.bi'),
      <span className="ob1-bi" aria-hidden="true">
        <b>B</b>
        <i>I</i>
      </span>,
    ),
    <BiPop
      styles={styles}
      onToggle={(s) => choose(() => toggleStyle(ed!, s), false)}
      onHighlight={() => choose(() => toggleHighlight(ed!), false)}
    />,
  )
  const align = item(
    'align',
    btn('align', t('onebar.align'), <Icon name="alignLeft" size={20} />),
    <AlignPop
      align={ed ? alignNow(ed) : 'left'}
      line={box.line}
      onAlign={(a) => choose(() => setAlign(ed!, a))}
      onLine={(l) => {
        onLine(l)
        setOpen(null)
      }}
    />,
  )
  const list = item(
    'list',
    btn('list', t('onebar.list'), <Icon name="list" size={20} />),
    <ListPop
      now={ed ? listNow(ed) : null}
      onPick={(l) => choose(() => setList(ed!, l))}
    />,
  )
  const fillBtn = (
    <button
      key="fill"
      type="button"
      className="pm-ob__btn ob1-btn"
      aria-label={t('boxStyle.title')}
      data-testid="ob-style"
      disabled={off}
      onClick={() => {
        setOpen(null)
        openBoxStyle(box.id)
      }}
    >
      <i className="ob1-fill" style={{ background: fill ?? 'transparent' }} />
    </button>
  )
  const pasteItem = item(
    'paste',
    <span className="ob1-pasteGroup">
      <button
        type="button"
        className="pm-ob__btn ob1-btn"
        aria-label={t('onebar.paste')}
        data-testid="ob-pastenow"
        disabled={off}
        onClick={() => void paste('settings')}
      >
        <Icon name="clipboard" size={20} />
      </button>
      <button
        type="button"
        className="pm-ob__btn ob1-btn ob1-chev"
        aria-label={t('onebar.pasteMore')}
        aria-haspopup="dialog"
        aria-expanded={open === 'paste'}
        data-testid="ob-paste"
        disabled={off}
        onClick={() => toggle('paste')}
      >
        <Icon name="chevronDown" size={14} />
      </button>
    </span>,
    <PastePop onPick={(how) => void paste(how)} />,
  )

  const more = (
    <button
      key="more"
      type="button"
      className="pm-ob__btn ob1-btn"
      aria-label={t('paper.box.menu')}
      aria-haspopup="menu"
      data-testid="ob-boxmore"
      disabled={off}
      data-popup-trigger=""
      onClick={(e) => {
        setOpen(null)
        onMenu(e.currentTarget.getBoundingClientRect())
      }}
    >
      <Icon name="more" size={20} />
    </button>
  )

  return (
    <div
      ref={root}
      role="toolbar"
      aria-label={t('parts.objbar.label')}
      data-testid="object-bar"
      data-kind="box"
      data-short={short ? '' : undefined}
      data-vertical={mover?.vertical ? '' : undefined}
      data-dock={mover?.dock}
      data-off={off ? '' : undefined}
      className="pm-ob ob1"
      // With the caret or words in the box, a press keeps them where they are.
      // A box only picked has no caret: the press focuses the button as before
      // (so a card or list it opens shows no focus ring).
      onMouseDown={(e) => {
        if (
          ed?.prosemirrorView?.hasFocus() &&
          !(e.target as Element).closest('input')
        )
          e.preventDefault()
      }}
    >
      {mover ? (
        <button
          type="button"
          className={`ob1-grip ob1-grip--drag${mover.place ? ' is-moved' : ''}`}
          aria-label={t('onebar.move')}
          data-testid="ob-grip"
          {...drag.gripProps}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <circle cx="5" cy="3" r="1.4" />
            <circle cx="11" cy="3" r="1.4" />
            <circle cx="5" cy="8" r="1.4" />
            <circle cx="11" cy="8" r="1.4" />
            <circle cx="5" cy="13" r="1.4" />
            <circle cx="11" cy="13" r="1.4" />
          </svg>
        </button>
      ) : (
        <span className="ob1-grip" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <circle cx="5" cy="3" r="1.4" />
            <circle cx="11" cy="3" r="1.4" />
            <circle cx="5" cy="8" r="1.4" />
            <circle cx="11" cy="8" r="1.4" />
            <circle cx="5" cy="13" r="1.4" />
            <circle cx="11" cy="13" r="1.4" />
          </svg>
        </span>
      )}
      {mover?.place && (
        <button
          type="button"
          className="pm-ob__btn ob1-btn ob1-keep"
          aria-label={mover.place.pinned ? t('onebar.unpin') : t('onebar.pin')}
          aria-pressed={mover.place.pinned}
          data-testid="ob-pin"
          onClick={mover.onPin}
        >
          <Icon name={mover.place.pinned ? 'pinOff' : 'pin'} size={20} />
        </button>
      )}

      {colour}
      {sizeItem}
      {!short && font}
      {bi}
      {align}
      {!short && list}
      {fillBtn}
      {!short && (
        <>
          <span className="ob1-sep" aria-hidden="true" />
          {canEdit && (
            <button
              type="button"
              className="pm-ob__btn ob1-btn"
              aria-label={t('pic.act.cut')}
              data-testid="ob-cut"
              disabled={locked || off}
              onClick={() => void cut()}
            >
              <Icon name="scissors" size={20} />
            </button>
          )}
          {pasteItem}
          {canEdit && (
            <button
              type="button"
              className="pm-ob__btn pm-ob__btn--danger ob1-btn"
              aria-label={t('paper.box.delete')}
              data-testid="ob-delete"
              disabled={locked || off}
              onClick={onDelete}
            >
              <Icon name="trash" size={20} />
            </button>
          )}
        </>
      )}
      {more}
      {/* Strips the phone's ⋯ list opens (their own buttons are under ⋯). */}
      {short && open && ['font', 'list', 'paste'].includes(open) && (
        <span className="ob1-it ob1-it--more" data-onebar-item={open}>
          <Pop
            id={open}
            boxId={box.id}
            onClose={() => setOpen(null)}
            column={open !== 'list'}
          >
            {open === 'font' ? (
              <FontPop
                now={faceNow}
                onPick={(f) =>
                  choose(() => {
                    if (f === 'default')
                      ed!.removeStyles({ [FONT_FACE_STYLE]: 'x' } as never)
                    else setFont(ed!, f)
                  })
                }
              />
            ) : open === 'list' ? (
              <ListPop
                now={ed ? listNow(ed) : null}
                onPick={(l) => choose(() => setList(ed!, l))}
              />
            ) : (
              <PastePop onPick={(how) => void paste(how)} />
            )}
          </Pop>
        </span>
      )}
      {drag.dragging && <DockZones zone={drag.zone} />}
    </div>
  )
}
