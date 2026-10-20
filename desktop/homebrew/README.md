# Revela en Homebrew (macOS)

`brew install --cask fmesasc/revela/revela`

- `Casks/revela.rb`: el cask. Va en un repositorio propio llamado **fmesasc/homebrew-revela** (un «tap»: Homebrew
  lo encuentra por ese nombre), en `Casks/revela.rb`.
- **Cada versión nueva**: `version` y `sha256` del `.dmg` nuevos. Revela se actualiza sola (`auto_updates true`), así
  que Homebrew no la reinstala por su cuenta; el cask solo sirve para la primera instalación.
- No está firmada con un certificado de Apple: el cask le quita la marca de cuarentena al instalarla (si no, macOS
  dice que no se puede abrir).
- Mientras, en macOS: `curl -fsSL https://revelaslides.com/install.sh | sh` (revelaslides.com/download).
