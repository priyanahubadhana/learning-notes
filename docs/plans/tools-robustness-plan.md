# Tools robustness plan (for a Sonnet builder)

Research: [../research/tools-robustness-2026-11.md](../research/tools-robustness-2026-11.md).

For every step: build, add unit tests, run e2e on chromium and ipad-webkit, write the CHANGELOG entry, run the mirror. No new Dexie version. All e2e tests use `e2e/inkHelpers.ts`.

How to fake an app switch in a test: send `visibilitychange` (hidden). Then either send `pointercancel` for the pointer that is down, or send nothing. Then send `visibilitychange` (visible) and `pageshow`.

## Step 1: one input state machine (`src/app/inputMachine.ts`, new)

- States: `idle`, then `pressing(id, tool, at)`, then `drawing`, `selecting` or `transforming`, then back to `idle`.
- API: `begin(e, owner)`, `move`, `end(e)`, `abort(reason)`, `current()`, `subscribe`.
- Goes back to `idle` on any of these: pointerup, pointercancel, `lostpointercapture` (listened for on the document, capture phase), blur, hidden, a tool change, or an **age limit**. The age limit: a pointer marked "down" with no movement for 4 s is aborted.
- Every abort calls `resetGestures` for the module that owned the gesture, with reason `'timeout'`, `'toolchange'` or the event's reason.
- Add `'timeout' | 'toolchange' | 'health'` to `ResetReason`.
- e2e `tools-machine.spec.ts`: a pointerdown with no lift, wait 4.5 s, then the next Lasso loop selects.

## Step 2: put the Lasso on the machine (`controller.ts`)

- In `lassoDown` (`:1864`): if `this.gesture` exists and its pointer is not live in the machine, or it is older than 4 s, call `cancelGesture()` and go on. Today it just `return`s.
- Match the lift by the machine's state, not only by `g.id` (`:1993`).
- A tool change calls `cancelGesture()`.
- e2e: **20 Lasso loops in a row**, mixing free and rectangle loops, the T filter on words, a picture, ink, and a mix of these. Between loops, take turns: Esc, a tap on paper, nothing. Every loop must select.
- Then one loop whose lift is swallowed (a test hook calls `stopImmediatePropagation`), followed by 5 normal loops that all select.

## Step 3: one owner of `contenteditable` (`src/editor/editLock.ts`, new)

- Remove the save-and-restore code in `controller.ts:1418-1433` and `penSelect.ts:78-121`. Replace it with a counted lock: `lock(owner)` and `unlock(owner)`.
- Rule: the page is editable when `editableIn(mode)` is true and no locks are held. `applyPageMode` works it out the same way.
- The watchdog clears all locks.
- No module ever writes back a value it remembered.
- e2e:
  - Hold a Lasso gesture, switch to Text before lifting, lift: typing works.
  - App switch in the middle of a Lasso loop, then Text tool: typing works.
  - Pencil drag-select on text, then Lasso, then Text: typing works.

## Step 4: close the remaining flag gaps

- tapSelect: add a `pointercancel` listener (`tapSelect.ts:275`).
- holdSelect: clear its timer when the app is hidden.
- `selectGesture`: give it the same 4 s age limit.
- ownSelection, penGuard, palmGuard, penTap, gripDrag and the auto device mode counter: read "pointer is down" from the machine, or register an age limit.
- Show the number of document capture listeners per event type in `toolState()`.
- e2e:
  - A tap ends with pointercancel, then a double tap selects a word.
  - A hold-select whose lift is lost, then a Lasso loop works within 5 s, with no app switch.

## Step 5: health check (`src/app/healthCheck.ts`, new)

Runs on `visible`, `pageshow` and `focus`. It also runs every 30 s while idle: no pointer for 30 s and the page is visible.

What it checks, and how it heals each problem:

| Problem                                                                                                                    | Heal                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| The machine is idle but a registered "down" flag is true                                                                   | Run the reset                                              |
| `contenteditable` does not match `editableIn(mode)` and no lock is held                                                    | Apply the page mode again                                  |
| `selectGesture.active` is true with no pointer down                                                                        | Run the reset                                              |
| The pad holds pointer capture with no gesture                                                                              | Release the capture                                        |
| An ink canvas lost its content: `ctx.isContextLost?.()`, or a 1 px read-back of a known tile is empty while it has strokes | Repaint all tiles                                          |
| Listener counts differ from what is expected                                                                               | Run the reset; soft refresh if still wrong                 |
| Settings or version may be stale                                                                                           | Read the settings mirror again and call the update checker |

- Log every problem and heal in `toolState()` under `health`.
- If the same heal fails twice within 60 s: **soft refresh** (step 6).
- e2e: force each bad state through a test hook, run `health()`, expect it healed. Wipe a canvas in the test: the ink is repainted.

## Step 6: soft refresh (`src/app/softRefresh.ts`) and "Refresh app" in the ⋯ menu

- A safe moment means all of these: the machine is idle, no text composition is going on, no sheet is open with unsaved input, and all saves are flushed (`inkDoc.flush`, the page save, the settings mirror).
- Before reloading, store `{pageId, scrollTop, tool, at}` in sessionStorage, then call `location.reload()`.
- On start, restore it once, and only if it is less than 60 s old.
- Reuse the safe-reload poll in `updates.ts`.
- Add "Refresh app" to the top ⋯ menu (strings in en, es, hi). It does the same, at once.
- Automatic soft refresh: at most once every 10 minutes. Afterwards, show a toast: "App refreshed to fix a stuck tool".
- e2e: type, draw, tap Refresh app: same page, scroll within 20 px, same tool, text and ink saved.

## Step 7: resume regression suite (`e2e/resume.spec.ts`)

1. 10 Lasso loops; app switch with `pointercancel` in the middle of a loop; 10 more loops, all select.
2. The same, with NO pointercancel (the lift is lost).
3. Pencil mode (pen pointer), after resume: a single tap places the caret, a double tap selects a word, a Pencil drag selects text, a Pen stroke draws, and the Text tool types.
4. In the middle of a Lasso loop, switch to Text, switch apps, come back: typing works.

Run on ipad-webkit. Add to owner-checks-pending: "use Lasso 20 times, switch apps 3 times, everything still works".

## Done when

- Everything above passes twice in a row.
- The owner check passes on the iPad.
- DECISIONS lists the 4 s age limit and the 10-minute cap on automatic refresh, for the owner to review.
