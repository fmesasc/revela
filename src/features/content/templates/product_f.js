// Example presentations: Tecnología doméstica (tanda F): wifi, factura de la luz y cuidado de electrodomésticos.
// Each one: { name, summary, cat: 'product', make() } → a deck. Written as data with tplb/deckb.js. Los precios, las potencias y los
// consumos son de ejemplo (las notas lo dicen): mira siempre las etiquetas y la factura de tu hogar.
import { tpl } from '../tplb/deckb.js';

const TH = {
  cobalto: { palette: 'cobalto', fonts: 'tech', bg: '#eff5ff', ink: '#12284a', panel: '#ffffff', muted: '#4b6490', acc: ['#2f6fd0', '#f08b2a', '#2fa07a'], decor: 'band' },
  mostaza: { palette: 'mostaza', fonts: 'bold', bg: '#fff9ea', ink: '#33290c', panel: '#ffffff', muted: '#7a6a2f', acc: ['#d9961a', '#c2493d', '#2f7aa8'], decor: 'glow' },
  salvia: { palette: 'salvia', fonts: 'rounded', bg: '#f1f6ef', ink: '#26352a', panel: '#ffffff', muted: '#56705c', acc: ['#4f9d77', '#d98d4a', '#6a86c9'], decor: 'band' },
};
const T = (th, o) => tpl({ cat: 'product', ...TH[th], ...o });

export default {

  product_f_wifi: T('cobalto', { name: 'Wifi en casa que funciona', summary: 'Cómo mejorar la conexión en casa: dónde poner el router, banda de 2,4 y 5 GHz, repetidores y cable, un gráfico de ejemplo de la velocidad según la distancia, trucos de seguridad y qué hacer si va lento',
    cover: { variant: 'right', label: 'TECNOLOGÍA · HOGAR', title: 'Que el wifi<br>llegue a todas<br>partes', size: 58, sub: 'Cinco trucos sencillos para una conexión mejor sin gastar de más.', art: 'chip', alt: 'Un chip' },
    slides: [
      { k: 'steps', t: 'Dónde poner el router', layout: 'steps', items: ['En el centro de la casa', 'Alto, no escondido en un mueble', 'Lejos de microondas y teléfonos', 'Sin metal ni espejos cerca', 'Con antenas en vertical'], h: 320, n: 'La posición importa más que casi cualquier ajuste. Si lo cambias de sitio, prueba la velocidad antes y después.' },
      { k: 'compare', t: '2,4 y 5 GHz', a: ['2,4 GHz', 'Llega más lejos', 'Atraviesa mejor las paredes', 'Más lenta y con más interferencias'], b: ['5 GHz', 'Más rápida', 'Menos interferencias', 'Alcance más corto'], n: 'Usa 5 GHz cerca del router y 2,4 GHz para los rincones lejanos y dispositivos sencillos.' },
      { k: 'chart', t: 'Velocidad según la distancia', type: 'line', y: 'megabits por segundo (datos de ejemplo)', name: 'Mbps', labels: true, data: [['1 m', 480], ['5 m', 350], ['10 m', 210], ['15 m', 120], ['20 m', 50]], side: [['Lección', 'Cada pared y cada metro restan velocidad.']], n: 'Cifras inventadas para ilustrar el efecto de la distancia.' },
      { k: 'cards', t: 'Cuando no llega', items: [['Cable', 'La opción más estable.'], ['Repetidor o malla', 'Amplía la cobertura.'], ['Powerline', 'Usa la red eléctrica de casa.']], n: 'Una red en malla suele funcionar mejor que un repetidor sencillo.' },
      { k: 'steps', t: 'Si va lento', layout: 'process', items: ['Reinicia el router', 'Haz un test de velocidad', 'Prueba con cable', 'Cambia de canal o banda', 'Llama a tu operadora con los datos'], h: 300, n: 'Anota la velocidad contratada y la medida por cable: te la pedirán.' },
      { k: 'icons', t: 'Seguridad básica', items: [['lock', 'Contraseña larga', 'Distinta de la de fábrica.'], ['key', 'Cifrado', 'WPA2 o WPA3.'], ['setting', 'Actualizaciones', 'Del router y de los dispositivos.'], ['tick', 'Red de invitados', 'Para visitas y cámaras.']], n: 'Cambia siempre el nombre y la contraseña por defecto.' },
      { k: 'quiz', q: 'El wifi llega mal a un dormitorio al fondo. ¿Qué prueba primero?', o: ['Comprar otro contrato', 'Mover el router a un punto más central', 'Apagar el móvil', 'Cambiar el color del router'], a: 1, n: 'Mover el router suele ser lo más barato y lo más eficaz.' },
    ], close: { title: 'Tu mapa de cobertura', body: 'Haz un plano rápido de tu casa y marca con un número cuánta señal hay en cada habitación.', seconds: 300, end: '¡Conectados!' } }),

  product_f_luz: T('mostaza', { name: 'Entender la factura de la luz', summary: 'Qué paga cada hogar al mes: potencia y energía, horas punta y valle, impuestos, un gráfico de ejemplo del reparto de la factura, qué consume más en casa, trucos para ahorrar y cómo comparar ofertas',
    cover: { variant: 'left', label: 'TECNOLOGÍA · ENERGÍA', title: 'La luz,<br>sin misterios', size: 76, sub: 'Cómo leer la factura y dónde se puede ahorrar (cifras de ejemplo).', art: 'bulb', alt: 'Una bombilla' },
    slides: [
      { k: 'cards', t: 'Qué se paga', items: [['Potencia', 'Lo que contratas, se use o no.'], ['Energía', 'Lo que consumes en kWh.'], ['Impuestos y otros', 'Impuesto de la electricidad y alquiler del contador.']], n: 'Los nombres y reparto pueden cambiar según el país o la compañía.' },
      { k: 'chart', t: 'Reparto de una factura', type: 'doughnut', name: '%', labels: true, y: 'factura de ejemplo de 60 €', data: [['Energía consumida', 45], ['Potencia contratada', 25], ['Impuestos', 20], ['Alquiler del contador y otros', 10]], side: [['Qué se puede cambiar', 'Energía y potencia, ajustándolas a tu uso.']], n: 'Reparto inventado para explicar la idea.' },
      { k: 'time', t: 'Horas punta, llano y valle', items: [['0 a 8', 'Valle: la más barata'], ['8 a 10', 'Llano'], ['10 a 14', 'Punta: la más cara'], ['14 a 18', 'Llano'], ['18 a 22', 'Punta'], ['22 a 24', 'Llano']], cap: 'Tramos de ejemplo: consulta los de tu contrato.', n: 'Con una tarifa por tramos conviene poner lavadora y lavavajillas en valle.' },
      { k: 'chart', t: 'Qué consume más', type: 'hbar', y: 'consumo anual en kWh (datos de ejemplo)', name: 'kWh', labels: true, data: [['Calefacción eléctrica', 1200], ['Nevera', 450], ['Lavadora y secadora', 350], ['Iluminación', 250], ['Televisión y ordenador', 200]], side: [['Lo que no se apaga', 'La nevera funciona todo el día: elige una eficiente.']], n: 'Cifras de ejemplo; tu casa será diferente.' },
      { k: 'steps', t: 'Pequeños ahorros', layout: 'process', items: ['Bombillas LED', 'Regletas con interruptor', 'Lavadora con carga completa', 'Programar en las horas valle', 'Bajar un grado la calefacción'], h: 300, n: 'Estos cinco cambios no cuestan casi nada y se notan en la factura.' },
      { k: 'compare', t: 'Comparar ofertas', a: ['Mira', 'Precio por kWh y por kW', 'Condiciones de permanencia', 'Qué incluye el servicio'], b: ['Desconfía de', 'Descuentos solo el primer mes', 'Servicios añadidos que no pediste', 'Contratos que no puedes dejar'], n: 'Usa un comparador oficial de tu país si existe.' },
      { k: 'vote', q: '¿Dónde crees que ahorrarías más?', o: ['En iluminación', 'En lavadora y lavavajillas', 'En climatización', 'En aparatos en espera'], n: 'Revisa tu factura y comprueba tu respuesta.' },
    ], close: { title: 'Tu factura', body: 'Busca en tu factura la potencia contratada y el consumo del último mes. Anótalos y compáralos con el mes anterior.', seconds: 300, end: '¡A ahorrar!' } }),

  product_f_electrodomesticos: T('salvia', { name: 'Que tus electrodomésticos duren', summary: 'Alargar la vida de lo que tienes: limpiar a tiempo, usarlos bien, el calendario de mantenimiento, un gráfico de ejemplo de los años que duran, señales de avería, reparar frente a sustituir y el derecho a la garantía',
    cover: { variant: 'right', label: 'TECNOLOGÍA · HOGAR', title: 'Hechos para<br>durar', size: 78, sub: 'Mantenimiento sencillo para lavadora, nevera, lavavajillas y horno.', art: 'magnet', alt: 'Un imán' },
    slides: [
      { k: 'time', t: 'El calendario de mantenimiento', items: [['Cada semana', 'Limpia la goma y el cajetín de la lavadora'], ['Cada mes', 'Limpia los filtros del lavavajillas'], ['Cada 6 meses', 'Limpia el serpentín de la nevera'], ['Cada año', 'Desincrusta cal en lavadora y cafetera']], cap: 'Calendario de ejemplo.', n: 'Consulta el manual de tu modelo: las pautas varían.' },
      { k: 'chart', t: 'Cuántos años duran', type: 'hbar', y: 'años de vida típicos (datos de ejemplo)', name: 'años', labels: true, data: [['Nevera', 14], ['Horno', 15], ['Lavadora', 10], ['Lavavajillas', 10], ['Secadora', 9], ['Microondas', 8]], side: [['Con mantenimiento', 'Cuidados sencillos pueden sumar años.']], n: 'Cifras de ejemplo: la durabilidad real depende de la marca y el uso.' },
      { k: 'cards', t: 'Usarlos bien', items: [['No sobrecargar', 'Respeta la carga máxima.'], ['Detergente justo', 'El exceso daña y ensucia.'], ['Ventilar', 'Deja espacio detrás de la nevera.']], n: 'Pequeños hábitos que previenen averías.' },
      { k: 'steps', t: 'Señales de avería', layout: 'steps', items: ['Ruidos nuevos o vibraciones', 'Olores a quemado', 'Fugas o humedad', 'Resultados peores de lo normal', 'Saltos del automático'], h: 320, n: 'Actúa pronto: una avería pequeña suele ser barata.' },
      { k: 'compare', t: 'Reparar o sustituir', a: ['Conviene reparar', 'Menos de la mitad del precio nuevo', 'Aparato de menos de 8 años', 'Pieza disponible'], b: ['Conviene sustituir', 'Reparación cara y aparato antiguo', 'Pieza no disponible', 'Mucho más consumo que uno nuevo'], n: 'Una regla práctica: si la reparación supera la mitad de uno nuevo, valora sustituir.' },
      { k: 'big', t: 'Garantía', items: [['3 años', 'de garantía legal en productos nuevos en la UE (consulta tu país)'], ['2 años', 'de garantía mínima en productos de segunda mano'], ['Factura', 'guárdala siempre']], cap: 'Resumen general: consulta la normativa de tu país.', n: 'Los plazos pueden variar según el país y el tipo de producto. Conserva siempre el justificante de compra.' },
      { k: 'quiz', q: 'La lavadora vibra mucho al centrifugar. ¿Qué revisas primero?', o: ['Que esté nivelada y bien cargada', 'Que no tenga detergente', 'La televisión', 'El color del cable'], a: 0, n: 'Nivelar los pies y repartir la ropa suele resolverlo.' },
    ], close: { title: 'Tu tarea de hoy', body: 'Apunta la fecha de compra de tus tres electrodomésticos más caros y cuándo toca limpiar cada uno.', seconds: 300, end: '¡Hechos para durar!' } }),

};
