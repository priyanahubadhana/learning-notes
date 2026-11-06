/** English text of Sync (Phase L). Spanish and Hindi come with the K2 review. */
export const enSync = {
  'settings.category.sync': 'Sync',
  'settings.category.sync.hint':
    'Keep your notes the same on your iPad and PC, locked so only you can read them.',
  'sync.title': 'Sync',
  'sync.intro':
    'Your notes are locked on this device before they leave it. The server and Google Drive only ever hold locked copies. Notes on this device are never removed by signing in or out.',
  'sync.signIn': 'Sign in with Google',
  'sync.signedInAs': 'Signed in as {email}',
  'sync.signOut': 'Sign out on this device',
  'sync.signOutForget': 'Sign out and forget the key here',
  'sync.setupTitle': 'Choose your sync passphrase',
  'sync.setupHelp':
    'It unlocks your notes on a new device. Use four or more words you will remember, for example a short sentence. It is never sent anywhere.',
  'sync.passphrase': 'Passphrase',
  'sync.passphraseAgain': 'Type it again',
  'sync.tooShort': 'Use at least 12 letters.',
  'sync.tooSimple': 'Add another word or two.',
  'sync.noMatch': 'The two do not match.',
  'sync.create': 'Lock my notes and start',
  'sync.working': 'Working… (this takes a few seconds)',
  'sync.codeTitle': 'Your printed recovery code',
  'sync.codeHelp':
    'If you forget the passphrase, this code is the only other way in. Print it or write it down and keep it somewhere safe, away from the iPad. Without the passphrase and this code, nobody (not even you) can open the notes.',
  'sync.print': 'Print',
  'sync.codeCheck':
    'Type the last four letters of the code to confirm you saved it',
  'sync.codeDone': 'I saved it',
  'sync.codeWrong': 'Those are not the last four letters.',
  'sync.unlockTitle': 'Unlock your notes on this device',
  'sync.unlockHelp':
    'Type your sync passphrase, or the printed recovery code. The notes already on this device stay and are added to the others.',
  'sync.unlock': 'Unlock',
  'sync.wrongSecret':
    'That does not open the notes. Check the passphrase or code.',
  'sync.ready': 'Sync is on.',
  'sync.syncing': 'Syncing…',
  'sync.syncNow': 'Sync now',
  'sync.last': 'Last synced {time}',
  'sync.never': 'Not synced yet',
  'sync.offline':
    'Could not reach the server. Your notes are safe here; sync tries again soon.',
  'sync.notAllowed':
    'This account is not allowed. Only the owner’s Google account can sync.',
  'sync.unreadable':
    'Some synced items could not be opened (another key, or damaged). They were skipped.',
  'sync.clock':
    'Another device’s clock looks wrong (far in the future). Check the date and time there.',
  'sync.failed': 'Sync stopped with an error. Your notes are safe here.',
  'sync.driveTap':
    'Google Drive needs a tap to reconnect (pictures and the spare key wait until then).',
  'sync.reconnectDrive': 'Reconnect Drive',
  'sync.merged_one':
    '{count} page was changed on two devices. The other version is in that page’s History.',
  'sync.merged_other':
    '{count} pages were changed on two devices. The other versions are in their History.',
  'sync.ok': 'OK',
  'sync.privacy':
    'What the server can still see: when you sync, how many items and how big they are. Not the text, titles, tags or pictures.',
  'sync.testTitle': 'Check this device',
  'sync.testHelp':
    'Times the passphrase lock (Argon2id) and checks the browser’s locking tools. Nothing is sent.',
  'sync.testRun': 'Run check',
  'sync.testResult':
    'Lock time {ms} ms · Web Crypto {crypto} · Storage kept {persist}',
  'sync.yes': 'yes',
  'sync.no': 'no',
} as const
