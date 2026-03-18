/* ================================================================
   TURNOS APP — app.js
   Toda la lógica de negocio del sistema de reservas.
   Estructura:
     1. CONFIG            → datos del negocio, servicios, horarios
     2. STATE             → el "estado" actual de la app
     3. STORAGE           → guardar/leer en localStorage
     4. HELPERS           → funciones utilitarias
     5. RENDER            → funciones que dibujan en pantalla
     6. HANDLERS          → responden a clicks y cambios
     7. INIT              → arranca todo
================================================================ */


/* ================================================================
   1. CONFIGURACIÓN
   
   Acá editás todo para adaptar la app a cualquier negocio.
   Solo tocás este objeto para cambiar servicios, horarios, etc.
================================================================ */
const CONFIG = {

  // Datos del negocio (se muestran en el header)
  business: {
    name:     'Barber & Co.',
    tagline:  'Corte de autor, siempre a tiempo.',
    phone:    '5491112345678',  // Número para WhatsApp (sin + ni espacios)
  },

  // Lista de servicios que ofrece el negocio
  // Podés agregar o quitar servicios acá
  services: [
    { id: 'corte',       name: 'Corte clásico',   duration: 30, price: '$2.500',  icon: '✂️' },
    { id: 'barba',       name: 'Arreglo de barba', duration: 20, price: '$1.800',  icon: '🪒' },
    { id: 'combo',       name: 'Corte + Barba',    duration: 50, price: '$3.800',  icon: '⚡' },
    { id: 'coloracion',  name: 'Coloración',       duration: 90, price: '$6.000',  icon: '🎨' },
    { id: 'keratina',    name: 'Keratina',          duration: 120, price: '$9.000', icon: '✨' },
    { id: 'ninos',       name: 'Corte niños',       duration: 20, price: '$1.500',  icon: '👦' },
  ],

  // Configuración de horarios laborales
  schedule: {
    startHour:    9,    // Hora de apertura (9 = 09:00)
    endHour:      18,   // Hora de cierre  (18 = 18:00)
    slotMinutes:  30,   // Cada cuántos minutos hay un turno disponible
    // Días de la semana que trabajan (0=Dom, 1=Lun, 2=Mar, ... 6=Sáb)
    workDays: [1, 2, 3, 4, 5, 6],
  },

};


/* ================================================================
   2. ESTADO DE LA APLICACIÓN
   
   Este objeto guarda todo lo que el usuario eligió en cada momento.
   Cuando el usuario cambia algo, actualizamos este objeto y
   luego redibujamos la pantalla.
================================================================ */
let state = {
  selectedService: null,   // El objeto de servicio elegido
  selectedDate:    null,   // String 'YYYY-MM-DD'
  selectedSlot:    null,   // String 'HH:MM'
};


/* ================================================================
   3. STORAGE (localStorage)
   
   localStorage guarda datos en el navegador del usuario.
   Es como un pequeño "archivo" que persiste aunque cierres la pestaña.
   Clave usada: 'turnos_bookings'
================================================================ */

/**
 * Devuelve el array completo de turnos guardados.
 * Si no hay nada guardado, devuelve un array vacío.
 */
function getBookings() {
  const raw = localStorage.getItem('turnos_bookings');
  // JSON.parse convierte el texto guardado en un objeto JavaScript
  return raw ? JSON.parse(raw) : [];
}

/**
 * Guarda el array completo de turnos.
 * JSON.stringify convierte el objeto en texto para guardarlo.
 */
function saveBookings(bookings) {
  localStorage.setItem('turnos_bookings', JSON.stringify(bookings));
}

/**
 * Agrega un turno nuevo al array existente y lo guarda.
 */
function addBooking(booking) {
  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);
}

/**
 * Elimina un turno por su ID único.
 * filter() crea un nuevo array sin el elemento eliminado.
 */
function deleteBooking(id) {
  const bookings = getBookings().filter(b => b.id !== id);
  saveBookings(bookings);
}


/* ================================================================
   4. HELPERS (funciones de utilidad)
   
   Funciones pequeñas que hacen una sola cosa bien.
   Así evitamos repetir código.
================================================================ */

/**
 * Genera todos los horarios posibles de un día según la configuración.
 * Ejemplo: startHour=9, endHour=18, slotMinutes=30
 * → ['09:00', '09:30', '10:00', ..., '17:30']
 */
function generateTimeSlots() {
  const slots = [];
  const { startHour, endHour, slotMinutes } = CONFIG.schedule;

  // Convertimos horas a minutos para hacer las cuentas más fácil
  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += slotMinutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    // padStart(2, '0') agrega un cero adelante si el número es de 1 dígito
    // Ejemplo: '9' → '09'
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  return slots;
}

/**
 * Devuelve los horarios ya reservados para una fecha y servicio dados.
 * Usamos esto para marcar los turnos como "tomados" en la grilla.
 */
function getTakenSlots(date, serviceId) {
  return getBookings()
    .filter(b => b.date === date && b.serviceId === serviceId)
    .map(b => b.time);
}

/**
 * Verifica si un horario específico ya está reservado.
 * Devuelve true si está tomado, false si está libre.
 */
function isSlotTaken(date, serviceId, time) {
  return getBookings().some(
    b => b.date === date && b.serviceId === serviceId && b.time === time
  );
}

/**
 * Formatea una fecha 'YYYY-MM-DD' a texto legible.
 * Ejemplo: '2024-03-15' → 'viernes 15 de marzo de 2024'
 */
function formatDate(dateStr) {
  // Al agregar T00:00:00 evitamos problemas de zona horaria
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

/**
 * Genera un ID único para cada turno.
 * Combina la hora actual con un número aleatorio.
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Construye la URL de WhatsApp con el mensaje pre-cargado.
 * Cuando el usuario hace click, abre WhatsApp directo con el texto.
 */
function buildWhatsAppUrl(booking) {
  const fecha = formatDate(booking.date);
  const servicio = CONFIG.services.find(s => s.id === booking.serviceId)?.name || '';

  const message = [
    `✦ *Turno confirmado en ${CONFIG.business.name}*`,
    '',
    `👤 *Cliente:* ${booking.name}`,
    `📱 *Teléfono:* ${booking.phone}`,
    `✂️ *Servicio:* ${servicio}`,
    `📅 *Fecha:* ${fecha}`,
    `🕐 *Hora:* ${booking.time} hs`,
    booking.notes ? `📝 *Notas:* ${booking.notes}` : '',
  ]
    .filter(Boolean) // Elimina líneas vacías (ej: si no hay notas)
    .join('\n');

  // encodeURIComponent convierte el texto a formato válido para URL
  return `https://wa.me/${CONFIG.business.phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Devuelve la fecha de hoy en formato 'YYYY-MM-DD'.
 * Usamos esto como fecha mínima en el input de fecha.
 */
function getTodayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0'); // getMonth() empieza en 0
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Verifica si un día es laborable según la configuración.
 */
function isWorkDay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return CONFIG.schedule.workDays.includes(date.getDay());
}


/* ================================================================
   5. RENDER (funciones que dibujan en pantalla)
   
   Estas funciones modifican el HTML (el DOM).
   Siempre que cambie algo, llamamos a la función de render
   correspondiente para actualizar lo que ve el usuario.
================================================================ */

/**
 * Dibuja las tarjetas de servicios en la grilla.
 * Usamos template literals (backticks) para crear HTML dinámico.
 */
function renderServices() {
  const grid = document.getElementById('services-grid');

  // map() transforma cada servicio en una tarjeta HTML
  grid.innerHTML = CONFIG.services.map(service => `
    <div
      class="service-card ${state.selectedService?.id === service.id ? 'selected' : ''}"
      data-service-id="${service.id}"
      role="button"
      tabindex="0"
      aria-label="${service.name}, ${service.duration} minutos, ${service.price}"
    >
      <span class="service-icon">${service.icon}</span>
      <div class="service-name">${service.name}</div>
      <div class="service-duration">${service.duration} min</div>
      <div class="service-price">${service.price}</div>
    </div>
  `).join(''); // join('') une todos los strings del array en uno solo
}

/**
 * Dibuja la grilla de horarios disponibles para la fecha elegida.
 * Marca los tomados con la clase 'taken'.
 */
function renderSlots() {
  const grid    = document.getElementById('slots-grid');
  const hint    = document.getElementById('slots-hint');
  const date    = state.selectedDate;
  const service = state.selectedService;

  // Si no se eligió servicio o fecha, mostramos el mensaje de ayuda
  if (!service || !date) {
    hint.textContent = 'Seleccioná una fecha para ver los turnos disponibles.';
    grid.innerHTML = '';
    return;
  }

  // Si el día no es laborable
  if (!isWorkDay(date)) {
    hint.textContent = '⚠️ Este día no es laborable. Elegí otro.';
    grid.innerHTML = '';
    return;
  }

  hint.textContent = 'Turnos disponibles:';

  const allSlots   = generateTimeSlots();
  const takenSlots = getTakenSlots(date, service.id);

  grid.innerHTML = allSlots.map(time => {
    const isTaken    = takenSlots.includes(time);
    const isSelected = state.selectedSlot === time;
    return `
      <button
        class="slot-btn ${isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}"
        data-time="${time}"
        ${isTaken ? 'disabled' : ''}
        aria-label="${time}${isTaken ? ' - ocupado' : ''}"
      >
        ${time}
        ${isTaken ? '<br><small>ocupado</small>' : ''}
      </button>
    `;
  }).join('');
}

/**
 * Muestra el resumen de lo elegido antes del formulario.
 */
function renderSummary() {
  const service = state.selectedService;
  const date    = state.selectedDate;
  const slot    = state.selectedSlot;

  if (!service || !date || !slot) return;

  document.getElementById('selection-summary').innerHTML = `
    <strong>${service.icon} ${service.name}</strong> — ${service.price}<br>
    📅 ${formatDate(date)}<br>
    🕐 ${slot} hs — duración: ${service.duration} min
  `;
}

/**
 * Muestra el modal de confirmación con los datos del turno.
 */
function renderConfirmModal(booking) {
  const service = CONFIG.services.find(s => s.id === booking.serviceId);

  document.getElementById('modal-details').innerHTML = `
    <strong>Cliente:</strong> ${booking.name}<br>
    <strong>Teléfono:</strong> ${booking.phone}<br>
    ${booking.email ? `<strong>Email:</strong> ${booking.email}<br>` : ''}
    <strong>Servicio:</strong> ${service?.icon} ${service?.name}<br>
    <strong>Fecha:</strong> ${formatDate(booking.date)}<br>
    <strong>Hora:</strong> ${booking.time} hs
    ${booking.notes ? `<br><strong>Notas:</strong> ${booking.notes}` : ''}
  `;

  // Configuramos el botón de WhatsApp con el mensaje correcto
  document.getElementById('btn-whatsapp').href = buildWhatsAppUrl(booking);

  // Mostramos el modal
  document.getElementById('modal-confirm').classList.remove('hidden');
}

/**
 * Dibuja la lista de turnos en el panel de administración.
 * Acepta opcionalmente un filtro de fecha.
 */
function renderAdminList(filterDate = null) {
  let bookings = getBookings();

  // Ordenar de más reciente a más antiguo
  bookings.sort((a, b) => {
    // Comparar fecha+hora como string 'YYYY-MM-DDTHH:MM'
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return da > db ? 1 : -1;
  });

  // Aplicar filtro si se eligió una fecha
  if (filterDate) {
    bookings = bookings.filter(b => b.date === filterDate);
  }

  const list = document.getElementById('admin-list');
  const count = document.getElementById('admin-count');

  count.textContent = `${bookings.length} turno${bookings.length !== 1 ? 's' : ''} reservado${bookings.length !== 1 ? 's' : ''}`;

  if (bookings.length === 0) {
    list.innerHTML = `<p class="admin-empty">No hay turnos${filterDate ? ' para este día' : ''}.</p>`;
    return;
  }

  list.innerHTML = bookings.map(booking => {
    const service = CONFIG.services.find(s => s.id === booking.serviceId);
    return `
      <div class="booking-card">
        <div class="booking-card-header">
          <span class="booking-name">${booking.name}</span>
          <span class="booking-service-badge">${service?.icon} ${service?.name || booking.serviceId}</span>
          <button
            class="btn-delete-booking"
            data-booking-id="${booking.id}"
            title="Eliminar turno"
          >✕</button>
        </div>
        <div class="booking-datetime">
          📅 ${formatDate(booking.date)} — 🕐 ${booking.time} hs
        </div>
        <div class="booking-contact">
          📱 ${booking.phone}${booking.email ? ` · ${booking.email}` : ''}
        </div>
        ${booking.notes ? `<div class="booking-notes">💬 ${booking.notes}</div>` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Muestra u oculta una sección de paso con animación.
 * 'hidden' es la clase CSS que tiene 'display: none'.
 */
function showSection(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  // Forzamos la animación volviendo a agregar la clase
  el.style.animation = 'none';
  // requestAnimationFrame espera al siguiente frame del navegador
  // para que la animación se reinicie correctamente
  requestAnimationFrame(() => {
    el.style.animation = '';
  });
}

function hideSection(id) {
  document.getElementById(id).classList.add('hidden');
}


/* ================================================================
   6. HANDLERS (responden a eventos del usuario)
   
   Usamos delegación de eventos: en lugar de agregar un listener
   por cada tarjeta, escuchamos clicks en el contenedor padre.
   Así funciona aunque los elementos se generen dinámicamente.
================================================================ */

/**
 * Click en una tarjeta de servicio.
 */
function handleServiceClick(e) {
  // closest() busca el ancestro más cercano con la clase dada
  const card = e.target.closest('.service-card');
  if (!card) return;

  const serviceId = card.dataset.serviceId;
  // dataset.serviceId lee el atributo data-service-id del HTML
  state.selectedService = CONFIG.services.find(s => s.id === serviceId);

  // Actualizar visual de tarjetas
  renderServices();

  // Mostrar el siguiente paso si aún no está visible
  showSection('step-datetime');

  // Si ya había una fecha elegida, recalculamos los turnos disponibles
  if (state.selectedDate) {
    renderSlots();
  }

  // Scroll suave al siguiente paso
  document.getElementById('step-datetime').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Cambio en el input de fecha.
 */
function handleDateChange(e) {
  state.selectedDate  = e.target.value;
  state.selectedSlot  = null; // Resetear horario al cambiar fecha

  renderSlots();
}

/**
 * Click en un botón de horario.
 */
function handleSlotClick(e) {
  const btn = e.target.closest('.slot-btn');
  // Si no hay botón o está deshabilitado, salimos
  if (!btn || btn.disabled) return;

  state.selectedSlot = btn.dataset.time;

  // Actualizar visual de slots
  renderSlots();

  // Mostrar el paso del formulario
  showSection('step-form');
  renderSummary();

  document.getElementById('step-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Click en el botón "Confirmar turno".
 * Valida los datos, guarda el turno y muestra el modal.
 */
function handleConfirm() {
  const name  = document.getElementById('input-name').value.trim();
  const phone = document.getElementById('input-phone').value.trim();
  const email = document.getElementById('input-email').value.trim();
  const notes = document.getElementById('input-notes').value.trim();

  // ── Validaciones ──
  let hasError = false;

  if (name.length < 2) {
    document.getElementById('error-name').classList.remove('hidden');
    hasError = true;
  } else {
    document.getElementById('error-name').classList.add('hidden');
  }

  // Validación simple de teléfono: al menos 8 dígitos
  const phoneClean = phone.replace(/\D/g, ''); // Elimina todo lo que no sea dígito
  if (phoneClean.length < 8) {
    document.getElementById('error-phone').classList.remove('hidden');
    hasError = true;
  } else {
    document.getElementById('error-phone').classList.add('hidden');
  }

  if (hasError) return;

  // ── Doble reserva ──
  // Verificamos una última vez que el horario sigue libre
  // (podría haberse reservado desde otra pestaña/dispositivo)
  if (isSlotTaken(state.selectedDate, state.selectedService.id, state.selectedSlot)) {
    alert('⚠️ Este horario acaba de ser reservado. Por favor elegí otro.');
    renderSlots();
    return;
  }

  // ── Crear objeto de reserva ──
  const booking = {
    id:        generateId(),
    serviceId: state.selectedService.id,
    date:      state.selectedDate,
    time:      state.selectedSlot,
    name,
    phone,
    email,
    notes,
    createdAt: new Date().toISOString(), // Fecha de creación del turno
  };

  // Guardar en localStorage
  addBooking(booking);

  // Mostrar modal de confirmación
  renderConfirmModal(booking);
}

/**
 * Click en "Nueva reserva": resetea todo el estado y vuelve al inicio.
 */
function handleNewBooking() {
  // Cerrar modal
  document.getElementById('modal-confirm').classList.add('hidden');

  // Resetear estado
  state = { selectedService: null, selectedDate: null, selectedSlot: null };

  // Resetear formulario
  document.getElementById('input-name').value  = '';
  document.getElementById('input-phone').value = '';
  document.getElementById('input-email').value = '';
  document.getElementById('input-notes').value = '';

  // Resetear fecha
  document.getElementById('date-input').value = '';

  // Ocultar pasos 2 y 3
  hideSection('step-datetime');
  hideSection('step-form');

  // Redibujar paso 1
  renderServices();

  // Scroll al inicio
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Abre el panel de administración.
 */
function handleOpenAdmin() {
  document.getElementById('admin-panel').closest('.admin-overlay').classList.remove('hidden');
  renderAdminList();
}

/**
 * Cierra el panel de administración.
 */
function handleCloseAdmin() {
  document.getElementById('admin-panel').closest('.admin-overlay').classList.add('hidden');
}

/**
 * Click en eliminar turno individual dentro del admin.
 */
function handleDeleteBooking(e) {
  const btn = e.target.closest('.btn-delete-booking');
  if (!btn) return;

  if (!confirm('¿Eliminar este turno?')) return;

  deleteBooking(btn.dataset.bookingId);

  // Obtener el filtro actual para mantenerlo después de borrar
  const filterDate = document.getElementById('admin-filter-date').value || null;
  renderAdminList(filterDate);
}

/**
 * Filtrar turnos por fecha en el admin.
 */
function handleAdminFilter(e) {
  renderAdminList(e.target.value || null);
}

/**
 * Limpiar filtro de fecha en el admin.
 */
function handleClearFilter() {
  document.getElementById('admin-filter-date').value = '';
  renderAdminList(null);
}

/**
 * Borrar TODOS los turnos (con doble confirmación).
 */
function handleDeleteAll() {
  const count = getBookings().length;
  if (count === 0) {
    alert('No hay turnos para eliminar.');
    return;
  }

  // Doble confirmación para evitar borrados accidentales
  if (!confirm(`⚠️ ¿Estás seguro de que querés borrar los ${count} turnos? Esta acción no se puede deshacer.`)) return;
  if (!confirm('¿Confirmás que querés borrar TODOS los turnos?')) return;

  localStorage.removeItem('turnos_bookings');
  renderAdminList();
}


/* ================================================================
   7. INIT (inicialización)
   
   Esta función se ejecuta cuando la página carga.
   Conecta todos los handlers a sus elementos del HTML.
================================================================ */
function init() {

  // ── Configurar textos del negocio ──
  document.getElementById('business-name').textContent    = CONFIG.business.name;
  document.getElementById('business-tagline').textContent = CONFIG.business.tagline;
  document.title = CONFIG.business.name + ' — Turnos';

  // ── Configurar fecha mínima del input (hoy) ──
  const dateInput = document.getElementById('date-input');
  dateInput.min = getTodayString();

  // ── Renderizado inicial ──
  renderServices();

  // ── Event Listeners ──

  // Delegación en la grilla de servicios
  document.getElementById('services-grid').addEventListener('click', handleServiceClick);
  // Soporte para teclado (Enter/Space activan el botón)
  document.getElementById('services-grid').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') handleServiceClick(e);
  });

  // Input de fecha
  dateInput.addEventListener('change', handleDateChange);

  // Delegación en la grilla de horarios
  document.getElementById('slots-grid').addEventListener('click', handleSlotClick);

  // Botón confirmar turno
  document.getElementById('btn-confirm').addEventListener('click', handleConfirm);

  // Botón nueva reserva (dentro del modal)
  document.getElementById('btn-new-booking').addEventListener('click', handleNewBooking);

  // Panel de administración
  document.getElementById('btn-open-admin').addEventListener('click', handleOpenAdmin);
  document.getElementById('btn-close-admin').addEventListener('click', handleCloseAdmin);

  // Cerrar admin al clickear el overlay (fuera del panel)
  document.getElementById('admin-panel').closest('.admin-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) handleCloseAdmin();
  });

  // Filtros en el admin
  document.getElementById('admin-filter-date').addEventListener('change', handleAdminFilter);
  document.getElementById('btn-clear-filter').addEventListener('click', handleClearFilter);

  // Delegación para eliminar turnos individuales
  document.getElementById('admin-list').addEventListener('click', handleDeleteBooking);

  // Borrar todos los turnos
  document.getElementById('btn-delete-all').addEventListener('click', handleDeleteAll);

  console.log('✦ Turnos App iniciada correctamente');
}

// Esperamos a que el DOM esté completamente cargado antes de iniciar
// DOMContentLoaded se dispara cuando el HTML está parseado
document.addEventListener('DOMContentLoaded', init);