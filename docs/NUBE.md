# Revela en la nube: arquitectura y seguridad

Borrador vivo de cómo funcionan la edición oficial (revelaslides.com), la
aplicación de escritorio y el servidor de cuentas, y de qué protege cada pieza.

## Tres ediciones, un solo código

| Edición | Dónde | Cuenta | IA |
| --- | --- | --- | --- |
| Abierta | fmesasc.github.io/revela | No | Con la clave de OpenRouter de cada persona |
| Oficial | revelaslides.com/app | Sí (Google) | Incluida, con créditos de la cuenta |
| Escritorio | Windows, macOS, Linux | Sí (a través del navegador) | Incluida, con créditos de la cuenta |

`tools/build-site.mjs` marca cada copia (`<meta name="revela-edition">`:
`cloud` en `/app/`, `desktop` en la aplicación de escritorio); la edición
abierta no lleva marca. `src/core/config.js` lee esa marca (`EDITION`).

## Piezas

```
Navegador / escritorio                         Cloudflare
┌──────────────────────────┐                   ┌─────────────────────────────────────────┐
│ Revela (src/…)           │  /api/… (HTTPS)   │ Worker (server/cloudflare/worker.js)    │
│  io/cloud/account.js ────┼──────────────────▶│  api.js: cuentas, IA, pagos, escritorio │
│  features/ai/openrouter  │                   │  ├─ Account (1 por cuenta)  ← créditos  │
│   (IA por la cuenta)     │                   │  ├─ Budget (gasto global de IA del mes) │
└──────────────────────────┘                   │  ├─ DesktopLink (1 por inicio de sesión)│
                                               │  ├─ ShareBox / CollabRoom (compartir)   │
                                               │  └─ secretos: OPENROUTER_KEY, STRIPE_…  │
                                               └───────┬───────────────┬─────────────────┘
                                                       ▼               ▼
                                                  OpenRouter        Stripe
```

## Flujos

**Iniciar sesión (web).** «Iniciar sesión con Google» da un token de acceso;
el servidor lo comprueba con Google (emitido para el cliente de Revela, correo
verificado) y crea una sesión: una cookie `HttpOnly; Secure; SameSite=Strict;
Path=/api`. La página nunca ve la sesión.

**Iniciar sesión (escritorio).** Google no permite iniciar sesión dentro de la
ventana de una aplicación, así que:
1. la aplicación crea un secreto (*verifier*) y envía solo su huella
   (*challenge*) y un identificador aleatorio;
2. abre el navegador en revelaslides.com, donde la persona (con sesión allí)
   confirma el código corto que muestra la aplicación;
3. la aplicación, única que conoce el secreto, recoge su propia sesión una sola
   vez (10 minutos como máximo). Se guarda en la aplicación y se envía como
   `Authorization: Bearer`.

**IA.** La aplicación envía la petición a `/api/ai/chat` o `/api/ai/image`. El
servidor:
1. comprueba la sesión y el límite por minuto;
2. comprueba el tope de gasto global del mes;
3. aparta los créditos del peor caso (modelo × tokens máximos) y, si no hay
   bastantes, responde 402 sin llamar a la IA;
4. llama a OpenRouter con **su** clave;
5. cobra lo que costó de verdad (lo que informa OpenRouter) y devuelve el
   resto. Si la IA falla, no cobra nada. Si alguna petición se corta, lo
   apartado vuelve solo en 10 minutos.

**Presentaciones en la nube** (`server/cloudflare/docs.js`). Cada presentación
es un Durable Object: el documento diapositiva a diapositiva, su dueño, las
personas con su permiso (ver, comentar, editar) y el permiso del enlace. Los
cambios viajan como operaciones pequeñas (las mismas que la colaboración en
directo) y el servidor comprueba cada una contra el permiso de quien la envía:
quien comenta solo puede tocar comentarios, y si una operación no está
permitida no se aplica ninguna. Guarda una versión antes de cada tanda de
cambios (una cada media hora como mucho, las diez últimas) y, para el dueño con
Pro, estadísticas por diapositiva (vistas y tiempo) con un identificador
aleatorio del navegador, sin correos ni direcciones.

**Tus datos (RGPD).** «Mi cuenta ▸ Tus datos» descarga todo lo que guarda la
cuenta (perfil, plan, movimientos de créditos, sesiones y presentaciones) y
permite eliminarla: se borran la cuenta, sus presentaciones (también para quien
las tenía compartidas) y su lista de compartidas, y se cancela la suscripción de
Stripe (las facturas las conserva Stripe). Hay que escribir el propio correo y
hacerlo desde la web (no desde un token de la aplicación de escritorio).

**Moodle y otras plataformas (LTI 1.3).** La administración de la plataforma
registra Revela pegando `https://revelaslides.com/api/lti/register` (registro
dinámico). El profesorado añade una actividad externa y pega el enlace de una
presentación compartida con «Cualquiera con el enlace puede ver». Cada alumno la
abre a su ritmo, responde los cuestionarios y actividades en las diapositivas, el
servidor corrige cada respuesta (con la presentación que tiene él, no la del
navegador; un intento por actividad) y manda la nota al libro de calificaciones.
Todo va firmado: los tokens de la plataforma se comprueban con sus claves y los
nuestros se firman con `LTI_PRIVATE_JWK` (secreto de Cloudflare).

**Videollamadas (Pro).** Quienes pueden abrir una presentación de la nube se
ven y se oyen desde el editor (Archivo ▸ Llamada), a través del SFU de Cloudflare
Realtime. El servidor guarda el secreto de la app de Realtime, solo deja usar a
cada cuenta sus propias sesiones y solo deja recibir pistas de personas que
están en esa misma llamada. Coste: 0,05 $ por GB de salida, los primeros
1000 GB al mes gratis.

**Pagos.** `/api/billing/checkout` crea una página de pago de Stripe con el
**precio de Stripe** (el navegador solo elige el producto). Los planes y
créditos solo cambian cuando llega el aviso **firmado** de Stripe
(`/api/billing/webhook`), y cada aviso cuenta una sola vez.

## Qué impide saltarse las restricciones

| Riesgo | Protección |
| --- | --- |
| Modificar la aplicación para activar Pro | El plan, los créditos y las funciones solo existen en el servidor; la aplicación solo muestra lo que él dice |
| Llamar a la IA sin pagar | La clave de la IA solo la tiene el servidor (secreto de Cloudflare); cada petición se cobra antes de hacerla |
| Gastar dos veces los mismos créditos (peticiones a la vez) | Cada cuenta es un Durable Object que atiende una petición tras otra; los créditos se apartan antes de llamar a la IA |
| Precios desfasados en la configuración | Se cobra el coste real, aunque supere lo estimado |
| Un error o abuso que dispare el gasto | Límite por minuto, tope global mensual (`MONTHLY_BUDGET_USD`) y límite de crédito en la propia clave de OpenRouter |
| Falsificar un pago | Solo cuentan los avisos con la firma de Stripe (HMAC con el secreto del webhook, de menos de 5 minutos); los repetidos se ignoran |
| Fabricar o robar una sesión | Tokens aleatorios de 256 bits; en el servidor solo su huella (SHA-256); cada uno ligado a su cuenta |
| Otra web usando la sesión de alguien (CSRF) | Cookie `SameSite=Strict`; los cambios con cookie solo se aceptan desde revelaslides.com |
| Otra web leyendo las respuestas | CORS solo para revelaslides.com (con credenciales) y la aplicación de escritorio (sin cookies) |
| Suplantar la aplicación de escritorio | Hay que confirmar en el navegador, con sesión, el código que muestra la aplicación; sin su secreto no se recoge la sesión |
| Montar una copia del servidor | Es otro servidor, sin tus claves, tu base de datos ni tus usuarios: no toca los tuyos |
| Abrir o cambiar una presentación ajena | Cada lectura y cada cambio se comprueba en el servidor con la sesión (o el permiso del enlace); el cuerpo de la petición no puede decir quién eres |
| Colar una edición junto a un comentario | Todo o nada: si una operación no está permitida para ese permiso, no se aplica ninguna |
| Acceso de administrador | No hay ninguna API de administración; se administra desde la cuenta de Cloudflare (con verificación en dos pasos) |

Los tests `tests/server-api.mjs` intentan cada uno de estos ataques y comprueban
que el servidor los rechaza.

## Puesta en marcha (cuando toque)

1. **Ruta:** en Cloudflare, Workers ▸ revela-share ▸ Configuración ▸ Dominios y
   rutas ▸ añadir la ruta `revelaslides.com/api/*`.
2. **Desplegar:** `cd server/cloudflare && npx wrangler deploy` (crea los objetos
   nuevos: Account, Budget, DesktopLink).
3. **Secretos:** `npx wrangler secret put OPENROUTER_KEY` (y, cuando se venda,
   `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`).
4. **OpenRouter:** crear una clave solo para el servidor con **límite de crédito**.
5. **Google Cloud:** añadir `https://revelaslides.com` a los orígenes de
   JavaScript autorizados del cliente OAuth.
6. **Stripe (más adelante):** crear los productos y sus precios, poner sus ids en
   `STRIPE_PRICE_*` y el webhook `https://revelaslides.com/api/billing/webhook`
   con los eventos `checkout.session.completed`, `invoice.paid` y
   `customer.subscription.deleted`.
7. **Plan de pago de Workers** (5 $/mes) al abrirlo al público, y una alerta de
   gasto en Facturación ▸ Notificaciones.

## Pendiente

- Textos legales de la edición oficial.
