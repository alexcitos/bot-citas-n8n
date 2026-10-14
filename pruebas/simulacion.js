// Simulación local de la conversación completa, sin n8n ni Google:
// ejecuta el código de los nodos con datos falsos y muestra cada respuesta.
// Uso: node pruebas/simulacion.js
const fs = require('fs');
const path = require('path');
const DIR = fs.existsSync(path.join(__dirname, 'js')) ? path.join(__dirname, 'js') : path.join(__dirname, '..', 'codigo');
const SD = {};
const nodos = {};
function run(file, input) {
  const code = fs.readFileSync(path.join(DIR, file), 'utf8');
  const f = new Function('$input', '$', '$getWorkflowStaticData', code);
  return f({ first: () => ({ json: input }) }, (n) => ({ first: () => ({ json: nodos[n] }) }), () => SD)[0].json;
}
const cfg = run('configuracion.js', {}); cfg.calendar_id = 'CAL'; nodos.Configuracion = cfg;
function update(u) { nodos['Telegram (entrada)'] = { body: u }; const m = run('motor.js', run('normalizar_telegram.js')); nodos.Motor = m; return m; }
const msg = (t) => ({ message: { chat: { id: 5 }, from: { id: 5, first_name: 'Ana', last_name: 'Prueba' }, text: t } });
const btn = (d) => ({ callback_query: { id: 'q1', from: { id: 5, first_name: 'Ana' }, message: { chat: { id: 5 } }, data: d } });
const ver = (titulo, m) => {
  const s = run('salida_telegram.js', m);
  console.log(`\n▶ ${titulo}  [acción: ${m.accion}]`);
  console.log('  ' + (s.respuesta.text || '(sin respuesta)').replace(/\n/g, '\n  '));
  if (s.respuesta.reply_markup) console.log('  botones:', s.respuesta.reply_markup.inline_keyboard.map((f) => f.map((x) => x.text).join(' | ')).join(' / '));
  return s;
};
const ev = (id, fecha, hora, fin, resumen) => ({ id, summary: resumen, start: { dateTime: `${fecha}T${hora}:00-05:00` }, end: { dateTime: `${fecha}T${fin}:00-05:00` }, extendedProperties: { private: { id_cita: 'CS-' + id } } });
const manana = new Date(Date.now() - 5 * 3600e3 + 2 * 86400e3).toISOString().slice(0, 10);

ver('hola', update(msg('hola')));
let m = update(btn('menu:agendar'));
ver('Agendar (con 1 cita vigente)', run('revisar_limite.js', { items: [ev('a', manana, '09:00', '09:30', 'Valoración · Ana')] }));
m = update(btn('srv:limpieza')); const s = ver('Servicio', m);
const dia = s.respuesta.reply_markup.inline_keyboard[1][0].callback_data;
m = update(btn(dia));
ver('Horarios libres', run('armar_horarios.js', { calendars: { CAL: { busy: [{ start: `${m.fecha}T14:00:00Z`, end: `${m.fecha}T15:00:00Z` }] } } }));
update(btn('hora:' + SD.sesiones['telegram:5'].horas[1]));
m = update(msg('Pepito Pérez')); ver('Nombre', m);
m = update(btn('confirmar:si')); console.log('\n  evento:', JSON.stringify(m.evento.start), '| fila:', m.fila.join(' ; '));
nodos['Calendar: crear evento'] = { id: 'ev1' }; ver('Confirmación', run('confirmacion.js', m));

update(btn('menu:mis'));
ver('Mis citas', run('mis_citas.js', { items: [ev('ev1', manana, '10:00', '10:45', 'Limpieza dental · Pepito Pérez'), ev('ev2', manana, '15:00', '15:30', 'Valoración · Fulanito')] }));
m = update(btn('reprog:ev2')); const r = ver('Reprogramar la cita 2', m);
m = update(btn(r.respuesta.reply_markup.inline_keyboard[0][1].callback_data));
ver('Horarios para reprogramar', run('armar_horarios.js', { calendars: { CAL: { busy: [] } } }));
m = update(btn('hora:11:00')); ver('Resumen del cambio (sin pedir nombre)', m);
m = update(btn('confirmar:si')); console.log('\n  PATCH:', JSON.stringify(m.cambios.start), '| fila:', m.fila.join(' ; '));
nodos['Calendar: reprogramar evento'] = { id: 'ev2' }; ver('Reprogramación', run('reprogramacion.js', m));

update(btn('menu:mis'));
run('mis_citas.js', { items: [ev('ev1', manana, '10:00', '10:45', 'Limpieza dental · Pepito Pérez')] });
ver('Tocar «Cancelar 1» (pide confirmación)', update(btn('cancelar:ev1')));
m = update(btn('cancelar_si')); nodos['Calendar: cancelar evento'] = {}; ver('Confirmar la cancelación', run('cancelacion.js', m));
ver('Tocar «Sí, cancelarla» otra vez (botón viejo)', update(btn('cancelar_si')));
m = update(btn('cancelar:ev2')); ver('Intentar cancelar una cita que no está en la lista', m);

update(btn('menu:agendar'));
ver('Límite de 3 citas', run('revisar_limite.js', { items: [ev('x', manana, '08:00', '08:30', 'a · b'), ev('y', manana, '09:00', '09:30', 'a · b'), ev('z', manana, '10:00', '10:30', 'a · b')] }));
