// Non‑interactive block rendering, shared by slide thumbnails.

export function blockPreview(b) {
  const el = document.createElement('div');
  el.className = 'pv-block';
  el.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;`
    + `height:${b.h}px;transform:rotate(${b.rotation || 0}deg)`;
  if (b.type === 'text') {
    el.innerHTML = `<div style="font-size:${b.fontSize || 40}px;color:#fff">${b.html || ''}</div>`;
  } else if (b.type === 'image') {
    el.innerHTML = `<img src="${b.src}" style="width:100%;height:100%;object-fit:${b.fit || 'contain'}">`;
  } else if (b.type === 'video') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#000;display:grid;place-items:center;color:#fff;font-size:60px">▶</div>`;
  } else if (b.type === 'model') {
    el.innerHTML = `<div style="width:100%;height:100%;background:#0003;display:grid;place-items:center;font-size:80px">🧊</div>`;
  }
  return el;
}
