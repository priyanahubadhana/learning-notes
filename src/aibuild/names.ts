import type { StagedRecord } from '../aitools/jobs/jobTypes'
import { t, type MessageKey } from '../i18n/t'

/** The tool's name and one-line help, in the app's language. */
export const toolName = (id: string) => t(`aifw.tool.${id}.name` as MessageKey)
export const toolDesc = (id: string) => t(`aifw.tool.${id}.desc` as MessageKey)

/**
 * What the job makes or changes, for the Preview list: the kind in plain
 * words ("New notebook: Habits", "New page: Habits"), each line once.
 */
export function previewLines(records: readonly StagedRecord[]): string[] {
  const out: string[] = []
  for (const r of records) {
    if (r.table !== 'notebooks' && r.table !== 'pages') continue
    const title = r.value.title
    if (typeof title !== 'string' || !title) continue
    const kind = r.table === 'notebooks' ? 'Notebook' : 'Page'
    const key = `aifw.preview.${r.baseRev ? 'edit' : 'new'}${kind}` as MessageKey
    const line = t(key, { title })
    if (!out.includes(line)) out.push(line)
  }
  return out
}
