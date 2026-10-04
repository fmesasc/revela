// The ribbon's groups of small controls (font and size over bold, italic…, lists,
// colour pickers) in two rows instead of one long one, as PowerPoint does: the
// ribbon's height is used and less of it has to scroll sideways. Done once per
// group when it is first shown (the contextual tabs' groups are new each time);
// groups with big buttons stay as they are.

const SKIP = 'datalist, .group-more';
export function compactGroups(page) {
  if (!page || !page.offsetParent) return;                 // (hidden: its sizes aren't known yet)
  for (const g of page.querySelectorAll(':scope > .group')) {
    if (g.dataset.compact) continue;
    g.dataset.compact = '1';
    const rows = g.querySelectorAll(':scope > .row'); if (rows.length !== 1) continue;
    const row = rows[0], items = [...row.children].filter(el => !el.matches(SKIP) && el.offsetParent);
    if (items.some(el => el.matches('.lg'))) continue;
    // Labelled lists and numbers (the object tabs): the label beside each one, and
    // them two by two in aligned columns, as in a form.
    const fields = items.filter(el => el.matches('.ctx-field')).length;
    if (fields) g.classList.add('inline-labels');
    if (fields >= 2 && fields * 2 >= items.length) {
      g.classList.add('grid2');
      const tall = Math.max(...items.map(el => el.offsetHeight));
      if (tall * 2 + 6 > row.clientHeight) g.classList.remove('grid2');
      continue;
    }
    if (items.length < 3) continue;
    // Buttons with a label under the icon: the label beside it (PowerPoint's small buttons).
    const labelled = items.filter(el => el.matches('button') && el.querySelector('span'));
    const saved = labelled.map(el => [el.querySelector('span'), el.querySelector('span').innerHTML]);
    const avail = row.clientHeight;
    if (labelled.length) { g.classList.add('inline-labels'); saved.forEach(([sp]) => unbreak(sp)); }
    const tallest = Math.max(...items.map(el => el.offsetHeight)), gap = 3;
    if (tallest * 2 + gap + 2 > avail) {                   // (two rows wouldn't fit: as it was)
      g.classList.remove('inline-labels'); saved.forEach(([sp, h]) => { sp.innerHTML = h; }); continue;
    }
    const widths = items.map(el => el.offsetWidth), total = widths.reduce((a, b) => a + b, 0);
    if (total < 170) continue;                             // (short already)
    // Split where the group says (.row-break: Home ▸ Font, family and size above), else
    // where the first row gets about half the width (never leaving a row empty).
    let acc = 0, cut = items.findIndex(el => el.matches('.row-break'));
    if (cut < 1) for (let i = 0; i < items.length - 1; i++) { acc += widths[i]; cut = i + 1; if (acc >= total / 2) break; }
    const second = document.createElement('div'); second.className = 'row';
    const rest = [...row.children].slice([...row.children].indexOf(items[cut]));
    for (const el of rest) if (!el.matches('.group-more')) second.appendChild(el);
    row.after(second);
    g.classList.add('two-rows');
  }
}

// A label written on two lines (with <br>), on one.
const unbreak = sp => { if (sp.querySelector('br')) sp.innerHTML = sp.innerHTML.replace(/<br\s*\/?>/gi, ' '); };
// (Translating the interface writes the labels again, with their <br>.)
window.addEventListener('revela:lang', () => document.querySelectorAll('#ribbon .inline-labels button span').forEach(unbreak));
