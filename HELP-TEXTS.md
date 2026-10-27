# Help texts to review

Every hover tip and help line in the app (shown while Settings › Show help is On). Generated from `src/help/helpRegistry.ts` and `src/i18n/en.ts`; to change a text, edit it in `en.ts`, then run `UPDATE_HELP=1 npx vitest run src/help` to refresh this file.

## Hover tips (20)

### `tracker.lesson`

- **Where:** Study tracker › Lesson column header
- **Meaning:** Each row is one lesson: a top-level page of this notebook. Its sub-pages count towards it.
- **Example:** Cards on the sub-page “Heart › Valves” count for the lesson “Heart”.

### `tracker.status`

- **Where:** Study tracker › Status column header
- **Meaning:** Where this lesson stands. The app works it out from your card answers, or you can set it yourself.
- **Example:** Not started, Learning, Review or Mastered.

### `tracker.status.notStarted`

- **Where:** Study tracker › the “Not started” pill, board column and menu item
- **Meaning:** You haven’t answered any card of this lesson yet.
- **Example:** A lesson whose cards are all new.

### `tracker.status.learning`

- **Where:** Study tracker › the “Learning” pill, board column and menu item
- **Meaning:** Fewer than 75% of the cards you answered were right.
- **Example:** 6 of 10 answered cards right → 60% → Learning.

### `tracker.status.review`

- **Where:** Study tracker › the “Review” pill, board column and menu item
- **Meaning:** Mostly right, but not finished: some cards are due, new or still short of Mastered.
- **Example:** 85% right, or 95% right with 2 cards due → Review.

### `tracker.status.mastered`

- **Where:** Study tracker › the “Mastered” pill, board column and menu item
- **Meaning:** 90% or more right, nothing due, no new cards, and at least 80% of the cards at level Mastered.
- **Example:** 10 cards, all right, 8 or more back only every 21+ days.

### `tracker.pin`

- **Where:** Study tracker › the 📌 next to a status you set
- **Meaning:** You set this status yourself, so the app leaves it alone. Choose Auto in the menu to hand it back.
- **Example:** Menu › Auto (now: Review).

### `tracker.lastRevised`

- **Where:** Study tracker › Last revised column header
- **Meaning:** The last time you answered any card of this lesson (a review or Practice anyway).
- **Example:** You reviewed one of its cards yesterday → yesterday’s date.

### `tracker.cardsDue`

- **Where:** Study tracker › Cards due column header
- **Meaning:** Cards ready to review now, and new cards you haven’t started.
- **Example:** 5 due · 20 new.

### `tracker.correct`

- **Where:** Study tracker › % correct column header
- **Meaning:** Of the cards you’ve answered, how many your latest answer got right (anything but Again).
- **Example:** 8 of 10 answered cards right → 80%.

### `tracker.levels`

- **Where:** Study tracker › Card levels column header
- **Meaning:** How well you know this lesson’s cards, by how far apart their reviews are.
- **Example:** 3 New · 2 Learning · 4 Familiar · 1 Mastered.

### `tracker.level.new`

- **Where:** Study tracker › Card levels bar and numbers, “New”
- **Meaning:** You haven’t studied this card yet.
- **Example:** A card you just made.

### `tracker.level.learning`

- **Where:** Study tracker › Card levels bar and numbers, “Learning”
- **Meaning:** You’re still getting it, so it comes back again soon.
- **Example:** Its next review is less than a day away.

### `tracker.level.familiar`

- **Where:** Study tracker › Card levels bar and numbers, “Familiar”
- **Meaning:** You mostly know it, and the reviews are getting further apart.
- **Example:** Its next review is 1 to 20 days away.

### `tracker.level.mastered`

- **Where:** Study tracker › Card levels bar and numbers, “Mastered”
- **Meaning:** You know it well, so you’ll only see it every few weeks.
- **Example:** Its next review is 21 days or more away.

### `tracker.confidence`

- **Where:** Study tracker › Confidence column header
- **Meaning:** Your own feeling about this lesson, from 1 to 5 stars. The app never changes it.
- **Example:** ★★★☆☆ = fairly sure.

### `tracker.newLesson`

- **Where:** Study tracker › “+ New lesson” (table and board)
- **Meaning:** Adds a lesson: a new page at the top of this notebook.
- **Example:** Add “Kidney”, then write its notes and cards in it.

### `tracker.chart.streak`

- **Where:** Study tracker › Dashboard › Study streak chart title
- **Meaning:** How many days in a row you answered at least one card. A day that isn’t over yet doesn’t break it.
- **Example:** 🔥 5 days = you studied every day since Friday.

### `tracker.chart.correct`

- **Where:** Study tracker › Dashboard › % correct per week chart title
- **Meaning:** The share of your answers each week that were not Again.
- **Example:** A week with 40 answers, 30 of them right → 75%.

### `tracker.chart.days`

- **Where:** Study tracker › Dashboard › Cards answered per day chart title
- **Meaning:** Each square is a day. The darker it is, the more cards you answered.
- **Example:** A dark square = a busy study day; a blank one = a day off.

## Help lines (4)

Help lines are marked in the page with `data-help-line="<id>"`.

### `tracker.table`

- **Where:** Study tracker › under the table
- **Text:** Status, Last revised, Cards due, % correct and Card levels fill themselves in from your card reviews. Click a Status to set it yourself 📌.

### `tracker.levels`

- **Where:** Study tracker › under the table, second line
- **Text:** Card levels: New = not studied yet · Learning = comes back within a day · Familiar = back in 1–20 days · Mastered = back in 21+ days.

### `tracker.board`

- **Where:** Study tracker › above the board
- **Text:** Drag a lesson to another column to set its status yourself 📌. Drop it back on its own automatic column to hand it back to Auto.

### `tracker.statusRule`

- **Where:** Study tracker › inside the Status menu (how Auto works)
- **Text:** Auto: Not started = no cards answered yet · Learning = under 75% correct · Mastered = 90% or more correct, nothing due, no new cards, and at least 80% of the cards at level Mastered · Review = in between.
