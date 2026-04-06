/* ================================================================
   db.js — CAPA DE DATOS (conectada al backend Node.js)
   
   Todas las funciones son async — hablan con el servidor
   en vez de localStorage. El resto del código no cambia.
================================================================ */

// URL del backend — en local usa localhost, en producción usa Render
const API = 'https://turnos-backend-d5aj.onrender.com/api';  // ← cambiás esto cuando subas a Render

/* ── Helper para llamadas fetch ──────────────────────────────── */
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || 'Error en el servidor');
  }
  return res.json();
}

/* ================================================================
   BUSINESSES
================================================================ */
async function getBusinesses() {
  return api('GET', '/businesses');
}

async function getBusinessById(id) {
  return api('GET', '/businesses/' + id);
}

/* ================================================================
   SERVICES
================================================================ */
async function getServices(businessId) {
  return api('GET', '/businesses/' + businessId + '/services');
}

async function addService(businessId, data) {
  return api('POST', '/businesses/' + businessId + '/services', data);
}

async function updateService(businessId, serviceId, updates) {
  return api('PATCH', '/services/' + serviceId, updates);
}

async function deleteService(businessId, serviceId) {
  return api('DELETE', '/services/' + serviceId);
}

/* ================================================================
   BOOKINGS
================================================================ */
async function getBookings(businessId, date) {
  const query = date ? '?date=' + date : '';
  return api('GET', '/businesses/' + businessId + '/bookings' + query);
}

async function addBooking(businessId, data) {
  return api('POST', '/businesses/' + businessId + '/bookings', {
    service_id: data.serviceId,
    date:       data.date,
    time:       data.time,
    name:       data.name,
    phone:      data.phone,
    email:      data.email,
    notes:      data.notes,
  });
}

async function deleteBooking(businessId, bookingId) {
  return api('DELETE', '/bookings/' + bookingId);
}

async function deleteAllBookings(businessId) {
  return api('DELETE', '/businesses/' + businessId + '/bookings');
}

async function isSlotTaken(businessId, date, serviceId, time) {
  const bookings = await getBookings(businessId, date);
  return bookings.some(b =>
    b.service_id == serviceId && b.time === time && b.status !== 'cancelled'
  );
}

/* ================================================================
   FECHAS BLOQUEADAS
================================================================ */
async function getBlockedDates(businessId) {
  return api('GET', '/businesses/' + businessId + '/blocked');
}

async function addBlockedDate(businessId, date, reason) {
  return api('POST', '/businesses/' + businessId + '/blocked', { date, reason });
}

async function removeBlockedDate(businessId, date) {
  return api('DELETE', '/businesses/' + businessId + '/blocked/' + date);
}

async function isDateBlocked(businessId, date) {
  const blocked = await getBlockedDates(businessId);
  return blocked.some(d => {
    const dbDate = d.date.includes('T') ? d.date.split('T')[0] : d.date;
    return dbDate === date;
  });
}

/* ================================================================
   HELPERS
================================================================ */
function generateSlots(schedule) {
  const slots  = [];
  const blocks = schedule.blocks || [{ startHour: schedule.startHour, endHour: schedule.endHour }];
  blocks.forEach(block => {
    for (let m = block.startHour * 60; m < block.endHour * 60; m += schedule.slotMinutes) {
      const h   = Math.floor(m / 60);
      const min = m % 60;
      slots.push(String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0'));
    }
  });
  return slots;
}

function isWorkDay(schedule, dateStr) {
  return schedule.workDays.includes(new Date(dateStr + 'T00:00:00').getDay());
}

function formatDate(dateStr, locale) {
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return new Date(clean + 'T00:00:00').toLocaleDateString(locale || 'es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function todayString() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}

function formatPrice(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(amount);
}