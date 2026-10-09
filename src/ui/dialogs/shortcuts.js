// Keyboard shortcuts reference.

import { t } from '../../i18n/index.js';

const $ = s => document.querySelector(s);

// Section titles are rows with an empty key.
export const SHORTCUTS = [
  ['', 'Edición'],
  ['Ctrl/⌘ + C', 'Copiar'], ['Ctrl/⌘ + X', 'Cortar'], ['Ctrl/⌘ + V', 'Pegar'],
  ['Ctrl/⌘ + Z', 'Deshacer'], ['Ctrl/⌘ + Y', 'Rehacer'], ['Ctrl/⌘ + D', 'Duplicar'],
  ['Ctrl/⌘ + G', 'Agrupar'], ['Ctrl/⌘ + Mayús + G', 'Desagrupar'], ['Ctrl/⌘ + F', 'Buscar y reemplazar'],
  ['Ctrl/⌘ + Mayús + V', 'Pegar sin formato'], ['Supr / Retroceso', 'Eliminar'],
  ['Flechas', 'Mover 1 px'], ['Mayús + Flechas', 'Mover 10 px'], ['Esc', 'Salir de edición'],
  ['Doble clic', 'Editar objeto'], ['Mayús al redimensionar', 'Mantener proporción'],
  ['Arrastrar en vacío', 'Selección múltiple'], ['Mayús + clic', 'Añadir a la selección'],
  ['Alt + arrastrar', 'Arrastrar una copia (el original se queda)'], ['Ctrl/⌘ + D tras mover la copia', 'Otra copia con la misma separación'],
  ['Espacio + arrastrar', 'Mover la vista (con zoom)'], ['Mayús + 2', 'Zoom a la selección'],
  ['Tab / Mayús + Tab', 'Recorrer los objetos (con la diapositiva enfocada)'],
  ['Mantener pulsado', 'Menú de opciones en pantallas táctiles'],
  ['Ctrl/⌘ + K · Alt + Q · /', 'Buscar comandos'], ['Ctrl/⌘ + A', 'Seleccionar todo'], ['Esc', 'Quitar la selección'], ['Ctrl/⌘ + S', 'Guardar'],
  ['', 'Diapositivas'],
  ['Ctrl/⌘ + M', 'Nueva diapositiva'], ['Re Pág · Av Pág', 'Diapositiva anterior · siguiente'], ['Inicio · Fin', 'Primera · última diapositiva'],
  ['Flechas (sin nada seleccionado)', 'Cambiar de diapositiva'], ['F5', 'Presentar desde el principio'], ['Mayús + F5', 'Presentar desde esta diapositiva'],
  ['Panel: Ctrl/⌘ + clic · Mayús + clic', 'Seleccionar varias diapositivas'], ['Panel: Mayús + ↑/↓ · Ctrl/⌘ + A', 'Ampliar la selección · todas las diapositivas'],
  ['Clasificador: flechas · Supr · Ctrl/⌘ + D', 'Moverse · borrar · duplicar diapositivas'], ['Clasificador: Intro / doble clic', 'Editar esa diapositiva'],
  ['', 'Al presentar'],
  ['→ / Espacio · ←', 'Siguiente · anterior'], ['Ctrl/⌘ + P', 'Lápiz'], ['Ctrl/⌘ + I', 'Resaltador'], ['Ctrl/⌘ + L', 'Puntero láser'],
  ['E', 'Borrar la tinta de la diapositiva'], ['C', 'Subtítulos en directo'], ['B / .', 'Pantalla en negro'],
  ['S', 'Vista del orador'], ['O / Esc', 'Vista general'], ['F', 'Pantalla completa'],
];
export function openShortcuts() {
  if (document.getElementById('sc-modal')) return;
  const back = document.createElement('div');
  back.id = 'sc-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(600px, 92vw);max-width:none;box-sizing:border-box">
    <button class="modal-close">✕</button><h3>${t('Atajos de teclado')}</h3>
    <table class="sc-table">${SHORTCUTS.map(([k, d]) => k ? `<tr><td><kbd>${k}</kbd></td><td>${t(d)}</td></tr>` : `<tr><th colspan="2">${t(d)}</th></tr>`).join('')}</table>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.modal-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
}
