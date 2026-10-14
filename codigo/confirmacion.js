// Mensaje final después de intentar crear el evento en Google Calendar.
const m = $('Motor').first().json;
const ev = $('Calendar: crear evento').first().json;
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const d = new Date(m.cita.fecha + 'T12:00:00Z');
const fecha = `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (!ev || !ev.id) {
  return [{ json: { ...m, mensaje: { texto: '😕 No pude guardar la cita en la agenda. Intenta de nuevo en unos minutos.', botones: [filaMenu] } } }];
}
return [{
  json: {
    ...m,
    mensaje: {
      texto: `✅ <b>¡Cita agendada!</b>\n\n• ${esc(m.cita.servicio)}\n• ${fecha}, ${m.cita.hora} – ${m.cita.fin}\n• A nombre de: ${esc(m.cita.nombre)}\n• Código: <code>${m.cita.id_cita}</code>\n\nPuedes verla o cancelarla en «Mis citas».`,
      botones: [[{ t: '🗓️ Mis citas', d: 'menu:mis' }], filaMenu],
    },
  },
}];
