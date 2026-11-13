import { useRef } from 'react'
import { rowShown, useGateVersion } from './experience'
import { ShowInBeginner } from './ShowInBeginner'
import { createTapCounter } from './tryNew'
import { tv } from './tv'

/**
 * The Version row of Help & tour (SET-P11 `about.version`). The row and its
 * tap target always show; the build details are the Professional part.
 * Tapping it five times opens the hidden "Try new features" (SET-B26).
 */
export function VersionRow({ onFiveTaps }: { onFiveTaps(): void }) {
  useGateVersion()
  const counter = useRef(createTapCounter())
  const details = rowShown('about.version')
  return (
    <section className="sv3-row" data-setting-id="about.version">
      <h3 className="sv3-row-name">{tv('sv3.version.name')}</h3>
      <p className="sv3-line-help" data-version-line>
        {details
          ? tv('sv3.version.details', {
              commit: __APP_COMMIT__.slice(0, 7),
              date: new Date(__APP_BUILT__).toLocaleDateString(),
            })
          : tv('sv3.version.help')}
      </p>
      <div className="sv3-row-control">
        <button
          type="button"
          className="sv3-btn"
          data-version-tap
          aria-label={tv('sv3.version.name')}
          onClick={() => {
            if (counter.current(Date.now())) onFiveTaps()
          }}
        >
          {tv('sv3.version.name')}
        </button>
      </div>
      <ShowInBeginner id="about.version" />
    </section>
  )
}
