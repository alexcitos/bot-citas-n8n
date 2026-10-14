// Antes de agendar: cuenta las citas futuras de esta cuenta. Si llegó al
// máximo (cfg.max_citas) pide cancelar o reprogramar una; si no, muestra
// los servicios. Si Google no responde, deja agendar igual (no bloquear).
const m = $('Motor').first().json;
const cfg = m.cfg;
const r = $input.first().json;
const filaMenu = [{ t: '🏠 Menú principal', d: 'menu:inicio' }];
const salir = (texto, botones) => [{ json: { ...m, mensaje: { texto, botones } } }];

const vigentes = r && Array.isArray(r.items) ? r.items.filter((x) => x.start && x.start.dateTime).length : 0;
if (vigentes >= cfg.max_citas) {
  return salir(
    `📌 Ya tienes ${vigentes} citas próximas, el máximo en esta demo.\nCancela o reprograma una para agendar otra.`,
    [[{ t: '🗓️ Mis citas', d: 'menu:mis' }], filaMenu],
  );
}
return salir('¿Qué servicio necesitas?', [
  ...cfg.servicios.map((x) => [{ t: `${x.nombre} · ${x.min} min`, d: `srv:${x.id}` }]),
  filaMenu,
]);
