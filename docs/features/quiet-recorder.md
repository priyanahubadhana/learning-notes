# The quiet recorder (Part A2)

**Story:** As the owner, when a Lasso outline stays on the screen or a new loop acts on the old selection, I tap "Copy last trace" and paste it in the chat, so the fix is written from what my iPad really did, not from a guess.

**Why now:** the two rare Lasso faults (docs/archive/plans/lasso-bugs-a-b-note.md) show once or twice in five to ten uses, only on the real iPad. Part A1 is written from one real trace (check C1a). It replaces the red-line Circle recorder, which drew on the page and changed what it measured.

## Rules

- **It changes nothing.** With the recorder on, every Lasso scenario (e2e/features/lasso.feature) and every Lasso test passes exactly as with it off.
- **It never stores the words of a note.** Text input and selection changes are recorded as "changed", with lengths and positions, never the letters.
- **Off by default.** Turned on in Settings › Try new features, where the Circle recorder switch was (same switch, new name "Lasso recorder"; the old red line is gone).

**Can never happen**

- **RC-N1** The recorder draws on the page, cancels or stops an event, captures a pointer, or uses the page's own timers.
- **RC-N2** A trace holds letters typed or selected in a note, a note title, an email or a key.
- **RC-N3** The recorder slows writing: no heavy work per event (an array push only).

## Scenarios

```gherkin
Feature: The quiet recorder

  Scenario: R1 The recorder changes nothing
    Given the Lasso recorder is on
    When every Lasso scenario runs
    Then each passes as with the recorder off

  Scenario: R2 Copy last trace
    Given the Lasso recorder is on
    And I drew three loops with the Lasso
    When I tap "Copy last trace"
    Then the last 30 seconds of events are copied as text
    And a short note says "Trace copied: paste it in the chat"

  Scenario: R3 A trace replays the same way
    Given a trace copied from the recorder
    When the test tool replays it
    Then the app ends in the same Lasso state the trace recorded at its end

  Scenario: R4 No note words in a trace
    Given the Lasso recorder is on
    And I typed "Service 23-11 2000 rate-is" in a box and selected "2000"
    When I copy the last trace
    Then the trace does not contain "Service", "2000" or "rate-is"
```

## We assume (not proven yet)

1. The iPad lets a button copy a few hundred kilobytes of text to the clipboard (checked in C1a; if not, the trace is shown in a box to select and copy, or saved as a file).
2. Passive listeners on the window see every Pencil and touch event the Lasso sees (pointer capture can hide some: the recorder also listens for capture gained and lost).

## Detail lines

- **RC-01** Per event: order number, both time stamps (event and performance clock), type; for pointer events id, type, primary, button, buttons, pressure, tilt, width, height, position; touch events with type and touch count; target as a short kind (box, paper, bar, other) and test id, never its text; trusted or not; cancelled or not.
- **RC-02** Also: pointer capture gained and lost; hover (over, out, enter, leave); click; focus and blur (kind only); page hidden or shown; selection change (lengths only); text input (that it happened, never data).
- **RC-03** App state with each Lasso event: tool, Lasso gesture phase, input machine state, selection kind and count, number of outlines on screen, editable or not, the 4-second timer running or not, and the reason a gesture ended.
- **RC-04** A ring buffer in memory (last 60 seconds, at most 20 000 events); nothing written to storage; cleared when the switch goes off.
- **RC-05** "Copy last trace": a small button outside the page (the top bar's ⋯ area or a small pill at the screen edge), shown only while the switch is on; it copies the last 30 seconds as compact JSON with the build id and screen size at the top. It is never drawn on the page.
- **RC-06** The replay (e2e/circleTrace.ts) sends what the trace holds: real pressure, buttons, pointer type and id, tilt, touch events and their timing; it no longer makes up pressure or buttons. Replayed events are untrusted, so Scribble is never exercised by a replay (stated in the test).
- **RC-07** Texts in every language; the switch row says in plain words what it does and that it records no note words.

**Done when:** R1 to R4 pass (R1 = the lasso feature and e2e/lassoFreeze.spec.ts run with the recorder forced on, 20/20 on chromium and ipad-webkit); RC-N1 to RC-N3 each have a test; the owner can copy a trace on the iPad (check C1a).
