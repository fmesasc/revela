// Live data on slides:
// - Dashboards (Power BI, Looker Studio, Tableau, Google Sheets, Grafana,
//   Datawrapper, Flourish, Metabase…) embedded from their share link or embed
//   code, turned into the embeddable URL, optionally reloaded every N minutes.
// - Charts linked to a published CSV (e.g. Google Sheets "Publish to the web
//   → CSV"), refreshed in the editor and, while presenting, every N seconds.

import { state, commit, currentSlide } from '../../core/store.js';
import { uid } from '../../core/model.js';
import { parseChartGrid } from '../document/blocks.js';

// Share link or <iframe> code → { provider, url, note }.
export function dashboardEmbed(input) {
  let s = String(input || '').trim();
  const m = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(s); if (m) s = m[1].replace(/&amp;/g, '&');
  let u; try { u = new URL(s); } catch { return null; }
  if (!/^https:$/.test(u.protocol)) return null;
  const h = u.hostname, p = u.pathname;
  if (/(^|\.)powerbi\.com$/.test(h)) {
    if (p.startsWith('/view')) return { provider: 'Power BI', url: u.href, note: 'publish' };           // "Publish to web"
    const rep = /\/reports\/([0-9a-f-]{36})/i.exec(p);
    if (rep) {
      const e = new URL('https://app.powerbi.com/reportEmbed'); e.searchParams.set('reportId', rep[1]); e.searchParams.set('autoAuth', 'true');
      const ctid = u.searchParams.get('ctid'); if (ctid) e.searchParams.set('ctid', ctid);
      return { provider: 'Power BI', url: e.href, note: 'signin' };
    }
    return { provider: 'Power BI', url: u.href, note: p.includes('reportEmbed') ? 'signin' : '' };
  }
  if (/^(lookerstudio|datastudio)\.google\.com$/.test(h)) {
    return { provider: 'Looker Studio', url: `https://lookerstudio.google.com${p.startsWith('/embed/') ? p : '/embed' + p}` };
  }
  if (h === 'public.tableau.com') {
    const v = /\/viz\/([^/]+)\/([^/?#]+)/.exec(p) || /\/views\/([^/]+)\/([^/?#]+)/.exec(p);
    if (v) return { provider: 'Tableau Public', url: `https://public.tableau.com/views/${v[1]}/${v[2]}?:showVizHome=no&:embed=true` };
  }
  if (h === 'docs.google.com' && p.startsWith('/spreadsheets/')) {
    if (p.includes('/d/e/')) return { provider: 'Google Sheets', url: u.href.replace(/\/pub(\?|$)/, '/pubhtml$1'), note: 'publish' };
    const id = /\/d\/([^/]+)/.exec(p)?.[1];
    if (id) return { provider: 'Google Sheets', url: `https://docs.google.com/spreadsheets/d/${id}/htmlview?widget=true&headers=false`, note: 'share' };
  }
  if (h === 'www.datawrapper.de' || h === 'app.datawrapper.de') {
    const id = /\/_\/([A-Za-z0-9]+)/.exec(p)?.[1] || /\/chart\/([A-Za-z0-9]+)/.exec(p)?.[1];
    if (id) return { provider: 'Datawrapper', url: `https://datawrapper.dwcdn.net/${id}/` };
  }
  if (h === 'datawrapper.dwcdn.net') return { provider: 'Datawrapper', url: u.href };
  if (h === 'public.flourish.studio' || h === 'flo.uri.sh') {
    const id = /visualisation\/(\d+)/.exec(p)?.[1];
    if (id) return { provider: 'Flourish', url: `https://flo.uri.sh/visualisation/${id}/embed` };
  }
  if (p.includes('/public/dashboard/') || p.includes('/public/question/')) return { provider: 'Metabase', url: u.href };
  if (/\/d(-solo)?\//.test(p) && (u.searchParams.has('orgId') || /grafana/.test(h))) {
    if (!u.searchParams.has('kiosk') && !p.includes('/d-solo/')) u.searchParams.set('kiosk', '');
    return { provider: 'Grafana', url: u.href.replace('kiosk=', 'kiosk') };
  }
  return { provider: '', url: u.href };
}

export function addDashboard(input, refreshMin = 0) {
  const d = dashboardEmbed(input); if (!d) return null;
  const { w: W, h: H } = state.deck.size;
  const b = { id: uid(), type: 'embed', src: d.url, provider: d.provider, refreshMin: Math.max(0, +refreshMin || 0),
    alt: d.provider ? `Panel de ${d.provider}` : '', x: 60, y: 60, w: W - 120, h: H - 120, rotation: 0, animation: null };
  commit(() => { currentSlide().blocks.push(b); state.ui.selection = b.id; state.ui.multi = [b.id]; });
  return { block: b, ...d };
}

// ---- Charts linked to CSV ------------------------------------------------------
// Google Sheets share links are turned into their published-CSV form.
export function csvUrl(input) {
  let u; try { u = new URL(String(input).trim()); } catch { return null; }
  if (u.hostname === 'docs.google.com' && u.pathname.includes('/spreadsheets/')) {
    if (u.pathname.includes('/d/e/')) { u.pathname = u.pathname.replace(/\/pub(html)?$/, '/pub'); u.searchParams.set('output', 'csv'); return u.href; }
    const id = /\/d\/([^/]+)/.exec(u.pathname)?.[1], gid = u.searchParams.get('gid') || /gid=(\d+)/.exec(u.hash)?.[1];
    if (id) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? '&gid=' + gid : ''}`;
  }
  return u.href;
}
export async function fetchCSV(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
// Link the selected chart to a CSV and load it now.
export async function linkChart(b, input, refreshSec = 60) {
  const url = csvUrl(input); if (!url) throw new Error('URL');
  const text = await fetchCSV(url);
  applyCSV(b, text, { dataUrl: url, refreshSec: Math.max(0, +refreshSec || 0) });
  return b;
}
export function applyCSV(b, text, extra = {}, history = true) {
  const { data, series, names } = parseChartGrid(text);
  if (!data.length) throw new Error('EMPTY');
  commit(() => {
    Object.assign(b, extra, { data, dataUpdated: Date.now() });
    if (names[0]) b.seriesName = names[0];
    if (series.length) b.series = series; else delete b.series;
  }, { history });
}
// Refresh every linked chart of the deck (editor start / button).
export async function refreshLinkedCharts(deck = state.deck) {
  let n = 0;
  for (const s of deck.slides) for (const b of s.blocks)
    if (b.type === 'chart' && b.dataUrl) { try { applyCSV(b, await fetchCSV(b.dataUrl), {}, false); n++; } catch {} }
  return n;
}
