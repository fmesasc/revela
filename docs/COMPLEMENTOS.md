# Complementos y macros de Revela

Revela se puede ampliar con **complementos** (botones nuevos en la cinta que hacen
lo que tú programes) y **macros** (fragmentos de código que ejecutas cuando
quieras). Los dos usan la misma API, `Revela`, que es pequeña y estable a
propósito: todo lo que hace pasa por el mismo sistema que el editor, así que
**deshacer, el guardado automático y la colaboración siguen funcionando**.

- Complementos: **Ver ▸ Complementos**, pegando la dirección de un módulo JavaScript.
- Macros: **Ver ▸ Macros**, escribiendo el código directamente.

Los dos se guardan solo en tu navegador y solo se ejecutan cuando tú los añades.

## Tu primer complemento

Un complemento es un **módulo JavaScript** (ES module) que exporta por defecto una
función. Revela la llama al cargarlo y le pasa la API:

```js
// hola.js
export default function (Revela) {
  Revela.ui.addButton({
    id: 'hola',                 // único: identifica el botón
    label: 'Hola',              // el texto del botón
    icon: 'waving_hand',        // un icono de Material Symbols (fonts.google.com/icons)
    title: 'Añadir un saludo',  // la ayuda al pasar el ratón
    onClick: R => R.add.text('¡Hola desde mi complemento!', { x: 340, y: 300, w: 600, h: 100, fontSize: 40 }),
  });
}
```

El botón aparece en **Ver ▸ Complementos**, en el grupo «Complementos» de la cinta.

## Ejemplos

En [`examples/complementos/`](../examples/complementos/) hay cinco complementos
completos y comentados, que puedes probar tal cual pegando su dirección en
**Ver ▸ Complementos**:

| Complemento | Qué hace | Qué enseña | Dirección para probarlo |
|---|---|---|---|
| [`agenda.js`](../examples/complementos/agenda.js) | Añade tras la portada una diapositiva con los títulos de las demás | Leer la presentación, añadir una diapositiva, rellenar sus marcadores | `https://cdn.jsdelivr.net/gh/fmesasc/revela@main/examples/complementos/agenda.js` |
| [`palabras.js`](../examples/complementos/palabras.js) | Cuenta las palabras y calcula la duración leyendo las notas | Recorrer todas las diapositivas; los diálogos de Revela | `https://cdn.jsdelivr.net/gh/fmesasc/revela@main/examples/complementos/palabras.js` |
| [`numerar.js`](../examples/complementos/numerar.js) | Pone «n / total» en cada diapositiva y lo actualiza al repetir | Marcar tus objetos para encontrarlos y actualizarlos | `https://cdn.jsdelivr.net/gh/fmesasc/revela@main/examples/complementos/numerar.js` |
| [`revisor.js`](../examples/complementos/revisor.js) | Mientras editas, cuenta en su botón las diapositivas sin título o con demasiado texto, y te lleva a ellas | Escuchar los cambios (`Revela.on`) sin frenar el editor; cambiar el texto del propio botón | `https://cdn.jsdelivr.net/gh/fmesasc/revela@main/examples/complementos/revisor.js` |
| [`wikimedia.js`](../examples/complementos/wikimedia.js) | Busca una imagen libre en Wikimedia Commons y la pone con su autor y licencia | Consultar un servicio de internet (CORS), avisar si falla, añadir objetos que van juntos | `https://cdn.jsdelivr.net/gh/fmesasc/revela@main/examples/complementos/wikimedia.js` |

## La API

`Revela` está también en `window.Revela`, por si quieres probar cosas en la consola
del navegador.

### La presentación

| Llamada | Qué hace |
|---|---|
| `Revela.version` | La versión de la API (ahora `1`). Solo se añaden cosas; lo que existe no cambia. |
| `Revela.deck()` | Una **copia** de la presentación entera (ver «Cómo es una presentación»). Cambiarla no cambia nada: para eso, `update`. |
| `Revela.on('change', fn)` | Llama a `fn(Revela)` cada vez que cambia algo. Devuelve una función para dejar de escuchar. |

### Diapositivas

| Llamada | Qué hace |
|---|---|
| `Revela.slides.count()` | Cuántas hay. |
| `Revela.slides.current()` | El índice de la actual (desde 0). |
| `Revela.slides.goTo(i)` | Ir a la diapositiva `i`. Lo que añadas después va a esa diapositiva. |
| `Revela.slides.add()` | Añade una diapositiva **después de la actual**, con el diseño adecuado, y va a ella. Devuelve su índice. |

### Objetos (textos, formas, imágenes…)

| Llamada | Qué hace |
|---|---|
| `Revela.add.text(html, caja?)` | Añade un texto en la diapositiva actual. Devuelve su `id`. |
| `Revela.add.shape(tipo, caja?)` | Añade una forma (`'rect'`, `'ellipse'`, `'rounded'`, `'triangle'`, `'star'`, `'arrow'`…). Devuelve su `id`. |
| `Revela.add.image(src, caja?)` | Añade una imagen (una dirección `https://…` o `data:`). Devuelve su `id`. |
| `Revela.get(id)` | Una copia de un objeto, o `null`. |
| `Revela.update(id, props)` | Cambia propiedades de un objeto (un paso de deshacer). Devuelve `true` si existía. |
| `Revela.remove(id)` | Quita un objeto de la diapositiva actual. |
| `Revela.selection()` | Los `id` de lo que está seleccionado. |
| `Revela.select(id)` | Selecciona un objeto. |

La `caja` es un objeto con cualquier propiedad del objeto; las más habituales son
la posición y el tamaño: `{ x, y, w, h }`, en una diapositiva de **1280 × 720**.

### Exportar

| Llamada | Qué devuelve |
|---|---|
| `Revela.export.html()` | La presentación como una página HTML (texto). |
| `Revela.export.pptx()` | Una promesa con un `Blob` de PowerPoint. |
| `Revela.export.odp()` | Una promesa con un `Blob` de LibreOffice Impress. |
| `Revela.export.pdf()` | Abre el diálogo de imprimir / guardar en PDF. |

### Interfaz

| Llamada | Qué hace |
|---|---|
| `Revela.ui.addButton({ id, label, icon, title, onClick })` | Añade un botón a la cinta. `onClick` recibe `Revela`. |
| `Revela.ui.removeButton(id)` | Lo quita. |
| `Revela.ui.alert(texto)` | Un aviso con el estilo de Revela. Devuelve una promesa. |
| `Revela.ui.confirm(texto)` | Pregunta sí o no: una promesa con `true` o `false`. |
| `Revela.ui.prompt(texto, valor?)` | Pide un texto: una promesa con lo escrito, o `null` si se cancela. |

## Cómo es una presentación

`Revela.deck()` devuelve un objeto así (lo más útil; hay más propiedades):

```js
{
  name: 'Mi presentación',
  size: { w: 1280, h: 720 },
  slides: [
    {
      id: 's1',
      layoutId: 'title',          // el diseño: title, titleContent, twoContent, section, titleOnly, blank…
      background: '#ffffff',
      notes: 'Las notas del orador',
      blocks: [                   // los objetos, del fondo al frente
        { id: 'b1', type: 'text', ph: 'title', html: 'Título', x: 90, y: 60, w: 1100, h: 120 },
        { id: 'b2', type: 'shape', shape: 'ellipse', fill: '#2f5a8f', x: 900, y: 300, w: 200, h: 200 },
        { id: 'b3', type: 'image', src: 'https://…', x: 100, y: 300, w: 400, h: 300 },
      ],
    },
  ],
}
```

- **`type`**: `text`, `shape`, `image`, `chart`, `table`, `code`, `math`, `model` (3D), `video`, `poll`…
- **`ph`**: si es un marcador del diseño (`title`, `subtitle`, `body`): así encuentras el título de cada diapositiva.
- **Texto**: `html`, `fontSize`, `color`, `fontFamily`, `textAlign`, `fontWeight`.
- **Formas**: `shape`, `fill`, `stroke`, `opacity` (0–100), `rotation`.
- **Tus propias marcas**: puedes añadir propiedades tuyas a un objeto (por ejemplo `{ numerar: true }`) para reconocerlo después; se guardan con la presentación.

## Escuchar los cambios sin frenar el editor

`Revela.on('change', fn)` avisa de **cada** cambio, también de cada tecla que se
escribe. Si tu complemento hace algo costoso (recorrer toda la presentación, pedir
algo a internet), espera a que se deje de escribir, como hace `revisor.js`:

```js
let timer = 0;
Revela.on('change', () => { clearTimeout(timer); timer = setTimeout(revisar, 500); });
```

Y no cambies la presentación dentro de ese aviso sin comprobar antes que hace
falta: cada cambio vuelve a avisar, y sin esa comprobación no pararía nunca.

Un complemento quitado en **Ver ▸ Complementos** deja de cargarse la próxima vez
que abras Revela; hasta entonces, lo que ya puso en marcha sigue funcionando.

## Macros

Una macro es el cuerpo de una función con `Revela` a mano. Puede usar `await` y
devolver un valor, que se muestra al ejecutarla. Algunas ideas:

```js
// Todos los títulos en azul
for (const s of Revela.deck().slides)
  for (const b of s.blocks) if (b.ph === 'title') Revela.update(b.id, { color: '#2f5a8f' });
```

```js
// La lista de títulos, para copiarla
return Revela.deck().slides.map((s, i) => (i + 1) + '. ' + (s.blocks.find(b => b.ph === 'title')?.html || '').replace(/<[^>]+>/g, '')).join('\n');
```

```js
// Una diapositiva de cierre
Revela.slides.goTo(Revela.slides.count() - 1);
Revela.slides.add();
Revela.add.text('<b>¡Gracias!</b>', { x: 90, y: 280, w: 1100, h: 160, fontSize: 96, textAlign: 'center' });
```

## Probar y publicar un complemento

Revela carga el complemento con `import()` desde su dirección, así que el servidor
debe enviarlo como JavaScript y permitir que otra web lo cargue (CORS).

- **Mientras lo programas**: sírvelo desde tu ordenador con un servidor que permita
  CORS, por ejemplo `npx http-server --cors -p 8080`, y añade
  `http://localhost:8080/mi-complemento.js` en **Ver ▸ Complementos**. Cada vez que
  lo cambies, quítalo y vuelve a añadirlo (o recarga la página).
- **Para compartirlo**: súbelo a un repositorio público de GitHub y usa la dirección de
  jsDelivr, que sirve los archivos con CORS:
  `https://cdn.jsdelivr.net/gh/USUARIO/REPOSITORIO@main/mi-complemento.js`.
  Para que no cambie sin avisar, mejor una versión fija (`@v1.0.0`) que `@main`.
  También vale GitHub Pages o cualquier servidor con CORS.
- La dirección de «raw.githubusercontent.com» **no** sirve: la entrega como texto, no como JavaScript.

## Seguridad

Un complemento se ejecuta **dentro de Revela con los mismos permisos que tú**: puede
leer y cambiar la presentación abierta y hacer peticiones a internet. Por eso:

- Añade solo complementos de fuentes en las que confíes, y mejor con una versión fija.
- Revela no comparte tus complementos ni tus macros: se guardan en tu navegador.
- Un complemento no puede usar tu cuenta de Revela para nada que tú no pudieras hacer:
  los permisos, los créditos y los planes los comprueba siempre el servidor.

## Referencia

El código de la API está en [`src/api/index.js`](../src/api/index.js), y su prueba,
en `tests/suites/services.js`.
