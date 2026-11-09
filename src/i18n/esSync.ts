import { esSettingsSync } from './esSettingsSync'
import { esAccounts } from './esAccounts'
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
  'sync.driveKept': 'Drive: sigue conectado',
  'sync.driveWillAsk': 'Drive: pedirá reconectar (toca para arreglar)',
  'sync.driveSetUp': 'Configurar conexión duradera',
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
  'update.splash': 'Actualizando…',
  'sync.ended.title': 'Se cerró tu sesión',
  'sync.ended.text':
    'Inicia sesión para continuar. Tu cuenta se cerró desde otro dispositivo. Tus notas están a salvo en este dispositivo y ocultas hasta que inicies sesión.',
  'sync.ended.signIn': 'Inicia sesión para continuar',
  'sync.ended.fresh': 'Empezar de cero en este dispositivo',
  'sync.fresh.title': '¿Empezar de cero en este dispositivo?',
  'sync.fresh.text':
    'Se guarda una última copia de seguridad en un archivo, luego se quitan todas las notas de este dispositivo y se abre una app nueva y vacía. Las notas de tu cuenta en la nube no se tocan.',
  'sync.fresh.unsent_one':
    '{count} cambio de este dispositivo nunca se envió a la nube. Solo existirá en el archivo de copia.',
  'sync.fresh.unsent_other':
    '{count} cambios de este dispositivo nunca se enviaron a la nube. Solo existirán en el archivo de copia.',
  'sync.fresh.none':
    'Todos los cambios de este dispositivo ya se enviaron a la nube.',
  'sync.fresh.go': 'Guardar copia y empezar de cero',
  'sync.fresh.working': 'Guardando la copia…',
  'sync.fresh.back': 'Volver',
  'sync.fresh.error':
    'No se pudo terminar. Cierra otras ventanas de la app e inténtalo de nuevo. Comprueba que se guardó el archivo de copia.',
  'sync.choice.title': 'Cambios en este dispositivo y en la nube',
  'sync.choice.text':
    'Mientras tu sesión estaba cerrada, este dispositivo tiene cambios que la nube no tiene.',
  'sync.choice.here': 'Cambiado en este dispositivo: {n}.',
  'sync.choice.there': 'Cambiado en la nube: {n}.',
  'sync.choice.pages_one': '{count} página',
  'sync.choice.pages_other': '{count} páginas',
  'sync.choice.nothing': 'nada',
  'sync.choice.items_one': '{count} elemento',
  'sync.choice.items_other': '{count} elementos',
  'sync.choice.safe':
    'No se borra nada: la versión que no elijas se guarda en el Historial de la página.',
  'sync.choice.merge': 'Combinar ambas',
  'sync.choice.mergeHelp':
    'Conserva las dos. Donde la misma línea difiere, puedes elegir Conservar ambas.',
  'sync.choice.useHere': 'Usar la versión de este dispositivo',
  'sync.choice.hereHelp': 'La versión de la nube pasa al Historial.',
  'sync.choice.useThere': 'Usar la versión de la nube',
  'sync.choice.thereHelp': 'La versión de este dispositivo pasa al Historial.',
  ...esAccounts,
  ...esSettingsSync,
}
