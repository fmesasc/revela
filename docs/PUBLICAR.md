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

**Solo personas invitadas en pruebas.** En test.revelaslides.com solo pueden iniciar sesión los correos de la lista
de la administración (Versiones ▸ Personas invitadas a pruebas) y los administradores: allí la IA, la nube y los pagos
de prueba son costes reales. El servidor de pruebas lo pregunta al de producción por un enlace interno entre los dos
Workers (service binding `PROD`, con el secreto `INTERNAL_KEY` en los dos); quitar a alguien de la lista le cierra
la sesión en menos de un minuto.

La web de pruebas no se indexa (`robots.txt`, `noindex`, sin sitemap), lleva una franja «Entorno de pruebas» y la
aplicación muestra el distintivo «Pruebas» (`tools/build-site.mjs`, `src/ui/shell/stage.js`).

## El recorrido de un cambio

1. Se sube a `main`. Pasan las pruebas (`tests.yml`) y el servidor de pruebas se actualiza (`server.yml`); Cloudflare
   Pages construye test.revelaslides.com.
2. Se prueba allí.
3. **Publicar en producción**: desde la administración (**Versiones**) o en GitHub (Actions ▸ *Publicar en
   producción* ▸ *Run workflow*). El flujo `promote.yml` comprueba que las pruebas del último `main` pasaron, le da
   un **número de versión** y mueve `production` hacia delante —en los dos repositorios—; eso publica el servidor, la
   web y GitHub Pages, y la etiqueta de la versión publica la aplicación de escritorio.
4. Opcional: en **Versiones**, «publicar sola cuando lleve sin cambios N días» (el cron diario del servidor de
   producción, `server/cloudflare/releases.js`).

`production` solo avanza al publicar: si alguien escribiera en ella directamente, el flujo se para. Un arreglo se hace
en `main` y se publica como versión nueva.

## Versiones

Cada publicación es una versión **X.Y.Z** y se conserva:
- la etiqueta `vX.Y.Z` en fmesasc/revela y la misma en fmesasc/revela-site (lo que había en cada una);
- la *release* «Revela X.Y.Z» en GitHub, con lo que trae y los instaladores de escritorio de esa versión
  (`desktop.yml`; las aplicaciones instaladas se actualizan a la última);
- el número dentro del código: `package.json` y `APP_VERSION` (`src/core/config.js`). Se ve en «Informar de un
  problema», llega con cada informe y lo dice el servidor en `/api/version`.

El número lo pone el flujo: si la versión de `package.json` ya se publicó, sube la última cifra en un commit
«Versión X.Y.Z» en `main`. Para un salto mayor (0.5.0, 1.0.0), cambia a mano `package.json` y `APP_VERSION` antes de
publicar (`tests/layers.py` comprueba que coinciden).

## Volver a una versión anterior

Si una versión publicada falla: **Versiones ▸ Volver a esta** en la anterior buena (o Actions ▸ *Volver a una
versión* ▸ *Run workflow*, con el número y el motivo). `rollback.yml` lleva `production` de los dos repositorios a esa
etiqueta y se vuelven a desplegar el servidor, revelaslides.com y GitHub Pages (unos minutos). `main` no se toca: lo
que falló sigue en pruebas para arreglarlo, y no se publica solo otra vez hasta que haya un cambio nuevo.

Lo que no deshace:
- **La aplicación de escritorio**: una instalada no baja de número; recibe el arreglo con la versión siguiente.
- **Los datos**: lo que guardó la versión nueva se queda. Por eso un cambio en cómo se guarda algo tiene que poder
  leerlo también la versión anterior.
- **Un Durable Object nuevo** (`[[migrations]]` en `wrangler.toml`): el servidor no puede volver a una versión sin
  él; ese paso falla y el servidor se queda como estaba. Entonces, para el servidor, la vuelta atrás de Cloudflare:
  *Workers & Pages ▸ revela-share ▸ Deployments ▸ Rollback*.

Para salir del paso en un momento, sin esperar a GitHub: Cloudflare también vuelve atrás al instante el servidor
(*revela-share ▸ Deployments ▸ Rollback*) y la web (*revelaslides ▸ Deployments ▸ Rollback to this deployment*). Así
GitHub no se entera; conviene después «Volver a esta» para que todo quede igual.

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
   `main` (cada publicación es una versión nueva de la aplicación, aunque solo cambie la web, así que producción no
   necesita gancho).

En Google Cloud (cliente OAuth de Revela): añadir `https://test.revelaslides.com` como origen de JavaScript
autorizado.

Secretos del servidor de pruebas (cada uno con `npx wrangler secret put NOMBRE --env staging` en
`server/cloudflare`; los que no se pongan dejan esa función apagada en pruebas): `OPENROUTER_KEY` (IA; el gasto de
pruebas está limitado a 5 $ al mes), `STRIPE_TEST_SECRET_KEY` y `STRIPE_TEST_WEBHOOK_SECRET` (pagos de prueba),
`RESEND_KEY` y `MAIL_SECRET` (correos), `LTI_PRIVATE_JWK`.

Para publicar con un clic desde la administración: un token *fine-grained* de GitHub para fmesasc/revela con
*Actions: read and write* y *Contents: read*, guardado como `npx wrangler secret put GITHUB_TOKEN` (el Worker de
producción; hecho). Sin él, los botones de publicar y volver atrás abren los flujos en GitHub.
