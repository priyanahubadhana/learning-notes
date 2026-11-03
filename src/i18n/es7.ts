/** Spanish texts, part 7 (AI-translated; needs native review). */
export const es7: Record<string, string> = {
  'templates.delete': 'Eliminar plantilla',
  'picker.insert': 'Insertar una plantilla',
  'picker.new': 'Página nueva',
  'picker.insertHelp': 'Sus bloques se añaden donde está tu cursor.',
  'picker.newHelp': 'Empieza en blanco, o desde una de tus plantillas.',
  'picker.blankHelp': 'Empezar desde cero',
  'picker.emptyTemplate': 'Plantilla vacía',
  'editor.templateInserted': 'Plantilla insertada',
  'slash.callout.title': 'Destacado',
  'slash.callout.subtext': 'Nota resaltada con un emoji',
  'slash.group.databases': 'Bases de datos',
  'slash.insertTemplate.title': 'Insertar plantilla…',
  'slash.insertTemplate.subtext': 'Añade aquí los bloques de una plantilla',
  'slash.group.templates': 'Plantillas',
  'slash.saveTemplate.title': 'Guardar página como plantilla',
  'slash.saveTemplate.subtext':
    'Reutiliza el diseño de esta página para páginas nuevas',
  'slash.subpage.title': 'Subpágina nueva',
  'slash.subpage.subtext': 'Crea una página dentro de esta y enlázala',
  'slash.group.pages': 'Páginas',
  'err.notOurFile': 'Este no es un archivo de Learning Notes.',
  'err.newerFile':
    'Este archivo lo hizo una versión más nueva de la aplicación.',
  'err.unknownKind': 'Tipo de archivo desconocido.',
  'err.listDamaged': 'La lista «{table}» del archivo está dañada.',
  'err.tooBigFile': 'El archivo es demasiado grande para importarlo.',
  'err.tagsDamaged': 'La lista de etiquetas del archivo está dañada.',
  'err.pageDamaged': 'Una página del archivo está dañada.',
  'err.noteDamaged': 'Una nota del archivo está dañada.',
  'err.notJson': 'No se pudo leer este archivo (no es JSON válido).',
  'err.backupDamaged': 'Este archivo de copia de seguridad está dañado.',
  'err.tooBig': 'Este archivo es demasiado grande para importarlo.',
  'err.notLocked': 'Este no es un archivo protegido con contraseña.',
  'err.fileDamaged': 'Este archivo está dañado.',
  'err.wrongPassword': 'Contraseña incorrecta. Inténtalo de nuevo.',
  'anki.tooBig': 'Este archivo de Anki es demasiado grande para importarlo.',
  'anki.notPackage': 'Este no es un paquete de Anki (.apkg).',
  'anki.noCollection': 'Este paquete de Anki no contiene ninguna colección.',
  'anki.damaged': 'La colección de este paquete de Anki está dañada.',
  'anki.notebookGone': 'Ese cuaderno ya no existe.',
  'anki.noCards': 'Este cuaderno no tiene tarjetas ni huecos que exportar.',
  'anki.placeholder':
    'Este paquete lo guardó un Anki antiguo como marcador de posición. Expórtalo de nuevo desde Anki con «Compatible con versiones antiguas de Anki» desmarcado.',
  'err.imageDamaged': 'Una imagen del archivo está dañada.',
  'image.badType': 'Las imágenes deben ser archivos PNG, JPEG, WebP o GIF.',
  'image.tooBig':
    'Esta imagen es demasiado grande (el límite es de unos 25 MB).',
  'image.label': '🖼 Imagen',
  'image.choose': 'Elegir una imagen de este dispositivo',
  'image.added': 'Imagen añadida.',
  'image.missing':
    'Esta imagen no está en el almacenamiento de esta aplicación.',
  'revise.label.other': 'Otros',
  'revise.markLine': 'Marcar línea: {label}',
  'settings.reviseLabels.label': 'Etiquetas de repaso',
  'settings.reviseLabels.description':
    'Las etiquetas que puedes poner en palabras de una nota (se reúnen en la pestaña Repaso de cada lección). Renombra o cambia el color de cualquiera, o añade las tuyas.',
  'settings.reviseLabels.add': '+ Añadir etiqueta',
  'settings.reviseLabels.name': 'Nombre de la etiqueta {n}',
  'settings.reviseLabels.newName': 'Etiqueta nueva',
  'settings.reviseLabels.remove': 'Quitar la etiqueta {name}',
  'settings.reviseLabels.color': 'Color de {name}',
  'template.daily': 'Diario',
  'template.study': 'Apuntes de estudio',
  'template.meeting': 'Notas de reunión',
  'template.reading': 'Notas de lectura',
  'template.project': 'Plan de proyecto',
  'open.failed.title': 'No se pudieron abrir tus notas',
  'open.failed.message':
    'Lo más probable es que sigan seguras en este dispositivo. Cierra otras pestañas de esta app e inténtalo de nuevo. Si sigue pasando, reinicia el dispositivo.',
  'open.failed.retry': 'Intentar de nuevo',
  'storage.full':
    'Este dispositivo no tiene espacio, así que los cambios recientes pueden no guardarse. Libera algo de espacio.',
  'device.title': 'Este dispositivo',
  'device.protected':
    'Almacenamiento: protegido. El navegador ha prometido conservar tus notas.',
  'device.notProtected':
    'Almacenamiento: sin proteger. El navegador puede borrar notas si falta espacio, así que guarda un archivo de copia.',
  'device.lastBackup': 'Último archivo de copia: {date}',
  'device.noBackup': 'Aún no hay ningún archivo de copia.',
  'device.install.title': 'Primero instala, luego empieza',
  'device.install.ipad':
    'iPad o iPhone: en Safari, toca Compartir y luego Añadir a pantalla de inicio.',
  'device.install.computer':
    'Ordenador: en Chrome o Edge, usa el botón de instalar de la barra de direcciones.',
  'device.install.separate':
    'La app instalada y la pestaña del navegador guardan notas por separado, así que escribe en la app instalada.',
  'update.ready': 'Hay una versión nueva lista.',
  'update.now': 'Actualizar',
  'nav.hideMenu': 'Ocultar menú',
  'nav.showMenu': 'Mostrar menú',
  'nav.back': 'Atrás',
  'nav.forward': 'Adelante',
  'nav.backHint': 'Atrás: vuelve a la página anterior',
  'nav.forwardHint': 'Adelante: gris hasta que uses Atrás',
  'nav.resizeMenu': 'Cambiar tamaño del menú',
  'nav.resizeMenuHint':
    'Arrastra para cambiar el ancho; doble clic para restablecer',
  'page.more': 'Más opciones',
  'page.reviewThis': 'Repasar esta página',
  'page.restoreBackup': 'Guardar y restaurar',
  'page.comingSoon': 'Próximamente',
  'error.title': 'No se pudo mostrar esta página',
  'error.text':
    'Tus notas siguen guardadas en este dispositivo. Vuelve al inicio para continuar o guarda antes un archivo de copia de seguridad.',
  'error.home': 'Ir al inicio',
  'error.saveAll': 'Guardar todo',
  'error.saved': 'Archivo de copia de seguridad guardado.',
  'error.saveFailed': 'No se pudo guardar el archivo de copia de seguridad.',
  'editor.damagedBlock': 'Esta línea no se pudo mostrar. Se conserva a salvo.',
  'save.failed':
    'Aún sin guardar. Tus últimos cambios se conservan en este dispositivo y la aplicación sigue intentándolo.',
  'save.retry': 'Reintentar',
  'data.tooBigToRestore':
    'El archivo se guardó, pero supera 1 GB y la aplicación no podría abrirlo de nuevo. Guarda solo las notas.',
  'data.failed': 'No funcionó y no se cambió nada. Inténtalo de nuevo.',
  'editor.elsewhere':
    'Esta página está abierta en otra ventana, así que aquí es de solo lectura.',
  'editor.editHere': 'Editar aquí',
  'device.version': 'Versión de la aplicación: {commit}',
  'tree.expand': 'Expandir',
  'tree.collapse': 'Contraer',
  'data.save.title': 'Guardar',
  'data.save.notes': 'Guardar solo notas',
  'data.save.text':
    '«Todo» incluye imágenes, historial y Papelera. «Solo notas» es pequeño y rápido, y no incluye las imágenes.',
  'data.saved.full': 'Guardado «{name}» ({size}): todo.',
  'data.saved.notes': 'Guardado «{name}» ({size}): solo notas, sin imágenes.',
  'data.more.title': 'Más',
  'restore.title': 'Restaurar',
  'restore.text': 'Tú eliges: reemplazar lo que hay o añadir como copias.',
  'restore.undoRow':
    'Copia de seguridad previa a la última restauración, {date}',
  'restore.undo': 'Deshacer restauración',
  'restore.bar':
    'Se restauró el archivo del {date}. Tus notas anteriores se guardaron como copia de seguridad.',
  'restore.undone': 'Tus notas de antes de la restauración han vuelto.',
  'restore.dlg.saved': 'Guardado',
  'restore.dlg.contains': 'Contiene',
  'restore.dlg.contents':
    '{notebooks} cuadernos, {pages} páginas, {cards} tarjetas',
  'restore.dlg.also': 'Además',
  'restore.dlg.alsoFull': 'Historial, Papelera, ajustes, {count} imágenes',
  'restore.dlg.alsoNotes': 'Historial, Papelera y ajustes, sin imágenes',
  'restore.dlg.size': 'Tamaño',
  'restore.replace': 'Reemplazar mis notas',
  'restore.replace.text':
    'Tus notas pasan a ser exactamente el archivo. Antes se guarda una copia de seguridad, para que puedas deshacer.',
  'restore.copies': 'Añadir como copias',
  'restore.copies.text':
    'Conserva todo lo que tienes y añade los cuadernos del archivo al lado.',
  'restore.onlyCopies':
    'Es un tipo de archivo antiguo, así que solo se puede añadir como copias.',
  'restore.olderVersion':
    'Este archivo es de una versión anterior de la aplicación, así que solo se puede añadir como copias.',
  'restore.busy': 'Restaurando…',
  'restore.busy.text':
    'Escribiendo las notas del archivo. Mantén la aplicación abierta.',
  'restore.err.safety':
    'No se pudo guardar antes una copia de seguridad (el dispositivo puede estar lleno). No se cambió nada.',
  'restore.err.older':
    'Este archivo es de una versión anterior de la aplicación y no puede reemplazar tus notas. Añádelo como copias.',
  'restore.err.noCopy':
    'La copia de seguridad ya no existe, así que no hay nada que devolver.',
  'restore.err.undoOlder':
    'La aplicación se actualizó desde entonces, así que aquí no se puede devolver la copia de seguridad. Se conserva.',
  'help.tip.data.exportNotes.meaning':
    'Guarda notas, tarjetas, historial y ajustes, pero no las imágenes. Pequeño y rápido.',
  'help.tip.data.exportNotes.example': 'Envíate una copia ligera por correo.',
  'help.tip.data.undoRestore.meaning':
    'Devuelve tus notas exactamente como estaban antes de la última restauración.',
  'help.tip.data.undoRestore.example':
    '¿Abriste el archivo equivocado? Deshazlo.',
  'settings.category.advanced': 'Avanzado',
  'settings.category.advanced.hint':
    'Ajusta cómo funciona este dispositivo. Cada ajuste de aquí es solo para este dispositivo.',
  'settings.deviceMode.label': 'Modo del dispositivo',
  'settings.deviceMode.description':
    'Ordenador, Táctil o Lápiz. Al elegir uno se fijan las opciones de la barra de formato en Avanzado; aun así puedes cambiar cada una.',
  'mode.computer': 'Ordenador',
  'mode.touch': 'Táctil',
  'mode.pencil': 'Lápiz',
  'mode.switchTo': 'Cambiar al modo {mode}',
  'settings.barPlacement.label': 'Posición de la barra de formato',
  'settings.barPlacement.description':
    'Dónde está la barra de formato: flotando sobre el texto seleccionado, fija arriba o fija abajo.',
  'settings.barPlacement.floating': 'Flotante',
  'settings.barPlacement.top': 'Arriba',
  'settings.barPlacement.bottom': 'Abajo',
  'settings.barSize.label': 'Tamaño de la barra de formato',
  'settings.barSize.description':
    'Altura de los botones de la barra. En Táctil y Lápiz nunca son menores que un dedo.',
  'settings.barSize.compact': 'Compacto',
  'settings.barSize.normal': 'Normal',
  'settings.barSize.large': 'Grande',
  'settings.hoverTips.label': 'Consejos de botones',
  'settings.hoverTips.description':
    'Muestra un consejo con el nombre del botón de la barra cuando el puntero se detiene sobre él.',
  'settings.shortcutHints.label': 'Atajos visibles',
  'settings.shortcutHints.description':
    'Muestra los atajos de teclado junto a los botones de la barra. También aparecen cuando usas un teclado.',
  'settings.barAutoHide.label': 'Ocultar la barra en reposo',
  'settings.barAutoHide.description':
    'Oculta la barra fija mientras no seleccionas ni escribes.',
  'settings.onOff.on': 'Sí',
  'settings.onOff.off': 'No',
  'bar.label': 'Formato',
  'bar.newLine': 'Nueva línea',
  'bar.more': 'Más',
  'bar.done': 'Listo',
  'bar.edit': 'Editar barra…',
  'bar.editTitle': 'Editar barra',
  'bar.editHint':
    'Elige los botones de la barra y su orden. Se guarda en este dispositivo.',
  'bar.drag': 'Arrastra {name} para reordenar',
  'bar.moveEarlier': 'Mover {name} antes',
  'bar.moveLater': 'Mover {name} después',
  'bar.notOnBar': 'Fuera de la barra (están en Más)',
  'bar.size': 'Tamaño',
  'bar.position': 'Posición',
  'bar.autoHide': 'Ocultar si no seleccionas ni escribes',
  'bar.reset': 'Restablecer',
  'bar.tapBelow': 'Toca aquí para seguir escribiendo',
  'help.tip.bar.newLine.meaning':
    'Añade una línea vacía debajo y pone el cursor allí, sin teclado.',
  'help.tip.bar.newLine.example':
    '¿Terminaste una frase? Tócalo para la siguiente.',
  'help.tip.bar.more.meaning':
    'Todos los demás botones de formato, y Editar barra para elegir qué hay en esta barra.',
  'help.tip.bar.more.example': 'Tachado, color, enlace, Palabra clave.',
  'mode.autoSwitched': 'Cambiado al modo {mode}',
  'mode.undo': 'Deshacer',
  'settings.autoSwitch.label': 'Cambio automático',
  'settings.autoSwitch.description':
    'Cambia el modo del dispositivo al usar el Apple Pencil o un dedo. Solo Pencil: el lápiz activa el modo Lápiz. En ambos sentidos: un dedo vuelve al modo Táctil. Espera a que dejes de escribir.',
  'settings.autoSwitch.pen': 'Solo Pencil',
  'settings.autoSwitch.both': 'En ambos sentidos',
  'settings.autoSwitch.off': 'Desactivado',
  'bar.menu': 'Menú de la barra',
  'help.tip.bar.menu.meaning':
    'Lista todas las herramientas y acciones de formato, también las que no están fijadas en la barra, y las opciones de copiar y pegar y Editar barra.',
  'help.tip.bar.menu.example':
    'Copiar como Markdown, Pegar como texto sin formato, Tachado.',
  'color.button': 'Colores. Texto: {text}. Resaltado: {highlight}.',
  'color.title': 'Colores',
  'color.text': 'Color del texto',
  'color.highlight': 'Color de resaltado',
  'copy.plain': 'Copiar como texto sin formato',
  'copy.markdown': 'Copiar como Markdown',
  'copy.pagePlain': 'Copiar página como texto sin formato',
  'copy.pageMarkdown': 'Copiar página como Markdown',
  'copy.pictures': 'Copiar página con imágenes',
  'copy.done': 'Copiado',
  'copy.doneTextOnly':
    'Copiado (solo texto, el navegador bloqueó las imágenes)',
  'copy.blocked':
    'El navegador no permitió copiar. Selecciona el texto y pulsa Ctrl+C.',
  'paste.plain': 'Pegar como texto sin formato',
  'paste.done': 'Pegado',
  'paste.blocked':
    'El navegador no permitió leer el portapapeles. Pulsa Ctrl+Shift+V (Cmd+Shift+V en Mac).',
  'color.default': 'Predeterminado',
  'color.gray': 'Gris',
  'color.brown': 'Marrón',
  'color.red': 'Rojo',
  'color.orange': 'Naranja',
  'color.yellow': 'Amarillo',
  'color.green': 'Verde',
  'color.blue': 'Azul',
  'color.purple': 'Morado',
  'color.pink': 'Rosa',
}
