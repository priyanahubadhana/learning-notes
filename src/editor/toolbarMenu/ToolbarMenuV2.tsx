import { useContext, useState, type ReactNode } from 'react'
import { CreateLinkButton } from '@blocknote/react'
import { AppUiContext } from '../../app/appUi'
import { CardGroup, Tile, TileGroup } from '../../design/parts/CardParts'
import '../../design/parts/Card.css'
import { Icon, type IconName } from '../../app/tools/icons'
import { isApple } from '../../app/keys'
import { touchUi } from '../../app/touchUi'
import { t, type MessageKey } from '../../i18n/t'
import type { BarAction, Editor } from '../barActions'
import {
  copyAs,
  copyPageWithPictures,
  pastePlainFromClipboard,
} from '../clipboard'
import { hintFor, menuLayout, type MenuItemId } from './menuModel'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const TOP: Record<string, [IconName, MessageKey]> = {
  edit: ['sliders', 'editBar.open'],
  allTools: ['grid', 'bar.allTools'],
  search: ['search', 'bar.search'],
  done: ['check', 'bar.done'],
}

const STYLE_ICON: Record<string, IconName> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
}

/** One icon for every row under More (none is left without). */
const ACTION_ICON: Record<string, IconName> = {
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
}
const iconOf = (id: string): IconName =>
  ACTION_ICON[id] ?? (id.startsWith('mark:') ? 'highlighter' : 'tag')

const COPY: Record<string, [IconName, MessageKey]> = {
  copyPlain: ['copy', 'copy.plain'],
  copyMarkdown: ['fileText', 'copy.markdown'],
  pastePlain: ['paste', 'paste.plain'],
  copyPictures: ['copyPage', 'copy.pictures'],
}

function Row({
  icon,
  hint,
  active,
  disabled,
  onClick,
  children,
}: {
  icon?: IconName
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
      className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-hover aria-disabled:opacity-40 ${
        active ? 'bg-hover text-accent' : ''
      }`}
    >
      {icon && <Icon name={icon} size={18} />}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </button>
  )
}

/**
 * The ⋯ toolbar menu (flag `toolbar.menu`): a short top row, a few groups, and
 * the rare items under "More". Same items as the old flat list; no key names
 * on touch screens. Drawn inside the bar's Tray (✕, shared scroll bar).
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
  const [more, setMore] = useState(false)
  const touch = touchUi()
  const layout = menuLayout({
    ribbon,
    freePos,
    actionIds: actions.map((a) => a.id),
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
    pastePlain: close(() => void pastePlainFromClipboard(editor, toast)),
    copyPictures: close(() => void copyPageWithPictures(editor, toast)),
  }
  return (
    <div data-menu-v2 className="grid gap-3 px-1 pb-1">
      <CardGroup>
        <TileGroup
          label={t('toolbarMenu.groupBar')}
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
      {layout.styles.length > 0 && (
        <CardGroup label={t('toolbarMenu.groupStyle')}>
          <TileGroup
            label={t('toolbarMenu.groupStyle')}
            multi
            columns={layout.styles.length}
          >
            {layout.styles.map((id) => {
              const a = byId.get(id)
              if (!a) return null
              return (
                <Tile
                  key={id}
                  label={a.label}
                  multi
                  selected={!!a.active}
                  onSelect={() => a.run?.()}
                >
                  <Icon name={STYLE_ICON[id] ?? 'type'} size={20} />
                  {hint(a.hint) && (
                    <span className="text-[10px] text-muted">
                      {hint(a.hint)}
                    </span>
                  )}
                </Tile>
              )
            })}
          </TileGroup>
        </CardGroup>
      )}
      <CardGroup label={t('toolbarMenu.groupCopy')}>
        {layout.copy.map((id) => (
          <Row
            key={id}
            icon={COPY[id][0]}
            hint={id === 'pastePlain' ? pasteHint : undefined}
            onClick={run[id]}
          >
            {t(COPY[id][1])}
          </Row>
        ))}
      </CardGroup>
      <CardGroup>
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => setMore(!more)}
          aria-expanded={more}
          aria-label={t(
            more ? 'toolbarMenu.moreClose' : 'toolbarMenu.moreOpen',
          )}
          className="flex min-h-[44px] items-center justify-between rounded-lg px-1 text-sm font-semibold hover:bg-hover"
        >
          <span>{t('toolbarMenu.more')}</span>
          <Icon name={more ? 'chevronUp' : 'chevronDown'} size={18} />
        </button>
        {more && (
          <div className="grid gap-0.5" data-menu-more>
            {layout.more.fixed.map((id) => (
              <Row
                key={id}
                icon={id === 'resetPos' ? 'rotate' : 'settings'}
                onClick={run[id]}
              >
                {t(id === 'resetPos' ? 'bar.resetPos' : 'bar.edit')}
              </Row>
            ))}
            {layout.more.actions.map((id) => {
              const a = byId.get(id)
              if (!a) return null
              if (a.special === 'link') {
                return (
                  <div
                    key={id}
                    data-action={id}
                    className="flex min-h-[44px] items-center gap-3 px-3 text-sm"
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
            })}
          </div>
        )}
      </CardGroup>
    </div>
  )
}
