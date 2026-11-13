import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
  type ReactNode,
} from 'react'
import { Icon } from '../../app/tools/icons'
import { EmptyState } from './EmptyState'
import {
  compareBlocks,
  foldRuns,
  type CompareDoc,
  type CompareRow,
  type Word,
} from './compareBlocks'
import { tp3 } from './tp3'
import './BeforeAfter.css'

type HoldProps = {
  mode: 'hold'
  before: ReactNode
  after: ReactNode
  beforeLabel?: string
  /** True while the original shows (held or latched by the Before / after button). */
  showBefore?: boolean
}
type SideProps = {
  mode: 'side'
  before: CompareDoc
  after: CompareDoc
  beforeLabel: string
  afterLabel: string
  beforeMeta?: string
  afterMeta?: string
  actions?: ReactNode
  onCopy?(blocks: string[]): void
  loading?: boolean
  error?: { text?: string; onRetry(): void }
  /** Force the stacked phone shape (gallery). */
  stacked?: boolean
}
export type BeforeAfterProps = (HoldProps | SideProps) & {
  'data-testid'?: string
}

/** Hold mode (S3-30): one preview; the original shows with a "Before" tag. The picture never moves. */
function Hold(props: HoldProps & { 'data-testid'?: string }) {
  const on = !!props.showBefore
  return (
    <div
      className="ba-hold"
      data-showing={on ? 'before' : 'after'}
      data-testid={props['data-testid'] ?? 'ba-hold'}
    >
      <div className="ba-layer" data-which="after" aria-hidden={on}>
        {props.after}
      </div>
      <div className="ba-layer" data-which="before" aria-hidden={!on}>
        {props.before}
      </div>
      {on ? (
        <span className="ba-tag" data-testid="ba-tag">
          {props.beforeLabel ?? tp3('parts.cmp.before')}
        </span>
      ) : null}
    </div>
  )
}

const MARK_WORD: Record<string, string> = { add: 'ba-w-add', del: 'ba-w-del' }

function Words({ words }: { words: Word[] }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className={MARK_WORD[w.mark]}>
          {w.t}
        </span>
      ))}
    </>
  )
}

function Cell({
  row,
  side,
  current,
  index,
}: {
  row: CompareRow
  side: 'before' | 'after'
  current: boolean
  index: number
}) {
  const block = row[side]
  const sign =
    row.kind === 'changed'
      ? '~'
      : row.kind === 'added' && side === 'after'
        ? '+'
        : row.kind === 'removed' && side === 'before'
          ? '−'
          : ''
  const kind =
    row.kind === 'same' ||
    (row.kind === 'added' && side === 'before') ||
    (row.kind === 'removed' && side === 'after')
      ? 'same'
      : row.kind
  if (!block)
    return (
      <div className="ba-cell ba-gap" aria-hidden="true" data-row={index} />
    )
  const pic =
    row.kind === 'changed' && row.before?.picture !== row.after?.picture
  const word = tp3(
    kind === 'added'
      ? 'parts.cmp.added'
      : kind === 'removed'
        ? 'parts.cmp.removed'
        : 'parts.cmp.changed',
  )
  return (
    <div
      className="ba-cell"
      data-kind={kind}
      data-row={index}
      data-change={row.change ?? undefined}
      data-current={current ? '' : undefined}
    >
      <span className="ba-sign" aria-hidden="true">
        {sign}
      </span>
      <p className="ba-text">
        {kind !== 'same' ? <span className="ba-sr">{word}: </span> : null}
        {pic ? <em>{tp3('parts.cmp.pictureChanged')}</em> : null}
        {row.words ? <Words words={row.words[side]} /> : block.text}
      </p>
    </div>
  )
}

/** Side mode (S3-33 to S3-38): two copies, changes marked by a sign and a tint. */
function Side(props: SideProps & { 'data-testid'?: string }) {
  const { before, after, loading, error } = props
  const result = useMemo(() => compareBlocks(before, after), [before, after])
  const items = useMemo(() => foldRuns(result.rows), [result])
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set())
  const [at, setAt] = useState(-1) // current change, -1 = none yet
  const colA = useRef<HTMLDivElement | null>(null)
  const colB = useRef<HTMLDivElement | null>(null)
  const echo = useRef(false)

  const sync = (from: 'a' | 'b') => () => {
    if (echo.current) {
      echo.current = false
      return
    }
    const src = from === 'a' ? colA.current : colB.current
    const dst = from === 'a' ? colB.current : colA.current
    if (!src || !dst || dst.scrollTop === src.scrollTop) return
    echo.current = true
    dst.scrollTop = src.scrollTop
  }

  const go = useCallback(
    (to: number) => {
      if (result.changes === 0) return
      const n = ((to % result.changes) + result.changes) % result.changes
      setAt(n)
      for (const col of [colA.current, colB.current]) {
        const el = col?.querySelector<HTMLElement>(
          `[data-change="${n}"]:not(.ba-gap)`,
        )
        if (col && el) {
          echo.current = false
          const top =
            el.offsetTop -
            col.offsetTop -
            col.clientHeight / 2 +
            el.offsetHeight / 2
          col.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
        }
      }
      echo.current = false
    },
    [result.changes],
  )

  const onKey = (e: RKeyboardEvent) => {
    if (e.key === 'n' || e.key === 'N') go(at + 1)
    else if (e.key === 'p' || e.key === 'P') go(at - 1)
  }

  if (loading)
    return (
      <div
        className="ba-side"
        aria-busy="true"
        data-testid={props['data-testid'] ?? 'ba-side'}
      >
        <div className="ba-skel" data-testid="ba-loading" role="status">
          <span className="ba-sr">{tp3('parts.cmp.loading')}</span>
          <i />
          <i />
        </div>
      </div>
    )
  if (error)
    return (
      <div className="ba-side" data-testid={props['data-testid'] ?? 'ba-side'}>
        <EmptyState
          variant="inline"
          testId="ba-error"
          title={error.text ?? tp3('parts.cmp.error')}
          text=""
          action={tp3('parts.cmp.retry')}
          onAction={error.onRetry}
        />
      </div>
    )

  const missing =
    (before.blocks.length === 0) !== (after.blocks.length === 0)
      ? before.blocks.length === 0
        ? 'before'
        : 'after'
      : null
  const same = result.changes === 0
  const copy = (doc: CompareDoc) => () =>
    props.onCopy?.(doc.blocks.map((b) => b.text))

  const col = (
    side: 'before' | 'after',
    label: string,
    meta: string | undefined,
    ref: typeof colA,
    from: 'a' | 'b',
  ) => (
    <section
      className="ba-col"
      role="region"
      aria-label={label}
      data-testid={`ba-col-${side}`}
    >
      <header className="ba-colhead">
        <span className="ba-label">{label}</span>
        {meta ? <span className="ba-meta">{meta}</span> : null}
        {props.onCopy ? (
          <button
            type="button"
            className="ba-copy"
            aria-label={label}
            data-testid={`ba-copy-${side}`}
            onClick={copy(side === 'before' ? before : after)}
          >
            <Icon name="copy" size={16} />
          </button>
        ) : null}
      </header>
      <div
        className="ba-body"
        ref={ref}
        onScroll={sync(from)}
        data-selectable={props.onCopy ? '' : undefined}
        data-testid={`ba-body-${side}`}
      >
        {missing === side ? (
          <p className="ba-empty">{tp3('parts.cmp.empty')}</p>
        ) : (
          items.map((it) =>
            it.type === 'fold' && !open.has(it.index) ? (
              <button
                key={it.index}
                type="button"
                className="ba-fold"
                data-testid="ba-fold"
                onClick={() => setOpen((o) => new Set(o).add(it.index))}
              >
                {tp3('parts.cmp.linesSame', { count: it.count })}
              </button>
            ) : it.type === 'fold' ? (
              it.rows.map((r, k) => (
                <Cell
                  key={`${it.index}-${k}`}
                  row={r}
                  side={side}
                  index={it.index}
                  current={false}
                />
              ))
            ) : (
              <Cell
                key={it.index}
                row={it.row}
                side={side}
                index={it.index}
                current={it.row.change !== null && it.row.change === at}
              />
            ),
          )
        )}
      </div>
    </section>
  )

  return (
    <div
      className="ba-side"
      data-stacked={props.stacked ? '' : undefined}
      data-testid={props['data-testid'] ?? 'ba-side'}
      onKeyDown={onKey}
    >
      <div className="ba-bar">
        <span className="ba-count" aria-live="polite" data-testid="ba-count">
          {at >= 0
            ? tp3('parts.cmp.of', { n: at + 1, total: result.changes })
            : tp3('parts.cmp.changes', { count: result.changes })}
        </span>
        <button
          type="button"
          className="ba-nav"
          aria-label={tp3('parts.cmp.prev')}
          data-testid="ba-prev"
          disabled={same}
          onClick={() => go(at - 1)}
        >
          <Icon name="chevronUp" size={18} />
        </button>
        <button
          type="button"
          className="ba-nav"
          aria-label={tp3('parts.cmp.next')}
          data-testid="ba-next"
          disabled={same}
          onClick={() => go(at + 1)}
        >
          <Icon name="chevronDown" size={18} />
        </button>
      </div>
      {same && !missing ? (
        <EmptyState
          variant="inline"
          testId="ba-same"
          title={tp3('parts.cmp.same')}
          text=""
        />
      ) : (
        <div className="ba-cols">
          {col('before', props.beforeLabel, props.beforeMeta, colA, 'a')}
          {col('after', props.afterLabel, props.afterMeta, colB, 'b')}
        </div>
      )}
      {props.actions ? (
        <div className="ba-actions" data-testid="ba-actions">
          {props.actions}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Before / after view (S3-30 to S3-38): `hold` shows the original while a
 * button is held; `side` shows two copies with the changes marked.
 */
export function BeforeAfter(props: BeforeAfterProps) {
  return props.mode === 'hold' ? <Hold {...props} /> : <Side {...props} />
}
