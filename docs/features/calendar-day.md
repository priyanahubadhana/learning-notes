# Calendar Day (N3)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

The Calendar screen gets a third range, **Day**: one full-page card for one day, easy to flip through on the iPad. Year view stays parked (IDEAS).

## How it works

- Calendar › range switch is now Day · Week · Month (`calendar.mode` pref, device only; the last one used opens next time).
- Day shows `CalendarDayCard`: weekday, the date in big type, a button **Open this day's journal** (or **Start …** when the day has none), and every dated database row of that day. Same data as Week/Month (`calendarEntries(db, workspace, day, day)`), so locked pages show 🔒.
- Move by day: ‹ and › buttons, the Left/Right arrow keys while the card has focus, or a **swipe** (touch and pen only; a mouse drag does nothing). A swipe is mostly sideways, at least 60 px, within 0.7 s (`swipe.ts`), so scrolling and slow drags never change the day. Swipe left = next day, right = the day before. The card keeps `touch-action: pan-y`, so vertical scrolling still works.
- Today jumps back; ‹ › also move by a week or a month in the other ranges.
- No new stored data and no Dexie version (nothing new to sync).

## Edge cases

- Month ends and leap days use `addDays` (UTC day maths), the same as Week.
- Nothing dated: the card says so and still offers the journal button.
- Year view: not built.

## Security check

No inputs, no stored data, no network.

## Tests

- Unit: `src/databases/swipe.test.ts`.
- E2E: `e2e/calendarDay.spec.ts` (buttons, arrow keys, touch swipes, a short swipe is ignored, Today, remembered after reload, journal button, phone width). Owner: real finger swipe on the iPad.
