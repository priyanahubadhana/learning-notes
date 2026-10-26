import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useRef, useState } from 'react'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { TagLabel } from './TagChip'
import { tagColorStyle } from './tagStyle'
import { findOrCreateTagPath, findTagChoices } from './tagService'

/** Width of the picker, and its gap from the screen edge. */
const WIDTH = 300
const EDGE = 12

/**
 * The "Add tag" picker: find a tag by name (any level; "/" for levels) or
 * create one. Keys: ↑ ↓ Enter, Esc closes. Full width on phones.
 */
export function TagPicker({
  db,
  at,
  exclude,
  onPick,
  onClose,
}: {
  db: LearningNotesDB
  /** The button it opens from. */
  at: DOMRect | undefined
  /** Tags not to offer (already there). */
  exclude: readonly string[]
  onPick: (tagId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState(0)
  const listId = useId()

  const load = async (typed: string) => {
    const found = await findTagChoices(db, typed, { limit: 50 })
    return {
      text: typed,
      options: found.options.filter((o) => !exclude.includes(o.tagId)),
      create: found.create,
    }
  }
  const choices = useLiveQuery(() => load(text), [db, text])
  const options = choices?.options ?? []
  const create = choices?.create ?? null
  const rows = options.length + (create ? 1 : 0)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [onClose])

  useEffect(() => {
    document
      .getElementById(`${listId}-${selected}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, listId])

  const pickFrom = (list: typeof options, made: string | null, i: number) => {
    const option = list[i]
    if (option) return onPick(option.tagId)
    if (made && i === list.length) {
      runTask(findOrCreateTagPath(db, made).then((tag) => onPick(tag.id)))
    }
  }
  const pickRow = (i: number) => {
    // Enter right after typing: the list may not show the latest text yet,
    // so look it up first (the first row is picked).
    if (choices?.text === text) return pickFrom(options, create, i)
    runTask(
      load(text).then((fresh) => pickFrom(fresh.options, fresh.create, 0)),
    )
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(rows - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(0, s - 1))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      pickRow(selected)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const style: React.CSSProperties = {
    top: Math.min((at?.bottom ?? 120) + 6, window.innerHeight - 340),
    left: Math.max(
      EDGE,
      Math.min(at?.left ?? 40, window.innerWidth - WIDTH - EDGE),
    ),
  }
  const optionId = (i: number) => `${listId}-${i}`
  const rowClass = (i: number) =>
    `flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-start text-sm hover:bg-hover ${
      selected === i
        ? 'bg-hover shadow-[inset_2px_0_0_var(--color-accent)]'
        : ''
    }`

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('tags.picker')}
      style={style}
      className="fixed z-50 w-[300px] rounded-[10px] border border-line bg-bg p-1.5 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.16)] phone:!inset-x-3 phone:w-auto"
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSelected(0)
        }}
        onKeyDown={onKeyDown}
        placeholder={t('tags.find')}
        aria-label={t('tags.find')}
        role="combobox"
        aria-expanded={rows > 0}
        aria-controls={listId}
        aria-activedescendant={rows > 0 ? optionId(selected) : undefined}
        autoComplete="off"
        className="mb-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
      />
      <div
        id={listId}
        role="listbox"
        aria-label={t('tags.menu')}
        className="max-h-[260px] overflow-y-auto"
      >
        {rows === 0 && choices && (
          <p className="px-2 py-3 text-sm text-muted">
            {text.trim() ? t('tags.noMatch') : t('tags.typeToCreate')}
          </p>
        )}
        {options.map((o, i) => (
          <button
            key={o.tagId}
            id={optionId(i)}
            type="button"
            role="option"
            aria-selected={selected === i}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pickRow(i)}
            className={rowClass(i)}
            style={tagColorStyle(o.color)}
          >
            <span className="truncate">
              <TagLabel names={o.names} color={o.color} />
            </span>
          </button>
        ))}
        {create && (
          <button
            id={optionId(options.length)}
            type="button"
            role="option"
            aria-selected={selected === options.length}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pickRow(options.length)}
            className={rowClass(options.length)}
          >
            <span className="truncate">
              {t('tags.create', { name: create })}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
