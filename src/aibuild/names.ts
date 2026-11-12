import type { StagedRecord } from '../aitools/jobs/jobTypes'
import { t, type MessageKey } from '../i18n/t'

/** The tool's name and one-line help, in the app's language. */
export const toolName = (id: string) => t(`aifw.tool.${id}.name` as MessageKey)
export const toolDesc = (id: string) => t(`aifw.tool.${id}.desc` as MessageKey)

/** Titles of what the job makes or changes, for the Preview list. */
export function previewLines(records: readonly StagedRecord[]): string[] {
  const out: string[] = []
  for (const r of records) {
    if (r.table !== 'notebooks' && r.table !== 'pages') continue
    const title = r.value.title
    if (typeof title !== 'string' || !title) continue
    out.push(t(r.baseRev ? 'aifw.preview.edit' : 'aifw.preview.new', { title }))
  }
  return out
}
