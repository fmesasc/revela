# Revela en winget (Windows)

`winget install FMLab.Revela` (o `winget install revela`) cuando el paquete esté en el catálogo de Microsoft.

- `manifests/f/FMLab/Revela/<versión>/`: los tres manifiestos (versión, instalador, textos en es-ES y en-US), tal
  como van en [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) (misma ruta).
- **Darlo de alta** (una vez): un pull request a microsoft/winget-pkgs con esa carpeta. Lo revisa un bot (descarga
  los instaladores y comprueba su SHA-256) y luego una persona; suele tardar unos días.
- **Cada versión nueva**: otra carpeta con el número y los SHA-256 nuevos, en otro pull request. Se puede automatizar
  desde desktop.yml con `wingetcreate update FMLab.Revela --version X --urls … --submit` y un token de GitHub con
  permiso para hacer fork (secreto `WINGET_TOKEN`).
- Mientras, en Windows: `irm https://revelaslides.com/install.ps1 | iex` (revelaslides.com/download).
