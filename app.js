/* ================================================================
   app.js — LÓGICA PRINCIPAL (async/await para backend)
================================================================ */

let APP = {
  currentBiz:      null,
  selectedService: null,
  selectedDate:    null,
  selectedSlot:    null,
  adminTab:        'today',
};

/* ── INIT ────────────────────────────────────────────────────── */
async function init() {
  try {
    if (WHITE_LABEL.activeBusinessId) {
      // Modo mono-cliente
      const biz = await getBusinessById(WHITE_LABEL.activeBusinessId);
      if (biz) await loadBusiness(biz);
    } else {
      // Modo multi-negocio
      const businesses = await getBusinesses();
      const active = businesses.filter(b => b.active);
      document.getElementById('biz-selector-wrap').classList.remove('hidden');
      if (active.length > 0) await loadBusiness(active[0]);
    }

    document.getElementById('date-input').min = todayString();
    attachEvents();
  } catch (err) {
    console.error('Error iniciando la app:', err);
    showToast('Error conectando al servidor. Verificá que esté corriendo.', 'error');
  }
}

/* ── CARGAR NEGOCIO ──────────────────────────────────────────── */
async function loadBusiness(biz) {
  // El backend devuelve schedule y theme como objetos ya parseados
  // pero a veces vienen como string JSON — los parseamos si hace falta
  if (typeof biz.schedule === 'string') biz.schedule = JSON.parse(biz.schedule);
  if (typeof biz.theme    === 'string') biz.theme    = JSON.parse(biz.theme);

  // Cargar servicios del negocio desde el backend
  const services = await getServices(biz.id);
  biz.services = services.map(s => ({
    id:       String(s.id),
    name:     s.name,
    duration: s.duration,
    price:    s.price,
    icon:     s.icon,
    active:   s.active,
  }));

  APP.currentBiz      = biz;
  APP.selectedService = null;
  APP.selectedDate    = null;
  APP.selectedSlot    = null;

  // Aplicar tema
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

async function renderSlots() {
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

  // Verificar fecha bloqueada
  const blocked = await isDateBlocked(currentBiz.id, selectedDate);
  if (blocked) {
    const blockedDates = await getBlockedDates(currentBiz.id);
    const found = blockedDates.find(d => {
      const dbDate = d.date.includes('T') ? d.date.split('T')[0] : d.date;
      return dbDate === selectedDate;
    });
    hint.textContent = '🚫 ' + (found?.reason || 'Día no disponible');
    grid.innerHTML = '';
    return;
  }

  hint.textContent = 'Horarios disponibles:';

  const allSlots = generateSlots(currentBiz.schedule);

  // Obtener turnos ocupados desde el backend
  const bookings = await getBookings(currentBiz.id, selectedDate);
  const takenTimes = bookings
    .filter(b => String(b.service_id) === String(selectedService.id) && b.status !== 'cancelled')
    .map(b => b.time.substring(0, 5)); // HH:MM

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
  const svc   = APP.currentBiz.services.find(s => String(s.id) === String(booking.service_id || booking.serviceId));
  const phone = APP.currentBiz.phone || WHITE_LABEL.app.whatsappNumber;

  document.getElementById('modal-details').innerHTML = `
    <div class="row"><span class="label">Cliente</span> <span class="value">${booking.name}</span></div>
    <div class="row"><span class="label">Teléfono</span><span class="value">${booking.phone}</span></div>
    ${booking.email ? `<div class="row"><span class="label">Email</span><span class="value">${booking.email}</span></div>` : ''}
    <div class="row"><span class="label">Servicio</span><span class="value">${svc?.icon || ''} ${svc?.name || ''}</span></div>
    <div class="row"><span class="label">Fecha</span>   <span class="value">${formatDate(booking.date, WHITE_LABEL.app.locale)}</span></div>
    <div class="row"><span class="label">Hora</span>    <span class="value">${booking.time?.substring(0,5)} hs</span></div>
    ${booking.notes ? `<div class="row"><span class="label">Notas</span><span class="value">${booking.notes}</span></div>` : ''}
  `;

  const msg = [
    '💈 *' + APP.currentBiz.name + '*',
    '¡Hola ' + booking.name + '! Tu turno está confirmado 🎉',
    '',
    '───────────────────',
    '📋 *Servicio:* ' + (svc?.name || ''),
    '📅 *Fecha:* ' + formatDate(booking.date, WHITE_LABEL.app.locale),
    '🕐 *Hora:* ' + booking.time?.substring(0,5) + ' hs',
    '───────────────────',
    booking.notes ? '📝 *Nota:* ' + booking.notes : '',
    '',
    'Te esperamos. Ante cualquier cambio avisanos con anticipación. ¡Gracias! 🙌',
  ].filter(Boolean).join('\n');

  document.getElementById('btn-whatsapp').href =
    'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);

  const modal = document.getElementById('modal-confirm');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

/* ================================================================
   ADMIN RENDERS
================================================================ */

function renderAdminTab(tab) {
  APP.adminTab = tab;
  document.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  ['bookings','services','stats','today','blocked'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
  });
  if (tab === 'bookings') renderAdminBookings();
  if (tab === 'services') renderAdminServices();
  if (tab === 'stats')    renderAdminStats();
  if (tab === 'today')    renderTodayView();
  if (tab === 'blocked')  renderAdminBlocked();
}

async function renderAdminBookings(filterDate) {
  const bookings = await getBookings(APP.currentBiz.id, filterDate || null);
  bookings.sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));

  const countEl = document.getElementById('admin-count-all');
  const list    = document.getElementById('admin-list-all');
  if (!countEl || !list) return;

  countEl.textContent = bookings.length + ' turno' + (bookings.length !== 1 ? 's' : '');

  if (bookings.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span>No hay turnos.</div>';
    return;
  }

  list.innerHTML = bookings.map(bk => {
    const svc = APP.currentBiz.services.find(s => String(s.id) === String(bk.service_id));
    const dateStr = bk.date.includes('T') ? bk.date.split('T')[0] : bk.date;
    return `
      <div class="booking-card">
        <div class="bc-top">
          <span class="bc-name">${bk.name}</span>
          <span class="bc-badge">${svc?.icon || ''} ${svc?.name || ''}</span>
          <button class="bc-delete-btn" data-booking-id="${bk.id}">✕</button>
        </div>
        <div class="bc-datetime">📅 ${formatDate(dateStr, WHITE_LABEL.app.locale)} · 🕐 ${bk.time?.substring(0,5)} hs</div>
        <div class="bc-contact">📱 ${bk.phone}${bk.email ? ' · ' + bk.email : ''}</div>
        ${bk.notes ? '<div class="bc-notes">💬 ' + bk.notes + '</div>' : ''}
      </div>
    `;
  }).join('');
}

function renderAdminServices() {
  const biz  = APP.currentBiz;
  const list = document.getElementById('admin-service-list');

  if (!biz.services || biz.services.length === 0) {
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

async function renderAdminStats() {
  const bookings = await getBookings(APP.currentBiz.id);
  const today    = todayString();

  let revenue = 0;
  bookings.forEach(bk => {
    const svc = APP.currentBiz.services.find(s => String(s.id) === String(bk.service_id));
    if (svc) revenue += svc.price;
  });

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${bookings.length}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${bookings.filter(b => {
        const d = b.date.includes('T') ? b.date.split('T')[0] : b.date;
        return d === today;
      }).length}</div>
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
  bookings.forEach(bk => { breakdown[bk.service_id] = (breakdown[bk.service_id] || 0) + 1; });

  document.getElementById('stats-breakdown').innerHTML =
    '<p class="section-label" style="margin-bottom:10px">Por servicio</p>' +
    Object.entries(breakdown).sort((a,b) => b[1]-a[1]).map(([id, count]) => {
      const svc = APP.currentBiz.services.find(s => String(s.id) === String(id));
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

async function renderTodayView() {
  const today    = todayString();
  const bookings = await getBookings(APP.currentBiz.id, today);
  bookings.sort((a, b) => a.time > b.time ? 1 : -1);

  const list  = document.getElementById('admin-list');
  const count = document.getElementById('admin-count');
  if (!list || !count) return;

  count.textContent = bookings.length + ' turno' + (bookings.length !== 1 ? 's' : '') + ' hoy';

  if (bookings.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">☀️</span>No hay turnos para hoy.</div>';
    return;
  }

  const now = new Date();
  list.innerHTML = bookings.map(bk => {
    const svc    = APP.currentBiz.services.find(s => String(s.id) === String(bk.service_id));
    const [h, m] = bk.time.split(':').map(Number);
    const isPast = h * 60 + m < now.getHours() * 60 + now.getMinutes();
    return `
      <div class="booking-card" style="${isPast ? 'opacity:0.5' : ''}">
        <div class="bc-top">
          <span class="bc-name">${bk.time?.substring(0,5)} hs — ${bk.name}</span>
          <span class="bc-badge">${svc?.icon || ''} ${svc?.name || ''}</span>
          <button class="bc-delete-btn" data-booking-id="${bk.id}">✕</button>
        </div>
        <div class="bc-contact">📱 ${bk.phone}${bk.notes ? ' · ' + bk.notes : ''}</div>
      </div>
    `;
  }).join('');
}

async function renderAdminBlocked() {
  const blocked = await getBlockedDates(APP.currentBiz.id);
  const list    = document.getElementById('blocked-list');
  const count   = document.getElementById('blocked-count');
  if (!list || !count) return;

  count.textContent = blocked.length + ' fecha' + (blocked.length !== 1 ? 's' : '') + ' bloqueada' + (blocked.length !== 1 ? 's' : '');

  if (blocked.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">📅</span>No hay fechas bloqueadas.</div>';
    return;
  }

  list.innerHTML = blocked.map(d => {
    const dateStr = d.date.includes('T') ? d.date.split('T')[0] : d.date;
    return `
      <div class="booking-card">
        <div class="bc-top">
          <span class="bc-name">📅 ${formatDate(dateStr, WHITE_LABEL.app.locale)}</span>
          <button class="bc-delete-btn" data-unblock-date="${dateStr}" title="Desbloquear">✕</button>
        </div>
        <div class="bc-contact">🚫 ${d.reason}</div>
      </div>
    `;
  }).join('');
}

async function renderBizDropdown() {
  if (WHITE_LABEL.activeBusinessId) return;
  const businesses = await getBusinesses();
  const dd = document.getElementById('biz-dropdown');
  dd.innerHTML = businesses.filter(b => b.active).map(biz => `
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
  const svc = APP.currentBiz.services.find(s => String(s.id) === card.dataset.serviceId);
  if (!svc) return;
  APP.selectedService = svc;
  APP.selectedSlot    = null;
  renderServices();
  showSection('step-datetime');
  if (APP.selectedDate) renderSlots();
  document.getElementById('step-datetime').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleDateChange(e) {
  APP.selectedDate = e.target.value;
  APP.selectedSlot = null;
  await renderSlots();
}

async function handleSlotClick(e) {
  const btn = e.target.closest('.slot-btn');
  if (!btn || btn.disabled) return;
  APP.selectedSlot = btn.dataset.time;
  await renderSlots();
  showSection('step-form');
  renderSelectionPills();
  document.getElementById('step-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleConfirm() {
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

  try {
    const booking = await addBooking(APP.currentBiz.id, {
      serviceId: APP.selectedService.id,
      date:      APP.selectedDate,
      time:      APP.selectedSlot,
      name, phone, email, notes,
    });

    renderConfirmModal(booking);
  } catch (err) {
    if (err.message.includes('ya está reservado')) {
      showToast('⚠️ Este horario acaba de ser reservado. Elegí otro.', 'error');
      await renderSlots();
      hideSection('step-form');
    } else {
      showToast('Error al confirmar el turno: ' + err.message, 'error');
    }
  }
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
    renderAdminTab('today');
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

  // Admin: eliminar turno (tab hoy)
  document.getElementById('admin-list').addEventListener('click', async e => {
    const btn = e.target.closest('.bc-delete-btn');
    if (!btn || !btn.dataset.bookingId) return;
    if (!confirm('¿Eliminar este turno?')) return;
    await deleteBooking(APP.currentBiz.id, btn.dataset.bookingId);
    renderTodayView();
    showToast('Turno eliminado');
  });

  // Admin: eliminar turno (tab todos)
  document.getElementById('admin-list-all').addEventListener('click', async e => {
    const btn = e.target.closest('.bc-delete-btn');
    if (!btn || !btn.dataset.bookingId) return;
    if (!confirm('¿Eliminar este turno?')) return;
    await deleteBooking(APP.currentBiz.id, btn.dataset.bookingId);
    const f = document.getElementById('admin-date-filter').value || null;
    renderAdminBookings(f);
    showToast('Turno eliminado');
  });

  // Admin: borrar todos
  document.getElementById('btn-delete-all').addEventListener('click', async () => {
    const bookings = await getBookings(APP.currentBiz.id);
    if (bookings.length === 0) { showToast('No hay turnos', 'error'); return; }
    if (!confirm('¿Borrar todos los turnos de ' + APP.currentBiz.name + '?')) return;
    await deleteAllBookings(APP.currentBiz.id);
    renderAdminBookings();
    renderTodayView();
    showToast('Todos los turnos eliminados');
  });

  // Admin: toggle/eliminar servicio
  document.getElementById('admin-service-list').addEventListener('click', async e => {
    const tog = e.target.closest('.toggle-active');
    if (tog) {
      const svc = APP.currentBiz.services.find(s => String(s.id) === tog.dataset.serviceId);
      if (!svc) return;
      await updateService(APP.currentBiz.id, svc.id, { active: !svc.active });
      const updated = await getBusinessById(APP.currentBiz.id);
      await loadBusiness(updated);
      renderAdminServices();
      showToast(svc.active ? 'Servicio desactivado' : 'Servicio activado');
      return;
    }
    const del = e.target.closest('[data-delete-service-id]');
    if (del) {
      if (!confirm('¿Eliminar este servicio?')) return;
      await deleteService(APP.currentBiz.id, del.dataset.deleteServiceId);
      const updated = await getBusinessById(APP.currentBiz.id);
      await loadBusiness(updated);
      renderAdminServices();
      renderServices();
      showToast('Servicio eliminado');
    }
  });

  // Admin: agregar servicio
  document.getElementById('btn-add-service').addEventListener('click', async () => {
    const icon     = document.getElementById('ns-icon').value.trim() || '⭐';
    const name     = document.getElementById('ns-name').value.trim();
    const duration = parseInt(document.getElementById('ns-duration').value);
    const price    = parseInt(document.getElementById('ns-price').value);
    if (!name || isNaN(duration) || isNaN(price)) {
      showToast('Completá todos los campos', 'error');
      return;
    }
    await addService(APP.currentBiz.id, { icon, name, duration, price });
    const updated = await getBusinessById(APP.currentBiz.id);
    await loadBusiness(updated);
    ['ns-icon','ns-name','ns-duration','ns-price'].forEach(id => {
      document.getElementById(id).value = '';
    });
    renderAdminServices();
    renderServices();
    showToast('Servicio agregado ✓');
  });

  // Fechas bloqueadas: agregar
  document.getElementById('btn-add-blocked').addEventListener('click', async () => {
    const date   = document.getElementById('blocked-date-input').value;
    const reason = document.getElementById('blocked-reason-input').value.trim() || 'Día no disponible';
    if (!date) { showToast('Seleccioná una fecha', 'error'); return; }
    if (date < todayString()) { showToast('No podés bloquear fechas pasadas', 'error'); return; }
    await addBlockedDate(APP.currentBiz.id, date, reason);
    document.getElementById('blocked-date-input').value   = '';
    document.getElementById('blocked-reason-input').value = '';
    renderAdminBlocked();
    showToast('Fecha bloqueada ✓');
  });

  // Fechas bloqueadas: eliminar
  document.getElementById('blocked-list').addEventListener('click', async e => {
    const btn = e.target.closest('[data-unblock-date]');
    if (!btn) return;
    if (!confirm('¿Desbloquear esta fecha?')) return;
    await removeBlockedDate(APP.currentBiz.id, btn.dataset.unblockDate);
    renderAdminBlocked();
    showToast('Fecha desbloqueada');
  });

  // Selector de negocio (solo multi-negocio)
  if (!WHITE_LABEL.activeBusinessId) {
    document.getElementById('biz-selector-btn').addEventListener('click', async () => {
      const dd = document.getElementById('biz-dropdown');
      if (dd.classList.contains('hidden')) { await renderBizDropdown(); dd.classList.remove('hidden'); }
      else dd.classList.add('hidden');
    });
    document.getElementById('biz-dropdown').addEventListener('click', async e => {
      const item = e.target.closest('.biz-dropdown-item');
      if (!item) return;
      const biz = await getBusinessById(item.dataset.bizId);
      if (biz) { await loadBusiness(biz); document.getElementById('biz-dropdown').classList.add('hidden'); }
    });
    document.addEventListener('click', e => {
      const wrap = document.getElementById('biz-selector-wrap');
      if (wrap && !wrap.contains(e.target))
        document.getElementById('biz-dropdown').classList.add('hidden');
    });
  }
}

document.addEventListener('DOMContentLoaded', init);