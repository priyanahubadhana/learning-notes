import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { ConfirmDialog, IconButton, MenuPopover, NameDialog } from '../app/ui'
import { isStringArray } from '../app/uiPrefs'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Tag } from '../core/types'
import { t, type MessageKey } from '../i18n/t'
import { useMinuteClock } from '../recall/useMinuteClock'
import { countTagged } from '../search/searchQuery'
import { TagPicker, TOP_LEVEL } from './TagPicker'
import { tagColorStyle } from './tagStyle'
import {
  findOrCreateTagPath,
  listTags,
  subTagIds,
  tagMap,
  tagPathIn,
  tagPathName,
} from './tagService'
import {
  deleteTag,
  mergeTag,
  moveTag,
  renameTag,
  setTagColor,
  TAG_COLORS,
} from './tagTools'

/** A tag tool being used (from the ⋯ menu), or "New tag". */
type Tool =
  | {
      kind: 'menu' | 'rename' | 'move' | 'merge' | 'color' | 'delete'
      tag: Tag
      anchor: DOMRect
    }
  | { kind: 'new' }

/**
 * "Tags" in the sidebar: every tag as a tree (sub-tags fold out), each with
 * how many pages, notes and cards have it. A tag opens Search filtered to
 * it; ⋯ (or right-click) has Rename, Move under…, Merge into…, Colour and
 * Delete tag.
 *
 * Counts are worked out again only when tagging changes (and once a
 * minute), never on every keystroke in a note.
 */
export function TagsSection({
  db,
  onOpenTag,
  onNotesRewritten,
}: {
  db: LearningNotesDB
  onOpenTag: (tagId: string) => void
  /** Merge/delete rewrote these pages' notes (an open one reloads). */
  onNotesRewritten: (pageIds: string[]) => void
}) {
  const { toast } = useContext(AppUiContext)
  const tags = useLiveQuery(() => listTags(db), [db])
  const [expanded, setExpanded] = usePref('expandedTags', isStringArray, [])
  const [tool, setTool] = useState<Tool | null>(null)
  const counts = useTagCounts(db, tags)

  const byId = useMemo(() => new Map(tags?.map((t) => [t.id, t])), [tags])
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Tag[]>()
    for (const tag of tags ?? []) {
      const parent =
        tag.parentId && byId.has(tag.parentId) ? tag.parentId : null
      map.set(parent, [...(map.get(parent) ?? []), tag])
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
    }
    return map
  }, [tags, byId])

  if (!tags) return null
  const pathOf = (id: string) => tagPathName(byId, id)
  const close = () => setTool(null)
  const toggle = (id: string) =>
    setExpanded((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    )
  const openMenu = (tag: Tag, anchor: DOMRect) =>
    setTool({ kind: 'menu', tag, anchor })

  const renderRows = (parentId: string | null, depth: number) =>
    (childrenOf.get(parentId) ?? []).map((tag) => {
      const kids = childrenOf.get(tag.id) ?? []
      const open = expanded.includes(tag.id)
      const count = counts.get(tag.id) ?? 0
      return (
        <div key={tag.id}>
          <div
            onContextMenu={(e) => {
              e.preventDefault()
              openMenu(tag, new DOMRect(e.clientX, e.clientY, 0, 0))
            }}
            style={{ paddingInlineStart: depth * 14 }}
            className={`flex min-h-8 items-center gap-0.5 rounded-md pe-1 text-sm hover:bg-hover`}
          >
            {kids.length > 0 ? (
              <button
                type="button"
                onClick={() => toggle(tag.id)}
                aria-expanded={open}
                aria-label={t(open ? 'tags.collapse' : 'tags.expand', {
                  name: tag.name,
                })}
                className="h-7 w-5 shrink-0 text-center text-[10px] text-muted"
              >
                {open ? '▾' : '▸'}
              </button>
            ) : (
              <span aria-hidden className="w-5 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onOpenTag(tag.id)}
              title={t('tags.openHint')}
              className="flex min-h-7 min-w-0 flex-1 items-center text-start"
            >
              {/* Same look as the chips on pages: tinted when coloured. */}
              <span
                className={tag.color ? 'tag-chip tag-chip-colored' : 'tag-chip'}
                style={tagColorStyle(tag.color)}
              >
                <span className="truncate">#{tag.name}</span>
              </span>
            </button>
            {count > 0 && (
              <span
                aria-label={t('tags.count', { count })}
                className="min-w-5 text-end text-[11.5px] text-muted tabular-nums"
              >
                {count}
              </span>
            )}
            <IconButton
              title={t('tags.options', { name: pathOf(tag.id) })}
              tip="sidebar.tagOptions"
              aria-label={t('tags.options', { name: pathOf(tag.id) })}
              onClick={(e) =>
                openMenu(tag, e.currentTarget.getBoundingClientRect())
              }
            >
              ⋯
            </IconButton>
          </div>
          {open && renderRows(tag.id, depth + 1)}
        </div>
      )
    })

  /** Sub-tags (any depth) and the tag itself: never a new parent/target. */
  const selfAndBelow = (tag: Tag) => [tag.id, ...subTagIds(tags, tag.id)]

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1 text-[11px] tracking-[0.06em] text-muted uppercase">
        {t('tags.section')}
        <IconButton
          title={t('tags.new')}
          tip="sidebar.newTag"
          aria-label={t('tags.new')}
          onClick={() => setTool({ kind: 'new' })}
        >
          +
        </IconButton>
      </div>
      {tags.length === 0 ? (
        <p className="mx-2 rounded-lg border border-dashed border-line p-2.5 text-[12.5px] leading-normal text-muted">
          {t('tags.empty')}
        </p>
      ) : (
        <div role="group" aria-label={t('tags.section')}>
          {renderRows(null, 0)}
        </div>
      )}

      {tool?.kind === 'new' && (
        <NameDialog
          title={t('tags.new')}
          label={t('tags.newLabel')}
          initialValue=""
          confirmLabel={t('tags.newConfirm')}
          onConfirm={(name) => {
            close()
            if (!name.replace(/[#/\s]/g, '')) return
            runTask(
              findOrCreateTagPath(db, name).then(async (tag) => {
                // Show where it went: open its parents.
                const path = tagPathIn(await tagMap(db), tag.id).slice(0, -1)
                setExpanded((list) => [
                  ...new Set([...list, ...path.map((p) => p.id)]),
                ])
              }),
            )
          }}
          onCancel={close}
        />
      )}
      {tool?.kind === 'menu' && (
        <MenuPopover
          anchor={tool.anchor}
          onClose={close}
          items={(
            [
              ['rename', '✎', 'tags.rename'],
              ['move', '↳', 'tags.move'],
              ['merge', '⇢', 'tags.merge'],
              ['color', '●', 'tags.color'],
              ['delete', '×', 'tags.delete'],
            ] as const
          ).map(([kind, icon, label]) => ({
            label: t(label),
            icon,
            onSelect: () =>
              setTool({ kind, tag: tool.tag, anchor: tool.anchor }),
          }))}
        />
      )}
      {tool?.kind === 'rename' && (
        <NameDialog
          title={t('tags.renameTitle', { name: pathOf(tool.tag.id) })}
          label={t('tags.renameLabel')}
          initialValue={tool.tag.name}
          confirmLabel={t('tags.renameConfirm')}
          onConfirm={(name) => {
            close()
            const { tag } = tool
            runTask(
              renameTag(db, tag.id, name).then(async (result) => {
                if (result === 'taken') {
                  toast(t('tags.taken', { name: name.replace(/\s+/g, '-') }))
                } else if (result === 'done') {
                  const path = tagPathName(await tagMap(db), tag.id)
                  toast(t('tags.renamed', { name: path }))
                }
              }),
            )
          }}
          onCancel={close}
        />
      )}
      {(tool?.kind === 'move' || tool?.kind === 'merge') && (
        <TagPicker
          db={db}
          at={tool.anchor}
          exclude={selfAndBelow(tool.tag)}
          title={t(
            tool.kind === 'move' ? 'tags.moveTitle' : 'tags.mergeTitle',
            {
              name: pathOf(tool.tag.id),
            },
          )}
          placeholder={t(
            tool.kind === 'move' ? 'tags.moveFind' : 'tags.mergeFind',
          )}
          allowCreate={false}
          topLevel={tool.kind === 'move'}
          onPick={(to) => {
            close()
            const { tag, kind } = tool
            if (kind === 'move') {
              const parentId = to === TOP_LEVEL ? null : to
              runTask(
                moveTag(db, tag.id, parentId).then((result) => {
                  if (result === 'taken') {
                    toast(t('tags.taken', { name: tag.name }))
                    return
                  }
                  if (parentId)
                    setExpanded((l) => [...new Set([...l, parentId])])
                  toast(
                    t('tags.moved', {
                      name: parentId
                        ? `${pathOf(parentId)}/${tag.name}`
                        : tag.name,
                    }),
                  )
                }),
              )
            } else {
              const into = pathOf(to)
              runTask(
                mergeTag(db, tag.id, to).then((pageIds) => {
                  onNotesRewritten(pageIds)
                  toast(t('tags.merged', { name: into }))
                }),
              )
            }
          }}
          onClose={close}
        />
      )}
      {tool?.kind === 'color' && (
        <ColorDialog
          tag={tool.tag}
          onPick={(color) => runTask(setTagColor(db, tool.tag.id, color))}
          onClose={close}
        />
      )}
      {tool?.kind === 'delete' && (
        <ConfirmDialog
          message={[
            t('tags.deleteMessage', {
              name: pathOf(tool.tag.id),
              count: counts.get(tool.tag.id) ?? 0,
            }),
            ...((childrenOf.get(tool.tag.id)?.length ?? 0) > 0
              ? [
                  t('tags.deleteSubTags', {
                    count: childrenOf.get(tool.tag.id)!.length,
                  }),
                ]
              : []),
          ].join(' ')}
          confirmLabel={t('tags.delete')}
          onConfirm={() => {
            close()
            const name = pathOf(tool.tag.id)
            runTask(
              deleteTag(db, tool.tag.id).then((pageIds) => {
                onNotesRewritten(pageIds)
                toast(t('tags.deleted', { name }))
              }),
            )
          }}
          onCancel={close}
        />
      )}
    </div>
  )
}

/**
 * Results per tag (see `countTagged`). Recounted when the tags or what is
 * tagged change (read as keys only, cheap) and once a minute.
 */
function useTagCounts(
  db: LearningNotesDB,
  tags: Tag[] | undefined,
): Map<string, number> {
  const now = useMinuteClock()
  const [counts, setCounts] = useState(new Map<string, number>())
  const tagged = useLiveQuery(async () => {
    const [rows, pageTags, pageIds, cards] = await Promise.all([
      db.blockTags.toCollection().primaryKeys(),
      db.pages.orderBy('tagIds').keys(),
      db.pages.orderBy('tagIds').primaryKeys(),
      db.cards.count(),
    ])
    return JSON.stringify([rows, pageTags, pageIds, cards])
  }, [db])
  const tagsKey = JSON.stringify(tags?.map((t) => [t.id, t.parentId]) ?? [])

  useEffect(() => {
    if (tagged === undefined) return
    let cancelled = false
    countTagged(db, now).then(
      (next) => {
        if (!cancelled) setCounts(next)
      },
      (error: unknown) => console.error('Could not count tags', error),
    )
    return () => {
      cancelled = true
    }
  }, [db, tagged, tagsKey, now])
  return counts
}

/** Colour names, for screen readers and tooltips. */
const COLOR_NAME: Record<(typeof TAG_COLORS)[number], MessageKey> = {
  '#2f6feb': 'tags.color.#2f6feb',
  '#2e9e6b': 'tags.color.#2e9e6b',
  '#d9822b': 'tags.color.#d9822b',
  '#c8402f': 'tags.color.#c8402f',
  '#8a5cf6': 'tags.color.#8a5cf6',
  '#c2417f': 'tags.color.#c2417f',
}

/** Pick a tag's colour (or none); each pick is saved at once. */
function ColorDialog({
  tag,
  onPick,
  onClose,
}: {
  tag: Tag
  onPick: (color: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [color, setColor] = useState(tag.color ?? null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  const pick = (next: string | null) => {
    setColor(next)
    onPick(next)
  }
  const swatch =
    'size-9 rounded-full border-2 outline-offset-2 aria-pressed:outline-2 aria-pressed:outline-accent'

  return (
    <dialog
      ref={ref}
      aria-label={t('tags.colorTitle', { name: tag.name })}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // click on the backdrop
      }}
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <h2 className="mb-1.5 text-[15px] font-semibold">
        {t('tags.colorTitle', { name: tag.name })}
      </h2>
      <p className="mb-4 text-sm text-muted">{t('tags.colorNote')}</p>
      <div className="mb-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          aria-pressed={color === null}
          aria-label={t('tags.colorNone')}
          title={t('tags.colorNone')}
          onClick={() => pick(null)}
          className={`${swatch} border-line text-muted`}
        >
          —
        </button>
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={color === c}
            aria-label={t(COLOR_NAME[c])}
            title={t(COLOR_NAME[c])}
            onClick={() => pick(c)}
            style={{ background: c, borderColor: c }}
            className={swatch}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="min-h-9 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          {t('tags.colorDone')}
        </button>
      </div>
    </dialog>
  )
}
