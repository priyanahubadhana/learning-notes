/**
 * Spanish text of redesign step 3 (ink engine, layers, lasso on ink).
 * English is en10.ts.
 */
export const es10: Record<string, string> = {
  // ---- The drawing region ----
  'ink.region': 'Dibujo en esta página. Trazos: {n}',
  'ink.region.step':
    'Seleccionar trazos dibujados. Las flechas eligen un trazo, Supr lo borra, Escape lo suelta.',
  'ink.region.selected': 'Trazo {at} seleccionado',
  'ink.locked': 'Desbloquea una capa para dibujar.',
  'ink.layer.default': 'Capa {n}',
  'ink.page.highlights': 'Subrayados',
  'ink.hl.saved': 'Guardado en Subrayados',

  // ---- The menu over selected ink ----
  'ink.sel.menu': 'Dibujo seleccionado',
  'ink.sel.hint':
    'Arrastra el recuadro para mover. Arrastra una esquina para cambiar el tamaño. Arrastra el control redondo para girar.',
  'ink.sel.duplicate': 'Duplicar',
  'ink.sel.delete': 'Eliminar',
  'ink.sel.colour': 'Color',
  'ink.sel.copyPng': 'Copiar como imagen',
  'ink.sel.savePng': 'Guardar como imagen',
  'ink.sel.scale': 'Cambiar tamaño',
  'ink.sel.rotate': 'Girar',
  'ink.sel.move': 'Mover',
  'ink.sel.copied': 'Imagen copiada',
  'ink.sel.saved': 'Imagen guardada',
  'ink.sel.copyFailed':
    'No se pudo copiar la imagen. Prueba Guardar como imagen.',
  'ink.sel.count_one': '{count} trazo seleccionado',
  'ink.sel.count_other': '{count} trazos seleccionados',
  'ink.sel.textOnly':
    'Esto funciona con dibujos: selecciona tinta con el Lazo.',

  // ---- Layers ----
  'tool.inkLayers': 'Capas de tinta',
  'main.card.pen.layers': 'Capas',
  'main.card.highlighter.layers': 'Capas',
  'main.card.lasso.layers': 'Capas',
  'ink.layers': 'Capas',
  'ink.layers.count': 'Capas ({n})',
  'ink.layers.add': 'Añadir una capa',
  'ink.layers.max': 'Es el máximo de capas que puede tener una página.',
  'ink.layers.name': 'Nombre de la capa',
  'ink.layers.show': 'Mostrar {name}',
  'ink.layers.hide': 'Ocultar {name}',
  'ink.layers.lock': 'Bloquear {name}',
  'ink.layers.unlock': 'Desbloquear {name}',
  'ink.layers.up': 'Subir {name}',
  'ink.layers.down': 'Bajar {name}',
  'ink.layers.delete': 'Eliminar {name}',
  'ink.layers.deleted': 'Capa eliminada. Deshacer la devuelve.',
  'ink.layers.draw': 'Dibujar en {name}',
  'ink.layers.drawing': 'Dibujando aquí',
  'ink.layers.strokes_one': '{count} trazo',
  'ink.layers.strokes_other': '{count} trazos',
  'ink.layers.empty': 'Aún no hay capas. El primer trazo crea una.',
  'ink.layers.selectAll': 'Seleccionar todo en {name}',
  'ink.paper': 'Papel detrás de la tinta',
  'ink.paper.blank': 'En blanco',
  'ink.paper.lined': 'Rayado',
  'ink.paper.grid': 'Cuadrícula',
  'ink.paper.dots': 'Puntos',
  'ink.asDrawn': 'Ver como se dibujó',
  'ink.asDrawn.note':
    'Muestra la tinta exactamente como se dibujó, aunque cambie el tamaño del texto. Llegará con el lector.',

  // ---- Pen settings added in step 3 ----
  'ink.pen.shapeSnap': 'Ajustar formas',
  'ink.pen.shapeSnap.note':
    'Las líneas se enderezan, y los cuadrados y círculos quedan regulares.',
  'ink.pen.shapeFill': 'Rellenar formas',
  'ink.pen.shapeFill.note':
    'Las formas cerradas se rellenan con un tono suave.',
  'ink.finger': 'El dedo puede dibujar',
  'ink.finger.auto': 'Automático',
  'ink.finger.on': 'Siempre',
  'ink.finger.off': 'Nunca',
  'ink.finger.note':
    'Automático: el dedo desplaza la página cuando se usa un Pencil o en modo Pencil, y dibuja en los demás casos.',

  // ---- Help tips ----
  'help.tip.ink.layers.meaning':
    'Las capas son hojas transparentes de tinta sobre la página. Puedes ocultarlas, bloquearlas o reordenarlas.',
  'help.tip.ink.layers.example':
    'Guarda tus correcciones en su propia capa y ocúltala para ver la página limpia.',
  'help.tip.ink.finger.meaning':
    'Elige si el dedo dibuja o solo desplaza y hace zoom.',
  'help.tip.ink.finger.example':
    'Con un Apple Pencil, déjalo en Automático para que la mano apoyada nunca dibuje.',
}
