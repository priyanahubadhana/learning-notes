import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { imageRef } from '../../images/imageRef'
import { ImageError, saveImage } from '../../images/imageService'
import { shrinkImage } from '../../images/shrinkImage'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useRef, useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { DbColumn, JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { findLinkPages, pagesByIds } from '../../links/linkService'
import { TAG_COLORS } from '../../tags/tagTools'
import { tagColorStyle } from '../../tags/tagStyle'
import { findOrCreateTagPath, findTagChoices } from '../../tags/tagService'
import { cellText, starMax } from '../cellDisplay'
import { choiceOptions } from '../columnTypes'
import type { DatabaseData, ResolvedRow } from '../databaseQuery'
import { addChoiceOption } from '../databaseService'
import type { FValue } from '../formula/formulaValue'
import { PopItem, PopSeparator, Popover } from './Popover'
import { numberTyping } from './columnFilters'
import { currentIds } from './cellEditing'

/**
 * Text editor inside a cell. Enter or leaving saves, Esc cancels.
 * Dates get the browser's date picker.
 */
export function InlineEditor({
  column,
  label,
  initial,
  onSave,
  onCancel,
}: {
  column: DbColumn | null
  label: string
  initial: string
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const done = useRef(false)
  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    if (save && value !== initial) onSave(value)
    else onCancel()
  }
  const type =
    column?.type === 'date'
      ? column.config.includeTime === true
        ? 'datetime-local'
        : 'date'
      : column?.type === 'url'
        ? 'url'
        : 'text'
  return (
    <input
      autoFocus
      type={type}
      aria-label={label}
      value={value}
      inputMode={column?.type === 'number' ? 'decimal' : undefined}
      onFocus={(e) => {
        if (type === 'text' || type === 'url') e.currentTarget.select()
      }}
      onChange={(e) =>
        setValue(
          column?.type === 'number'
            ? numberTyping(e.target.value)
            : e.target.value,
        )
      }
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish(false)
        }
      }}
      className="-my-1 min-h-8 w-full min-w-28 rounded-md border border-accent bg-bg px-1.5 outline-none"
    />
  )
}

/**
 * A checkbox cell. It shows the new state at once, while it is saved
 * (and goes back if saving fails).
 */
export function CheckCell({
  checked,
  label,
  onSet,
}: {
  checked: boolean
  label: string
  onSet: (checked: boolean) => Promise<boolean>
}) {
  const [pending, setPending] = useState<boolean | null>(null)
  if (pending !== null && pending === checked) setPending(null) // saved
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={pending ?? checked}
      onChange={async (e) => {
        const next = e.target.checked
        setPending(next)
        if (!(await onSet(next))) setPending(null)
      }}
      className="size-4 accent-[var(--color-accent)]"
    />
  )
}

/** A ★ rating: tap a star to set it, tap the current one to clear. */
export function StarCell({
  column,
  value,
  label,
  onSet,
}: {
  column: DbColumn
  value: FValue
  label: string
  onSet: (stars: number | null) => void
}) {
  const max = starMax(column)
  const current = typeof value === 'number' ? Math.round(value) : 0
  return (
    <div role="group" aria-label={label} className="flex">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={t('table.stars', { count: n })}
          aria-pressed={n === current}
          onClick={() => onSet(n === current ? null : n)}
          className={`-my-1 min-h-8 min-w-6 text-[15px] leading-none ${
            n <= current ? 'text-amber-500' : 'text-muted/35 hover:text-muted'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

/** List cells (choices, tags, links, related rows) as small pills. */
export function CellPills({
  column,
  value,
}: {
  column: DbColumn
  value: FValue
}) {
  const names = (Array.isArray(value) ? value : [value])
    .map((v) => cellText(v))
    .filter((v) => v !== '')
  const options = choiceOptions(column)
  const prefix = column.type === 'tag' ? '#' : ''
  return (
    <span className="flex flex-wrap gap-1">
      {names.map((name, i) => {
        const color = options.find((o) => o.name === name)?.color
        return (
          <span
            key={`${name}-${i}`}
            className={`tag-chip ${color ? 'tag-chip-colored' : ''}`}
            style={tagColorStyle(color)}
          >
            {prefix}
            {name}
          </span>
        )
      })}
    </span>
  )
}

interface PickOption {
  id: string
  label: string
  color?: string
}

/**
 * Picks the value of a Choice, Choices, Tag, Note link or Relation cell:
 * type to find, tap to tick (Choice: tap to pick and close), and Choice /
 * Choices / Tag can create a new option from the typed text.
 */
export function OptionPicker({
  db,
  data,
  column,
  row,
  anchor,
  onSet,
  onClose,
}: {
  db: LearningNotesDB
  data: DatabaseData
  column: DbColumn
  row: ResolvedRow
  anchor: HTMLElement
  onSet: (value: JsonValue) => Promise<void>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const single = column.type === 'choice'
  const ids = currentIds(row, column)
  const query = text.trim().toLocaleLowerCase()
  const matches = (label: string) => label.toLocaleLowerCase().includes(query)

  const tags = useLiveQuery(
    async () => (column.type === 'tag' ? findTagChoices(db, text) : null),
    [db, column.type, text],
  )
  const pages = useLiveQuery(
    async () =>
      column.type !== 'noteLink'
        ? null
        : query
          ? findLinkPages(db, text)
          : pagesByIds(db, ids),
    // ids change with the row; joined so the query reruns only then.
    [db, column.type, text, ids.join()],
  )

  let options: PickOption[] = []
  let create: string | null = null
  if (column.type === 'choice' || column.type === 'choices') {
    const all = choiceOptions(column)
    options = all
      .filter((o) => matches(o.name))
      .map((o) => ({ id: o.id, label: o.name, color: o.color }))
    const exact = all.some((o) => o.name.toLocaleLowerCase() === query)
    create = query && !exact ? text.trim() : null
  } else if (column.type === 'tag') {
    options = (tags?.options ?? []).map((o) => ({
      id: o.tagId,
      label: `#${o.path}`,
      color: o.color,
    }))
    create = tags?.create ?? null
  } else if (column.type === 'noteLink') {
    options = (pages ?? []).map((p) => ({
      id: p.pageId,
      label: p.title || t('review.untitled'),
    }))
  } else if (column.type === 'relation') {
    const rows =
      data.databases.get(String(column.config.databaseId))?.rows ?? []
    options = rows
      .filter((r) => matches(r.title))
      .slice(0, 50)
      .map((r) => ({ id: r.id, label: r.title || t('review.untitled') }))
  }

  const toggle = async (id: string) => {
    if (single) {
      await onSet(ids.includes(id) ? null : id)
      onClose()
      return
    }
    await onSet(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  }
  const make = async () => {
    if (!create) return
    let id: string
    if (column.type === 'tag') {
      id = (await findOrCreateTagPath(db, create)).id
    } else {
      const count = choiceOptions(column).length
      const color = TAG_COLORS[count % TAG_COLORS.length]
      id = (await addChoiceOption(db, column.id, create, color)).id
    }
    setText('')
    await toggle(id)
  }

  return (
    <Popover anchor={anchor} label={column.name} onClose={onClose}>
      <input
        aria-label={t('table.find')}
        placeholder={
          column.type === 'noteLink' ? t('table.findPage') : t('table.find')
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (options[0]) void toggle(options[0].id)
          else void make()
        }}
        className="mb-1 min-h-9 w-full rounded-md border border-line bg-bg px-2 outline-none focus:border-accent"
      />
      {options.map((option) => (
        <PopItem
          key={option.id}
          pressable
          on={ids.includes(option.id)}
          icon={
            option.color ? (
              <span className="tag-dot" style={tagColorStyle(option.color)} />
            ) : undefined
          }
          label={option.label}
          onClick={() => void toggle(option.id)}
        />
      ))}
      {create && (
        <PopItem
          icon="+"
          label={t('table.create', { name: create })}
          onClick={() => void make()}
        />
      )}
      {options.length === 0 && !create && (
        <p className="px-2.5 py-1.5 text-muted">{t('table.noOptions')}</p>
      )}
      {ids.length > 0 && (
        <>
          <PopSeparator />
          <PopItem
            icon="×"
            label={t('table.clear')}
            onClick={() => {
              void onSet(single ? null : [])
              onClose()
            }}
          />
        </>
      )}
    </Popover>
  )
}

/**
 * "Choose a picture from this device": stores the picture in the app and
 * hands back its reference ("lnimg:…") to put in the cell.
 */
export function PictureButton({
  db,
  label,
  onPicked,
}: {
  db: LearningNotesDB
  label: string
  onPicked: (ref: string) => void
}) {
  const ui = useContext(AppUiContext)
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => input.current?.click()}
        className="shrink-0 px-1 text-muted hover:text-accent"
      >
        🖼
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        aria-hidden
        tabIndex={-1}
        data-testid="picture-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          runTask(
            (async () => {
              try {
                const image = await saveImage(db, file, shrinkImage)
                onPicked(imageRef(image.id))
              } catch (error) {
                if (error instanceof ImageError) ui.toast(error.message)
                else throw error
              }
            })(),
          )
        }}
      />
    </>
  )
}
