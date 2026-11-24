import { useContext, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'

/**
 * A link that opens Settings at one exact row and highlights it
 * (`<category>/<row id>`, see SettingsScreen `focusId`).
 */
export function SettingsLink({
  to,
  className = 'text-accent underline',
  children,
}: {
  to: string
  className?: string
  children: ReactNode
}) {
  const { openSettings } = useContext(AppUiContext)
  return (
    <button
      type="button"
      className={`${className} inline`}
      onClick={() => openSettings(to)}
    >
      {children}
    </button>
  )
}
