// Complemento de ejemplo: «Agenda».
// Añade, después de la portada, una diapositiva con los títulos de las demás.
// Muestra: un botón en la cinta, leer la presentación (Revela.deck), añadir una
// diapositiva y rellenar sus marcadores (Revela.update) o, si no tiene, añadir texto.
//
// Para probarlo: Ver ▸ Complementos ▸ pega
//   https://cdn.jsdelivr.net/gh/fmesasc/revela@main/examples/complementos/agenda.js

const textOf = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export default function (Revela) {
  Revela.ui.addButton({
    id: 'agenda', label: 'Agenda', icon: 'format_list_numbered',
    title: 'Añadir una diapositiva de agenda con los títulos de las demás',
    onClick: async R => {
      // Los títulos: el marcador de título de cada diapositiva (o su primer texto).
      const titles = R.deck().slides.slice(1)
        .map(s => textOf((s.blocks.find(b => b.ph === 'title') || s.blocks.find(b => b.type === 'text'))?.html))
        .filter(Boolean);
      if (!titles.length) return R.ui.alert('Añade primero diapositivas con título.');

      R.slides.goTo(0);
      const i = R.slides.add();                       // (después de la portada)
      const list = '<ol>' + titles.map(t => `<li>${esc(t)}</li>`).join('') + '</ol>';
      const slide = R.deck().slides[i];
      const title = slide.blocks.find(b => b.ph === 'title'), body = slide.blocks.find(b => b.ph === 'body');
      if (title) R.update(title.id, { html: 'Agenda' }); else R.add.text('<b>Agenda</b>', { x: 90, y: 60, w: 1100, h: 90, fontSize: 52 });
      if (body) R.update(body.id, { html: list }); else R.add.text(list, { x: 90, y: 170, w: 1100, h: 480, fontSize: 28 });
    },
  });
}
