/** Spanish texts, part 2 (AI-translated; needs native review). */
export const es2: Record<string, string> = {
  'settings.category.review': 'Repaso',
  'settings.category.journal': 'Diario',
  'settings.category.apis': 'API',
  'settings.theme.label': 'Tema',
  'settings.theme.description': 'Cómo se ve la aplicación en este dispositivo.',
  'settings.theme.day': 'Día',
  'settings.theme.night': 'Noche',
  'settings.theme.sepia': 'Sepia',
  'settings.reduceGlass.label': 'Reducir cristal',
  'settings.reduceGlass.description':
    'La barra lateral, las barras y los menús son de cristal esmerilado. Automático quita el desenfoque si el dispositivo va lento; Sólido lo quita siempre.',
  'settings.reduceGlass.auto': 'Automático',
  'settings.reduceGlass.reduce': 'Sólido',
  'settings.showHelp.label': 'Mostrar ayuda',
  'settings.showHelp.description':
    'Muestra una breve explicación al pasar el cursor sobre una función (o al tocar su ⓘ en una pantalla táctil), y una línea de ayuda bajo las funciones más difíciles. Desactívalo para ocultarlo todo.',
  'settings.showHelp.on': 'Activada',
  'settings.showHelp.off': 'Desactivada',
  'help.info': '¿Qué es esto?',
  'help.example': 'Ejemplo: {text}',
  'help.tip.tracker.lesson.meaning':
    'Cada fila es una lección: una página de nivel superior de este cuaderno. Sus subpáginas cuentan para ella.',
  'help.tip.tracker.lesson.example':
    'Las tarjetas de la subpágina «Corazón › Válvulas» cuentan para la lección «Corazón».',
  'help.tip.tracker.status.meaning':
    'En qué punto está esta lección. La aplicación lo calcula con tus respuestas a las tarjetas, o puedes fijarlo tú.',
  'help.tip.tracker.status.example':
    'Sin empezar, Aprendiendo, Repaso o Dominada.',
  'help.tip.tracker.status.notStarted.meaning':
    'Todavía no has respondido ninguna tarjeta de esta lección.',
  'help.tip.tracker.status.notStarted.example':
    'Una lección cuyas tarjetas son todas nuevas.',
  'help.tip.tracker.status.learning.meaning':
    'Menos del 75 % de las tarjetas que respondiste fueron correctas.',
  'help.tip.tracker.status.learning.example':
    '6 de 10 tarjetas respondidas bien → 60 % → Aprendiendo.',
  'help.tip.tracker.status.review.meaning':
    'Casi todo bien, pero sin terminar: algunas tarjetas están pendientes, son nuevas o aún no llegan a Dominada.',
  'help.tip.tracker.status.review.example':
    '85 % correcto, o 95 % correcto con 2 tarjetas pendientes → Repaso.',
  'help.tip.tracker.status.mastered.meaning':
    '90 % o más correcto, nada pendiente, sin tarjetas nuevas, y al menos el 80 % de las tarjetas en el nivel Dominada.',
  'help.tip.tracker.status.mastered.example':
    '10 tarjetas, todas bien, 8 o más vuelven solo cada 21 días o más.',
  'help.tip.tracker.pin.meaning':
    'Fijaste este estado tú mismo, así que la aplicación no lo toca. Elige Auto en el menú para devolvérselo.',
  'help.tip.tracker.pin.example': 'Menú › Auto (ahora: Repaso).',
  'help.tip.tracker.lastRevised.meaning':
    'La última vez que respondiste una tarjeta de esta lección (un repaso o Practicar igualmente).',
  'help.tip.tracker.lastRevised.example':
    'Repasaste una de sus tarjetas ayer → la fecha de ayer.',
  'help.tip.tracker.cardsDue.meaning':
    'Tarjetas listas para repasar ahora, y tarjetas nuevas que aún no has empezado.',
  'help.tip.tracker.cardsDue.example': '5 pendientes · 20 nuevas.',
  'help.tip.tracker.correct.meaning':
    'De las tarjetas que has respondido, en cuántas tu última respuesta fue correcta (cualquiera salvo «Otra vez»).',
  'help.tip.tracker.correct.example':
    '8 de 10 tarjetas respondidas bien → 80 %.',
  'help.tip.tracker.levels.meaning':
    'Cuánto sabes de las tarjetas de esta lección, según lo separados que están sus repasos.',
  'help.tip.tracker.levels.example':
    '3 nuevas · 2 aprendiendo · 4 conocidas · 1 dominada.',
  'help.tip.tracker.level.new.meaning': 'Aún no has estudiado esta tarjeta.',
  'help.tip.tracker.level.new.example': 'Una tarjeta recién creada.',
  'help.tip.tracker.level.learning.meaning':
    'Todavía la estás aprendiendo, así que vuelve pronto.',
  'help.tip.tracker.level.learning.example':
    'Su próximo repaso está a menos de un día.',
  'help.tip.tracker.level.familiar.meaning':
    'La sabes casi siempre, y los repasos se van separando.',
  'help.tip.tracker.level.familiar.example':
    'Su próximo repaso está a entre 1 y 20 días.',
  'help.tip.tracker.level.mastered.meaning':
    'La sabes bien, así que solo la verás cada pocas semanas.',
  'help.tip.tracker.level.mastered.example':
    'Su próximo repaso está a 21 días o más.',
  'help.tip.tracker.confidence.meaning':
    'Tu propia sensación sobre esta lección, de 1 a 5 estrellas. La aplicación nunca la cambia.',
  'help.tip.tracker.confidence.example': '★★★☆☆ = bastante seguro.',
  'help.tip.tracker.newLesson.meaning':
    'Añade una lección: una página nueva al principio de este cuaderno.',
  'help.tip.tracker.newLesson.example':
    'Añade «Riñón» y escribe en ella sus notas y tarjetas.',
  'help.tip.tracker.chart.streak.meaning':
    'Cuántos días seguidos respondiste al menos una tarjeta. Un día que aún no ha terminado no la rompe.',
  'help.tip.tracker.chart.streak.example':
    '🔥 5 días = estudiaste todos los días desde el viernes.',
  'help.tip.tracker.chart.correct.meaning':
    'De todas tus respuestas de cada semana, cuántas no fueron «Otra vez». Cuentan todas las respuestas, incluso de la misma tarjeta.',
  'help.tip.tracker.chart.correct.example':
    'Una semana con 40 respuestas, 30 correctas → 75 %.',
  'help.tip.tracker.chart.days.meaning':
    'Cada cuadro es un día. Cuanto más oscuro, más tarjetas respondiste.',
  'help.tip.tracker.chart.days.example':
    'Un cuadro oscuro = un día de mucho estudio; uno vacío = un día libre.',
  'help.line.tracker.table':
    'Estado, Último repaso, Tarjetas pendientes, % correcto y Niveles de tarjetas se rellenan solos con tus repasos. Haz clic en un Estado para fijarlo tú 📌.',
  'help.line.tracker.levels':
    'Niveles de tarjetas: Nueva = sin estudiar · Aprendiendo = vuelve en menos de un día · Conocida = vuelve en 1–20 días · Dominada = vuelve en 21+ días.',
  'help.line.tracker.board':
    'Arrastra una lección a otra columna para fijar tú su estado 📌. Suéltala de nuevo en su columna automática para devolverla a Auto.',
  'help.tip.sidebar.today.meaning':
    'Abre la página del diario de hoy. Cada día tiene su propia página, hecha con la plantilla Diario.',
  'help.tip.sidebar.today.example':
    'Escribe lo que aprendiste hoy; mañana tendrás una página nueva.',
  'help.tip.sidebar.search.meaning':
    'Busca palabras en todas tus notas, tarjetas y etiquetas.',
  'help.tip.sidebar.search.example':
    'Escribe «mitral» para ver todas las notas y tarjetas que la mencionan.',
  'help.tip.sidebar.review.meaning':
    'Empieza a repasar las tarjetas que vencen hoy. La insignia muestra cuántas esperan.',
  'help.tip.sidebar.review.example':
    'Una insignia «12» significa que hay 12 tarjetas listas ahora.',
  'help.tip.sidebar.newNotebook.meaning':
    'Crea un cuaderno: un solo lugar para todas las páginas de una materia.',
  'help.tip.sidebar.newNotebook.example':
    'Crea un cuaderno llamado «Cardiología».',
  'help.tip.sidebar.notebook.meaning':
    'Abre el cuaderno (pestañas Notas, Base de datos y Tarjetas). Haz doble clic en el nombre para renombrarlo.',
  'help.tip.sidebar.notebook.example':
    'Haz clic en «Cardiología» para ver sus lecciones en una tabla.',
  'help.tip.sidebar.addPage.meaning':
    'Añade una página a este cuaderno: en blanco, o desde una plantilla.',
  'help.tip.sidebar.addPage.example':
    'Una página nueva llamada «Sonidos cardíacos».',
  'help.tip.sidebar.reviewNotebook.meaning':
    'Repasa solo las tarjetas pendientes de este cuaderno.',
  'help.tip.sidebar.reviewNotebook.example':
    'Repasa Cardiología sin ver las tarjetas de Química.',
  'help.tip.sidebar.rename.meaning': 'Cambia el nombre de este cuaderno.',
  'help.tip.sidebar.rename.example': '«Cardio» → «Cardiología».',
  'help.tip.sidebar.deleteNotebook.meaning':
    'Mueve el cuaderno y todas sus páginas a la papelera. Puedes restaurarlo desde allí.',
  'help.tip.sidebar.deleteNotebook.example':
    '¿Lo borraste sin querer? Abre la papelera y pulsa ↺.',
  'help.tip.sidebar.addSubPage.meaning':
    'Añade una página dentro de esta, para dividir un tema grande en partes.',
  'help.tip.sidebar.addSubPage.example':
    '«Válvulas» dentro de «Sonidos cardíacos».',
  'help.tip.sidebar.moveUp.meaning':
    'Sube esta página un lugar entre sus vecinas.',
  'help.tip.sidebar.moveUp.example': '«Válvulas» pasa por encima de «Soplos».',
  'help.tip.sidebar.moveDown.meaning':
    'Baja esta página un lugar entre sus vecinas.',
  'help.tip.sidebar.moveDown.example':
    '«Soplos» pasa por debajo de «Válvulas».',
  'help.tip.sidebar.moveTop.meaning':
    'Saca esta subpágina de su página madre y la convierte en una página independiente.',
  'help.tip.sidebar.moveTop.example':
    'La subpágina «Válvulas» se convierte en su propia lección.',
  'help.tip.sidebar.deletePage.meaning':
    'Mueve esta página y sus subpáginas a la papelera. Puedes restaurarlas.',
  'help.tip.sidebar.deletePage.example':
    'Restáurala más tarde desde la papelera.',
  'help.tip.sidebar.newTemplate.meaning':
    'Crea una plantilla: un diseño de página que puedes reutilizar para páginas nuevas.',
  'help.tip.sidebar.newTemplate.example':
    'Un diseño «Apuntes de estudio» con Resumen y Preguntas.',
  'help.tip.sidebar.deleteTemplate.meaning':
    'Elimina esta plantilla. Las páginas ya creadas con ella se quedan como están.',
  'help.tip.sidebar.deleteTemplate.example': 'Quita un diseño que ya no usas.',
  'help.tip.sidebar.restore.meaning':
    'Recupera este elemento de la papelera, con sus páginas y tarjetas.',
  'help.tip.sidebar.restore.example': 'Restaura la página «Sonidos cardíacos».',
  'help.tip.sidebar.deleteForever.meaning':
    'Borra este elemento para siempre, con sus tarjetas e historial de repaso. No se puede deshacer.',
  'help.tip.sidebar.deleteForever.example':
    'Limpia lo que nunca volverás a necesitar.',
  'help.tip.sidebar.newTag.meaning':
    'Crea una etiqueta: una marca que puedes poner en páginas y tarjetas para encontrarlas juntas.',
  'help.tip.sidebar.newTag.example':
    'Escribe «medicina/cardiología» para crear una etiqueta dentro de otra.',
  'help.tip.sidebar.tagOptions.meaning':
    'Renombra, mueve, combina, cambia de color o elimina esta etiqueta.',
  'help.tip.sidebar.tagOptions.example': 'Combina «cardio» con «cardiología».',
  'help.tip.sidebar.savedReview.meaning':
    'Repasa las tarjetas pendientes que encuentra esta búsqueda guardada.',
  'help.tip.sidebar.savedReview.example':
    'Una búsqueda guardada de «Tarjetas más falladas» se convierte en un mazo de estudio.',
  'help.tip.sidebar.savedRename.meaning':
    'Cambia el nombre de esta búsqueda guardada.',
  'help.tip.sidebar.savedRename.example':
    '«Tarjetas falladas» → «Las difíciles».',
  'help.tip.sidebar.savedDelete.meaning':
    'Elimina esta búsqueda guardada. Tus notas y tarjetas no se tocan.',
  'help.tip.sidebar.savedDelete.example': 'Quita una búsqueda que ya no usas.',
  'help.tip.sidebar.settings.meaning':
    'Abre Ajustes: tema, cuándo empieza tu día, límites de repaso y más.',
  'help.tip.sidebar.settings.example':
    'Desactiva «Mostrar ayuda» cuando ya conozcas la aplicación.',
  'help.tip.sidebar.theme.meaning':
    'Cambia el aspecto de la aplicación: claro, oscuro o papel cálido.',
  'help.tip.sidebar.theme.example':
    'La noche cansa menos la vista por la tarde.',
  'help.tip.notebook.tabNotes.meaning':
    'Las páginas de este cuaderno, como una lista que puedes abrir.',
  'help.tip.notebook.tabNotes.example':
    'Abre «Sonidos cardíacos» para leerla o editarla.',
  'help.tip.notebook.tabDatabase.meaning':
    'Tu Seguimiento de estudio: una fila por lección, con su estado y progreso. Puedes añadir tus propias columnas.',
  'help.tip.notebook.tabDatabase.example':
    'Mira qué lecciones aún necesitan trabajo.',
  'help.tip.notebook.tabCards.meaning':
    'Todas las tarjetas de este cuaderno en una lista, con cuándo vencen.',
  'help.tip.notebook.tabCards.example':
    'Encuentra una tarjeta rápido, o repásalas todas.',
  'help.tip.notebook.tabOptions.meaning':
    'Renombra u oculta las pestañas de este cuaderno.',
  'help.tip.notebook.tabOptions.example':
    'Oculta la pestaña Tarjetas si nunca la usas.',
  'help.tip.notebook.close.meaning':
    'Cierra el cuaderno y vuelve a tu última página.',
  'help.tip.notebook.close.example': 'De vuelta a donde estabas escribiendo.',
  'help.tip.page.reviewPage.meaning':
    'Repasa las tarjetas pendientes de esta página y las de sus subpáginas.',
  'help.tip.page.reviewPage.example':
    'Repasa una lección justo después de leerla.',
  'help.tip.page.saveTemplate.meaning':
    'Guarda el diseño de esta página como plantilla para páginas nuevas (con sus subpáginas).',
  'help.tip.page.saveTemplate.example':
    'Convierte una buena página de lección en un diseño reutilizable.',
  'help.tip.page.history.meaning':
    'Muestra copias anteriores de esta página. Puedes ver una y recuperarla.',
  'help.tip.page.history.example':
    'Deshaz un párrafo que borraste por error la semana pasada.',
  'help.tip.page.import.meaning':
    'Traerá un archivo a esta página. Llegará en una fase posterior.',
  'help.tip.page.import.example': 'Importa notas de otra aplicación.',
  'help.tip.page.export.meaning':
    'Guarda o comparte esta página como PDF, Word, Markdown o texto.',
  'help.tip.page.export.example': 'Exporta una lección como documento.',
  'help.tip.page.addTag.meaning':
    'Pone una etiqueta en esta página para encontrarla junto con otras.',
  'help.tip.page.addTag.example':
    'Etiqueta «Sonidos cardíacos» con «cardiología».',
  'help.tip.review.show.meaning':
    'Muestra la respuesta. Intenta recordarla primero, y luego compruébalo.',
  'help.tip.review.show.example': 'Pulsa la barra espaciadora para mostrarla.',
  'help.tip.review.ratings.meaning':
    'Dile a la aplicación cuánto recordaste. El tiempo bajo cada botón es cuándo vuelve la tarjeta.',
  'help.tip.review.ratings.example':
    'Lo olvidé → Otra vez (pronto). Lo sabía fácilmente → Fácil (mucho después).',
  'help.tip.review.scope.meaning':
    'Elige qué tarjetas repasar: todas las pendientes, o solo las que fallaste hace poco.',
}
