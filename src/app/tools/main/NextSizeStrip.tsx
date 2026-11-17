import { SIZE_NORMAL } from '../../../design/parts/sizeModel'
import { SizeStrip } from '../../../design/parts/SizeStrip'
import { applyNextSize } from './nextSizeWatch'
import { nextSize } from './textStyle'

/** The Text tool's size control with textbox.v2: the SAME size strip as the box bar (see nextSizeWatch.ts for what it sets). */
export function NextSizeStrip() {
  return (
    <SizeStrip
      value={nextSize.useValue() ?? SIZE_NORMAL}
      onSet={(n) => {
        nextSize.set(n)
        applyNextSize(n)
      }}
    />
  )
}
