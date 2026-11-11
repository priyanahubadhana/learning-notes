/** English text of sign-in methods and Connected accounts. Spanish and Hindi drafts: esAccounts.ts, hiAccounts.ts. */
export const enAccounts = {
  'signin.title': 'Sign in or create an account',
  'signin.help':
    'One account keeps your notes on all your devices. After the first time, this device stays signed in, even offline.',
  'signin.codeBtn': 'Email me a code',
  'signin.codeBtnHelp': 'No password. We send a 6-digit code.',
  'signin.passBtn': 'Email and password',
  'signin.passBtnHelp': 'Create an account or sign in.',
  'signin.email': 'Email',
  'signin.sendCode': 'Send code',
  'signin.codeSent':
    'We sent a 6-digit code to {email}. It works for one hour. Check spam if it does not arrive.',
  'signin.code': '6-digit code',
  'signin.verify': 'Continue',
  'signin.resend': 'Send a new code',
  'signin.password': 'Password',
  'signin.newPassword': 'New password',
  'signin.passHelp':
    'At least 15 characters. A short sentence works well. No other rules.',
  'signin.tabIn': 'Sign in',
  'signin.tabUp': 'Create account',
  'signin.forgot': 'Forgot password?',
  'signin.create': 'Create account',
  'signin.resetSend': 'Email me a reset code',
  'signin.resetGo': 'Set new password',
  'signin.resetHelp': 'We will email a 6-digit code to reset your password.',
  'signin.confirmSent':
    'We emailed a 6-digit code to {email} to confirm it. Enter it below.',
  'signin.back': 'Back',
  'signin.busy': 'Working…',
  'signin.pass.short': 'Use at least 15 characters.',
  'signin.pass.long': 'Use at most 128 characters.',
  'signin.err.invalid':
    'That did not work. Check the code or password and try again. A code works for one hour.',
  'signin.err.badEmail': 'That email address does not look right.',
  'signin.err.weak': 'Choose a longer password (15 or more characters).',
  'signin.err.exists': 'This email already has an account. Sign in instead.',
  'signin.err.mail':
    'The email service refused to send the code. Try again in a minute.',
  'signin.err.limit': 'Too many tries. Wait a minute and try again.',
  'signin.err.later':
    'Could not reach the server, or too many tries. Check your connection, wait a minute and try again.',
  'signin.err.refused':
    'This email cannot be used yet. The app is in private testing.',
  'signin.err.failed': 'Something went wrong. Try again.',
  'connected.title': 'Connected accounts',
  'connected.help': 'The ways you can sign in. You always keep at least one.',
  'connected.google': 'Google',
  'connected.googleOn': 'Signs in with {email}',
  'connected.googleOff': 'Not connected',
  'connected.code': 'Email code',
  'connected.codeOn': 'A 6-digit code sent to {email}',
  'connected.codeOff': 'Not connected',
  'connected.password': 'Password',
  'connected.passwordOn':
    'Set for {email}. A password can be changed, not removed.',
  'connected.passwordOff': 'Not set',
  'connected.addPassword': 'Add a password',
  'connected.changePassword': 'Change password',
  'connected.savePassword': 'Save password',
  'connected.passwordSaved': 'Password saved.',
  'connected.connect': 'Connect',
  'connected.disconnect': 'Disconnect',
  'connected.confirm':
    'Disconnect {name}? You will no longer be able to sign in that way.',
  'connected.confirmGo': 'Disconnect',
  'connected.onlyOne': 'This is your only sign-in method.',
  'connected.linkFailed':
    'Could not connect Google. It may already belong to another account.',
  'connected.unlinkFailed': 'Could not disconnect. Try again.',
  'connected.loading': 'Loading…',
  'connected.loadFailed': 'Could not load your sign-in methods.',
  'gate.banner': 'Sign in to keep editing and sync your notes',
  'gate.signIn': 'Sign in',
  'gate.sheet.title': 'Sign in to keep editing',
  'gate.sheet.help':
    'Your notes are safe on this device. You can still read, search and export them. Sign in to edit again and to sync.',
  'gate.sheet.offline':
    'You are offline. Reading, search and export still work. Sign in when you are back online.',
  'gate.sheet.later': 'Not now',
  'gate.pageBar': 'Read-only until you sign in',
} as const
