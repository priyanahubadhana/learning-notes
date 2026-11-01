# Database dashboards

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Shows charts about a database's rows: numbers, bars, lines, donuts, progress bars and heatmaps.

## How it works

- A Dashboard is a view type; its charts are saved in `DbView.config.charts` (`dashboard/chartSpec.ts`).
- Chart kinds: number, bar, line, donut, progress, heatmap. Measures: count, sum, average, min, max. Sizes: small, medium, wide. Periods: day, week, month.
- A chart can group by a column, use a value column, use a date column, and have its own filter (is empty, not empty, is, checked, not checked).
- `chartData.ts` (`chartData`) turns rows into chart numbers; `ChartBody.tsx` draws them; `ChartDialog.tsx` edits one chart.
- Until charts are saved, the dashboard shows starter charts picked from the columns (`suggestCharts`); the first change saves them.
- Limits: at most 12 bars, 6 donut slices, 6 progress bars; small groups fold into "Other"; line charts keep at most 12 weeks; the heatmap shows 18 weeks (`MAX_GROUPS`, `MAX_POINTS`, `HEAT_WEEKS`).
- Weeks start on Monday, months on the 1st.
- Study tracker dashboards can also show review history charts: % correct per week, answers per day, study streak (`historyData.ts`).

## Edge cases

- A damaged saved chart is skipped, and charts pointing at deleted columns are dropped.
- Averages with no numbers show nothing; the chart says "from N" for rows that have a value.
- Counts leave zeros in gaps, averages leave gaps.
- Donut and progress only add up for counts and sums.

## Security check

- Saved chart settings are read defensively; invalid charts are ignored.
- Charts run on data already on the device; nothing is sent out.
- Deleting a chart only changes the view's config; row data is untouched.

## Tests

- `src/databases/dashboard/chartData.test.ts`
- `src/databases/trackerHistory.test.ts` (history charts)
