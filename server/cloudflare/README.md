# Revela's server (Cloudflare Worker)

One Worker, `revela-share` (`worker.js`), with its data in Durable Objects
(SQLite storage; no R2, see `store.js`). The app works without it; the official
edition (revelaslides.com/app) and the desktop app use it for everything that
needs an account. The rule throughout: the browser only asks, the server
decides — every request is checked here (session, plan, credits, limits,
document roles) against state only the server holds, so changing the app's code
changes nothing. See [docs/NUBE.md](../../docs/NUBE.md) (in Spanish) for the
design, and [SECURITY.md](../../SECURITY.md).

## What it does

- **Sealed shares** (`/s`, `worker.js`): stores the presentations Revela
  shares by link, encrypted in the browser. The key travels after `#` in the
  link, so the server cannot read what it stores.
- **Co-editing rooms** (`/c`, `collab.js`): one room per live session keeps the
  presentation, checks each change against the role of the link used (view /
  comment / edit), passes it on and relays chat and presence; it keeps going
  when the person who shared closes the tab.
- **Accounts** (`/api/…`, `api.js`): Google sign-in, sessions (a list of them,
  and ending them), plan and credits, AI through Revela's OpenRouter key
  (`ai.js`: charged in credits, within a global monthly budget), photo search
  (`stock.js`: Unsplash, Pexels), Stripe payments (`billing.js`), signing in the
  desktop app, exporting and deleting the account, TURN relays for live
  connections (`/api/ice`).
- **Cloud documents** (`/api/docs/…`, `docs.js`): presentations shared with
  people or by link with a role — present, view, comment or edit — and
  permission settings (no copies, editors who share, access that ends); every
  read and change is checked against the sender's role. Folders, trash,
  versions and statistics.
- **Teams** (`/api/team/…`, `teams.js`), **video calls** (`/api/call/…`,
  `calls.js`, Cloudflare Realtime), **LTI 1.3** for Moodle, Canvas and other
  platforms (`/api/lti/…`, `lti.js`), **«Crear modelo 3D con IA»**
  (`/api/3d/…`, `model3d.js`, with `server/blender`), the **community gallery**
  (`/api/community/…` and the pages `/comunidad…`, `community.js`), Revela's
  own **notices** (`/api/notices`, `notices.js`), **support** tickets
  (`/api/support`, `admin.js`), the website's requests and campaign links
  (`/api/leads`, `/api/go/…`, `crm.js`) and **emails** (`mail.js`).
- **Administration** (`/api/admin/…`, `admin.js`): users, credits, plans,
  blocking, sessions, tickets, the audit log, finance (`finance.js`), «Captación»
  (`crm.js`), notices and the community. Only on the admin host, behind
  Cloudflare Access, and off (404) until `ACCESS_TEAM`, `ACCESS_AUD` and
  `ADMIN_EMAILS` are set; the Worker checks the Access token itself.
- **Daily cron** (`0 8 * * *`): scheduled notices (`schedule.js`: credits that
  expire, the end of Pro, unused accounts, the trash), support tickets waiting
  for an answer, and the CRM's due emails.

Shared helpers (`b64url`, `random`, `sha256`, `hmac`, `EMAIL`, `escHtml`,
`DAY`/`HOUR`) are in `util.js`; Google token checks in `auth.js`.

## Routes

From `wrangler.toml`:

| Route                           | What answers                                         |
|---------------------------------|------------------------------------------------------|
| `revelaslides.com/api/*`        | the accounts API; `/api/s` and `/api/c` are the share and room routes |
| `admin.revelaslides.com/api/*`  | only the administration (`/api/admin/…`); anything else is 404 |
| `revelaslides.com/comunidad*`   | the community gallery's public pages                 |
| `revela-share.<account>.workers.dev` | the same Worker (`workers_dev = true`): `/s`, `/c`, `/api/…` |

## Bindings

Durable Objects (each with a `new_sqlite_classes` migration):

| Binding     | Class         | Module         | What it keeps |
|-------------|---------------|----------------|---------------|
| `SHAREBOX`  | `ShareBox`    | `store.js`     | one sealed share: data in parts, token hash, expiry, domain limit, view counter |
| `LIMITS`    | `Limits`      | `store.js`     | the day's counters (shares and rooms per person and in total; support, leads…) |
| `ROOMS`     | `CollabRoom`  | `collab.js`    | one co-editing room |
| `ACCOUNTS`  | `Account`     | `api.js`       | one account: profile, sessions (hashes), plan, credits, ledger, document list |
| `BUDGET`    | `Budget`      | `api.js`       | the global AI budget per month; also the notices |
| `DESKTOP`   | `DesktopLink` | `api.js`       | one desktop-app sign-in in progress |
| `DOCS`      | `CloudDoc`    | `docs.js`      | one cloud document, slide by slide, with its sharing and versions |
| `TEAMS`     | `Team`        | `teams.js`     | one team: seats, members, brand kit, templates |
| `LTI`       | `LtiStore`    | `lti.js`       | platforms, logins (10 min) and students' sessions (a day) |
| `CALLS`     | `CallRoom`    | `calls.js`     | who is in each presentation's call |
| `SCHEDULE`  | `Schedule`    | `schedule.js`  | what to check on which day (for the cron) |
| `MODELJOBS` | `ModelJob`    | `model3d.js`   | one AI 3D job: its rounds and the GLB (deleted after 24 h) |
| `DIRECTORY` | `Directory`   | `admin.js`     | the users directory for the admin |
| `TICKETS`   | `Tickets`     | `admin.js`     | support tickets |
| `AUDIT`     | `Audit`       | `admin.js`     | the administration's audit log |
| `FINANCE`   | `Finance`     | `finance.js`   | the business's economic events and daily sums |
| `CRM`       | `Crm`         | `crm.js`       | contacts, sequences, campaigns |
| `COMMUNITY` | `Community`   | `community.js` | the community gallery |

Optional: `EMAIL` (`[[send_email]]`, Cloudflare Email Service; commented out in
`wrangler.toml` until the domain is onboarded) and `BLENDER_SVC` (a service
binding to `revela-blender`, used instead of `BLENDER_URL` when present; see
docs/NUBE.md).

## Secrets and variables

Values never go in this repository. Secrets are set with
`npx wrangler secret put NAME`; plain variables are either in `wrangler.toml`
`[vars]` (public values) or set in Cloudflare's dashboard (Workers ▸
revela-share ▸ Settings ▸ Variables and secrets), where `keep_vars = true`
keeps them across deploys. Every feature whose secret is missing is simply off.

**Secrets**

| Name | Purpose |
|------|---------|
| `OPENROUTER_KEY` | AI through Revela's account (chat, images, speech, 3D, ticket suggestions) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe, live: checkout, portal, signed webhook `/api/billing/webhook` |
| `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET` | Stripe's test mode (`/api/billing/webhook-test`) |
| `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY` | photo search |
| `CALLS_APP_ID`, `CALLS_APP_SECRET` | Cloudflare Realtime SFU app (video calls) |
| `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` | Cloudflare Realtime TURN relays (without them, STUN only) |
| `LTI_PRIVATE_JWK` | the LTI signing key (`node tools/lti-key.mjs`) |
| `MAIL_SECRET` | signs the links in emails (stop optional notices, answer a ticket, CRM way out) |
| `RESEND_KEY` | Resend, when not using Cloudflare Email Service |
| `BLENDER_SECRET` | signs the requests to `revela-blender` (the same value there) |
| `UPLOAD_KEY` | lets someone upload shares and open rooms without Google sign-in |
| `ALLOWED` | limits who may upload or open rooms (`ana@x.org, @school.example`) |

**Variables in `wrangler.toml`**

| Name | Purpose |
|------|---------|
| `MAX_MB` | largest share, room or document (default 30) |
| `DAILY_PER_USER`, `DAILY_TOTAL` | shares + rooms per person and in total per day |
| `API_ORIGINS` | origins allowed to use the API with the session cookie |
| `SITE_URL` | the site that links and payments come back to |
| `FREE_DOCS`, `PRO_DOCS`, `MAX_PEOPLE` | cloud documents per account (free / Pro) and people per document |
| `AI_PER_MINUTE`, `AI_MODELS`, `AI_PRICES` | AI rate limit, the models offered, their prices for the estimate |
| `AI_TTS_MODEL`, `AI_TTS_USD_PER_CHAR` | voice-over model and its price per character |
| `AI_3D_MODEL`, `BLENDER_USD_PER_SECOND` | the AI 3D model's vision model and the Blender container's price |
| `GOOGLE_CLIENT_ID` | Revela's Google client (public) |
| `ACCESS_TEAM`, `ACCESS_AUD` | the Cloudflare Access application of the admin (public identifiers) |
| `STRIPE_PRICE_*`, `STRIPE_TEST_PRICE_*` | Stripe price ids: `PRO_MONTH`, `PRO_YEAR`, `CREDITS_500`, `CREDITS_1500`, `TEAM_SEAT` |

**Variables set in Cloudflare** (all optional; the code has defaults)

| Name | Purpose |
|------|---------|
| `TRIAL_CREDITS`, `PRO_CREDITS`, `IMAGE_CREDITS` | credits given at sign-up and per Pro month; credits per AI image |
| `CREDIT_USD`, `MARKUP`, `MONTHLY_BUDGET_USD` | what a credit pays for, the markup, all AI together per month |
| `TRIAL_DAYS`, `PACK_DAYS`, `MONTH_DAYS` | how long credits last |
| `IDLE_DAYS` | an account unused this long is deleted (warned before) |
| `AI_MAX_TOKENS`, `AI_IMAGE_MODEL`, `AI_TTS_VOICES` | AI limits and models |
| `AI_3D_MAX_ROUNDS`, `AI_3D_MAX_TOKENS`, `BLENDER_URL`, `BLENDER_TIMEOUT` | «Crear modelo 3D con IA» (off without `BLENDER_URL` + `BLENDER_SECRET`) |
| `DESKTOP_ORIGINS` | origins of the desktop app |
| `TERMS_VERSION` | the terms in force (bump it to ask again) |
| `MAIL_FROM` | sender of the emails |
| `STRIPE_MODE`, `STRIPE_AUTOMATIC_TAX` | `test` for everyone; Stripe Tax on (`1`) |
| `ADMIN_EMAILS`, `ADMIN_HOST` | who may use the administration; its host |
| `SUPPORT_PER_DAY`, `SUPPORT_DAILY_TOTAL`, `SUPPORT_ATTACH_KB`, `SUPPORT_REPLIES_PER_DAY`, `SUPPORT_NOTIFY`, `SUPPORT_REMIND_DAYS`, `SUPPORT_AUTOCLOSE_DAYS`, `SUPPORT_KEEP_DAYS`, `SUPPORT_AI_MODEL`, `SUPPORT_AI_AUTO` | support tickets: limits, who is told, reminders, closing, keeping, AI help |
| `USD_EUR`, `EMAIL_USD`, `STRIPE_FEE_PCT`, `STRIPE_FEE_FIXED` | the finance page's conversions and estimates |
| `LEADS_PER_DAY` | requests from the website's form per address and day |
| `COMMUNITY_MAX_MB` | largest presentation in the community gallery |
| `ALLOW_ORIGIN` | CORS origin for `/s` and `/c` (default `*`; the data is encrypted anyway) |

## Cost

Storage is in Durable Objects, not R2, on purpose: on the Workers Free plan,
Workers and Durable Objects have hard daily limits (when reached, requests fail
until 00:00 UTC; nothing is charged), while R2 bills what goes past its free
tier. The sharing and co-editing part keeps within those limits: rooms use
WebSocket hibernation, save at most every few seconds and only what changed,
and long messages travel in parts; per day each person can create
`DAILY_PER_USER` shares + rooms and everyone together `DAILY_TOTAL`; rooms
nobody enters for 7 days are deleted, shares when they expire, when unshared or
after a year without views.

Other features use paid services, each off until its secret or variable is set:
the AI (OpenRouter, paid per use from Revela's key and limited by
`MONTHLY_BUDGET_USD`), payments (Stripe's fees), emails (Cloudflare Email
Service or Resend), video calls and TURN relays (Cloudflare Realtime) and
«Crear modelo 3D con IA» (`server/blender` runs on Cloudflare Containers, which
need the Workers Paid plan).

## Deploy

`.github/workflows/server.yml` deploys this folder on every push to `main` that
touches it (or the shared modules it imports), **after all the tests pass**
(it calls `tests.yml` first). It needs two repository secrets
(Settings ▸ Secrets and variables ▸ Actions): `CLOUDFLARE_API_TOKEN` (template
«Edit Cloudflare Workers») and `CLOUDFLARE_ACCOUNT_ID`; without them only the
tests run. The Worker's own secrets stay in Cloudflare and are never touched by
the deploy, and `keep_vars = true` keeps the variables set in the dashboard.
`server/blender` is deployed apart (`.github/workflows/blender.yml`).

By hand, with Node.js 22+, from this folder:

```bash
npx wrangler login
npx wrangler secret put UPLOAD_KEY      # and any other secret above
npx wrangler deploy
```

A server of your own: remove `routes` from `wrangler.toml` (they belong to
revelaslides.com's zone) and use the `workers.dev` address it prints in
Revela (**Archivo ▸ Compartir ▸ Servidor propio**, with the upload key). To try
it locally: `npx wrangler dev --var UPLOAD_KEY:test` and
`http://127.0.0.1:8787`. The server's tests: `npm run test:server` from the
repository root.

## Who can create shares and rooms

Opening a shared link or joining a room needs nothing. Creating one needs
either a Google sign-in to Revela (`GOOGLE_CLIENT_ID`: Google confirms the
token was issued to it; `ALLOWED` can limit which accounts) or the upload key
(`UPLOAD_KEY`). With neither variable set the server is open. A share can also
be limited to the Google accounts of a domain: the server checks Google's
signature on the ID token, and the key or password is still needed to open it.

## What it knows

- Shares: only encrypted data and, per share, a view counter with the date of
  the last view — nothing about who viewed (no IP address, no browser).
- Co-editing rooms: the presentation itself (to merge everyone's changes),
  the names people type and the session's chat, while the session lasts; the
  room is deleted when its owner ends it or 7 days after the last visit.
- Accounts and cloud documents: what the account needs (Google's account id,
  email and name, the terms accepted, plan, credits and their ledger, sessions
  as hashes) and the
  documents themselves, which are not encrypted (the server checks roles and
  merges changes). Everything an account holds can be exported
  (`/api/account/export`) or deleted (`/api/account/delete`).
