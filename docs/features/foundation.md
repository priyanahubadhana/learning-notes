# Foundation (slice 0: 0a flags and level, 0b test tools)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Plan: [build master plan 3.2](../plans/build-master-plan.md). Unlock list: [pro-features.md](../mockups/pro-features.md).

## Purpose

The base every later slice stands on: on/off switches so new parts ship hidden, the Beginner / Professional level with one unlock per Professional feature, and the test tools that stop a slice from breaking what works today.

## How it works

### 0a Flags and level

- When the app starts with nothing changed → every switch in `src/app/flags.ts` is OFF and every screen looks exactly as before.
- When code reads a switch (`isOn('toolbar.v8')`) → it gets the answer at once, with no waiting and no database read.
- When I open Settings → a section "Try new features" lists every switch with a plain name and one line saying what it does, each OFF.
- When I turn a switch on → it shows ON straight away (visible feedback) and stays ON after a reload, on this device only.
- When I turn it off again → today's screen comes back; no notes or data are touched.
- When a test opens the app with `?flags=toolbar.v8,textbox.v2` (or the `learning-notes:flags` storage key) → those switches start ON for that run.
- When stored switch data is broken or names a switch that no longer exists → it is ignored and the switch stays OFF.
- When code asks for the level → it gets Beginner or Professional; when it asks `isUnlocked('nb.move')` → true in Professional, or in Beginner only if that one feature was unlocked.
- When the unlock list is built → it has exactly the 169 ids of pro-features.md, each unique (unit test).
- Each switch row has a 44 pt target, a label and works with the keyboard, in light and dark.

### 0b Test tools

- When code adds a raw `addEventListener` or a `z-index` outside `src/app/input/` and `src/app/overlay/` → `npm run check:ratchet` fails and names the files; when the count goes down → it passes and tells you to lower the baseline (`-- --update`).
- When a screenshot test runs on an OS that has baselines → it compares pixel by pixel; on an OS with no baselines → it is skipped, never red.
- When the "Update Linux screenshots" CI job is started by hand → it makes Linux baselines to download and commit.
- When `npm run check:dod -- <slice>` runs → it lists each Definition of Done item as passed or missing (flag exists and is OFF, spec exists, tests per spec line, size budget).
- When the "nothing lost" probe runs → it reads the feature inventory (file:line) and reports which entries have a probe and which do not.

## Edge cases

- Private browsing or blocked storage: switches read as OFF, no error.
- Level for existing users: Professional (what they see today), so nothing changes.

## Won't do

- Any change the user can see with all switches off, apart from the "Try new features" list.
- No screen reads the level or the unlocks yet.
- No new npm packages, no paid services, no database version change.
- Switches do not sync between devices.

## Security check

Switch names come from a fixed list; unknown names from the URL or storage are dropped. No secrets, no network.

## Tests

- Unit: `src/app/flags.test.ts`, `src/settings/level.test.ts`.
- e2e: `e2e/tryNewFeatures.spec.ts`; screenshots in `e2e/visual/`.
- Scripts: `check:ratchet`, `check:dod`, `probe:inventory`.
