# Study pack: plan draft (Fable, 16 Nov 2026)

Status: **draft, waiting for the owner's yes.** It changes nothing in [phase-plan.md](../../plans/phase-plan.md) until then. Sources: [user-story-study-pack.md](user-story-study-pack.md), [app-user-story.md](app-user-story.md) section 7, the "ai TEST 1a" test.

## The main idea

The new story is not one giant new phase. Most of it belongs to phases that already exist and are already waiting for their side-by-side check (phase-plan section 0, steps 6 and 7). So each part is added to its home phase, gets its picture there, and is built with it. Only the questionnaire and the pack itself are a new phase.

## Where each part goes

| Part                                                                                                                                                                                | Home                            | Needs a picture?                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| **A. Connector upgrade:** one shared action list (connector, in-app AI, own API key); writes toggles, colours, pictures, mind maps, database rows, tags, page tabs, Summary, covers | Phase 8 (AI and connector)      | no (no screen); a test notebook is the proof |
| **B. Organise:** four levels in the sidebar, notebook covers, the notebook's database home with study columns and a form, smart source types                                        | Phase 3 (Notebooks)             | yes                                          |
| **C. Find:** source type, several tags at once, date range, the path on each result                                                                                                 | Phase 4 (Search)                | small (added to the Search picture)          |
| **D. Recall and study:** recall mind map in Review (tap to recall, rate yourself), slides deck, short notes that open the detailed note                                             | Phase 6 (Review and Study)      | yes                                          |
| **E. Page:** paper pages or one long page, page-aware layout, tap a term to see its meaning                                                                                         | Phase 9 (things inside a page)  | yes (Phase 9 has no picture yet)             |
| **F. Study pack:** the six questions, presets, the pack made in the app, the "my style" note                                                                                        | **new Phase 11**, after Phase 8 | yes                                          |

## Order (proposal)

1. Unchanged: steps 1 to 4 of phase-plan section 0 (Phase 1 live, tool bar v9, text box and Pencil, Settings v5). Likely 9 to 13 days, measured pace.
2. Meanwhile, no code: Gemini prompt v3 test; the "App user stories" notebook after the 20 Nov reset.
3. **Part A first** of the new work: it has no screen, it is the owner's own daily route (Gemini → Claude Code → notebook), and every later part needs it. Estimate 8 to 12 tasks of 3 to 6 hours: 2 to 4 days lean (estimate, not measured).
4. B, C, D, E with their home phases, in the phase order.
5. F last: it needs A, B and D.

## Decisions for the owner (one checklist; Fable's picks)

1. AI cost: each user brings their own key, cost shown before each run. Rule "AI only after the owner approves the cost" stays.
2. Order: current steps 1 to 4 first; then Part A; the rest with their home phases.
3. Connector safety: every feature, but no delete, and big changes to existing pages go to the Inbox.
4. Four levels: built from what exists (Subject and Topic as sections in the notebook's sidebar); a page may sit under a Subject without a Topic.
5. Tabs: Notes · Summary · Review always on; the answers switch the others on for that page.
6. Page modes: both (paper, long page), chosen per notebook, default in Settings; planned in Phase 9.
7. Database: reuse today's databases; new are only the study columns, the form and the notebook home view.
8. Recall: the recall mind map is added to the approved Review v2 picture as one more part (a small picture update), not a new Recall tab.
9. Slides: a simple in-app deck made from the pack (one idea per slide), in Phase 6; .pptx export stays a parked idea.

Settled by the newest answers (no question): six questions; the goal is "Study and remember"; as many pages as the answers need.
