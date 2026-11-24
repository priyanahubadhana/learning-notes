import { use, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { ConfirmDialog } from '../../app/ui'
import type { LearningNotesDB } from '../../core/db'
import type { JsonValue } from '../../core/types'
import type { SettingDefinition } from '../registry'
import { getSetting, readDeviceSetting } from '../settingsService'
import { useSettingsHistory } from './historyCtx'
import type { HistoryItem } from './settingsHistory'
import { tv } from './tv'

const same = (a: JsonValue, b: JsonValue) =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * SET-B13: "Reset this section". A small dialog says what will reset; Confirm
 * writes the default of every non-default setting of this section only, as ONE
 * history step, and a toast offers Undo (SET-B14).
 */
export function SectionReset({
  db,
  sectionName,
  rows,
}: {
  db: LearningNotesDB
  sectionName: string
  rows: SettingDefinition[]
}) {
  const { toast } = use(AppUiContext)
  const history = useSettingsHistory()
  const [pending, setPending] = useState<HistoryItem[] | null>(null)

  const ask = async () => {
    const items: HistoryItem[] = []
    for (const d of rows) {
      if (d.control.kind === 'action' || d.control.kind === 'labels') continue
      const now: JsonValue =
        d.scope === 'device' ? readDeviceSetting(d) : await getSetting(db, d)
      if (!same(now, d.defaultValue))
        items.push({ id: d.id, before: now, after: d.defaultValue })
    }
    if (items.length === 0) toast(tv('sv3.resetNone'))
    else setPending(items)
  }
  const confirm = async () => {
    const items = pending ?? []
    setPending(null)
    await Promise.all(items.map((i) => history.write(i.id, i.after)))
    history.record({ label: tv('sv3.resetDone'), items }, tv('sv3.resetDone'))
  }

  return (
    <>
      <button
        type="button"
        data-section-reset
        className="sv3-btn sv3-reset"
        onClick={() => void ask()}
      >
        {tv('sv3.resetSection')}
      </button>
      {pending && (
        <ConfirmDialog
          message={tv('sv3.resetAsk', {
            section: sectionName,
            count: pending.length,
          })}
          confirmLabel={tv('sv3.resetConfirm')}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )
}
