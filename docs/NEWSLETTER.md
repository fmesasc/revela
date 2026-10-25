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
3. «Enviar a las cuentas…»: pide confirmación y motivo (queda en la auditoría). Sale en tandas de 30; la página sigue pidiendo tandas mientras
   está abierta; si se cierra, continúa cada día (hasta 10 tandas) o con «Continuar ahora». «Parar el envío» lo detiene.
4. Un boletín enviado no se cambia, borra ni reenvía. Antes de cada correo se vuelve a comprobar que esa cuenta sigue queriéndolo.

## Si se pide a Claude

Pedir: el tema, a quién va, qué idiomas y, si hace falta, qué fotos. Claude devuelve el JSON (o el archivo `news-src/…`), prepara las imágenes con
`tools/news-image.py`, lo comprueba con la suite y deja el archivo guardado en el repositorio. Para recibirlo en el panel basta pegar el JSON.
