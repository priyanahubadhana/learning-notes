import { penSettings, type DrawAs } from '../../../main/inkSettings'
import { selectTool } from '../../../main/selectTool'

/**
 * Logic of the Shapes cards (1d, TB-31). Shapes is the Pen drawing a clean
 * shape (today's behaviour, ink/inkTools.ts), so size, colour and shape help
 * are the Pen's own settings: nothing is copied.
 */

/** The clean shapes. Freehand and Tape stay with Pen and Insert. */
export const SHAPE_CHOICES: readonly DrawAs[] = [
  'line',
  'arrow',
  'rect',
  'ellipse',
  'triangle',
]

export const isShapeDraw = (d: DrawAs): boolean => SHAPE_CHOICES.includes(d)

export const chooseShape = (shape: DrawAs): void => {
  penSettings.update({ drawAs: shape })
  selectTool('pen')
}

/** Tapping Shapes: the pen now draws a clean shape (a chosen one stays). */
export function enterShapes(): void {
  if (!isShapeDraw(penSettings.get().drawAs))
    penSettings.update({ drawAs: 'rect' })
  selectTool('pen')
}

/** Going back to the Pen: freehand again. */
export function leaveShapes(): void {
  if (isShapeDraw(penSettings.get().drawAs))
    penSettings.update({ drawAs: 'free' })
}
