import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

/**
 * Runs by hand (the workflow "probe"): the same devices and settings as the
 * `ipad-webkit` and `chromium` projects, but only the files named in
 * PROBE_FILES (a regular expression on the path). Nothing else changes.
 */
const files = new RegExp(process.env.PROBE_FILES ?? 'barBlurFrames')
const named = (name: string) => {
  const p = base.projects!.find((q) => q.name === name)!
  return { ...p, testMatch: [files] }
}
export default defineConfig({
  ...base,
  retries: 0,
  projects: [named('ipad-webkit'), named('chromium')],
})
