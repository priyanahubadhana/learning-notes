import { toCatalog } from './catalog'

/** Shared by the tests: a valid three-step plan and the catalog it checks against. */
export const CATALOG = toCatalog()

export function validPlan(): Record<string, unknown> {
  return {
    version: 1,
    id: 'job_1',
    goal: 'A notebook with notes and 10 cards',
    origin: 'app',
    destination: { kind: 'new_notebook', title: 'Habits that stick' },
    sources: ['src1', 'src2'],
    effort: 'standard',
    steps: [
      {
        id: 's1',
        tool: 'notebooks.create',
        toolVersion: 1,
        args: { title: 'Habits that stick' },
        placement: { in: '$destination' },
      },
      {
        id: 's2',
        tool: 'pages.write_notes',
        toolVersion: 1,
        args: {
          notebookId: { $from: 's1.notebookId' },
          brief: 'Clear notes with headings',
        },
        placement: { in: 's1.notebookId', tab: 'Notes', position: 'end' },
        dependsOn: ['s1'],
      },
      {
        id: 's3',
        tool: 'cards.make_recall',
        toolVersion: 1,
        args: { pageId: { $from: 's2.pageId' }, count: 10 },
        placement: { in: 's2.pageId', tab: 'Cards' },
        dependsOn: ['s2'],
        optional: true,
        enabled: true,
      },
    ],
    budget: { maxInr: 0 },
  }
}

/** A plan with one step that calls `tool` with `args`. */
export function onePlan(tool: string, args: object): Record<string, unknown> {
  return {
    version: 1,
    id: 'job_x',
    goal: 'test',
    origin: 'app',
    destination: { kind: 'library' },
    steps: [{ id: 's1', tool, toolVersion: 1, args }],
  }
}
