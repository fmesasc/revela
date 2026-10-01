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
                                               │  ├─ Schedule (avisos por día) ← cron    │
                                               │  └─ secretos: OPENROUTER_KEY, STRIPE_…  │
                                               └───────┬───────────────┬─────────────────┘
                                                       ▼               ▼
                                                  OpenRouter        Stripe      (correos: Email Service o Resend)
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

**Créditos que caducan.** Cada cuenta guarda sus créditos en bolsas con fecha
(`Account.lots`) y gasta primero la que caduca antes. El regalo de bienvenida dura
3 meses (`TRIAL_DAYS`); un paquete comprado, un año (`PACK_DAYS`); los de Pro (o de
un equipo) llegan cada 30 días mientras el plan está activo, sea mensual, anual o de
equipo, y valen ese mes y el siguiente (`MONTH_DAYS` = 60): lo no gastado pasa al mes
siguiente y luego caduca. Si una petición costó más de lo que quedaba, la diferencia
es una deuda que paga el siguiente ingreso.

**Los números del negocio** (créditos de cada plan, valor de un crédito, margen sobre el
coste de la IA, tope de gasto, plazos) no están en el repositorio: se ponen como
variables en Cloudflare (Workers ▸ revela-share ▸ Configuración ▸ Variables y secretos),
que es el panel de administración. Se cambian ahí sin tocar el código y no son públicos;
los despliegues no los tocan (`keep_vars`). El código, con sus valores por defecto, sí
es público.

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

**Solo lectura al dejar Pro.** Nunca se borra nada por dejar Pro. Si el dueño tiene
más presentaciones en la nube que las que permite su plan (3 en el gratuito, `FREE_DOCS`),
solo se pueden editar las N editadas más recientemente (N = el límite; el orden es el
`updated` de su lista en `Account.docs`). Las demás quedan en **solo lectura para todos**
(también para quien tiene permiso de edición compartido): se abren, se presentan, se
exportan, se comparten y se borran, pero el servidor rechaza cualquier cambio (también los
comentarios) con `402 { error: 'read only', reason: 'over limit', limit }`; lo comprueba el
propio `CloudDoc` preguntando a la cuenta del dueño (`docs-locked`). `GET /api/docs` marca
`readOnly: true` en cada una de «Mis presentaciones» afectada (las compartidas contigo lo
dicen al abrirlas), `GET /api/docs/:id` lo dice al abrirla (`readOnly`, `reason`, `limit`) y
`/api/me` cuenta cuántas (`docs.readOnly`). Al volver a Pro (propio o de un equipo) o borrar
hasta quedar dentro, se desbloquean solas. La app muestra un aviso encima de la diapositiva
(«Esta presentación está en solo lectura porque tu plan gratuito permite editar 3. Pasa a
Pro o borra alguna para editarla»), no envía cambios y no pierde lo que se haga: se puede
guardar como copia en el navegador o descargar.

**Condiciones al crear la cuenta.** Antes del primer inicio de sesión la app muestra «Al
continuar aceptas las condiciones del servicio y la política de privacidad, y confirmas que
tienes 14 años o más» con una casilla que hay que marcar (también en la aplicación de
escritorio y en el navegador que la conecta). El servidor solo crea una cuenta nueva si el
inicio de sesión trae la versión vigente de las condiciones (`terms`; si no,
`400 { error: 'terms' }`) y guarda en el perfil la fecha y la versión (`TERMS_VERSION`, por
defecto `2026-10-01`; la app lleva la misma en `src/io/cloud/account.js`). A las cuentas
anteriores, o cuando cambie la versión, `/api/me` responde `terms: false` y la app lo pide
una vez por visita hasta aceptarlas (`POST /api/terms`). El inicio de sesión también guarda
el idioma de la app (para los correos).

**Correos** (`server/cloudflare/mail.js`). Transaccionales, sobrios (fondo papel, títulos con
serif, un solo color de acento, con su versión en texto plano), en el idioma de la persona
(español, inglés o catalán; si no se conoce, español), con enlace a revelaslides.com/app y
el pie «Revela · un proyecto de FM Lab»:

| Correo | Cuándo | Baja |
| --- | --- | --- |
| Te han compartido una presentación | La dueña añade a alguien: quién (nombre de Google y correo), cuál y el enlace `…/app/?doc=…` | No (servicio) |
| Te invitan a un equipo | Una administradora invita | No (servicio) |
| Tu Pro termina | Stripe avisa de la cancelación (`customer.subscription.updated` con `cancel_at_period_end`) y otra vez unos 7 días antes del fin: cuántas quedarán en solo lectura, créditos que se conservan | No (servicio) |
| Tu Pro ha terminado | `customer.subscription.deleted` | No (servicio) |
| Créditos que caducan | 7 días antes de que caduque un lote con créditos (uno por lote) | **Sí** |
| Cuenta inactiva | ~23 meses sin usarla: a 30 y a 7 días del borrado | No (obligatorio) |
| Cuenta eliminada | Al eliminarla la persona, o a los 24 meses sin uso | No (servicio) |

«Usar» la cuenta es iniciar sesión o cualquier petición con sesión (`Account.lastSeen`, con
resolución de un día: se escribe una vez al día). Una cuenta con Pro activo, propio o de un
equipo pagado, no cuenta como inactiva: ni avisos ni borrado. El borrado por inactividad es
el mismo que el voluntario (cuenta, presentaciones, listas de compartidas, suscripción). Las
cuentas que no se vuelvan a usar después de este cambio no tienen aún fecha anotada: entran
en el calendario la próxima vez que se usen.

Los avisos opcionales llevan un enlace para darse de baja (y la cabecera `List-Unsubscribe`
de un clic): un token firmado con HMAC (`MAIL_SECRET`) que `GET|POST /api/mail/unsubscribe?t=…`
comprueba y anota en la cuenta (`mailOff`). Sin `MAIL_SECRET` no se envían avisos opcionales
(no habría forma de darse de baja).

**Avisos programados** (`server/cloudflare/schedule.js`). Los Durable Objects no se pueden
recorrer, así que cada cuenta apunta en un objeto `Schedule` qué mirar y qué día
(`'d:AAAA-MM-DD'` → `[{ sub, kind, ref }]`): al recibir un lote de créditos, al cancelar Pro y
al usarse (inactividad; una sola entrada pendiente por cuenta). Un cron diario
(`[triggers]` en `wrangler.toml`, 08:00 UTC) recorre los días vencidos —también los que se
hubieran saltado— y pide a cada cuenta que compruebe y actúe. La cuenta decide con su propio
estado y recuerda lo enviado (cada aviso con su `ref`), así que una entrada repetida, ya sin
sentido o procesada dos veces no hace nada; si alguien vuelve a usar la cuenta, el aviso de
inactividad se aplaza solo.

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
| Editar una presentación en solo lectura (por el límite) | El propio documento pregunta a la cuenta del dueño antes de aplicar cada cambio; nada en la petición lo evita |
| Dar de baja de avisos a otra persona | El enlace va firmado (HMAC con `MAIL_SECRET`, solo en Cloudflare) para esa cuenta y ese tipo de aviso |
| Colar HTML en un correo (nombre de una presentación, de un equipo o de una persona) | Todo lo que viene de personas se escapa en las plantillas |
| Acceso de administrador | No hay ninguna API de administración; se administra desde la cuenta de Cloudflare (con verificación en dos pasos) |

Los tests `tests/server-api.mjs` intentan cada uno de estos ataques y comprueban
que el servidor los rechaza.

## Puesta en marcha (cuando toque)

1. **Ruta:** en Cloudflare, Workers ▸ revela-share ▸ Configuración ▸ Dominios y
   rutas ▸ añadir la ruta `revelaslides.com/api/*`.
2. **Desplegar:** `cd server/cloudflare && npx wrangler deploy` (crea los objetos
   nuevos: Account, Budget, DesktopLink, Schedule, y el cron diario).
3. **Secretos:** `npx wrangler secret put OPENROUTER_KEY` (y, cuando se venda,
   `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`).
4. **OpenRouter:** crear una clave solo para el servidor con **límite de crédito**.
5. **Google Cloud:** añadir `https://revelaslides.com` a los orígenes de
   JavaScript autorizados del cliente OAuth.
6. **Stripe (más adelante):** crear los productos y sus precios, poner sus ids en
   `STRIPE_PRICE_*` y el webhook `https://revelaslides.com/api/billing/webhook`
   con los eventos `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.updated` (avisos de cancelación) y
   `customer.subscription.deleted`.
7. **Correos.** Una de dos:
   - **Cloudflare Email Service** (preferido): Compute ▸ Email Service ▸ Email Sending ▸
     *Onboard Domain* con `revelaslides.com`; Cloudflare añade los registros DNS (MX y SPF en
     el subdominio `cf-bounce`, DKIM, y DMARC en `_dmarc.revelaslides.com`). Cuando esté
     verificado, descomentar en `wrangler.toml` el bloque `[[send_email]]` con
     `name = "EMAIL"` y desplegar.
   - **Resend:** verificar el dominio en resend.com (sus registros SPF y DKIM en el DNS de
     Cloudflare) y `npx wrangler secret put RESEND_KEY`.

   En los dos casos: `openssl rand -base64 32 | npx wrangler secret put MAIL_SECRET` (firma
   los enlaces de baja) y, si se quiere otro remitente, la variable `MAIL_FROM` (por defecto
   `Revela <avisos@revelaslides.com>`; la dirección debe ser del dominio verificado). Sin
   `EMAIL` ni `RESEND_KEY` no se envía nada y todo lo demás funciona igual.
8. **Plan de pago de Workers** (5 $/mes) al abrirlo al público, y una alerta de
   gasto en Facturación ▸ Notificaciones.

## Textos legales

`legal.html` (aviso legal, LSSI-CE), `privacy.html` (RGPD: cuenta, nube, IA, pagos,
equipos, Moodle, videollamadas, proveedores, cookies, derechos) y `terms.html`
(condiciones de uso y de contratación: precios con IVA, renovación, cancelación,
desistimiento, créditos). Antes de cobrar:

- Añadir el NIF y la dirección en `legal.html` (art. 10 LSSI-CE).
- En Stripe: los datos de quien vende, las facturas por correo y la URL de las
  condiciones (`https://revelaslides.com/terms`). Cada precio **sin impuestos** (comportamiento fiscal «exclusivo») y en **dos monedas** con las
  mismas cifras: EUR como principal y USD en «Añadir otra moneda» (`currency_options`). Activar
  **Stripe Tax** (o un Merchant of Record) para que Checkout añada el IVA del país de quien paga.
  La página de precios muestra en euros el precio final con el IVA de España, como exige la ley
  ante consumidores, y debajo el precio sin IVA. Nada que cambiar en el servidor (el mismo `price` id).
  El pago ya muestra, junto al botón, la renuncia al desistimiento al activarse al momento.
