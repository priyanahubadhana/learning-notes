import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { FontTiles } from '../../app/reading/FontTiles'
import { ensureFont } from '../../app/reading/fonts'
import { fontStack, type ReadingFont } from '../../app/reading/readingPrefs'
import { Icon, type IconName } from '../../app/tools/icons'
import { COLOR_NAMES, TEXT_HEX, colorLabel } from '../../editor/colorData'
import { t, type MessageKey } from '../../i18n/t'
import {
  FONT_QUICK,
  LIST_CHOICES,
  SIZE_MAX,
  SIZE_MIN,
  clampSize,
  stepSize,
  type OneBarList,
} from './oneBarModel'
import { frameOfBox } from './listPlace'

/**
 * The small strips of the one bar (box bar part A). Each opens right under its
 * button, never past the page frame, and closes with its ✕, a tap outside or
 * Esc. They only say what was chosen; the bar does it (oneBarOps.ts).
 */

const k = (key: string) => key as MessageKey

/** One strip: placed under its button, pulled back inside the page frame. */
export function Pop({
  id,
  boxId,
  onClose,
  children,
  column,
}: {
  id: string
  boxId: string
  onClose: () => void
  children: ReactNode
  /** A list down the strip instead of a row of buttons. */
  column?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.translate = '0 0'
    const r = el.getBoundingClientRect()
    const boxEl = document.querySelector(
      '[data-paper-box="' + CSS.escape(boxId) + '"]',
    )
    const frame = boxEl ? frameOfBox(boxEl) : undefined
    const lo = Math.max(8, frame ? frame.left + 8 : 8)
    const hi = Math.min(
      innerWidth - 8,
      frame ? frame.right - 8 : innerWidth - 8,
    )
    let dx = 0
    if (r.right > hi) dx = hi - r.right
    if (r.left + dx < lo) dx = lo - r.left
    el.style.translate = `${dx}px 0`
  })
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t(k(`onebar.${id === 'bi' ? 'bi' : id}`))}
      data-onebar-pop={id}
      data-ui
      className={`ob1-pop${column ? ' ob1-pop--col' : ''}`}
    >
      {children}
      <button
        type="button"
        className="ob1-b ob1-x"
        aria-label={t('popup.close')}
        onClick={onClose}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}

/** A round 44 pt button with an icon. */
export function Strip({
  icon,
  label,
  on,
  onClick,
  children,
}: {
  icon?: IconName
  label: string
  on?: boolean
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      className="ob1-b"
      aria-label={label}
      aria-pressed={on === undefined ? undefined : on}
      onClick={onClick}
    >
      {icon ? <Icon name={icon} size={20} /> : children}
    </button>
  )
}

export function ColourPop({
  now,
  onPick,
}: {
  now: string
  onPick: (name: string) => void
}) {
  return (
    <div className="ob1-colours" role="group" aria-label={t('onebar.colour')}>
      {COLOR_NAMES.map((c) => (
        <button
          key={c}
          type="button"
          className="ob1-b ob1-colour"
          aria-label={colorLabel(c)}
          aria-pressed={now === c}
          onClick={() => onPick(c)}
        >
          <i style={{ background: TEXT_HEX[c] ?? 'var(--color-ink)' }} />
        </button>
      ))}
    </div>
  )
}

export function SizePop({
  value,
  onSet,
}: {
  value: number
  onSet: (px: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n)) onSet(clampSize(n))
  }
  return (
    <>
      <input
        type="number"
        inputMode="numeric"
        className="ob1-num"
        aria-label={t('onebar.size.number')}
        min={SIZE_MIN}
        max={SIZE_MAX}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
      />
      <input
        type="range"
        className="ob1-slider"
        aria-label={t('onebar.size.slider')}
        min={SIZE_MIN}
        max={96}
        step={1}
        value={Math.min(96, value)}
        onChange={(e) => onSet(clampSize(Number(e.target.value)))}
      />
      <span className="ob1-step">
        <button
          type="button"
          className="ob1-b"
          aria-label={t('onebar.size.smaller')}
          disabled={value <= SIZE_MIN}
          onClick={() => onSet(stepSize(value, -1))}
        >
          −
        </button>
        <button
          type="button"
          className="ob1-b"
          aria-label={t('onebar.size.larger')}
          disabled={value >= SIZE_MAX}
          onClick={() => onSet(stepSize(value, 1))}
        >
          +
        </button>
      </span>
    </>
  )
}

export function FontPop({
  now,
  onPick,
}: {
  /** The font id the words have now (`default` = the page's own). */
  now: string
  onPick: (font: string) => void
}) {
  const [more, setMore] = useState(false)
  // The three quick fonts show in their own look: load them (part of the app's files).
  useEffect(() => {
    for (const f of FONT_QUICK) void ensureFont(f.id)
  }, [])
  const row = (id: string, name: string, family: string, sub?: string) => (
    <button
      key={id}
      type="button"
      className="ob1-row"
      aria-label={sub ? `${name} (${sub})` : name}
      onClick={() => onPick(id)}
    >
      <span style={{ fontFamily: family }}>{name}</span>
      {sub && <small>{sub}</small>}
      {now === id && <Icon name="check" size={16} />}
    </button>
  )
  return (
    <div className="ob1-list">
      <div className="ob1-group">
        {FONT_QUICK.map((f) =>
          row(
            f.id,
            t(f.key),
            fontStack(f.id as Exclude<ReadingFont, 'app'>),
            f.family,
          ),
        )}
      </div>
      <div className="ob1-group">
        <button
          type="button"
          className="ob1-row"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
        >
          <span>{t('onebar.font.more')}</span>
          <Icon name={more ? 'chevronUp' : 'chevronDown'} size={16} />
        </button>
      </div>
      {more && (
        <FontTiles<ReadingFont | 'default'>
          value={(now || 'default') as ReadingFont | 'default'}
          none="default"
          compact
          onPick={onPick}
        />
      )}
    </div>
  )
}

export function BiPop({
  styles,
  onToggle,
  onHighlight,
}: {
  styles: Record<string, unknown>
  onToggle: (s: 'bold' | 'italic' | 'underline' | 'strike') => void
  onHighlight: () => void
}) {
  return (
    <>
      <Strip
        label={t('onebar.bold')}
        on={!!styles.bold}
        onClick={() => onToggle('bold')}
      >
        <b>B</b>
      </Strip>
      <Strip
        label={t('onebar.italic')}
        on={!!styles.italic}
        onClick={() => onToggle('italic')}
      >
        <i>I</i>
      </Strip>
      <Strip
        label={t('onebar.underline')}
        on={!!styles.underline}
        onClick={() => onToggle('underline')}
      >
        <u>U</u>
      </Strip>
      <Strip
        label={t('onebar.strike')}
        on={!!styles.strike}
        onClick={() => onToggle('strike')}
      >
        <s>S</s>
      </Strip>
      <Strip
        icon="highlighter"
        label={t('onebar.highlight')}
        on={styles.backgroundColor !== undefined}
        onClick={onHighlight}
      />
    </>
  )
}

export function AlignPop({
  align,
  line,
  onAlign,
  onLine,
}: {
  align: string
  line: 'tight' | 'loose' | undefined
  onAlign: (a: 'left' | 'center' | 'right') => void
  onLine: (l: 'tight' | 'loose' | undefined) => void
}) {
  const [spacing, setSpacing] = useState(false)
  if (spacing)
    return (
      <>
        {([undefined, 'tight', 'loose'] as const).map((l) => (
          <button
            key={l ?? 'normal'}
            type="button"
            className="ob1-b ob1-w"
            aria-pressed={line === l}
            onClick={() => {
              onLine(l)
              setSpacing(false)
            }}
          >
            {t(k(`onebar.spacing.${l ?? 'normal'}`))}
          </button>
        ))}
      </>
    )
  return (
    <>
      <Strip
        icon="alignLeft"
        label={t('onebar.alignLeft')}
        on={align === 'left'}
        onClick={() => onAlign('left')}
      />
      <Strip
        icon="alignCenter"
        label={t('onebar.alignCentre')}
        on={align === 'center'}
        onClick={() => onAlign('center')}
      />
      <Strip
        icon="alignRight"
        label={t('onebar.alignRight')}
        on={align === 'right'}
        onClick={() => onAlign('right')}
      />
      <span className="ob1-sep" />
      <Strip
        icon="sliders"
        label={t('onebar.spacing')}
        onClick={() => setSpacing(true)}
      />
    </>
  )
}

export function ListPop({
  now,
  onPick,
}: {
  now: OneBarList | null
  onPick: (l: OneBarList) => void
}) {
  return (
    <>
      {LIST_CHOICES.map((l) => (
        <Strip
          key={l.id}
          icon={l.icon as IconName}
          label={t(l.key)}
          on={now === l.id}
          onClick={() => onPick(l.id)}
        />
      ))}
    </>
  )
}

export function PastePop({
  onPick,
}: {
  onPick: (how: 'keep' | 'match' | 'plain') => void
}) {
  return (
    <div className="ob1-list">
      {(['keep', 'match', 'plain'] as const).map((how) => (
        <button
          key={how}
          type="button"
          className="ob1-row"
          onClick={() => onPick(how)}
        >
          <Icon name="clipboard" size={18} />
          <span>{t(k(`onebar.paste.${how}`))}</span>
        </button>
      ))}
      <p className="ob1-hint">{t('onebar.paste.hint')}</p>
    </div>
  )
}
