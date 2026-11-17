import { createPortal } from 'react-dom'
import { pageArea } from '../../app/tools/main/miniBarPrefs'
import { t, type MessageKey } from '../../i18n/t'
import { ZONE, type BarSide } from './oneBarDockModel'

/** The dashed landing zones on the four sides of the page, while the bar is held. */
export function DockZones({ zone }: { zone: BarSide | null }) {
  const a = pageArea()
  const w = a.right - a.left
  const h = a.bottom - a.top
  const styles = {
    top: { left: a.left + 8, top: a.top + 8, width: w - 16, height: ZONE - 8 },
    bottom: {
      left: a.left + 8,
      top: a.bottom - ZONE,
      width: w - 16,
      height: ZONE - 8,
    },
    left: {
      left: a.left + 8,
      top: a.top + ZONE,
      width: ZONE - 8,
      height: h - 2 * ZONE,
    },
    right: {
      left: a.right - ZONE,
      top: a.top + ZONE,
      width: ZONE - 8,
      height: h - 2 * ZONE,
    },
  }
  return createPortal(
    <div className="ob1-zones" aria-hidden="true" data-ui>
      {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
        <div
          key={side}
          className={`ob1-zone${zone === side ? ' is-on' : ''}`}
          data-onebar-zone={side}
          style={styles[side]}
        >
          {t(`onebar.zone.${side}` as MessageKey)}
        </div>
      ))}
    </div>,
    document.body,
  )
}
