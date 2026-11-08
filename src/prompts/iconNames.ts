// Names of the bundled drawn icons and the emoji each one becomes in saved text.
// Icons are from Lucide (ISC licence, see ICONS-LICENSE.txt). No brand icons.
export const ICON_EMOJI: Record<string, string> = {
  'book-open': '📖',
  lightbulb: '💡',
  brain: '🧠',
  'flask-conical': '🧪',
  atom: '⚛️',
  calculator: '🧮',
  globe: '🌍',
  landmark: '🏛️',
  scale: '⚖️',
  'heart-pulse': '❤️',
  leaf: '🍃',
  music: '🎵',
  palette: '🎨',
  code: '💻',
  cpu: '🖥️',
  microscope: '🔬',
  dna: '🧬',
  languages: '🔤',
  clock: '⏰',
  calendar: '📅',
  target: '🎯',
  trophy: '🏆',
  flag: '🚩',
  key: '🔑',
  shield: '🛡️',
  star: '⭐',
  flame: '🔥',
  zap: '⚡',
  rocket: '🚀',
  compass: '🧭',
  map: '🗺️',
  pencil: '✏️',
  'graduation-cap': '🎓',
  library: '📚',
  scroll: '📜',
  hammer: '🔨',
  wrench: '🔧',
  coins: '🪙',
  'chart-line': '📈',
  'chart-bar': '📊',
  users: '👥',
  'message-circle': '💬',
  'triangle-alert': '⚠️',
  'circle-help': '❓',
  check: '✅',
  quote: '❝',
  link: '🔗',
  camera: '📷',
  mic: '🎤',
  sun: '☀️',
  moon: '🌙',
  cloud: '☁️',
  droplet: '💧',
  mountain: '⛰️',
  'tree-pine': '🌲',
  bug: '🐛',
  puzzle: '🧩',
  gem: '💎',
  bookmark: '🔖',
  pill: '💊',
  stethoscope: '🩺',
  plane: '✈️',
  house: '🏠',
  utensils: '🍴',
  telescope: '🔭',
  lock: '🔒',
}

/** The drawn icon's name when an icon value is lucide:name and known, else ''. */
export function iconName(icon: string): string {
  const name = icon.startsWith('lucide:') ? icon.slice(7) : ''
  return Object.hasOwn(ICON_EMOJI, name) ? name : ''
}

/** The plain-text symbol of an icon: the emoji of a drawn icon, else the value itself. */
export function iconSymbol(icon: string): string {
  const name = iconName(icon)
  return name ? ICON_EMOJI[name] : icon.startsWith('lucide:') ? '' : icon
}
