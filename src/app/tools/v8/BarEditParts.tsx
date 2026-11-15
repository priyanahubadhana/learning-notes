import type { ReactNode } from 'react'
import { t } from '../../../i18n/t'
import { Icon } from '../icons'
import {
  barDraft,
  cancelEdit,
  doneEdit,
  isLocked,
  addTo,
  removeFrom,
  trayOf,
} from './barEdit'
import { barToolIcon, barToolName } from './barEditUi'

/**
 * The parts of editing the tool bar on the bar itself (toolbar.v8, 2A.15):
 * the top bar (cancel, title, done), the "More tools" tray and the drag that
 * moves a tool live. The bar's own buttons live in ToolBar.tsx.
 */

/** The top bar: cancel keeps the bar, done saves it. */
export function EditBanner() {
  return (
    <div
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

/** "More tools": what is not on the bar. A tap or a drag up adds it. */
export function EditTray({ draft }: { draft: readonly string[] }) {
  const rest = trayOf(draft)
  return (
    <div className="v8tray" data-testid="v8-edit-tray" data-edit-tray>
      <div className="v8tray-head">{t('v8.edit.tray')}</div>
      <div className="v8tray-list">
        {rest.length ? (
          rest.map((id) => (
            <button
              key={id}
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
          ))
        ) : (
          <span className="v8tray-empty">{t('v8.edit.trayEmpty')}</span>
        )}
      </div>
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
      title={t('v8.edit.locked', { name })}
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
      onPointerDown={(e) => e.stopPropagation()}
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
      title={t('v8.edit.locked', { name })}
    >
      <Icon name="lock" size={11} />
    </i>
  )
}
