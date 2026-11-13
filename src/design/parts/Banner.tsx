import { useEffect, useState } from 'react'
import { Icon, type IconName } from '../../app/tools/icons'
import {
  type BannerItem,
  type BannerKind,
  type BannerQueue,
} from './bannerQueue'
import { tf } from './textFeedback'
import './Sheet.css' // the shared close button (.fb-x)
import './Banner.css'

const ICONS: Record<BannerKind, IconName> = {
  template: 'template',
  journal: 'notebook',
  readonly: 'eye',
  lock: 'lock',
  backup: 'save',
  update: 'rotate',
  install: 'tablet',
  storage: 'database',
}

/** One banner line: icon, text, one action, ✕. */
export function Banner({
  item,
  onClose,
  waiting = 0,
}: {
  item: BannerItem
  onClose(): void
  waiting?: number
}) {
  return (
    <div
      className="fb-banner"
      role="region"
      aria-label={tf('parts.fb.bannerRegion')}
      data-kind={item.kind}
      data-testid="fb-banner"
    >
      <span className="fb-banner__icon" aria-hidden="true">
        <Icon name={ICONS[item.kind]} size={18} />
      </span>
      <span className="fb-banner__text">{item.text}</span>
      {waiting > 0 ? (
        <span
          className="fb-banner__more"
          title={tf('parts.fb.bannerNext', { count: waiting })}
          data-testid="fb-banner-more"
        >
          +{waiting}
        </span>
      ) : null}
      {item.action ? (
        <button
          type="button"
          className="fb-banner__action"
          data-testid="fb-banner-action"
          onClick={item.action.run}
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="fb-x fb-banner__x"
        aria-label={tf('parts.fb.bannerClose')}
        data-testid="fb-banner-x"
        onClick={onClose}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}

/** Shows the first banner of a queue at the top of its container. */
export function BannerHost({ queue }: { queue: BannerQueue }) {
  const [, tick] = useState(0)
  useEffect(() => queue.subscribe(() => tick((n) => n + 1)), [queue])
  const cur = queue.current()
  if (!cur) return null
  return (
    <Banner
      key={cur.id}
      item={cur}
      waiting={queue.waiting()}
      onClose={() => queue.dismiss(cur.id)}
    />
  )
}
