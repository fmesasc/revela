# «Abrir con Revela» desde Google Drive, Dropbox y OneDrive

Revela puede abrirse desde el propio almacenamiento en la nube: al elegir
**Abrir con ▸ Revela** sobre un archivo `.revela.json`, Revela pregunta si se
quiere **ver la presentación** (a pantalla completa, como una vista previa) o
**editarla**. Revela no tiene servidor: estas integraciones solo necesitan
registrarse en el panel de cada servicio, con identificadores públicos (sin
ningún secreto).

Qué permite cada servicio (comprobado en su documentación, septiembre de 2026):

| Servicio | Abrir con | Nuevo archivo | Miniatura | Vista previa integrada |
| --- | --- | --- | --- | --- |
| Google Drive | Sí (también `.pptx` y `.odp`, que se importan) | Sí («Nuevo ▸ Revela») | Sí (la primera diapositiva a 1600 px con «Revela · N diapositivas», la sube Revela al guardar) | No para `.revela.json` (Drive no admite visores de terceros); sí para las copias en PDF o PowerPoint que Revela puede guardar al lado |
| Dropbox | Sí («Abrir» ▸ Revela), con una app con acceso a todo Dropbox | No | No | No |
| OneDrive personal | No existe para terceros | No | No | No |
| OneDrive de empresa / SharePoint | Sí, con *file handlers* (necesitan servidor y consentimiento del administrador) | Sí | Icono propio | Sí |

## Google Drive

### Qué hace Revela al guardar en Drive (ya hecho en el código)

- **Dónde**: la primera vez que se guarda una presentación (Archivo ▸ **Guardar
  en Drive**), y siempre con **Guardar en Drive como…**, Revela pregunta el
  nombre, la carpeta (botón «Elegir carpeta…», que abre el selector de Google
  empezando en *Mi unidad*) y el formato. Recuerda la última carpeta. Después,
  el guardado automático sigue escribiendo en el mismo archivo. Al terminar
  dice dónde está («Guardado en Drive ▸ Carpeta/archivo») con un enlace
  **Abrir en Drive**; lo mismo al pulsar el icono de la nube junto al nombre.
  Elegir la carpeta con el selector es lo que da acceso a ella con el permiso
  `drive.file`: no hace falta ningún permiso nuevo.
- **Formato**:
  - **Revela (editable, todo)**: el `.revela.json` con el tipo
    `application/vnd.revela+json`. Drive no puede mostrar sus diapositivas
    (solo la miniatura de la primera, que sube Revela), pero sí lo encuentra
    al buscar por sus textos: Revela le envía todos los textos de las
    diapositivas y las notas (`contentHints.indexableText`).
  - **PowerPoint (.pptx) — se ve en Drive con todas sus diapositivas**: una
    copia hecha con el exportador de PowerPoint. Es una copia: los cambios
    posteriores no se guardan en ella (se vuelve a guardar otra si hace falta).
    Abrirla luego en Revela («Abrir con ▸ Revela», o «Desde Google Slides») la
    importa.
  - **PDF — se ve en Drive con todas sus diapositivas, tal cual**: una copia
    hecha por Revela (cada página, la diapositiva como se ve) con el texto en
    una capa seleccionable: Drive la hojea entera y encuentra sus palabras.
    Como el `.pptx`, es una copia: los cambios posteriores no se guardan en ella.

### Qué se ve en Drive (y qué no se puede cambiar)

- **El icono de cada archivo**: Google ha retirado los «iconos de documento»
  de la integración con Drive (salen como *obsoletos* en su documentación), así
  que una aplicación externa ya no puede poner su icono a sus archivos en la
  lista de Drive. Lo que sí se ve: en la vista de **cuadrícula**, la miniatura
  de la primera diapositiva; el **icono de Revela** en «Abrir con», en
  «Nuevo ▸ Más» y en «Administrar aplicaciones» (los iconos de la aplicación,
  paso 1). Los `.pptx` llevan el icono y la vista previa de PowerPoint de Drive.
- **Ver todas las diapositivas** dentro de Drive: con la copia en PDF o en `.pptx`; o «Abrir con ▸ Revela ▸ Ver la presentación», a pantalla completa.

Todo lo que sigue se hace en [Google Cloud Console](https://console.cloud.google.com/), en el
proyecto que ya usa Revela (el de su ID de cliente, `960102070599`). Los nombres de los menús
pueden salir en inglés o en español según el idioma de la consola. **Hasta que
no se haga, «Abrir con ▸ Revela», «Nuevo ▸ Revela» y el icono en Drive no
aparecen.**

### 1. Integración con la IU de Drive

☰ Menú ▸ **APIs y servicios ▸ APIs y servicios habilitados ▸ Google Drive API**
▸ pestaña **Integración con la IU de Drive** (*Drive UI integration*):

| Apartado | Qué poner |
| --- | --- |
| Nombre de la aplicación | `Revela` |
| Descripción breve | `Editor de presentaciones` |
| Descripción larga | Una frase: qué es Revela y qué abre (presentaciones `.revela.json`; también importa `.pptx` y `.odp`) |
| Iconos de la aplicación (*Application icons*) | Los PNG de `icons/drive/` (fondo transparente), el del tamaño que pida cada casilla: `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-64.png`, `icon-96.png`, `icon-128.png`, `icon-256.png` |
| Iconos de documento (*Document icons*) | nada: Google los da por obsoletos (ver arriba) |
| URL de apertura (*Open URL*) | `https://revelaslides.com/app/` — tal cual, sin variables: Drive le añade `?state={"ids":[…],"action":"open","userId":…}`, que es lo que lee Revela (`openRequest` en `src/ui/shell/openwith.js`) |
| Tipos MIME predeterminados | `application/vnd.revela+json` (el que pone Revela a todo lo que guarda en Drive) |
| Extensiones predeterminadas | vacío. Para Drive la extensión de `Clase.revela.json` es `json` (la última), no `revela`; el tipo MIME de arriba ya basta. Poner `json` haría a Revela la aplicación de todos los JSON |
| Tipos MIME secundarios | `application/json` (presentaciones guardadas antes del tipo propio), `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PowerPoint) y `application/vnd.oasis.opendocument.presentation` (LibreOffice) |
| Extensiones secundarias | `pptx` y `odp` |
| Creación de archivos | marcado · URL nueva (*New URL*): `https://revelaslides.com/app/` (Drive añade `?state={"action":"create","folderId":…}`; la presentación nueva se crea en esa carpeta) · nombre del documento: `Presentación de Revela` (Google dice que ya no se usa) |
| Importación | sin marcar |
| Compatibilidad con unidades compartidas | marcado |

Y **Enviar** (*Submit*). Los iconos y el «Abrir con» pueden tardar desde un rato
hasta 24 horas en verse.

Antes, comprobar en **APIs y servicios ▸ Credenciales ▸** el ID de cliente de
OAuth de Revela ▸ **Orígenes de JavaScript autorizados** que esté
`https://revelaslides.com` (además de `https://fmesasc.github.io`): Revela pide
el acceso a Google desde la página que abre Drive. Si se prefiere la edición de
GitHub Pages, poner `https://fmesasc.github.io/revela/` en las dos URL.

### 2. Permiso `drive.install`

☰ Menú ▸ **Google Auth Platform** (antes «Pantalla de consentimiento de OAuth»)
▸ **Acceso a datos** ▸ **Añadir o quitar permisos** ▸ en «Añadir permisos
manualmente», pegar `https://www.googleapis.com/auth/drive.install` ▸ **Añadir a
la tabla** ▸ **Actualizar** ▸ **Guardar**.

En **Público**: si la app está «En prueba», solo entran las cuentas añadidas
como usuarios de prueba; para que la use cualquiera, **Publicar la aplicación**
(«En producción»). Si la consola marcase el permiso como sensible, pediría
verificación.

### 3. Probarlo

1. En Revela, iniciar sesión con Google otra vez: la ventana de permisos pide
   ahora también «conectarse a Google Drive».
2. Guardar una presentación en Drive (se guarda con el tipo nuevo), eligiendo
   la carpeta; y otra vez con **Guardar en Drive como…** ▸ PowerPoint.
3. En Drive: botón derecho sobre el `.revela.json` ▸ **Abrir con ▸ Revela**, y
   **Nuevo ▸ Más ▸ Revela** para crear una. Abrir el `.pptx` con doble clic:
   Drive muestra todas sus diapositivas; con **Abrir con ▸ Revela** se importa.
4. Si no aparece: Drive ▸ ⚙ Configuración ▸ **Administrar aplicaciones** debe
   mostrar Revela; los cambios pueden tardar un rato.

## Dropbox

Las extensiones de Dropbox solo funcionan con apps que tienen acceso a **todo**
Dropbox (no «carpeta de la app»).

1. En la [consola de Dropbox](https://www.dropbox.com/developers/apps), crear
   (o usar) una app **Scoped access ▸ Full Dropbox**, con los permisos
   `files.metadata.read`, `files.content.read` y `files.content.write`, y la
   direcciones de redirección `https://revelaslides.com/app/auth.html` y
   `https://fmesasc.github.io/revela/auth.html`. La app de Revela (App key
   `u1j9rgsw5ww13e7`, pública) ya está en `src/core/config.js`; con ella las
   presentaciones se guardan en una carpeta `Revela`.
2. Pestaña **Extensions ▸ Add extension**:
   - **Extension URI**: `https://revelaslides.com/app/dropbox.html`
     (Dropbox añade `?file_id=…`).
   - **Supported file types**: `.json`.
   - Menú: **Open**.
3. En Revela, **Archivo ▸ Dropbox**, escribir la *App key* y marcar
   «La app tiene acceso a todo Dropbox»: las presentaciones se guardan entonces
   en la carpeta `Revela` de tu Dropbox.

## OneDrive

- **OneDrive personal** no tiene ninguna forma de que una aplicación externa
  aparezca en «Abrir con» ni en su vista previa.
- **OneDrive de empresa y SharePoint** sí, con *file handlers* de Microsoft 365:
  Microsoft llama a la aplicación con una petición **POST** (una página
  estática no puede recibirla: haría falta el servidor de Revela en Cloudflare)
  y el administrador del centro o la empresa tiene que dar su consentimiento a
  la app en su organización.
