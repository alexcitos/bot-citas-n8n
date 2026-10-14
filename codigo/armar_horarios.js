// Calcula los turnos libres del día elegido a partir de la respuesta
// "freeBusy" de Google Calendar y del horario de atención.
const m = $('Motor').first().json;
const cfg = m.cfg;
const r = $input.first().json;
const sd = $getWorkflowStaticData('global');
sd.sesiones = sd.sesiones || {};
const s = sd.sesiones[m.clave] || { paso: 'menu' };
const OFF_MS = -5 * 60 * 60000;
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiqueta = (f) => { const d = new Date(f + 'T12:00:00Z'); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; };
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];
const salir = (texto, botones) => [{ json: { ...m, mensaje: { texto, botones } } }];

const cal = r && r.calendars && r.calendars[cfg.calendar_id];
if (!cal || cal.errors) {
  return salir('😕 No pude consultar la agenda en este momento. Intenta de nuevo en unos minutos.', [filaMenu]);
}

const ocupado = (cal.busy || []).map((x) => [Date.parse(x.start), Date.parse(x.end)]);
const dur = m.servicio.min * 60000;
const fecha = m.fecha;
const bloques = cfg.horario[new Date(fecha + 'T12:00:00Z').getUTCDay()] || [];
const limite = Date.now() + cfg.anticipacion_min * 60000;
const libres = [];
for (const [a, z] of bloques) {
  let t = Date.parse(`${fecha}T${a}:00${cfg.offset}`);
  const fin = Date.parse(`${fecha}T${z}:00${cfg.offset}`);
  while (t + dur <= fin) {
    if (t >= limite && !ocupado.some(([ini, f]) => t < f && t + dur > ini)) libres.push(t);
    t += cfg.paso_min * 60000;
  }
}
const horas = libres.slice(0, 16).map((t) => new Date(t + OFF_MS).toISOString().slice(11, 16));

const otroDia = [{ t: '⬅️ Elegir otro día', d: `srv:${m.servicio.id}` }];
if (!horas.length) {
  return salir(`😕 No quedan turnos libres el ${etiqueta(fecha)} para ${m.servicio.nombre}.`, [otroDia, filaMenu]);
}

s.horas = horas;
s.paso = 'hora';
s.t = Date.now();
sd.sesiones[m.clave] = s;

const filas = [];
for (let i = 0; i < horas.length; i += 4) {
  filas.push(horas.slice(i, i + 4).map((h) => ({ t: h, d: `hora:${h}` })));
}
return salir(
  `🕒 Turnos libres el <b>${etiqueta(fecha)}</b> para ${m.servicio.nombre} (${m.servicio.min} min):`,
  [...filas, otroDia, filaMenu],
);
