import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { downloadFile } from '../../app/download'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import type { Page } from '../../core/types'
import { EmptyState } from '../../design/parts/EmptyState'
import { t } from '../../i18n/t'
import { placeLabel } from '../../reader/annotations/annotationService'
import { listTags } from '../../tags/tagService'
import { loadExportItems } from './exportData'
import { DEFAULT_EXPORT, buildMarkdown, planExport } from './exportBuilder'
import {
  newCollectionId,
  setPrefsWithUndo,
  useLibraryPrefs,
  type JournalEntry,
} from './libraryPrefs'
import { tagTree, themeItems, type TagNode } from './themeLogic'

function useTagData(db: LearningNotesDB) {
  const live = useLiveQuery(() => listTags(db), [db])
  const tags = useMemo(() => live ?? [], [live])
  const annotations = useLiveQuery(
    async () => (await db.annotations.toArray()).filter(isLive),
    [db],
  )
  return { tags, annotations: annotations ?? [] }
}

/** One theme page: everything with a tag (and its sub-tags), with Export (LB-P18). */
function ThemePage({
  db,
  tagId,
  pages,
  onBack,
  onOpenPage,
  onDelete,
  backLabel,
}: {
  db: LearningNotesDB
  tagId: string
  pages: readonly Page[]
  onBack: () => void
  onOpenPage: (id: string) => void
  onDelete?: () => void
  backLabel: string
}) {
  const { toast } = useContext(AppUiContext)
  const { tags, annotations } = useTagData(db)
  const tag = tags.find((x) => x.id === tagId)
  const items = themeItems(tagId, tags, pages, annotations)
  const n = items.books.length + items.highlights.length
  const names = new Map(
    pages.map((p) => [p.id, p.title || t('review.untitled')]),
  )
  const exportIt = () =>
    runTask(
      loadExportItems(
        db,
        items.books.map((b) => b.id),
      ).then(({ items: rows }) => {
        const o = { ...DEFAULT_EXPORT, bookIds: items.books.map((b) => b.id) }
        const plan = planExport(rows, [], o)
        downloadFile(
          `learning-notes-${(tag?.name ?? 'theme').replace(/[^\p{L}\p{N}]+/gu, '-')}.md`,
          buildMarkdown(plan, o),
          'text/markdown',
        )
        toast(t('lib2.export.doneMd'))
      }),
    )
  return (
    <div data-testid="theme-page" className="mt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          ‹ {backLabel}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          data-testid="theme-export"
          onClick={exportIt}
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {t('lib2.export.button')}
        </button>
        {onDelete && (
          <button
            type="button"
            data-testid="theme-delete"
            onClick={onDelete}
            className="min-h-11 rounded-lg border border-line px-3 text-sm text-danger hover:bg-hover"
          >
            {t('lib2.themes.remove')}
          </button>
        )}
      </div>
      <h2 className="mt-2 text-xl font-semibold">#{tag?.name ?? ''}</h2>
      <p className="mb-2 text-sm text-muted">{t('lib2.themes.count', { n })}</p>
      {n === 0 ? (
        <EmptyState icon="pin" text={t('lib2.themes.tagEmpty')} />
      ) : (
        <>
          <h3 className="mt-3 mb-1 text-sm font-semibold text-muted">
            {t('lib2.search.books')}
          </h3>
          <ul>
            {items.books.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpenPage(b.id)}
                  className="min-h-11 w-full text-start text-sm hover:bg-hover"
                >
                  {b.title || t('review.untitled')}
                </button>
              </li>
            ))}
          </ul>
          {items.highlights.length > 0 && (
            <>
              <h3 className="mt-3 mb-1 text-sm font-semibold text-muted">
                {t('lib2.search.highlights')}
              </h3>
              <ul data-testid="theme-highlights">
                {items.highlights.slice(0, 200).map((a) => (
                  <li key={a.id} className="border-t border-line py-2 text-sm">
                    <span className="line-clamp-2">
                      {a.quote?.exact || a.note || placeLabel(a)}
                    </span>
                    <span className="text-xs text-muted">
                      {names.get(a.pageId)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

/** The Themes tab: any tag becomes a page across books (LB-P18). */
export function ThemesTab({
  db,
  pages,
  onOpenPage,
}: {
  db: LearningNotesDB
  pages: readonly Page[]
  onOpenPage: (id: string) => void
}) {
  const { toast } = useContext(AppUiContext)
  const prefs = useLibraryPrefs()
  const { tags } = useTagData(db)
  const [open, setOpen] = useState('')
  const [choice, setChoice] = useState('')
  const themes = prefs.themes.filter((id) => tags.some((x) => x.id === id))
  const free = tags.filter((x) => !themes.includes(x.id))
  if (open)
    return (
      <ThemePage
        db={db}
        tagId={open}
        pages={pages}
        backLabel={t('lib2.themes.all')}
        onBack={() => setOpen('')}
        onOpenPage={onOpenPage}
        onDelete={() => {
          const undo = setPrefsWithUndo({
            themes: prefs.themes.filter((x) => x !== open),
          })
          setOpen('')
          toast(t('lib2.themes.removed'), {
            label: t('annot.undo'),
            onSelect: undo,
          })
        }}
      />
    )
  return (
    <section
      data-testid="themes-tab"
      aria-label={t('lib2.tab.themes')}
      className="mt-3 max-w-[640px]"
    >
      <p className="mb-3 text-sm text-muted">{t('lib2.themes.intro')}</p>
      {themes.length === 0 ? (
        <EmptyState
          icon="pin"
          title={t('lib2.themes.none')}
          text={t('lib2.themes.noneHint')}
        />
      ) : (
        <ul className="mb-3 grid gap-2 sm:grid-cols-2">
          {themes.map((id) => {
            const tag = tags.find((x) => x.id === id)!
            const it = themeItems(id, tags, pages, [])
            return (
              <li key={id}>
                <button
                  type="button"
                  data-testid="theme-card"
                  onClick={() => setOpen(id)}
                  className="min-h-11 w-full rounded-xl border border-line p-3 text-start hover:bg-hover"
                >
                  <b>#{tag.name}</b>
                  <span className="block text-xs text-muted">
                    {t('lib2.themes.books', { n: it.books.length })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          aria-label={t('lib2.themes.pick')}
          data-testid="theme-pick"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-2 text-sm"
        >
          <option value="">{t('lib2.themes.pick')}</option>
          {free.map((x) => (
            <option key={x.id} value={x.id}>
              #{x.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="theme-new"
          disabled={!choice}
          onClick={() => {
            const undo = setPrefsWithUndo({ themes: [...prefs.themes, choice] })
            setChoice('')
            toast(t('lib2.themes.added'), {
              label: t('annot.undo'),
              onSelect: undo,
            })
          }}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {t('lib2.themes.new')}
        </button>
      </div>
    </section>
  )
}

function TreeList({
  nodes,
  onOpen,
}: {
  nodes: TagNode[]
  onOpen: (id: string) => void
}) {
  return (
    <ul className="ps-4">
      {nodes.map((n) => (
        <li key={n.tag.id}>
          <button
            type="button"
            data-testid="tag-node"
            onClick={() => onOpen(n.tag.id)}
            className="flex min-h-11 w-full items-center justify-between text-start text-sm hover:bg-hover"
          >
            <b>{n.tag.name}</b>
            <span className="text-xs text-muted">{n.count}</span>
          </button>
          {n.children.length > 0 && (
            <TreeList nodes={n.children} onOpen={onOpen} />
          )}
        </li>
      ))}
    </ul>
  )
}

/** The Tags tab: the Category > Tag > Sub-tag map; a tap opens the tag's page. */
export function TagsMapTab({
  db,
  pages,
  onOpenPage,
}: {
  db: LearningNotesDB
  pages: readonly Page[]
  onOpenPage: (id: string) => void
}) {
  const { tags } = useTagData(db)
  const [open, setOpen] = useState('')
  const tree = useMemo(() => tagTree(tags, pages), [tags, pages])
  if (open)
    return (
      <ThemePage
        db={db}
        tagId={open}
        pages={pages}
        backLabel={t('lib2.tab.tags')}
        onBack={() => setOpen('')}
        onOpenPage={onOpenPage}
      />
    )
  return (
    <section
      data-testid="tags-tab"
      aria-label={t('lib2.tab.tags')}
      className="mt-3 max-w-[640px]"
    >
      <p className="mb-2 text-sm text-muted">{t('lib2.tags.intro')}</p>
      {tree.length === 0 ? (
        <EmptyState icon="pin" text={t('lib2.tags.none')} />
      ) : (
        <TreeList nodes={tree} onOpen={setOpen} />
      )}
    </section>
  )
}

/** The Journal tab: a short dated entry after reading (LB-P17). */
export function JournalTab({ pages }: { pages: readonly Page[] }) {
  const { toast } = useContext(AppUiContext)
  const prefs = useLibraryPrefs()
  const [form, setForm] = useState<null | {
    book: string
    read: string
    struck: string
    question: string
  }>(null)
  const names = new Map(
    pages.map((p) => [p.id, p.title || t('review.untitled')]),
  )
  const save = () => {
    if (
      !form ||
      !(form.read.trim() || form.struck.trim() || form.question.trim())
    )
      return
    const id = newCollectionId(
      'entry',
      prefs.journal.map((j) => ({ id: j.id, name: j.id })),
    )
    const entry: JournalEntry = {
      id: `${id}-${Date.now()}`,
      ...form,
      at: Date.now(),
    }
    const undo = setPrefsWithUndo({ journal: [entry, ...prefs.journal] })
    setForm(null)
    toast(t('lib2.journal.saved'), { label: t('annot.undo'), onSelect: undo })
  }
  const field = (k: 'read' | 'struck' | 'question', label: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <textarea
        data-testid={`journal-${k}`}
        value={form![k]}
        maxLength={500}
        rows={2}
        onChange={(e) => setForm({ ...form!, [k]: e.target.value })}
        className="rounded-lg border border-line bg-bg p-2"
      />
    </label>
  )
  return (
    <section
      data-testid="journal-tab"
      aria-label={t('lib2.tab.journal')}
      className="mt-3 max-w-[640px]"
    >
      {form ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <select
            aria-label={t('lib2.knowledge.book')}
            value={form.book}
            onChange={(e) => setForm({ ...form, book: e.target.value })}
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
          >
            <option value="">{t('lib2.journal.noBook')}</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || t('review.untitled')}
              </option>
            ))}
          </select>
          {field('read', t('lib2.journal.read'))}
          {field('struck', t('lib2.journal.struck'))}
          {field('question', t('lib2.journal.question'))}
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="journal-save"
              onClick={save}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white"
            >
              {t('lib2.done')}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="min-h-11 rounded-lg border border-line px-4 text-sm"
            >
              {t('ui.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-testid="journal-new"
          onClick={() =>
            setForm({ book: '', read: '', struck: '', question: '' })
          }
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white"
        >
          {t('lib2.journal.new')}
        </button>
      )}
      {prefs.journal.length === 0 ? (
        !form && (
          <EmptyState
            icon="pin"
            title={t('lib2.journal.none')}
            text={t('lib2.journal.noneHint')}
          />
        )
      ) : (
        <ul className="mt-3" data-testid="journal-list">
          {prefs.journal.map((j) => (
            <li key={j.id} className="border-t border-line py-2 text-sm">
              <b>
                {new Date(j.at).toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}
                {names.get(j.book) ? ` · ${names.get(j.book)}` : ''}
              </b>
              <span className="block">{j.read}</span>
              <span className="block">{j.struck}</span>
              <i className="block text-muted">{j.question}</i>
              <button
                type="button"
                aria-label={t('lib2.journal.remove')}
                onClick={() => {
                  const undo = setPrefsWithUndo({
                    journal: prefs.journal.filter((x) => x.id !== j.id),
                  })
                  toast(t('lib2.journal.removed'), {
                    label: t('annot.undo'),
                    onSelect: undo,
                  })
                }}
                className="min-h-11 text-xs text-muted"
              >
                {t('ui.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
