import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { t, type MessageKey } from '../../i18n/t'
import { pinAction, unpinAction } from '../deviceMode'
import { Icon } from './icons'
import {
  activeSet,
  readSetTools,
  writeSetTools,
  useSetTools,
} from './toolbarState'
import { tabLabel } from './toolRegistry'
import {
  GROUP_ORDER,
  MAX_SHOWN,
  buildRows,
  rowMatches,
  type Group,
  type Row,
} from './controlRows'

/**
 * The control panel: a search box over EVERY feature and setting, grouped
 * like the ribbon tabs. Each row says where the feature lives and its
 * shortcut, runs when chosen (or opens that setting) and can be pinned to
 * the tool bar. It is a plain filter over the list in `toolRegistry.ts` and
 * the settings registry, so a new feature only adds one line there.
 */

const groupName = (group: Group): string =>
  group === 'settings'
    ? t('settings.title')
    : group === 'go'
      ? t('panel.where.go')
      : tabLabel(group)

export function ControlPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(document.activeElement)
  const set = activeSet.useValue()
  const onBar = useSetTools(set)
  const rows = useMemo(() => buildRows(), [])

  const found = rows.filter((row) => rowMatches(row.haystack, query))
  const shown = found.slice(0, MAX_SHOWN)
  const groups = GROUP_ORDER.flatMap((group) => {
    const list = shown.filter((row) => row.group === group)
    return list.length > 0 ? [{ group, list }] : []
  })

  useEffect(() => {
    input.current?.focus()
    const back = opener.current
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [])

  const run = (row: Row) => {
    onClose()
    // After the panel is gone, so the page has its focus back first.
    setTimeout(row.run, 0)
  }

  const togglePin = (id: string) => {
    const list = readSetTools(set)
    writeSetTools(
      set,
      list.includes(id) ? unpinAction(list, id) : pinAction(list, id),
    )
  }

  const runButtons = () => [
    ...(dialog.current?.querySelectorAll<HTMLElement>('[data-panel-run]') ??
      []),
  ]

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key === 'Tab') {
      // Keep the focus inside the panel.
      const focusable = [
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          'input, button:not([disabled])',
        ) ?? []),
      ]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const buttons = runButtons()
    const at = buttons.indexOf(document.activeElement as HTMLElement)
    e.preventDefault()
    if (e.key === 'ArrowDown')
      buttons[at + 1 < buttons.length ? at + 1 : 0]?.focus()
    else if (at <= 0) input.current?.focus()
    else buttons[at - 1]?.focus()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-start justify-items-center bg-black/40 p-4 pt-[8vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('panel.title')}
        onKeyDown={onKeyDown}
        className="flex max-h-[80vh] w-full max-w-xl flex-col gap-2 rounded-2xl border border-line bg-bg p-3 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center gap-2">
          <h2 className="px-1 text-base font-semibold">{t('panel.title')}</h2>
          <span className="grow" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('panel.close')}
            title={t('panel.close')}
            className="grid size-11 place-items-center rounded-xl text-ink-soft hover:bg-hover"
          >
            <Icon name="close" />
          </button>
        </div>
        <input
          ref={input}
          type="search"
          value={query}
          aria-label={t('panel.search')}
          placeholder={t('panel.placeholder')}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && shown[0]) {
              e.preventDefault()
              run(shown[0])
            }
          }}
          className="min-h-11 w-full rounded-xl border border-line bg-soft px-3 text-base text-ink placeholder:text-ink-soft"
        />
        <p
          role="status"
          aria-live="polite"
          className="px-1 text-xs text-ink-soft"
        >
          {found.length === 0
            ? t('panel.none')
            : t('panel.count', { count: found.length })}
        </p>
        <div className="min-h-0 overflow-y-auto">
          {groups.map(({ group, list }) => (
            <section key={group} aria-label={groupName(group)} className="mb-2">
              <h3 className="px-2 pt-1 pb-0.5 text-xs font-semibold text-ink-soft uppercase">
                {groupName(group)}
              </h3>
              <ul>
                {list.map((row) => {
                  const pinned = row.pinId ? onBar.includes(row.pinId) : false
                  return (
                    <li
                      key={row.key}
                      data-panel-row={row.key}
                      className="flex items-center gap-1 rounded-xl hover:bg-hover"
                    >
                      <button
                        type="button"
                        data-panel-run
                        onClick={() => run(row)}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left"
                      >
                        <span aria-hidden className="text-ink-soft">
                          <Icon name={row.icon} size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {row.label}
                          </span>
                          <span className="block truncate text-xs text-ink-soft">
                            {row.coming ?? row.where}
                          </span>
                        </span>
                        {row.shortcut && (
                          <kbd className="shrink-0 rounded border border-line px-1.5 font-mono text-[11px] text-ink-soft">
                            {row.shortcut}
                          </kbd>
                        )}
                      </button>
                      {row.pinId && (
                        <button
                          type="button"
                          aria-pressed={pinned}
                          aria-label={t(
                            pinned ? 'panel.unpinNamed' : 'panel.pinNamed',
                            { name: row.label },
                          )}
                          onClick={() => togglePin(row.pinId!)}
                          className="min-h-11 shrink-0 rounded-xl border border-line px-3 text-xs hover:bg-hover aria-pressed:bg-hover aria-pressed:font-semibold"
                        >
                          {t(
                            pinned
                              ? 'panel.pinned'
                              : ('panel.pin' as MessageKey),
                          )}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {found.length > shown.length && (
            <p className="px-2 py-1 text-xs text-ink-soft">
              {t('panel.narrow')}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
