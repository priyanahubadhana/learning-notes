/**
 * English text of polish pass 1 (help tips for Home, the readers, the
 * picture editor and Audio). Hindi and Spanish are hiW5p.ts and esW5p.ts
 * (machine drafts: mark for native review).
 */
export const enW5p = {
  // ---- Help tips (item 1) ----
  // ---- Row actions by touch (item 2) ----
  'library.cardMenu': 'More actions',
  'library.openNotes': 'Open notes page',
  // ---- Large data (item 5) ----
  'home.completed.older': 'Show older',
  // ---- Big files (item 6) ----
  'library.saving': 'Saving {name}…',
  'library.bigFile': 'Big files may not open on iPad. Importing it anyway.',
  // ---- AI results: preview, keep, remove (item 7) ----
  'ai.previewTitle': 'Check the AI result',
  'ai.previewSummary': 'Summary from your AI',
  'ai.previewKeyPoints': 'Key points from your AI',
  'ai.previewHelp':
    'Nothing is added until you press Add to page. You can edit the text first.',
  'ai.previewText': 'AI text',
  'ai.previewEdit': 'Edit first',
  'ai.previewApply': 'Add to page',
  'capture.keepAi': 'Keep as mine',
  'capture.keepAiDone': 'Kept as yours. It is no longer marked as AI-made.',
  // ---- Empty screens (item 8) ----
  'empty.decks.action': 'Make your first deck',
  'empty.library.action': 'Import your first book',
  'empty.tasks.action': 'Add a task',
  'empty.routines':
    'No habits yet. Start with one small habit for your morning.',
  'empty.routines.action': 'Add a habit',
  'empty.audio.action': 'Record now',
  // ---- Kinder defaults (item 10) ----
  'settings.newPerDay.minutes': 'About {minutes} min a day at your pace.',
  // ---- Offline and refused (item 11) ----
  'embed.copyLink': 'Copy link',
  'embed.linkCopied': 'Link copied.',
  'file.notHere': 'File not on this device.',
  'file.notHereSync': 'If Sync is on, it can arrive after the next sync.',
  'camera.refused':
    'The camera is off for this site. On iPad: Settings › Safari › Camera, then choose Ask or Allow.',
  // ---- Sync status (item 12) ----
  'sync.state.synced': 'Synced',
  'sync.state.syncedAt': 'Synced {time}',
  'sync.state.syncing': 'Syncing',
  'sync.state.offline': 'Offline',
  'sync.state.attention': 'Needs attention',
  'sync.signInAgain': 'Please sign in again. Your notes are safe here.',
  'sync.driveFull':
    'Google Drive is full, so pictures and files wait. Free some space in Drive.',
  'sync.busy': 'The server is busy. Sync tries again by itself.',
  'sync.needCode':
    'Your recovery code is needed to open the synced data on this device.',
  // ---- Screen reader (item 13) ----
  'home.timer.started': 'Timer started',
  'home.timer.stopped': 'Timer stopped',
} as const
