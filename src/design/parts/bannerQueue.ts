export type BannerKind =
  | 'template'
  | 'journal'
  | 'readonly'
  | 'lock'
  | 'backup'
  | 'update'
  | 'install'
  | 'storage'

export interface BannerItem {
  id: string
  kind: BannerKind
  text: string
  /** One action, optional. */
  action?: { label: string; run(): void }
}

/** A queue that shows one banner at a time; a newer one waits its turn (SP-56). */
export function createBannerQueue() {
  let list: BannerItem[] = []
  const subs = new Set<() => void>()
  const emit = () => subs.forEach((f) => f())
  return {
    /** Adds a banner; an id that is already queued is not added twice. */
    push(b: BannerItem) {
      if (list.some((x) => x.id === b.id)) return
      list = [...list, b]
      emit()
    },
    dismiss(id: string) {
      const next = list.filter((x) => x.id !== id)
      if (next.length === list.length) return
      list = next
      emit()
    },
    current: (): BannerItem | undefined => list[0],
    waiting: (): number => Math.max(0, list.length - 1),
    subscribe(cb: () => void) {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    },
  }
}
export type BannerQueue = ReturnType<typeof createBannerQueue>
