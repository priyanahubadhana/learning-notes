# Audio recording

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Record your voice while you take notes (like GoodNotes), keep the sound with the page, and play it back from a list in the left panel. Local only, no account, no cost: the sound goes from the microphone into the notes database on the device and nowhere else.

## How it works

- **Start:** Insert › Audio (main bar Insert pill, ribbon Insert › Media) starts recording the open page and opens the Audio list. The browser asks for the microphone the first time. View › Audio list opens the list without recording.
- **Recorder** (`src/audio/recorder.ts`): one recording at a time for the whole app, tied to the page it was started on; it keeps running when other pages are opened. `MediaRecorder` (Safari makes `audio/mp4`, Chrome `audio/webm`), 32 kbit/s (speech), a piece every second, stops by itself after 3 hours (`MAX_RECORDING_MS`) and saves. While the list is closed, a red chip ("Recording 0:12", Audio, Stop) stays on screen so a recording is never forgotten (`audio/AudioDock.tsx`).
- **Saved** (`recordingService.ts`): table `recordings` (Dexie 14, only adds a table): `pageId`, `name` ("Recording 6 Nov, 14:32"), `type`, `startedAt` (UTC ms; strokes already carry `at`, so ink replay can use both later), `durationMs`, `data` (ArrayBuffer). At most 200 MB per recording.
- **Audio list** (left panel, `AudioDock.tsx`; only the Audio tab for now, Pages and Outline arrive with D1): Record / Stop button with timer, the page's recordings oldest first with Play (the sound is loaded only then; a normal audio player with controls) and Delete.
- **Ink replay (G2):** strokes keep `at` (UTC ms start) and a recording keeps `startedAt`, so a stroke written while recording points at a second of the sound. Select drawings with the Lasso: when the earliest stroke lies inside a recording (`core/replay.ts` `replayTarget`, 1.5 s slack), the selection menu shows **Play the recording from here**. It asks the Audio list (`requestReplay`), which opens, loads that recording and seeks to the second (`AudioDock.tsx` `seekAndPlay`; a browser recording often has no length, so the seek first jumps far to make the player find the end). Several recordings overlapping: the newest wins. A drawing made with no recording offers nothing. The page's recording times are read when a drawing is selected and kept 15 s (the rows carry their sound, so it is not read on every tap).
- **Deleting is safe:** Delete moves a recording to "Deleted recordings (n)" in the same panel, with an Undo toast; Restore brings it back any time; "Delete forever" asks first, then blanks the sound (`purgedAt`). A page deleted forever from Trash erases its recordings too (`core/recordingPurge.ts`).
- **Backups:** Everything and Notes only both keep the rows; Everything keeps the sound; Notes only leaves out the sound of recordings (`NOTES_SKIP_MEDIA`). Rows are checked on open (`checkRows.ts`: audio type, text fields, plain bytes).
- **Header:** `public/_headers` Permissions-Policy now `microphone=(self)` (was `()`), so only this app may ask for the microphone.

## Edge cases

- No microphone, permission refused, browser without MediaRecorder: a clear toast, nothing recorded.
- iPadOS stops a recording when Safari goes to the background; the pieces kept so far are saved when the recorder stops.
- If the device is full when saving, a toast says so and the sound of that recording is lost (see DECISIONS).
- Single-notebook files (Share one notebook) and Add as copies do not carry recordings (see LIMITATIONS).

## Security check

- Microphone only after a tap, never in the background; one permission policy entry (`self`).
- Sound never leaves the device (no network code in `src/audio`); played from a Blob URL made on Play and revoked after.
- Imported rows: type must be `audio/*`, no unknown fields, bytes must be bytes.
- Deletion: soft first (Undo, Restore); forever only on purpose and after a question; a live recording cannot be erased from the code path.

## Tests

- Replay: `src/core/replay.test.ts` (which recording and second, slack, deleted, overlap), e2e `inkReplay.spec.ts` (draw while recording, Lasso, Play from here seeks past 1.5 s; no recording, no button).

`src/audio/recordingService.test.ts` (save, order, soft delete, restore, erase rules, page purge, both backup kinds, row checks, v13 upgrade), `migration.test.ts` (current version 14), e2e `audio.spec.ts` (fake microphone: record, stop, play, delete with Undo, Delete forever, chip).
