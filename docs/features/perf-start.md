# Fast start (perf-start)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

**Flag:** n/a (no switch, perf fix). Shared parts only.

**Status:** fix on `slice/perf-start`. WebKit start 15 s -> 1.2 s.

## Purpose

The app should open at once. Starter templates (the built-in notebook pages) should fill in behind the scenes, not block the start.

## When

- When the app starts, the first screen opens at once, before starter templates are written.
- When starters are missing, they seed in the background, one bulk write per starter.
- When a notebook was seeded at starter version 1 or 2, it gets only the starters newer than its version (`since`), with no doubles.
- When the user has trashed a starter, that starter is never added again, on this or any later start.
- When the new-page template list is shown, it waits until starters are seeded (`startersReady`), so the list never shows without Study while seeding.

## How it works

- Start opens the app first. Seeding runs after the first paint.
- Each starter is written with one bulk write per table, never one write per record.
- Seeding is idempotent: a second run writes nothing. A run cut short is finished by the next run.
- Upgrades compare the notebook's `starterVersion` with each starter's `since`. Only newer starters are written.
- A trashed starter (`deletedAt` set) counts as seeded, so it is not written again.

## Edge cases

- Notebook at version 0, 1 or 2: each gets only the starters it lacks.
- Trashed starter plus a later upgrade: the trashed one stays trashed.
- Run cut short, then started again: finished once, no doubles.

## Won't do

- No change to the starter content or its order.
- No new settings or switches.
- No change to how notes are stored.

## Security check

No new inputs, no new network calls, no new secrets. Writes stay in the local database.

## Tests

- `src/templates/seedBulk.test.ts:145` (upgrade from v1/v2 adds only newer starters): When 3 (newer starters only).
- `src/templates/seedBulk.test.ts:159` (trashed starter never re-added): When 4.
- `src/templates/seedBulk.test.ts:23`, `:44`, `:57` (one bulk write, idempotent, cut-short run): When 2.
- `src/templates/seedBulk.test.ts:186`, `:200` (`startersReady`): When 5.
- `e2e/startSpeed.spec.ts:37` (first start ready fast, every starter still added): When 1 and 2.
- `e2e/startSeeding.spec.ts:11` (new-page list never shows without Study while seeding): When 5.
