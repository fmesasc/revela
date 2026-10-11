// The example presentations in other languages (src/features/content/tplang.js): what is
// a text and what isn't, and that every language has all of them (tools/template-texts.mjs).
// Run by tests/run.sh when Node.js is available.
import { textsOf, translateDeck, templateLang, mathTexts, translateLatex } from '../src/features/content/tplang.js';
import { rebase, deckIn } from '../src/features/document/languages.js';
import { isSheetFormula } from '../src/core/formulas.js';
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
const spaced = { layouts: [], slides: [{ id: 's', blocks: [{ id: 'p', type: 'text', html: 'AVISO', letterSpacing: 8, w: 400, h: 60 }] }] };
translateDeck(spaced, { 'AVISO': 'بلاغ' }, { rtl: true });
ok(spaced.slides[0].blocks[0].letterSpacing === 0, 'plantillas: en árabe, sin espacio entre letras (van unidas)');
const nums2 = { layouts: [], slides: [{ id: 's', blocks: [{ id: 'r', type: 'text', html: '<b>2:55–3:00</b> ritmo', w: 400, h: 60 }] }] };
translateDeck(nums2, { '<b>2:55–3:00</b> ritmo': '<b>2:55–3:00</b> وتيرة' }, { rtl: true });
ok(nums2.slides[0].blocks[0].html === '<b><span dir="ltr">2:55–3:00</span></b> وتيرة', 'plantillas: en árabe, las cifras sueltas aisladas: ' + nums2.slides[0].blocks[0].html);
// The words inside equations (\text{…}, \mathrm{…} with words): texts of their own; symbols, variables, units of one
// letter and anything with commands inside, not.
const eq1 = 'E = \\dfrac{\\text{alquiler}}{\\text{ingresos netos}} \\times 100';
ok(mathTexts(eq1).join('|') === 'alquiler|ingresos netos' && texts.includes('área'), 'fórmulas: sus palabras son textos: ' + mathTexts(eq1));
ok(mathTexts('6\\,\\mathrm{CO_2} + 3\\ \\text{m} \\text{$x$ veces} \\mathbf{verb\\text{-}ed} \\mathrm{C}').length === 0, 'fórmulas: ni símbolos, ni unidades de una letra, ni contenidos con órdenes');
ok(mathTexts('\\text{eFG\\%} \\text{latidos en } 15\\text{ s} \\mathrm{mcm}(2,3) \\textit{passato prossimo} \\mbox{hola}').join('|') === 'eFG%|latidos en|mcm|passato prossimo|hola', 'fórmulas: sin los escapes ni los espacios de los lados; \\mathrm, \\textit, \\mbox');
const mdeck = { layouts: [], slides: [{ id: 's', blocks: [{ id: 'm', type: 'math', latex: eq1 }, { id: 'u', type: 'math', latex: '\\text{lpm} = \\text{latidos en } 15\\text{ s} \\times 4' }] }] };
translateDeck(mdeck, { alquiler: 'rent & bills', 'ingresos netos': 'net_income {50%}', lpm: 'bpm', 'latidos en': 'beats in' });
const [m1, m2] = mdeck.slides[0].blocks;
ok(m1.latex === 'E = \\dfrac{\\text{rent \\& bills}}{\\text{net\\_income \\{50\\%\\}}} \\times 100', 'fórmulas: traducidas dentro del LaTeX, con sus caracteres especiales escapados: ' + m1.latex);
ok(m2.latex === '\\text{bpm} = \\text{beats in } 15\\text{ s} \\times 4', 'fórmulas: el espacio de los lados se queda: ' + m2.latex);
ok(translateLatex('a \\text{x~y} \\text{back}', { 'x~y': 'a\\b^c~d', back: '<b>R&amp;D</b>' }) === 'a \\text{x~y} \\text{R\\&D}' && translateLatex('\\text{casa}', { casa: 'a\\b^c~d' }) === '\\text{a\\textbackslash{}b\\textasciicircum{}c\\textasciitilde{}d}', 'fórmulas: \\ ^ ~ escapados; una traducción con HTML, como texto');
// \mathrm is math mode: an abbreviation stays there; words with spaces or accents go to text mode (\textrm).
ok(translateLatex('\\mathrm{mcm}(2,3)', { mcm: 'lcm' }) === '\\mathrm{lcm}(2,3)' && translateLatex('\\mathrm{mcm}(2,3)', { mcm: 'm.c.m. größte' }) === '\\textrm{m.c.m. größte}(2,3)'
  && translateLatex('\\operatorname{mcm}(2,3)', { mcm: 'kg V' }) === '\\mathop{\\textrm{kg V}}(2,3)', 'fórmulas: \\mathrm con espacios o acentos, en modo texto');
// Arabic: each translation isolated (U+2067 … U+2069), so it doesn't reorder the numbers and brackets around it; and
// read back without them (the multilingual table's keys).
const arEq = translateLatex('18\\,980\\ \\text{días} \\quad \\mathrm{mcm}(2,3)', { 'días': 'أيام', mcm: 'م.م.أ' });
ok(arEq === '18\\,980\\ \\text{\u2067أيام\u2069} \\quad \\textrm{\u2067م.م.أ\u2069}(2,3)', 'fórmulas: en árabe, cada traducción aislada: ' + JSON.stringify(arEq));
ok(mathTexts(arEq).join('|') === 'أيام|م.م.أ', 'fórmulas: al leerlas de nuevo, sin las marcas de aislamiento');
// A multilingual presentation (features/document/languages.js): the equation's words are rows of its table, and
// rewriting it in another of its languages pairs them one by one.
const ml = { name: 'P', layouts: [], slides: [{ id: 's', blocks: [{ id: 'm', type: 'math', latex: eq1 }] }],
  i18n: { base: 'es', langs: ['en'], texts: { en: { alquiler: 'rent', 'ingresos netos': 'net income' } } } };
ok(deckIn(ml, 'en').slides[0].blocks[0].latex === 'E = \\dfrac{\\text{rent}}{\\text{net income}} \\times 100', 'presentación multilingüe: la ecuación en otro idioma');
const rb = rebase(ml, 'en');
ok(rb.i18n.base === 'en' && rb.i18n.texts.es.rent === 'alquiler' && rb.i18n.texts.es['net income'] === 'ingresos netos', 'presentación multilingüe: al cambiar de idioma base, las palabras de la ecuación emparejadas');
// A text that starts with «=» is a text; a table's formula is not (core/formulas.js isSheetFormula: what the table
// can work out — functions, directions, cell references, numbers and operators).
const sheet = ['=SUMA(ARRIBA)', '=SUM(ABOVE)', '=A1+B2', ' =PROMEDIO(B2:B5)', '=REDONDEAR(B2/C2*100;1)', '=B4*0,21', '=MAX(3,5)', '=50%*B2', '=SUMA(IZQUIERDA)'];
const notSheet = ['= <b>52 años</b>: la «rueda calendárica», como nuestro siglo.', '= 8 sílabas · octosílabo', '= Total', '= rendirse, dejar de', 'Hola'];
ok(sheet.every(isSheetFormula) && !notSheet.some(isSheetFormula), 'fórmulas de tabla: las de verdad sí; un texto que empieza por «=», no: '
  + [...sheet.filter(x => !isSheetFormula(x)), ...notSheet.filter(isSheetFormula)].join(' | '));
const eqText = { layouts: [], slides: [{ id: 's', blocks: [{ id: 't', type: 'text', html: '= <b>52 años</b>: la rueda', w: 400, h: 60 },
  { id: 'g', type: 'table', rows: [['Total', '=SUMA(ARRIBA)'], ['= Total', '=A1+B2']] }] }] };
const eqTexts = textsOf(eqText);
ok(eqTexts.includes('= <b>52 años</b>: la rueda') && eqTexts.includes('= Total') && !eqTexts.some(t => /SUMA|A1/.test(t)), 'textos que empiezan por «=»: se traducen; las fórmulas de la tabla, no');
translateDeck(eqText, { '= <b>52 años</b>: la rueda': '= <b>52 عامًا</b>: العجلة', '=SUMA(ARRIBA)': 'x' }, { rtl: true });
ok(eqText.slides[0].blocks[0].html.startsWith('= <b>') && /عامًا/.test(eqText.slides[0].blocks[0].html) && eqText.slides[0].blocks[0].dir === 'rtl' && eqText.slides[0].blocks[1].rows[0][1] === '=SUMA(ARRIBA)', 'textos que empiezan por «=»: traducidos (también en árabe); la fórmula de la tabla, intacta');
console.log(fails ? `PLANTILLAS-IDIOMA FAIL ${n - fails}/${n}` : `PLANTILLAS-IDIOMA OK ${n}/${n}`);
process.exit(fails ? 1 : 0);
