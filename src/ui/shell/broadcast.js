// «Emitir en directo» (Ver ▸ Presentación): present to a big audience who follow in their own browsers — the link
// and its QR to share, then the presentation as always while each change of slide or step, and the pointer, goes to
// the room on Revela's server (server/cloudflare/broadcast.js) and from there to everyone. How many follow is shown
// while presenting. For a class with polls on the phones the classroom mode stays (browser to browser); this is for
// talks, webinars and events, hundreds or thousands at once. The presentation must be in Revela's cloud.

import * as cd from '../../io/cloud/clouddocs.js';
import { account, api, apiBase } from '../../io/cloud/account.js';
import { QRCODE, loadScript } from '../../core/vendor.js';
import { esc } from '../../core/text.js';
import { t } from '../../i18n/index.js';
import { alertDialog, confirmDialog } from '../dialogs/dialog.js';

export async function openBroadcast() {
  const doc = cd.cloudDoc();
  if (!account() || !doc) return alertDialog(t('Para emitirla en directo, guárdala en tu nube de Revela (Archivo ▸ Mi nube): el público la abre desde allí.'));
  if (!['owner', 'edit'].includes(doc.role)) return alertDialog(t('Solo quien puede editarla puede emitirla.'));
  let live;
  try { live = await api('live', { doc: doc.id }); }
  catch (e) {
    if (e.status !== 409) return alertDialog(e.message || String(e));
    if (doc.role !== 'owner') return alertDialog(t('Para que el público la vea sin cuenta, quien la comparte debe dejar que cualquiera con el enlace pueda presentarla.'));
    if (!(await confirmDialog(t('Para que el público la vea sin cuenta, cualquiera con el enlace podrá verla como presentación (sin el editor ni las notas). ¿Continuar?')))) return;
    try { const r = await cd.shareDoc(doc.id, { link: 'present' }); cd.setSharing(r.sharing); live = await api('live', { doc: doc.id }); }
    catch (e2) { return alertDialog(e2.message || String(e2)); }
  }
  document.getElementById('live-modal')?.remove();
  const back = document.createElement('div'); back.id = 'live-modal'; back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal" style="text-align:start;width:min(560px,96vw);max-width:none"><button class="modal-close">✕</button><h3>${t('Emitir en directo')}</h3>
    <p class="host-help">${t('Comparte este enlace: quien lo abra verá la presentación en su navegador, siguiendo tus diapositivas y tu puntero, sin cuenta y sin instalar nada. Sirve para cientos o miles de personas.')}</p>
    <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><canvas class="lv-qr" width="150" height="150" style="background:#fff;border-radius:8px"></canvas>
      <div style="flex:1;min-width:220px"><div class="sh-row"><input readonly class="lv-link" value="${esc(live.url)}"><button type="button" class="mini2 lv-copy">${t('Copiar')}</button></div></div></div>
    <div class="fr-actions"><button type="button" class="fr-do lv-go">${t('Empezar a presentar')}</button></div></div>`;
  document.body.appendChild(back);
  const q = s => back.querySelector(s), close = () => back.remove();
  q('.modal-close').addEventListener('click', close); back.addEventListener('click', e => { if (e.target === back) close(); });
  loadScript(QRCODE, 'QRCode').then(QR => QR.toCanvas(q('.lv-qr'), live.url, { width: 150, margin: 1 }, () => {})).catch(() => { q('.lv-qr').hidden = true; });
  q('.lv-copy').addEventListener('click', e => { navigator.clipboard?.writeText(live.url); e.target.textContent = t('Copiado'); });
  q('.lv-go').addEventListener('click', async () => { close(); (await import('./present.js')).present({ live }); });
}

// While presenting (present.js): the frame's reveal.js and pointer, sent to the room. Returns how to stop.
export function attachLive(frame, live, overlay) {
  const base = new URL('live/' + encodeURIComponent(live.room), apiBase() || location.origin + '/api/');
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'; base.searchParams.set('token', live.token);
  const badge = document.createElement('div'); badge.id = 'live-badge';
  badge.style.cssText = 'position:absolute;top:10px;left:10px;z-index:5;background:#c0392b;color:#fff;font:600 13px system-ui;padding:4px 10px;border-radius:12px;pointer-events:none';
  badge.textContent = '● ' + t('En directo'); overlay.appendChild(badge);
  let ws = null, ended = false, tries = 0, Rv = null, lastPtr = 0;
  const send = m => { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); };
  const where = () => { if (!Rv) return; const i = Rv.getIndices(); send({ t: 'go', h: i.h, v: i.v || 0, f: i.f ?? -1 }); };
  const open = () => {
    ws = new WebSocket(base.href);
    ws.onopen = () => { tries = 0; where(); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.t === 'n') badge.textContent = '● ' + t('En directo') + ' · ' + t('{n} personas').replace('{n}', m.n); };
    ws.onclose = () => { if (!ended && tries++ < 20) setTimeout(open, Math.min(30000, 1000 * tries)); };
  };
  open();
  const hook = setInterval(() => {
    const R = frame.contentWindow?.Reveal; if (!R?.isReady?.()) return;
    clearInterval(hook); Rv = R;
    for (const ev of ['slidechanged', 'fragmentshown', 'fragmenthidden']) R.on(ev, where);
    where();
    // (The pointer over the slide, as a fraction of it, at most ten times a second; off the slide: gone.)
    const D = frame.contentDocument;
    D.addEventListener('pointermove', e => {
      const now = Date.now(); if (now - lastPtr < 100) return; lastPtr = now;
      const b = D.querySelector('.reveal .slides')?.getBoundingClientRect(); if (!b?.width) return;
      const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      send(x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { t: 'ptr', x, y } : { t: 'ptr', x: null, y: null });
    }, { passive: true });
    D.addEventListener('pointerleave', () => send({ t: 'ptr', x: null, y: null }));
  }, 150);
  return () => { ended = true; clearInterval(hook); send({ t: 'end' }); try { ws?.close(); } catch {} badge.remove(); };
}
