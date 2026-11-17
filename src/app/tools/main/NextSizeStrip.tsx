import { SIZE_NORMAL } from '../../../design/parts/sizeModel'
import { SizeStrip } from '../../../design/parts/SizeStrip'
import { currentRunner } from '../toolRuntime'
import { nextSize } from './textStyle'

/**
 * The Text tool's size control with textbox.v2 (box bar part B): the SAME size
 * strip as the box bar (number, slider, − / +, any number). Here it sets the
 * size for what is written next: it is kept on this device and put on the
 * caret now (words already selected are left alone; the box bar sizes those).
 */
export function applyNextSize(px: number): void {
  try {
    const ed = currentRunner().editor
    if (ed && ed.getSelectedText() === '')
      ed.addStyles({ fontSize: String(px) } as never)
  } catch {
    /* no editor open: the size waits in the setting */
  }
}

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
