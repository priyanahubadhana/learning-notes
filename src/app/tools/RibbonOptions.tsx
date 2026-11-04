import { Tip } from '../../help/Help'
import { t, type MessageKey } from '../../i18n/t'
import { AnchoredMenu } from './AnchoredMenu'
import { useAnchoredMenu } from './useAnchoredMenu'
import { freeTip } from './freeBar'
import { resetRibbonOptions } from './ribbonDefaults'
import { Icon } from './icons'
import {
  RIBBON_MODES,
  RIBBON_SIZES,
  ribbonMode,
  ribbonPlace,
  ribbonSize,
  type RibbonPlace,
} from './toolbarState'

const PLACES: readonly RibbonPlace[] = ['same', 'top', 'bottom', 'free']

/**
 * The ribbon options menu (a three-dot button): how it shows (replacing the
 * short bar or beside it), its size (Full or Slim) and its position (the short
 * bar place, Top, Bottom or Floating), and Reset.
 */
export function RibbonOptions({ px }: { px: number }) {
  const menu = useAnchoredMenu()
  const mode = ribbonMode.useValue()
  const size = ribbonSize.useValue()
  const place = ribbonPlace.useValue()

  const row = (
    key: string,
    label: string,
    checked: boolean | null,
    choose: () => void,
  ) => (
    <button
      key={key}
      type="button"
      role={checked === null ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked ?? undefined}
      data-option={key}
      onClick={() => {
        choose()
        menu.close()
      }}
      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-hover"
    >
      <span aria-hidden className="w-4 text-accent">
        {checked ? '✓' : ''}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  )
  const heading = (key: MessageKey) => (
    <div
      role="presentation"
      className="px-2 pt-1.5 pb-0.5 text-[11px] tracking-[0.06em] text-muted uppercase"
    >
      {t(key)}
    </div>
  )

  return (
    <>
      <Tip id="ribbon.options" touchInfo={false} className="inline-flex">
        <button
          type="button"
          data-bar-btn
          data-action="ribbonOptions"
          {...menu.trigger}
          aria-label={t('ribbon.options')}
          title={t('ribbon.options')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={menu.toggle}
          style={{ minHeight: px, minWidth: px }}
          className="inline-flex shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink"
        >
          <Icon name="more" />
        </button>
      </Tip>
      <AnchoredMenu menu={menu} label={t('ribbon.options')} width={260}>
        {heading('ribbon.opt.show')}
        {RIBBON_MODES.map((m) =>
          row(
            `mode-${m}`,
            t(`ribbon.mode.${m}` as MessageKey),
            mode === m,
            () => ribbonMode.set(m),
          ),
        )}
        {heading('ribbon.opt.size')}
        {RIBBON_SIZES.map((s) =>
          row(
            `size-${s}`,
            t(`ribbon.size.${s}` as MessageKey),
            size === s,
            () => ribbonSize.set(s),
          ),
        )}
        {heading('ribbon.opt.position')}
        {PLACES.map((p) =>
          row(
            `place-${p}`,
            t(`ribbon.place.${p}` as MessageKey),
            place === p,
            () => {
              ribbonPlace.set(p)
              if (p === 'free') freeTip.set(true)
            },
          ),
        )}
        <hr className="my-1 border-line" />
        {row('reset', t('ribbon.opt.reset'), null, resetRibbonOptions)}
      </AnchoredMenu>
    </>
  )
}
