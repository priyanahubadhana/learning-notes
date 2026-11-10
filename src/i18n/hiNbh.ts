/** Hindi text of the Notebooks home (draft: needs native review). English is enNbh.ts. */
import { hiRobust } from './hiRobust'

export const hiNbh: Record<string, string> = {
  ...hiRobust,
  'nbh.title': 'नोटबुक',
  'nbh.new': 'नई नोटबुक',
  'nbh.layout': 'दृश्य',
  'nbh.layout.shelf': 'शेल्फ',
  'nbh.layout.list': 'सूची',
  'nbh.today': 'आज',
  'nbh.yesterday': 'कल',
  'nbh.due': '{n} बाकी',
  'nbh.starNamed': '{name} को ऊपर पिन करें',
  'nbh.unstarNamed': '{name} का पिन हटाएँ',
  'nbh.star': 'ऊपर पिन करें',
  'nbh.unstar': 'पिन हटाएँ',
  'nbh.menu': '{name} के विकल्प',
  'nbh.cover.page': 'पहले पृष्ठ को कवर बनाएँ',
  'nbh.cover.colour': 'रंगीन कवर दिखाएँ',
  'nbh.colour.next': 'रंग बदलें',
  'nbh.blankPage': 'खाली पृष्ठ',
  'rvh.title': 'दोहराव',
  'rvh.due': '{n} कार्ड दोहराने के लिए तैयार हैं।',
  'rvh.none': 'अभी कुछ बाकी नहीं है।',
  'rvh.start': 'दोहराव शुरू करें',
  'rvh.allCards': 'सभी कार्ड',
}
