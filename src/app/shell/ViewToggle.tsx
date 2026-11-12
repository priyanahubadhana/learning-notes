import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { setLevel, useLevel } from '../../settings/level'
import { defaultViews, type ViewChoice } from './views'

/**
 * SH-06: "Beginner | Professional" at the top of every space. It writes the
 * app's level (src/settings/level.ts); per-feature unlocks are untouched.
 */
export function ViewToggle({
  views = defaultViews(),
  className = '',
}: {
  views?: ViewChoice[]
  className?: string
}) {
  const level = useLevel()
  const [glow, setGlow] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setGlow(true)
    const id = setTimeout(() => setGlow(false), 180)
    return () => clearTimeout(id)
  }, [level])
  return (
    <div
      role="group"
      aria-label={t('shell.view')}
      data-testid="view-toggle"
      data-glow={glow ? '' : undefined}
      className={`sh-view ${className}`}
    >
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={level === v.id}
          data-view={v.id}
          onClick={() => setLevel(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}
