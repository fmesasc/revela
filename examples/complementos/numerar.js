// Complemento de ejemplo: «Numerar».
// Pone «n / total» en la esquina de cada diapositiva menos la portada; si se vuelve
// a pulsar, actualiza los números (por ejemplo, después de añadir diapositivas).
// Muestra: recorrer las diapositivas, marcar los objetos propios con una propiedad
// (aquí `numerar: true`) para encontrarlos después, y actualizarlos.

export default function (Revela) {
  Revela.ui.addButton({
    id: 'numerar', label: 'Numerar', icon: 'pin',
    title: 'Numerar las diapositivas (n / total)',
    onClick: async R => {
      const total = R.slides.count(), back = R.slides.current();
      if (total < 2) return R.ui.alert('Hace falta más de una diapositiva.');
      for (let i = 1; i < total; i++) {
        const text = `${i + 1} / ${total}`;
        const mine = R.deck().slides[i].blocks.find(b => b.numerar);
        if (mine) { R.update(mine.id, { html: text }); continue; }
        R.slides.goTo(i);
        const id = R.add.text(text, { x: 1080, y: 660, w: 160, h: 40, fontSize: 18, textAlign: 'right' });
        R.update(id, { numerar: true, color: '#8a8b90' });
      }
      R.slides.goTo(back);
    },
  });
}
