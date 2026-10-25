/**
 * Study-day helpers. All stored times are UTC milliseconds; "days" for
 * reviews follow the user's local calendar and roll over at a chosen hour
 * (default 4 am), so late-night study counts as the same day. Using local
 * calendar dates (not 24-hour blocks) keeps days correct across daylight
 * saving changes and time-zone travel.
 */

/** Default hour (local time) when a new study day begins. */
export const DEFAULT_DAY_START_HOUR = 4

/** Start (UTC ms) of the study day that contains `now`. */
export function studyDayStart(
  now: number,
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): number {
  const d = new Date(now)
  const start = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    dayStartHour,
  )
  // Before today's rollover hour we are still in yesterday's study day.
  if (start.getTime() > now) start.setDate(start.getDate() - 1)
  return start.getTime()
}

/** Start (UTC ms) of the study day `days` after the one containing `now`. */
export function addStudyDays(
  now: number,
  days: number,
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): number {
  const start = new Date(studyDayStart(now, dayStartHour))
  start.setDate(start.getDate() + days)
  return start.getTime()
}

/** End (UTC ms, exclusive) of the study day containing `now`. */
export function studyDayEnd(
  now: number,
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): number {
  return addStudyDays(now, 1, dayStartHour)
}
