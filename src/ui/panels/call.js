// The video call panel (Pro, presentations in Revela's cloud): a small floating
// window with everyone's video, and the microphone, camera and hang-up buttons.

import { esc } from '../../core/text.js';
import { startCall } from '../../io/cloud/call.js';
import { cloudDoc } from '../../io/cloud/clouddocs.js';
import { account } from '../../io/cloud/account.js';
import { t } from '../../i18n/index.js';
import { alertDialog } from '../dialogs/dialog.js';
import { openCloudShare } from '../dialogs/cloud.js';

let current = null;
export const inCall = () => !!current;

export async function toggleCall(opts = {}) {
  if (current) return hangUp();
  const d = cloudDoc();
  if (!d) { await alertDialog(t('Las videollamadas son para presentaciones de tu nube de Revela: guárdala allí y compártela con quien quieras hablar.')); return openCloudShare(); }
  const panel = document.createElement('div'); panel.id = 'call-panel';
  panel.innerHTML = `<div class="call-head"><b><i class="ms">videocam</i> ${t('Videollamada')}</b><span class="call-n"></span></div><div class="call-grid"></div>
    <div class="call-bar"><button type="button" class="call-mic on" title="${t('Micrófono')}"><i class="ms">mic</i></button><button type="button" class="call-cam on" title="${t('Cámara')}"><i class="ms">videocam</i></button>
    <button type="button" class="call-end" title="${t('Colgar')}"><i class="ms">call_end</i></button></div>`;
  document.body.appendChild(panel);
  const grid = panel.querySelector('.call-grid'), tiles = new Map();
  const tile = (id, label, stream, muted = false) => {
    let el = tiles.get(id);
    if (!el) { el = document.createElement('figure'); el.className = 'call-tile'; el.innerHTML = `<video autoplay playsinline${muted ? ' muted' : ''}></video><figcaption></figcaption>`; grid.appendChild(el); tiles.set(id, el); }
    el.querySelector('figcaption').textContent = label;
    if (stream && el.querySelector('video').srcObject !== stream) el.querySelector('video').srcObject = stream;
  };
  panel.querySelector('.call-end').addEventListener('click', () => hangUp());
  try {
    current = await startCall({ doc: d.id, name: account()?.email?.split('@')[0] || '', ...opts,
      onStream: (pid, s) => tile(pid, (current?.people() || []).find(p => p.pid === pid)?.name || '…', s),
      onPeople: people => {
        for (const [id, el] of tiles) if (id !== 'me' && !people.some(p => p.pid === id)) { el.remove(); tiles.delete(id); }
        for (const p of people) if (tiles.has(p.pid)) tiles.get(p.pid).querySelector('figcaption').textContent = p.name || '…';
        panel.querySelector('.call-n').textContent = `${people.length + 1} ${t('personas')}`;
      } });
    tile('me', t('Tú'), current.stream, true);
    for (const [b, set] of [['.call-mic', current.setMic], ['.call-cam', current.setCam]]) {
      const btn = panel.querySelector(b);
      btn.addEventListener('click', () => { const on = !btn.classList.contains('on'); set(on); btn.classList.toggle('on', on); btn.querySelector('.ms').textContent = b === '.call-mic' ? (on ? 'mic' : 'mic_off') : (on ? 'videocam' : 'videocam_off'); });
    }
    if (!current.stream.getVideoTracks().length) panel.querySelector('.call-cam').hidden = true;
  } catch (e) {
    panel.remove(); current = null;
    alertDialog(e.status === 402 ? t('Las videollamadas son del plan Pro.') : e.status === 503 ? t('Las videollamadas aún no están disponibles.') : e.name === 'NotAllowedError' ? t('Sin permiso para usar el micrófono o la cámara.') : `${t('No se pudo iniciar la llamada:')} ${esc(e.message || e)}`);
  }
}
async function hangUp() {
  const c = current; current = null;
  document.getElementById('call-panel')?.remove();
  await c?.stop();
}
