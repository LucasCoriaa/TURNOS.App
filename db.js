/* ================================================================
   db.js — DATOS Y LÓGICA DE NEGOCIO
================================================================ */

const SEED_BUSINESSES = [
  {
     id:       'biz_001',
    name:     'LuchitoRealG4Life',
    category: 'Barbería',
    emoji:    '✂️',
    phone:    '5493513824513',
    address:  '',
    active:   true,
    schedule: {
      // blocks: podés poner uno o varios bloques horarios
      // Ejemplo con descanso al mediodía:
      //   bloque 1: 11:00 a 12:00
      //   bloque 2: 16:00 a 20:00
      blocks: [
        { startHour: 11, endHour: 13 },
        { startHour: 15, endHour: 23 },
      ],
      slotMinutes: 30,
      workDays:    [ 3, 4, 5, 6],
    },
    services: [
      { id: 's1', name: 'Corte clásico',   duration: 30, price: 2500,  icon: '✂️', active: true },
      { id: 's2', name: 'Corte + Barba',   duration: 50, price: 3800,  icon: '⚡', active: true },
      { id: 's3', name: 'Coloración',      duration: 90, price: 6000,  icon: '🎨', active: true },
      { id: 's4', name: 'Corte para niños',duration: 30, price: 10000, icon: '👦', active: true },
    ],
    theme: {
      accent:        '#c9a84c',   // Dorado
      accentLight:   '#e2c97e',
      accentDim:     'rgba(201,168,76,0.12)',
      bgMain:        '#0e0e0e',
      bgCard:        '#161616',
      bgElevated:    '#1f1f1f',
      border:        '#2a2a2a',
      textPrimary:   '#f0ece4',
      textSecondary: '#8a8580',
      textMuted:     '#4a4845',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id:       'biz_002',
    name:     'Dra. Martínez',
    category: 'Consultorio médico',
    emoji:    '🏥',
    phone:    '5491187654321',
    address:  'Tucumán 890, Piso 3, CABA',
    active:   true,
    schedule: {
      startHour:   8,
      endHour:     17,
      slotMinutes: 20,
      workDays:    [1, 2, 3, 4, 5],
    },
    services: [
      { id: 's1', name: 'Consulta general',  duration: 20, price: 4000, icon: '🩺', active: true },
      { id: 's2', name: 'Control de rutina', duration: 30, price: 5500, icon: '📋', active: true },
      { id: 's3', name: 'Ecografía',         duration: 40, price: 8000, icon: '🔬', active: true },
    ],
    theme: {
      accent:        '#e8458a',   // Rosa fucsia principal
      accentLight:   '#f472b6',   // Rosa claro (hover)
      accentDim:     'rgba(232,69,138,0.12)',
      bgMain:        '#0f0a0d',   // Negro con tono rosa muy sutil
      bgCard:        '#1a1018',
      bgElevated:    '#231520',
      border:        '#3a1f30',
      textPrimary:   '#fce7f3',   // Blanco rosado
      textSecondary: '#9e7a8e',
      textMuted:     '#5c3d50',
    },
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id:       'biz_003',
    name:     'Nail & Beauty',
    category: 'Centro de estética',
    emoji:    '💅',
    phone:    '5491199887766',
    address:  'Santa Fe 2100, Córdoba',
    active:   true,
    schedule: {
      startHour:   10,
      endHour:     20,
      slotMinutes: 60,
      workDays:    [2, 3, 4, 5, 6],
    },
    services: [
      { id: 's1', name: 'Manicura',          duration: 60, price: 3200, icon: '💅', active: true },
      { id: 's2', name: 'Pedicura',          duration: 60, price: 3500, icon: '🦶', active: true },
      { id: 's3', name: 'Depilación laser',  duration: 45, price: 7000, icon: '✨', active: true },
      { id: 's4', name: 'Lifting de cejas',  duration: 90, price: 9500, icon: '👁️', active: true },
    ],
    theme: {
      accent:        '#e8458a',   // Rosa fucsia principal
      accentLight:   '#f472b6',   // Rosa claro (hover)
      accentDim:     'rgba(232,69,138,0.12)',
      bgMain:        '#0f0a0d',   // Negro con tono rosa muy sutil
      bgCard:        '#1a1018',
      bgElevated:    '#231520',
      border:        '#3a1f30',
      textPrimary:   '#fce7f3',   // Blanco rosado
      textSecondary: '#9e7a8e',
      textMuted:     '#5c3d50',
    },
    createdAt: '2024-02-01T00:00:00.000Z',
  },
];

/* ── Versión de los datos ─────────────────────────────────────────────
   Cambiá DATA_VERSION cada vez que modifiques SEED_BUSINESSES.
   El navegador va a detectar el cambio y limpiar el caché solo.
───────────────────────────────────────────────────────────────────── */
const DATA_VERSION = 'v6';

if (localStorage.getItem('rf_data_version') !== DATA_VERSION) {
  localStorage.clear();
  localStorage.setItem('rf_businesses', JSON.stringify(SEED_BUSINESSES));
  localStorage.setItem('rf_data_version', DATA_VERSION);
}

/* ================================================================
   BUSINESSES
================================================================ */
function getBusinesses() {
  return JSON.parse(localStorage.getItem('rf_businesses'));
}

function getBusinessById(id) {
  return getBusinesses().find(b => b.id === id) || null;
}

function saveBusinesses(list) {
  localStorage.setItem('rf_businesses', JSON.stringify(list));
}

function saveBusiness(biz) {
  const list = getBusinesses();
  const idx  = list.findIndex(b => b.id === biz.id);
  if (idx >= 0) list[idx] = biz; else list.push(biz);
  saveBusinesses(list);
}

/* ================================================================
   SERVICES
================================================================ */
function addService(businessId, data) {
  const biz = getBusinessById(businessId);
  if (!biz) return null;
  const svc = { id: 's_' + Date.now(), active: true, ...data };
  biz.services.push(svc);
  saveBusiness(biz);
  return svc;
}

function updateService(businessId, serviceId, updates) {
  const biz = getBusinessById(businessId);
  if (!biz) return;
  const svc = biz.services.find(s => s.id === serviceId);
  if (svc) Object.assign(svc, updates);
  saveBusiness(biz);
}

function deleteService(businessId, serviceId) {
  const biz = getBusinessById(businessId);
  if (!biz) return;
  biz.services = biz.services.filter(s => s.id !== serviceId);
  saveBusiness(biz);
}

/* ================================================================
   BOOKINGS
================================================================ */
function getBookings(businessId) {
  const raw = localStorage.getItem('rf_bookings_' + businessId);
  return raw ? JSON.parse(raw) : [];
}

function saveBookingsForBiz(businessId, bookings) {
  localStorage.setItem('rf_bookings_' + businessId, JSON.stringify(bookings));
}

function addBooking(businessId, data) {
  const booking = {
    id:        'bk_' + Date.now(),
    businessId,
    status:    'confirmed',
    createdAt: new Date().toISOString(),
    ...data,
  };
  const all = getBookings(businessId);
  all.push(booking);
  saveBookingsForBiz(businessId, all);
  return booking;
}

function deleteBooking(businessId, bookingId) {
  const all = getBookings(businessId).filter(b => b.id !== bookingId);
  saveBookingsForBiz(businessId, all);
}

function deleteAllBookings(businessId) {
  localStorage.removeItem('rf_bookings_' + businessId);
}

function isSlotTaken(businessId, date, serviceId, time) {
  return getBookings(businessId).some(
    b => b.date === date && b.serviceId === serviceId && b.time === time && b.status !== 'cancelled'
  );
}

/* ================================================================
   HELPERS
================================================================ */
function generateSlots(schedule) {
  const slots = [];

  // Soporta múltiples bloques horarios (con descanso, etc.)
  // Si tiene 'blocks' usa eso; si tiene el formato viejo lo convierte en un bloque único.
  const blocks = schedule.blocks || [
    { startHour: schedule.startHour, endHour: schedule.endHour }
  ];

  blocks.forEach(function(block) {
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
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale || 'es-AR', {
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