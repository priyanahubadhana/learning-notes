// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { settingsRegistry } from '../builtinSettings'
import '../toolbarSettings'
import '../spaceSettings'
import '../labSettings'
import '../readingSettings'
import { getLevel, reloadLevel, setLevel, setUnlocked } from '../level'
import {
  countFor,
  EXPERIENCE_KEY,
  experienceOnTop,
  getExperience,
  reloadExperience,
  rowShown,
  setExperience,
  setExperienceOnTop,
  tagOf,
} from './experience'
import { writeVirtual, unlockId } from './virtualWrites'

beforeEach(() => {
  localStorage.clear()
  reloadLevel()
  reloadExperience()
})

describe('your experience: New, Used a little, Experienced', () => {
  it('shows everything by default (Professional, no choice)', () => {
    expect(getExperience()).toBeNull()
    expect(getLevel()).toBe('professional')
    for (const s of settingsRegistry.list()) expect(rowShown(s.id)).toBe(true)
  })

  it('New: essentials only, app view Beginner', () => {
    setExperience('new')
    expect(getLevel()).toBe('beginner')
    expect(rowShown('general.theme')).toBe(true)
    expect(rowShown('general.dateStyle')).toBe(false)
    expect(rowShown('general.reduceGlass')).toBe(false)
  })

  it('Used a little: adds the common rows, Professional rows stay off', () => {
    setExperience('little')
    expect(getLevel()).toBe('beginner')
    expect(rowShown('general.dateStyle')).toBe(true)
    expect(rowShown('general.reduceGlass')).toBe(false)
  })

  it('Experienced: Professional, every row shows', () => {
    setExperience('new')
    setExperience('expert')
    expect(getLevel()).toBe('professional')
    expect(rowShown('general.reduceGlass')).toBe(true)
  })

  it('a Professional row shows in Beginner once its own switch is on, and back off', () => {
    setExperience('new')
    expect(rowShown('general.reduceGlass')).toBe(false)
    setUnlocked('general.reduceGlass', true)
    expect(rowShown('general.reduceGlass')).toBe(true)
    expect(getLevel()).toBe('beginner')
    setUnlocked('general.reduceGlass', false)
    expect(rowShown('general.reduceGlass')).toBe(false)
  })

  it('switching the app view keeps every per-switch choice', () => {
    setLevel('beginner')
    setUnlocked('general.reduceGlass', true)
    setLevel('professional')
    setLevel('beginner')
    expect(rowShown('general.reduceGlass')).toBe(true)
  })

  it('Start new pages as always shows; its switch only widens the picker', () => {
    setExperience('new')
    expect(rowShown('general.newPageStudy')).toBe(true)
  })

  it('the counts grow from New to Experienced', () => {
    expect(countFor('new')).toBeGreaterThan(0)
    expect(countFor('little')).toBeGreaterThan(countFor('new'))
    expect(countFor('expert')).toBeGreaterThan(countFor('little'))
  })

  it('tags: unlock ids are Professional, the mock essentials are E, others common', () => {
    expect(tagOf('general.reduceGlass')).toBe('A')
    expect(tagOf('general.theme')).toBe('E')
    expect(tagOf('general.dateStyle')).toBe('C')
  })

  it('remembers the choice and the place on this device', () => {
    setExperience('little')
    setExperienceOnTop(false)
    expect(JSON.parse(localStorage.getItem(EXPERIENCE_KEY)!)).toEqual({
      choice: 'little',
      top: false,
    })
    reloadExperience()
    expect(getExperience()).toBe('little')
    expect(experienceOnTop()).toBe(false)
  })

  it('history can write the virtual ids', () => {
    expect(writeVirtual('v3:level', 'beginner')).toBe(true)
    expect(getLevel()).toBe('beginner')
    expect(writeVirtual(unlockId('general.reduceGlass'), true)).toBe(true)
    expect(rowShown('general.reduceGlass')).toBe(true)
    expect(writeVirtual('general.theme', 'night')).toBe(false)
  })
})
