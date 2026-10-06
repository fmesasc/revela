// A small menu under a button (account, canvas picture, add animation…): it
// closes when an item is chosen or on a click elsewhere. Items are buttons with
// a data-<attr> key; onPick gets that key.

export function popupMenu(anchor, { id, html, attr = 'key', className = '', align = 'left', onPick }) {
  document.getElementById(id)?.remove();
  const m = document.createElement('div'); m.id = id; m.className = `popup-menu ${className}`.trim(); m.innerHTML = html;
  document.body.appendChild(m);
  // Under its button, aligned to one side — and always whole on the screen (a phone's is narrow): no wider or taller
  // than the window, moved in from either edge, scrolling inside if it must.
  m.style.maxWidth = `calc(100vw - 16px)`;
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, top = r.bottom + 6;
  const left = align === 'right' ? r.right - w : r.left;
  m.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + 'px'; m.style.right = 'auto';
  m.style.top = top + 'px'; m.style.maxHeight = Math.max(160, innerHeight - top - 8) + 'px'; m.style.overflowY = 'auto';
  const close = () => { m.remove(); document.removeEventListener('pointerdown', off, true); };
  const off = e => { if (!m.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('pointerdown', off, true));
  m.addEventListener('click', e => { const k = e.target.closest(`[data-${attr}]`)?.dataset[attr]; if (k == null) return; close(); onPick(k); });
  return m;
}
