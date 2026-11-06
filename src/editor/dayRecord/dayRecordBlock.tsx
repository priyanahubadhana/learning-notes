import { createReactBlockSpec } from '@blocknote/react'
import { DayRecordView } from './DayRecordView'

/**
 * The `dayRecord` block (F1): a read-only record of one day's tasks (done,
 * carried to another day, still open). It stores only the day (`day`,
 * "YYYY-MM-DD"); the lists are read from the tasks table each time, so they
 * are never out of date. No inline text.
 */
export const createDayRecordBlock = createReactBlockSpec(
  {
    type: 'dayRecord',
    propSchema: { day: { default: '' } },
    content: 'none',
  },
  {
    render: ({ block }) => (
      <DayRecordView day={(block.props as { day: string }).day} />
    ),
  },
)
