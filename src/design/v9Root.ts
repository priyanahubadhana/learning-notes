import { useEffect } from 'react'

/**
 * Toolbar v9 look switch (task 2A.5): while toolbar.v8 is ON the page root
 * carries `data-v9`, so every screen (Settings too) shows the same wells,
 * knobs and ink with the bar mounted or not. With the flag OFF it is absent
 * and the --v9-* tokens do not exist (parts fall back to today's look).
 */
export function useV9Root(on: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    if (on) root.setAttribute('data-v9', '')
    else root.removeAttribute('data-v9')
    return () => root.removeAttribute('data-v9')
  }, [on])
}
