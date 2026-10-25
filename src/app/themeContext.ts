import { createContext } from 'react'
import type { Theme } from './theme'

/** The active theme, for components that style themselves (e.g. editor). */
export const ThemeContext = createContext<Theme>('day')
