import { SuggestionMenu } from '@blocknote/core/extensions'
import { useExtension, useExtensionState } from '@blocknote/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { onRouted, PRIORITY } from '../../app/input/eventRouter'
import { CommandList } from '../../design/parts/CommandList'
import { useLevel } from '../../settings/level'
import type { AppSchema } from '../schema'
import { buildSlashMenuItems, type SlashMenuActions } from '../slashMenu'
import {
  BEGINNER_COUNT,
  beginnerGroups,
  buildSlashEntries,
  cellGroups,
  fullGroups,
} from './slashItems'
import { readSlashRecent, writeSlashRecent } from './slashRecent'

type Editor = AppSchema['BlockNoteEditor']

const TEST_ID = 'slash-list'
/** Gap under the cursor line (spec: 6 px); the part adds its own 8 px. */
const GAP = 6
const PART_GAP = 8
const NARROW = 600

interface Props {
  editor: Editor
  actions: SlashMenuActions
}

/**
 * The "/" menu on the shared Command list (flag `page.menus`). BlockNote still
 * finds the "/" and keeps the typed words; this draws the list and forwards
 * the arrow keys and Enter to it. Typing stays in the page.
 */
export default function SlashCommandList({ editor, actions }: Props) {
  const ext = useExtension(SuggestionMenu)
  const state = useExtensionState(SuggestionMenu)
  useEffect(() => {
    ext.addSuggestionMenu({ triggerCharacter: '/' })
    return () => ext.removeSuggestionMenu('/')
  }, [ext])
  if (!state?.show || state.triggerCharacter !== '/') return null
  return (
    <Open
      editor={editor}
      actions={actions}
      query={state.query}
      cursor={state.referencePos}
      close={() => ext.closeMenu()}
      clearAll={() => {
        // ✕ in the list: drop the "/word" from the page and close.
        ext.closeMenu()
        ext.clearQuery()
        editor.focus()
      }}
      pick={(run) => {
        // Same order as BlockNote's own menu: close, remove "/word", act.
        ext.closeMenu()
        ext.clearQuery()
        editor.focus()
        run()
      }}
    />
  )
}

function Open({
  editor,
  actions,
  query,
  cursor,
  close,
  clearAll,
  pick,
}: Props & {
  query: string
  cursor: DOMRect
  close(): void
  clearAll(): void
  pick(run: () => void): void
}) {
  const level = useLevel()
  const actionsRef = useRef(actions)
  useEffect(() => {
    actionsRef.current = actions
  })
  const [expanded, setExpanded] = useState(false)
  const [recent, setRecent] = useState(readSlashRecent)
  const [initialQuery] = useState(query)

  const entriesFor = (a: SlashMenuActions) =>
    buildSlashEntries(buildSlashMenuItems(editor, a))
  const [entries] = useState(() => entriesFor(actions))
  const inCell = useMemo(() => {
    try {
      return editor.getTextCursorPosition().block.type === 'table'
    } catch {
      return false
    }
  }, [editor])

  const searching = query.trim().length > 0
  const full = useMemo(() => fullGroups(entries), [entries])
  const beginner = useMemo(() => beginnerGroups(entries), [entries])
  const cell = useMemo(() => cellGroups(entries), [entries])
  const compact = level === 'beginner' && !inCell && !expanded && !searching
  const groups = inCell ? cell : compact ? beginner : full
  const limit = compact ? BEGINNER_COUNT : 999

  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth
  const barTop =
    typeof document === 'undefined'
      ? null
      : document.querySelector('.sh-tabbar')?.getBoundingClientRect().top
  const winH = typeof window === 'undefined' ? 768 : window.innerHeight
  // The phone tab bar is the bottom edge.
  const vh = barTop && barTop > 0 && barTop < winH ? Math.floor(barTop) : winH
  const width = vw < NARROW ? vw - 24 : 320
  const { left, top, height } = cursor
  // Under the cursor line when it fits; else above it, if that has more room.
  const roomBelow = vh - (top + height) - GAP - 12
  const roomAbove = top - GAP - 12
  const below = roomBelow >= 320 || roomAbove <= roomBelow
  const { target, avoid } = useMemo(() => {
    const h = Math.max(0, height)
    return below
      ? {
          target: {
            left,
            top,
            width: 0,
            height: Math.max(0, h - (PART_GAP - GAP)),
          },
          avoid: [{ left, top: 0, width, height: top }],
        }
      : {
          target: { left, top: top + (PART_GAP - GAP), width: 0, height: h },
          avoid: [{ left, top: top + (PART_GAP - GAP), width, height: h }],
        }
  }, [below, left, top, height, width])

  const inputOf = () =>
    document.querySelector<HTMLInputElement>(
      `[data-testid="${TEST_ID}"] .cl__input`,
    )

  // Typing stays in the page: the list's search box only shows the words (it
  // is made unfocusable, so the page keeps the caret and BlockNote keeps the
  // menu open), and the page says it owns the list.
  useEffect(() => {
    inputOf()?.setAttribute('inert', '')
    const dom = editor.domElement
    const listId = document
      .querySelector(`[data-testid="${TEST_ID}"] [role="listbox"]`)
      ?.getAttribute('id')
    dom?.setAttribute('aria-expanded', 'true')
    if (listId) dom?.setAttribute('aria-controls', listId)
    return () => {
      dom?.removeAttribute('aria-expanded')
      dom?.removeAttribute('aria-controls')
    }
  }, [editor])

  // The words typed after "/" in the page are shown in the list's search box.
  useEffect(() => {
    const input = inputOf()
    if (!input || input.value === query) return
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    set?.call(input, query)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, [query])

  // Arrows and Enter in the page move and pick in the list.
  useEffect(
    () =>
      onRouted(
        'keydown',
        (e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter')
            return
          if (!editor.domElement?.contains(e.target as Node)) return
          const input = inputOf()
          if (!input) return
          const active = document.querySelector<HTMLElement>(
            `[data-testid="${TEST_ID}"] [role="option"][aria-selected="true"]`,
          )
          if (e.key === 'Enter') {
            if (!active) return // nothing to pick: Enter acts as usual
            if (active.dataset.testid === 'cl-show-all') setExpanded(true)
          }
          e.preventDefault()
          e.stopPropagation()
          input.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: e.key,
              bubbles: true,
              cancelable: true,
            }),
          )
          return true
        },
        { priority: PRIORITY.overlay, name: 'slash-command-list' },
      ),
    [editor],
  )

  return (
    <div
      style={{ display: 'contents' }}
      // A press on the list must not take the caret out of the page.
      onMouseDownCapture={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest('[data-testid="cl-show-all"]'))
          setExpanded(true)
      }}
    >
      <CommandList
        testId={TEST_ID}
        groups={groups}
        limit={limit}
        recent={recent}
        initialQuery={initialQuery}
        target={target}
        avoid={avoid}
        onRecent={(ids) => {
          setRecent(ids)
          writeSlashRecent(ids)
        }}
        onPick={(id) =>
          pick(() => {
            // Rebuilt now, so the action sees the page as it is at this moment.
            entriesFor(actionsRef.current)
              .find((x) => x.id === id)
              ?.run()
          })
        }
        onClose={close}
        onClearQuery={clearAll}
      />
    </div>
  )
}
