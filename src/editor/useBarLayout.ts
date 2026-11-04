import { barLayout, type BarLayout } from '../app/tools/barLayout'
import { ribbonMode, ribbonOpen, ribbonPlace } from '../app/tools/toolbarState'
import { barPlacementSetting } from '../settings/builtinSettings'
import { useDeviceSetting } from '../settings/useSetting'

/** Which bars show now, and where (see app/tools/barLayout.ts). */
export function useBarLayout(): BarLayout {
  const [placement] = useDeviceSetting(barPlacementSetting)
  const open = ribbonOpen.useValue()
  const mode = ribbonMode.useValue()
  const place = ribbonPlace.useValue()
  return barLayout(placement, open, mode, place)
}
