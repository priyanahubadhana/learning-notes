import { Globe } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useFlag } from '../app/flags'
import { t } from '../i18n/t'
import {
  approveRemote,
  isApproved,
  isRemoteUrl,
  unapproveRemote,
} from './remoteImages'
import { useImageUrl } from './useImageUrl'

/**
 * The card that stands in for a web picture until the person allows it
 * (slice 11c). Nothing is fetched before the tap. Same look as the card in
 * the page editor: a tonal well, the site name, one button.
 */

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.slice(0, 48)
  } catch {
    return ''
  }
}

export function RemotePictureCard({
  url,
  failed,
  onLoad,
}: {
  url: string
  failed?: boolean
  onLoad: () => void
}) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const act = (e: { preventDefault(): void; stopPropagation(): void }) => {
    // The card can sit inside a tile that opens a page: this tap only loads.
    e.preventDefault()
    e.stopPropagation()
    if (!offline) onLoad()
  }
  return (
    <div
      data-testid="remote-picture-card"
      className="flex w-full flex-col items-start gap-2 rounded-xl border border-line bg-soft p-4"
    >
      <div className="flex items-center gap-2 text-muted">
        <Globe size={20} strokeWidth={1.6} aria-hidden />
        <span className="text-[13px]" data-testid="remote-picture-host">
          {hostOf(url)}
        </span>
      </div>
      {failed && (
        <p className="text-[13px] text-muted">{t('image.remote.cardError')}</p>
      )}
      {offline && (
        <p className="text-[13px] text-muted">{t('image.remote.offline')}</p>
      )}
      <span
        role="button"
        tabIndex={0}
        aria-disabled={offline || undefined}
        onClick={act}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') act(e)
        }}
        className={`inline-flex min-h-11 items-center rounded-lg bg-hover px-4 text-sm font-medium text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent ${offline ? 'opacity-50' : 'cursor-pointer'}`}
      >
        {t(failed ? 'image.remote.retry' : 'image.remote.loadBtn')}
      </span>
    </div>
  )
}

/**
 * A picture from note data. With the flag on, a web address shows the card
 * until allowed (for this visit); everything else passes through as before.
 * `children` gets the address to put in an <img> and the error handler.
 */
export function GatedPicture({
  source,
  children,
  fallback = null,
  cardStyle,
}: {
  source: string
  children: (url: string, onError: () => void) => ReactNode
  fallback?: ReactNode
  cardStyle?: CSSProperties
}) {
  const m1 = useFlag('security.m1')
  const [, bump] = useState(0)
  const [failed, setFailed] = useState(false)
  const url = useImageUrl(source)
  if (m1 && isRemoteUrl(source) && !isApproved(source)) {
    return (
      <div style={cardStyle}>
        <RemotePictureCard
          url={source}
          failed={failed}
          onLoad={() => {
            approveRemote(source)
            setFailed(false)
            bump((n) => n + 1)
          }}
        />
      </div>
    )
  }
  if (!url) return <>{fallback}</>
  return (
    <>
      {children(url, () => {
        if (!m1 || !isRemoteUrl(source)) return
        unapproveRemote(source)
        setFailed(true)
        bump((n) => n + 1)
      })}
    </>
  )
}
