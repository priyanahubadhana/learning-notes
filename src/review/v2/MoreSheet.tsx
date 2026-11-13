import { useContext, useMemo, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { MoreSheet as ShellMoreSheet } from '../../app/shell/MoreSheet'
import { EmptyState } from '../../design/parts/EmptyState'
import { t } from '../../i18n/t'
import { isUnlocked } from '../../settings/level'
import { createDraft, moreTabs, type MoreTabId } from './moreDraft'

export interface ReviewMoreSheetProps {
  onClose: () => void
}

/**
 * Review's More sheet (RV-P09..P13) on the shell sheet (SH-09). Tabs show only
 * for the switches that are on. Edits wait in a draft; Done saves them all at
 * once with one toast and one Undo; Cancel, ✕, Esc or a tap outside throws
 * them away (the shell sheet asks first when there are edits). The tab bodies
 * (Decks, Browse...) come with their own parts and stage edits in the draft.
 */
export function ReviewMoreSheet({ onClose }: ReviewMoreSheetProps) {
  const ui = useContext(AppUiContext)
  const draft = useRef(createDraft()).current
  const tabs = useMemo(() => moreTabs(isUnlocked), [])
  const [tab, setTab] = useState<MoreTabId | string>(tabs[0]?.id ?? '')
  const [, bump] = useState(0)

  const done = () =>
    runTask(
      draft.commit().then((undo) => {
        onClose()
        if (!undo) return
        ui.toast(t('rv2.moreChanged'), {
          label: t('review.undo'),
          onSelect: () => runTask(undo()),
        })
      }),
    )

  return (
    <ShellMoreSheet
      id="review-more"
      title={t('rv2.more')}
      sub={t('rv2.moreSub')}
      hint={t('rv2.moreHint')}
      tabs={tabs}
      tab={tab}
      onTab={(id) => {
        setTab(id)
        bump((n) => n + 1)
      }}
      setKey="review-more"
      dirty={draft.dirty()}
      onDone={done}
      onClose={() => {
        draft.discard()
        onClose()
      }}
    >
      {tabs.length === 0 ? (
        <EmptyState
          variant="inline"
          testId="rv2-more-empty"
          icon="sliders"
          text={t('rv2.moreEmpty')}
        />
      ) : (
        <p className="rv2-more-note" data-testid={`rv2-tab-${tab}`}>
          {t('rv2.tabSoon')}
        </p>
      )}
    </ShellMoreSheet>
  )
}
