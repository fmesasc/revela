// Archivo ▸ Descargar: the presentation as a file of its own (io/formats/project.js), a package (.revela), said while it
// is put together (how far) and when it is done.

import { state } from '../../core/store.js';
import { saveProject } from '../../io/formats/project.js';
import { toast, withProgress } from './toast.js';
import { t } from '../../i18n/index.js';

export async function downloadProject() {
  try {
    const kind = await withProgress(t('Preparando el paquete (.revela)…'), say => saveProject({ onProgress: (a, b) => say(b ? Math.round(a * 100 / b) + ' %' : '') }));
    if (kind) toast(t('Proyecto descargado como paquete (.revela): sus imágenes, vídeos y modelos van dentro tal cual. Para seguir con él otro día: Archivo ▸ Abrir.'));
  } catch (e) { toast(t('No se pudo preparar el paquete:') + ' ' + (e?.message || e), { error: true }); }
}
