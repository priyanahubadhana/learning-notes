// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openPage, addPage, typeInEditor } from './helpers.ts'
import {
  enterCode,
  lockScreen,
  lockThisPage,
  openLockSettings,
  setCode,
  storedSettingsJson,
} from './lockHelpers.ts'

/**
 * Batch 3: Face ID / Touch ID / Windows Hello through a WebAuthn platform
 * passkey (userVerification "required"). Chromium has a virtual
 * authenticator that plays the device lock; Safari has none, so the real
 * iPad check is on the owner list.
 */

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'the virtual authenticator exists in Chromium only',
)

const SECRET = 'only the device may open this'

async function deviceLock(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: false,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  )
  return {
    /** The person fails (or passes) the face / finger check. */
    verify: (ok: boolean) =>
      cdp.send('WebAuthn.setUserVerified', {
        authenticatorId,
        isUserVerified: ok,
      }),
  }
}

async function start(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Diary', 'Open page')
  await addPage(page, 'Diary', 'Private page')
  await typeInEditor(page, SECRET)
}

async function setUpDevice(page: Page) {
  await openLockSettings(page)
  const row = page.getByTestId('method-Face ID, Touch ID or Windows Hello')
  await row.getByRole('button', { name: 'Set up' }).click()
  await expect(row).toContainText('is set')
}

test('setting up the device lock keeps only a credential id on this device', async ({
  page,
}) => {
  const device = await deviceLock(page)
  await device.verify(true)
  await start(page)
  await setUpDevice(page)
  const id = await page.evaluate(() =>
    localStorage.getItem('learning-notes:lock.credentialId'),
  )
  expect(id).toBeTruthy()
  // The notes database holds no passkey data at all.
  expect(await storedSettingsJson(page)).not.toContain(JSON.parse(id!))
})

test('with only the device lock set up, a locked page opens with the device check', async ({
  page,
}) => {
  const device = await deviceLock(page)
  await device.verify(true)
  await start(page)
  await setUpDevice(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await expect(lockScreen(page).locator('#unlock-code')).toHaveCount(0)
  await page.getByTestId('unlock-device').click()
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
})

test('if the device check fails, an error shows and the PIN still works', async ({
  page,
}) => {
  const device = await deviceLock(page)
  await device.verify(true)
  await start(page)
  await setUpDevice(page)
  await setCode(page, 'PIN', '4821', 'device')
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await device.verify(false)
  await page.getByTestId('unlock-device').click()
  await expect(lockScreen(page).getByRole('alert')).toContainText(
    'refused at once',
  )
  await expect(page.locator('.bn-editor')).toHaveCount(0)
  await enterCode(page, '4821')
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
})

test('Forgot with a device lock: the device check opens the page, and removing the lock needs it too', async ({
  page,
}) => {
  const device = await deviceLock(page)
  await device.verify(true)
  await start(page)
  await setUpDevice(page)
  await openPage(page, 'Private page')
  await lockThisPage(page)
  await lockScreen(page).getByRole('button', { name: 'Forgot?' }).click()
  const dialog = page.getByTestId('forgot-dialog')
  await expect(dialog).toContainText('This device has its own lock set up')
  // A failed check does not remove anything.
  await device.verify(false)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Remove the lock' }).click()
  await expect(dialog.getByRole('alert')).toContainText('refused at once')
  // A good check opens the page.
  await device.verify(true)
  await dialog.getByRole('button', { name: 'Unlock with this device' }).click()
  await expect(page.locator('.bn-editor')).toContainText(SECRET)
})
