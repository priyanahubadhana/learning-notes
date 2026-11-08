/**
 * English text of batch 3: the privacy lock and Reading mode. Spread into
 * `en` (en.ts); Hindi and Spanish are hi8.ts and es8.ts.
 */
export const en8 = {
  // ---- Settings categories ----
  'settings.category.lock': 'Lock',
  'settings.category.reading': 'Reading',
  'settings.lock.idle.label': 'Lock again after',
  'lock.idle.minutes_one': '{count} minute',
  'lock.idle.minutes_other': '{count} minutes',

  // ---- Lock: Settings › Lock ----
  'lock.title': 'Privacy lock',
  'lock.explain':
    'A locked page, notebook or database is hidden behind a lock screen until you unlock it. Nothing is scrambled or lost.',
  'lock.explain2':
    'This is a privacy lock, not encryption. It stops casual eyes, not an expert with access to this device or its stored data.',
  'lock.methods': 'Ways to unlock',
  'lock.pin': 'PIN',
  'lock.pin.hint': '4 to 6 digits.',
  'lock.password': 'Password',
  'lock.password.hint': 'At least {min} characters.',
  'lock.device': 'Face ID, Touch ID or Windows Hello',
  'lock.device.hint':
    "Uses this device's own lock (a passkey). It works on this device only.",
  'lock.device.unavailable':
    'This browser or device cannot do this. Use a PIN or a password.',
  'lock.device.done':
    'Device lock is on. Your PIN or password still works if it fails.',
  'lock.device.failed': 'Could not set up the device lock.',
  'lock.isSet': 'is set',
  'lock.notSet': 'is not set',
  'lock.setUp': 'Set up',
  'lock.change': 'Change',
  'lock.remove': 'Remove',
  'lock.removedMethod': 'Removed.',
  'lock.noneYet': 'Set up at least one way to unlock before you lock anything.',
  'lock.locked': 'Locked now',
  'lock.nothing': 'Nothing is locked.',
  'lock.kind.page': 'page',
  'lock.kind.notebook': 'notebook',
  'lock.kind.database': 'database',
  'lock.removeFrom': 'Remove lock',
  'lock.itemUnlocked': 'Lock removed.',
  'lock.itemLocked': 'Locked. It opens with your PIN, password or device lock.',
  'lock.removeAll': 'Remove the lock completely',
  'lock.removeAll.confirm':
    'Remove every lock and every code ({count} locked)? Your notes stay exactly as they are, and anyone with this device can read them.',
  'lock.removeAll.yes': 'Remove the lock',
  'lock.removed': 'The lock was removed. Your notes are unchanged.',
  'lock.pin.set': 'Set a PIN',
  'lock.pin.new': 'New PIN (4 to 6 digits)',
  'lock.pin.invalid': 'A PIN is 4 to 6 digits.',
  'lock.password.set': 'Set a password',
  'lock.password.new': 'New password',
  'lock.password.invalid': 'A password is at least {min} characters.',
  'lock.confirm': 'Type it again',
  'lock.mismatch': 'The two do not match.',
  'lock.saved': 'Saved. Only a scrambled fingerprint of it is kept.',

  // ---- Lock: the menus ----
  'lock.menu.lock.page': 'Lock this page',
  'lock.menu.remove.page': 'Remove lock from this page',
  'lock.menu.lock.notebook': 'Lock this notebook',
  'lock.menu.remove.notebook': 'Remove lock from this notebook',
  'lock.menu.lock.database': 'Lock this database',
  'lock.menu.remove.database': 'Remove lock from this database',
  'lock.needSetup':
    'Set up a PIN, a password or Face ID in Settings › Lock first.',
  'lock.openSettings': 'Open Settings',

  // ---- Lock: the lock screen ----
  'lock.locked.page': 'This page is locked.',
  'lock.locked.notebook': 'This notebook is locked.',
  'lock.locked.database': 'This database is locked.',
  'lock.unlock': 'Unlock',
  'lock.unlock.device': 'Unlock with this device',
  'lock.unlock.with': 'Unlock with',
  'lock.enterPin': 'Enter your PIN',
  'lock.enterPassword': 'Enter your password',
  'lock.wrong': 'That is not right. Try again.',
  'lock.wait': 'Too many tries. Wait {seconds} seconds.',
  'lock.deviceFailed':
    'The device lock did not confirm. Use your PIN or password instead.',
  'lock.forgot': 'Forgot?',
  'lock.forgot.title': 'Forgot your code?',
  'lock.forgot.what':
    'This is a privacy lock, not encryption: your notes are not scrambled and nothing is lost. If you forget your code you can clear the lock; the notes stay exactly as they are.',
  'lock.forgot.device':
    'This device has its own lock set up. Confirm with it to open this now. Then set a new PIN or password in Settings › Lock.',
  'lock.forgot.removeDevice':
    "Or remove the whole lock. This device's lock will ask you to confirm first.",
  'lock.forgot.removePlain':
    'Or remove the whole lock. Anyone who has this device can do the same, because a privacy lock cannot stop that.',
  'lock.forgot.count': 'Locked now: {count}.',
  'lock.forgot.ack':
    'I understand that every lock and code will be removed and my notes will be readable by anyone with this device.',
  'lock.forgot.remove': 'Remove the lock',
  'lock.forgot.unlocked':
    'Unlocked. Set a new PIN or password in Settings › Lock.',
  'lock.auth.title': 'Confirm it is you',
  'lock.auth.text':
    'Enter your current code, or use this device, to change the lock.',

  // ---- Reading: names of the tools ----
  'tool.readerFull': 'Full-screen reader',
  'tool.outline': 'Contents and bookmarks',
  'tool.hideBlanks': 'Self-test (hide blanks)',
  'tool.lockSettings': 'Lock settings',

  // ---- Reading: the reader and in-place reading ----
  'reading.reader': 'Reader',
  'reading.close': 'Close the reader',
  'reading.seek': 'Move through the page',
  'reading.page': 'Page {n} of {total}',
  'reading.timeLeft_one': 'about {count} min left',
  'reading.timeLeft_other': 'about {count} min left',
  'reading.timeDone': 'finished',
  'reading.lockedExit':
    'Reading is locked. Turn off "Lock to reading" in the Read tools first.',
  'reading.streak_one': '{count} day reading streak',
  'reading.streak_other': '{count} days reading streak',
  'reading.panel.look': 'Look and reading',
  'reading.panel.aloud': 'Read aloud',
  'reading.panel.outline': 'Contents and bookmarks',
  'reading.fontSample': 'The quick brown fox jumps over the lazy dog.',
  'reading.smaller': 'Smaller text',
  'reading.bigger': 'Bigger text',
  'reading.alwaysPage': 'Always open this page in Reading mode',
  'reading.alwaysNotebook': 'Always open this notebook in Reading mode',
  'reading.lockToReading': 'Lock to reading (no editing)',
  'reading.highlight': 'Highlight',
  'reading.highlighted': 'Highlighted',
  'reading.lookUp': 'Look up',
  'reading.readFromHere': 'Read from here',
  'reading.selectionBar': 'Selected text',
  'reading.outline.headings': 'Headings',
  'reading.outline.none': 'No headings on this page.',
  'reading.bookmarks': 'Bookmarks',
  'reading.bookmarkAdd': 'Add a bookmark here',
  'reading.bookmarksNone': 'No bookmarks yet.',
  'reading.bookmarkRemove': 'Remove bookmark {name}',
  'reading.bookmarkUntitled': 'Bookmark',

  // ---- Reading: read aloud ----

  // ---- Reading: Settings › Reading ----

  'reading.opt.entry.inPlace': 'The page itself',
  'reading.opt.entry.reader': 'Full-screen reader',
  'reading.opt.theme.app': 'Same as the app',
  'reading.opt.theme.day': 'Day',
  'reading.opt.theme.night': 'Night',
  'reading.opt.theme.sepia': 'Sepia',
  'reading.opt.theme.paper': 'Paper',
  'reading.opt.theme.contrast': 'Dark contrast',
  'reading.opt.font.app': 'Same as notes',
  'reading.opt.font.serif': 'Serif',
  'reading.opt.font.sans': 'Sans-serif',
  'reading.opt.font.dyslexia': 'OpenDyslexic',
  'reading.opt.size.80': '80%',
  'reading.opt.size.90': '90%',
  'reading.opt.size.100': '100%',
  'reading.opt.size.115': '115%',
  'reading.opt.size.130': '130%',
  'reading.opt.size.150': '150%',
  'reading.opt.size.175': '175%',
  'reading.opt.size.200': '200%',
  'reading.opt.size.250': '250%',
  'reading.opt.spacing.130': 'Tight',
  'reading.opt.spacing.155': 'Normal',
  'reading.opt.spacing.180': 'Relaxed',
  'reading.opt.spacing.210': 'Loose',
  'reading.opt.margin.none': 'None',
  'reading.opt.margin.small': 'Small',
  'reading.opt.margin.medium': 'Medium',
  'reading.opt.margin.large': 'Large',
  'reading.opt.width.narrow': 'Narrow',
  'reading.opt.width.medium': 'Medium',
  'reading.opt.width.wide': 'Wide',
  'reading.opt.width.full': 'Full',
  'reading.opt.flow.scroll': 'Scroll',
  'reading.opt.flow.paged': 'Pages',
  'reading.opt.ruler.off': 'Off',
  'reading.opt.ruler.focus': 'Line focus',
  'reading.opt.ruler.ruler': 'Ruler',
  'reading.opt.blanks.soft': 'Softly marked',
  'reading.opt.blanks.hide': 'Hidden (self-test)',
  'reading.opt.speed.50': '0.5×',
  'reading.opt.speed.75': '0.75×',
  'reading.opt.speed.100': '1×',
  'reading.opt.speed.125': '1.25×',
  'reading.opt.speed.150': '1.5×',
  'reading.opt.speed.175': '1.75×',
  'reading.opt.speed.200': '2×',
  'reading.opt.awake.on': 'On',
  'reading.opt.awake.off': 'Off',

  // ---- Help ----
} as const
