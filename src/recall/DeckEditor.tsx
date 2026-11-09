import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { byOrder } from '../core/order'
import { isLive } from '../core/records'
import type { Deck, DeckState, Page, Tag } from '../core/types'
import { displayName, sampleName } from '../i18n/defaultNames'
import { t, type MessageKey } from '../i18n/t'
import { listPages } from '../pages/pageService'
import { createDeck, deckCards, updateDeck } from './deckService'

/**
 * New deck / Edit deck (E1) in three short steps: Where the cards are, Which
 * cards, and the Name with a colour. A live line says how many cards match.
 */

const STEPS = ['where', 'which', 'name'] as const
const STATES: DeckState[] = ['new', 'learning', 'due', 'all']
const DECK_COLOURS = [
  '#2f6fed',
  '#1f9d6b',
  '#c9821a',
  '#d6455d',
  '#8a56d6',
  '#0f9bb0',
  '#6b7280',
] as const

export function DeckEditor({
  db,
  deck,
  initial,
  onClose,
}: {
  db: LearningNotesDB
  /** Editing this deck; unset = a new one. */
  deck?: Deck
  /** A starting point for a new deck (e.g. from a saved search). */
  initial?: Partial<Deck>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  const seed = deck ?? initial
  const [notebookIds, setNotebookIds] = useState<string[]>(
    seed?.scope?.notebookIds ?? [],
  )
  const [pageIds, setPageIds] = useState<string[]>(seed?.scope?.pageIds ?? [])
  const [withSub, setWithSub] = useState(seed?.scope?.withSubpages ?? true)
  const [tagIds, setTagIds] = useState<string[]>(seed?.tagIds ?? [])
  const [tagMode, setTagMode] = useState<'any' | 'all'>(seed?.tagMode ?? 'any')
  const [states, setStates] = useState<DeckState[]>(seed?.states ?? ['all'])
  const [name, setName] = useState(seed?.name ?? '')
  const [colour, setColour] = useState<string>(seed?.colour ?? DECK_COLOURS[0])
  const [route, setRoute] = useState(seed?.routeOrder ?? false)
  const [open, setOpen] = useState<Set<string>>(new Set())

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const notebooks = useLiveQuery(
    async () =>
      (await db.notebooks.toArray())
        .filter(
          (n) => isLive(n) && n.kind !== 'templates' && n.kind !== 'databases',
        )
        .sort(byOrder),
    [db],
    [],
  )
  const tags = useLiveQuery(
    async () => (await db.tags.toArray()).filter((x) => x.deletedAt === null),
    [db],
    [] as Tag[],
  )
  // "medicine/cardio": a tag with its parents.
  const tagPath = (tag: Tag): string => {
    const names = [tag.name]
    let parent = tag.parentId
    while (parent && names.length < 8) {
      const up = tags.find((x) => x.id === parent)
      if (!up) break
      names.unshift(up.name)
      parent = up.parentId
    }
    return names.join('/')
  }

  const draft: Deck = {
    id: deck?.id ?? 'draft',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    order: deck?.order ?? 'a0',
    name,
    colour,
    scope: { notebookIds, pageIds, withSubpages: withSub },
    tagIds,
    tagMode,
    states,
    ...(route && { routeOrder: true }),
  }
  const matchKey = JSON.stringify([
    notebookIds,
    pageIds,
    withSub,
    tagIds,
    tagMode,
    states,
    route,
  ])
  const count = useLiveQuery(
    async () => (await deckCards(db, draft, Date.now())).length,
    [db, matchKey],
  )

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

  const toggleState = (state: DeckState) => {
    if (state === 'all') return setStates(['all'])
    const without = states.filter((s) => s !== 'all')
    const next = toggle(without, state)
    setStates(next.length ? next : ['all'])
  }

  const save = async () => {
    const fields = {
      name: name.trim() || t('decks.untitled'),
      colour,
      scope: { notebookIds, pageIds, withSubpages: withSub },
      tagIds,
      tagMode,
      states,
      routeOrder: route ? true : undefined,
    }
    if (deck) await updateDeck(db, deck.id, fields)
    else await createDeck(db, fields)
    onClose()
  }

  const stepLabel = (s: (typeof STEPS)[number]) =>
    t(`decks.step.${s}` as MessageKey)

  return (
    <dialog
      ref={ref}
      aria-label={t(deck ? 'decks.editTitle' : 'decks.newTitle')}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto flex max-h-[min(40rem,calc(100dvh-2rem))] w-[min(30rem,calc(100vw-2rem))] flex-col rounded-xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 className="mb-1 text-[15px] font-semibold">
        {t(deck ? 'decks.editTitle' : 'decks.newTitle')}
      </h2>
      <ol className="mb-3 flex gap-1 text-xs" aria-label={t('decks.steps')}>
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={`flex-1 rounded-lg px-2 py-1.5 text-center ${
              i === step ? 'bg-hover font-semibold text-accent' : 'text-muted'
            }`}
          >
            {i + 1}. {stepLabel(s)}
          </li>
        ))}
      </ol>

      <div className="min-h-0 flex-1 overflow-auto">
        {step === 0 && (
          <div>
            <p className="mb-2 text-xs text-muted">{t('decks.where.hint')}</p>
            <ul className="grid gap-0.5">
              {notebooks.map((n) => (
                <NotebookRow
                  key={n.id}
                  db={db}
                  notebookId={n.id}
                  title={displayName(n.title) || t('review.untitled')}
                  checked={notebookIds.includes(n.id)}
                  open={open.has(n.id)}
                  onToggleOpen={() => setOpen(new Set(toggle([...open], n.id)))}
                  onCheck={() => setNotebookIds(toggle(notebookIds, n.id))}
                  pageIds={pageIds}
                  onCheckPage={(id) => setPageIds(toggle(pageIds, id))}
                />
              ))}
            </ul>
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withSub}
                onChange={(e) => setWithSub(e.target.checked)}
                className="size-5"
              />
              {t('decks.where.sub')}
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3">
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-muted">
                {t('decks.tags')}
              </legend>
              {tags.length === 0 ? (
                <p className="text-xs text-muted">{t('decks.tags.none')}</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => {
                    const on = tagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTagIds(toggle(tagIds, tag.id))}
                        className={`min-h-11 rounded-lg border px-3 text-sm ${
                          on
                            ? 'border-accent bg-hover font-semibold text-accent'
                            : 'border-line hover:bg-hover'
                        }`}
                      >
                        {tagPath(tag)}
                      </button>
                    )
                  })}
                </div>
              )}
              {tagIds.length > 1 && (
                <div
                  role="radiogroup"
                  aria-label={t('decks.tags')}
                  className="mt-2 flex gap-1"
                >
                  {(['any', 'all'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={tagMode === mode}
                      onClick={() => setTagMode(mode)}
                      className={`min-h-11 flex-1 rounded-lg border px-2 text-sm ${
                        tagMode === mode
                          ? 'border-accent bg-hover font-semibold text-accent'
                          : 'border-line hover:bg-hover'
                      }`}
                    >
                      {t(`decks.tags.${mode}` as MessageKey)}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-muted">
                {t('decks.states')}
              </legend>
              <div className="flex flex-wrap gap-1">
                {STATES.map((s) => {
                  const on = states.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleState(s)}
                      className={`min-h-11 min-w-20 rounded-lg border px-3 text-sm ${
                        on
                          ? 'border-accent bg-hover font-semibold text-accent'
                          : 'border-line hover:bg-hover'
                      }`}
                    >
                      {t(`decks.state.${s}` as MessageKey)}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={route}
                onChange={(e) => setRoute(e.target.checked)}
                className="size-5"
              />
              <span>
                {t('decks.route')}
                <span className="block text-xs text-muted">
                  {t('decks.route.hint')}
                </span>
              </span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs text-muted">
              {t('decks.name')}
              <input
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 rounded-lg border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <div
              role="radiogroup"
              aria-label={t('decks.colour')}
              className="flex flex-wrap gap-2"
            >
              {DECK_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={colour === c}
                  aria-label={c}
                  onClick={() => setColour(c)}
                  style={{ background: c }}
                  className={`size-11 rounded-full border-2 ${
                    colour === c ? 'border-ink' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <p data-deck-match aria-live="polite" className="mt-3 text-sm text-muted">
        {t('decks.match', { count: count ?? 0 })}
      </p>
      <div className="mt-3 flex justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={step === 0 ? onClose : () => setStep(step - 1)}
          className="min-h-11 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink"
        >
          {t(step === 0 ? 'dialog.cancel' : 'decks.back')}
        </button>
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="min-h-11 rounded-lg bg-accent px-4 font-medium text-white hover:opacity-90"
          >
            {t('decks.next')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void save()}
            className="min-h-11 rounded-lg bg-accent px-4 font-medium text-white hover:opacity-90"
          >
            {t(deck ? 'dialog.save' : 'decks.create')}
          </button>
        )}
      </div>
    </dialog>
  )
}

/** One notebook of the Where step: tick it, or open it and tick pages. */
function NotebookRow({
  db,
  notebookId,
  title,
  checked,
  open,
  onToggleOpen,
  onCheck,
  pageIds,
  onCheckPage,
}: {
  db: LearningNotesDB
  notebookId: string
  title: string
  checked: boolean
  open: boolean
  onToggleOpen: () => void
  onCheck: () => void
  pageIds: string[]
  onCheckPage: (id: string) => void
}) {
  const pages = useLiveQuery(
    async () => (open ? listPages(db, notebookId) : []),
    [db, notebookId, open],
    [] as Page[],
  )
  const children = (parent: string | null) =>
    pages.filter((p) => p.parentId === parent)
  const renderPages = (parent: string | null, depth: number) =>
    children(parent).map((p) => (
      <li key={p.id}>
        <label
          className="flex min-h-11 items-center gap-2 text-sm"
          style={{ paddingInlineStart: `${depth * 16 + 28}px` }}
        >
          <input
            type="checkbox"
            checked={pageIds.includes(p.id)}
            onChange={() => onCheckPage(p.id)}
            className="size-5"
          />
          <span className="min-w-0 truncate">
            {sampleName(p) || p.title || t('review.untitled')}
          </span>
        </label>
        <ul>{renderPages(p.id, depth + 1)}</ul>
      </li>
    ))
  return (
    <li>
      <div className="flex min-h-11 items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-label={t('decks.where.pages', { name: title })}
          onClick={onToggleOpen}
          className="grid size-11 place-items-center rounded-lg text-muted hover:bg-hover"
        >
          {open ? '▾' : '▸'}
        </button>
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheck}
            className="size-5"
          />
          <span className="min-w-0 truncate">{title}</span>
        </label>
      </div>
      {open && <ul>{renderPages(null, 0)}</ul>}
    </li>
  )
}
