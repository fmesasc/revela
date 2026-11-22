# La aplicación de escritorio frente a la web: topes, rendimiento y ventajas nativas

Auditoría hecha el 2026-11-22 sobre la 0.4.115 (rama `nativo`). El escritorio (Tauri 2: `desktop/src-tauri`,
`src/ui/shell/desktop.js`) carga **la misma aplicación web** dentro de una ventana (WebKitGTK en Linux, WKWebView en macOS,
WebView2 en Windows). Por eso hereda los topes de una pestaña aunque tenga un disco entero al lado. Este documento dice
cuáles son, cuáles se han quitado ya, qué se ha medido y qué queda **propuesto** (y por qué no se ha hecho).

Convención: **verificado aquí** = probado con Chrome sin cabeza y con Tauri simulado (`tests/suites/services.js`,
`tools/bench-escritorio/`). **Sin probar en una app real** = depende de una compilación de escritorio, que en esta máquina no
existe (no hay `cargo`) ni de la velocidad de WebKitGTK/WebView2, que no es la de Chrome.

## 1. Lo que ya estaba hecho (no se toca)

La web ya hace mucho por las presentaciones grandes, y el escritorio lo aprovecha. Está bien que quede escrito para no
rehacerlo:

- Los archivos grandes (imágenes, vídeos, sonidos) no van dentro de la presentación como texto `data:`: van por su
  **dirección** (`core/mediastore.js`: `blob:` en el navegador, el protocolo `asset:` en escritorio). Copiar, deshacer,
  duplicar y autoguardar mueven unas decenas de caracteres.
- En escritorio, un `.pptx` o `.revela` lo abre la propia ventana (`media.rs`: `zip_open`, `zip_extract`): cada archivo va del zip
  a la carpeta de datos de Revela (`<app data>/media/<id>.<ext>`) sin pasar por la página, y la presentación lo muestra desde ahí.
  `pptx-import.js` ya pasa `mediaMax: Infinity` cuando el archivo está en disco: el tope de 350 MB por archivo
  (`MEDIA_MAX`) solo vale en el navegador.
- Guardar y descargar archivos grandes: `saveBig` (`desktop.js`) escribe por trozos de 16 MB (`save_begin/chunk/end`) a partir de 64 MB;
  `save_package` arma el `.revela` en Rust desde la carpeta de medios.
- El aviso «presentación muy grande, usa la aplicación de escritorio» (`bigdeck.js`, 200 M de caracteres) no se muestra en escritorio.
- Autoguardado: `model.js` escribe en `localStorage` (solo si cabe en 4,5 M de caracteres y sin archivos por dirección) e
  IndexedDB (`kv`), a ~1 s del primer cambio (3 s si pasa de 20 MB), y de inmediato al ocultar o cerrar. Al arrancar gana la copia
  más nueva. Las miniaturas se hacen perezosamente (solo las visibles, el resto en reposo) y se guardan en caché por diapositiva.
- Exportar a HTML, SCORM y Drive se hace «por piezas» (`htmlParts`/`partsBlob`), sin el límite de ~512 M de caracteres de un texto.

## 2. Topes que dependen del navegador o de la edición web

| Tope | Dónde | Valor | En escritorio |
|---|---|---|---|
| Pasos de deshacer | `core/store.js` `HISTORY_LIMIT` | 60 | **Subido a 200** (commit 1) |
| Vídeo o sonido insertado (Insertar, arrastrar, pegar) | `ui/shell/openfile.js` `insertFiles`, `ribbon/actions.js` | todo como `data:` (texto): falla con ~380 MB (el texto pasaría de ~512 M de caracteres) | **Por su dirección, sin tope** (commit 2) |
| Grabación de cámara o pantalla | `ui/shell/recorder.js` | igual, como `data:` | **Por su dirección** (commit 3) |
| Tamaño por archivo al importar un PowerPoint | `pptx-import.js` `MEDIA_MAX` | 350 MB | Ya sin tope en disco (`mediaMax: Infinity`) |
| Aviso de presentación muy grande | `ui/shell/bigdeck.js` `BIG_DECK` | 200 M caracteres | Ya desactivado |
| Archivo adjunto (PDF, documento) dentro de la presentación | `features/content/files.js` `FILE_LIMIT` | 25 MB, como `data:` | **Propuesto** (ver 4.6) |
| Presentación en «Mi nube» | `io/cloud/clouddocs.js` + `server/cloudflare/docs.js` (`MAX_MB` 30, `PRO_MAX_MB` 40) | 30 / 40 MB | No aplica: es un límite del servidor, solo para guardar en la nube. En disco no hay tope. |
| Sincronización con Drive/OneDrive | `gdrive.js`, `onedrive.js` `AUTO_MAX` | 200 MB | No aplica (nube de terceros) |
| Copia local rápida (`localStorage`) | `core/model.js` `LS_MAX` | 4,5 M caracteres (~5 MB del sitio) | Se queda: solo acelera el arranque; lo grande va a IndexedDB |
| Versiones automáticas | `features/collab/versions.js` | 30 copias; 3 si la presentación pasa de 20 MB de texto | Se queda: con archivos por dirección el texto es pequeño |
| Tamaño de texto de un HTML en una sola página | `io/formats/html.js` `ONE_FILE_MAX` | 400 M caracteres | Ya se exporta por piezas (sin tope práctico) |
| Una pieza leída del zip por la ventana | `media.rs` `zip_read` | 256 MB (solo para las partes pequeñas: XML, JSON) | Bien así |
| Medios sin usar en la carpeta de Revela | `media.rs` `media_gc` | se borran al día de no usarse | Bien así |
| Otros (Lottie 8 MB, vídeo de Commons 40 MB, tabla xlsx 200×30, mensajes de co-edición ~120 MB, voz de las encuestas ~1,2 M caracteres en `localStorage`) | varios | — | Son de la función, no del navegador; no se tocan |

## 3. Medidas (Chrome sin cabeza, 22 núcleos; `tools/bench-escritorio/bench.py`)

Presentación sintética: 300 diapositivas, cada una con texto, 4 formas y una imagen distinta de unos 220 KB.
«live» es como la tiene el escritorio (archivos por dirección); «data» es como la tiene la web con imágenes insertadas.

| | data (67 MB de texto) | live (0,4 MB de texto) |
|---|---|---|
| Abrir y dibujar la presentación | 143 ms | 76 ms |
| Construir todas las miniaturas | 252 ms | 20 ms |
| Primer autoguardado | 1826–2504 ms | 33–35 ms |
| Restaurar tras reiniciar | 40 ms | 5 ms |
| Un cambio con historial (`commit`) | 5,1 ms | 5,0 ms |

Con 300 diapositivas en «live», en el hilo de la página: exportar a PowerPoint 825 ms (51 MB), preparar datos para exportar
(`portable`) 118 ms, `htmlParts` 32 ms, cambiar el tema de todas 12 ms más 46 ms de miniaturas (la tarea más larga sin soltar
el hilo: 59 ms). **No hay un cuello de botella a medida en Chrome con 300 diapositivas**: la web ya está optimizada y las
mejoras que quedaban son de tope de memoria, no de velocidad.

Lo que sí crece con el número de diapositivas es el coste de cada cambio, porque `store.save()` compara y copia el documento entero
(`same(persisted, deck)` + `snapshot`) y cada paso de deshacer es una copia de objetos:

| Diapositivas | `commit` | `mutate` (un fotograma de arrastre) | de `mutate` hasta el fotograma |
|---|---|---|---|
| 100 | 2,1 ms | 1,8 ms | 16,9 ms |
| 300 | 4,8 ms | 3,1 ms | 16,8 ms |
| 1000 | 15 ms | 11,2 ms | 25,9 ms |

A 1000 diapositivas, arrastrar un objeto deja de ir a 60 fotogramas por segundo. Ver 4.7.

**Vídeo insertado** (un `File` de bytes aleatorios, en Chrome):

| | como `data:` (web, y escritorio antes) | por dirección (escritorio ahora) |
|---|---|---|
| 100 MB: texto en la presentación | 139 810 158 caracteres | 64 caracteres |
| 100 MB: insertar | 425 ms | 282 ms |
| 100 MB: primer guardado | 523 ms | 27 ms |
| 100 MB: memoria JS tras insertar | +246 MB | +106 MB |
| 420 MB | **no se inserta** (el texto pasaría de ~512 M de caracteres: el bloque queda sin vídeo) | entra en 940 ms, guardar 17 ms |

**Deshacer** (300 diapositivas con 10 objetos, 300 ediciones): 60 pasos = +14 MB de memoria y 394 ms deshacerlos todos;
200 pasos = +44 MB y 1252 ms; (con 500 de tope, 302 pasos reales = +65 MB). Unos 0,2 MB por paso con ese tamaño.

## 4. Cambios hechos (todos detrás de `initDesktop`, deshechos por `stopDesktop`)

La web y la edición abierta no cambian: el ajuste solo se activa cuando existe `__TAURI__` y arranca `initDesktop`.

1. **Deshacer: 200 pasos** (`store.setHistoryLimit`, llamado desde `desktop.js nativeLimits`). Prueba: «escritorio: sin los topes del navegador».
2. **Vídeo y sonido por dirección** al insertar (botón Insertar, arrastrar, pegar): `core/mediastore.js` `mediaSrc`, usado por
   `openfile.js` (`insertFiles`, `readFile(…, 'media')`). Se guardan igual que los de un PowerPoint (referencia al almacén al
   autoguardar; `.revela` por `save_package`; `portable()` los convierte en `data:` solo cuando salen de la página, p. ej. exportar).
   Prueba: «escritorio: un vídeo o un sonido se inserta por su dirección».
3. **Grabaciones de cámara o pantalla** igual (`recorder.js`).

Verificado aquí (Tauri simulado): las tres. **Sin probar en una app real**: que WebKitGTK/WebView2 reproduzcan bien el `blob:` de
un vídeo de cientos de MB (el protocolo `asset:` sí está en uso para los medios de los PowerPoint, pero eso no se ha probado aquí con una ventana real) y que
`getUserMedia`/`getDisplayMedia` estén permitidos en la ventana (no se ha comprobado si lo están).

Limitación que queda y se explica en 5.2: el archivo elegido en «Abrir» aún pasa entero por la página (`read_opened`) y se
guarda también una copia en IndexedDB; falta un comando de Rust que lo copie del disco a la carpeta de medios sin pasar por JS.

## 5. Propuestas (no hechas: necesitan decisión o una compilación real)

Ninguna requiere un permiso nuevo de `capabilities/default.json`: los comandos propios de la aplicación (`#[tauri::command]` en
`main.rs`/`media.rs`) ya se usan sin listarlos. Sí requieren una compilación nueva del binario y una prueba en cada sistema.

1. **Guardado atómico (recomendado, riesgo de pérdida de datos hoy).** `save_file`, `save_begin` y `save_package` abren el destino con
   `File::create`, que lo vacía al instante. Si falla a mitad (disco lleno, apagón, el propio programa), el archivo anterior se
   pierde; y `save_package` en caso de error hace `remove_file(&path)`, es decir, **borra el `.revela` que la persona quería
   sobrescribir**. Arreglo: escribir en `<destino>.revela-tmp` en la misma carpeta, `sync_all`, y `rename` encima del destino;
   si falla, borrar solo el temporal. Cambio pequeño en tres funciones de Rust.
2. **«Guardar» en el mismo archivo (Ctrl+S sin diálogo) y archivos recientes.** Hoy cada guardado pregunta dónde. Hace falta que
   Rust recuerde la ruta elegida (y la dé como legible en `Files`) y una lista corta de recientes (en `app_data_dir`), mostrada en
   «Archivo». Decisión de producto: ¿Guardar = escribir sobre el archivo, o seguir como descarga?
3. **Importar un archivo del disco al almacén sin pasar por la página** (`media_import(path)`: copia en streaming a
   `media/<id>.<ext>` con el mismo `store_from` que ya existe, y devuelve `[id, ruta, tamaño]`). Con él, Insertar ▸ Vídeo de 400 MB
   no pasa por IPC (hoy ~32 MB/s en WebKitGTK: unos 13 s) y no se duplica en IndexedDB. Mismo comando para imágenes grandes.
4. **Autoguardado y recuperación en disco** (`autosave_write/read` en `app_data_dir/recover/`, con el mismo guardado atómico del
   punto 1): el JSON de la presentación (sin medios, que ya están en disco) cada pocos segundos. Quita la dependencia de la cuota
   y de la política de IndexedDB de cada web view y permite «recuperar tras cierre inesperado» aunque se borren los datos del
   sitio. Hoy ya hay recuperación vía IndexedDB (la misma que en la web); este punto solo aporta robustez.
5. **Copia de seguridad local**: con (1) y (4), un `.revela` rotativo (las últimas N) en `Documentos/Revela/copias`.
6. **Adjuntos de más de 25 MB** (`FILE_LIMIT`): en escritorio podrían ir por dirección como los vídeos, pero el bloque `file` espera
   un `data:` (se descarga al hacer clic, `sanitize.js` solo admite ciertos tipos de dato) y el mensaje «máximo 25 MB» está
   traducido en los 11 idiomas: tocarlo es cambiar cadenas. Poco valor frente a su coste.
7. **Estructura compartida para el historial y el autoguardado** (núcleo, afecta a la web): cada `mutate` hace una comparación
   completa del documento y una copia completa; cada paso de deshacer es una copia completa de objetos. Pasar a copias
   estructurales (compartir las diapositivas que no cambian) debería bajar el coste por cambio de O(diapositivas) a O(1) y la memoria
   por paso (hoy ~0,2 MB), pero no está medido. Es un cambio grande en `core/store.js` que toca todos los comandos; no es «detrás de escritorio»,
   y no se ha hecho sin que Francisco lo decida. Medido: 11 ms por fotograma de arrastre con 1000 diapositivas.
8. **Exportar sin bloquear la ventana** (PDF, PNG, vídeo, PowerPoint en un `Worker`, o en Rust): hoy van en el hilo de la
   página. Con 300 diapositivas, PowerPoint tarda 825 ms y el resto no se ha medido a esa escala; no hay evidencia de que
   bloquee de forma molesta, y mover PptxGenJS/`VideoEncoder` a un worker es grande. Se deja hasta que haya un caso medido en la app real.
9. **Medir en la app real**: todas las cifras de la sección 3 son de Chrome. WebKitGTK es más lento y tiene otras
   políticas de memoria; conviene repetir `tools/bench-escritorio/bench.py` dentro de la ventana (por ejemplo, desde la consola de
   desarrollo de Tauri) antes de decidir los puntos 7 y 8.

## 6. Cómo repetir las medidas

```
python3 tools/bench-escritorio/bench.py deck 300 1     # 300 diapositivas, archivos por dirección (escritorio)
python3 tools/bench-escritorio/bench.py deck 300 0     # los mismos, como data: (web)
python3 tools/bench-escritorio/bench.py video 100 0    # vídeo de 100 MB como texto
python3 tools/bench-escritorio/bench.py video 420 1    # vídeo de 420 MB por dirección
python3 tools/bench-escritorio/bench.py history 200 300
```
