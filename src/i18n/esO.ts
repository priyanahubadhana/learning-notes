/** Spanish text of Phase O (draft: needs native review). English is enO.ts. */
export const esO: Record<string, string> = {
  'reading.goal.label': 'Meta diaria de lectura',
  'reading.goal.off': 'Sin meta',
  'reading.goal.min': '{count} min',
  'reading.goal.progress': 'Hoy: {done} de {goal} min',
  'reading.goal.reached': 'Meta de hoy cumplida',
  'reading.goal.week_one': 'Meta cumplida {count} día esta semana',
  'reading.goal.week_other': 'Meta cumplida {count} días esta semana',
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
  'writePad.ai.clear': 'Borrar',
  'help.tip.writePad.engine.meaning':
    'Scribble lee la escritura en el iPad gratis; IA envía una imagen de tu escritura con tu propia clave.',
  'help.tip.writePad.engine.example':
    'La IA también lee hindi y guarda la presión.',
  'help.tip.writePad.ai.read.meaning':
    'Envía una imagen de lo escrito a tu IA y muestra las palabras arriba.',
  'help.tip.writePad.ai.read.example': 'Las palabras firmes salen más gruesas.',
  'help.tip.writePad.ai.clear.meaning': 'Limpia la zona de escritura.',
  'help.tip.writePad.ai.clear.example': 'No se envía nada.',
}
