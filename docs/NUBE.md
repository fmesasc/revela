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
                                               │  ├─ ModelJob (1 por modelo 3D con IA) ──┼──▶ revela-blender (Blender en Containers)
                                               │  ├─ Directory, Tickets, Audit (admin.js)│
                                               │  ├─ Finance (cuentas del negocio)       │
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

**«Mi nube», el gestor** (`src/ui/dialogs/cloudlibrary.js`). Una página a pantalla completa
(lista en el móvil) con: miniatura de la primera diapositiva de cada una, carpetas (crear,
cambiar el nombre, borrar —lo que contienen sube un nivel, no se borra nada—, hasta 3 niveles,
200 como mucho, nombres de 80 caracteres), migas de pan, mover arrastrando o con «Mover a…»,
destacadas, recientes, búsqueda por nombre y por los títulos de las diapositivas, orden por
modificación, nombre o creación, cuadrícula o lista (se recuerda en el navegador), un menú por
presentación (abrir, en pestaña nueva, cambiar nombre, destacar, hacer una copia, mover, compartir,
descargar .revela o .pptx, a la papelera) y teclado (flechas, Intro abre, F2 renombra, Supr a la
papelera, tecla de menú o Mayús+F10, «/» busca, Escape cierra). Las compartidas conmigo van aparte:
se destacan (en mi lista, no en la del dueño) pero no entran en mis carpetas.
Por qué así, en el servidor:
- **Miniaturas**: las hace el navegador al guardar (WebP pequeño, JPEG en Safari; ≤ 30 000
  caracteres) y otra vez cuando cambia la primera diapositiva (como mucho una por minuto). El
  servidor solo acepta `data:image/(webp|jpeg|png);base64` de hasta 40 000 caracteres (nada de SVG,
  que podría llevar código) y solo de quien puede editarla; se guardan en el `CloudDoc` (no en la
  cuenta: 500 miniaturas no caben en un valor) y la lista las pide por tandas
  (`POST /api/docs/thumbs`, 24 cada vez, solo las que quien pregunta puede leer).
- **Carpetas, estrellas y papelera** viven en la lista de la cuenta (`Account.docs`, `folders`),
  junto con el número de diapositivas y un índice corto de títulos (400 caracteres) que el
  servidor calcula a cada cambio, para buscar sin abrir nada.
- **Papelera**: `POST /api/docs/:id/trash` la marca; mientras tanto solo la abre su dueño y sale
  de «Compartidas conmigo» de los demás (vuelve, con su estrella y sin otro correo, al
  restaurarla). Sigue contando para el límite del plan (y es la primera en quedar en solo
  lectura). A los 30 días (`TRASH_DAYS`) el cron diario la borra para siempre (`Schedule`, tipo
  `trash`); «Vaciar la papelera» lo hace al momento.

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
| Tu prueba de Pro termina | `customer.subscription.trial_will_end` (3 días antes del fin de la prueba gratis): la fecha del primer cobro, los créditos del mes y cómo cancelar en «Gestionar la suscripción». No se envía si ya la canceló | **Sí** |
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
(`/api/billing/webhook`), y cada aviso cuenta una sola vez. Las cuentas que la administración
pone en **modo de prueba** pagan con la configuración de prueba de Stripe (sin dinero real; sus
avisos llegan a `/api/billing/webhook-test`) y lo que reciben va marcado de prueba, fuera de las
cifras del negocio (ver «Modo de prueba de Stripe» en la puesta en marcha).

**Códigos promocionales y prueba gratis de Pro.** Checkout se crea siempre con
`allow_promotion_codes`, así que la página de pago muestra «Añadir código promocional». Los códigos
(p. ej. `LANZAMIENTO30`) se crean desde la administración, página «Promociones»: un cupón de Stripe
(porcentaje o importe fijo en EUR/USD; una vez, N meses o siempre; para todo o solo Pro, créditos o
equipos —los productos se sacan de los precios `STRIPE_PRICE_*`—) y su código (máximo de usos,
caducidad, solo clientes nuevos). Stripe no tiene límite «por cliente»: se guarda en el código y la
página marca los usos que lo superan. Se pueden desactivar y reactivar; todo queda en la auditoría,
en modo real o de prueba (los de prueba con la etiqueta «prueba»). La **prueba gratis de Pro** se
configura también ahí, sin variables ni despliegue (se guarda en el objeto `Budget`): días (0 = sin
prueba), créditos de la prueba (p. ej. 100) y «una vez por cuenta». Checkout de Pro mensual o anual
añade `trial_period_days` solo si la cuenta nunca pagó Pro (ni, con «una vez», tuvo una prueba) en
ese modo de Stripe; pide tarjeta igualmente, y si al final no hay tarjeta la suscripción se cancela.
Durante la prueba la cuenta tiene Pro, pero solo los créditos de la prueba; los del mes de Pro llegan
con la primera factura pagada. «Mi cuenta» muestra «Prueba Pro 7 días gratis» en el botón de Pro y,
durante la prueba, hasta cuándo dura. Por qué así: el dueño ajusta las ofertas sin tocar código ni
Cloudflare, y Stripe sigue siendo quien cobra y aplica los descuentos.

## Modelos 3D con IA

«Insertar ▸ Crear 3D con IA» (solo en las ediciones con cuenta): la persona describe un objeto
(«una taza de café de cerámica azul»), puede adjuntar hasta 3 fotos de referencia, y un agente
escribe un guion de Blender, lo ejecuta, mira la vista previa y se corrige, como hace Claude Code con
Blender en un ordenador. Al terminar se ve el modelo girando y se puede **Insertar** (un objeto 3D
con el GLB dentro de la presentación, como los modelos subidos, y el pie «Modelo creado con IA»),
**Pedir cambios** (otra tanda de rondas con ese texto) o **Descartar**.

### Arquitectura

```
App (src/ui/dialogs/model3dai.js)
  │  POST /api/3d/jobs { prompt, images? }   GET /api/3d/jobs/:id (cada 2,5 s)   …/feedback  …/cancel  …/model
  ▼
revela-share (server/cloudflare/model3d.js)
  ├─ ModelJob (Durable Object, uno por trabajo): el bucle, por rondas con alarm()
  │    ronda: modelo con visión de OpenRouter (AI_3D_MODEL) → JSON { done, note, script }
  │           → revela-blender ejecuta el guion → GLB + vista previa → la ronda siguiente la ve
  ├─ Account: créditos (hold/settle) y el turno «un trabajo activo por cuenta» (slot)
  └─ Budget: el tope global de gasto del mes
        │  POST BLENDER_URL/run  (cabecera X-Revela-Signature: HMAC-SHA256 de «t.cuerpo» con BLENDER_SECRET)
        ▼
revela-blender (server/blender: otro Worker)
  ├─ gate.js: comprueba la firma (máx. 5 minutos) y nada más: no cobra ni guarda
  └─ BlenderRunner (Cloudflare Container, standard-3: 2 vCPU, 8 GiB) con la imagen del Dockerfile:
       Debian slim + Blender 4.5.14 LTS oficial (SHA-256 fija) + runner.py (POST /run)
       blender -b --factory-startup -noaudio --python-exit-code 1 -P run.py -- <carpeta>
       run.py: escena vacía → guion → exporta out.glb → vista previa 768×768 (Cycles CPU, 16 muestras,
       eliminación de ruido; si falla, Workbench) → { ok, log, glb, preview, thumb, seconds }
```

Cada ronda (como mucho **4 por petición** y **12 por trabajo**, `AI_3D_MAX_ROUNDS`): la primera escribe
el guion; si Blender falla, la siguiente recibe el error; si funciona, recibe la vista previa (imagen) y
decide si está bien (`done`) o manda otro guion. Las pautas del sistema (`SYSTEM_3D`) piden metros,
el objeto centrado y apoyado en el suelo, Principled BSDF con colores, nombres claros, modificadores
en vez de mallas enormes, menos de 150 000 triángulos (300 000 como máximo, lo comprueba run.py),
nada de cámaras ni luces (las pone run.py) y nada de `os`, `subprocess`, sockets, archivos ni red.

El trabajo se guarda en su Durable Object (descripción, fotos, notas, miniaturas, la última vista
previa y el GLB en trozos con `writeText`) y **se borra a las 24 h** (alarm), o al insertarlo o
descartarlo. El modelo elegido: `google/gemini-3.8-flash` (acepta imágenes; 0,75 $ / 3,75 $ por millón de
tokens, comprobado en openrouter.ai/api/v1/models el 2026-10-01); para más calidad,
`anthropic/claude-sonnet-5.5` (2 $ / 10 $), cambiando `AI_3D_MODEL` y su precio en `AI_PRICES`.

### Seguridad

- **Quién paga y cuánto lo decide el servidor:** antes de cada ronda aparta los créditos del peor caso
  (tokens máximos + el tiempo máximo de Blender); sin bastantes, `402` sin llamar a nada. Después cobra
  la IA por lo que informa OpenRouter y Blender por los segundos que midió el propio servidor, y solo si
  la ejecución funcionó (un guion que falla no cobra Blender, pero sí la IA que lo escribió; si la IA
  falla, nada). Cuenta en el tope global del mes (`Budget`) y en el límite por minuto.
- **Un trabajo activo por cuenta** (`409 busy`), tope de rondas, y las fotos limitadas a 3 data URL
  JPEG/PNG de 600 000 caracteres.
- **revela-blender solo acepta peticiones firmadas** por revela-share (HMAC-SHA256 del cuerpo y la hora con
  `BLENDER_SECRET`, que solo está en los secretos de Cloudflare de los dos Workers; de más de 5 minutos o
  con el cuerpo cambiado, `401`). Su dirección pública no sirve de nada sin el secreto. El contenedor no
  tiene secretos.
- **El guion no puede salir de su carpeta:** el contenedor tiene `enableInternet = false` (con Containers,
  sin manejadores de salida configurados, toda petición saliente se rechaza: documentado en
  developers.cloudflare.com/containers/configuration/outbound-traffic); Blender corre como un usuario sin
  privilegios que solo puede escribir en `/work` (`/tmp` cerrado); `run.py` pone un *audit hook* de
  Python (no se puede quitar) que bloquea escribir fuera de la carpeta del trabajo, sockets, procesos,
  `ctypes` y similares; y `runner.py` limita a 90 s (mata el grupo de procesos), 6 GiB de memoria
  (`RLIMIT_AS`), el tamaño de archivo y el GLB (15 MB). Una ejecución cada vez por contenedor. Antes de
  gastar Blender, el servidor rechaza los guiones que importan módulos prohibidos.
- Sin `BLENDER_URL` y `BLENDER_SECRET`, `/api/3d/jobs` responde `503 { error: 'not configured' }`, `/api/me`
  dice `model3d: false` y la app oculta el botón (en la edición abierta, siempre oculto).

Se prueba en `tests/server-api.mjs` (con Blender y OpenRouter simulados: rondas, cobro, 402, un trabajo a
la vez, cambios, cancelar, descarga, firma, 503), `tests/server-blender.mjs` (la puerta de revela-blender) y
`tests/suites/services.js` (el diálogo). El envoltorio de Blender se prueba de verdad con el Blender del
equipo: `python3 tools/blender-try.py [guion.py]` deja `out.glb` y `preview.png` en `tmp/blender-try/`
(con Blender Flatpak; los guiones deben estar bajo /home). La imagen también se puede probar con Docker:
`docker build -t revela-blender server/blender && docker run -p 8080:8080 revela-blender` y
`POST http://localhost:8080/run`.

### Costes

Containers (plan de pago de Workers, que incluye al mes 25 GiB·h de memoria, 375 min de vCPU y 200 GB·h
de disco): 0,000020 $ por vCPU·s (solo uso activo), 0,0000025 $ por GiB·s y 0,00000007 $ por GB·s de disco
(estos dos mientras el contenedor está despierto). Un standard-3 (2 vCPU, 8 GiB, 16 GB) a pleno uso:
2 × 0,00002 + 8 × 0,0000025 + 16 × 0,00000007 ≈ **0,000061 $/s**. Se cobra `BLENDER_USD_PER_SECOND` =
**0,0001 $/s** (un 64 % más), que cubre el arranque y el minuto que sigue despierto tras la última ejecución
(`sleepAfter`, ≈ 0,0013 $ en memoria y disco). Una ejecución típica tarda 15–25 s (la vista previa, unos 13 s
con 2 vCPU; medido con la imagen en Docker).

Por modelo, con `google/gemini-3.8-flash` y un crédito = 0,002 $ (`CREDIT_USD`, `MARKUP` 1):

| | IA | Blender | Total |
| --- | --- | --- | --- |
| Ronda típica (≈ 6 000 tokens de entrada con la imagen, ≈ 3 000 de salida; 20 s) | ≈ 0,016 $ | 0,002 $ | ≈ 0,018 $ → **9–10 créditos** |
| Modelo típico (escribe, revisa la vista previa, da el visto bueno: 3 rondas, la última sin Blender) | ≈ 0,04 $ | ≈ 0,004 $ | ≈ 0,045 $ → **≈ 24 créditos** |
| Lo que se aparta por ronda (7 000 de entrada + 8 000 de salida + 120 s) | 0,035 $ | 0,012 $ | 0,047 $ → **24 créditos** |
| Máximo por petición (4 rondas al peor caso) | | | ≈ 0,19 $ → **96 créditos** (lo que muestra el diálogo) |
| Máximo por trabajo (12 rondas con los cambios) | | | ≈ 0,57 $ → **288 créditos** |

Si la entrada fuera mayor que lo previsto se cobra igualmente lo real (como en el resto de la IA).

### Activarlo (paso a paso)

1. **Plan de pago de Workers** (5 $/mes) en la cuenta de Cloudflare (Containers lo necesita) y una alerta
   de gasto en Facturación ▸ Notificaciones.
2. **Secreto compartido:** `openssl rand -base64 32` y ponerlo en los dos Workers:
   `cd server/blender && npx wrangler secret put BLENDER_SECRET` y
   `cd server/cloudflare && npx wrangler secret put BLENDER_SECRET` (el mismo valor). La primera vez,
   si revela-blender aún no existe, primero se despliega (paso 3) y luego se pone el secreto.
3. **Desplegar revela-blender:** en GitHub, Settings ▸ Secrets and variables ▸ Actions ▸ Variables:
   `BLENDER_DEPLOY` = `1` (o un secreto con ese nombre), y que el token `CLOUDFLARE_API_TOKEN` tenga
   también permiso de Containers (Account ▸ Containers ▸ Edit). Luego Actions ▸ Blender ▸ *Run workflow*
   (o un cambio en `server/blender/`). También a mano: `cd server/blender && npm install && npx wrangler
   deploy` (necesita Docker). Construye la imagen (unos 2 GB) y la sube al registro de Cloudflare.
4. **BLENDER_URL** en revela-share: Workers ▸ revela-share ▸ Configuración ▸ Variables y secretos ▸
   `BLENDER_URL` = `https://revela-blender.<tu-subdominio>.workers.dev` (la dirección que muestra el
   despliegue). Si Cloudflare no dejara a un Worker llamar a otro de la misma cuenta por su dirección
   workers.dev, añadir en `server/cloudflare/wrangler.toml` un *service binding*
   (`[[services]] binding = "BLENDER_SVC"`, `service = "revela-blender"`): el código lo usa si existe.
5. **Desplegar revela-share** (crea `ModelJob`, migración `v9`). Desde ese momento `/api/me` dice
   `model3d: true` y la app muestra «Crear 3D con IA».
6. Opcional: cambiar `AI_3D_MODEL`, `BLENDER_USD_PER_SECOND`, `AI_3D_MAX_ROUNDS` o `BLENDER_TIMEOUT` en las
   variables de Cloudflare; y `RUNNERS` / `max_instances` en `server/blender/wrangler.toml` para más
   ejecuciones a la vez.

Para apagarlo: quitar `BLENDER_URL` (la app oculta la opción) y, si se quiere, borrar revela-blender.

## Administración y soporte

La API de administración vive en este repositorio (`server/cloudflare/admin.js`) pero está
**apagada** hasta que se configuran tres variables (no secretas): `ACCESS_TEAM`, `ACCESS_AUD` y
`ADMIN_EMAILS`. Responde solo en `admin.revelaslides.com/api/admin/…`, protegido por una
aplicación de Cloudflare Access (Zero Trust, plan gratuito); el Worker no se fía solo de Access y
comprueba el token de cada petición. Las páginas de administración están en un repositorio
privado aparte (un proyecto de Cloudflare Pages servido en admin.revelaslides.com).

- **Directorio** (`Directory`): las cuentas son Durable Objects por `sub` de Google y no se pueden
  listar, así que cada cuenta se apunta sola al iniciar sesión, al usarse, al cambiar de plan o
  de créditos, y se quita al eliminarse. Las cuentas que no se usen desde que se activó no
  aparecen hasta que vuelvan a entrar.
- **Créditos, plan y bloqueo**: ajustes con motivo (entrada `admin` en el historial de la cuenta),
  «devolver el último cobro de IA», Pro manual hasta una fecha (aparte del de Stripe, que no se
  toca) y bloquear: una cuenta bloqueada puede entrar, ver su cuenta, descargar o borrar sus datos
  e informar de un problema; lo demás responde 403 `{ error: 'blocked' }`.
- **Tickets** (`Tickets`): «Informar de un problema» (Vista ▸ Ayuda, Mi cuenta, o
  revelaslides.com/support → `/app/?report=1`) envía el mensaje, el tipo, la versión, el navegador
  y el nombre de la presentación; su contenido solo si se marca la casilla (hasta
  `SUPPORT_ATTACH_KB`). Sin sesión hace falta un correo. Acuse por correo con el número; las
  respuestas del administrador se envían por correo y quedan en el hilo, con notas internas.
  Estados: «Nuevo / te toca» (`open`), «Esperando respuesta del usuario» (`waiting`; el antiguo
  `pending` se lee así y se migra solo) y «Resuelto» (`closed`). Al responder se elige: esperar su
  respuesta, marcar como resuelto o solo nota interna. Cada correo lleva un enlace firmado (HMAC con
  `MAIL_SECRET`: número, correo y caducidad de 30 días; sin iniciar sesión) a una página donde la
  persona contesta en el mismo ticket o lo marca «Ya está resuelto, gracias»: vuelve a «te toca» (o
  se cierra), se avisa al administrador (`SUPPORT_NOTIFY` o el primero de `ADMIN_EMAILS`) y un
  ticket cerrado se reabre con el enlace mientras valga. El cron diario manda un recordatorio a los
  `SUPPORT_REMIND_DAYS` (7) de esperar y lo cierra con una nota a los `SUPPORT_AUTOCLOSE_DAYS` (21); 0 lo apaga.
  «Sugerencia de la IA» (`POST …/tickets/:id/suggest`): el Worker manda a OpenRouter (solo proveedores
  que no guardan ni entrenan) el ticket y el resumen de la cuenta —nunca la presentación adjunta ni datos de
  otras personas— con el modelo `SUPPORT_AI_MODEL`; responde un resumen, prioridad, causa probable, qué
  comprobar, acciones propuestas (devolver, créditos ≤ 2000, Pro ≤ 365 días, desbloquear) y un borrador de
  respuesta. Se comprueba y recorta en el servidor, se guarda en el ticket (volver a abrirlo no gasta) y lo
  paga el presupuesto global de IA, no los créditos de la persona. La IA nunca actúa: las acciones solo
  rellenan los formularios para que el administrador las confirme.
- **Auditoría** (`Audit`): quién, cuándo, qué, antes y después de cada cambio; sin borrar.
- **Negocio** (`Finance`, `server/cloudflare/finance.js`): las cuentas de la empresa, solo para la
  administración. Se apunta cada hecho económico:
  - **IA** (cada petición con la clave de Revela: asistente, completar, visión, imágenes, voz, 3D,
    sugerencias de tickets, detección de esqueleto…): función (la app la indica; el servidor solo acepta
    las conocidas, si no `other`), modelo, tokens de entrada y salida, lo que cobró el proveedor
    (`usage.cost`, en USD), los créditos cobrados y la cuenta.
  - **Blender**: segundos de cada ronda de «Crear modelo 3D» y su coste (`BLENDER_USD_PER_SECOND`), también
    cuando la ejecución falla (Revela la paga igual, aunque a la persona no se le cobre).
  - **Correos** enviados (cuántos y de qué tipo) a `EMAIL_USD` cada uno (por defecto 0: Resend gratis).
  - **Stripe**: cada pago (paquetes en `checkout.session.completed`; Pro y puestos de equipo en cada
    `invoice.paid`): producto, importe bruto, IVA, moneda, comisión de Stripe (leída de su *balance
    transaction* con `STRIPE_SECRET_KEY`; si no se puede, estimada con `STRIPE_FEE_PCT` % + `STRIPE_FEE_FIXED`,
    por defecto 1,5 % + 0,25) y neto; los créditos vendidos; los reembolsos (`charge.refunded`) y las bajas
    (`customer.subscription.deleted`). Cada evento de Stripe una sola vez (los reintentos no cuentan doble).
    Con un código promocional, también el descuento y el código: Negocio muestra el bruto antes del
    descuento, los descuentos y lo cobrado, y las cifras de cada código (usos, descuento, cobrado).
  - **Pruebas gratis de Pro**: empezadas (la factura de 0 al empezar), convertidas (su primera factura
    pagada) y canceladas (baja antes de pagar); la conversión es convertidas / (convertidas + canceladas).
  - **Créditos**: regalados (bienvenida, mes de Pro, administración, devoluciones), gastados (con su
    petición de IA) y caducados (los lotes de la cuenta).
  - **Cuentas nuevas y activas**: un contador por día (DAU) y la primera vez de cada mes (MAU), sin guardar quién.
  - **A mano** (página «Negocio»): gastos fijos (nombre, importe, moneda, fecha, mensual o no, categoría) y
    horas de trabajo (fecha, horas, categoría, nota); cada alta, cambio o borrado en la auditoría.

  Se guardan las sumas de cada día para siempre y los eventos sueltos 90 días (los pagos, reembolsos y bajas,
  siempre: son la contabilidad). El dinero se guarda en la moneda en que llega (EUR, USD) y los informes lo
  pasan a EUR con `USD_EUR` (por defecto 0,86; el informe dice qué tipo usó). No hay almacenamiento R2 que
  medir (todo son Durable Objects), así que no se apunta. Con eso, `GET /api/admin/finance/summary?from&to&group=day|month`
  da ingresos brutos y netos, IVA, comisiones y reembolsos; costes de IA por función y modelo, Blender, correo
  y fijos; margen bruto y neto; MRR, suscriptores, altas y bajas, churn; usuarios activos, conversión de
  gratis a Pro, ARPU y coste por usuario activo; créditos vendidos, gastados, caducados y pendientes (pasivo);
  las cuentas que más cuestan con lo que pagan; horas por categoría y beneficio por hora; punto de equilibrio
  frente a los fijos y el presupuesto de IA del mes. También `…/finance/events` (eventos sueltos),
  `…/finance/export.csv` (para la gestoría: `;`, coma decimal, UTF-8) y `…/finance/entries` (los apuntes a mano).
  Las cifras por persona solo se ven en la administración protegida.

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
| Usar Blender sin pagar o ejecutar código fuera de su sitio | Solo revela-share puede pedir ejecuciones (firma con `BLENDER_SECRET`), cobra antes cada ronda y el contenedor no tiene red, ni permisos fuera de su carpeta, ni secretos |
| Acceso de administrador | La API de administración (`admin.js`) está apagada (404) mientras no se configuren `ACCESS_TEAM`, `ACCESS_AUD` y `ADMIN_EMAILS`; solo responde en admin.revelaslides.com, detrás de Cloudflare Access, y el Worker comprueba él mismo el token de Access (firma RS256 con las claves del equipo, audiencia, emisor, caducidad) y que el correo esté en `ADMIN_EMAILS` |
| Otra web usando la sesión de Access del administrador (CSRF) | Cada petición lleva la cabecera `X-Revela-Admin` (otra web no puede ponerla sin permiso CORS, que no hay) y los cambios solo se aceptan con `Origin` del propio host de administración |
| Un cambio de administración sin rastro | Cada cambio (créditos, plan, bloqueo, tickets) se apunta antes en un registro (`Audit`) que no tiene forma de editarse ni borrarse |
| Inundar el soporte o usarlo para mandar correos a terceros | Límite diario por dirección IP o cuenta, y por destinatario del acuse (`SUPPORT_PER_DAY`, por defecto 5), un tope diario total, un campo trampa para robots, solo desde Revela (Origin), y el acuse no copia el texto del mensaje |
| Responder en un ticket ajeno o con un enlace viejo | El enlace va firmado (HMAC con `MAIL_SECRET`) sobre el número, el correo de la consulta y la caducidad (30 días): uno cambiado, de otra consulta o caducado responde 403; las respuestas tienen límite por dirección y por consulta al día (`SUPPORT_REPLIES_PER_DAY`, 10) y de tamaño |
| Que la IA de soporte haga cambios o gaste de más | Solo sugiere: el servidor filtra tipos de acción y recorta importes, y cualquier cambio lo hace el administrador con los formularios de siempre (y queda en la auditoría); cada sugerencia comprueba el presupuesto mensual de IA, se apunta en la auditoría con su coste y se reutiliza hasta pedir otra |

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
   `customer.subscription.updated` (avisos de cancelación),
   `customer.subscription.deleted`, `charge.refunded` (reembolsos, para la contabilidad) y
   `customer.subscription.trial_will_end` (aviso del fin de la prueba gratis de Pro).
   **Clave restringida** (Developers ▸ API keys ▸ *Create restricted key*), con estos permisos:
   *Checkout Sessions* — escritura; *Customer portal* — escritura; *Subscriptions* — escritura;
   *Charges* — lectura; *PaymentIntents* — lectura; *Balance* — lectura (y *Balance transactions* si
   aparece aparte); y, para «Promociones» en la administración, *Coupons* — escritura; *Promotion
   Codes* — escritura; *Products* — lectura; *Prices* — lectura (sin ellos la página lo dice y nombra
   los que faltan). **Portal de cliente** (Settings ▸ Billing ▸ Customer portal): permitir cancelar la
   suscripción (también durante la prueba gratis).
   **Impuestos (Stripe Tax):** categoría de producto *Software as a service (SaaS) – personal use*;
   en cada precio, *Include tax in price* = **No** (los precios son sin impuestos); añadir el registro
   de IVA de España en Stripe ▸ Tax ▸ Registrations; y la variable `STRIPE_AUTOMATIC_TAX = 1` en el
   Worker: Checkout sumará el impuesto de cada país y pedirá el NIF-IVA a las empresas.

   **Modo de prueba de Stripe (comprar sin dinero real, en producción).** Revela guarda las dos
   configuraciones de Stripe a la vez, la real y la de prueba, y la administración elige quién
   paga en modo de prueba: en la ficha de la cuenta, «Pagos en modo de prueba» (queda en la
   auditoría). Esa cuenta compra con la clave y los precios de prueba (tarjeta `4242 4242 4242 4242`,
   cualquier fecha futura y cualquier CVC), y la aplicación lo avisa en «Mi cuenta». Lo que da una
   compra de prueba (Pro, créditos, puestos de equipo) es igual que lo real pero va **marcado de
   prueba**: en el historial de créditos, en el plan («Pro (prueba)») y en la contabilidad, donde
   **no cuenta** en ingresos, comisiones, neto, MRR, bajas ni conversión (Negocio lo muestra aparte,
   en «Pruebas», y el CSV de la gestoría no lo incluye). «Quitar lo de prueba» en la ficha retira el
   Pro y los créditos de prueba sin tocar los reales. Un evento de prueba para una cuenta sin la
   marca se ignora (y se apunta en el registro del Worker). Por qué así: probar el pago entero en
   el sitio real, con cuentas reales, sin cobrar a nadie ni ensuciar las cifras del negocio.

   Pasos, en Stripe con el interruptor **Modo de prueba** (Test mode) activado:
   1. **Clave restringida de prueba** (Developers ▸ API keys ▸ *Create restricted key*), con los
      mismos permisos que la real: *Checkout Sessions* — escritura; *Customer portal* — escritura;
      *Subscriptions* — escritura; *Charges* — lectura; *PaymentIntents* — lectura; *Balance* — lectura
      (las comisiones; también *Balance transactions* si aparece aparte); *Coupons* — escritura;
      *Promotion Codes* — escritura; *Products* — lectura; *Prices* — lectura (códigos promocionales).
   2. **Productos y precios de prueba**, los mismos que los reales (Pro mensual, Pro anual, 500 y 1500
      créditos, puesto de equipo); en modo de prueba sus ids son otros.
   3. **Webhook de prueba**: endpoint `https://revelaslides.com/api/billing/webhook-test` con los
      eventos `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `charge.refunded` y `customer.subscription.trial_will_end`
      (el real sigue en `…/api/billing/webhook`).
   4. **Secretos** (nunca en el repositorio): `npx wrangler secret put STRIPE_TEST_SECRET_KEY` (la clave
      `rk_test_…`) y `npx wrangler secret put STRIPE_TEST_WEBHOOK_SECRET` (el `whsec_…` del webhook de prueba).
   5. **Variables** (Workers ▸ revela-share ▸ Settings ▸ Variables), con los ids de prueba:
      `STRIPE_TEST_PRICE_PRO_MONTH`, `STRIPE_TEST_PRICE_PRO_YEAR`, `STRIPE_TEST_PRICE_CREDITS_500`,
      `STRIPE_TEST_PRICE_CREDITS_1500` y `STRIPE_TEST_PRICE_TEAM_SEAT`.
   6. Opcional: `STRIPE_MODE = test` pone **a todo el mundo** en modo de prueba (por ejemplo, antes de
      abrir las ventas); por defecto, `live`.

   Sin la clave o el secreto de prueba, una cuenta marcada no puede comprar (503 «billing test not
   configured») y la aplicación no muestra los botones de pago activos.
7. **Correos.** Una de dos:
   - **Cloudflare Email Service** (requiere el plan de pago de Workers): Compute ▸ Email Service ▸ Email Sending ▸
     *Onboard Domain* con `revelaslides.com`; Cloudflare añade los registros DNS (MX y SPF en
     el subdominio `cf-bounce`, DKIM, y DMARC en `_dmarc.revelaslides.com`). Cuando esté
     verificado, descomentar en `wrangler.toml` el bloque `[[send_email]]` con
     `name = "EMAIL"` y desplegar.
   - **Resend** (elegido: gratis hasta 3000 correos al mes): verificar el dominio en resend.com (sus registros SPF y DKIM en el DNS de
     Cloudflare) y `npx wrangler secret put RESEND_KEY`.

   En los dos casos: `openssl rand -base64 32 | npx wrangler secret put MAIL_SECRET` (firma
   los enlaces de baja) y, si se quiere otro remitente, la variable `MAIL_FROM` (por defecto
   `Revela <avisos@revelaslides.com>`; la dirección debe ser del dominio verificado). Sin
   `EMAIL` ni `RESEND_KEY` no se envía nada y todo lo demás funciona igual.
8. **Cuentas del negocio** (opcional; los valores por defecto sirven): en Workers ▸ revela-share ▸
   Settings ▸ Variables, `USD_EUR` (cuántos euros es un dólar, para los informes), `EMAIL_USD` (lo que cuesta
   un correo) y, solo si la clave de Stripe no puede leer las comisiones, `STRIPE_FEE_PCT` y `STRIPE_FEE_FIXED`.
9. **Plan de pago de Workers** (5 $/mes) al abrirlo al público, y una alerta de
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
