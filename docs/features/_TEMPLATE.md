# <Feature name> (template v2, method v2)

| Status | Switch          | Phase and parts          | Pictures                 | Builds on                                                                       | Last change       |
| ------ | --------------- | ------------------------ | ------------------------ | ------------------------------------------------------------------------------- | ----------------- |
| Draft  | `<area.switch>` | `<phase>`, parts `<ids>` | `docs/mockups/<folder>/` | `<spec>.md`, parts: `<Part card>`, `<Part card>` (or "none, checked on <date>") | `<date>`, `<who>` |

<!-- The top layer (down to the confirm sheet) is written for the owner and must stand on its own: plain words, real values, a picture. The bottom layer is for the builders. One file, so the two can never disagree. Security rules: rules/security.md. -->

## Goal

One line: what the owner can do when this is live that they cannot do today.

## The two non-negotiables

1. …
2. …

## Story

As a … who …, I want … so that ….

## Picture

The approved mock-up or screenshot, with its date and the conditions the owner gave. A scenario with a picture is read in a tenth of the time.

## Rules

**Always true**

- **Short name.** The rule in one or two sentences, with the owner's words and date where it came from.

**Must never happen**

- **XX-N1** …

**Limits**

- …

## Scenarios

Three to five. S1 is the plain happy case; one of them goes wrong. What happens, not where to tap; a gesture is named only when it is the feature. Real values from the owner's notes.

- **S1, the plain case.** Given …, when …, then ….
- **S2.** …
- **S3, the thing that goes wrong.** Given …, when …, then … (the calm failure the owner sees).

## How we get there (the steps, each with its test)

| Step | What it gives | Proved by                       |
| ---- | ------------- | ------------------------------- |
| 1    | …             | the test or check that shows it |

## Done when

Every scenario passes on chromium (and on ipad-webkit where marked); the owner said yes by scenario on the preview; with the switch off the app is exactly as today; one line in docs/metrics/tasks.csv.

## We assume (not proven yet)

- … Check: ….

## Open points

- `OPEN:` …

## Confirm sheet (the owner answers by row: Yes, Explain again, or Change to …)

| Row | Statement                          |
| --- | ---------------------------------- |
| 1   | The goal line says what I meant.   |
| 2   | The two non-negotiables are right. |
| 3   | Rule "<short name>" …              |
| 4   | Scenario S1 …                      |

---

## Bottom layer: for the builders

### Builds on

| Part card or spec | Used for |
| ----------------- | -------- |
| `<Bar shell>`     | …        |

No gap, radius, timing or placement rule is written here if a part card owns it; point to the card.

### Plan

Link to the plan file made with Spec Kit; which files, which data, which switch, what the first failing test is.

### Tasks

| Task | Satisfies          | Size    | Done when                 |
| ---- | ------------------ | ------- | ------------------------- |
| T1   | S1, XX-01 to XX-03 | < 1 day | the named tests are green |

### Detail lines

- **XX-01** When …, then …. Numbers here, with their source (the picture, the design system, the owner's word).

### Not in this part

- …

### Security check

The risky paths of this feature and how each is covered (rules/security.md).

### Tests

One test per scenario through the real screen, named after the id; unit tests for the logic inside. What no computer can prove is marked `@ipad` and decided by the owner's check.

### Changes

- `<date>` · `#<issue>` · what changed · who confirmed
