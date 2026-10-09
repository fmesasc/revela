// Complemento de ejemplo: «Revisor».
// Mientras editas, vigila la presentación y cuenta los avisos en su propio botón:
// diapositivas sin título y diapositivas con demasiado texto. Al pulsarlo, los
// enumera y te lleva a la primera.
// Muestra: escuchar los cambios (Revela.on('change')) sin frenar el editor —
// esperando a que dejes de escribir —, y cambiar el texto del propio botón.

const MAX_WORDS = 60;   // más que esto en una diapositiva cuesta leerlo mientras hablas
const words = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent.match(/[\p{L}\p{N}]+/gu) || []).length; };
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };

// Los avisos de toda la presentación: [{ slide, text }], la diapositiva desde 0.
function review(deck) {
  const out = [];
  deck.slides.forEach((s, i) => {
    if (s.hidden) return;
    const title = s.blocks.find(b => b.ph === 'title');
    if (i > 0 && !plain(title?.html)) out.push({ slide: i, text: 'no tiene título' });
    const n = s.blocks.filter(b => b.type === 'text' || b.type === 'shape').reduce((t, b) => t + words(b.html), 0);
    if (n > MAX_WORDS) out.push({ slide: i, text: `tiene ${n} palabras (mejor menos de ${MAX_WORDS})` });
  });
  return out;
}

export default function (Revela) {
  let found = [];
  // (Volver a añadir el botón con el mismo id lo sustituye: así cambia su texto.)
  const button = () => Revela.ui.addButton({
    id: 'revisor', icon: found.length ? 'rule' : 'task_alt',
    label: found.length ? `Revisar (${found.length})` : 'Revisado',
    title: 'Diapositivas sin título o con demasiado texto',
    onClick: async R => {
      if (!found.length) return R.ui.alert('Todo en orden: cada diapositiva tiene título y poco texto.');
      await R.ui.alert(found.map(f => `Diapositiva ${f.slide + 1}: ${f.text}`).join('\n'));
      R.slides.goTo(found[0].slide);
    },
  });
  // Cada cambio — también cada tecla — avisa; revisar entonces haría ir más lento al
  // escribir. Se espera a medio segundo sin cambios.
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = setTimeout(() => { found = review(Revela.deck()); button(); }, 500); };
  Revela.on('change', later);
  found = review(Revela.deck()); button();
}
