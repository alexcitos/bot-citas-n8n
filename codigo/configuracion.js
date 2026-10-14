// ⚙️ Configuración del negocio de la demo. Es el ÚNICO nodo que hay que
// editar para adaptar el bot a otro negocio (servicios, horario, IDs).
return [{
  json: {
    negocio: 'Clínica Dental Sonrisa · DEMO',
    direccion: 'Calle Ficticia 123, Bogotá (dirección de demostración)',
    calendar_id: 'PEGAR_ID_DEL_CALENDARIO@group.calendar.google.com',
    sheet_id: 'PEGAR_ID_DE_LA_HOJA',
    hoja: 'Citas',
    alex_chat_id: 'PEGAR_TU_CHAT_ID_DE_TELEGRAM',
    zona: 'America/Bogota',
    offset: '-05:00',
    // Duración en minutos de cada servicio.
    servicios: [
      { id: 'valoracion', nombre: 'Valoración', min: 30 },
      { id: 'limpieza', nombre: 'Limpieza dental', min: 45 },
      { id: 'blanqueamiento', nombre: 'Blanqueamiento', min: 60 },
      { id: 'ortodoncia', nombre: 'Control de ortodoncia', min: 30 },
    ],
    // Horario por día de la semana (0 = domingo … 6 = sábado).
    horario: {
      1: [['08:00', '12:00'], ['14:00', '18:00']],
      2: [['08:00', '12:00'], ['14:00', '18:00']],
      3: [['08:00', '12:00'], ['14:00', '18:00']],
      4: [['08:00', '12:00'], ['14:00', '18:00']],
      5: [['08:00', '12:00'], ['14:00', '18:00']],
      6: [['08:00', '12:00']],
    },
    paso_min: 30,          // cada cuánto se ofrece un turno
    dias_adelante: 7,      // hasta cuántos días se puede agendar
    anticipacion_min: 60,  // mínimo de minutos entre "ahora" y la cita
  },
}];
