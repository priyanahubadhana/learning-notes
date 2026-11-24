import { SHELL_PATHS, type ShellIconName } from './shellPaths'

/** Decorative line icon; the button around it carries the name. */
export function ShellIcon({
  name,
  size = 24,
}: {
  name: ShellIconName
  size?: number
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // The paths are the constants above, never user text.
      dangerouslySetInnerHTML={{ __html: SHELL_PATHS[name] }}
    />
  )
}
