/**
 * English text of audio recording (record while writing, the Audio list in
 * the left panel). Hindi and Spanish are hi13.ts and es13.ts (machine
 * drafts: mark for native review).
 */
export const en13 = {
  'tool.audioPanel': 'Audio list',
  'audio.defaultName': 'Recording',
  'audio.panel.title': 'Audio',
  'audio.panel.close': 'Close the audio list',
  'audio.panel.open': 'Open the audio list',
  'audio.record': 'Record',
  'audio.stop': 'Stop',
  'audio.stopLabel': 'Stop recording',
  'audio.recording': 'Recording',
  'audio.recordHint':
    'The sound is saved on this device only, inside this page.',
  'audio.list.empty':
    'No recordings on this page yet. Tap Record while you write.',
  'audio.needsPage': 'Open a page first, then record.',
  'audio.otherPage': 'Recording another page',
  'audio.play': 'Play',
  'audio.playing': 'Playing “{name}”',
  'audio.delete': 'Delete',
  'audio.deleted': 'Recording deleted.',
  'audio.undo': 'Undo',
  'audio.deletedTitle': 'Deleted recordings ({count})',
  'audio.restore': 'Restore',
  'audio.deleteForever': 'Delete forever',
  'audio.forever.title': 'Delete this recording forever?',
  'audio.forever.message':
    'The sound is erased from this device and cannot be brought back.',
  'audio.forever.confirm': 'Delete forever',
  'audio.saved': 'Recording saved to this page.',
  'audio.saveFailed':
    'The recording could not be saved (the device may be full).',
  'audio.empty': 'Nothing was recorded.',
  'audio.error': 'The recording stopped because of an error.',
  'audio.limit': 'The recording reached 3 hours and was stopped and saved.',
  'audio.unsupported': 'This browser cannot record sound.',
  'audio.denied':
    'The microphone is not allowed. Allow it for this app in the browser or device settings, then try again.',
  'audio.noMic': 'No microphone was found.',
  'audio.busy': 'A recording is already running.',
  'audio.failed': 'The recording could not start.',
  'audio.cantPlay': 'This recording could not be played here.',
  'audio.elsewhere': 'Recording another page. Tap Stop to save it.',
} as const
