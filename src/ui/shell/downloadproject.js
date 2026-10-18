// Archivo ▸ Descargar: the presentation as a file of its own (io/formats/project.js) — a .revela.json, or a package
// (.revela) when big, said while it is put together (how far) and when it is done.

import { state } from '../../core/store.js';
import { saveProject, fileSize } from '../../io/formats/project.js';
import { PACKAGE_MIN } from '../../io/formats/package.js';
import { toast, withProgress } from './toast.js';
import { t } from '../../i18n/index.js';

export async function downloadProject() {
  const done = kind => toast(kind === 'package'
    ? t('Proyecto descargado como paquete (.revela): sus imágenes, vídeos y modelos van dentro tal cual. Para seguir con él otro día: Archivo ▸ Abrir.')
    : t('Proyecto descargado (.revela.json). Para seguir con él otro día: Archivo ▸ Abrir.'));
  if (fileSize(state.deck) <= PACKAGE_MIN) { done(await saveProject()); return; }
  try {
    const kind = await withProgress(t('Preparando el paquete (.revela)…'), say => saveProject({ onProgress: (a, b) => say(b ? Math.round(a * 100 / b) + ' %' : '') }));
    done(kind);
  } catch (e) { toast(t('No se pudo preparar el paquete:') + ' ' + (e?.message || e), { error: true }); }
}
