import { enSettingsSync } from './enSettingsSync'
import { enAccounts } from './enAccounts'
/** English text of Sync (Phase L). Spanish and Hindi drafts: esSync.ts, hiSync.ts. */
export const enSync = {
  'settings.category.sync': 'Sync',
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
  'sync.driveKept': 'Drive: stays connected',
  'sync.driveWillAsk': 'Drive: will ask to reconnect (tap to fix)',
  'sync.driveSetUp': 'Set up lasting connection',
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
  'update.splash': 'Updating…',
  'sync.ended.title': 'You were signed out',
  'sync.ended.text':
    'Sign in to continue. Your account was signed out from another device. Your notes are safe on this device and hidden until you sign in.',
  'sync.ended.signIn': 'Sign in to continue',
  'sync.ended.fresh': 'Start fresh on this device',
  'sync.fresh.title': 'Start fresh on this device?',
  'sync.fresh.text':
    'This saves one last backup file, then removes all notes from this device and opens a new, empty app. Notes already in your cloud account are not touched.',
  'sync.fresh.unsent_one':
    '{count} change on this device was never sent to the cloud. It will only exist in the backup file.',
  'sync.fresh.unsent_other':
    '{count} changes on this device were never sent to the cloud. They will only exist in the backup file.',
  'sync.fresh.none':
    'Every change on this device was already sent to the cloud.',
  'sync.fresh.go': 'Save backup and start fresh',
  'sync.fresh.working': 'Saving the backup…',
  'sync.fresh.back': 'Go back',
  'sync.fresh.error':
    'Could not finish. Close other windows of the app and try again. Check that the backup file was saved.',
  'sync.choice.title': 'Changes on this device and in the cloud',
  'sync.choice.text':
    'While you were signed out, this device has changes the cloud does not have.',
  'sync.choice.here': 'Changed on this device: {n}.',
  'sync.choice.there': 'Changed in the cloud: {n}.',
  'sync.choice.pages_one': '{count} page',
  'sync.choice.pages_other': '{count} pages',
  'sync.choice.nothing': 'nothing',
  'sync.choice.items_one': '{count} item',
  'sync.choice.items_other': '{count} items',
  'sync.choice.safe':
    'Nothing is deleted: the version you do not pick is kept in the page’s History.',
  'sync.choice.merge': 'Merge both',
  'sync.choice.mergeHelp':
    'Keeps both. Where the same line differs you can choose Keep both.',
  'sync.choice.useHere': 'Use this device’s version',
  'sync.choice.hereHelp': 'The cloud version goes to History.',
  'sync.choice.useThere': 'Use the cloud version',
  'sync.choice.thereHelp': 'This device’s version goes to History.',
  ...enAccounts,
  ...enSettingsSync,
} as const
