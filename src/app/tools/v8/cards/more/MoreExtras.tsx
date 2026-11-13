import { CardGroup } from '../../../../../design/parts/CardParts'
import { t } from '../../../../../i18n/t'
import { useUnlocked } from '../../../../../settings/level'
import { requestHideToolBar } from '../../../toolbarVisibility'
import { Icon, type IconName } from '../../../icons'
import { runTool } from '../../../toolRegistry'
import '../../toolbarV8.css'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

function Row({
  icon,
  label,
  testId,
  onPick,
}: {
  icon: IconName
  label: string
  testId: string
  onPick: () => void
}) {
  return (
    <button
      type="button"
      data-chrome
      data-testid={testId}
      className="v8fold-row"
      onMouseDown={keepFocus}
      onClick={onPick}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </button>
  )
}

/** ⋯ (1f): under what did not fit, the rest of the bar: Reading mode, All tools, Settings, Hide. */
export default function MoreExtras({
  onAllTools,
  onClose,
}: {
  onAllTools: () => void
  onClose: () => void
}) {
  const allTools = useUnlocked('tb.allTools')
  const run = (id: string) => {
    onClose()
    runTool(id)
  }
  return (
    <CardGroup label={t('v8.more.groupApp')}>
      <Row
        icon="eye"
        label={t('tool.readingMode')}
        testId="v8-more-reading"
        onPick={() => run('readingMode')}
      />
      {allTools ? (
        <Row
          icon="grid"
          label={t('v8.more.allTools')}
          testId="v8-more-alltools"
          onPick={onAllTools}
        />
      ) : null}
      <Row
        icon="settings"
        label={t('tool.settings')}
        testId="v8-more-settings"
        onPick={() => run('settings')}
      />
      <Row
        icon="eyeOff"
        label={t('v8.more.hideBar')}
        testId="v8-more-hide"
        onPick={() => {
          onClose()
          void requestHideToolBar()
        }}
      />
    </CardGroup>
  )
}
