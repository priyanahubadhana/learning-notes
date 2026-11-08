/** Spanish text of Phase O (draft: needs native review). English is enO.ts. */
export const esO: Record<string, string> = {
  'reading.goal.label': 'Meta diaria de lectura',
  'reading.goal.off': 'Sin meta',
  'reading.goal.min': '{count} min',
  'reading.goal.progress': 'Hoy: {done} de {goal} min',
  'reading.goal.reached': 'Meta de hoy cumplida',
  'reading.goal.week_one': 'Meta cumplida {count} día esta semana',
  'reading.goal.week_other': 'Meta cumplida {count} días esta semana',
  // ---- Polish 2 ----
  'lassoMenu.title': 'Ordenar el menú del Lazo',
  'lassoMenu.hint':
    'Los iconos de la fila salen primero, en este orden. Los demás esperan en ⋯ Más.',
  'lassoMenu.arrange': 'Ordenar el menú…',
  'tool.lastTool': 'Herramienta anterior',
  'tool.lastTool.none':
    'Aún no hay herramienta anterior. Elige dos herramientas y esto vuelve a la anterior.',
  'ink.eraser.returnAfter':
    'Volver a la herramienta anterior tras borrar una vez',
  'tool.handwriting': 'Escritura a texto',
  'main.opt.insert.handwriting': 'Escritura a mano',
  'handwriting.title': 'Escritura a mano a texto',
  'handwriting.intro':
    'Tres formas de convertir tu escritura en texto. Elige la que te sirva.',
  'handwriting.pad.name': 'Bloc de escritura',
  'handwriting.pad.line': 'Escribe en un bloc (Bloc de escritura)',
  'handwriting.lasso.name': 'Convertir tinta',
  'handwriting.lasso.line': 'Convertir tinta que ya escribí (Lazo)',
  'handwriting.lasso.toast': 'Rodea tu tinta y elige Convertir a texto.',
  'handwriting.scribble.name': 'Garabato',
  'handwriting.scribble.line': 'Escribe directo en el texto (Garabato, iPad)',
  'handwriting.scribble.toast':
    'Escribe con tu Apple Pencil en cualquier parte del texto.',
  'handwriting.scribble.off':
    'Garabato está desactivado. Activa «Pencil escribe texto» para usarlo.',
  'handwriting.scribble.turnOn': 'Activar',
  'firstUse.lasso':
    'Rodea la tinta para seleccionarla. Toca un filtro para elegir texto o imágenes.',
  'firstUse.writePad':
    'Escribe con tu Pencil en el panel. Toca Insertar para ponerlo en la página.',
  'firstUse.layers':
    'Las capas separan la tinta. Oculta, bloquea o reordena aquí.',
  'firstUse.paperBox':
    'Se añadió un cuadro. Toca su borde para mover, cambiar el tamaño y el color.',
  // ---- Name it sheet and touch rows ----
  'nameSheet.newNotebook': 'Pon nombre a tu cuaderno',
  'nameSheet.newPage': 'Pon nombre a tu página',
  'sidebar.rowMenu': 'Más para {name}',
  'help.tip.sidebar.rowMenu.meaning': 'Abre las acciones de esta fila.',
  'help.tip.sidebar.rowMenu.example': 'Renombrar, bloquear, mover o eliminar.',
  // ---- Write pad ----
  'tool.writePad': 'Bloc de escritura',
  'main.opt.insert.writePad': 'Bloc de escritura',
  'writePad.title': 'Bloc de escritura',
  'writePad.hint': 'En iPad, escribe aquí con Apple Pencil (Scribble)',
  'writePad.input': 'Texto del bloc de escritura',
  'writePad.placeholder': 'Escribe aquí',
  'writePad.previewEmpty': 'Tus palabras aparecen aquí',
  'writePad.insert': 'Insertar',
  'writePad.replace': 'Reemplazar',
  'writePad.close': 'Cerrar el bloc de escritura',
  'writePad.resize': 'Arrastra para cambiar el tamaño',
  'writePad.zoomIn': 'Letra más grande',
  'writePad.zoomOut': 'Letra más pequeña',
  'writePad.space': 'Espacio',
  'writePad.newLine': 'Nueva línea',
  'writePad.delete': 'Borrar',
  'writePad.color': 'Color',
  'writePad.highlight': 'Resaltado',
  'writePad.size': 'Tamaño',
  'writePad.font': 'Fuente',
  'writePad.weight': 'Grosor',
  'writePad.font.caveat': 'Caveat',
  'writePad.font.kalam': 'Kalam (hindi)',
  'writePad.font.app': 'Normal',
  'writePad.weight.light': 'Fino',
  'writePad.weight.normal': 'Normal',
  'writePad.weight.bold': 'Negrita',
  'help.tip.writePad.insert.meaning':
    'Pone las palabras escritas en la página, en el cursor.',
  'help.tip.writePad.insert.example': 'Un solo Deshacer las quita.',
  'help.tip.writePad.replace.meaning':
    'Cambia las palabras seleccionadas de la página por las escritas.',
  'help.tip.writePad.replace.example':
    'Selecciona una palabra, escribe otra mejor y toca Reemplazar.',
  'help.tip.writePad.zoom.meaning':
    'Hace más grande o más pequeña la escritura en el bloc.',
  'help.tip.writePad.zoom.example': 'No cambia el texto de la página.',
  'help.tip.writePad.resize.meaning':
    'Arrastra este borde para cambiar la altura del bloc.',
  'help.tip.writePad.resize.example': 'Hazlo alto para escribir mucho.',
  'help.tip.writePad.keys.meaning':
    'Añade un espacio o una línea nueva, o borra, en el bloc.',
  'help.tip.writePad.keys.example': 'Útil cuando el lápiz no llega al teclado.',
  'help.tip.writePad.close.meaning': 'Cierra el bloc de escritura.',
  'help.tip.writePad.close.example': 'Tu página conserva lo que insertaste.',
  // ---- Lupa (correcciones del Pencil, 7 nov) ----
  'ink.magnifier.hint':
    'Escribe en grande aquí. Aparece pequeño en el recuadro de la página, que avanza solo.',
  'ink.magnifier.boxLabel': 'La escritura cae aquí · arrastra para mover',
  'ink.magnifier.resize': 'Arrastra para hacer el panel más alto o más bajo',
  'ink.magnifier.erasing': 'Borrador: frota aquí para borrar en la página',
  // ---- Menú del lazo (diseño del propietario, 7 nov) ----
  'ink.sel.more': 'Más',
  'ink.sel.convert': 'Convertir en texto',
  'ink.sel.convertLater':
    'Convertir en texto necesita IA (fase P); llegará más adelante.',
  'ink.sel.thickness': 'Grosor',
  'ink.sel.thin': 'Fino',
  'ink.sel.medium': 'Medio',
  'ink.sel.thick': 'Grueso',
  'ink.sel.paste': 'Pegar',
  'ink.sel.cutDone': 'Cortado. Pégalo desde el menú ⋯ de una selección.',
  'ink.sel.cardHint': 'Imagen copiada: pégala en la tarjeta como respuesta.',
  'ink.sel.summaryNeedsName':
    'Ponle nombre al dibujo primero (⋯ › Nombrar este dibujo) y luego añádelo al Resumen.',
  'ink.mixed.moveNote':
    'Arrastrar mueve solo la tinta: el texto escrito fluye con la página.',
  'main.opt.lasso.row': 'Acciones en la fila del menú',
  'main.opt.lasso.rowNote': 'Las demás están bajo ⋯ Más.',
  'ai.convert.title': 'Convertir en texto',
  'ai.convert.picture': 'La imagen de la tinta seleccionada',
  'ai.convert.send':
    'Solo se envía esta imagen de la tinta seleccionada a {provider} ({host}). Se lee inglés e hindi.',
  'ai.convert.go': 'Enviar',
  'ai.convert.reading': 'Leyendo…',
  'ai.convert.preview': 'El texto (puedes editarlo)',
  'ai.convert.insert': 'Insertar debajo',
  'ai.convert.replace': 'Reemplazar la tinta',
  'ai.convert.copy': 'Copiar',
  'ai.convert.copied': 'Texto copiado.',
  'ai.convert.empty': 'No se encontró escritura legible.',
  'ai.convert.inserted': 'Texto añadido. Deshacer lo quita.',
  'ai.convert.needsAi':
    'Usa tu propia IA: actívala y añade una clave en Ajustes › IA.',
  'ai.convert.maths': 'Matemáticas a fórmula',
  'writePad.engine': 'Leer con',
  'writePad.engine.scribble': 'Scribble',
  'writePad.engine.ai': 'IA',
  'writePad.ai.canvas': 'Zona de escritura: escribe aquí con el lápiz',
  'writePad.ai.hint':
    'Escribe y toca Leer. La presión del lápiz da el grosor de cada palabra.',
  'writePad.ai.read': 'Leer',
  'help.tip.writePad.engine.meaning':
    'Scribble lee la escritura en el iPad gratis; IA envía una imagen de tu escritura con tu propia clave.',
  'help.tip.writePad.engine.example':
    'La IA también lee hindi y guarda la presión.',
  'help.tip.writePad.ai.read.meaning':
    'Envía una imagen de lo escrito a tu IA y muestra las palabras arriba.',
  'help.tip.writePad.ai.read.example': 'Las palabras firmes salen más gruesas.',
  'writePad.discard.ask':
    'Tu escritura en la zona aún no se ha leído. Cambiar la descartaría.',
  'writePad.discard.keep': 'Seguir escribiendo',
  'writePad.discard.discard': 'Descartar',
  'writePad.clear': 'Borrar todo',
  'help.tip.writePad.clear.meaning':
    'Vacía el panel: el texto, la zona de escritura y el borrador de la página.',
  'help.tip.writePad.clear.example': 'Deshacer lo devuelve todo.',
  'writePad.done': 'Listo',
  'help.tip.writePad.done.meaning':
    'Hace definitivo el borrador en la página y cierra el panel.',
  'help.tip.writePad.done.example':
    'Un solo paso de Deshacer lo quita de la página y lo devuelve al panel.',
  'writePad.eraser': 'Borrador',
  'help.tip.writePad.eraser.meaning':
    'El mismo borrador de la barra principal, con el mismo tamaño y modo. Borra trazos en la zona de escritura.',
  'help.tip.writePad.eraser.example':
    'Al principio, pequeño y preciso, para palabras sueltas.',
  'writePad.live': 'Mostrar lo que escribo en la página mientras escribo',
  'help.tip.writePad.live.meaning':
    'La página muestra tu texto en el cursor como borrador punteado mientras escribes. El panel conserva el texto; Insertar, Listo o cerrar el panel lo hacen definitivo.',
  'help.tip.writePad.live.example':
    'Borrar todo quita el texto del panel y el borrador.',
  'writePad.ai.ignored':
    'Esta herramienta no hace nada en el panel. Elige el lápiz o el borrador.',
  'writePad.explain.title': 'Qué pasa con tu texto',
  'writePad.explain.body':
    'Tu texto se queda en el panel. En modo IA escribes con el lápiz y pulsas Leer: una imagen de tu escritura va a tu propia clave de IA y las palabras que lee se añaden al final de tu texto. No se pierde nada y Deshacer vuelve atrás.',
  'writePad.explain.ok': 'Cambiar a IA',
  'writePad.explain.never': 'No mostrar más',
  'writePad.explain.cancel': 'Cancelar',
  // ---- Model picker and several keys ----
  'ai.keys.title': 'Tus claves',
  'ai.keys.none': 'Aún no hay claves. Añade una abajo.',
  'ai.keys.name': 'Nombre',
  'ai.keys.namePlaceholder': 'Por ejemplo: Claude principal',
  'ai.keys.add': 'Añadir clave',
  'ai.keys.rename': 'Renombrar',
  'ai.keys.edit': 'Cambiar la clave',
  'ai.keys.test': 'Probar',
  'ai.keys.delete': 'Eliminar',
  'ai.keys.save': 'Guardar',
  'ai.keys.cancel': 'Cancelar',
  'ai.keys.testing': 'Probando…',
  'ai.keys.testOk': 'La clave funciona.',
  'ai.keys.testFail': 'La prueba falló: {reason}.',
  'ai.keys.confirmDelete': '¿Eliminar la clave “{name}” de este dispositivo?',
  'ai.keys.cap': 'Límite mensual (US$)',
  'ai.keys.used': 'Usado este mes: unos {cost}',
  'ai.usageKey': '{name}: unos {cost} de {cap}',
  'ai.models.title': 'Modelos',
  'ai.models.intro':
    'Arrastra las tarjetas para ordenarlas. La primera con clave es la predeterminada. El orden siguiente se usa cuando una clave falla o llega a su límite.',
  'ai.models.drag': 'Arrastrar {name}',
  'ai.models.up': 'Subir {name}',
  'ai.models.down': 'Bajar {name}',
  'ai.models.default': 'Predeterminado',
  'ai.models.place': 'Número {n}',
  'ai.models.price': '{about}${in} entrada, ${out} salida por millón de tokens',
  'ai.models.pro': 'Bueno:',
  'ai.models.con': 'No tan bueno:',
  'ai.models.freeNote':
    'Gratis; Google puede usar los datos para mejorar sus productos.',
  'ai.models.noKey':
    'Añade arriba una clave de {provider} para usar este modelo.',
  'ai.models.useKey': 'Clave',
  'ai.models.checked': 'Modelos y precios revisados el {date}.',
  'ai.cost.high': 'Coste alto',
  'ai.cost.med': 'Coste medio',
  'ai.cost.low': 'Coste bajo',
  'ai.cost.free': 'Nivel gratis',
  'ai.speed.fast': 'Rápido',
  'ai.speed.medium': 'Velocidad media',
  'ai.speed.slow': 'Más lento',
  'ai.vision': 'Lee imágenes',
  'ai.nb.uses': 'Usa',
  'ai.nb.choiceFor': 'Clave y modelo para {name}',
  'ai.nb.default': 'El predeterminado (primer modelo)',
  'ai.m.haiku.pro': 'El más rápido y barato de los tres; lee imágenes.',
  'ai.m.haiku.con': 'Menos cuidadoso con notas largas o difíciles.',
  'ai.m.sonnet.pro': 'El mejor con letra a mano y resúmenes cuidadosos.',
  'ai.m.sonnet.con': 'Cuesta unas veinte veces más que Haiku.',
  'ai.m.opus.pro': 'El razonamiento más fuerte para temas difíciles.',
  'ai.m.opus.con': 'El más lento y el más caro.',
  'ai.m.gflite35.pro': 'Rápido, y gratis dentro de los límites de Google.',
  'ai.m.gflite35.con':
    'Respuestas más simples; el nivel gratis tiene límites diarios.',
  'ai.m.gflite31.pro': 'Muy rápido y barato; lee imágenes.',
  'ai.m.gflite31.con':
    'Respuestas simples; el nivel gratis tiene límites diarios.',
  'ai.m.gflash36.pro':
    'Mejores respuestas que Flash-Lite, gratis dentro de los límites.',
  'ai.m.gflash36.con':
    'El precio sube el 1 de enero de 2027; límites más bajos.',
  'ai.m.gpt4omini.pro': 'Rápido y barato; una opción segura para el día a día.',
  'ai.m.gpt4omini.con': 'Modelo antiguo; la letra a mano es solo regular.',
  'ai.m.gpt41mini.pro':
    'Sigue bien las instrucciones para tarjetas y resúmenes.',
  'ai.m.gpt41mini.con': 'Cuesta más que GPT-4o mini.',
  'help.tip.ai.modelOrder.meaning':
    'La primera tarjeta con clave es la predeterminada; las demás son el orden de respaldo.',
  'help.tip.ai.modelOrder.example':
    'Pon Gemini gratis primero y Claude después.',
  // ---- Open notebooks at (R6-12) ----
  'settings.openNotebookAt.label': 'Abrir cuadernos en',
  'settings.openNotebookAt.description':
    'Qué abre un toque en un cuaderno en este dispositivo: la última página, la primera o sus pestañas (Notas, Base de datos, Tarjetas).',
  'settings.openNotebookAt.last': 'Última página',
  'settings.openNotebookAt.first': 'Primera página',
  'settings.openNotebookAt.tabs': 'Pestañas del cuaderno',
  // ---- Live sync (R6-13) ----
  'sync.live':
    'En directo: los cambios de tus otros dispositivos llegan en un segundo.',
  'sync.notLive':
    'Las actualizaciones en directo están apagadas ahora: se comprueba cada 10 segundos.',
  // ---- Slow moments (R6-11) ----
  'settings.slowMoments.label': 'Registrar momentos lentos',
  'settings.slowMoments.description':
    'Guarda una nota en este dispositivo cada vez que la app se atasca (los últimos 50). No se envía nada. Copia el informe y compártelo con el desarrollador.',
  'settings.slowMomentsCopy.label': 'Informe de momentos lentos',
  'settings.slowMomentsCopy.description':
    'Copia los momentos lentos registrados como texto, para pegarlos en un mensaje.',
  'settings.slowMomentsCopy.button': 'Copiar informe',
  'settings.slowMomentsCopy.done': 'Informe copiado',
  'settings.slowMomentsCopy.empty': 'Aún no hay momentos lentos registrados',
  'settings.slowMomentsCopy.failed':
    'No se pudo copiar. El informe está en la consola.',
  'settings.toolStateCopy.label': 'Estado de las herramientas',
  'settings.toolStateCopy.description':
    'Copia lo que el lápiz, el lazo, el borrador y los toques creen ahora mismo (qué herramienta, punteros retenidos, marcas atascadas), para pegarlo en un mensaje cuando una herramienta deja de funcionar. Solo en este dispositivo.',
  'settings.toolStateCopy.button': 'Copiar estado',
  'settings.toolStateCopy.done': 'Estado copiado',
  'settings.toolStateCopy.failed':
    'No se pudo copiar. El estado está en la consola.',
  // ---- AI keys on all devices (R6-2) ----
  'ai.keysSync':
    'Mantener mis claves de IA en todos mis dispositivos (bloqueadas con tu frase de sincronización)',
  'ai.keysSync.hint':
    'Las claves viajan bloqueadas como tus notas, así que el servidor no puede leerlas. Siguen sin entrar nunca en las copias de seguridad.',
  'ai.keysSync.needsSync':
    'Configura primero Sincronizar (Ajustes › Sincronizar).',
  'settings.fingerOnly.label': 'Barra: solo el dedo',
  'settings.fingerOnly.description':
    'Activado: las barras ignoran el Apple Pencil, así el dedo maneja las barras y el Pencil solo escribe, dibuja y selecciona en la página. Desactivado: ambos pueden tocar las barras (la palma apoyada se ignora siempre).',
  // ---- Phase P: Ask this book, Story so far, Permissions ----
  'ai.book.button': '✦ Preguntar a la IA',
  'ai.book.title': 'Preguntar a este libro',
  'ai.book.tabAsk': 'Preguntar',
  'ai.book.tabStory': 'La historia hasta aquí',
  'ai.book.scope': 'Qué enviar',
  'ai.book.chapter': 'Capítulo: {title}',
  'ai.book.pages': 'Las páginas que elija',
  'ai.book.from': 'Desde la página',
  'ai.book.to': 'Hasta la página',
  'ai.book.question': 'Tu pregunta',
  'ai.book.prepare': 'Ver lo que se enviará',
  'ai.book.willSend':
    '{words} palabras ({what}) van a {host}. Como mucho unos {cost}.',
  'ai.book.cut': 'Demasiado largo: solo cabe y se envía la primera parte.',
  'ai.book.cutStory':
    'Demasiado largo: solo cabe y se envía tu lectura más reciente.',
  'ai.book.showText': 'Ver el texto exacto',
  'ai.book.send': 'Enviar',
  'ai.book.stop': 'Detener',
  'ai.book.stopped': 'Detenido. Se guarda la respuesta hasta aquí.',
  'ai.book.saveSummary': 'Guardar en Resumen',
  'ai.book.makeCards': 'Crear tarjetas',
  'ai.book.storyHelp':
    'Un resumen de lo que has leído hasta aquí. No se envía nada posterior a tu posición de lectura, así que no hay spoilers.',
  'ai.book.storyWhat': 'hasta {where}',
  'ai.book.wherePage': 'la página {page}',
  'ai.book.whereChapter': 'el capítulo {n}',
  'ai.book.pagesWhat': 'páginas {from} a {to}',
  'ai.book.noneRead': 'Aquí no hay texto que enviar.',
  'ai.book.cite': 'Ir a {cite}',
  'ai.book.off':
    'La IA está desactivada en este cuaderno. Actívala en Ajustes › Permisos.',
  'ai.book.openSettings': 'Abrir Ajustes',
  'help.tip.reader.askAi.meaning':
    'Pregunta a tu IA sobre este libro u obtén la historia hasta aquí. Primero ves lo que se envía y su coste.',
  'help.tip.reader.askAi.example':
    'Pregunta "¿Por qué volvió el capitán?" sobre el capítulo 4.',
  'settings.category.permissions': 'Permisos',
  'settings.category.permissions.hint':
    'Qué cuadernos pueden usar IA, qué modelo usa cada uno y todo lo que la IA envió este mes.',
  'ai.perm.title': 'Permisos',
  'ai.perm.intro':
    'La IA está desactivada en todos los cuadernos hasta que la actives aquí. Nada se envía desde un cuaderno desactivado.',
  'ai.perm.spend': 'Gasto de este mes, por clave',
  'ai.perm.noKeys': 'Aún no hay claves. Añade una en Ajustes › IA.',
  'ai.perm.log': 'Todo lo que la IA envió este mes',
  'ai.perm.logHelp':
    'Una línea por solicitud: ninguna palabra de tus notas, ninguna clave. Se guarda solo en este dispositivo.',
  'ai.perm.logEmpty': 'Este mes no se ha enviado nada.',
  'ai.perm.colDate': 'Fecha',
  'ai.perm.colNotebook': 'Cuaderno',
  'ai.perm.colFeature': 'Función',
  'ai.perm.colHost': 'Enviado a',
  'ai.perm.colCost': 'Coste',
  'ai.perm.noNotebook': '(ninguno)',
  'ai.perm.moved':
    'Qué cuadernos pueden usar IA está ahora en Ajustes › Permisos.',
  'editList.close': 'Cerrar y guardar los cambios',
  'editList.preview': 'Vista previa',
  'editList.onList': 'En la lista',
  'editList.empty': 'Aún no hay nada. Añade una herramienta abajo.',
  'editList.remove': 'Quitar {name}',
  'editList.add': 'Añadir {name}',
  'editList.more': 'Más herramientas',
  'editList.find': 'Buscar una herramienta',
  'editList.cancel': 'Cancelar',
  'editBar.open': 'Editar barra de herramientas…',
  'editBar.title': 'Editar barra de herramientas',
  'editBar.hint':
    'Arrastra una herramienta para moverla o usa las flechas. Suelta una de Más herramientas en la lista para añadirla. Listo guarda los cambios; Cancelar los descarta.',
  'editBar.pillTitle': 'Opciones de {name}',
  'editBar.pillOpen': 'Ordenar estas opciones…',
  'search.sec.recent': 'Herramientas recientes',
  'search.sec.favourites': 'Favoritas',
  'search.sec.recommended': 'Recomendadas',
  'bar.scrollMore':
    'Más herramientas por aquí ({count} fuera de vista). Toca para deslizar la barra.',
  'bar.scrollBack': 'Deslizar la barra hacia atrás',
  'bar.scrollHandle': 'Deslizar la barra de lado (arrastra)',
  // ---- Papel (Fase Q) ----
  'paper.zoomIn': 'Acercar',
  'paper.zoomOut': 'Alejar',
  'paper.zoomFit': 'Ajustar al ancho',
  'paper.size': 'Tamaño del papel',
  'paper.sizeA4': 'A4',
  'paper.sizeLetter': 'Carta',
  'help.tip.paper.zoomIn.meaning': 'Hace el papel más grande.',
  'help.tip.paper.zoomIn.example':
    'Pellizca con dos dedos, o Ctrl y la rueda del ratón.',
  'help.tip.paper.zoomOut.meaning': 'Hace el papel más pequeño.',
  'help.tip.paper.zoomOut.example': 'Ver una hoja entera a la vez.',
  'help.tip.paper.zoomFit.meaning':
    'Muestra el papel tan ancho como la ventana.',
  'help.tip.paper.zoomFit.example': 'Vuelve al 100 % después de acercar.',
  'paper.box.move': 'Mover el cuadro (arrastrar)',
  'paper.box.menu': 'Acciones del cuadro',
  'paper.box.resize': 'Cambiar el ancho del cuadro (arrastrar)',
  'paper.box.lock': 'Fijar en su sitio',
  'paper.box.unlock': 'Desbloquear',
  'paper.box.duplicate': 'Duplicar el cuadro',
  'paper.box.colour': 'Color',
  'paper.box.noColour': 'Sin color',
  'paper.box.delete': 'Eliminar el cuadro',
  'paper.box.deleted': 'Cuadro eliminado.',
  'paper.box.undo': 'Deshacer',
}
