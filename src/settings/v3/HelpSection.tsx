import { useState } from 'react'
import { ExperienceDialog } from './ExperienceDialog'
import { rowShown, useGateVersion } from './experience'
import { ToursLibrary } from './ToursLibrary'
import { VersionRow } from './VersionRow'
import { ShowInBeginner } from './ShowInBeginner'
import { tv } from './tv'

/**
 * Help & tour: the first-launch question again (SET-B24, Professional switch
 * `help.firstLaunch`) and the Tours library (SET-B22, B23).
 */
export function HelpSection({
  onShow,
  onFiveTaps,
}: {
  onShow(settingId: string, sectionId: string): void
  /** The Version row was tapped five times. */
  onFiveTaps(): void
}) {
  useGateVersion()
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <ToursLibrary onShow={onShow} />
      <VersionRow onFiveTaps={onFiveTaps} />
      {rowShown('help.firstLaunch') && (
        <section className="sv3-row" data-setting-id="help.firstLaunch">
          <h3 className="sv3-row-name">{tv('sv3.firstLaunch.name')}</h3>
          <p className="sv3-line-help">{tv('sv3.firstLaunch.help')}</p>
          <div className="sv3-row-control">
            <button
              ref={setOpener}
              type="button"
              className="sv3-btn"
              data-first-launch
              onClick={() => setOpen(true)}
            >
              {tv('sv3.firstLaunch.button')}
            </button>
          </div>
          <ShowInBeginner id="help.firstLaunch" />
        </section>
      )}
      {open && (
        <ExperienceDialog anchor={opener} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
