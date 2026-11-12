import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Icon } from '../../../app/tools/icons'
import { cleanTagName } from '../../../tags/tagNames'
import { Card, type CardCloseReason } from '../Card'
import { tp } from '../textMisc'
import {
  browseTree,
  nearDuplicate,
  searchTags,
  triState,
  withPaths,
  type TagEntry,
  type TagItem,
  type TriState,
} from './tagSearch'
import { TagRow } from './TagRow'
import '../partsMisc.css'

export type TagPickerProps = {
  /** filter: pick tags to filter by. assign: put tags on items (saves at each tap). */
  mode: 'filter' | 'assign'
  tags: TagItem[]
  /** assign: the tag ids on each chosen item (one entry per item, bulk = many). */
  itemTags?: string[][]
  anchor?: HTMLElement | null
  /** filter: tags present in the current results (the others are dimmed). */
  scope?: Set<string>
  /** filter: the ticked tag ids. */
  value?: string[]
  onChange?(ids: string[]): void
  match?: 'any' | 'all'
  onMatch?(m: 'any' | 'all'): void
  includeSub?: boolean
  onIncludeSub?(on: boolean): void
  /** assign: a tap saves at once; the caller shows the Undo toast. */
  onToggle?(tagId: string, on: boolean): void
  /** "Create #name" (parent id or null). The caller saves it. */
  onCreate?(name: string, parentId: string | null): void
  pinned?: string[]
  recent?: string[]
  /** "Suggested for this item" (assign, one item). */
  suggest?: string[]
  onClose(reason?: CardCloseReason): void
  /** Gallery: draw in place, no overlay. */
  placement?: 'anchored' | 'static'
  /** Gallery: phone sheet look. */
  phone?: boolean
  /** Gallery: start with text typed. */
  initialQuery?: string
}

type ViewItem =
  | { kind: 'h'; key: string; text: string }
  | { kind: 'cat'; key: string; tag: TagEntry; total: number; open: boolean }
  | { kind: 'row'; key: string; tag: TagEntry; nav: number; indent: number }
  | { kind: 'create'; key: string; nav: number; name: string }
  | { kind: 'note'; key: string; text: string }

/**
 * The one tag picker for the whole app (SP-05): search first, pinned / recent /
 * suggested / browse by category, multi-select with tri-state, create with a
 * near-duplicate warning. It opens in the Card frame.
 */
export default function TagPicker(props: TagPickerProps) {
  const {
    mode,
    tags,
    itemTags = [],
    anchor = null,
    scope,
    value = [],
    onChange,
    match = 'any',
    onMatch,
    includeSub = false,
    onIncludeSub,
    onToggle,
    onCreate,
    pinned = [],
    recent = [],
    suggest = [],
    onClose,
    placement,
    phone,
    initialQuery = '',
  } = props
  const uid = useId()
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [parent, setParent] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const entries = useMemo(() => withPaths(tags), [tags])
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])
  const pick = (ids: string[]) =>
    ids.map((i) => byId.get(i)).filter((t): t is TagEntry => !!t)

  const stateOf = (id: string): TriState =>
    mode === 'filter'
      ? value.includes(id)
        ? 'all'
        : 'none'
      : triState(id, itemTags)

  const cleaned = cleanTagName(query)
  const typed = query.trim().length > 0
  const exact =
    typed &&
    entries.some(
      (e) =>
        e.name.toLowerCase() === query.replace(/^#/, '').trim().toLowerCase(),
    )
  const canCreate = typed && !exact && cleaned.length > 0 && !!onCreate
  const dup = canCreate ? nearDuplicate(query, entries) : null

  const { view, navCount } = useMemo(() => {
    const out: ViewItem[] = []
    let nav = 0
    const row = (key: string, tag: TagEntry, indent = 0) =>
      out.push({ kind: 'row', key, tag, nav: nav++, indent })
    if (typed) {
      const found = searchTags(query, entries)
      if (found.length)
        out.push({ kind: 'h', key: 'h-res', text: tp('parts.tags.results') })
      found.forEach((m) => row(`r-${m.tag.id}`, m.tag))
      if (canCreate)
        out.push({ kind: 'create', key: 'create', nav: nav++, name: cleaned })
      else if (!found.length)
        out.push({
          kind: 'note',
          key: 'nomatch',
          text: tp('parts.tags.noMatch'),
        })
    } else if (entries.length === 0) {
      out.push({ kind: 'note', key: 'empty', text: tp('parts.tags.empty') })
    } else {
      const section = (key: string, text: string, list: TagEntry[]) => {
        if (!list.length) return
        out.push({ kind: 'h', key: `h-${key}`, text })
        list.forEach((t) => row(`${key}-${t.id}`, t))
      }
      section('pin', tp('parts.tags.pinned'), pick(pinned))
      section('rec', tp('parts.tags.recent'), pick(recent).slice(0, 4))
      if (mode === 'assign' && itemTags.length === 1)
        section('sug', tp('parts.tags.suggested'), pick(suggest))
      const { categories, uncategorised } = browseTree(entries)
      if (categories.length || uncategorised.length)
        out.push({ kind: 'h', key: 'h-browse', text: tp('parts.tags.browse') })
      for (const c of categories) {
        const isOpen = open.has(c.category.id)
        out.push({
          kind: 'cat',
          key: `c-${c.category.id}`,
          tag: c.category,
          total: c.total,
          open: isOpen,
        })
        if (isOpen) {
          row(`cr-${c.category.id}`, c.category, 1)
          c.tags.forEach((t) =>
            row(`cr-${t.id}`, t, t.path.length - c.category.path.length + 1),
          )
        }
      }
      if (uncategorised.length) {
        out.push({
          kind: 'h',
          key: 'h-un',
          text: tp('parts.tags.uncategorised'),
        })
        uncategorised.forEach((t) => row(`u-${t.id}`, t))
      }
    }
    return { view: out, navCount: nav }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    typed,
    query,
    entries,
    canCreate,
    cleaned,
    open,
    pinned,
    recent,
    suggest,
    mode,
    itemTags.length,
  ])

  const navItems = view.filter(
    (v): v is Extract<ViewItem, { nav: number }> => 'nav' in v,
  )
  const activeIdx = Math.min(active, Math.max(0, navCount - 1))
  const optId = (n: number) => `${uid}-opt-${n}`

  const toggleTag = (id: string) => {
    if (mode === 'filter') {
      onChange?.(
        value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
      )
    } else {
      onToggle?.(id, stateOf(id) !== 'all')
    }
  }
  const create = () => {
    if (!canCreate) return
    onCreate?.(cleaned, parent || null)
    setQuery('')
    inputRef.current?.focus()
  }
  const activate = (item: (typeof navItems)[number]) =>
    item.kind === 'create' ? create() : toggleTag(item.tag.id)

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!navCount) return
      const d = e.key === 'ArrowDown' ? 1 : -1
      setActive((activeIdx + d + navCount) % navCount)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = navItems[activeIdx]
      if (item) activate(item)
    } else if (e.key === 'Escape') {
      if (query) {
        // Esc clears the text first; a second Esc closes.
        e.stopPropagation()
        setQuery('')
        setActive(0)
      }
    } else if (
      e.key === 'Backspace' &&
      !query &&
      mode === 'filter' &&
      value.length
    ) {
      onChange?.(value.slice(0, -1))
    }
    // Letters never reach the page behind (Tab and Esc stay for the frame).
    if (e.key !== 'Tab' && e.key !== 'Escape') e.stopPropagation()
  }

  const phoneLook = !!phone
  const footer: ReactNode =
    mode === 'filter' ? (
      <div className="pm-tp__foot">
        <button
          type="button"
          className="pm-btn pm-btn--quiet"
          data-testid="tp-clear"
          disabled={!value.length}
          onClick={() => onChange?.([])}
        >
          {tp('parts.tags.clear')}
        </button>
        <span data-testid="tp-count" aria-live="polite">
          {tp('parts.tags.ticked', { count: value.length })}
        </span>
        <button
          type="button"
          className="pm-btn"
          data-testid="tp-done"
          onClick={() => onClose('x')}
        >
          {tp('parts.tags.done')}
        </button>
      </div>
    ) : (
      <div className="pm-tp__foot">
        <span data-testid="tp-hint">{tp('parts.tags.assignHint')}</span>
        <button
          type="button"
          className="pm-btn"
          data-testid="tp-done"
          onClick={() => onClose('x')}
        >
          {tp('parts.tags.done')}
        </button>
      </div>
    )

  return (
    <Card
      anchor={anchor}
      size="pick"
      title={tp('parts.tags.title')}
      onClose={(r) => onClose(r)}
      footer={footer}
      placement={placement}
      phone={phoneLook}
      testId="tag-picker"
    >
      <div
        className="pm-tp__body-wrap"
        data-testid="tag-picker-body"
        data-mode={mode}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <div className="pm-tp__field">
          <input
            ref={inputRef}
            className="pm-tp__input"
            data-testid="tp-search"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={navCount ? optId(activeIdx) : undefined}
            aria-autocomplete="list"
            aria-label={tp('parts.tags.search')}
            placeholder={tp('parts.tags.search')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
          {query && (
            <button
              type="button"
              className="pm-x"
              data-testid="tp-clear-text"
              aria-label={tp('parts.tags.clear')}
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {mode === 'filter' && (
          <div className="pm-tp__opts" data-testid="tp-options">
            <span id={`${uid}-match`}>{tp('parts.tags.match')}</span>
            <div
              role="radiogroup"
              aria-labelledby={`${uid}-match`}
              style={{ display: 'flex', gap: 2 }}
            >
              {(['any', 'all'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={match === m}
                  className="pm-seg"
                  data-testid={`tp-match-${m}`}
                  style={{ minHeight: 44 }}
                  onClick={() => onMatch?.(m)}
                >
                  {m === 'any'
                    ? tp('parts.tags.matchAny')
                    : tp('parts.tags.matchAll')}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeSub}
              className="pm-btn pm-btn--quiet"
              data-testid="tp-include-sub"
              title={tp('parts.tags.includeSubHint')}
              onClick={() => onIncludeSub?.(!includeSub)}
            >
              {includeSub ? '● ' : '○ '}
              {tp('parts.tags.includeSub')}
            </button>
          </div>
        )}

        <div
          id={`${uid}-list`}
          role="listbox"
          aria-multiselectable="true"
          aria-label={tp('parts.tags.title')}
          className="pm-tp__body"
          data-testid="tp-list"
        >
          {view.map((v) => {
            switch (v.kind) {
              case 'h':
                return (
                  <div key={v.key} className="pm-tp__h" role="presentation">
                    {v.text}
                  </div>
                )
              case 'note':
                return (
                  <p
                    key={v.key}
                    className="pm-dlg__hint"
                    role="presentation"
                    style={{ padding: 8 }}
                  >
                    {v.text}
                  </p>
                )
              case 'cat':
                return (
                  <button
                    key={v.key}
                    type="button"
                    className="pm-row"
                    aria-expanded={v.open}
                    data-testid={`tp-cat-${v.tag.id}`}
                    onClick={() =>
                      setOpen((s) => {
                        const n = new Set(s)
                        if (n.has(v.tag.id)) n.delete(v.tag.id)
                        else n.add(v.tag.id)
                        return n
                      })
                    }
                  >
                    <Icon
                      name={v.open ? 'chevronDown' : 'chevronRight'}
                      size={16}
                    />
                    <span className="pm-row__main">
                      <span className="pm-row__name">{v.tag.name}</span>
                    </span>
                    <span className="pm-row__count">{v.total}</span>
                  </button>
                )
              case 'create':
                return (
                  <div
                    key={v.key}
                    id={optId(v.nav)}
                    role="option"
                    aria-selected={false}
                    data-active={v.nav === activeIdx}
                    data-testid="tp-create-row"
                    className="pm-row"
                    onClick={create}
                  >
                    <Icon name="plus" size={18} />
                    <span className="pm-row__main">
                      <span className="pm-row__name">
                        {tp('parts.tags.create', { name: v.name })}
                      </span>
                    </span>
                  </div>
                )
              case 'row': {
                const dim = mode === 'filter' && !!scope && !scope.has(v.tag.id)
                return (
                  <TagRow
                    key={v.key}
                    id={optId(v.nav)}
                    tag={v.tag}
                    state={stateOf(v.tag.id)}
                    active={v.nav === activeIdx}
                    dim={dim}
                    indent={v.indent}
                    showPath={typed}
                    onToggle={() => toggleTag(v.tag.id)}
                  />
                )
              }
            }
          })}
        </div>

        {canCreate && (
          <div className="pm-tp__create" data-testid="tp-create-panel">
            <label className="pm-dlg__hint" htmlFor={`${uid}-parent`}>
              {tp('parts.tags.putUnder')}
            </label>
            <select
              id={`${uid}-parent`}
              className="pm-select"
              data-testid="tp-parent"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            >
              <option value="">{tp('parts.tags.nothing')}</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.path.join(' › ')}
                </option>
              ))}
            </select>
            {dup && (
              <div className="pm-warn" role="alert" data-testid="tp-duplicate">
                <span>{tp('parts.tags.duplicate', { name: dup.name })}</span>
                <button
                  type="button"
                  className="pm-btn pm-btn--quiet"
                  data-testid="tp-use-existing"
                  onClick={() => {
                    toggleTag(dup.id)
                    setQuery('')
                  }}
                >
                  {tp('parts.tags.useExisting', { name: dup.name })}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
