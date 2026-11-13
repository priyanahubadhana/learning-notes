import { IconButton, type MenuItem } from '../app/ui'
import { useFlag } from '../app/flags'
import { RowMenu } from '../app/RowStrip'
import { rowHoldMs, type RowPoint } from '../app/rowStripLogic'
import { useState } from 'react'
import { useLongPress } from '../app/useLongPress'
import type { HTMLAttributes } from 'react'
import { useAnchoredMenu } from '../app/tools/useAnchoredMenu'
import { showsCarried } from '../core/taskService'
import type { Project, Task } from '../core/homeTypes'
import { shortDayLabel } from './dayLabel'
import { t } from '../i18n/t'
import { TaskMenu, type TaskActions } from './TaskMenu'
import { Icon } from '../app/tools/icons'

/**
 * One task: a tick, the title (drag it by the title), a quiet "carried 3×"
 * from the third carry on, its day, project and a "…" menu (F1).
 */
export function TaskRow({
  task,
  projects,
  today,
  actions,
  onTick,
  dragProps,
  showDay = true,
  extra,
}: {
  task: Task
  projects: readonly Project[]
  today: string
  actions: TaskActions
  onTick: (task: Task) => void
  dragProps?: HTMLAttributes<HTMLElement>
  showDay?: boolean
  extra?: React.ReactNode
}) {
  const menu = useAnchoredMenu()
  // Flag page.menus: a long-press opens the strip at the press point (PM-23).
  const stripOn = useFlag('page.menus')
  const [strip, setStrip] = useState<{ at: RowPoint; rect: DOMRect } | null>(
    null,
  )
  // Press and hold the row (finger or Pencil) = the same as its ⋯ button.
  const hold = useLongPress(
    (x, y) => {
      const row = document.elementFromPoint(x, y)?.closest('[data-task-id]')
      const button = row?.querySelector<HTMLElement>(
        '[data-testid="task-menu-button"]',
      )
      if (stripOn && row)
        setStrip({ at: { x, y }, rect: row.getBoundingClientRect() })
      else if (button) menu.openAt(button)
    },
    true,
    rowHoldMs,
  )
  const done = task.status === 'done'
  const stripItems = (): MenuItem[] => {
    const items: MenuItem[] = []
    if (task.status === 'open')
      items.push({
        label: t('home.carry.tomorrow'),
        icon: 'calendar',
        onSelect: () => actions.tomorrow(task),
      })
    if (task.sourcePageId && actions.openSource)
      items.push({
        label: t('home.openNote'),
        icon: 'fileText',
        onSelect: () => actions.openSource?.(task),
      })
    items.push({
      label: t('home.task.delete'),
      icon: 'trash',
      danger: true,
      onSelect: () => actions.remove(task),
    })
    return items
  }
  const project = projects.find((p) => p.id === task.projectId)
  return (
    <li
      data-testid="task-row"
      data-task-id={task.id}
      {...hold}
      className="flex min-h-11 items-center gap-1 rounded-lg border border-line bg-bg ps-1 pe-0.5"
    >
      <IconButton
        tip="home.tick"
        bare
        tipClassName="inline-flex shrink-0"
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={t(done ? 'home.task.untick' : 'home.task.tick', {
          title: task.title,
        })}
        onClick={() => onTick(task)}
        className="grid size-11 shrink-0 place-items-center"
      >
        <span
          aria-hidden
          className={`grid size-5 place-items-center rounded-md border-2 text-xs ${
            done ? 'border-accent bg-accent text-white' : 'border-ink-soft'
          }`}
        >
          {done ? <Icon name="check" size={14} /> : ''}
        </span>
      </IconButton>
      <div
        {...dragProps}
        className="min-w-0 flex-1 cursor-grab py-1.5 select-none"
        style={{ touchAction: 'pan-y' }}
      >
        <span
          className={`block text-sm break-words ${done ? 'text-muted line-through' : ''}`}
        >
          {task.title}
        </span>
        <span className="flex flex-wrap gap-x-2 text-xs text-muted">
          {showDay && task.plannedDay && task.plannedDay !== today && (
            <span>{shortDayLabel(task.plannedDay)}</span>
          )}
          {showDay && task.plannedDay === today && !done && (
            <span>{t('home.today')}</span>
          )}
          {project && <span>{project.name}</span>}
          {task.listName && <span>{task.listName}</span>}
          {task.sourcePageId && <span>{t('home.fromNote')}</span>}
          {showsCarried(task) && (
            <span>{t('home.carried', { count: task.carried.length })}</span>
          )}
        </span>
      </div>
      {extra}
      <IconButton
        tip="home.taskMenu"
        bare
        tipClassName="inline-flex shrink-0"
        type="button"
        data-testid="task-menu-button"
        aria-label={t('home.task.menuFor', { title: task.title })}
        onClick={menu.toggle}
        {...menu.trigger}
        className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-hover"
      >
        ⋯
      </IconButton>
      {strip && (
        <RowMenu
          anchor={strip.rect}
          at={strip.at}
          items={stripItems()}
          onClose={() => setStrip(null)}
          all={{
            label: t('home.task.menu'),
            open: () => {
              const b = document.querySelector<HTMLElement>(
                `[data-task-id="${task.id}"] [data-testid="task-menu-button"]`,
              )
              if (b) menu.openAt(b)
            },
          }}
        />
      )}
      {menu.open && (
        <TaskMenu
          menu={menu}
          task={task}
          projects={projects}
          today={today}
          actions={actions}
        />
      )}
    </li>
  )
}
