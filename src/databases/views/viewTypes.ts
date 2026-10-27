import type { ComponentType } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { Database, DbView } from '../../core/types'
import type { MessageKey } from '../../i18n/t'
import { DashboardView } from '../dashboard/DashboardView'
import { TableView } from './TableView'

/**
 * View types (Table now; Dashboard, Board, Calendar, Gallery later) plug
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
export function registerViewType(definition: ViewTypeDefinition): void {
  if (viewTypes.has(definition.type)) {
    throw new Error(`View type already registered: ${definition.type}`)
  }
  viewTypes.set(definition.type, definition)
}

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
