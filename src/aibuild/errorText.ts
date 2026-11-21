import { t, type MessageKey } from '../i18n/t'

/**
 * The runner and the stage functions write their reasons in English (they are
 * also what Claude reads through the connector). The Build screen shows them
 * in the person's language by looking the sentence up here. A sentence that is
 * not in the table (for example an exact-path error from a pasted answer) is
 * shown as it is. `errorText.test.ts` checks that every sentence in the source
 * has an entry, so a new one cannot ship untranslated.
 */
export const STEP_TEXTS: Readonly<Record<string, MessageKey>> = {
  'That tool is not available.': 'aifw.err.toolGone',
  'The content does not fit this step.': 'aifw.err.content',
  'Something went wrong while preparing this step.': 'aifw.err.prepare',
  'The connection failed.': 'aifw.err.connection',
  'The content did not fit this step, even after a second try.':
    'aifw.err.content2',
  'The step took too long.': 'aifw.err.slow',
  'An earlier step gave no result for this one.': 'aifw.err.noResult',
  'The notebook changed since it was read.': 'aifw.err.staleNotebook',
  'The page changed since it was read.': 'aifw.err.stalePage',
  'The page text is missing.': 'aifw.err.pageText',
  'The cards are missing.': 'aifw.err.cards',
  'The database is missing.': 'aifw.err.database',
  'A tab colour needs a page.': 'aifw.err.tabColour',
  'The edits are missing.': 'aifw.err.edits',
  'The block to replace is gone.': 'aifw.err.blockGone',
  'Could not build the block.': 'aifw.err.buildBlock',
  'The block to insert after is gone.': 'aifw.err.afterGone',
  'The parent block is gone.': 'aifw.err.parentBlockGone',
  'A job can make at most 1,000 records.': 'aifw.err.tooMany',
  'The notebook is gone.': 'aifw.err.goneNotebook',
  'The page is gone.': 'aifw.err.gonePage',
  'The parent page is gone.': 'aifw.err.goneParent',
  'This step cannot be prepared here.': 'aifw.err.noStage',
  'The tab is gone.': 'aifw.err.goneTab',
  'This notebook has no tabs.': 'aifw.err.noTabs',
  'The summary is missing.': 'aifw.err.summaryMissing',
  'A summary belongs on a top-level page.': 'aifw.err.summaryTop',
  'This notebook is locked.': 'aifw.err.lockNotebook',
  'This page is locked.': 'aifw.err.lockPage',
  'The block is gone.': 'aifw.err.goneBlock',
  'The card is gone.': 'aifw.err.goneCard',
  'The database is gone.': 'aifw.err.goneDatabase',
  'The outline is missing.': 'aifw.err.outlineMissing',
  'This block is not a mind map.': 'aifw.err.notMindMap',
  'The Study tracker cannot be renamed.': 'aifw.err.studyRename',
  'This database is locked.': 'aifw.err.lockDatabase',
  'The tag is gone.': 'aifw.err.goneTag',
  'The tag name is missing.': 'aifw.err.tagName',
  'That tag name is already used here.': 'aifw.err.tagTaken',
  // Spend refusals (the model filler; no paid call is ever made at a limit of 0)
  'The spend limit is ₹0, so no paid model was used.': 'aifw.err.spendZero',
  'This would pass the monthly spend limit, so it was not sent.':
    'aifw.err.spendMonthly',
  'This job would cost more than the limit for one job.': 'aifw.err.spendJob',
  'This costs money and needs your OK first.': 'aifw.err.spendAsk',
  'The cost passed the estimate, so the job paused.': 'aifw.err.spendPause',
  // Job notices
  'Stopped. Nothing was written.': 'aifw.notice.stopped',
  'There was nothing to write.': 'aifw.notice.nothing',
  'Some steps were skipped.': 'aifw.notice.skipped',
  'A page changed after this was prepared. Nothing was written. Prepare it again to see the new result.':
    'aifw.notice.changed',
  'Could not save. Nothing was written.': 'aifw.notice.save',
  'Saving was interrupted. Nothing was written.': 'aifw.notice.interrupted',
  'Waiting for a connection.': 'aifw.notice.offline',
}

/** `The ${what} is gone.` for the things a step can look for. */
const GONE: Readonly<Record<string, MessageKey>> = {
  notebook: 'aifw.err.goneNotebook',
  page: 'aifw.err.gonePage',
  'parent page': 'aifw.err.goneParent',
}

/** A step error or job notice in the app's language. */
export function stepErrorText(message: string): string {
  const key = STEP_TEXTS[message]
  if (key) return t(key)
  const gone = /^The (notebook|page|parent page) is gone\.$/.exec(message)
  if (gone) return t(GONE[gone[1]])
  if (/^No stage for /.test(message)) return t('aifw.err.noStage')
  return message
}
