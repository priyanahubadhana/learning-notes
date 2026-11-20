// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test as base, createBdd } from 'playwright-bdd'
import type { Box } from './geometry.ts'

/** What one scenario remembers between its sentences. */
export interface World {
  /** The drawings' boxes on the page, in the order they were drawn. */
  drawings: Box[]
  /** The text box's words, when the scenario has some. */
  words: string
  /** The strokes as saved before the sentence under test. */
  before: number[][]
  /** Where the selection's box was (client px) before the sentence under test. */
  box: Box | null
}

/**
 * SC-02: every scenario gets one `world`. Steps are shared by all features
 * (e2e/steps/*.ts); a sentence has exactly one step.
 */
export const test = base.extend<{ world: World }>({
  // eslint-disable-next-line no-empty-pattern
  world: async ({}, provide) => {
    await provide({ drawings: [], words: '', before: [], box: null })
  },
})

export const { Given, When, Then } = createBdd(test)
