import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db'
import { isLive } from '../../core/records'
import { dayRecord } from '../../core/taskService'
import { t } from '../../i18n/t'

/** The three lists of a day's record, read live from the tasks table. */
export function DayRecordView({ day }: { day: string }) {
  const record = useLiveQuery(async () => {
    if (!day) return null
    const tasks = (await db.tasks.toArray()).filter(isLive)
    return dayRecord(tasks, day)
  }, [day])
  const lists = record
    ? ([
        ['dayRecord.done', record.done],
        ['dayRecord.carried', record.carried],
        ['dayRecord.open', record.open],
      ] as const)
    : []
  const empty = record && lists.every(([, list]) => list.length === 0)
  return (
    <section
      contentEditable={false}
      data-testid="day-record"
      aria-label={t('dayRecord.title')}
      className="w-full rounded-xl border border-line p-3 text-sm"
    >
      <h4 className="mb-1 font-semibold">{t('dayRecord.title')}</h4>
      {empty && <p className="text-muted">{t('dayRecord.none')}</p>}
      {lists.map(([key, list]) =>
        list.length === 0 ? null : (
          <div key={key} className="mt-1.5">
            <h5 className="text-xs font-semibold text-muted">{t(key)}</h5>
            <ul className="list-disc ps-5">
              {list.map((task) => (
                <li key={task.id} className="break-words">
                  {task.title}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </section>
  )
}
