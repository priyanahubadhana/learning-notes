import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'

/**
 * The "Name it" sheet: a centred dialog with a large text field, used to
 * name a new notebook or page and to rename one. It replaces the small inline
 * name box on touch and Pencil devices, where a palm or Pencil tip hit the
 * row's buttons around it and Scribble had no room.
 *
 * It is a native modal dialog: everything behind it is inert, focus stays
 * inside, Esc cancels. Enter means Done; an empty or unchanged name is
 * the same as Cancel (the item keeps its current name).
 */
export function NameSheet({
  title,
  initial,
  onDone,
  onCancel,
}: {
  title: string
  initial: string
  /** A new, non-empty name. */
  onDone: (name: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initial)

  useEffect(() => {
    ref.current?.showModal()
    input.current?.focus()
    input.current?.select()
  }, [])

  const finish = () => {
    const name = value.trim()
    if (!name || name === initial.trim()) onCancel()
    else onDone(name)
  }

  return createPortal(
    <dialog
      ref={ref}
      data-testid="name-sheet"
      data-palm-guard
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop:bg-black/30"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          finish()
        }}
      >
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        <input
          ref={input}
          value={value}
          aria-label={t('ui.name')}
          autoComplete="off"
          autoCapitalize="sentences"
          onChange={(e) => setValue(e.target.value)}
          style={{ minHeight: 56 }}
          className="mb-5 box-border w-full rounded-xl border border-line bg-bg px-4 text-xl outline-none focus:border-accent"
        />
        <div className="flex justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 min-w-20 rounded-lg px-4 text-muted hover:bg-hover hover:text-ink"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="submit"
            className="min-h-11 min-w-20 rounded-lg bg-accent px-4 font-medium text-white"
          >
            {t('bar.done')}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}
