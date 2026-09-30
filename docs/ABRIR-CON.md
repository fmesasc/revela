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

En [Google Cloud Console](https://console.cloud.google.com/), en el mismo
proyecto que ya usa Revela:

1. **API y servicios ▸ Biblioteca ▸ Google Drive API ▸ Administrar ▸
   Integración con la IU de Drive** (*Drive UI integration*):
   - **Nombre de la aplicación**: Revela. Descripciones corta y larga.
   - **Iconos**: los de `icons/drive/` (16, 32, 48, 64, 96, 128 y 256 px).
   - **URL de apertura** (*Open URL*): `https://fmesasc.github.io/revela/`
     (Drive añade `?state=…` con el archivo).
   - **Tipos MIME predeterminados**: `application/vnd.revela+json`
     (el tipo con el que Revela guarda desde ahora sus presentaciones).
   - **Tipos MIME secundarios**: `application/json` (las guardadas antes).
   - **Creación de archivos**: activada, con la misma URL; así aparece en
     **Nuevo ▸ Más ▸ Revela** y la presentación nueva se guarda en esa carpeta.
2. **Pantalla de consentimiento de OAuth ▸ Ámbitos**: añadir
   `https://www.googleapis.com/auth/drive.install` (no es sensible). Revela lo
   pide al iniciar sesión con Google; con eso aparece en «Abrir con» para esa
   persona, sin publicarla en Google Workspace Marketplace.

## Dropbox

Las extensiones de Dropbox solo funcionan con apps que tienen acceso a **todo**
Dropbox (no «carpeta de la app»).

1. En la [consola de Dropbox](https://www.dropbox.com/developers/apps), crear
   (o usar) una app **Scoped access ▸ Full Dropbox**, con los permisos
   `files.metadata.read`, `files.content.read` y `files.content.write`, y la
   dirección de redirección `https://fmesasc.github.io/revela/auth.html`.
2. Pestaña **Extensions ▸ Add extension**:
   - **Extension URI**: `https://fmesasc.github.io/revela/dropbox.html`
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
