// Mensaje después de intentar borrar el evento en Google Calendar.
// Google responde vacío (204) si salió bien; con error, n8n deja "error".
const m = $('Motor').first().json;
const r = $('Calendar: cancelar evento').first().json;
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];
const ok = !(r && r.error);
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const d = new Date(m.cita.fecha + 'T12:00:00Z');
const fecha = `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
return [{
  json: {
    ...m,
    mensaje: ok
      ? { texto: `🗑️ Cita cancelada: ${m.cita.servicio}, ${fecha} ${m.cita.hora}.\nEse horario quedó libre para otra persona.`, botones: [[{ t: '📅 Agendar otra cita', d: 'menu:agendar' }], filaMenu] }
      : { texto: '😕 No pude cancelar la cita en este momento. Intenta de nuevo en unos minutos.', botones: [[{ t: '🗓️ Mis citas', d: 'menu:mis' }], filaMenu] },
  },
}];
