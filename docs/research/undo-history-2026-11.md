# Undo and version history research (10 Nov 2026)

Items 3, 4, 8 of the owner bug batch. One web search was run (Yjs and ProseMirror); the rest is from the builder's knowledge of the products and is marked "known".

## How others do it

- **ProseMirror history (our text editor under BlockNote):** one stack per editor; edits within `newGroupDelay` (500 ms) merge into one step; `closeHistory` forces a break; remote or programmatic changes are excluded with the `addToHistory: false` meta. Depth default 100. Source: [prosemirror-history](https://cdn.jsdelivr.net/npm/prosemirror-history@1.5.0/src/history.ts).
- **Yjs UndoManager:** groups edits inside `captureTimeout` (500 ms), `stopCapturing()` breaks the group, tracks only chosen origins (so undo never reverts other people's work). Source: [Yjs docs](https://docs.yjs.dev/api/undo-manager).
- **tldraw (known):** one store-level history of "marks" and diffs; a gesture (drag, draw) is one entry because the tool calls `mark` at pointer-down; every store change (shapes, pages, camera excluded) feeds the same stack, so nothing bypasses it.
- **Figma (known):** per-user undo of own changes; one gesture is one step; multiplayer undo only reverts what you did.
- **Notion (known):** one undo stack per page that spans blocks, properties and moves; page-level actions (move, delete) are in it; stack is lost after a long time or reload. Page history is separate (snapshots, 7 to 90 days by plan).
- **GoodNotes (known):** one undo stack per document that mixes ink, text boxes, pictures and page actions; the stack lasts for the session; no separate version history on device (iCloud keeps copies).
- **OneNote (known):** one undo stack per section; page versions are kept by the service and can be restored per page.

## What this means for us

1. The best design is **one app-level stack per page that every action feeds**; text editors keep their fine-grained ProseMirror steps inside it (a "text group" step per typing pause), ink strokes and Lasso moves are one step per gesture, layout and page actions are one step each.
2. **Grouping rule:** typing pauses of 800 ms or a change of kind end a group; a drag, stroke, resize or Lasso move is one step.
3. **Depth:** at least 200 steps per page; steps are deltas (changed blocks, changed ink chunks, changed page fields), not whole pages.
4. **Never a silent no-op:** when the top step cannot be undone, say why.
5. **Version history is separate from undo:** timed and big-change snapshots, thinned over time, with preview and a whole-page restore that is itself undoable.

## What is built (this round)

- **Version history (items 4 and 8), done:** copies now hold the paper boxes, each block's box, the paper style and sheet size (the cause of item 8: copies kept only blocks, title and ink, so restore left boxes and layout behind). Copies are taken every 2 minutes while editing, after 20 s when the change is big, on leaving the page and before a restore. Kept: all from the last 2 hours, one per hour for 2 days, one per day for 90 days, at most 300 and about 20 MB per page. The dialog shows the reason, how many boxes and whether drawing is in the copy; Restore brings back the whole page, and the page as it was is kept first so the restore can be undone from History. No Dexie version was needed (new fields are optional; old copies restore as before and leave the boxes alone).
- **One unified app history (item 3), BUILT 10 Nov (Builder D), see docs/features/undo-history.md. The note below is the earlier plan:** needs the step API (`pushStep`, `group`) and moving the editor, ink, pad and page actions onto it; too large for this round and conflicts with builders A and B's input work. Proposed order: step API and persistence per page, then ink and Lasso, boxes and pictures, tables and databases, a test that scans action entry points, then the e2e matrix with a 50-step random sequence.
