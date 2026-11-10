/** Spanish text of the Notebooks home (draft: needs native review). English is enNbh.ts. */
import { esRobust } from './esRobust'

export const esNbh: Record<string, string> = {
  ...esRobust,
  'nbh.title': 'Cuadernos',
  'nbh.new': 'Cuaderno nuevo',
  'nbh.layout': 'Vista',
  'nbh.layout.shelf': 'Estante',
  'nbh.layout.list': 'Lista',
  'nbh.today': 'Hoy',
  'nbh.yesterday': 'Ayer',
  'nbh.due': '{n} pendientes',
  'nbh.starNamed': 'Fijar {name}',
  'nbh.unstarNamed': 'Quitar {name} de los fijados',
  'nbh.star': 'Fijar arriba',
  'nbh.unstar': 'Quitar de fijados',
  'nbh.menu': 'Opciones de {name}',
  'nbh.cover.page': 'Usar la primera página como portada',
  'nbh.cover.colour': 'Usar una portada de color',
  'nbh.colour.next': 'Cambiar color',
  'nbh.blankPage': 'Página vacía',
  'rvh.title': 'Repaso',
  'rvh.due': 'Hay {n} tarjetas listas para repasar.',
  'rvh.none': 'No hay nada pendiente.',
  'rvh.start': 'Empezar repaso',
  'rvh.allCards': 'Todas las tarjetas',
  'settings.showRefresh.label':
    'Mostrar el botón Actualizar en la barra superior',
  'settings.showRefresh.description':
    'Un botón Actualizar junto a Atrás y Adelante. Guarda primero y reinicia la app en la misma página.',
  'nav.refresh': 'Actualizar la app',
  'sync.allOn.notice':
    'Ahora todo se sincroniza, también las claves de IA (cifradas de extremo a extremo, nunca en copias). Puedes cambiarlo en Ajustes.',
  'sync.allOn.change': 'Revisar',
  'history.reason.big': 'cambio grande',
  'history.reason.leave': 'al salir',
  'history.reason.before-restore': 'antes de restaurar',
  'history.contains':
    'Cuadros: {boxes}. Dibujo: {ink}. Restaurar recupera toda la página.',
  'history.inkYes': 'sí',
  'history.inkNo': 'ninguno',
}
