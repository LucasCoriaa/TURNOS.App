/* ================================================================
   app.js — LÓGICA PRINCIPAL
================================================================ */

let APP = {
  currentBiz:      null,
  selectedService: null,
  selectedDate:    null,
  selectedSlot:    null,
  adminTab:        'bookings',
};

/* ── INIT ────────────────────────────────────────────────────── */
function init() {
  const businesses = getBusinesses().filter(b => b.active);

  if (WHITE_LABEL.activeBusinessId) {
    // Modo mono-cliente: cargar negocio fijo, ocultar selector
    const biz = getBusinessById(WHITE_LABEL.activeBusinessId);
    if (biz) loadBusiness(biz);
  } else {
    // Modo multi-negocio: mostrar selector
    document.getElementById('biz-selector-wrap').classList.remove('hidden');
    if (businesses.length > 0) loadBusiness(businesses[0]);
  }

  document.getElementById('date-input').min = todayString();
  attachEvents();
}

/* ── CARGAR NEGOCIO ──────────────────────────────────────────── */
function loadBusiness(biz) {
  APP.currentBiz      = biz;
  APP.selectedService = null;
  APP.selectedDate    = null;
  APP.selectedSlot    = null;

  // Aplicar tema del negocio
  const root = document.documentElement;
  const t    = biz.theme;
  root.style.setProperty('--accent',         t.accent);
  root.style.setProperty('--accent-light',   t.accentLight);
  root.style.setProperty('--accent-dim',     t.accentDim);
  root.style.setProperty('--bg-main',        t.bgMain);
  root.style.setProperty('--bg-card',        t.bgCard);
  root.style.setProperty('--bg-elevated',    t.bgElevated);
  root.style.setProperty('--border',         t.border);
  root.style.setProperty('--text-primary',   t.textPrimary);
  root.style.setProperty('--text-secondary', t.textSecondary);
  root.style.setProperty('--text-muted',     t.textMuted);

  // Header
  document.getElementById('brand-icon').textContent    = biz.emoji;
  document.getElementById('brand-name').textContent    = biz.name;
  document.getElementById('brand-cat').textContent     = biz.category;
  document.getElementById('biz-sel-emoji').textContent = biz.emoji;
  document.getElementById('biz-sel-label').textContent = biz.name;
  document.title = biz.name + ' — Turnos';

  // Hero
  document.getElementById('hero-eyebrow').textContent  = biz.emoji + ' ' + biz.category;
  document.getElementById('hero-title').textContent    = biz.name;
  document.getElementById('hero-subtitle').textContent = WHITE_LABEL.app.welcomeMessage;

  // Limpiar formulario
  ['inp-name','inp-phone','inp-email','inp-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const di = document.getElementById('date-input');
  if (di) di.value = '';

  hideSection('step-datetime');
  hideSection('step-form');
  renderServices();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================================================================
   RENDERS
================================================================ */

function renderServices() {
  const grid     = document.getElementById('services-grid');
  const services = APP.currentBiz.services.filter(s => s.active !== false);

  if (services.length === 0) {
    grid.innerHTML = '<p class="empty-state"><span class="empty-icon">📋</span>No hay servicios configurados.</p>';
    return;
  }

  grid.innerHTML = services.map(s => `
    <div class="service-card ${APP.selectedService?.id === s.id ? 'selected' : ''}"
         data-service-id="${s.id}" role="button" tabindex="0">
      <div class="check-badge">✓</div>
      <span class="service-icon">${s.icon}</span>
      <div class="service-name">${s.name}</div>
      <div class="service-meta">${s.duration} min</div>
      <div class="service-price">${formatPrice(s.price)}</div>
    </div>
  `).join('');
}

function renderSlots() {
  const grid    = document.getElementById('slots-grid');
  const hint    = document.getElementById('slots-hint');
  const { currentBiz, selectedDate, selectedService } = APP;

  if (!selectedService || !selectedDate) {
    hint.textContent = 'Seleccioná una fecha para ver los turnos disponibles.';
    grid.innerHTML = '';
    return;
  }

  if (!isWorkDay(currentBiz.schedule, selectedDate)) {
    hint.textContent = '⚠️ Este día no es laborable. Por favor elegí otro.';
    grid.innerHTML = '';
    return;
  }

  hint.textContent = 'Horarios disponibles:';

  const allSlots   = generateSlots(currentBiz.schedule);
  const takenTimes = getBookings(currentBiz.id)
    .filter(b => b.date === selectedDate && b.serviceId === selectedService.id && b.status !== 'cancelled')
    .map(b => b.time);

  const nowMinutes = selectedDate === todayString()
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  grid.innerHTML = allSlots.map(time => {
    const [h, m]  = time.split(':').map(Number);
    const isPast  = h * 60 + m <= nowMinutes;
    const isTaken = takenTimes.includes(time);
    const disabled = isTaken || isPast;
    const selected = APP.selectedSlot === time;
    return `
      <button class="slot-btn ${selected ? 'selected' : ''}"
              data-time="${time}"
              ${disabled ? 'disabled' : ''}
              title="${isTaken ? 'Ocupado' : isPast ? 'Hora pasada' : ''}">
        ${time}
      </button>
    `;
  }).join('');
}

function renderSelectionPills() {
  const { selectedService, selectedDate, selectedSlot } = APP;
  if (!selectedService || !selectedDate || !selectedSlot) return;
  document.getElementById('selection-pills').innerHTML = `
    <span class="selection-pill">${selectedService.icon} ${selectedService.name}</span>
    <span class="selection-pill">📅 ${formatDate(selectedDate, WHITE_LABEL.app.locale)}</span>
    <span class="selection-pill">🕐 ${selectedSlot} hs</span>
  `;
}

function renderConfirmModal(booking) {
  const svc   = APP.currentBiz.services.find(s => s.id === booking.serviceId);
  const phone = APP.currentBiz.phone || WHITE_LABEL.app.whatsappNumber;

  document.getElementById('modal-details').innerHTML = `
    <div class="row"><span class="label">Cliente</span> <span class="value">${booking.name}</span></div>
    <div class="row"><span class="label">Teléfono</span><span class="value">${booking.phone}</span></div>
    ${booking.email ? `<div class="row"><span class="label">Email</span><span class="value">${booking.email}</span></div>` : ''}
    <div class="row"><span class="label">Servicio</span><span class="value">${svc?.icon} ${svc?.name}</span></div>
    <div class="row"><span class="label">Fecha</span>   <span class="value">${formatDate(booking.date, WHITE_LABEL.app.locale)}</span></div>
    <div class="row"><span class="label">Hora</span>    <span class="value">${booking.time} hs</span></div>
    ${booking.notes ? `<div class="row"><span class="label">Notas</span><span class="value">${booking.notes}</span></div>` : ''}
  `;

  const msg = [
    '💈 *' + APP.currentBiz.name + '*',
    '¡Hola ' + booking.name + '! Tu turno está confirmado 🎉',
    '',
    '───────────────────',
    '📋 *Servicio:* ' + (svc?.name || ''),
    '📅 *Fecha:* ' + formatDate(booking.date, WHITE_LABEL.app.locale),
    '🕐 *Hora:* ' + booking.time + ' hs',
    '───────────────────',
    booking.notes ? '📝 *Nota:* ' + booking.notes : '',
    '',
    'Te esperamos. Ante cualquier cambio avisanos con anticipación. ¡Gracias! 🙌',
  ].filter(Boolean).join('\n');

  document.getElementById('btn-whatsapp').href =
    'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);

  // Mostrar modal
  const modal = document.getElementById('modal-confirm');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

/* El mensaje va a quedar así en WhatsApp: */

/*💈 LuchitoRealG4Life
¡Hola Juan! Tu turno está confirmado 🎉

───────────────────
📋 Servicio: Corte clásico
📅 Fecha: viernes 21 de marzo de 2025
🕐 Hora: 11:00 hs
───────────────────

/*Te esperamos. Ante cualquier cambio avisanos con anticipación. ¡Gracias! 🙌*/

/* ================================================================
   ADMIN RENDERS
================================================================ */

function renderAdminTab(tab) {
  APP.adminTab = tab;
  document.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  ['bookings','services','stats'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
  });
  if (tab === 'bookings') renderAdminBookings();
  if (tab === 'services') renderAdminServices();
  if (tab === 'stats')    renderAdminStats();
}

function renderAdminBookings(filterDate) {
  let bookings = getBookings(APP.currentBiz.id);
  bookings.sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
  if (filterDate) bookings = bookings.filter(b => b.date === filterDate);

  document.getElementById('admin-count').textContent =
    bookings.length + ' turno' + (bookings.length !== 1 ? 's' : '');

  const list = document.getElementById('admin-list');

  if (bookings.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span>No hay turnos.</div>';
    return;
  }

  list.innerHTML = bookings.map(bk => {
    const svc = APP.currentBiz.services.find(s => s.id === bk.serviceId);
    return `
      <div class="booking-card">
        <div class="bc-top">
          <span class="bc-name">${bk.name}</span>
          <span class="bc-badge">${svc?.icon || ''} ${svc?.name || bk.serviceId}</span>
          <button class="bc-delete-btn" data-booking-id="${bk.id}">✕</button>
        </div>
        <div class="bc-datetime">📅 ${formatDate(bk.date, WHITE_LABEL.app.locale)} · 🕐 ${bk.time} hs</div>
        <div class="bc-contact">📱 ${bk.phone}${bk.email ? ' · ' + bk.email : ''}</div>
        ${bk.notes ? '<div class="bc-notes">💬 ' + bk.notes + '</div>' : ''}
      </div>
    `;
  }).join('');
}

function renderAdminServices() {
  const biz  = APP.currentBiz;
  const list = document.getElementById('admin-service-list');

  if (biz.services.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span>No hay servicios.</div>';
    return;
  }

  list.innerHTML = biz.services.map(s => `
    <div class="service-item-admin">
      <span class="s-icon">${s.icon}</span>
      <div class="s-info">
        <div class="s-name">${s.name}</div>
        <div class="s-meta">${s.duration} min · ${formatPrice(s.price)}</div>
      </div>
      <button class="toggle-active ${s.active !== false ? 'on' : ''}" data-service-id="${s.id}"></button>
      <button class="bc-delete-btn" data-delete-service-id="${s.id}">🗑</button>
    </div>
  `).join('');
}

function renderAdminStats() {
  const bookings = getBookings(APP.currentBiz.id);
  const today    = todayString();

  let revenue = 0;
  bookings.forEach(bk => {
    const svc = APP.currentBiz.services.find(s => s.id === bk.serviceId);
    if (svc) revenue += svc.price;
  });

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${bookings.length}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${bookings.filter(b => b.date === today).length}</div>
      <div class="stat-label">Hoy</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${formatPrice(revenue).split(',')[0]}</div>
      <div class="stat-label">Ingresos</div>
    </div>
  `;

  if (bookings.length === 0) {
    document.getElementById('stats-breakdown').innerHTML = '';
    return;
  }

  const breakdown = {};
  bookings.forEach(bk => { breakdown[bk.serviceId] = (breakdown[bk.serviceId] || 0) + 1; });

  document.getElementById('stats-breakdown').innerHTML =
    '<p class="section-label" style="margin-bottom:10px">Por servicio</p>' +
    Object.entries(breakdown).sort((a,b) => b[1]-a[1]).map(([id, count]) => {
      const svc = APP.currentBiz.services.find(s => s.id === id);
      const pct = Math.round(count / bookings.length * 100);
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:16px">${svc?.icon || '📌'}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${svc?.name || id}</div>
            <div style="height:5px;background:var(--border);border-radius:3px;margin-top:4px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px"></div>
            </div>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--accent)">${count}</span>
        </div>
      `;
    }).join('');
}

function renderBizDropdown() {
  if (WHITE_LABEL.activeBusinessId) return;
  const dd = document.getElementById('biz-dropdown');
  dd.innerHTML = getBusinesses().filter(b => b.active).map(biz => `
    <button class="biz-dropdown-item ${biz.id === APP.currentBiz?.id ? 'active' : ''}" data-biz-id="${biz.id}">
      <span class="biz-emoji">${biz.emoji}</span>
      <div class="biz-info">
        <span class="biz-dname">${biz.name}</span>
        <span class="biz-dcat">${biz.category}</span>
      </div>
      ${biz.id === APP.currentBiz?.id ? '<span class="biz-dropdown-check">✓</span>' : ''}
    </button>
  `).join('');
}

/* ================================================================
   HELPERS UI
================================================================ */

function showSection(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = ''; });
}

function hideSection(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function showToast(msg, type) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ================================================================
   HANDLERS
================================================================ */

function handleServiceClick(e) {
  const card = e.target.closest('.service-card');
  if (!card) return;
  const svc = APP.currentBiz.services.find(s => s.id === card.dataset.serviceId);
  if (!svc) return;
  APP.selectedService = svc;
  APP.selectedSlot    = null;
  renderServices();
  showSection('step-datetime');
  if (APP.selectedDate) renderSlots();
  document.getElementById('step-datetime').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleDateChange(e) {
  APP.selectedDate = e.target.value;
  APP.selectedSlot = null;
  renderSlots();
}

function handleSlotClick(e) {
  const btn = e.target.closest('.slot-btn');
  if (!btn || btn.disabled) return;
  APP.selectedSlot = btn.dataset.time;
  renderSlots();
  showSection('step-form');
  renderSelectionPills();
  document.getElementById('step-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleConfirm() {
  const name  = document.getElementById('inp-name').value.trim();
  const phone = document.getElementById('inp-phone').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const notes = document.getElementById('inp-notes').value.trim();

  let ok = true;
  function check(inputId, errId, condition) {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (condition) { inp.classList.add('error'); err.classList.remove('hidden'); ok = false; }
    else           { inp.classList.remove('error'); err.classList.add('hidden'); }
  }
  check('inp-name',  'err-name',  name.length < 2);
  check('inp-phone', 'err-phone', phone.replace(/\D/g,'').length < 7);
  if (!ok) return;

  if (isSlotTaken(APP.currentBiz.id, APP.selectedDate, APP.selectedService.id, APP.selectedSlot)) {
    showToast('⚠️ Este horario acaba de ser reservado. Elegí otro.', 'error');
    renderSlots();
    hideSection('step-form');
    return;
  }

  const booking = addBooking(APP.currentBiz.id, {
    serviceId: APP.selectedService.id,
    date:  APP.selectedDate,
    time:  APP.selectedSlot,
    name, phone, email, notes,
  });

  renderConfirmModal(booking);
}

function handleNewBooking() {
  document.getElementById('modal-confirm').classList.add('hidden');
  APP.selectedService = null;
  APP.selectedDate    = null;
  APP.selectedSlot    = null;
  ['inp-name','inp-phone','inp-email','inp-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('date-input').value = '';
  hideSection('step-datetime');
  hideSection('step-form');
  renderServices();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================================================================
   ATTACH EVENTS
================================================================ */

function attachEvents() {
  document.getElementById('services-grid').addEventListener('click', handleServiceClick);
  document.getElementById('date-input').addEventListener('change', handleDateChange);
  document.getElementById('slots-grid').addEventListener('click', handleSlotClick);
  document.getElementById('btn-confirm').addEventListener('click', handleConfirm);
  document.getElementById('btn-new-booking').addEventListener('click', handleNewBooking);

  // Admin: abrir
  document.getElementById('btn-open-admin').addEventListener('click', () => {
    const pwd = prompt('Contraseña:');
    if (pwd !== WHITE_LABEL.app.adminPassword) {
      if (pwd !== null) showToast('Contraseña incorrecta', 'error');
      return;
    }
    document.getElementById('admin-overlay').classList.remove('hidden');
    renderAdminTab('bookings');
  });

  // Admin: cerrar
  document.getElementById('btn-close-admin').addEventListener('click', () => {
    document.getElementById('admin-overlay').classList.add('hidden');
  });
  document.getElementById('admin-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget)
      document.getElementById('admin-overlay').classList.add('hidden');
  });

  // Admin: tabs
  document.querySelectorAll('.drawer-tab').forEach(tab => {
    tab.addEventListener('click', () => renderAdminTab(tab.dataset.tab));
  });

  // Admin: filtro fecha
  document.getElementById('admin-date-filter').addEventListener('change', e => {
    renderAdminBookings(e.target.value || null);
  });
  document.getElementById('btn-clear-filter').addEventListener('click', () => {
    document.getElementById('admin-date-filter').value = '';
    renderAdminBookings(null);
  });

  // Admin: eliminar turno
  document.getElementById('admin-list').addEventListener('click', e => {
    const btn = e.target.closest('.bc-delete-btn');
    if (!btn) return;
    if (!confirm('¿Eliminar este turno?')) return;
    deleteBooking(APP.currentBiz.id, btn.dataset.bookingId);
    const f = document.getElementById('admin-date-filter').value || null;
    renderAdminBookings(f);
    showToast('Turno eliminado');
  });

  // Admin: borrar todos
  document.getElementById('btn-delete-all').addEventListener('click', () => {
    const n = getBookings(APP.currentBiz.id).length;
    if (n === 0) { showToast('No hay turnos', 'error'); return; }
    if (!confirm('¿Borrar los ' + n + ' turnos de ' + APP.currentBiz.name + '?')) return;
    deleteAllBookings(APP.currentBiz.id);
    renderAdminBookings();
    showToast('Todos los turnos eliminados');
  });

  // Admin: toggle/eliminar servicio
  document.getElementById('admin-service-list').addEventListener('click', e => {
    const tog = e.target.closest('.toggle-active');
    if (tog) {
      const svc = APP.currentBiz.services.find(s => s.id === tog.dataset.serviceId);
      if (!svc) return;
      updateService(APP.currentBiz.id, svc.id, { active: svc.active === false });
      APP.currentBiz = getBusinessById(APP.currentBiz.id);
      renderAdminServices();
      renderServices();
      showToast(svc.active === false ? 'Servicio activado' : 'Servicio desactivado');
      return;
    }
    const del = e.target.closest('[data-delete-service-id]');
    if (del) {
      if (!confirm('¿Eliminar este servicio?')) return;
      deleteService(APP.currentBiz.id, del.dataset.deleteServiceId);
      APP.currentBiz = getBusinessById(APP.currentBiz.id);
      renderAdminServices();
      renderServices();
      showToast('Servicio eliminado');
    }
  });

  // Admin: agregar servicio
  document.getElementById('btn-add-service').addEventListener('click', () => {
    const icon     = document.getElementById('ns-icon').value.trim() || '⭐';
    const name     = document.getElementById('ns-name').value.trim();
    const duration = parseInt(document.getElementById('ns-duration').value);
    const price    = parseInt(document.getElementById('ns-price').value);
    if (!name || isNaN(duration) || isNaN(price)) {
      showToast('Completá todos los campos', 'error');
      return;
    }
    addService(APP.currentBiz.id, { icon, name, duration, price, active: true });
    APP.currentBiz = getBusinessById(APP.currentBiz.id);
    ['ns-icon','ns-name','ns-duration','ns-price'].forEach(id => {
      document.getElementById(id).value = '';
    });
    renderAdminServices();
    renderServices();
    showToast('Servicio agregado ✓');
  });

  // Selector de negocio (solo en modo multi-negocio)
  if (!WHITE_LABEL.activeBusinessId) {
    document.getElementById('biz-selector-btn').addEventListener('click', () => {
      const dd = document.getElementById('biz-dropdown');
      if (dd.classList.contains('hidden')) { renderBizDropdown(); dd.classList.remove('hidden'); }
      else dd.classList.add('hidden');
    });
    document.getElementById('biz-dropdown').addEventListener('click', e => {
      const item = e.target.closest('.biz-dropdown-item');
      if (!item) return;
      const biz = getBusinessById(item.dataset.bizId);
      if (biz) { loadBusiness(biz); document.getElementById('biz-dropdown').classList.add('hidden'); }
    });
    document.addEventListener('click', e => {
      const wrap = document.getElementById('biz-selector-wrap');
      if (wrap && !wrap.contains(e.target))
        document.getElementById('biz-dropdown').classList.add('hidden');
    });
  }
}

document.addEventListener('DOMContentLoaded', init);