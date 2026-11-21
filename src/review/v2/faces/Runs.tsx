import type { ReactNode } from 'react'
import { noteLinkProps, tagRefProps } from '../../../editor/mapping'
import type { JsonValue } from '../../../core/types'
import { t } from '../../../i18n/t'

/**
 * Read-only text of a block, as plain text nodes (never HTML). The blank
 * being asked shows as one gap; once revealed its words show in accent colour.
 */
type Run = {
  type?: string
  text?: string
  styles?: Record<string, unknown>
  content?: JsonValue
}

const asRuns = (value: JsonValue | undefined): Run[] =>
  Array.isArray(value)
    ? value.filter(
        (r): r is Run & JsonValue =>
          !!r && typeof r === 'object' && !Array.isArray(r),
      )
    : []

export function Runs({
  runs,
  hiddenBlank,
  shownBlank,
}: {
  runs: JsonValue | undefined
  hiddenBlank?: string
  shownBlank?: string
}) {
  const out: ReactNode[] = []
  let previousHidden = false
  asRuns(runs).forEach((run, i) => {
    if (run.type === 'link') {
      out.push(
        <span key={i} className="underline decoration-line underline-offset-2">
          <Runs
            runs={run.content}
            hiddenBlank={hiddenBlank}
            shownBlank={shownBlank}
          />
        </span>,
      )
      previousHidden = false
      return
    }
    if (tagRefProps(run as JsonValue)) return // tags are not shown in review
    const link = noteLinkProps(run as JsonValue)
    if (link) {
      out.push(
        <span key={i} className="note-link">
          {link.label}
        </span>,
      )
      previousHidden = false
      return
    }
    const styles = run.styles ?? {}
    const blank = typeof styles.blank === 'string' ? styles.blank : undefined
    if (blank && blank === hiddenBlank) {
      if (!previousHidden) {
        out.push(
          <span key={i} className="rv2-blank" aria-label={t('review.blank')}>
            …
          </span>,
        )
      }
      previousHidden = true
      return
    }
    previousHidden = false
    let node: ReactNode = run.text ?? ''
    if (styles.code)
      node = <code className="font-mono text-[0.9em]">{node}</code>
    if (styles.bold) node = <strong>{node}</strong>
    if (styles.italic) node = <em>{node}</em>
    if (styles.underline) node = <u>{node}</u>
    if (styles.strike) node = <s>{node}</s>
    if (blank && blank === shownBlank) {
      node = <mark className="rv2-fill">{node}</mark>
    }
    out.push(<span key={i}>{node}</span>)
  })
  return <>{out}</>
}
