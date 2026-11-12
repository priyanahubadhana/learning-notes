import { execFile } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { SyncCryptoError } from '../../src/sync/crypto'
import {
  AuthError,
  emailCodeSend,
  emailCodeVerify,
  googleAuthorizeUrl,
  googleExchange,
  makePkce,
  passwordSignIn,
  saveSession,
  waitForGoogleCode,
  GOOGLE_REDIRECT,
  type Session,
} from './auth'
import { DEVICE_NAME, ensureConfig, loadConfig } from './config'
import { forgetAll, loadMaster, passphraseBundle, unlockAndStore } from './keys'
import { openSecretStore } from './secrets'
import { supabaseSource } from './source'

const say = (s: string) => process.stderr.write(s + '\n')

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

/** Reads a secret without showing it on screen. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    if (!stdin.isTTY || !stdin.setRawMode) {
      reject(
        new Error(
          'Run setup in a normal terminal window (it needs to hide what you type).',
        ),
      )
      return
    }
    process.stderr.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let text = ''
    const onData = (raw: string) => {
      // Pasted text may arrive with bracketed-paste markers; drop them.
      // eslint-disable-next-line no-control-regex -- the escape character is the point
      const chunk = raw.replace(/\u001b\[20[01]~/g, '')
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stderr.write('\n')
          resolve(text)
          return
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false)
          process.exit(130)
        }
        if (ch === '\u007f' || ch === '\b') {
          if (text.length > 0) process.stderr.write('\b \b')
          text = text.slice(0, -1)
        } else if (ch >= ' ') {
          // Show one * per key so you can see typing and pasting work.
          text += ch
          process.stderr.write('*')
        }
      }
    }
    stdin.on('data', onData)
  })
}

function openBrowser(url: string) {
  if (process.platform !== 'win32') return
  execFile('rundll32', ['url.dll,FileProtocolHandler', url], () => undefined)
}

async function signIn(mode: string): Promise<Session> {
  if (mode === 'google') {
    const { verifier, challenge } = makePkce()
    const url = googleAuthorizeUrl(challenge)
    say('\nOpening your browser to sign in with Google.')
    say(`If it does not open, copy this address into your browser:\n${url}\n`)
    say(
      `(One-time: the address ${GOOGLE_REDIRECT} must be in Supabase > Authentication > URL configuration > Redirect URLs.)`,
    )
    const wait = waitForGoogleCode()
    openBrowser(url)
    return googleExchange(await wait, verifier)
  }
  if (mode === 'password') {
    return passwordSignIn(await askHidden('Account password: '))
  }
  say('\nSending a 6-digit code to your Learning Notes email...')
  await emailCodeSend()
  say('Check your email.')
  return emailCodeVerify(await ask('Type the code here: '))
}

/** `setup`: sign in, unlock the key, keep it in the vault. */
export async function runSetup(args: string[]): Promise<void> {
  const store = await openSecretStore()
  say(`Secrets will be kept in: ${store.kind}.`)
  const mode = args.includes('--google')
    ? 'google'
    : args.includes('--password')
      ? 'password'
      : 'email'
  try {
    const session = await signIn(mode)
    say(`Signed in as ${session.email}.`)
    const bundles = await supabaseSource(
      async () => session.access,
    ).keyBundles()
    const bundle = passphraseBundle(bundles)
    if (!bundle)
      throw new AuthError(
        'No passphrase key found. Open the app and finish sync setup first.',
      )
    let ok = false
    for (let tries = 0; tries < 3 && !ok; tries++) {
      const pass = await askHidden('Your sync passphrase: ')
      try {
        await unlockAndStore(store, bundle, pass)
        ok = true
      } catch (e) {
        if (!(e instanceof SyncCryptoError)) throw e
        say('That passphrase did not unlock the key. Try again.')
      }
    }
    if (!ok) throw new AuthError('Three wrong passphrases. Run setup again.')
    await saveSession(store, session)
    // List this sign-in as its own device in the app, so it can be revoked there.
    const config = loadConfig()
    await supabaseSource(async () => session.access).register(
      config.deviceId,
      DEVICE_NAME,
    )
    say(
      `Listed in the app as "${DEVICE_NAME}" (${config.deviceId}); revoke it in Settings > Account > Connected computers.`,
    )
    say(
      `What Claude may do is in ${ensureConfig()} (everything is on by default).`,
    )
    say(
      '\nDone. The key is saved on this PC only. Now add the connector to Claude Desktop (see docs/features/claude-connector.md).',
    )
  } catch (e) {
    say(
      `\nSetup stopped: ${e instanceof Error ? e.message : 'unknown problem'}`,
    )
    process.exitCode = 1
  }
}

export async function runStatus(): Promise<void> {
  const store = await openSecretStore()
  const key = await loadMaster(store)
  const session = await store.get('refresh')
  say(`Secret store: ${store.kind}`)
  say(
    `Key: ${key ? 'saved' : 'missing'}   Sign-in: ${session ? 'saved' : 'missing'}`,
  )
  const config = loadConfig()
  say(`Device: ${config.deviceId}`)
  say(
    `Allowed: ${
      Object.entries(config.scopes)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ') || 'nothing'
    }`,
  )
  for (const p of config.problems) say(p)
  if (!key || !session) process.exitCode = 1
}

export async function runLogout(): Promise<void> {
  await forgetAll(await openSecretStore())
  say(
    'Forgot the key and sign-in on this PC. (To cut off this PC for good, also use Revoke in the app: Settings > Account > Connected computers.)',
  )
}
