import { use } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { JsonValue } from '../../core/types'
import { settingsRegistry } from '../builtinSettings'
import { readDeviceSetting } from '../settingsService'
import { useSettingsHistory } from './historyCtx'
import { rowsToTurnOff } from './tryNew'
import { tv } from './tv'

/**
 * The top of the hidden Try new features list (SET-B26): a plain risk note
 * and "Turn all off" (one Undo step). Each switch below is a registry row.
 */
export function TryNewHeader() {
  const history = useSettingsHistory()
  const { toast } = use(AppUiContext)
  const turnAllOff = () => {
    const rows = rowsToTurnOff(
      settingsRegistry.list(),
      (s) => readDeviceSetting(s) === 'on',
    )
    if (rows.length === 0) {
      toast(tv('sv3.tryNew.noneOn'))
      return
    }
    history.record(
      {
        label: tv('sv3.tryNew.title'),
        items: rows.map((s) => ({
          id: s.id,
          before: 'on' as JsonValue,
          after: 'off' as JsonValue,
        })),
      },
      tv('sv3.tryNew.allOff', { count: rows.length }),
    )
    for (const s of rows) void history.write(s.id, 'off')
  }
  return (
    <div className="sv3-row" data-try-new-header>
      <p className="sv3-line-help">{tv('sv3.tryNew.risk')}</p>
      <p className="sv3-line-help">{tv('sv3.tryNew.keepScreen')}</p>
      <div className="sv3-row-control">
        <button
          type="button"
          className="sv3-btn"
          data-try-new-off
          onClick={turnAllOff}
        >
          {tv('sv3.tryNew.turnAllOff')}
        </button>
        <span className="sv3-line-help" data-try-new-keeps>
          {tv('sv3.tryNew.keepsOn')}
        </span>
      </div>
    </div>
  )
}
