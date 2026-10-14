// Mensaje después de intentar mover el evento en Google Calendar (PATCH).
const m = $('Motor').first().json;
const ev = $('Calendar: reprogramar evento').first().json;
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiqueta = (f) => { const d = new Date(f + 'T12:00:00Z'); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (!ev || !ev.id) {
  return [{ json: { ...m, mensaje: { texto: '😕 No pude mover la cita. Sigue en su horario original; intenta de nuevo en unos minutos.', botones: [[{ t: '🗓️ Mis citas', d: 'menu:mis' }], filaMenu] } } }];
}
return [{
  json: {
    ...m,
    mensaje: {
      texto: `✅ <b>¡Cita reprogramada!</b>\n\n• ${esc(m.cita.servicio)} · ${esc(m.cita.nombre)}\n• Nueva fecha: <b>${etiqueta(m.cita.fecha)}, ${m.cita.hora} – ${m.cita.fin}</b>\n• Antes: ${etiqueta(m.antes.fecha)}, ${m.antes.hora}`,
      botones: [[{ t: '🗓️ Mis citas', d: 'menu:mis' }], filaMenu],
    },
  },
}];
