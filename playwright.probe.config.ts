import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

/**
 * Runs by hand (the workflow "probe"): the same devices and settings as the
 * `ipad-webkit` and `chromium` projects, but only the files named in
 * PROBE_FILES (a regular expression on the path). Nothing else changes.
 *
 * PROBE (branch probe/g1-frames only): PROBE_TRACE (on/off/retain-on-failure)
 * and PROBE_DSF (device pixel ratio) change one setting each; the server is
 * started once by the workflow and reused.
 */
const files = new RegExp(process.env.PROBE_FILES ?? 'barBlurFrames')
const named = (name: string) => {
  const p = base.projects!.find((q) => q.name === name)!
  return {
    ...p,
    testMatch: [files],
    use: {
      ...p.use,
      ...(process.env.PROBE_DSF
        ? { deviceScaleFactor: Number(process.env.PROBE_DSF) }
        : {}),
    },
  }
}
export default defineConfig({
  ...base,
  retries: 0,
  use: {
    ...base.use,
    trace: (process.env.PROBE_TRACE ?? 'retain-on-failure') as
      | 'on'
      | 'off'
      | 'retain-on-failure',
  },
  webServer: { ...(base.webServer as object), reuseExistingServer: true } as never,
  projects: [named('ipad-webkit'), named('chromium')],
})
