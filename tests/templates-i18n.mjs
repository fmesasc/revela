// The example presentations in other languages (src/features/content/tplang.js): what is
// a text and what isn't, and that every language has all of them (tools/template-texts.mjs).
// Run by tests/run.sh when Node.js is available.
import { textsOf, translateDeck, templateLang } from '../src/features/content/tplang.js';
import { execFileSync } from 'node:child_process';
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const deck = { name: 'Clase', palette: 'ocean', bodyFont: "'Lato', sans-serif", layouts: [{ id: 'title', name: 'Portada' }],
  slides: [{ id: 's1', layoutId: 'title', notes: 'Saluda', blocks: [
    { id: 'a', type: 'text', html: '<b>Hola</b> mundo', fontFamily: "'Lato', sans-serif", color: '#fff' },
    { id: 'b', type: 'table', rows: [['Mes', 'Total'], ['Enero', '=SUMA(B2:B3)']] },
    { id: 'c', type: 'image', src: 'https://example.com/a.png', alt: 'Un faro' },
    { id: 'd', type: 'math', latex: '\\text{área} = \\pi r^2' },
    { id: 'e', type: 'poll', question: '¿Cuál?', options: ['Sí', 'No'] },
    { id: 'f', type: 'diagram', text: 'Idea\n  Plan' }] }] };
const texts = textsOf(deck);
ok(['Clase', 'Portada', 'Saluda', '<b>Hola</b> mundo', 'Mes', 'Total', 'Enero', 'Un faro', '¿Cuál?', 'Sí', 'No', 'Idea\n  Plan'].every(t => texts.includes(t)), 'plantillas: los textos que se traducen');
ok(!texts.some(t => /SUMA|Lato|ocean|example\.com|pi r|^title$/.test(t)), 'plantillas: fórmulas, ecuaciones, letras, direcciones e identificadores no');
const dict = { Clase: 'Class', Portada: 'Title slide', Saluda: 'Say hello', '<b>Hola</b> mundo': '<b>Hello</b> world', Mes: 'Month', Enero: 'January', '¿Cuál?': 'Which one?', 'Sí': 'Yes', 'Idea\n  Plan': 'Idea\n  Plan' };
translateDeck(deck, dict);
const [s] = deck.slides, b = id => s.blocks.find(x => x.id === id);
ok(deck.name === 'Class' && deck.layouts[0].name === 'Title slide' && s.notes === 'Say hello' && b('a').html === '<b>Hello</b> world', 'plantillas: nombre, diseños, notas y texto traducidos');
ok(b('b').rows[0][0] === 'Month' && b('b').rows[0][1] === 'Total' && b('b').rows[1][0] === 'January' && b('b').rows[1][1] === '=SUMA(B2:B3)', 'plantillas: tabla (lo que falta y las fórmulas, como estaban)');
ok(b('e').question === 'Which one?' && b('e').options.join() === 'Yes,No' && b('a').fontFamily === "'Lato', sans-serif" && s.layoutId === 'title', 'plantillas: votación; lo demás, igual');
ok(templateLang('nl') === 'nl' && templateLang('ar') === 'ar' && templateLang('es') === null && templateLang('xx') === null, 'plantillas: todos los idiomas, con traducción propia');
// Arabic: from right to left; left-aligned texts to the right, centred ones as they were.
const ar = { layouts: [], slides: [{ id: 's', blocks: [{ id: 'l', type: 'text', html: '<span style="float:left">H</span>ola', w: 400, h: 60 }, { id: 'c', type: 'text', html: 'Adiós', textAlign: 'center', w: 400, h: 60 }, { id: 'n', type: 'text', html: 'Sin traducir', w: 400, h: 60 }, { id: 't', type: 'table', rows: [['Hola']] }] }] };
translateDeck(ar, { '<span style="float:left">H</span>ola': '<span style="float:left">م</span>رحبا', 'Adiós': 'وداعا' }, { rtl: true });
const [l, c, u, tb] = ar.slides[0].blocks;
ok(l.dir === 'rtl' && l.textAlign === 'right' && /float:right/.test(l.html) && c.dir === 'rtl' && c.textAlign === 'center' && !u.dir && !u.textAlign && tb.dir === 'rtl', 'plantillas: árabe de derecha a izquierda');
// A text left in Spanish (a verse in a language lesson): its own direction — its punctuation at the right end —, aligned to the right.
const kept = { layouts: [], slides: [{ id: 's', blocks: [{ id: 'v', type: 'text', html: 'Tus ojos son dos luceros.', w: 400, h: 60 }] }] };
translateDeck(kept, { 'Tus ojos son dos luceros.': 'Tus ojos son dos luceros.' }, { rtl: true });
ok(!kept.slides[0].blocks[0].dir && kept.slides[0].blocks[0].textAlign === 'right', 'plantillas: en árabe, un texto que se queda en español conserva su dirección');
const mixed = { layouts: [], slides: [{ id: 's', blocks: [{ id: 'm', type: 'text', html: '<b>Olá!</b><br>Hola', w: 400, h: 60 }] }] };
translateDeck(mixed, { '<b>Olá!</b><br>Hola': '<b>Olá!</b><br>مرحبا' }, { rtl: true });
ok(mixed.slides[0].blocks[0].dir === 'rtl' && mixed.slides[0].blocks[0].html === '<b><span dir="ltr">Olá!</span></b><br>مرحبا', 'plantillas: en árabe, lo que se queda en su idioma dentro de un texto árabe, aislado: ' + mixed.slides[0].blocks[0].html);
console.log(fails ? `PLANTILLAS-IDIOMA FAIL ${n - fails}/${n}` : `PLANTILLAS-IDIOMA OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
