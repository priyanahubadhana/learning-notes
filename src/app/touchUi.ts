/** True on a touch or Pencil device (a finger or Pencil can reach the screen). */
export function touchUi(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(any-pointer: coarse)').matches
  )
}
