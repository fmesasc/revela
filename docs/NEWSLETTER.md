# Novedades por correo: cómo se preparan y se envían

Los boletines se escriben en el panel de administración (**Novedades**) y llegan solo a quien marcó «Quiero recibir las novedades»
(al registrarse o en Mi cuenta ▸ Avisos por correo). Cada correo lleva su baja firmada. Código: `server/cloudflare/news.js` (envío y
correo), `mail.js` (marco común de todos los correos), `news-starters.js` (los textos de partida).

## Formato de un boletín

Un JSON, con un texto por idioma (los 11: `es en fr de it pt ca gl nl eu ar`; el que falte se lee en inglés y, si tampoco está, en español):

```json
{
  "name": "Noviembre 2026",
  "audience": { "langs": [], "plan": "all" },
  "texts": {
    "es": {
      "subject": "Asunto del correo (≤120)",
      "preheader": "Lo que se ve en la bandeja junto al asunto (≤140)",
      "eyebrow": "Etiqueta pequeña sobre el título (≤50; vacío: «Novedades»)",
      "title": "Título con *palabras en cursiva azul* (≤120)",
      "intro": "Texto de entrada. Una línea en blanco separa párrafos. (≤1500)",
      "blocks": [
        { "title": "Sección (admite *cursiva*) (≤100)", "text": "Texto (≤800)", "image": "https://revelaslides.com/img/news/slug.jpg",
          "cta": "Texto del enlace (≤40)", "url": "/templates" }
      ],
      "outro": "Cierre (≤800)"
    }
  }
}
```

- Hasta 8 secciones. `image`: solo `https`, opcional. `cta` y `url` van juntos o ninguno. `url`: una dirección `https` o una ruta de la web
  (`/templates`, `/guides`, `/pricing`; `/app/` para la app). Las rutas de la web salen en el idioma de cada persona
  (`/de/templates`) y todas llevan `utm_source=news&utm_campaign=<boletín>`, así el panel de visitas dice de dónde viene cada una.
- Todo es texto sin formato (se escapa). Los `{marcadores}` hay que rellenarlos: **el servidor no deja enviar** un borrador que aún los lleve.
- Los nombres de menús citados («Ver ▸ Ayuda ▸ Tutorial interactivo») van como los muestra la app en cada idioma (`src/i18n`).

## Dos formas de tener uno nuevo

1. **Sin desplegar nada (lo más rápido).** Se pide el boletín en JSON (en los idiomas que se quieran), se pega en
   **Novedades ▸ Nuevo boletín ▸ «Pegar un boletín…» ▸ Importar**, se revisa y se guarda como borrador. Cada boletín enviado queda
   registrado en el panel; los preparados se guardan además en el repositorio privado del panel, `revela-admin/novedades/`.
2. **Como texto de partida fijo** (para los que se repiten): un archivo `server/cloudflare/news-src/NN-clave.json` con
   `{ "key": "clave", "name": "…", "texts": { los 11 idiomas } }` y `node tools/build-news-starters.mjs`. Aparece en «Empezar desde…» con
   la próxima publicación. La suite comprueba que `news-starters.js` coincide con `news-src/` (`--check`).

## Imágenes

Las fotos van en `site/img/news/` (repositorio de la web), como JPEG de 1056 px de ancho (WebP no se ve en todos los clientes de correo):

```
cd site
python3 tools/news-image.py <slug> "<descripción>" <origen> [<origen> …] [--cols=2] [--height=594]
```

Con un origen: esa imagen escalada (una captura, la portada de una plantilla en `img/templates/…-1280.webp`). Con varios: un collage.
Se apunta en `img/news/index.json`, que el editor ofrece en un desplegable («O elige una de las de la web»). La dirección es
`https://revelaslides.com/img/news/<slug>.jpg` y **existe cuando se publica la web**: antes de enviar un boletín con fotos nuevas, publicar.

## Antes de enviar

1. Producción al día (`Publicar en producción`) y el panel desplegado (`./deploy.sh` en `revela-admin`).
2. **Vista previa** en cada idioma y **«Enviarme una prueba a mi correo»**: se ve en la bandeja de verdad (Gmail/Outlook, móvil y modo oscuro).
3. «Enviar a las cuentas…»: se elige el **ritmo** (30, 60, 120, 300 por hora o lo antes posible; 60 por hora al principio) y pide confirmación y motivo
   (queda en la auditoría). La primera tanda de 30 sale ya y cada siguiente a su hora (con unos minutos de diferencia entre una y otra): el servidor
   despierta solo (alarma de Budget, tipo `news`), no hace falta tener el panel abierto. «Continuar ahora» fuerza la siguiente; «Parar el envío»
   lo detiene; el cron diario recoge una tanda que haya perdido su alarma.
4. Un boletín enviado no se cambia, borra ni reenvía. Antes de cada correo se vuelve a comprobar que esa cuenta sigue queriéndolo.

## Si se pide a Claude

Pedir: el tema, a quién va, qué idiomas y, si hace falta, qué fotos. Claude devuelve el JSON (o el archivo `news-src/…`), prepara las imágenes con
`tools/news-image.py`, lo comprueba con la suite y deja el archivo guardado en el repositorio. Para recibirlo en el panel basta pegar el JSON.

## Para que no acabe en spam

- **Autenticación del dominio** (ya puesta: DKIM de Resend en `resend._domainkey`, SPF del dominio de rebote `send.`, DMARC `p=quarantine`): comprobar en
  un Gmail propio, «Mostrar original»: SPF, DKIM y DMARC en **PASS**. Probar también con mail-tester.com antes del primer envío grande.
- **Ritmo y calentamiento**: un dominio que no suele mandar mucho y de golpe manda miles es sospechoso. 60 por hora al principio; subir si no hay quejas.
- **Solo a quien lo pidió** (pocas quejas), con baja visible y en la cabecera `List-Unsubscribe` (un clic, lo que exigen Gmail y Yahoo).
- Contenido normal: asunto sin MAYÚSCULAS ni signos de más, una imagen o dos, sin acortadores de enlaces. Gmail mira sobre todo si la gente
  abre, no borra sin leer y no marca como spam: un boletín que interesa es el mejor antideslizamiento.
- Si algún día se marca mucho como spam: parar, mirar «Saltados» y las bajas del envío, y bajar el ritmo.

## Qué se mide

Por **cuenta** (lo dice la política de privacidad, «Correos con novedades»; la información a las cuentas anteriores ya se dio por escrito y a las nuevas
les llega por la web):

- **Aperturas** (aproximadas: una imagen de 1×1 en el correo; Apple Mail y algunos clientes la cargan siempre, otros nunca) y **clics** por enlace,
  con la fecha y cuántas veces. Los enlaces van firmados con la cuenta y el boletín (`recipientToken`), así que nadie puede inventarse la marca de otro.
  Pasan por `/api/n/<boletín>/<enlace>?r=<marca>`, que lo anota y redirige a lo que el propio boletín dice (nunca a una dirección del enlace).
- En la ficha de cada boletín enviado: abiertos y con clics (de los que se pudo seguir), clics por enlace, bajas desde el envío y la lista de
  **quién lo abrió y qué pulsó** (500 como mucho). Los clics de las pruebas (`&t=1`) no cuentan. Algunos antivirus de correo abren los enlaces y suman de más.
- Las visitas a la web que llegan del boletín salen además en el panel de Web como `utm:news:<boletín>`.
- Al borrar una cuenta se borra lo que abrió y pulsó (`news-forget`).

## Enviar a quienes aún no lo han recibido

En un boletín enviado, «Enviar a quienes aún no lo han recibido» lo manda otra vez, a ritmo, a las cuentas que lo piden y no lo tienen: las que se suscribieron
después (la ficha dice cuántas) y las que fallaron. Cada cuenta recuerda qué boletines recibió, así que nadie lo recibe dos veces. Cada ronda queda anotada.

## Pruebas con otra dirección

En la ficha de un borrador: «Enviar la prueba» a una dirección escrita (p. ej. la que da mail-tester.com) y la casilla **«Como saldría de verdad»** (sin «[PRUEBA]»,
con su baja y sus enlaces, que no cuentan). Hasta 20 pruebas por hora; cada una queda en la auditoría.
