import { t, type MessageKey } from '../i18n/t'

/**
 * The plan checker writes its reasons in English (they are also what Claude
 * reads through the connector). The paste box shows them in the person's
 * language by matching the sentence here. A sentence that is not matched is
 * shown as it is. `validatorText.test.ts` runs the sentences through it.
 */
const TYPES: Readonly<Record<string, MessageKey>> = {
  'an object': 'aifw.val.t.object',
  'a list': 'aifw.val.t.array',
  text: 'aifw.val.t.string',
  'a number': 'aifw.val.t.number',
  'a whole number': 'aifw.val.t.integer',
  'true or false': 'aifw.val.t.boolean',
}

const PLAIN: Readonly<Record<string, MessageKey>> = {
  'This cannot be empty.': 'aifw.val.empty',
  'This is not in the expected format.': 'aifw.val.format',
  'This is required.': 'aifw.val.required',
  'This field is not allowed here.': 'aifw.val.notAllowed',
  'This number is not allowed.': 'aifw.val.badNumber',
  'This list is too long.': 'aifw.val.longList',
  'This is not plain JSON.': 'aifw.val.plain',
  'This name is not allowed.': 'aifw.val.badName',
  'This is nested too deeply.': 'aifw.val.deep',
  'The plan has too many parts.': 'aifw.val.parts',
  'The plan is bigger than 256 KB.': 'aifw.val.big',
}

const COUNTED: ReadonlyArray<[RegExp, MessageKey]> = [
  [/^This must have at least (\d+) characters\.$/, 'aifw.val.minChars'],
  [/^This must have at most (\d+) characters\.$/, 'aifw.val.maxChars'],
  [/^This must be at least (-?[\d.]+)\.$/, 'aifw.val.min'],
  [/^This must be at most (-?[\d.]+)\.$/, 'aifw.val.max'],
  [/^This needs at least (\d+) items?\.$/, 'aifw.val.minItems'],
  [/^This can have at most (\d+) items\.$/, 'aifw.val.maxItems'],
]

/** One checker sentence in the app's language (unknown sentences stay English). */
export function validatorText(message: string): string {
  const plain = PLAIN[message]
  if (plain) return t(plain)
  for (const [re, key] of COUNTED) {
    const m = re.exec(message)
    if (m) return t(key, { n: m[1] })
  }
  const one = /^This must be one of: (.+)\.$/.exec(message)
  if (one) return t('aifw.val.oneOf', { list: one[1] })
  const exact = /^This must be (".*")\.$/.exec(message)
  if (exact) return t('aifw.val.exact', { value: exact[1] })
  const type = /^This must be (.+)\.$/.exec(message)
  if (type && TYPES[type[1]])
    return t('aifw.val.must', { what: t(TYPES[type[1]]) })
  const some = /^Give at least one of: (.+)\.$/.exec(message)
  if (some) return t('aifw.val.atLeastOne', { list: some[1] })
  return message
}

/** A problem line from the checker: a code or `path: sentence`, translated. */
export function problemText(p: string): string {
  if (p === ':empty') return t('aifw.paste.empty')
  if (p === ':json') return t('aifw.paste.json')
  if (p === ':object') return t('aifw.paste.object')
  if (p.startsWith(':missing '))
    return t('aifw.paste.missing', { field: p.slice(9) })
  const at = p.indexOf(': ')
  if (at < 0) return p
  return `${p.slice(0, at)}: ${validatorText(p.slice(at + 2))}`
}
