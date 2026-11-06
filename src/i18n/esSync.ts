/** Spanish text of Sync (Phase L; draft: needs native review). English is enSync.ts. */
export const esSync: Record<string, string> = {
  'settings.category.sync': 'Sincronizar',
  'settings.category.sync.hint':
    'Mantén tus notas iguales en el iPad y el PC, cerradas para que solo tú puedas leerlas.',
  'sync.title': 'Sincronizar',
  'sync.intro':
    'Tus notas se cierran en este dispositivo antes de salir. El servidor y Google Drive solo guardan copias cerradas. Iniciar o cerrar sesión nunca borra las notas de este dispositivo.',
  'sync.signIn': 'Iniciar sesión con Google',
  'sync.signedInAs': 'Sesión iniciada como {email}',
  'sync.signOut': 'Cerrar sesión en este dispositivo',
  'sync.signOutForget': 'Cerrar sesión y olvidar la clave aquí',
  'sync.setupTitle': 'Elige tu frase de sincronización',
  'sync.setupHelp':
    'Abre tus notas en un dispositivo nuevo. Usa cuatro o más palabras que recuerdes, por ejemplo una frase corta. Nunca se envía a ningún sitio.',
  'sync.passphrase': 'Frase',
  'sync.passphraseAgain': 'Escríbela otra vez',
  'sync.tooShort': 'Usa al menos 12 letras.',
  'sync.tooSimple': 'Añade una o dos palabras más.',
  'sync.noMatch': 'Las dos no coinciden.',
  'sync.create': 'Cerrar mis notas y empezar',
  'sync.working': 'Trabajando… (tarda unos segundos)',
  'sync.codeTitle': 'Tu código de recuperación impreso',
  'sync.codeHelp':
    'Si olvidas la frase, este código es la única otra forma de entrar. Imprímelo o escríbelo y guárdalo en un lugar seguro, lejos del iPad. Sin la frase y este código, nadie (ni tú) puede abrir las notas.',
  'sync.print': 'Imprimir',
  'sync.codeCheck':
    'Escribe las cuatro últimas letras del código para confirmar que lo guardaste',
  'sync.codeDone': 'Ya lo guardé',
  'sync.codeWrong': 'Esas no son las cuatro últimas letras.',
  'sync.unlockTitle': 'Abre tus notas en este dispositivo',
  'sync.unlockHelp':
    'Escribe tu frase de sincronización o el código de recuperación impreso. Las notas que ya hay en este dispositivo se quedan y se suman a las otras.',
  'sync.unlock': 'Abrir',
  'sync.wrongSecret': 'Eso no abre las notas. Revisa la frase o el código.',
  'sync.ready': 'La sincronización está activada.',
  'sync.syncing': 'Sincronizando…',
  'sync.syncNow': 'Sincronizar ahora',
  'sync.last': 'Última sincronización {time}',
  'sync.never': 'Aún sin sincronizar',
  'sync.offline':
    'No se pudo llegar al servidor. Tus notas están a salvo aquí; se volverá a intentar pronto.',
  'sync.notAllowed':
    'Esta cuenta no está permitida. Solo la cuenta de Google del propietario puede sincronizar.',
  'sync.unreadable':
    'Algunos elementos no se pudieron abrir (otra clave o dañados). Se omitieron.',
  'sync.clock':
    'El reloj de otro dispositivo parece incorrecto (muy en el futuro). Revisa allí la fecha y la hora.',
  'sync.failed':
    'La sincronización se detuvo por un error. Tus notas están a salvo aquí.',
  'sync.driveTap':
    'Google Drive necesita un toque para reconectarse (las imágenes y la clave de reserva esperan hasta entonces).',
  'sync.reconnectDrive': 'Reconectar Drive',
  'sync.merged_one':
    '{count} página se cambió en dos dispositivos. La otra versión está en su Historial.',
  'sync.merged_other':
    '{count} páginas se cambiaron en dos dispositivos. Las otras versiones están en su Historial.',
  'sync.ok': 'Vale',
  'sync.privacy':
    'Lo que el servidor aún ve: cuándo sincronizas, cuántos elementos y su tamaño. No el texto, los títulos, las etiquetas ni las imágenes.',
  'sync.testTitle': 'Comprobar este dispositivo',
  'sync.testHelp':
    'Mide el cierre con la frase (Argon2id) y comprueba las herramientas de cifrado del navegador. No se envía nada.',
  'sync.testRun': 'Comprobar',
  'sync.testResult':
    'Tiempo de cierre {ms} ms · Web Crypto {crypto} · Datos protegidos {persist}',
  'sync.yes': 'sí',
  'sync.no': 'no',
}
