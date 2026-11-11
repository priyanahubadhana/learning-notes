/** Hindi text of sign-in methods and Connected accounts (draft: needs native review). English is enAccounts.ts. */
export const hiAccounts: Record<string, string> = {
  'signin.title': 'साइन इन करें या खाता बनाएँ',
  'signin.help':
    'एक खाता आपके नोट सभी डिवाइस पर रखता है। पहली बार के बाद यह डिवाइस साइन इन रहता है, ऑफ़लाइन में भी।',
  'signin.codeBtn': 'मुझे ईमेल पर कोड भेजें',
  'signin.codeBtnHelp': 'पासवर्ड नहीं। हम 6 अंकों का कोड भेजते हैं।',
  'signin.passBtn': 'ईमेल और पासवर्ड',
  'signin.passBtnHelp': 'खाता बनाएँ या साइन इन करें।',
  'signin.email': 'ईमेल',
  'signin.sendCode': 'कोड भेजें',
  'signin.codeSent':
    'हमने {email} पर 6 अंकों का कोड भेजा है। यह एक घंटे चलता है। न आए तो स्पैम देखें।',
  'signin.code': '6 अंकों का कोड',
  'signin.verify': 'आगे बढ़ें',
  'signin.resend': 'नया कोड भेजें',
  'signin.password': 'पासवर्ड',
  'signin.newPassword': 'नया पासवर्ड',
  'signin.passHelp':
    'कम से कम 15 अक्षर। एक छोटा वाक्य अच्छा रहता है। और कोई नियम नहीं।',
  'signin.tabIn': 'साइन इन',
  'signin.tabUp': 'खाता बनाएँ',
  'signin.forgot': 'पासवर्ड भूल गए?',
  'signin.create': 'खाता बनाएँ',
  'signin.resetSend': 'रीसेट कोड ईमेल करें',
  'signin.resetGo': 'नया पासवर्ड सेट करें',
  'signin.resetHelp': 'पासवर्ड रीसेट के लिए हम 6 अंकों का कोड ईमेल करेंगे।',
  'signin.confirmSent':
    'पुष्टि के लिए हमने {email} पर 6 अंकों का कोड भेजा है। नीचे लिखें।',
  'signin.back': 'वापस',
  'signin.busy': 'काम हो रहा है…',
  'signin.pass.short': 'कम से कम 15 अक्षर रखें।',
  'signin.pass.long': 'अधिकतम 128 अक्षर रखें।',
  'signin.err.invalid':
    'यह काम नहीं किया। कोड या पासवर्ड जाँचकर फिर कोशिश करें। कोड एक घंटे चलता है।',
  'signin.err.badEmail': 'यह ईमेल पता सही नहीं लगता।',
  'signin.err.weak': 'लंबा पासवर्ड चुनें (15 या अधिक अक्षर)।',
  'signin.err.exists': 'इस ईमेल का खाता पहले से है। साइन इन करें।',
  'signin.err.mail':
    'ईमेल सेवा ने कोड भेजने से मना कर दिया। एक मिनट बाद फिर कोशिश करें।',
  'signin.err.limit': 'बहुत ज़्यादा कोशिशें। एक मिनट रुककर फिर करें।',
  'signin.err.later':
    'सर्वर तक नहीं पहुँच सके, या बहुत कोशिशें हुईं। कनेक्शन देखें, एक मिनट रुकें और फिर करें।',
  'signin.err.refused':
    'यह ईमेल अभी इस्तेमाल नहीं हो सकता। ऐप निजी जाँच में है।',
  'signin.err.failed': 'कुछ गड़बड़ हुई। फिर कोशिश करें।',
  'connected.title': 'जुड़े हुए खाते',
  'connected.help': 'साइन इन करने के तरीके। कम से कम एक हमेशा रहता है।',
  'connected.google': 'Google',
  'connected.googleOn': '{email} से साइन इन',
  'connected.googleOff': 'जुड़ा नहीं',
  'connected.code': 'ईमेल कोड',
  'connected.codeOn': '{email} पर भेजा गया 6 अंकों का कोड',
  'connected.codeOff': 'जुड़ा नहीं',
  'connected.password': 'पासवर्ड',
  'connected.passwordOn':
    '{email} के लिए सेट है। पासवर्ड बदला जा सकता है, हटाया नहीं।',
  'connected.passwordOff': 'सेट नहीं',
  'connected.addPassword': 'पासवर्ड जोड़ें',
  'connected.changePassword': 'पासवर्ड बदलें',
  'connected.savePassword': 'पासवर्ड सहेजें',
  'connected.passwordSaved': 'पासवर्ड सहेज लिया।',
  'connected.connect': 'जोड़ें',
  'connected.disconnect': 'हटाएँ',
  'connected.confirm':
    '{name} हटाएँ? फिर आप इस तरीके से साइन इन नहीं कर पाएँगे।',
  'connected.confirmGo': 'हटाएँ',
  'connected.onlyOne': 'यह आपका अकेला साइन-इन तरीका है।',
  'connected.linkFailed':
    'Google नहीं जुड़ सका। हो सकता है वह किसी और खाते का हो।',
  'connected.unlinkFailed': 'हटा नहीं सके। फिर कोशिश करें।',
  'connected.loading': 'लोड हो रहा है…',
  'connected.loadFailed': 'आपके साइन-इन तरीके लोड नहीं हो सके।',
  'drive.google.title': 'Drive बैकअप के लिए Google चाहिए',
  'drive.google.body':
    'आपने ईमेल से साइन इन किया है, इसलिए आपके नोट्स सिंक होते हैं। तस्वीरें, किताबें और रिकॉर्डिंग आपके अपने Google Drive में बैकअप होती हैं, इसलिए Google जोड़ना ज़रूरी है। आपका साइन इन वैसा ही रहेगा।',
  'drive.google.connect': 'Drive बैकअप के लिए Google जोड़ें',
  'attention.driveNeedsGoogle':
    'तस्वीरें इंतज़ार कर रही हैं: Drive बैकअप के लिए Google चाहिए।',
  'gate.banner': 'संपादन जारी रखने और नोट्स सिंक करने के लिए साइन इन करें',
  'gate.signIn': 'साइन इन',
  'gate.sheet.title': 'संपादन जारी रखने के लिए साइन इन करें',
  'gate.sheet.help':
    'आपके नोट्स इस डिवाइस पर सुरक्षित हैं। आप उन्हें पढ़ सकते हैं, खोज सकते हैं और एक्सपोर्ट कर सकते हैं। दोबारा संपादन और सिंक के लिए साइन इन करें।',
  'gate.sheet.offline':
    'आप ऑफ़लाइन हैं। पढ़ना, खोजना और एक्सपोर्ट अब भी चलते हैं। ऑनलाइन होने पर साइन इन करें।',
  'gate.sheet.later': 'अभी नहीं',
  'gate.pageBar': 'साइन इन करने तक केवल पढ़ने के लिए',
}
