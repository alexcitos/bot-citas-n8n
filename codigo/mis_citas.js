// Lista las próximas citas de esta persona (filtradas en Google Calendar
// por la propiedad privada "usuario") y ofrece cancelarlas.
const m = $('Motor').first().json;
const r = $input.first().json;
const sd = $getWorkflowStaticData('global');
sd.sesiones = sd.sesiones || {};
const s = sd.sesiones[m.clave] || { paso: 'menu' };
const OFF_MS = -5 * 60 * 60000;
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const salir = (texto, botones) => [{ json: { ...m, mensaje: { texto, botones } } }];

if (!r || r.error || !Array.isArray(r.items)) {
  return salir('😕 No pude consultar tus citas en este momento. Intenta de nuevo en unos minutos.', [filaMenu]);
}

const citas = r.items.filter((x) => x.start && x.start.dateTime).map((x) => {
  const ini = new Date(Date.parse(x.start.dateTime) + OFF_MS).toISOString();
  const fin = new Date(Date.parse(x.end.dateTime) + OFF_MS).toISOString();
  const [servicio, nombre] = String(x.summary || '').split(' · ');
  const p = (x.extendedProperties && x.extendedProperties.private) || {};
  return { id: x.id, id_cita: p.id_cita || '', servicio: servicio || 'Cita', nombre: nombre || '', fecha: ini.slice(0, 10), hora: ini.slice(11, 16), fin: fin.slice(11, 16) };
});

s.citas = citas;
s.paso = 'menu';
s.t = Date.now();
sd.sesiones[m.clave] = s;

if (!citas.length) {
  return salir('No tienes citas próximas. ¿Agendamos una?', [[{ t: '📅 Agendar cita', d: 'menu:agendar' }], filaMenu]);
}
const etiqueta = (f) => { const d = new Date(f + 'T12:00:00Z'); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; };
const lineas = citas.map((c) => `• ${esc(c.servicio)}: ${etiqueta(c.fecha)}, ${c.hora}`);
return salir(
  `🗓️ <b>Tus próximas citas</b>\n\n${lineas.join('\n')}`,
  [...citas.map((c) => [{ t: `❌ Cancelar ${etiqueta(c.fecha)} ${c.hora}`, d: `cancelar:${c.id}` }]), filaMenu],
);
