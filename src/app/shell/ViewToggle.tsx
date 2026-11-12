import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { setLevel, useLevel, type Level } from '../../settings/level'

export interface ViewChoice {
  id: Level
  label: string
}

/** The two views of the shell (SH-06). Settings keep their own three levels. */
export const defaultViews = (): ViewChoice[] => [
  { id: 'beginner', label: t('shell.view.beginner') },
  { id: 'professional', label: t('shell.view.pro') },
]

/** `beg` or `pro`: the value of `data-mode` on the shell root. */
export const modeOf = (level: Level): 'beg' | 'pro' =>
  level === 'beginner' ? 'beg' : 'pro'

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
