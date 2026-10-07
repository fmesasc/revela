// Versiones (the administration): what's being tried on test.revelaslides.com and what's in production, and
// publishing it — the button runs GitHub's «Publicar en producción» (.github/workflows/promote.yml). Optionally by
// itself: when main has had no changes for the days the admin chose and its tests passed (the daily run).
// Each publication is a version, kept (its tag vX.Y.Z): the list, and going back to one of them — «Volver a una
// versión» (.github/workflows/rollback.yml). After going back, nothing is published by itself until main changes.
//
// Needs the secret GITHUB_TOKEN: a fine-grained token for fmesasc/revela with Actions (read and write) and Contents
// (read) — to run the workflows; without it the page still shows the state (GitHub's public API) and links to the
// workflow to run it by hand. Only production's Worker does this (not the test one: STAGE).
import { call } from './api.js';

const REPO = env => env.GITHUB_REPO || 'fmesasc/revela';
export const RELEASES_DEFAULT = { autoDays: 0 };

async function gh(env, path, init = {}) {
  const r = await (env.FETCH || fetch)('https://api.github.com/repos/' + REPO(env) + path, { ...init, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'revela-admin',
    'X-GitHub-Api-Version': '2022-11-28', ...(env.GITHUB_TOKEN && { Authorization: 'Bearer ' + env.GITHUB_TOKEN }), ...(init.body && { 'Content-Type': 'application/json' }) } });
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.message || 'github ' + r.status), { status: r.status });
  return j;
}
// A version's number, comparable (0.4.10 after 0.4.9).
const VER = /^v(\d+)\.(\d+)\.(\d+)$/;
const verKey = n => n.match(VER).slice(1).map(Number);
const newer = (a, b) => { const x = verKey(a), y = verKey(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };
const settingsOf = async env => ({ ...RELEASES_DEFAULT, ...((await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'releases-get').catch(() => null))?.releases || {}) });

// The state: production, what's waiting in main (each commit), main's tests, the last publications.
export async function releasesState(env) {
  const runsOf = w => gh(env, `/actions/workflows/${w}/runs?per_page=5`).catch(() => ({ workflow_runs: [] }));
  const [cmp, tests, runs, backs, tags, settings] = await Promise.all([gh(env, '/compare/production...main'), gh(env, '/actions/workflows/tests.yml/runs?branch=main&per_page=5'),
    runsOf('promote.yml'), runsOf('rollback.yml'), gh(env, '/tags?per_page=100').catch(() => []), settingsOf(env)]);
  const main = cmp.commits?.at(-1)?.sha || cmp.base_commit?.sha, mainTests = (tests.workflow_runs || []).find(r => r.head_sha === main);
  const prod = cmp.base_commit?.sha, run = r => ({ at: r.created_at, status: r.status, conclusion: r.conclusion, url: r.html_url, by: r.triggering_actor?.login || '' });
  const versions = (Array.isArray(tags) ? tags : []).filter(t => VER.test(t.name)).sort((a, b) => newer(b.name, a.name)).slice(0, 30)
    .map(t => ({ version: t.name.slice(1), sha: t.commit?.sha, current: t.commit?.sha === prod, url: `https://github.com/${REPO(env)}/releases/tag/${t.name}` }));
  const pending = (cmp.commits || []).map(c => ({ sha: c.sha, message: c.commit.message.split('\n')[0], date: c.commit.committer?.date || null })).reverse();
  // Gone back to a version: until main has something newer than that, it isn't published by itself again.
  const back = (backs.workflow_runs || []).find(r => r.conclusion === 'success');
  const held = !!back && (!pending[0]?.date || Date.parse(pending[0].date) < Date.parse(back.created_at));
  return {
    token: !!env.GITHUB_TOKEN, settings, repo: REPO(env), held,
    production: { sha: prod, version: versions.find(v => v.current)?.version || null, message: cmp.base_commit?.commit?.message?.split('\n')[0] || '', date: cmp.base_commit?.commit?.committer?.date || null },
    pending, versions,
    tests: mainTests ? { status: mainTests.status, conclusion: mainTests.conclusion, url: mainTests.html_url } : null,
    runs: (runs.workflow_runs || []).map(run), rollbacks: (backs.workflow_runs || []).map(run),
    workflowUrl: `https://github.com/${REPO(env)}/actions/workflows/promote.yml`, rollbackUrl: `https://github.com/${REPO(env)}/actions/workflows/rollback.yml`,
  };
}
// Publishing: runs the workflow (it checks main's tests passed and only moves forward).
export async function releasesPromote(env, reason) {
  if (!env.GITHUB_TOKEN) return { error: 'no token' };
  await gh(env, '/actions/workflows/promote.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { reason: String(reason || '').slice(0, 200) } }) });
  return { ok: true };
}
// Going back: runs «Volver a una versión» to an older version than production's (the workflow checks it too).
export async function releasesRollback(env, version, reason) {
  if (!env.GITHUB_TOKEN) return { error: 'no token' };
  const v = String(version || '').replace(/^v/, '');
  if (!VER.test('v' + v) || !String(reason || '').trim()) return { error: 'bad request' };
  const s = await releasesState(env), cur = s.production.version;
  if (!s.versions.some(x => x.version === v)) return { error: 'not found' };
  if (cur && newer('v' + v, 'v' + cur) >= 0) return { error: 'not older' };
  await gh(env, '/actions/workflows/rollback.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { version: v, reason: String(reason).slice(0, 200) } }) });
  return { ok: true, from: cur, to: v };
}
export async function releasesSettings(env, b) {
  const d = Math.round(+b?.autoDays); if (!Number.isInteger(d) || d < 0 || d > 60) return { error: 'bad request' };
  const releases = { autoDays: d };
  await call(env.BUDGET.get(env.BUDGET.idFromName('global')), 'releases-set', { releases });
  return { settings: releases };
}
// The daily run: by itself, when the admin chose so — main without changes for autoDays days, its tests passed, and
// something waiting.
export async function releasesAuto(env, now = Date.now()) {
  if (env.STAGE || !env.GITHUB_TOKEN || !env.BUDGET) return { done: false };
  const { autoDays } = await settingsOf(env); if (!autoDays) return { done: false };
  const s = await releasesState(env), last = s.pending[0];
  if (s.held) return { done: false, held: true };
  if (!last || !last.date || now - Date.parse(last.date) < autoDays * 864e5 || s.tests?.conclusion !== 'success') return { done: false, waiting: s.pending.length };
  await releasesPromote(env, `Automático: ${autoDays} días sin cambios en pruebas`);
  return { done: true, n: s.pending.length };
}
