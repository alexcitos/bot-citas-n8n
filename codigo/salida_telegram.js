// Convierte el mensaje común { texto, botones } al formato de Telegram.
// La respuesta se devuelve en la misma respuesta HTTP del webhook (método
// "sendMessage"), así el token del bot no tiene que estar en el workflow.
const actual = $input.first().json;
const d = actual.mensaje !== undefined ? actual : $('Motor').first().json;

if (!d.mensaje || d.canal !== 'telegram') {
  return [{ json: { respuesta: {} } }];
}
const respuesta = {
  method: 'sendMessage',
  chat_id: d.chat_id,
  text: d.mensaje.texto,
  parse_mode: 'HTML',
  disable_web_page_preview: true,
};
const teclado = (d.mensaje.botones || []).map((fila) => fila.map((x) => ({ text: x.t, callback_data: x.d })));
if (teclado.length) respuesta.reply_markup = { inline_keyboard: teclado };
return [{ json: { respuesta } }];
