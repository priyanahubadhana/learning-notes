import { SheetBase } from '../../design/parts/SheetBase'
import { ExperienceChoices } from './ExperienceChoices'
import { tv } from './tv'

/** SET-B24: the first-launch question again (same words as the first launch). */
export function ExperienceDialog({
  onClose,
  anchor,
}: {
  onClose(): void
  anchor?: HTMLElement | null
}) {
  return (
    <SheetBase
      title={tv('sv3.firstLaunch.title')}
      anchor={anchor}
      onClose={onClose}
      data-testid="sv3-experience-dialog"
    >
      <p className="sv3-line-help">{tv('sv3.firstLaunch.text')}</p>
      <ExperienceChoices onChosen={onClose} />
    </SheetBase>
  )
}
