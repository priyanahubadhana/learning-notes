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
  'settings.showRefresh.label': 'ऊपर की पट्टी में रीफ़्रेश बटन दिखाएँ',
  'settings.showRefresh.description':
    'वापस और आगे के पास एक रीफ़्रेश बटन। यह पहले सहेजता है, फिर उसी पन्ने पर ऐप दोबारा शुरू करता है।',
  'nav.refresh': 'ऐप रीफ़्रेश करें',
  'sync.allOn.notice':
    'अब सब कुछ सिंक होता है, AI कुंजियाँ भी (एंड-टू-एंड एन्क्रिप्टेड, बैकअप में कभी नहीं)। आप इसे सेटिंग्स में बदल सकते हैं।',
  'sync.allOn.change': 'देखें',
  'history.reason.big': 'बड़ा बदलाव',
  'history.reason.leave': 'पन्ना छोड़ते समय',
  'history.reason.before-restore': 'वापस लाने से पहले',
  'history.contains':
    'बॉक्स: {boxes}। चित्रांकन: {ink}। वापस लाने पर पूरा पन्ना लौट आता है।',
  'history.inkYes': 'हाँ',
  'history.inkNo': 'कोई नहीं',
}
