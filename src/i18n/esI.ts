/** Spanish text of Phase I (draft: needs native review). English is enI.ts. */
export const esI: Record<string, string> = {
  'notebook.view.button': 'Vista: {name} ▾',
  'notebook.view.default': 'Normal',
  'notebook.view.shelf': 'Estante',
  'notebook.view.tabs': 'Pestañas',
  'notebook.layout.button': 'Diseño: {name} ▾',
  'notebook.layout.list': 'Lista',
  'notebook.layout.gallery': 'Galería',
  'notebook.layout.table': 'Tabla',
  'notebook.layout.board': 'Tablero',
  'notebook.col.title': 'Página',
  'notebook.col.sub': 'Subpáginas',
  'notebook.col.changed': 'Cambiada',
  'notebook.board.none': 'Sin color',
  'notebook.board.coloured': 'Con color',
  'notebook.sectionTabs': 'Secciones',
  'notebook.openSection': 'Abrir {name}',
  'notebook.tabColour': 'Color de la pestaña',
  'notebook.tabColourSet': 'Color {n}',
  'notebook.tabColourNone': 'Sin color',
  'notebook.noSubPages': 'Aún no hay subpáginas en esta sección.',
  'help.tip.notebook.viewMenu.meaning':
    'Elige cómo muestra este cuaderno sus páginas: la forma habitual, un estante de portadas o pestañas de colores.',
  'help.tip.notebook.viewMenu.example':
    'Elige Estante para ver tus páginas como una fila de cuadernos.',
  'help.tip.notebook.layoutMenu.meaning':
    'Elige cómo lista esta pestaña las páginas: lista, galería, tabla o tablero. Se recuerda.',
  'help.tip.notebook.layoutMenu.example':
    'Elige Galería para ver una vista previa de cada página.',

  'layers.open': 'Galería de capas',
  'layers.title': 'Galería de capas',
  'layers.close': 'Cerrar la galería de capas',
  'layers.intro':
    'Una capa añade un conjunto de cuadernos ya preparado. Son notas normales que puedes cambiar. Quitar elimina solo lo que nunca cambiaste.',
  'layers.whatItAdds': 'Qué añade',
  'layers.add': 'Añadir',
  'layers.adding': 'Añadiendo…',
  'layers.remove': 'Quitar',
  'layers.removeRest': 'Quitar el resto',
  'layers.yours': 'Añadidas desde archivos',
  'layers.addFile': 'Añadir un archivo de capa…',
  'layers.addFileHint': 'Un archivo que te compartió un amigo.',
  'layers.added': 'Se añadió «{name}».',
  'layers.removed_one': 'Se quitó «{name}» (1 elemento, en la papelera).',
  'layers.removed_other':
    'Se quitó «{name}» ({count} elementos, en la papelera).',
  'layers.askRemove':
    'Cambiaste algunas cosas de «{name}»: {list}. Se quedarán. ¿Quitar todo lo demás?',
  'layers.share': 'Compartir como archivo de capa',
  'layers.shared':
    'Archivo de capa guardado. Un amigo puede abrirlo en Galería de capas › Añadir un archivo de capa.',
  'layers.err.manifest': 'La descripción de este archivo de capa está dañada.',
  'layers.err.notLayer': 'Este no es un archivo de capa.',
  'layers.err.already':
    '«{name}» ya está añadida. Quítala primero para añadirla de nuevo.',
  'layers.finance-tracker.name': 'Control de finanzas',
  'layers.finance-tracker.desc':
    'Lleva el control de la paga, los gastos y los ahorros.',
  'layers.finance-tracker.add1':
    'Una tabla de Movimientos con fecha, importe y categoría',
  'layers.finance-tracker.add2': 'Un Panel y un Tablero según la categoría',
  'layers.finance-tracker.add3':
    'Una página de ayuda y una de revisión mensual',
  'layers.memory-kit.name': 'Kit de técnicas de memoria',
  'layers.memory-kit.desc':
    'Aprende los trucos principales de memoria con tarjetas de práctica.',
  'layers.memory-kit.add1':
    'Páginas de palacio de la memoria, acrónimos y práctica espaciada',
  'layers.memory-kit.add2': 'Tarjetas de repaso para cada técnica',
  'layers.memory-kit.add3':
    'Una página de inicio que explica por qué funcionan las imágenes',
  'layers.study-kit.name': 'Kit de estudio',
  'layers.study-kit.desc': 'Planifica tu semana y estudia de forma eficaz.',
  'layers.study-kit.add1': 'Un plan semanal con lista para el examen',
  'layers.study-kit.add2': 'Una página de notas Cornell',
  'layers.study-kit.add3': 'Una página de control Feynman con una tarjeta',

  // ---- Claude connector consent screen ----
  'connect.title': 'Conectar Claude',
  'connect.intro':
    '{name} quiere usar tus Learning Notes. Nunca ve tu contraseña.',
  'connect.canDo': 'Podrá:',
  'connect.sendsTo': 'Después de elegir, volverás a {host}.',
  'connect.allow': 'Permitir',
  'connect.deny': 'Ahora no',
  'connect.signIn':
    'Primero inicia sesión en Learning Notes en este navegador (Ajustes › Cuenta) y vuelve a conectar desde Claude.',
  'connect.open': 'Abrir Learning Notes',
  'connect.bad':
    'Este enlace de conexión no es válido. Empieza de nuevo desde Claude.',
  'connect.error':
    'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
  'connect.working': 'Conectando…',
  'connect.scope.read': 'Leer tus cuadernos, páginas y tarjetas de repaso',
  'connect.scope.write':
    'Crear cuadernos, páginas, tarjetas y bases de datos, y añadir a las páginas. Nunca puede borrar nada.',

  // ---- Ajustes > Claude ----
  'settings.category.claude': 'Claude',
  'settings.category.claude.hint':
    'Deja que Claude en claude.ai lea tus notas y añada contenido.',
  'claude.title': 'Dejar que Claude trabaje con mis notas',
  'claude.what':
    'Si lo activas, Claude en claude.ai (web, escritorio o móvil) puede buscar y leer los cuadernos que elijas, y añadir cuadernos, páginas y tarjetas de repaso nuevos. Nunca puede borrar ni cambiar lo que ya escribiste. Lo que añada se puede quitar con "Quitar este resultado de IA".',
  'claude.privacy.title': 'Qué significa para tu privacidad',
  'claude.privacy.1':
    'Tus notas están cifradas de extremo a extremo, así que normalmente ni el servidor puede leerlas. Para dejar entrar a Claude, la app le da al servidor tu clave de cifrado una vez. El servidor la guarda bloqueada con un secreto que no está en la base de datos.',
  'claude.privacy.2':
    'Mientras esté activado, el servidor (y quien lo controle) puede abrir los cuadernos que elijas. Claude ve el texto que lee, y Anthropic lo trata según sus propias condiciones. Las páginas bloqueadas siguen ocultas salvo que un cuaderno permita la IA estando bloqueado.',
  'claude.privacy.3':
    'Está desactivado hasta que lo actives. Al desactivarlo se borra la copia de la clave y se detienen al instante todas las conexiones de Claude. También se desactiva solo tras 30 días sin uso.',
  'claude.choice.title': '¿Qué cuadernos puede usar Claude?',
  'claude.choice.all': 'Todos mis cuadernos',
  'claude.choice.some': 'Solo los cuadernos que elija',
  'claude.choice.none': 'Elige al menos un cuaderno.',
  'claude.pass.title': 'Activar',
  'claude.pass.help':
    'Escribe tu frase de acceso de sincronización para confirmar. La frase se queda en este dispositivo; solo se envía, una vez, la clave que abre.',
  'claude.pass.submit': 'Activar',
  'claude.state.on': 'Activado',
  'claude.state.off': 'Desactivado',
  'claude.lastUsed':
    'Último uso: {when}. Se desactiva solo el {expires} si no se usa antes.',
  'claude.turnOff': 'Desactivar',
  'claude.turnOff.confirm':
    '¿Desactivar Claude? El servidor borra su copia de tu clave y todas las conexiones de Claude se detienen ahora.',
  'claude.saveChoice': 'Guardar elección',
  'claude.saved': 'Guardado.',
  'claude.apps.title': 'Aplicaciones conectadas',
  'claude.apps.none':
    'Aún no hay ninguna aplicación conectada. Añade el conector en claude.ai, en Ajustes, Conectores.',
  'claude.apps.row': '{name}, última actividad {when}',
  'claude.apps.revoke': 'Revocar',
  'claude.apps.revokeFor': 'Revocar {name}',
  'claude.error.login':
    'Inicia sesión en tu cuenta primero (Ajustes › Cuenta).',
  'claude.error.generic':
    'No se pudo conectar con el servidor. Revisa tu internet e inténtalo de nuevo.',
  'claude.error.unavailable': 'Aún no está configurado en el servidor.',
  'claude.noSync':
    'Configura primero la sincronización (Ajustes › Sincronización): Claude usa la misma clave.',
  'claude.loading': 'Comprobando…',
  'claude.retry': 'Reintentar',
}
