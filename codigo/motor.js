// 🧠 Motor de citas: decide qué responder según el paso en que va cada
// persona. No depende del canal. Devuelve una "accion":
//   responder | disponibilidad | crear | listar | cancelar | humano |
//   agendar (revisa el límite de citas) | reprogramar
// El estado de cada conversación se guarda en los datos estáticos del
// workflow (persisten entre ejecuciones de producción).
const e = $input.first().json;
const cfg = e.cfg;
const OFF_MS = -5 * 60 * 60000; // Bogotá: UTC-5 todo el año (sin horario de verano)
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const etiquetaFecha = (f) => {
  const d = new Date(f + 'T12:00:00Z');
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
};
const sumarMin = (hhmm, min) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const sd = $getWorkflowStaticData('global');
sd.sesiones = sd.sesiones || {};
const ahora = Date.now();
// Limpieza: sesiones sin actividad en 24 h.
for (const k of Object.keys(sd.sesiones)) {
  if (ahora - (sd.sesiones[k].t || 0) > 24 * 3600e3) delete sd.sesiones[k];
}

const base = { canal: e.canal, chat_id: e.chat_id, clave: e.clave, cfg };
if (e.ignorar || !e.chat_id) return [{ json: { ...base, accion: 'responder', mensaje: null } }];

let s = sd.sesiones[e.clave];
if (!s || ahora - (s.t || 0) > 2 * 3600e3) s = { paso: 'menu' }; // 2 h sin actividad: empieza de nuevo
s.t = ahora;
const guardar = () => { sd.sesiones[e.clave] = s; };
const salida = (accion, extra = {}) => { guardar(); return [{ json: { ...base, accion, ...extra } }]; };
const resp = (texto, botones = []) => salida('responder', { mensaje: { texto, botones } });
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];

const servicioPorId = (id) => cfg.servicios.find((x) => x.id === id);

// Días (desde hoy) que todavía tienen horario de atención para el servicio.
const diasDisponibles = (min) => {
  const lista = [];
  const limite = ahora + cfg.anticipacion_min * 60000;
  for (let i = 0; i <= cfg.dias_adelante; i++) {
    const f = new Date(ahora + OFF_MS + i * 86400e3).toISOString().slice(0, 10);
    const bloques = cfg.horario[new Date(f + 'T12:00:00Z').getUTCDay()] || [];
    if (!bloques.length) continue;
    const ultimoFin = Date.parse(`${f}T${bloques[bloques.length - 1][1]}:00${cfg.offset}`);
    if (ultimoFin - min * 60000 >= limite) lista.push(f);
  }
  return lista;
};

const menu = (prefijo = '') => {
  s = { paso: 'menu', t: ahora };
  return resp(
    `${prefijo}🦷 <b>${esc(cfg.negocio)}</b>\n\n¡Hola! Soy el asistente virtual. ¿Qué quieres hacer?\n\n<i>Este es un negocio ficticio para demostrar una automatización con n8n.</i>`,
    [
      [{ t: '📅 Agendar cita', d: 'menu:agendar' }],
      [{ t: '🗓️ Mis citas', d: 'menu:mis' }],
      [{ t: '📍 Horarios y ubicación', d: 'menu:info' }],
      [{ t: '👤 Hablar con una persona', d: 'menu:humano' }],
    ],
  );
};

const resumen = () => {
  s.paso = 'confirmar';
  const srv = servicioPorId(s.servicio);
  if (s.modo === 'reprogramar') {
    return resp(
      `🔄 <b>Revisa el cambio</b>\n\n• ${esc(srv.nombre)} · ${esc(s.nombre)}\n• Antes: ${etiquetaFecha(s.cita.fecha)}, ${s.cita.hora}\n• Ahora: <b>${etiquetaFecha(s.fecha)}, ${s.hora}</b>\n\n¿Confirmamos el cambio?`,
      [[{ t: '✅ Confirmar cambio', d: 'confirmar:si' }, { t: '❌ Dejarla como estaba', d: 'confirmar:no' }]],
    );
  }
  return resp(
    `📋 <b>Revisa tu cita</b>\n\n• Servicio: ${esc(srv.nombre)} (${srv.min} min)\n• Fecha: ${etiquetaFecha(s.fecha)}\n• Hora: ${s.hora}\n• A nombre de: ${esc(s.nombre)}\n\n¿La confirmamos?`,
    [[{ t: '✅ Confirmar', d: 'confirmar:si' }, { t: '❌ Cancelar', d: 'confirmar:no' }]],
  );
};

const txt = (e.texto || '').toLowerCase();
const b = e.boton || '';

// Volver al menú en cualquier momento.
if (b === 'menu:inicio' || ['/start', 'hola', 'menu', 'menú', 'inicio', 'buenas', 'buenos días', 'buenas tardes'].includes(txt)) {
  return menu();
}

if (b === 'menu:agendar') {
  // El nodo «Revisar límite» consulta las citas vigentes y muestra los servicios.
  s = { paso: 'servicio', t: ahora };
  return salida('agendar', { desde: new Date(ahora).toISOString() });
}

if (b.startsWith('reprog:')) {
  const id = b.slice(7);
  const cita = (s.citas || []).find((x) => x.id === id);
  if (!cita) return menu('No encontré esa cita. Revisa de nuevo en «Mis citas».\n\n');
  const srv = cfg.servicios.find((x) => x.nombre === cita.servicio);
  if (!srv) return menu('Esa cita no se puede reprogramar desde aquí.\n\n');
  s = { paso: 'dia', servicio: srv.id, modo: 'reprogramar', evento_id: id, cita, nombre: cita.nombre, citas: s.citas, t: ahora };
  const dias = diasDisponibles(srv.min);
  const filas = [];
  for (let i = 0; i < dias.length; i += 2) filas.push(dias.slice(i, i + 2).map((f) => ({ t: etiquetaFecha(f), d: `dia:${f}` })));
  return resp(`🔄 Reprogramar <b>${esc(srv.nombre)}</b> (hoy: ${etiquetaFecha(cita.fecha)}, ${cita.hora}).\n¿A qué día la movemos?`, [...filas, filaMenu]);
}

if (b.startsWith('srv:')) {
  const srv = servicioPorId(b.slice(4));
  if (!srv) return menu();
  const conservar = s.modo === 'reprogramar' && s.servicio === srv.id
    ? { modo: s.modo, evento_id: s.evento_id, cita: s.cita, nombre: s.nombre, citas: s.citas }
    : {};
  s = { paso: 'dia', servicio: srv.id, ...conservar, t: ahora };
  const dias = diasDisponibles(srv.min);
  if (!dias.length) return resp('No hay días disponibles en este momento. 😕', [filaMenu]);
  const filas = [];
  for (let i = 0; i < dias.length; i += 2) {
    filas.push(dias.slice(i, i + 2).map((f) => ({ t: etiquetaFecha(f), d: `dia:${f}` })));
  }
  return resp(`<b>${esc(srv.nombre)}</b> (${srv.min} min).\n¿Qué día prefieres?`, [...filas, filaMenu]);
}

if (b.startsWith('dia:')) {
  const f = b.slice(4);
  const srv = servicioPorId(s.servicio);
  if (!srv || !diasDisponibles(srv.min).includes(f)) return menu('Esa opción ya no está disponible.\n\n');
  s.fecha = f;
  s.paso = 'hora';
  return salida('disponibilidad', { fecha: f, servicio: srv });
}

if (b.startsWith('hora:')) {
  const h = b.slice(5);
  if (s.paso !== 'hora' || !(s.horas || []).includes(h)) return menu('Ese horario ya no está disponible.\n\n');
  s.hora = h;
  if (s.modo === 'reprogramar') return resumen();
  s.paso = 'nombre';
  const botones = e.nombre ? [[{ t: `Usar «${e.nombre.slice(0, 40)}»`, d: 'nombre:perfil' }], filaMenu] : [filaMenu];
  return resp('✍️ ¿A nombre de quién agendamos la cita?\nEscribe nombre y apellido.', botones);
}

if (b === 'nombre:perfil' && s.paso === 'nombre' && e.nombre) {
  s.nombre = e.nombre.slice(0, 60);
  return resumen();
}

if (s.paso === 'nombre' && e.texto) {
  const n = e.texto.replace(/\s+/g, ' ').trim();
  if (n.length < 3 || n.length > 60 || !/^[\p{L} .'-]+$/u.test(n)) {
    return resp('Por favor escribe solo nombre y apellido (entre 3 y 60 letras).', [filaMenu]);
  }
  s.nombre = n;
  return resumen();
}

if (b === 'confirmar:si' && s.paso === 'confirmar' && s.modo === 'reprogramar') {
  const srv = servicioPorId(s.servicio);
  const fin = sumarMin(s.hora, srv.min);
  const registro = new Date(ahora + OFF_MS).toISOString().slice(0, 16).replace('T', ' ');
  const antes = s.cita;
  const cita = { id_cita: antes.id_cita || '', servicio: srv.nombre, min: srv.min, fecha: s.fecha, hora: s.hora, fin, nombre: s.nombre };
  const evento_id = s.evento_id;
  s = { paso: 'menu', t: ahora };
  return salida('reprogramar', {
    evento_id,
    cita,
    antes,
    cambios: {
      start: { dateTime: `${cita.fecha}T${cita.hora}:00${cfg.offset}`, timeZone: cfg.zona },
      end: { dateTime: `${cita.fecha}T${fin}:00${cfg.offset}`, timeZone: cfg.zona },
      description: `Cita ${cita.id_cita} agendada por el bot DEMO (canal: ${e.canal}).\nReprogramada el ${registro}; antes: ${antes.fecha} ${antes.hora}.\nNegocio ficticio de demostración.`,
    },
    fila: [cita.id_cita, registro, e.canal, e.usuario_id, cita.nombre, srv.nombre, cita.fecha, cita.hora, fin, 'reprogramada', evento_id],
    aviso: `🦷 Cita reprogramada (DEMO)\n${srv.nombre} · ${cita.nombre}\nAntes: ${etiquetaFecha(antes.fecha)} ${antes.hora}\nAhora: ${etiquetaFecha(cita.fecha)} ${cita.hora}\nCanal: ${e.canal}`,
  });
}

if (b === 'confirmar:si' && s.paso === 'confirmar') {
  const srv = servicioPorId(s.servicio);
  const fin = sumarMin(s.hora, srv.min);
  const idCita = 'CS-' + ahora.toString(36).toUpperCase();
  const registro = new Date(ahora + OFF_MS).toISOString().slice(0, 16).replace('T', ' ');
  const cita = { id_cita: idCita, servicio: srv.nombre, min: srv.min, fecha: s.fecha, hora: s.hora, fin, nombre: s.nombre };
  s = { paso: 'menu', t: ahora };
  return salida('crear', {
    cita,
    evento: {
      summary: `${srv.nombre} · ${cita.nombre}`,
      description: `Cita ${idCita} agendada por el bot DEMO (canal: ${e.canal}).\nNegocio ficticio de demostración.`,
      start: { dateTime: `${cita.fecha}T${cita.hora}:00${cfg.offset}`, timeZone: cfg.zona },
      end: { dateTime: `${cita.fecha}T${fin}:00${cfg.offset}`, timeZone: cfg.zona },
      extendedProperties: { private: { usuario: e.clave, canal: e.canal, id_cita: idCita } },
    },
    fila: [idCita, registro, e.canal, e.usuario_id, cita.nombre, srv.nombre, cita.fecha, cita.hora, fin, 'agendada'],
    aviso: `🦷 Nueva cita (DEMO)\n${srv.nombre} · ${etiquetaFecha(cita.fecha)} ${cita.hora}\nA nombre de: ${cita.nombre}\nCanal: ${e.canal} · ${idCita}`,
  });
}

if (b === 'confirmar:no') return menu(s.modo === 'reprogramar' ? '👌 Listo, tu cita queda como estaba.\n\n' : '❌ Listo, no agendamos nada.\n\n');

if (b === 'menu:mis') {
  return salida('listar', { desde: new Date(ahora).toISOString() });
}

// Cancelar pide confirmación: evita cancelaciones por un toque accidental
// (también en botones de mensajes viejos que siguen visibles en el chat).
if (b.startsWith('cancelar:')) {
  const id = b.slice(9);
  const cita = (s.citas || []).find((x) => x.id === id);
  if (!cita) return menu('No encontré esa cita. Revisa de nuevo en «Mis citas».\n\n');
  s.paso = 'confirmar_cancelacion';
  s.cancelar_id = id;
  return resp(
    `⚠️ ¿Seguro que quieres cancelar esta cita?\n\n• ${esc(cita.servicio)} · ${esc(cita.nombre || 'sin nombre')}\n• ${etiquetaFecha(cita.fecha)}, ${cita.hora}`,
    [[{ t: '✅ Sí, cancelarla', d: 'cancelar_si' }, { t: '↩️ No, mantenerla', d: 'menu:mis' }]],
  );
}

if (b === 'cancelar_si') {
  const id = s.paso === 'confirmar_cancelacion' ? s.cancelar_id : null;
  const cita = id && (s.citas || []).find((x) => x.id === id);
  if (!cita) return menu('No hay ninguna cancelación pendiente. Revisa en «Mis citas».\n\n');
  s.paso = 'menu';
  delete s.cancelar_id;
  s.citas = s.citas.filter((x) => x.id !== id);
  const registro = new Date(ahora + OFF_MS).toISOString().slice(0, 16).replace('T', ' ');
  return salida('cancelar', {
    evento_id: id,
    cita,
    fila: [cita.id_cita || '', registro, e.canal, e.usuario_id, cita.nombre || '', cita.servicio, cita.fecha, cita.hora, cita.fin || '', 'cancelada', id],
    aviso: `🦷 Cita cancelada (DEMO)\n${cita.servicio} · ${etiquetaFecha(cita.fecha)} ${cita.hora}\nCanal: ${e.canal}`,
  });
}

if (b === 'menu:info') {
  const nombresDia = (d) => ({ 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo' })[d];
  const lineas = Object.keys(cfg.horario).map((d) => `• ${nombresDia(Number(d))}: ${cfg.horario[d].map((x) => x.join('–')).join(' y ')}`);
  return resp(`📍 <b>${esc(cfg.negocio)}</b>\n${esc(cfg.direccion)}\n\n🕒 <b>Horario</b>\n${lineas.join('\n')}`, [[{ t: '📅 Agendar cita', d: 'menu:agendar' }], filaMenu]);
}

if (b === 'menu:humano') {
  return salida('humano', {
    mensaje: { texto: '👤 Listo, avisé a una persona del equipo. Te escribirán por este chat en horario de atención.\n\n<i>(En esta demo, el aviso le llega al creador del bot.)</i>', botones: [filaMenu] },
    aviso: `👤 Alguien pide hablar con una persona (DEMO)\nNombre: ${e.nombre || 'sin nombre'}\nCanal: ${e.canal} · chat ${e.chat_id}`,
  });
}

// Cualquier otra cosa: si está a mitad de un proceso, pedir que use los botones.
if (s.paso !== 'menu') {
  return resp('Toca una de las opciones de arriba 👆 o vuelve al menú.', [filaMenu]);
}
return menu();
