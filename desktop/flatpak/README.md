# Revela en Flatpak (Flathub)

Revela se construye para Flathub **desde el código fuente** y **sin red** durante la compilación: flatpak-builder
descarga antes solo lo que lista el manifiesto (este repositorio y los crates de `cargo-sources.json`) y luego compila
dentro del SDK de GNOME.

| Archivo | Qué es |
|---|---|
| `com.revelaslides.Revela.yml` | El manifiesto. Aquí su fuente es esta copia del repositorio (`type: dir`), para construirlo en local; la copia de Flathub usa el repositorio en la etiqueta de una versión (ver abajo). |
| `cargo-sources.json` | Los crates de `desktop/src-tauri/Cargo.lock`, con su suma SHA-256, para compilar sin red. Se regenera cada vez que cambia `Cargo.lock`. |
| `com.revelaslides.Revela.desktop` | El lanzador del Flatpak (Flathub exige que se llame como el id). El `.deb` sigue usando `desktop/src-tauri/revela.desktop` (plantilla de Tauri), que se instala como `Revela.desktop`. |
| `../src-tauri/metainfo.xml` | Los metadatos AppStream: los mismos para el `.deb`, el `.rpm`, la AppImage y el Flatpak. El manifiesto solo cambia su `<launchable>` (`Revela.desktop` → `com.revelaslides.Revela.desktop`) al instalarlo. |

Por qué así:

- **Runtime GNOME 51**: trae WebKitGTK 4.1 (`webkit2gtk-4.1`, el que usa Tauri 2 en Linux), GTK 3 y libsoup 3.
  Extensiones del SDK: `rust-stable` (cargo) y `node24` (solo para `tools/build-site.mjs`, que copia archivos: no hay
  `npm install`).
- **Sin la CLI de Tauri** (es un paquete de npm, necesitaría red): se hace lo mismo que ella con cargo,
  `cargo build --release --features tauri/custom-protocol`. Esa característica es la que hace que la ventana muestre
  la aplicación empaquetada (`frontendDist`) y no un servidor de desarrollo.
- **Iconos**: `tauri.conf.json` nombra `desktop/src-tauri/icons/*`, que no están en el repositorio (los genera
  `desktop.yml` con `tauri icon`). En el Flatpak se generan al compilar, con `rsvg-convert` del SDK (el PNG dentro de
  un SVG: el SDK no trae otra herramienta de imagen y los cargadores de GdkPixbuf no funcionan en el sandbox de
  compilación), a partir de la misma imagen (`icons/icon-512.png`): 32×32 (el icono de la ventana) y 128/256, más el
  de 512 tal cual. Así no hay copias binarias que mantener al día y el icono es el mismo que el del `.deb`. (No se
  usa `icons/icon.svg`: es la versión plana, distinta del icono 3D de la aplicación de escritorio.)
- **Sin actualizador propio**: Flathub prohíbe que una aplicación se actualice sola. Dentro de un Flatpak
  (`FLATPAK_ID` o `/.flatpak-info`), `update_available` dice siempre que no hay versión nueva e `install_update` se
  niega (`desktop/src-tauri/src/main.rs`); la actualiza `flatpak update` / GNOME Software.
- **Permisos** (`finish-args`): `ipc`, `wayland` con `fallback-x11`, `dri` (WebKitGTK dibuja con la GPU), `network`
  (cuenta e IA, nubes, coedición, encuestas, compartir, bibliotecas de un CDN) y `pulseaudio` (sonido y micrófono).
  **Ningún acceso a archivos**: abrir y guardar pasan por los portales (los diálogos del sistema, que rfd muestra con
  `GtkFileChooserNative`) y lo que se abre con Revela llega por el portal de documentos (`/run/user/…/doc/…`).
  No se pide `--device=all` (cámara): Flathub lo revisa con lupa y, además, Tauri no concede hoy permisos de cámara a
  la página en Linux (no instala un gestor de permisos y WebKitGTK los deniega por defecto), así que no aportaría
  nada. Si algún día se activa la cámara en Linux, WebKitGTK puede usarla por el portal de cámara (PipeWire) sin
  `--device=all`.

## Construirlo en local

Hace falta Flatpak y el constructor de Flathub (sin root, para el usuario):

```sh
flatpak --user remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak --user install -y flathub org.flatpak.Builder
```

Desde la raíz del repositorio:

```sh
nice -n 10 flatpak run --filesystem=/tmp org.flatpak.Builder --user --install-deps-from=flathub --force-clean \
  --mirror-screenshots-url=https://dl.flathub.org/media/ --compose-url-policy=full \
  --repo=/tmp/revela-repo /tmp/revela-build desktop/flatpak/com.revelaslides.Revela.yml
flatpak --user remote-add --no-gpg-verify revela-local /tmp/revela-repo
flatpak --user install -y revela-local com.revelaslides.Revela
flatpak run com.revelaslides.Revela
```

(`--filesystem=/tmp`: el constructor es él mismo un Flatpak y su `/tmp` es privado; sin eso no encuentra los
directorios de `/tmp`. `--mirror-screenshots-url` y `--compose-url-policy=full` hacen lo que hace Flathub con las
capturas; sin ellos, el linter del repositorio da `appstream-external-screenshot-url`. La primera vez descarga el
SDK de GNOME, Rust y Node: unos 6–7 GB en `~/.local/share/flatpak`.) Para quitarlo después:
`flatpak --user uninstall -y com.revelaslides.Revela && flatpak --user remote-delete revela-local`.

Comprobar lo que mira Flathub:

```sh
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest desktop/flatpak/com.revelaslides.Revela.yml
flatpak run --filesystem=/tmp --command=flatpak-builder-lint org.flatpak.Builder repo /tmp/revela-repo
flatpak run --filesystem=/tmp --command=flatpak-builder-lint org.flatpak.Builder builddir /tmp/revela-build
```

Si cambia `desktop/src-tauri/Cargo.lock` (al añadir o actualizar crates), regenera `cargo-sources.json`:

```sh
git clone --depth 1 https://github.com/flatpak/flatpak-builder-tools /tmp/fbt
python3 -m venv /tmp/fbt-venv && /tmp/fbt-venv/bin/pip install aiohttp tomlkit
/tmp/fbt-venv/bin/python /tmp/fbt/cargo/flatpak-cargo-generator.py desktop/src-tauri/Cargo.lock -o desktop/flatpak/cargo-sources.json
```

## Enviarlo a Flathub (la primera vez)

Requisitos de Flathub: <https://docs.flathub.org/docs/for-app-authors/submission>.

1. Que la versión que se envía ya esté publicada con su etiqueta (`vX.Y.Z`) e incluya `Cargo.lock`, este directorio y
   el `metainfo.xml` con su `<release>`.
2. Iniciar sesión en GitHub como `fmesasc` y hacer un *fork* de <https://github.com/flathub/flathub> **con todas las
   ramas** (desmarcar «Copy the master branch only»).
3. En el fork, crear una rama a partir de `new-pr`:
   ```sh
   git clone --branch new-pr git@github.com:fmesasc/flathub.git && cd flathub
   git checkout -b com.revelaslides.Revela
   ```
4. Copiar `com.revelaslides.Revela.yml` y `cargo-sources.json` a la raíz y, en el manifiesto, cambiar la fuente
   `type: dir` (con su `skip`) por la de la etiqueta:
   ```yaml
   - type: git
     url: https://github.com/fmesasc/revela.git
     tag: vX.Y.Z
     commit: <git rev-parse vX.Y.Z^{commit}>
   ```
5. Comprobar con el linter (`… manifest com.revelaslides.Revela.yml`) y construir una vez en local como arriba.
6. `git commit`, `git push` y abrir el *pull request* **contra la rama `new-pr`** de `flathub/flathub`, con el título
   «Add com.revelaslides.Revela». La plantilla del PR trae una lista que hay que marcar.
7. Revisión: los revisores comentan en el PR; cada cambio se sube a la misma rama. Se puede pedir una compilación de
   prueba comentando `bot, build`. Cuando lo aprueban, Flathub crea el repositorio
   `flathub/com.revelaslides.Revela`, invita a `fmesasc` con permiso de escritura y publica la aplicación.
8. Verificar la aplicación (la marca de «verificado»): en <https://flathub.org> ▸ iniciar sesión con GitHub ▸
   *Developer portal* ▸ la app ▸ *Verification*. Con un identificador del dominio (`com.revelaslides.*`), Flathub da
   un código que hay que publicar en `https://revelaslides.com/.well-known/org.flathub.VerifiedApps.txt` (un archivo
   de la web: el repositorio privado revela-site, que publica Cloudflare Pages). Por eso el identificador es el del
   dominio y no `io.github.fmesasc.revela`: la ficha sale verificada como de revelaslides.com.

   (El identificador interno de la aplicación de Tauri, `identifier` en tauri.conf.json, sigue siendo
   `io.github.fmesasc.revela`: es la carpeta donde guarda sus datos y lo que Windows usa para reconocer una
   actualización; cambiarlo haría perder a quien ya la tiene instalada sus presentaciones guardadas.)

Antes del primer envío conviene añadir más capturas de pantalla (ver «Pendiente»).

## Mantenerlo al día

Cada versión nueva es un PR en `flathub/com.revelaslides.Revela` que cambia:

- en `com.revelaslides.Revela.yml`, el `tag` y el `commit` de la fuente git;
- `cargo-sources.json`, regenerado del `Cargo.lock` de esa etiqueta;
- y en este repositorio, **antes de etiquetar**, el `<release>` de esa versión en `desktop/src-tauri/metainfo.xml`
  (Flathub lo exige y es lo que muestra como novedades).

Flathub compila el PR (y lo prueba); al fusionarlo, se publica y los usuarios lo reciben con `flatpak update`.

### Automatizarlo

**1. El `<release>` en el metainfo.** Lo natural es añadirlo en `promote.yml`, en el mismo commit que fija la versión
(«Versión X.Y.Z»), para que esté dentro de la etiqueta. Por ejemplo, justo antes de etiquetar, con `V` = la versión:

```sh
node -e '
  const fs = require("fs"), f = "desktop/src-tauri/metainfo.xml", [v] = process.argv.slice(1);
  let x = fs.readFileSync(f, "utf8");
  if (!x.includes(`<release version="${v}"`))
    x = x.replace("<releases>", `<releases>\n    <release version="${v}" date="${new Date().toISOString().slice(0, 10)}"/>`);
  fs.writeFileSync(f, x);' "$V"
git add desktop/src-tauri/metainfo.xml
```

**2. El PR en Flathub.** Un trabajo más en `desktop.yml`, tras `release`, cuando exista el repositorio de Flathub y
un secreto `FLATHUB_TOKEN` (un *fine-grained token* de `fmesasc` con *Contents* y *Pull requests* de lectura y
escritura sobre `flathub/com.revelaslides.Revela`). No está añadido todavía:

```yaml
  flathub:
    needs: release
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ secrets.FLATHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
        with:
          path: src
      - name: Pull request in flathub/com.revelaslides.Revela
        shell: bash
        run: |
          set -euo pipefail
          [ -n "$GH_TOKEN" ] || { echo "::warning::No FLATHUB_TOKEN: no Flathub PR."; exit 0; }
          TAG="$GITHUB_REF_NAME"; COMMIT="$(git -C src rev-parse "$TAG^{commit}")"
          git clone "https://x-access-token:${GH_TOKEN}@github.com/flathub/com.revelaslides.Revela.git" fh
          # cargo-sources.json, from this tag's Cargo.lock.
          git clone --depth 1 https://github.com/flatpak/flatpak-builder-tools fbt
          pip install aiohttp tomlkit
          python3 fbt/cargo/flatpak-cargo-generator.py src/desktop/src-tauri/Cargo.lock -o fh/cargo-sources.json
          # The source: the new tag and its commit.
          sed -i -E "s|^( *tag: ).*|\1$TAG|; s|^( *commit: ).*|\1$COMMIT|" fh/com.revelaslides.Revela.yml
          cd fh
          git config user.name 'Revela' && git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git checkout -b "update-$TAG"
          git commit -am "Update to ${TAG#v}"
          git push origin "update-$TAG"
          gh pr create -R flathub/com.revelaslides.Revela --base master --head "update-$TAG" \
            --title "Update to ${TAG#v}" --body "Revela ${TAG#v}: https://github.com/fmesasc/revela/releases/tag/$TAG"
```

(Alternativa sin token: el *bot* de Flathub `flatpak-external-data-checker` puede abrir esos PR solo, si el manifiesto
de Flathub lleva en la fuente git un `x-checker-data: {type: git, tag-pattern: "^v([\\d.]+)$"}`; pero no regenera
`cargo-sources.json`, así que solo sirve mientras `Cargo.lock` no cambie.)

## Traducciones

La interfaz ya viene traducida dentro de la aplicación web (`src/i18n`): el Flatpak no tiene catálogos aparte. El
`metainfo.xml` y el `.desktop` llevan el resumen y la descripción en inglés y español; otros idiomas se añaden con
más elementos `xml:lang="…"`.

## Pendiente (lo tiene que hacer el propietario)

- **Capturas**: el metainfo usa `docs/screenshot.png` en la etiqueta `v0.4.19`
  (`https://raw.githubusercontent.com/fmesasc/revela/v0.4.19/docs/screenshot.png`). Flathub recomienda varias
  (editor, modo presentación, colaboración…), de la ventana sola, 16:9, sin escritorio alrededor, en un sitio con
  URL estable (mejor en una etiqueta que en `main`).
- **El envío** (fork de `flathub/flathub`, PR) y, luego, la verificación y el secreto `FLATHUB_TOKEN` si se quiere
  el PR automático.
