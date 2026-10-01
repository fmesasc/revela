// revela-blender: runs Blender scripts for «Crear modelo 3D con IA» in Cloudflare Containers.
//
//   POST /run  { script, timeoutSec }  (signed by Revela's main server: gate.js)
//              → { ok, log, glb, preview, thumb, seconds, error?, message? }   (runner.py)
//
// Nothing else: no accounts, no credits, no storage — the main server (server/cloudflare/model3d.js)
// decides who may run what and charges for it. Each container runs one script at a time; a busy
// one answers 429 and another is tried. Containers have no internet (enableInternet = false: with
// no outbound handlers, every outbound request is refused) and sleep after a minute without work.
//
// Needs Workers Paid (Containers) and the secret BLENDER_SECRET (the same one as the main server's):
// see docs/NUBE.md, «Modelos 3D con IA».

import { Container, getRandom } from '@cloudflare/containers';
import { gate } from './gate.js';

export class BlenderRunner extends Container {
  defaultPort = 8080;
  sleepAfter = '1m';
  enableInternet = false;
}

export default {
  async fetch(req, env) {
    return gate(req, env, async body => {
      const n = Math.max(1, +env.RUNNERS || 3);
      for (let i = 0; i < 4; i++) {
        const c = await getRandom(env.BLENDER, n);
        const r = await c.fetch(new Request('http://runner/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
        if (r.status !== 429) return r;
        await new Promise(ok => setTimeout(ok, 1500 * (i + 1)));
      }
      return new Response(JSON.stringify({ error: 'busy' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    });
  },
};
