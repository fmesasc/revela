// Complemento de ejemplo: «Wikimedia».
// Busca una imagen libre en Wikimedia Commons y la pone en la diapositiva con su
// crédito debajo: autor y licencia, como piden esas licencias.
// Muestra: pedir un texto, consultar un servicio de internet (con CORS: `origin=*`),
// avisar si falla, y añadir varios objetos que van juntos.

const API = 'https://commons.wikimedia.org/w/api.php';
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// La primera imagen (JPEG o PNG) que encuentra Commons: { src, w, h, author, license, page } o null.
export async function search(term, f = fetch) {
  const q = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6',
    gsrsearch: `${term} filetype:bitmap`, gsrlimit: '8', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1280' });
  const r = await f(`${API}?${q}`);
  if (!r.ok) throw new Error(`Wikimedia respondió ${r.status}`);
  const pages = Object.values((await r.json()).query?.pages || {}).sort((a, b) => a.index - b.index);
  for (const p of pages) {
    const ii = p.imageinfo?.[0], m = ii?.extmetadata || {};
    if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime)) continue;
    return { src: ii.thumburl || ii.url, w: ii.thumbwidth || ii.width, h: ii.thumbheight || ii.height,
      author: plain(m.Artist?.value) || 'Autor desconocido', license: plain(m.LicenseShortName?.value) || 'ver la página', page: ii.descriptionurl };
  }
  return null;
}

export default function (Revela) {
  Revela.ui.addButton({
    id: 'wikimedia', label: 'Wikimedia', icon: 'image_search',
    title: 'Buscar una imagen libre en Wikimedia Commons',
    onClick: async R => {
      const term = (await R.ui.prompt('¿Qué imagen buscas? (mejor en inglés: hay más)', ''))?.trim();
      if (!term) return;
      let img;
      try { img = await search(term); } catch (e) { return R.ui.alert('No se pudo buscar en Wikimedia: ' + e.message); }
      if (!img) return R.ui.alert(`No hay imágenes de «${term}».`);
      // Cabe en 800 × 520, centrada, sin deformarla; el crédito, justo debajo.
      const k = Math.min(800 / img.w, 520 / img.h), w = Math.round(img.w * k), h = Math.round(img.h * k), x = Math.round((1280 - w) / 2), y = 70;
      R.add.image(img.src, { x, y, w, h, alt: term });
      R.add.text(`${esc(img.author)} · ${esc(img.license)} · <a href="${esc(img.page)}">Wikimedia Commons</a>`,
        { x, y: y + h + 8, w, h: 36, fontSize: 14, color: '#6b6e76', textAlign: 'center' });
    },
  });
}
