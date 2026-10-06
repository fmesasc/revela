# Pruebas y producción

Nada nuevo llega directamente a quien usa Revela. Primero se prueba en **test.revelaslides.com**, y llega a
**revelaslides.com** cuando la administración lo decide.

| | Pruebas | Producción |
|---|---|---|
| Rama | `main` | `production` |
| Web y aplicación | test.revelaslides.com (Cloudflare Pages, vista previa de `main`) | revelaslides.com (rama de producción de Pages) |
| Servidor | Worker `revela-share-staging` (`wrangler.toml [env.staging]`), con sus propios datos | Worker `revela-share` |
| Pagos | Stripe en modo de prueba | Stripe real |
| Web pública (repositorio privado) | rama `main` de fmesasc/revela-site | rama `production` de fmesasc/revela-site |
| GitHub Pages y aplicación de escritorio | — | se publican desde `production` |

La web de pruebas no se indexa (`robots.txt`, `noindex`, sin sitemap), lleva una franja «Entorno de pruebas» y la
aplicación muestra el distintivo «Pruebas» (`tools/build-site.mjs`, `src/ui/shell/stage.js`).

## El recorrido de un cambio

1. Se sube a `main`. Pasan las pruebas (`tests.yml`) y el servidor de pruebas se actualiza (`server.yml`); Cloudflare
   Pages construye test.revelaslides.com.
2. Se prueba allí.
3. **Publicar en producción**: desde la administración (**Versiones**) o en GitHub (Actions ▸ *Publicar en
   producción* ▸ *Run workflow*). El flujo `promote.yml` comprueba que las pruebas del último `main` pasaron y mueve
   `production` hacia delante —en los dos repositorios—; eso publica el servidor, la web, GitHub Pages y la
   aplicación de escritorio.
4. Opcional: en **Versiones**, «publicar sola cuando lleve sin cambios N días» (el cron diario del servidor de
   producción, `server/cloudflare/releases.js`).

`production` solo avanza: si alguien escribiera en ella directamente, el flujo se para. Un arreglo urgente se hace
en `main` y se publica.

## Configuración (una vez)

En GitHub (hecho):
- Secretos `PROMOTE_KEY` y `SITE_PROMOTE_KEY`: claves de despliegue con escritura en fmesasc/revela y
  fmesasc/revela-site, para que los envíos del flujo pongan en marcha las publicaciones (los del token propio de
  Actions no lo hacen).

En Cloudflare Pages, proyecto `revelaslides`:
1. *Settings ▸ Builds ▸ Branch control*: rama de producción **`production`**; vistas previas de `main` activadas.
2. *Settings ▸ Variables and secrets*: `SITE_DEPLOY_KEY_B64` también en **Preview**, y solo en **Preview** la
   variable `REVELA_STAGE` = `test` (marca la web de pruebas: nunca en Production, o revelaslides.com dejaría de
   aparecer en los buscadores).
3. *Custom domains*: añadir `test.revelaslides.com`; después, en el DNS de revelaslides.com, cambiar el destino
   de ese CNAME a **`main.revelaslides.pages.dev`** (con el proxy de Cloudflare activado).
4. *Settings ▸ Builds ▸ Deploy hooks*: el gancho que usa fmesasc/revela-site (`CF_DEPLOY_HOOK`) debe ser de la rama
   `main`; crear otro de `production` y guardarlo en fmesasc/revela como secreto `CF_DEPLOY_HOOK_PROD` (para cuando
   solo cambia la web).

En Google Cloud (cliente OAuth de Revela): añadir `https://test.revelaslides.com` como origen de JavaScript
autorizado.

Secretos del servidor de pruebas (cada uno con `npx wrangler secret put NOMBRE --env staging` en
`server/cloudflare`; los que no se pongan dejan esa función apagada en pruebas): `OPENROUTER_KEY` (IA; el gasto de
pruebas está limitado a 5 $ al mes), `STRIPE_TEST_SECRET_KEY` y `STRIPE_TEST_WEBHOOK_SECRET` (pagos de prueba),
`RESEND_KEY` y `MAIL_SECRET` (correos), `LTI_PRIVATE_JWK`.

Para publicar con un clic desde la administración: un token *fine-grained* de GitHub para fmesasc/revela con
*Actions: read and write* y *Contents: read*, guardado como `npx wrangler secret put GITHUB_TOKEN` (el Worker de
producción). Sin él, el botón abre el flujo en GitHub.
