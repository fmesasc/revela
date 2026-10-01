// Complemento de ejemplo: «Palabras».
// Cuenta las palabras de las diapositivas y de las notas, y calcula cuánto se tarda
// en presentarla (a unas 130 palabras por minuto, leyendo las notas).
// Muestra: recorrer todas las diapositivas y sus objetos, y los diálogos de Revela.

const words = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent.match(/[\p{L}\p{N}]+/gu) || []).length; };

export default function (Revela) {
  Revela.ui.addButton({
    id: 'palabras', label: 'Palabras', icon: 'timer',
    title: 'Contar palabras y calcular la duración',
    onClick: R => {
      const deck = R.deck();
      let onSlides = 0, inNotes = 0;
      for (const s of deck.slides) {
        for (const b of s.blocks) if (b.type === 'text' || b.type === 'shape') onSlides += words(b.html);
        inNotes += words(s.notes);
      }
      const minutes = Math.max(1, Math.round(inNotes / 130));
      R.ui.alert(`${deck.slides.length} diapositivas · ${onSlides} palabras en pantalla · ${inNotes} en las notas.\n` +
        (inNotes ? `Leyendo las notas, unos ${minutes} min.` : 'Escribe notas para calcular la duración.'));
    },
  });
}
