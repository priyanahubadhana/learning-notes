import {
  createElement,
  lazy,
  useState,
  type ComponentProps,
  type ComponentType,
} from 'react'

/**
 * R13: React 19 holds a suspended lazy part back for up to 300 ms, even when
 * its code arrived long before, so a bar, menu or card from a lazy part showed
 * late after a tap. `lazyNow` is a drop-in for `lazy`: use it inside the same
 * `<Suspense>`. `Part.preload()` fetches the code ahead (call it once the
 * screen is idle, see prefetchAfterIdle); once it is here the part draws in
 * its own render, with no Suspense in the way. Before that it behaves exactly
 * like `lazy`. The choice is made when the part mounts, so a part already on
 * screen is never swapped for another copy (no lost state).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyNow<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
) {
  let loaded: T | null = null
  let fetching: Promise<unknown> | null = null
  const Lazy = lazy(() =>
    load().then((m) => {
      loaded = m.default
      return m
    }),
  )
  function Part(props: ComponentProps<T>) {
    const [Ready] = useState(() => loaded)
    return createElement(
      (Ready ?? Lazy) as ComponentType<ComponentProps<T>>,
      props,
    )
  }
  Part.preload = (): Promise<unknown> =>
    (fetching ??= load().then((m) => {
      loaded = m.default
    }))
  return Part
}
