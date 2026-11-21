import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TabRow, type TabDef } from '../../design/parts/TabRow'
import { t } from '../../i18n/t'
import { Dialog } from './Dialog'
import { useOverlayLayer } from './useOverlayLayer'
import { useTopLayer } from './useTopLayer'
import './shell-parts.css'

export interface PickerTile {
  id: string
  label: string
  icon?: ReactNode
}

export interface MoreSheetProps {
  title: string
  /** One line under the title. */
  sub?: string
  icon?: ReactNode
  /** "All" and tiles, scrolling sideways. */
  picker?: PickerTile[]
  picked?: string
  onPicked?: (id: string) => void
  tabs: TabDef[]
  tab: string
  onTab: (id: string) => void
  /** Where TabRow saves its choice. */
  setKey?: string
  /** The body of the current tab; only this scrolls. */
  children?: ReactNode
  hint?: string
  /** There are edits that Cancel would throw away. */
  dirty?: boolean
  onDone: () => void
  onClose: () => void
  id?: string
}

/**
 * SH-09: the More sheet. A fixed 440 px box on the right (full width from
 * 8 px under the top on a phone) with a header, a picker row, section tabs,
 * a scrolling body and a footer. Nothing changes until Done. Cancel, ✕, Esc
 * or a tap outside throws the edits away, and asks first when there are some.
 */
export function MoreSheet(props: MoreSheetProps) {
  const {
    title,
    sub,
    icon,
    picker,
    picked,
    onPicked,
    tabs,
    tab,
    onTab,
    setKey = 'more',
    children,
    hint,
    dirty,
    onDone,
    onClose,
  } = props
  const auto = useId()
  const id = props.id ?? `more-${auto}`
  const layer = useRef<HTMLDivElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const body = useRef<HTMLDivElement | null>(null)
  const [asking, setAsking] = useState(false)
  useTopLayer(layer)

  const request = (): boolean | void => {
    if (dirty) {
      setAsking(true)
      return false
    }
    onClose()
  }
  useOverlayLayer(box, {
    id,
    layer: 'sheet',
    trap: true,
    onClose: request,
  })

  // A new tab starts at the top; edits keep the place.
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0
  }, [tab])

  return createPortal(
    <div
      ref={layer}
      popover="manual"
      className="sh-layer"
      data-testid="more-sheet-layer"
    >
      <div className="sh-sscrim" aria-hidden="true" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className="sh-sheet"
        data-testid="more-sheet"
      >
        <header className="sh-sheet-head">
          {icon && <span className="sh-sheet-ic">{icon}</span>}
          <div className="sh-sheet-tt">
            <h2 id={`${id}-title`}>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button
            type="button"
            className="sh-x"
            aria-label={t('shell.close')}
            onClick={() => void request()}
          >
            ✕
          </button>
        </header>
        {picker && (
          <div
            className="sh-sheet-pick"
            role="group"
            aria-label={t('shell.pick')}
          >
            {picker.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={picked === p.id}
                onClick={() => onPicked?.(p.id)}
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="sh-sheet-tabs">
          <TabRow
            setKey={setKey}
            catalog={tabs}
            defaults={tabs.map((x) => x.id)}
            value={tab}
            onPick={onTab}
            editable={false}
            label={title}
          />
        </div>
        <div ref={body} className="sh-sheet-body" data-testid="more-body">
          {children}
        </div>
        <footer className="sh-sheet-foot">
          <span className="sh-sheet-hint">{hint}</span>
          <button
            type="button"
            className="sh-btn"
            onClick={() => void request()}
          >
            {t('ui.cancel')}
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-main"
            data-testid="more-done"
            onClick={onDone}
          >
            ✓ {t('shell.done')}
          </button>
        </footer>
      </div>
      {asking && (
        <Dialog
          parentId={id}
          title={t('shell.discard.title')}
          confirmLabel={t('shell.discard.yes')}
          cancelLabel={t('shell.discard.keep')}
          destructive
          undoNote={t('shell.discard.note')}
          onConfirm={() => {
            setAsking(false)
            onClose()
          }}
          onCancel={() => setAsking(false)}
        >
          <p>{t('shell.discard.body')}</p>
        </Dialog>
      )}
    </div>,
    document.body,
  )
}
