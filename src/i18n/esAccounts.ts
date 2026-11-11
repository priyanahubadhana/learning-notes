/** Spanish text of sign-in methods and Connected accounts (draft: needs native review). English is enAccounts.ts. */
export const esAccounts: Record<string, string> = {
  'signin.title': 'Inicia sesión o crea una cuenta',
  'signin.help':
    'Una cuenta mantiene tus notas en todos tus dispositivos. Después de la primera vez, este dispositivo sigue con la sesión iniciada, incluso sin conexión.',
  'signin.codeBtn': 'Enviarme un código por correo',
  'signin.codeBtnHelp': 'Sin contraseña. Te enviamos un código de 6 dígitos.',
  'signin.passBtn': 'Correo y contraseña',
  'signin.passBtnHelp': 'Crea una cuenta o inicia sesión.',
  'signin.email': 'Correo electrónico',
  'signin.sendCode': 'Enviar código',
  'signin.codeSent':
    'Enviamos un código de 6 dígitos a {email}. Sirve durante una hora. Mira el spam si no llega.',
  'signin.code': 'Código de 6 dígitos',
  'signin.verify': 'Continuar',
  'signin.resend': 'Enviar un código nuevo',
  'signin.password': 'Contraseña',
  'signin.newPassword': 'Contraseña nueva',
  'signin.passHelp':
    'Al menos 15 caracteres. Una frase corta funciona bien. Sin otras reglas.',
  'signin.tabIn': 'Iniciar sesión',
  'signin.tabUp': 'Crear cuenta',
  'signin.forgot': '¿Olvidaste la contraseña?',
  'signin.create': 'Crear cuenta',
  'signin.resetSend': 'Enviarme un código para restablecer',
  'signin.resetGo': 'Guardar contraseña nueva',
  'signin.resetHelp':
    'Te enviaremos un código de 6 dígitos para restablecer la contraseña.',
  'signin.confirmSent':
    'Enviamos un código de 6 dígitos a {email} para confirmarlo. Escríbelo abajo.',
  'signin.back': 'Atrás',
  'signin.busy': 'Trabajando…',
  'signin.pass.short': 'Usa al menos 15 caracteres.',
  'signin.pass.long': 'Usa como máximo 128 caracteres.',
  'signin.err.invalid':
    'No funcionó. Revisa el código o la contraseña e inténtalo de nuevo. Un código sirve durante una hora.',
  'signin.err.badEmail': 'Ese correo no parece correcto.',
  'signin.err.weak': 'Elige una contraseña más larga (15 o más caracteres).',
  'signin.err.exists': 'Este correo ya tiene una cuenta. Inicia sesión.',
  'signin.err.mail':
    'El servicio de correo no pudo enviar el código. Inténtalo de nuevo en un minuto.',
  'signin.err.limit':
    'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  'signin.err.later':
    'No se pudo llegar al servidor, o hubo demasiados intentos. Revisa la conexión, espera un minuto e inténtalo de nuevo.',
  'signin.err.refused':
    'Este correo aún no se puede usar. La app está en pruebas privadas.',
  'signin.err.failed': 'Algo salió mal. Inténtalo de nuevo.',
  'connected.title': 'Cuentas conectadas',
  'connected.help':
    'Las formas de iniciar sesión. Siempre conservas al menos una.',
  'connected.google': 'Google',
  'connected.googleOn': 'Inicia sesión con {email}',
  'connected.googleOff': 'No conectada',
  'connected.code': 'Código por correo',
  'connected.codeOn': 'Un código de 6 dígitos enviado a {email}',
  'connected.codeOff': 'No conectado',
  'connected.password': 'Contraseña',
  'connected.passwordOn':
    'Definida para {email}. Una contraseña se puede cambiar, no quitar.',
  'connected.passwordOff': 'Sin definir',
  'connected.addPassword': 'Añadir una contraseña',
  'connected.changePassword': 'Cambiar contraseña',
  'connected.savePassword': 'Guardar contraseña',
  'connected.passwordSaved': 'Contraseña guardada.',
  'connected.connect': 'Conectar',
  'connected.disconnect': 'Desconectar',
  'connected.confirm':
    '¿Desconectar {name}? Ya no podrás iniciar sesión de esa forma.',
  'connected.confirmGo': 'Desconectar',
  'connected.onlyOne': 'Es tu único método de inicio de sesión.',
  'connected.linkFailed':
    'No se pudo conectar Google. Quizá ya pertenece a otra cuenta.',
  'connected.unlinkFailed': 'No se pudo desconectar. Inténtalo de nuevo.',
  'connected.loading': 'Cargando…',
  'connected.loadFailed':
    'No se pudieron cargar tus métodos de inicio de sesión.',
  'drive.google.title': 'La copia en Drive necesita Google',
  'drive.google.body':
    'Iniciaste sesión con correo, así que tus notas se sincronizan. Las imágenes, libros y grabaciones se guardan en tu propio Google Drive, por eso hay que conectar Google. Sigues iniciando sesión igual.',
  'drive.google.connect': 'Conectar Google para la copia en Drive',
  'attention.driveNeedsGoogle':
    'Hay imágenes en espera: la copia en Drive necesita Google.',
  'gate.banner': 'Inicia sesión para seguir editando y sincronizar tus notas',
  'gate.signIn': 'Iniciar sesión',
  'gate.sheet.title': 'Inicia sesión para seguir editando',
  'gate.sheet.help':
    'Tus notas están a salvo en este dispositivo. Aún puedes leerlas, buscarlas y exportarlas. Inicia sesión para editar de nuevo y sincronizar.',
  'gate.sheet.offline':
    'Estás sin conexión. Leer, buscar y exportar siguen funcionando. Inicia sesión cuando vuelvas a tener conexión.',
  'gate.sheet.later': 'Ahora no',
  'gate.pageBar': 'Solo lectura hasta que inicies sesión',
}
