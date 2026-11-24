import {
  createContext,
  forwardRef,
  useContext,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { ClearField } from '../design/parts/ClearField'

/** True inside the new Settings: text fields of today's screens get the shared ✕. */
const ClearableContext = createContext(false)

export function ClearableArea({ children }: { children: ReactNode }) {
  return (
    <ClearableContext.Provider value={true}>
      {children}
    </ClearableContext.Provider>
  )
}

const TEXT_LIKE = new Set([
  'text',
  'password',
  'email',
  'search',
  'number',
  'tel',
  'url',
])

/**
 * A plain input that becomes the shared ✕ field only when asked (`clearable`,
 * or inside <ClearableArea>). Otherwise it is exactly the plain input it was.
 */
export const AreaInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { clearable?: boolean }
>(function AreaInput({ clearable, ...props }, ref) {
  const inArea = useContext(ClearableContext)
  const on = clearable ?? inArea
  if (!on || !TEXT_LIKE.has(props.type ?? 'text'))
    return <input ref={ref} {...props} />
  return <ClearField ref={ref} {...props} />
})
