// Traduce la actualización de Telegram a un formato común, igual para
// cualquier canal: { canal, chat_id, usuario_id, nombre, texto, boton }.
// El motor de citas solo conoce este formato, nunca el de Telegram.
const u = $('Telegram (entrada)').first().json.body || {};
const cfg = $('Configuracion').first().json;
const e = { canal: 'telegram', ignorar: false, texto: '', boton: '', callback_id: '' };

if (u.callback_query) {
  const q = u.callback_query;
  e.chat_id = String((q.message && q.message.chat && q.message.chat.id) || q.from.id);
  e.usuario_id = String(q.from.id);
  e.nombre = [q.from.first_name, q.from.last_name].filter(Boolean).join(' ');
  e.boton = String(q.data || '');
  e.callback_id = String(q.id);
} else if (u.message && typeof u.message.text === 'string') {
  const m = u.message;
  e.chat_id = String(m.chat.id);
  e.usuario_id = String(m.from ? m.from.id : m.chat.id);
  e.nombre = m.from ? [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') : '';
  e.texto = m.text.trim().slice(0, 200);
} else {
  // Fotos, stickers, ediciones, etc.: no se procesan.
  e.ignorar = true;
  e.chat_id = String((u.message && u.message.chat && u.message.chat.id) || '');
  e.usuario_id = e.chat_id;
}

e.clave = `${e.canal}:${e.usuario_id}`;
return [{ json: { ...e, cfg } }];
