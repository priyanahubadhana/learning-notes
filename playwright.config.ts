import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright end-to-end tests: a real browser clicks through the app.
 * Each test gets a fresh browser context, so its IndexedDB starts empty.
 * Run with `npm run test:e2e`. The tests use the built app under the live
 * site's security rules, so they check what users actually get.
 */
const PORT = Number(process.env.PW_PORT ?? 5199)
/** GitHub's machine has 2 cores, so it gets longer limits. */
const SLOW = process.env.CI ? 2 : 1

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000 * SLOW,
  expect: { timeout: 5_000 * SLOW },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1, // a test that passes on retry is reported as flaky
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The device picker (first start) is answered already, so it does not
    // cover every test; devicePicker.spec.ts starts without this.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [
            { name: 'learning-notes:devicePicker.done', value: 'true' },
            // Polish 2: the welcome and the first-use tips are answered already;
            // firstUse.spec.ts and welcome.spec.ts start without these.
            { name: 'learning-notes:onboarding.done', value: 'true' },
            { name: 'learning-notes:toolbar.lastToolOffered', value: 'true' },
            // Q3a: the sign-in gate (read-only until signed in) is off; accountGate.spec.ts turns it on.
            { name: 'learning-notes:accountGate.off', value: '1' },
            {
              name: 'learning-notes:firstUse.seen',
              value: '["lasso","writePad","layers","paperBox"]',
            },
            // Most specs open a notebook's tabs by tapping it (R6-12).
            { name: 'learning-notes:general.pasteMode', value: '"keep"' },
            {
              name: 'learning-notes:general.openNotebookAt',
              value: '"tabs"',
            },
          ],
        },
      ],
    },
    actionTimeout: 10_000 * SLOW, // a stuck click names itself
    serviceWorkers: 'block', // offline.spec.ts turns it on
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /visual\//,
      use: {
        ...devices['Desktop Chrome'],
        // 56 px wider than before: the strip of spaces takes that much.
        viewport: { width: 1336, height: 720 },
      },
    },
    {
      name: 'webkit',
      testIgnore: /visual\//,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1336, height: 720 },
      },
      expect: { timeout: 15_000 }, // WebKit starts the app more slowly
    },
    {
      // Stand-in for the owner's iPad: WebKit, touch, iPad size. Only the
      // Pencil/Scribble/keyboard specs of Phase A run here (CI time).
      name: 'ipad-webkit',
      testIgnore: /visual\//,
      testMatch: [
        /parts-gallery/,
        /pencilIsolation/,
        /storageSafety.spec/,
        /updateV2/,
        /security-m1-/,
        /chromeIsolation/,
        /penTapChrome/,
        /ipadKeyboard/,
        /inkLayers/,
        /penSelect/,
        /penTapRules/,
        /ownSelection/,
        /fingerAfterPen/,
        /lassoUniversal/,
        /miniBar/,
        /miniKeys/,
        /rowActions/,
        /nameSheet/,
        /toggles/,
        /pencilFriction/,
        /writePad/,
        /lassoPencil/,
        /magnifier/,
        /aiPicker/,
        /openNotebook/,
        /startSpeed/,
        /startSeeding/,
        /tryNewFeatures/,
        /libraryV2/,
        /foundationInput/,
        /stripGear/,
        /foundationSelectionOverlay/,
        /barFixes/,
        /pencilTaps/,
        /boxPills/,
        /microBar/,
        /tableGap/,
        /holdMenu/,
        /boxTaps/,
        /paperPage/,
        /paperInk/,
        /paperHint/,
        /paperStyle/,
        /pillFloat/,
        /toolBand/,
        /pencilOffer/,
        /lassoWords/,
        /gestureWatchdog/,
        /lockToastStill/,
        /editToolbar/,
        /toolSearchSections/,
        /pinnedTools/,
        /barScroll/,
        /firstUse/,
        /pillScroll/,
        /lastTool/,
        /favourites/,
        /cardFromInk/,
        /welcome/,
        /emptyStates2/,
        /lassoMenuOrder/,
        /handwritingChooser/,
        /autoUpdate/,
        /paperBudget/,
        /inkScrollNative/,
        /paperSearchJump/,
        /paperPhone/,
        /paperExport/,
        /tools-machine/,
        /lassoLoops/,
        /toolsEditLock/,
        /toolsFlags/,
        /toolsHealth/,
        /toolsRefresh/,
        /resume/,
        /ownerLasso/,
        /ownerPlacement/,
        /undoHistory/,
        /gridRow/,
        /penUi/,
        /layoutAssist/,
        /textTool/,
        /textBoxFree/,
        /homeV2/,
        /scrollFrame/,
        /staySignedIn/,
        /freezeWatch/,
        /searchClose/,
        /settingsV3SearchF9/,
        // Paste needs the clipboard-write permission, which WebKit does not have: chromium only.
        /toolbarV8(Bar|Frame|Pen|Row|Tools).spec/,
      ],
      use: { ...devices['iPad Pro 11'], hasTouch: true },
      expect: { timeout: 15_000 },
      timeout: 60_000,
    },
    {
      // Pictures of the main screens (e2e/visual), one folder per operating
      // system. Not part of normal runs: `npm run test:visual`.
      name: 'visual',
      testDir: './e2e/visual',
      testMatch: /screens\.spec\.ts/,
      retries: 0,
      snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { E2E: '1' },
  },
})
