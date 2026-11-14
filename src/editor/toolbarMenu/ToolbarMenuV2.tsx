import { useContext, type ReactNode } from 'react'
import { CreateLinkButton } from '@blocknote/react'
import { AppUiContext } from '../../app/appUi'
import { CardGroup, Tile, TileGroup } from '../../design/parts/CardParts'
import { FoldGroup } from '../../design/parts/FoldGroup'
import '../../design/parts/Card.css'
import { Icon, type IconName } from '../../app/tools/icons'
import { isApple } from '../../app/keys'
import { touchUi } from '../../app/touchUi'
import {
  extraTools,
  mainList,
  pillLists,
  pillOptionsOf,
} from '../../app/tools/main/mainTools'
import { t, type MessageKey } from '../../i18n/t'
import type { BarAction, Editor } from '../barActions'
import {
  copyAs,
  copyPageWithPictures,
  pastePlainFromClipboard,
} from '../clipboard'
import {
  hintFor,
  menuLayout,
  onBarIds,
  STYLE_TILES,
  type GroupId,
  type MenuItemId,
} from './menuModel'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const TOP: Record<string, [IconName, MessageKey]> = {
  edit: ['sliders', 'editBar.open'],
  allTools: ['grid', 'bar.allTools'],
  search: ['search', 'bar.search'],
  done: ['check', 'bar.done'],
}

const GROUP_LABEL: Record<GroupId, MessageKey> = {
  style: 'toolbarMenu.groupStyle',
  arrange: 'toolbarMenu.groupArrange',
  study: 'toolbarMenu.groupStudy',
  copy: 'toolbarMenu.groupCopy',
  bar: 'toolbarMenu.groupBar',
}

const STYLE_ICON: Record<string, IconName> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
}

/** One icon for every row (none is left without). */
const ROW_ICON: Record<string, IconName> = {
  blank: 'input',
  card: 'cards',
  newLine: 'newLine',
  alignLeft: 'alignLeft',
  alignCenter: 'alignCenter',
  alignRight: 'alignRight',
  color: 'palette',
  indent: 'indent',
  outdent: 'outdent',
  link: 'link',
  copyPlain: 'copy',
  copyMarkdown: 'fileText',
  pastePlain: 'paste',
  copyPictures: 'copyPage',
  barSettings: 'settings',
  resetPos: 'rotate',
}
const iconOf = (id: string): IconName =>
  ROW_ICON[id] ?? (id.startsWith('mark:') ? 'highlighter' : 'tag')

const COPY_LABEL: Record<string, MessageKey> = {
  copyPlain: 'copy.plain',
  copyMarkdown: 'copy.markdown',
  pastePlain: 'paste.plain',
  copyPictures: 'copy.pictures',
  barSettings: 'bar.edit',
  resetPos: 'bar.resetPos',
}

function Row({
  icon,
  hint,
  active,
  disabled,
  onClick,
  children,
}: {
  icon: IconName
  hint?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-disabled={disabled || undefined}
      onMouseDown={keepFocus}
      onClick={() => !disabled && onClick()}
      className={`flex min-h-[44px] items-center gap-3 rounded-lg px-1 text-left text-sm hover:bg-hover aria-disabled:opacity-40 ${
        active ? 'bg-hover text-accent' : ''
      }`}
    >
      <Icon name={icon} size={18} />
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </button>
  )
}

/** The items the bar already shows; re-read live when the bar changes. */
function useOnBar(): Set<string> {
  const main = mainList.useValue()
  const extras = extraTools.useValue()
  const pills = pillLists.useValue()
  return onBarIds({
    main,
    extras,
    textOptions: pillOptionsOf('text', pills),
    insertOptions: pillOptionsOf('insert', pills),
  })
}

/**
 * The ⋯ toolbar menu (flag `toolbar.menu`): four tiles on top, then a few
 * folded groups (▾). What the bar already shows is left out (it stays on the
 * bar, in All tools and in search). No key names on touch screens. Drawn
 * inside the bar's Tray (✕, shared scroll bar).
 */
export function ToolbarMenuV2({
  editor,
  actions,
  ribbon,
  freePos,
  hints,
  onEdit,
  onAllTools,
  onSearch,
  onDone,
  onBarSettings,
  onResetPos,
  onColor,
  onClose,
}: {
  editor: Editor
  actions: BarAction[]
  ribbon: boolean
  freePos: boolean
  /** The "show shortcut hints" setting. */
  hints: boolean
  onEdit: () => void
  onAllTools: () => void
  onSearch: () => void
  onDone: () => void
  onBarSettings: () => void
  onResetPos: () => void
  onColor: () => void
  onClose: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const onBar = useOnBar()
  const touch = touchUi()
  const layout = menuLayout({
    ribbon,
    freePos,
    actionIds: actions.map((a) => a.id),
    onBar,
  })
  const byId = new Map(actions.map((a) => [a.id, a]))
  const hint = (h?: string) => hintFor({ touch, enabled: hints }, h)
  const pasteHint = hint(isApple() ? '⌘⇧V' : 'Ctrl+Shift+V')
  const close = (fn: () => void) => () => {
    fn()
    onClose()
  }
  const run: Record<MenuItemId, () => void> = {
    edit: onEdit,
    allTools: onAllTools,
    search: onSearch,
    done: onDone,
    barSettings: onBarSettings,
    resetPos: onResetPos,
    copyPlain: close(() => void copyAs(editor, 'plain', toast)),
    copyMarkdown: close(() => void copyAs(editor, 'markdown', toast)),
    pastePlain: close(() => void pastePlain()),
    copyPictures: close(() => void copyPageWithPictures(editor, toast)),
  }
  const pastePlain = () => pastePlainFromClipboard(editor, toast)

  const actionRow = (id: string) => {
    const a = byId.get(id)
    if (!a) return null
    if (a.special === 'link') {
      return (
        <div
          key={id}
          data-action={id}
          className="flex min-h-[44px] items-center gap-3 px-1 text-sm"
        >
          <Icon name={iconOf(id)} size={18} />
          <span className="flex-1 text-left">{a.label}</span>
          <CreateLinkButton />
        </div>
      )
    }
    return (
      <Row
        key={id}
        icon={iconOf(id)}
        active={a.active}
        disabled={a.disabled}
        hint={hint(a.hint)}
        onClick={a.special === 'color' ? onColor : () => a.run?.()}
      >
        {a.label}
      </Row>
    )
  }

  const body = (id: GroupId, items: string[]) => {
    if (id === 'style') {
      const tiles = items.filter((i) => STYLE_TILES.includes(i))
      return (
        <>
          {tiles.length > 0 && (
            <TileGroup
              label={t(GROUP_LABEL.style)}
              multi
              columns={Math.min(tiles.length, 5)}
            >
              {tiles.map((i) => {
                const a = byId.get(i)
                if (!a) return null
                return (
                  <Tile
                    key={i}
                    label={a.label}
                    multi
                    selected={!!a.active}
                    onSelect={() => a.run?.()}
                  >
                    <Icon name={STYLE_ICON[i] ?? 'type'} size={20} />
                    {hint(a.hint) && (
                      <span className="text-[10px] text-muted">
                        {hint(a.hint)}
                      </span>
                    )}
                  </Tile>
                )
              })}
            </TileGroup>
          )}
          {items.filter((i) => !STYLE_TILES.includes(i)).map(actionRow)}
        </>
      )
    }
    return items.map((i) =>
      i in COPY_LABEL ? (
        <Row
          key={i}
          icon={iconOf(i)}
          hint={i === 'pastePlain' ? pasteHint : undefined}
          onClick={run[i as MenuItemId]}
        >
          {t(COPY_LABEL[i])}
        </Row>
      ) : (
        actionRow(i)
      ),
    )
  }

  return (
    <div data-menu-v2 className="grid gap-2 px-1 pb-1">
      <CardGroup>
        <TileGroup
          label={t('toolbarMenu.groupTop')}
          action
          columns={layout.top.length}
        >
          {layout.top.map((id) => (
            <Tile key={id} label={t(TOP[id][1])} action onSelect={run[id]}>
              <Icon name={TOP[id][0]} size={22} />
            </Tile>
          ))}
        </TileGroup>
      </CardGroup>
      <div className="grid">
        {layout.groups.map((g) => (
          <FoldGroup
            key={g.id}
            label={t(GROUP_LABEL[g.id])}
            testId={`menu-group-${g.id}`}
          >
            {body(g.id, g.items)}
          </FoldGroup>
        ))}
      </div>
    </div>
  )
}
