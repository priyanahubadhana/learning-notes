import { t, type MessageKey } from './t'

/**
 * The app's own names (starter templates, a new notebook) are stored in
 * English, so that a template in a backup still matches the one in the app.
 * They are shown in the chosen language instead. A title the user wrote
 * stays exactly as written: only these exact English names are translated.
 */
const DEFAULT_NAMES: Record<string, MessageKey> = {
  'Daily journal': 'template.daily',
  'Study notes': 'template.study',
  'Meeting notes': 'template.meeting',
  'Reading notes': 'template.reading',
  'Project plan': 'template.project',
  Lesson: 'templates.lesson',
  'Lesson (large topic)': 'templates.lessonLarge',
  'Detailed notes': 'templates.lesson.notes',
  'Keyword summary': 'templates.lesson.summary',
  Flashcards: 'templates.lesson.cards',
  Overview: 'templates.lesson.overview',
  'All cards': 'templates.lesson.allCards',
  'New notebook': 'notebook.newName',
  'My Notebook': 'notebook.firstName',
}

/** The name to show for a stored title (translated only for the app's own names). */
export function displayName(title: string): string {
  const key = Object.hasOwn(DEFAULT_NAMES, title)
    ? DEFAULT_NAMES[title]
    : undefined
  return key ? t(key) : title
}
