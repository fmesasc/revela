# Revela API and MCP server

Revela's cloud presentations can be created, read and changed from outside:

- by **AI apps** (Claude, ChatGPT, or any MCP client) through the MCP server at `https://revelaslides.com/api/mcp`, connected with OAuth;
- by **your own programs** through the REST API at `https://revelaslides.com/api/v1/…`, with a personal API key.

Both work on the same rules as the app: a key acts as its owner, only on presentations its owner can reach, with the
owner's role on each (owner, edit, comment, view) and within their plan's limits. The code is
[`server/cloudflare/publicapi.js`](../server/cloudflare/publicapi.js); slides are laid out by the editor's own code
([`src/features/ai/specdeck.js`](../src/features/ai/specdeck.js)).

## Connecting an AI app (MCP)

1. In the AI app, add a **custom connector** (Claude: *Settings ▸ Connectors ▸ Add custom connector*; ChatGPT: *Settings ▸ Apps & Connectors ▸ Create*, developer mode) with the URL `https://revelaslides.com/api/mcp`.
2. The app opens Revela: sign in if needed and press **Allow**.
3. Ask: *"Make a 10-slide presentation about photosynthesis for 12-year-olds in Revela"*. The answer includes the link to open it.

What it can do (MCP tools): `list_presentations`, `get_presentation`, `create_presentation`, `add_slides`,
`update_slide`, `delete_slides`, `replace_text`, `rename_presentation`, `share_presentation`.

Connected apps are listed in Revela under **My account ▸ Developers and AI**, where any of them can be disconnected.

Technical details: MCP Streamable HTTP (JSON responses, no server-sent events), protocol versions 2025-11-25,
2025-06-18, 2025-03-26 and 2024-11-05. OAuth 2.1 with PKCE (S256) and dynamic client registration; discovery at
`/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`. Access tokens last 30 days;
refresh tokens 90 days and rotate on use. A client that already has an API key may send it as a bearer token instead.

## API keys

Create one in **My account ▸ Developers and AI ▸ Create an API key**. It is shown once: only a hash is stored. Send it
as `Authorization: Bearer rvk_…`. A key only opens `/api/v1` and `/api/mcp` — never the account, payments or AI
credits. Up to 20 keys per account; revoke them in the same place.

```sh
curl -H "Authorization: Bearer $REVELA_KEY" https://revelaslides.com/api/v1/decks
```

## REST reference

All bodies are JSON. Errors: `{ "error": "…" }` with 400 (bad request), 401 (no or bad key), 402 (plan limit: `doc limit`,
`storage full`, `read only`), 403 (no permission), 404, 413 (too large).

| Method and path | Body / query | Returns |
|---|---|---|
| `GET /api/v1/me` | | `{ email, name, plan, docs: { n, limit } }` |
| `GET /api/v1/decks` | `?q=` filters by name | `{ decks: [{ id, name, updated, slides, role, url }], limit }` |
| `POST /api/v1/decks` | `{ name, design?, slides?: [spec] \| markdown?, folder? }` | `{ id, name, slides, url, view }` |
| `GET /api/v1/decks/:id` | `?format=outline` or `?format=text` (Markdown) | `{ deck, role }` (the whole document) · `{ outline }` · text |
| `POST /api/v1/decks/:id/slides` | `{ slides \| markdown, position? }` (1-based; default: at the end) | `{ added: [slide ids] }` |
| `POST /api/v1/decks/:id/slides/:slide` | `{ spec?, notes?, hidden?, position? }` | `{ ok }` |
| `POST /api/v1/decks/:id/slides/:slide/delete` | | `{ ok, slides }` |
| `POST /api/v1/decks/:id/replace` | `{ find, replace }` | `{ changed }` |
| `POST /api/v1/decks/:id/rename` | `{ name }` | `{ ok }` |
| `POST /api/v1/decks/:id/share` | `{ link: none \| present \| view \| comment \| edit }` | `{ link, url }` |
| `POST /api/v1/decks/:id/trash` | | `{ ok }` (in the trash 30 days) |
| `GET /api/v1/kinds` | | `{ kinds, designs, doc }` |

`url` opens the presentation in the editor; `view` is the slideshow (for `present` links and embedding).
Changing a slide with `spec` rewrites its words and layout and keeps its pictures, charts, code and equations.
Whoever has the presentation open in Revela sees the changes within seconds, and its version history keeps what was there before.

### Slides (specs)

A slide is `{ "kind": "…", …fields }`. Every kind may have `notes` (what the presenter says), `icon`, and a picture:
`image_url` (https) or `image_search` (a few words; a real photo from Unsplash or Pexels is placed, with its author).
`"below": true` puts a slide under the previous one, one level down (a vertical stack when presenting): an optional
deeper look — a worked example, a diagram — that the presenter opens only if needed.

| kind | fields |
|---|---|
| `title`, `section`, `closing` | `title`, `subtitle` |
| `bullets` | `title`, `bullets` (strings; a nested array is the sub-points of the one before) |
| `steps` | `title`, `steps: [{ title, text }]` |
| `features` | `title`, `items: [{ icon, title, text }]` |
| `comparison` | `title`, `columns: [{ heading, bullets }]` |
| `two_columns` | `title`, `left: { heading, bullets }`, `right: { … }` |
| `key_idea` | `title`, `statement`, `text` |
| `quote` | `quote`, `author` |
| `stats` | `title`, `stats: [{ value, label }]`, `source` |
| `timeline` | `title`, `steps: [{ label, text }]` |
| `agenda` | `title`, `items` |
| `chart` | `title`, `chart: { type: bar \| line \| pie \| doughnut \| area, labels, values, series_name }`, `bullets`, `source` |
| `table` | `title`, `header`, `rows`, `source` |
| `image` | `title`, `bullets`, `image_url` or `image_search` |
| `code` | `title`, `code: { language, code }`, `caption`, `bullets` |
| `math` | `title`, `latex`, `caption`, `bullets` |

`GET /api/v1/kinds` returns the full description the AI apps get. Designs: `corporate`, `academic`, `minimal`,
`tech`, `education`, `pitch`, `warm`, `ocean`, `night`, `mono`.

### Markdown

Instead of `slides`, send `markdown` (reveal.js style): `---` between slides, the first heading is the title, lists are
bullets, a fenced block is code, `![alt](https://…)` a picture, `Note:` starts the speaker notes. A slide with only a
heading is the cover (the first) or a section.

```sh
curl -X POST https://revelaslides.com/api/v1/decks \
  -H "Authorization: Bearer $REVELA_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Q3 results","design":"corporate","slides":[
        {"kind":"title","title":"Q3 results","subtitle":"Sales team"},
        {"kind":"stats","title":"Highlights","stats":[{"value":"+18%","label":"revenue"},{"value":"42","label":"new clients"}],"source":"CRM, Sept 2026"},
        {"kind":"chart","title":"Revenue by month","chart":{"type":"bar","labels":["Jul","Aug","Sep"],"values":[120,135,160]}}]}'
```

## Webhooks (Slack, Teams, Zapier…)

In **My account ▸ Developers and AI ▸ Add a notification channel**, paste an incoming-webhook address. Revela posts
there when someone opens one of your tracked links (`opened`) or comments on one of your presentations (`comment`).
Slack, Microsoft Teams (Workflows), Google Chat and Discord addresses get a line of text in their own format; any
other https address (Zapier, Make, n8n, your server) gets JSON:

```json
{ "event": "comment", "data": { "name": "Q3 results", "by": "Ana", "text": "Change the title", "url": "https://revelaslides.com/app/?doc=…" }, "at": "2026-10-08T21:00:00.000Z" }
```

with `X-Revela-Event` and `X-Revela-Signature: sha256=<base64url HMAC-SHA256 of the body>`, keyed with the secret shown
once when the channel is added. Up to 5 channels; one that fails 20 times in a row is no longer called.

## Single sign-on (teams)

A team's admin can let its members sign in with the school's or company's own identity provider (Microsoft Entra ID,
Okta, Google Workspace, Keycloak… any OpenID Connect provider): **My team ▸ Single sign-on**. Register Revela there with
the redirect address `https://revelaslides.com/api/sso/callback`, enter the issuer, client id and secret, and the email
domains; each domain is verified with a DNS TXT record `revela-verify=<token>`. People then use **Sign in with SSO**
with their work address; optionally they join the team on their first sign-in.

## The file format

A presentation is one JSON document (`.revela`; the same object as `deck` above): `{ version, name, size: { w, h },
theme, palette, master, layouts, sections, slides: [{ id, background, layoutId, notes, hidden, blocks: [{ id, type, x,
y, w, h, … }] }] }`. Object types include `text` (`html`), `shape`, `image` (`src`), `chart` (`chartType`, `data`),
`table` (`rows`), `code`, `math` (`latex`), `video`, `embed`, `model` (3D), `diagram`, `poll` and `lock` (a code lock:
`codes` — the codes that open it, as written; compared without case, accents or extra spaces —, `hint`, `openTo`
(`'next'`, a slide's `id` or `''`), `reveal` — ids of objects of its slide hidden until it opens —, `fail`, `tries` (0:
any), `gate` — no going past its slide until it opens, for pupils on their own —, `salt`, `color`; the exported page
only carries `SHA-256(salt + ':' + code)`). It is documented by
the code: [`src/core/model.js`](../src/core/model.js) and the renderers in [`src/render/`](../src/render/). Revela
also opens and saves PowerPoint (`.pptx`), LibreOffice (`.odp`), Markdown and self-contained HTML.
