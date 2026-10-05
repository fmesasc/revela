// A theme proposed by the AI from a description («colores corporativos sobrios en azul marino»,
// «otoño», «para niños de primaria»): background, text, six accents and two catalogue fonts.
// Only a proposal: the theme editor shows it and the person applies it (features/design/theme.js).

import { state } from '../../core/store.js';
import { chat, lang, parseJSON, plain } from './openrouter.js';
import { themeOf, cleanTheme, themeFonts, contrast } from '../design/theme.js';

// The theme's description for the model: the colours and fonts it may give, and how.
export const THEME_DOC = () => `A theme is {"name":"2-4 words","bg":"#rrggbb","fg":"#rrggbb","accents":["#rrggbb", …six],"heading":"<font>","body":"<font>"}:
bg is the slides' background and fg the text on it (contrast at least 7:1); the accents are for titles, shapes, charts and highlights — distinct from each other and readable on bg, accent 1 the main one.
Fonts only from this list: ${themeFonts().join(', ')}. A heading font with character, a very readable body font (they may be the same).`;

// → { name, bg, fg, accents, heading, body, why } ; Error 'BAD_ANSWER' if the answer isn't a theme.
export async function proposeTheme(description, { deck = state.deck, signal = null, onUsage = null } = {}) {
  const now = themeOf(deck);
  const titles = deck.slides.slice(0, 8).map(s => plain(s.blocks.find(b => b.ph === 'title' && b.type === 'text')?.html || '').slice(0, 60)).filter(Boolean);
  const msgs = [
    { role: 'system', content: `You design themes for presentations. Answer with ONE JSON object: a theme plus "why" (one short sentence in ${lang()} saying what you chose).
${THEME_DOC()}
Keep from the current theme whatever the request doesn't ask to change. The theme's "name" in ${lang()}.` },
    { role: 'user', content: `Current theme: ${JSON.stringify(now)}\nThe presentation's titles: ${JSON.stringify(titles)}\n\nRequest: ${String(description).slice(0, 600)}` }];
  const out = await chat(msgs, { json: true, maxTokens: 600, signal, feature: 'theme', onUsage });
  let r; try { r = parseJSON(out); } catch { r = null; }
  const th = r && cleanTheme(r.theme && typeof r.theme === 'object' ? { ...r.theme, why: r.why } : r, now);
  if (!th) throw new Error('BAD_ANSWER');
  // (Text that can't be read on its background: the text made black or white, whichever reads better.)
  if (contrast(th.fg, th.bg) < 4.5) th.fg = contrast('#111111', th.bg) >= contrast('#ffffff', th.bg) ? '#111111' : '#ffffff';
  return { ...th, why: String(r.why || r.theme?.why || '').slice(0, 300) };
}
