import type { ComponentType } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { Database, DbView } from '../../core/types'
import type { MessageKey } from '../../i18n/t'
import { DashboardView } from '../dashboard/DashboardView'
import { BoardView } from './BoardView'
import { LazyCalendarView } from './LazyCalendar'
import { GalleryView } from './GalleryView'
import { ListView } from './ListView'
import { TableView } from './TableView'

/**
 * View types (Table, Dashboard, Board; Calendar, Gallery later) plug
 * into this registry, so a new view needs no change to the database screen.
 */

export interface ViewProps {
  db: LearningNotesDB
  database: Database
  view: DbView
  onOpenPage: (pageId: string) => void
}

export interface ViewTypeDefinition {
  type: string
  icon: string
  label: MessageKey
  component: ComponentType<ViewProps>
}

const viewTypes = new Map<string, ViewTypeDefinition>()

/** Adds a view type. Throws if the name is taken. */
function registerViewType(definition: ViewTypeDefinition): void {
  if (viewTypes.has(definition.type)) {
    throw new Error(`View type already registered: ${definition.type}`)
  }
  viewTypes.set(definition.type, definition)
}

/** All view types, in registration order. */
export const listViewTypes = (): ViewTypeDefinition[] => [...viewTypes.values()]

export function getViewType(type: string): ViewTypeDefinition | undefined {
  return viewTypes.get(type)
}

registerViewType({
  type: 'table',
  icon: '▤',
  label: 'database.view.table',
  component: TableView,
})

registerViewType({
  type: 'dashboard',
  icon: '◔',
  label: 'database.view.dashboard',
  component: DashboardView,
})

registerViewType({
  type: 'calendar',
  icon: '▦',
  label: 'database.view.calendar',
  component: LazyCalendarView,
})

registerViewType({
  type: 'gallery',
  icon: '◫',
  label: 'database.view.gallery',
  component: GalleryView,
})

registerViewType({
  type: 'board',
  icon: '▥',
  label: 'database.view.board',
  component: BoardView,
})

registerViewType({
  type: 'list',
  icon: '☰',
  label: 'database.view.list',
  component: ListView,
})
