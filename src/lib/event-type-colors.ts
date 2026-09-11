export interface EventTypeRecord {
  id: string
  name: string
  color: string
  sort_order: number
}

const COLOR_CLASSES: Record<string, { calendar: string; timeline: string; badge: string }> = {
  blue:   { calendar: 'bg-blue-100 text-blue-800 border-blue-200',     timeline: 'bg-blue-500 border-blue-600',     badge: 'bg-blue-100 text-blue-800' },
  green:  { calendar: 'bg-green-100 text-green-800 border-green-200',   timeline: 'bg-green-500 border-green-600',   badge: 'bg-green-100 text-green-800' },
  pink:   { calendar: 'bg-pink-100 text-pink-800 border-pink-200',     timeline: 'bg-pink-500 border-pink-600',     badge: 'bg-pink-100 text-pink-800' },
  yellow: { calendar: 'bg-yellow-100 text-yellow-800 border-yellow-200', timeline: 'bg-yellow-500 border-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
  orange: { calendar: 'bg-orange-100 text-orange-800 border-orange-200', timeline: 'bg-orange-500 border-orange-600', badge: 'bg-orange-100 text-orange-800' },
  purple: { calendar: 'bg-purple-100 text-purple-800 border-purple-300', timeline: 'bg-purple-500 border-purple-600', badge: 'bg-purple-100 text-purple-800' },
  red:    { calendar: 'bg-red-100 text-red-800 border-red-200',       timeline: 'bg-red-500 border-red-600',       badge: 'bg-red-100 text-red-800' },
  teal:   { calendar: 'bg-teal-100 text-teal-800 border-teal-200',     timeline: 'bg-teal-500 border-teal-600',     badge: 'bg-teal-100 text-teal-800' },
  indigo: { calendar: 'bg-indigo-100 text-indigo-800 border-indigo-200', timeline: 'bg-indigo-500 border-indigo-600', badge: 'bg-indigo-100 text-indigo-800' },
  cyan:   { calendar: 'bg-cyan-100 text-cyan-800 border-cyan-200',     timeline: 'bg-cyan-500 border-cyan-600',     badge: 'bg-cyan-100 text-cyan-800' },
  gray:   { calendar: 'bg-gray-100 text-gray-800 border-gray-200',     timeline: 'bg-gray-500 border-gray-600',     badge: 'bg-gray-100 text-gray-800' },
}

export const AVAILABLE_COLORS = [
  { key: 'blue', label: 'Blue' },
  { key: 'green', label: 'Green' },
  { key: 'pink', label: 'Pink' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'orange', label: 'Orange' },
  { key: 'purple', label: 'Purple' },
  { key: 'red', label: 'Red' },
  { key: 'teal', label: 'Teal' },
  { key: 'indigo', label: 'Indigo' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'gray', label: 'Gray' },
]

export function getEventTypeColor(
  typeName: string | null,
  eventTypes: EventTypeRecord[],
  variant: 'calendar' | 'timeline' | 'badge'
): string {
  if (!typeName) return COLOR_CLASSES.gray[variant]
  // Interview is a special case — comes from the interviews module, not event_types
  if (typeName === 'Interview') return COLOR_CLASSES.purple[variant]
  const eventType = eventTypes.find(et => et.name === typeName)
  const colorKey = eventType?.color || 'gray'
  return COLOR_CLASSES[colorKey]?.[variant] || COLOR_CLASSES.gray[variant]
}

export function getColorDotClass(colorKey: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', pink: 'bg-pink-500',
    yellow: 'bg-yellow-500', orange: 'bg-orange-500', purple: 'bg-purple-500',
    red: 'bg-red-500', teal: 'bg-teal-500', indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-500', gray: 'bg-gray-500',
  }
  return map[colorKey] || 'bg-gray-500'
}
