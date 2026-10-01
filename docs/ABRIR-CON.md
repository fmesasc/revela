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
| Google Drive | Sí | Sí («Nuevo ▸ Revela») | Sí (la primera diapositiva, la sube Revela al guardar) | No: Drive no admite visores de terceros en su vista previa |
| Dropbox | Sí («Abrir» ▸ Revela), con una app con acceso a todo Dropbox | No | No | No |
| OneDrive personal | No existe para terceros | No | No | No |
| OneDrive de empresa / SharePoint | Sí, con *file handlers* (necesitan servidor y consentimiento del administrador) | Sí | Icono propio | Sí |

## Google Drive

Todo se hace en [Google Cloud Console](https://console.cloud.google.com/), en el
proyecto que ya usa Revela (el de su ID de cliente). Los nombres de los menús
pueden salir en inglés o en español según el idioma de la consola.

### 1. Integración con la IU de Drive

☰ Menú ▸ **APIs y servicios ▸ APIs y servicios habilitados ▸ Google Drive API**
▸ pestaña **Integración con la IU de Drive** (*Drive UI integration*):

| Apartado | Qué poner |
| --- | --- |
| Nombre de la aplicación | `Revela` |
| Descripción breve | `Editor de presentaciones` |
| Descripción larga | Una frase: qué es Revela y qué abre (presentaciones `.revela.json`) |
| Iconos de la aplicación | Los PNG de `icons/drive/` del tamaño que pida cada casilla (16, 32, 48, 64, 96, 128, 256) |
| URL de apertura (*Open URL*) | `https://fmesasc.github.io/revela/` |
| Tipos MIME predeterminados | `application/vnd.revela+json` |
| Extensiones predeterminadas | vacío (poner `json` haría a Revela la aplicación de todos los JSON) |
| Tipos MIME secundarios | `application/json` (presentaciones guardadas antes de este cambio) |
| Extensiones secundarias | vacío, o `json` si se quiere ver Revela también para cualquier `.json` |
| Creación de archivos | marcado · URL nueva: `https://fmesasc.github.io/revela/` · nombre del documento: `Presentación de Revela` |
| Importación | sin marcar |
| Compatibilidad con unidades compartidas | marcado |

Y **Enviar** (*Submit*). Los iconos pueden tardar hasta 24 horas en verse.

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
2. Guardar una presentación en Drive (se guarda con el tipo nuevo).
3. En Drive: botón derecho sobre el `.revela.json` ▸ **Abrir con ▸ Revela**, y
   **Nuevo ▸ Más ▸ Revela** para crear una.
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
