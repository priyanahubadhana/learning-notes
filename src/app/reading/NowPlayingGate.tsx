import { lazy, Suspense } from 'react'
import { aloudState } from './aloudStores'

const NowPlayingPill = lazy(() =>
  import('./NowPlayingPill').then((m) => ({ default: m.NowPlayingPill })),
)

/** Loads the Now playing pill (and the speech code) only once speech runs. */
export function NowPlayingGate({
  onOpenPage,
}: {
  onOpenPage: (pageId: string) => void
}) {
  const state = aloudState.useValue()
  if (state === 'idle') return null
  return (
    <Suspense fallback={null}>
      <NowPlayingPill onOpenPage={onOpenPage} />
    </Suspense>
  )
}
