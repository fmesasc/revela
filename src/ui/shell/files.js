// Saving an object's file (picture, video, sound, 3D model) to the computer.

import { blockFile, download } from '../../io/files.js';
import { alertDialog } from '../dialogs/dialog.js';
import { t } from '../../i18n/index.js';

export async function saveBlockFile(b) {
  try { const { blob, name } = await blockFile(b); download(blob, name); }
  catch (e) { alertDialog(t('No se pudo guardar el archivo: ') + (e.message || e)); }
}
