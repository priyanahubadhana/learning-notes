/** English text of the Notebooks home (late-loaded, with enO.ts). */
import { enRobust } from './enRobust'

export const enNbh = {
  ...enRobust,
  'nbh.title': 'Notebooks',
  'nbh.new': 'New notebook',
  'nbh.layout': 'Layout',
  'nbh.layout.shelf': 'Shelf',
  'nbh.layout.list': 'List',
  'nbh.today': 'Today',
  'nbh.yesterday': 'Yesterday',
  'nbh.due': '{n} due',
  'nbh.starNamed': 'Pin {name}',
  'nbh.unstarNamed': 'Unpin {name}',
  'nbh.star': 'Pin to the top',
  'nbh.unstar': 'Unpin',
  'nbh.menu': 'Options for {name}',
  'nbh.cover.page': 'Show the first page as the cover',
  'nbh.cover.colour': 'Show a colour cover',
  'nbh.colour.next': 'Change colour',
  'nbh.blankPage': 'Empty page',
  'rvh.title': 'Review',
  'rvh.due': '{n} cards are ready to review.',
  'rvh.none': 'Nothing is due. Nice work.',
  'rvh.start': 'Start review',
  'rvh.allCards': 'All cards',
  'upd.checking': 'Checking for updates…',
  'upd.downloading': 'Downloading {loaded} / {total} MB ({pct}%)',
  'upd.downloadingStart': 'Downloading the update…',
  'upd.slow': 'slow connection, about {s} s left',
  'upd.installing': 'Installing…',
  'upd.ready': 'Update ready',
  'upd.updating': 'Restarting into the new version…',
  'upd.updated': 'Updated to version {version}',
  'upd.current': 'You have the latest version',
  'upd.offline': 'No connection',
  'upd.failed': 'The update did not finish. It will try again.',
  'settings.showRefresh.label': 'Show Refresh button in the top bar',
  'settings.showRefresh.description':
    'A Refresh button next to Back and Forward. It saves first, then restarts the app on the same page.',
  'nav.refresh': 'Refresh app',
  'sync.allOn.notice':
    'Everything now syncs, including AI keys (locked end to end, never in backups). You can change it in Settings.',
  'sync.allOn.change': 'Review',
  'history.reason.big': 'big change',
  'history.reason.leave': 'on leaving',
  'history.reason.before-restore': 'before a restore',
  'history.contains':
    'Boxes: {boxes}. Drawing: {ink}. Restoring brings back the whole page.',
  'history.inkYes': 'yes',
  'history.inkNo': 'none',
  'update.req.title': 'Update required',
  'update.req.body':
    'This update changes how your notes are stored, so it is needed to keep going. Your notes stay safe.',
  'update.req.countdown':
    'This update changes how your notes are stored. Downloading starts in {s} s. Your notes stay safe.',
  'update.req.downloading': 'Downloading the update… {pct}%',
  'update.req.paused':
    'The download was stopped. The app stays paused until it is updated.',
  'update.req.installing': 'Installing',
  'update.req.installingBody':
    'Please keep this window open. Your notes are not touched.',
  'update.req.failed':
    'The update did not finish. Check your connection and try again. Your notes are safe.',
  'update.req.failedSave':
    'Some changes are not saved yet, so the update is waiting. Your notes are safe. Try again.',
  'update.req.retry': 'Retry',
}
