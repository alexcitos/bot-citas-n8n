// Simulación local de la conversación completa, sin n8n ni Google:
// ejecuta el código de los nodos con datos falsos y muestra cada respuesta.
// Uso: node pruebas/simulacion.js

const fs=require('fs');
const SD={};
const nodes={};
function run(file,input){const code=fs.readFileSync(require('path').join(__dirname,'..','codigo',file),'utf8');
 const f=new Function('$input','$','$getWorkflowStaticData',code);
 const out=f({first:()=>({json:input})},(n)=>({first:()=>({json:nodes[n]})}),()=>SD);
 return out[0].json;}
const cfg=run('configuracion.js',{}); cfg.calendar_id='CAL';
nodes['Configuracion']=cfg;
function update(u){nodes['Telegram (entrada)']={body:u};const e=run('normalizar_telegram.js');const m=run('motor.js',e);nodes['Motor']=m;return m;}
const msg=t=>({message:{chat:{id:5},from:{id:5,first_name:'Juan',last_name:'Pérez'},text:t}});
const btn=d=>({callback_query:{id:'q1',from:{id:5,first_name:'Juan'},message:{chat:{id:5}},data:d}});
const show=(m)=>{const s=run('salida_telegram.js',m);console.log(m.accion,'|',(s.respuesta.text||'').replace(/\n/g,' / ').slice(0,140));if(s.respuesta.reply_markup)console.log('   botones:',s.respuesta.reply_markup.inline_keyboard.map(f=>f.map(x=>x.callback_data).join(',')).join(' | '));};
let m=update(msg('hola'));show(m);
m=update(btn('menu:agendar'));show(m);
m=update(btn('srv:limpieza'));show(m);
const dia=JSON.parse(JSON.stringify(run('salida_telegram.js',m))).respuesta.reply_markup.inline_keyboard[1][0].callback_data;
m=update(btn(dia));console.log(m.accion,m.fecha,m.servicio.id);
// simular freeBusy con 9:00-10:00 ocupado
const fb={calendars:{CAL:{busy:[{start:m.fecha+'T14:00:00Z',end:m.fecha+'T15:00:00Z'}]}}};
const h=run('armar_horarios.js',fb);show(h);
m=update(btn('hora:'+SD.sesiones['telegram:5'].horas[1]));show(m);
m=update(msg('<b>x</b>'));show(m);
m=update(msg('Ana María Gómez'));show(m);
m=update(btn('confirmar:si'));console.log(m.accion,JSON.stringify(m.evento.start),JSON.stringify(m.evento.end),m.fila.join(';'));console.log(m.aviso);
nodes['Calendar: crear evento']={id:'ev123'};show(run('confirmacion.js',m));
m=update(btn('menu:mis'));console.log(m.accion,m.desde);
const lst={items:[{id:'ev123',summary:'Limpieza dental · Ana María Gómez',start:{dateTime:'2026-10-14T13:30:00Z'},end:{dateTime:'2026-10-14T14:15:00Z'},extendedProperties:{private:{id_cita:'CS-X'}}}]};
show(run('mis_citas.js',lst));
m=update(btn('cancelar:ev123'));console.log(m.accion,m.evento_id,m.fila.join(';'));
nodes['Calendar: cancelar evento']={};show(run('cancelacion.js',m));
m=update(btn('cancelar:ev123'));show(m);
m=update(btn('menu:info'));show(m);
m=update(btn('menu:humano'));console.log(m.accion,m.aviso);show(m);
m=update({edited_message:{}});show(m);
m=update(msg('xyz'));show(m);
