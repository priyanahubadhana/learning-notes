import { useContext } from 'react'
import { AppUiContext } from '../../../../appUi'
import { Tile, TileGroup } from '../../../../../design/parts/CardParts'
import { FoldGroup } from '../../../../../design/parts/FoldGroup'
import '../../../../../design/parts/Card.css'
import {
  copyAs,
  copyPageWithPictures,
  pastePlainFromClipboard,
} from '../../../../../editor/clipboard'
import { useBarActions, type Editor } from '../../../../../editor/barActions'
import { isApple } from '../../../../keys'
import { touchUi } from '../../../../touchUi'
import { hintFor } from '../../../../../editor/toolbarMenu/menuModel'
import { useDeviceSetting } from '../../../../../settings/useSetting'
import { shortcutHintsSetting } from '../../../../../settings/builtinSettings'
import { t, type MessageKey } from '../../../../../i18n/t'
import { Icon, type IconName } from '../../../icons'

/** Study actions in the order of the v9 picture; Key point lives in Text › Format › Marks. */
const MARKS = ['mark:keyword', 'mark:must', 'mark:formula', 'blank', 'card']
const MARK_ICON: Record<string, IconName> = {
  'mark:keyword': 'tag',
  'mark:must': 'star',
  'mark:formula': 'code',
  blank: 'input',
  card: 'cards',
}

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

function Row({
  icon,
  label,
  hint,
  onPick,
}: {
  icon: IconName
  label: string
  hint?: string
  onPick: () => void
}) {
  return (
    <button
      type="button"
      data-chrome
      className="v8fold-row"
      onMouseDown={keepFocus}
      onClick={onPick}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </button>
  )
}

/**
 * The ⋯ card's two groups from the v9 picture (2A.12): Mark for review
 * (Keyword, Must know, Formula, Make blank, Make card) and Copy and paste.
 * Key names show only with a keyboard and the hints setting on, never on touch.
 */
export default function MoreStudy({
  editor,
  onClose,
}: {
  editor: Editor
  onClose: () => void
}) {
  const actions = useBarActions(editor)
  const { toast } = useContext(AppUiContext)
  const [hints] = useDeviceSetting(shortcutHintsSetting)
  const hint = hintFor(
    { touch: touchUi(), enabled: hints === 'on' },
    isApple() ? '⌘⇧V' : 'Ctrl+Shift+V',
  )
  const marks = MARKS.map((id) => actions.find((a) => a.id === id)).filter(
    (a) => a !== undefined,
  )
  const copy = (key: MessageKey, icon: IconName, run: () => unknown) => (
    <Row
      key={key}
      icon={icon}
      label={t(key)}
      hint={key === 'paste.plain' ? hint : undefined}
      onPick={() => {
        onClose()
        void run()
      }}
    />
  )
  return (
    <>
      {marks.length > 0 && (
        <FoldGroup
          label={t('toolbarMenu.groupStudy')}
          testId="more-group-study"
        >
          <TileGroup label={t('toolbarMenu.groupStudy')} action columns={3}>
            {marks.map((a) => (
              <Tile
                key={a.id}
                label={a.label}
                action
                pressed={!!a.active}
                disabled={a.disabled}
                testId={`v8-more-${a.id.replace(':', '-')}`}
                onSelect={() => {
                  onClose()
                  a.run?.()
                }}
              >
                <Icon name={MARK_ICON[a.id] ?? 'tag'} size={20} />
              </Tile>
            ))}
          </TileGroup>
        </FoldGroup>
      )}
      <FoldGroup label={t('toolbarMenu.groupCopy')} testId="more-group-copy">
        {copy('copy.plain', 'copy', () => copyAs(editor, 'plain', toast))}
        {copy('copy.markdown', 'fileText', () =>
          copyAs(editor, 'markdown', toast),
        )}
        {copy('paste.plain', 'paste', () =>
          pastePlainFromClipboard(editor, toast),
        )}
        {copy('copy.pictures', 'copyPage', () =>
          copyPageWithPictures(editor, toast),
        )}
      </FoldGroup>
    </>
  )
}
