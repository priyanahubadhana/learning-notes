/**
 * Hindi text of redesign step 3 (ink engine, layers, lasso on ink).
 * English is en10.ts.
 */
export const hi10: Record<string, string> = {
  // ---- The drawing region ----
  'ink.region': 'इस पेज पर ड्रॉइंग। स्ट्रोक: {n}',
  'ink.region.step':
    'बनाए गए स्ट्रोक चुनें। तीर वाली कुंजियाँ स्ट्रोक चुनती हैं, Delete हटाती है, Escape छोड़ देती है।',
  'ink.region.selected': 'स्ट्रोक {at} चुना गया',
  'ink.locked': 'बनाने के लिए कोई लेयर अनलॉक करें।',
  'ink.layer.default': 'लेयर {n}',
  'ink.page.highlights': 'हाइलाइट',
  'ink.hl.saved': 'हाइलाइट में सहेजा गया',

  // ---- The menu over selected ink ----
  'ink.sel.menu': 'चुनी हुई ड्रॉइंग',
  'ink.sel.hint':
    'हिलाने के लिए बॉक्स खींचें। आकार बदलने के लिए कोना खींचें। घुमाने के लिए गोल हैंडल खींचें।',
  'ink.sel.duplicate': 'प्रतिलिपि बनाएँ',
  'ink.sel.delete': 'हटाएँ',
  'ink.sel.colour': 'रंग',
  'ink.sel.copyPng': 'चित्र के रूप में कॉपी करें',
  'ink.sel.savePng': 'चित्र के रूप में सहेजें',
  'ink.sel.scale': 'आकार बदलें',
  'ink.sel.rotate': 'घुमाएँ',
  'ink.sel.move': 'हिलाएँ',
  'ink.sel.copied': 'चित्र कॉपी हो गया',
  'ink.sel.saved': 'चित्र सहेजा गया',
  'ink.sel.copyFailed':
    'चित्र कॉपी नहीं हो सका। "चित्र के रूप में सहेजें" आज़माएँ।',
  'ink.sel.count_one': '{count} स्ट्रोक चुना गया',
  'ink.sel.count_other': '{count} स्ट्रोक चुने गए',
  'ink.sel.textOnly': 'यह ड्रॉइंग पर काम करता है: लैसो से स्याही चुनें।',

  // ---- Layers ----
  'tool.inkLayers': 'ड्रॉइंग लेयर',
  'main.card.pen.layers': 'लेयर',
  'main.card.highlighter.layers': 'लेयर',
  'main.card.lasso.layers': 'लेयर',
  'ink.layers': 'लेयर',
  'ink.layers.count': 'लेयर ({n})',
  'ink.layers.add': 'लेयर जोड़ें',
  'ink.layers.max': 'एक पेज पर इससे ज़्यादा लेयर नहीं हो सकतीं।',
  'ink.layers.name': 'लेयर का नाम',
  'ink.layers.show': '{name} दिखाएँ',
  'ink.layers.hide': '{name} छिपाएँ',
  'ink.layers.lock': '{name} लॉक करें',
  'ink.layers.unlock': '{name} अनलॉक करें',
  'ink.layers.up': '{name} ऊपर ले जाएँ',
  'ink.layers.down': '{name} नीचे ले जाएँ',
  'ink.layers.delete': '{name} हटाएँ',
  'ink.layers.deleted': 'लेयर हटाई गई। पूर्ववत करने पर वापस आ जाती है।',
  'ink.layers.draw': '{name} पर बनाएँ',
  'ink.layers.drawing': 'यहाँ बन रहा है',
  'ink.layers.strokes_one': '{count} स्ट्रोक',
  'ink.layers.strokes_other': '{count} स्ट्रोक',
  'ink.layers.empty': 'अभी कोई लेयर नहीं। पहला स्ट्रोक एक बना देगा।',
  'ink.layers.selectAll': '{name} में सब चुनें',
  'ink.paper': 'स्याही के पीछे का कागज़',
  'ink.paper.blank': 'सादा',
  'ink.paper.lined': 'रेखाओं वाला',
  'ink.paper.grid': 'ग्रिड',
  'ink.paper.dots': 'बिंदु',
  'ink.asDrawn': 'जैसा बनाया वैसा देखें',
  'ink.asDrawn.note':
    'स्याही को ठीक वैसे दिखाता है जैसे वह बनी थी, चाहे टेक्स्ट का आकार बदल गया हो। यह रीडर के साथ आएगा।',

  // ---- Pen settings added in step 3 ----
  'ink.pen.shapeSnap': 'आकार सीधे करें',
  'ink.pen.shapeSnap.note':
    'रेखाएँ सीधे कोण पर आती हैं, वर्ग और गोले बराबर रहते हैं।',
  'ink.pen.shapeFill': 'आकार भरें',
  'ink.pen.shapeFill.note': 'बंद आकार हल्के रंग से भर जाते हैं।',
  'ink.finger': 'उँगली से बनाएँ',
  'ink.finger.auto': 'अपने आप',
  'ink.finger.on': 'हमेशा',
  'ink.finger.off': 'कभी नहीं',
  'ink.finger.note':
    'अपने आप: Pencil चलने के बाद या Pencil मोड में उँगली स्क्रोल करती है, वरना बनाती है।',

  // ---- Help tips ----
  'help.tip.ink.layers.meaning':
    'लेयर पेज के ऊपर पारदर्शी शीट जैसी हैं। उन्हें छिपाएँ, लॉक करें या क्रम बदलें।',
  'help.tip.ink.layers.example':
    'सुधार अलग लेयर पर रखें और साफ़ पेज देखने के लिए उसे छिपा दें।',
  'help.tip.ink.finger.meaning':
    'तय करता है कि उँगली से ड्रॉइंग होगी या वह सिर्फ़ स्क्रोल और ज़ूम करेगी।',
  'help.tip.ink.finger.example':
    'Apple Pencil के साथ इसे "अपने आप" पर रखें, ताकि टिका हुआ हाथ कुछ न बनाए।',
}
