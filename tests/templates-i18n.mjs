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
ok(templateLang('nl') === 'en' && templateLang('gl') === null && templateLang('de') === 'de', 'plantillas: idiomas sin traducción propia');
console.log(fails ? `PLANTILLAS-IDIOMA FAIL ${n - fails}/${n}` : `PLANTILLAS-IDIOMA OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
