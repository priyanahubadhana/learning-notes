import { AnchoredMenu } from '../../app/tools/AnchoredMenu'
import type { AnchoredMenuState } from '../../app/tools/useAnchoredMenu'
import { Icon, type IconName } from '../../app/tools/icons'
import { t } from '../../i18n/t'
import { bottomBar } from './listPlace'

export type MoreRow = {
  id: string
  icon: IconName
  label: string
  /** A quiet line beside the label (why the row is dimmed). */
  note?: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

/** Width of the ⋯ list (states.html panel 5). */
export const MORE_LIST_W = 248

/**
 * TB-30: the ⋯ list card of a selected box. Rows in groups (a line between);
 * 44 pt rows, a ✕, no key names. Built on the shared anchored menu, so it
 * follows the one pop-up rule (outside tap, Esc, scroll close it).
 */
export function BoxMoreList({
  menu,
  groups,
}: {
  menu: AnchoredMenuState
  groups: MoreRow[][]
}) {
  return (
    <AnchoredMenu
      menu={menu}
      label={t('paper.box.menu')}
      width={MORE_LIST_W}
      bottomReserve={bottomBar()}
      solid
    >
      {groups.map((rows, g) => (
        <div key={g}>
          {g > 0 && <hr className="my-1 border-line" />}
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              role="menuitem"
              data-box-more={r.id}
              disabled={r.disabled}
              onClick={() => {
                menu.close()
                r.onSelect()
              }}
              className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-start text-sm hover:bg-hover disabled:opacity-50 disabled:hover:bg-transparent ${r.danger ? 'text-danger' : 'text-ink'}`}
            >
              <Icon name={r.icon} size={18} />
              <span className="flex-1">{r.label}</span>
              {r.note && <small className="text-xs text-muted">{r.note}</small>}
            </button>
          ))}
        </div>
      ))}
    </AnchoredMenu>
  )
}
