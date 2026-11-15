import { useRef, useState, type ReactNode } from 'react'
import { useOverlayLayer } from '../../shell/useOverlayLayer'
import { t } from '../../../i18n/t'
import { Icon } from '../icons'
import {
  EXTRA_IDS,
  isCore,
  resetBar,
  barDraft,
  cancelEdit,
  doneEdit,
  isLocked,
  addTo,
  removeFrom,
  trayOf,
} from './barEdit'
import { barToolIcon, barToolName } from './barEditUi'
import { ConfirmDialog } from '../../ui'
import './cards/toolCards.css'
import { findTool, tabLabel } from '../toolRegistry'

/**
 * The parts of editing the tool bar on the bar itself (toolbar.v8, 2A.15):
 * the top bar (cancel, title, done), the "More tools" tray and the drag that
 * moves a tool live. The bar's own buttons live in ToolBar.tsx.
 */

const EXTRA = new Set<string>(EXTRA_IDS)

/** The top bar: cancel keeps the bar, done saves it. Escape is cancel too. */
export function EditBanner() {
  const ref = useRef<HTMLDivElement>(null)
  // Edit mode is a layer of the overlay manager, so Escape leaves it from
  // anywhere, after any question above it (Reset) is closed. Taps elsewhere
  // do not end it (modal).
  useOverlayLayer(ref, {
    id: 'v8-bar-edit',
    layer: 'bar',
    modal: true,
    onClose: () => {
      // A question that is open (a native dialog) takes this Escape itself.
      if (document.querySelector('dialog[open]')) return false
      cancelEdit()
    },
  })
  return (
    <div
      ref={ref}
      className="v8eb"
      role="group"
      aria-label={t('v8.edit.title')}
      data-testid="v8-edit-bar"
    >
      <button
        type="button"
        data-chrome
        className="v8tool"
        data-testid="v8-edit-cancel"
        aria-label={t('v8.edit.cancel')}
        onClick={cancelEdit}
      >
        <Icon name="close" size={20} />
      </button>
      <span className="v8eb-text">
        <b>{t('v8.edit.title')}</b>
        <small>{t('v8.edit.hint')}</small>
      </span>
      <button
        type="button"
        data-chrome
        className="v8tool v8eb-ok"
        data-testid="v8-edit-done"
        aria-label={t('v8.edit.done')}
        onClick={() => void doneEdit()}
      >
        <Icon name="check" size={20} />
      </button>
    </div>
  )
}

function Tile({ id }: { id: string }) {
  return (
    <button
      type="button"
      data-chrome
      data-edit-id={id}
      data-testid={`v8-edit-tile-${id}`}
      className="v8tile"
      aria-label={t('v8.edit.add', { name: barToolName(id) })}
      onClick={() => barDraft.set(addTo(barDraft.get() ?? [], id))}
    >
      <Icon name={barToolIcon(id)} size={22} />
      <span>{barToolName(id)}</span>
      <i className="v8badge-add" aria-hidden>
        <Icon name="plus" size={12} />
      </i>
    </button>
  )
}

/**
 * "More tools": what is not on the bar. A tap or a drag up adds it. The usual
 * ones are shown; every other tool of the app waits behind "All tools",
 * grouped, so nothing the old Edit toolbar list offered is lost.
 */
export function EditTray({ draft }: { draft: readonly string[] }) {
  const [all, setAll] = useState(false)
  const [asking, setAsking] = useState(false)
  const rest = trayOf(draft)
  const usual = rest.filter((id) => isCore(id) || EXTRA.has(id))
  const others = rest.filter((id) => !usual.includes(id))
  const groups = new Map<string, string[]>()
  for (const id of others) {
    const def = findTool(id)
    const key = def ? tabLabel(def.section) : ''
    groups.set(key, [...(groups.get(key) ?? []), id])
  }
  return (
    <div className="v8tray" data-testid="v8-edit-tray" data-edit-tray>
      <div className="v8tray-top">
        <div className="v8tray-head">{t('v8.edit.tray')}</div>
        <button
          type="button"
          data-chrome
          className="v8tray-btn"
          data-testid="v8-edit-reset"
          onClick={() => setAsking(true)}
        >
          {t('v8.edit.reset')}
        </button>
      </div>
      <div className="v8tray-list">
        {usual.map((id) => (
          <Tile key={id} id={id} />
        ))}
        {rest.length === 0 ? (
          <span className="v8tray-empty">{t('v8.edit.trayEmpty')}</span>
        ) : null}
      </div>
      {others.length ? (
        <>
          <button
            type="button"
            data-chrome
            className="v8tray-btn v8tray-all"
            data-testid="v8-edit-all"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
          >
            {t('v8.edit.all')}
            <Icon name="chevronDown" size={14} className="v8chev" />
          </button>
          {all ? (
            <div
              className="v8scroll v8tray-scroll"
              data-testid="v8-edit-all-list"
            >
              {[...groups].map(([name, ids]) => (
                <section key={name} aria-label={name || undefined}>
                  {name ? <div className="v8tray-group">{name}</div> : null}
                  <div className="v8tray-list">
                    {ids.map((id) => (
                      <Tile key={id} id={id} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {asking ? (
        <ConfirmDialog
          message={t('v8.edit.resetAsk')}
          confirmLabel={t('v8.edit.resetYes')}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            resetBar()
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * A tool on the bar in edit mode: the tool, and next to it (not inside it, a
 * button never holds a button) its lock or its minus. The slot is what is
 * dragged.
 */
export function EditSlot({
  id,
  locked,
  dragging,
  testKey,
  children,
}: {
  id: string
  locked: boolean
  dragging: boolean
  testKey: string
  children: ReactNode
}) {
  return (
    <span
      className="v8slot"
      data-edit-id={id}
      data-locked={locked || undefined}
      data-dragging={dragging || undefined}
    >
      {children}
      <EditBadge id={id} testKey={testKey} />
    </span>
  )
}

/** Backspace, New line and More in edit mode: always there, only a lock. */
export function FixedSlot({
  testKey,
  name,
  children,
}: {
  testKey: string
  name: string
  children: ReactNode
}) {
  return (
    <span className="v8slot" data-locked>
      {children}
      <FixedLock testKey={testKey} name={name} />
    </span>
  )
}

/** The badge on a tool in edit mode: a lock, or a minus that removes it. */
function EditBadge({ id, testKey }: { id: string; testKey: string }) {
  const name = barToolName(id)
  return isLocked(id) ? (
    <i
      className="v8badge-edit v8badge-lock"
      data-testid={`v8-edit-lock-${testKey}`}
      role="img"
      aria-label={t('v8.edit.locked', { name })}
    >
      <Icon name="lock" size={11} />
    </i>
  ) : (
    <button
      type="button"
      data-chrome
      className="v8badge-edit v8badge-rm"
      data-testid={`v8-edit-remove-${testKey}`}
      aria-label={t('v8.edit.remove', { name })}
      onClick={(e) => {
        e.stopPropagation()
        barDraft.set(removeFrom(barDraft.get() ?? [], id))
      }}
    >
      <Icon name="minus" size={12} />
    </button>
  )
}

/** A fixed tool (Backspace, New line, More): only the lock. */
function FixedLock({ testKey, name }: { testKey: string; name: string }) {
  return (
    <i
      className="v8badge-edit v8badge-lock"
      data-testid={`v8-edit-lock-${testKey}`}
      role="img"
      aria-label={t('v8.edit.locked', { name })}
    >
      <Icon name="lock" size={11} />
    </i>
  )
}
