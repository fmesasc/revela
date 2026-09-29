// A small menu under a button (account, canvas picture, add animation…): it
// closes when an item is chosen or on a click elsewhere. Items are buttons with
// a data-<attr> key; onPick gets that key.

export function popupMenu(anchor, { id, html, attr = 'key', className = '', align = 'left', onPick }) {
  document.getElementById(id)?.remove();
  const m = document.createElement('div'); m.id = id; m.className = `popup-menu ${className}`.trim(); m.innerHTML = html;
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(); m.style.top = r.bottom + 6 + 'px';
  if (align === 'right') m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  else m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  const close = () => { m.remove(); document.removeEventListener('pointerdown', off, true); };
  const off = e => { if (!m.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('pointerdown', off, true));
  m.addEventListener('click', e => { const k = e.target.closest(`[data-${attr}]`)?.dataset[attr]; if (k == null) return; close(); onPick(k); });
  return m;
}
