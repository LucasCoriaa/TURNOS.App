/* ================================================================
   ux.js — MEJORAS DE UX + AUTOMATIZACIONES
   
   📌 CÓMO USAR:
   Agregá en index.html, DESPUÉS de app.js:
   <script src="ux.js?v=1"></script>
   
   Este archivo parchea app.js sin reemplazarlo.
   Todas las mejoras son aditivas.
================================================================ */


/* ================================================================
   SECCIÓN 1 — UX IMPROVEMENTS
================================================================ */

/* ── 1.1 SKELETON LOADERS ─────────────────────────────────────── */
// Genera HTML de skeleton cards para servicios
function skeletonServices(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skel skel-icon"></div>
      <div class="skel skel-line w70"></div>
      <div class="skel skel-line w45"></div>
      <div class="skel skel-line w55"></div>
    </div>
  `).join('');
}

// Genera skeleton para los botones de horarios
function skeletonSlots(count = 8) {
  return Array.from({ length: count }, () =>
    `<div class="skel skel-slot"></div>`
  ).join('');
}


/* ── 1.2 FORMATEO DE TELÉFONO ARGENTINO ───────────────────────── */
// Convierte 3511234567 → 351 123 4567
// También maneja prefijos de Buenos Aires (11 xxxx xxxx)
function formatPhoneAR(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3)  return digits;
  if (digits.length <= 6)  return `${digits.slice(0,3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
  // Buenos Aires (11) u otros de 2 dígitos
  return `${digits.slice(0,2)} ${digits.slice(2,6)} ${digits.slice(6,10)}`;
}


/* ── 1.3 PERSISTENCIA DE USUARIO ──────────────────────────────── */
const USER_KEY = 'turnos_user_v1';

function saveUserData() {
  const name  = document.getElementById('inp-name')?.value.trim();
  const phone = document.getElementById('inp-phone')?.value.trim();
  if (name && phone) {
    try { localStorage.setItem(USER_KEY, JSON.stringify({ name, phone })); } catch {}
  }
}

// Rellena los campos si el usuario ya reservó antes
// Solo aplica si los campos están vacíos
function loadUserData() {
  try {
    const saved = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (!saved) return;
    
    const nameEl  = document.getElementById('inp-name');
    const phoneEl = document.getElementById('inp-phone');
    
    if (nameEl  && !nameEl.value  && saved.name)  nameEl.value  = saved.name;
    if (phoneEl && !phoneEl.value && saved.phone) phoneEl.value = saved.phone;
    
    // Si cargamos datos pre-llenados, marcar como válidos
    if (saved.name  && nameEl)  nameEl.classList.add('valid');
    if (saved.phone && phoneEl) phoneEl.classList.add('valid');
    
    if (saved.name || saved.phone) {
      showToast('✨ Datos completados automáticamente', 'info');
    }
  } catch {}
}


/* ── 1.4 VALIDACIÓN EN TIEMPO REAL ────────────────────────────── */
function setupLiveValidation() {
  const nameEl  = document.getElementById('inp-name');
  const phoneEl = document.getElementById('inp-phone');
  if (!nameEl || !phoneEl) return;

  // Nombre — validar al salir del campo
  nameEl.addEventListener('blur', () => {
    const ok = nameEl.value.trim().length >= 2;
    setFieldState(nameEl, 'err-name', ok);
  });
  nameEl.addEventListener('input', () => {
    if (nameEl.classList.contains('error') && nameEl.value.trim().length >= 2) {
      setFieldState(nameEl, 'err-name', true);
    }
  });

  // Teléfono — formatear + validar mientras escribe
  phoneEl.addEventListener('input', (e) => {
    const formatted = formatPhoneAR(e.target.value);
    const cursor    = e.target.selectionStart;
    e.target.value  = formatted;
    
    // Restaurar posición del cursor aproximada
    try { e.target.setSelectionRange(cursor + 1, cursor + 1); } catch {}
    
    const digits = formatted.replace(/\D/g, '');
    const ok     = digits.length >= 7;
    
    if (formatted.length > 3) setFieldState(phoneEl, 'err-phone', ok);
  });
}

function setFieldState(inputEl, errId, isValid) {
  inputEl.classList.toggle('error', !isValid);
  inputEl.classList.toggle('valid', isValid);
  document.getElementById(errId)?.classList.toggle('hidden', isValid);
}


/* ── 1.5 BOTÓN LOADER + DEBOUNCE ──────────────────────────────── */
let _isConfirming = false;

function setButtonLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  _isConfirming  = loading;
  btn.disabled   = loading;
  btn.dataset.origText = btn.dataset.origText || btn.innerHTML;
  btn.innerHTML  = loading
    ? `<span class="btn-spinner"></span>&nbsp; Confirmando...`
    : btn.dataset.origText;
}


/* ── 1.6 CONFETTI DE ÉXITO ─────────────────────────────────────── */
function launchConfetti() {
  const colors  = ['#c9a84c', '#e2c97e', '#fff', '#f0ece4', '#a07830', '#ffd700'];
  const total   = 90;
  const frag    = document.createDocumentFragment();

  for (let i = 0; i < total; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = 4 + Math.random() * 7;
    el.style.cssText = [
      `left:${Math.random() * 100}vw`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `width:${size}px`,
      `height:${size * (1.5 + Math.random())}px`,
      `animation-delay:${Math.random() * 0.7}s`,
      `animation-duration:${1.4 + Math.random() * 1.2}s`,
      `transform:rotate(${Math.random() * 360}deg)`,
      `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
    ].join(';');
    frag.appendChild(el);
  }

  document.body.appendChild(frag);
  setTimeout(() => {
    document.querySelectorAll('.confetti-piece').forEach(el => el.remove());
  }, 3000);
}


/* ── 1.7 BARRA DE PROGRESO ─────────────────────────────────────── */
function updateProgress(step) {
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    const n = i + 1;
    el.classList.toggle('prog-completed', n < step);
    el.classList.toggle('prog-active',    n === step);
    el.classList.toggle('prog-inactive',  n > step);
  });
  document.querySelectorAll('.progress-connector').forEach((el, i) => {
    el.classList.toggle('prog-filled', i + 1 < step);
  });
}


/* ── 1.8 TRANSICIÓN SUAVE ENTRE PASOS ─────────────────────────── */
function revealStep(sectionId, step) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  
  el.classList.remove('hidden');
  el.classList.add('step-reveal');
  
  // Quitar clase de animación en el siguiente frame para que CSS la dispare bien
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.remove('step-reveal'))
  );
  
  updateProgress(step);
  
  setTimeout(() =>
    el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80
  );
}


/* ================================================================
   SECCIÓN 2 — AUTOMATIZACIONES
================================================================ */

/* ── 2.1 MENSAJE DE WHATSAPP MEJORADO ─────────────────────────── */
// Genera un mensaje profesional con todos los datos del turno
// Incluye link de cancelación directo
function buildWhatsAppMessage(booking, svc, bizName, phone) {
  const dateFormatted = formatDate(booking.date, WHITE_LABEL.app.locale);
  const timeFormatted = (booking.time || '').substring(0, 5);
  
  // Link de cancelación — el cliente puede cancelar desde su celular
  const cancelUrl = `${window.location.origin}${window.location.pathname}?cancel=${booking.id}`;
  
  const lines = [
    `✂️ *${bizName}*`,
    ``,
    `¡Hola *${booking.name}*! 👋`,
    `Tu turno quedó *confirmado* ✅`,
    ``,
    `─────────────────────`,
    `${svc?.icon || '📋'} *Servicio:* ${svc?.name || ''}`,
    `📅 *Fecha:* ${dateFormatted}`,
    `🕐 *Hora:* ${timeFormatted} hs`,
    svc?.price ? `💰 *Precio:* ${formatPrice(svc.price)}` : null,
    booking.notes ? `📝 *Nota:* ${booking.notes}` : null,
    `─────────────────────`,
    ``,
    `¿Necesitás cancelar o reprogramar?`,
    `⚠️ Avisanos con al menos 2 horas de anticipación`,
    `❌ Cancelar mi turno: ${cancelUrl}`,
    ``,
    `¡Te esperamos! 🙌`,
  ];

  return lines.filter(l => l !== null).join('\n');
}

/* ── 2.2 MENSAJE DE RECORDATORIO ──────────────────────────────── */
// Genera mensaje de recordatorio para enviar manualmente por WhatsApp
// hoursAhead: 24 (día anterior) o 2 (mismo día)
// 
// PRÓXIMO PASO: en el backend Node.js podés hacer:
//   GET /api/reminders/pending?hours=24 → bookings del día siguiente
//   GET /api/reminders/pending?hours=2  → bookings en 2 horas
//   Iterar y enviar por whatsapp-web.js o Twilio
function buildReminderMessage(booking, svc, bizName, hoursAhead) {
  const dateFormatted = formatDate(booking.date, WHITE_LABEL.app.locale);
  const timeFormatted = (booking.time || '').substring(0, 5);
  const when          = hoursAhead === 24 ? '*mañana*' : `*en ${hoursAhead} horas*`;

  return [
    `✂️ *${bizName}*`,
    ``,
    `¡Hola *${booking.name}*! 👋`,
    `Te recordamos que tenés un turno ${when} ⏰`,
    ``,
    `${svc?.icon || '📋'} *${svc?.name || ''}*`,
    `📅 ${dateFormatted} a las ${timeFormatted} hs`,
    ``,
    `Si no podés asistir, avisanos con anticipación.`,
    `¡Hasta pronto! 🙌`,
  ].join('\n');
}

// Ejemplo de uso desde el Admin (en el futuro podés agregar un botón):
// const msg = buildReminderMessage(booking, svc, APP.currentBiz.name, 24);
// window.open('https://wa.me/549' + booking.phone + '?text=' + encodeURIComponent(msg));


/* ── 2.3 CANCELACIÓN POR LINK ──────────────────────────────────── */
// Lee ?cancel=ID en la URL y muestra el modal de cancelación
async function handleCancelFromUrl() {
  const params   = new URLSearchParams(window.location.search);
  const cancelId = params.get('cancel');
  if (!cancelId) return;
  
  // Esperar a que la app cargue el negocio
  await waitForBiz();
  showCancelModal(cancelId);
}

// Espera hasta que APP.currentBiz esté cargado (máx 5 segundos)
function waitForBiz(maxMs = 5000) {
  return new Promise((resolve) => {
    if (APP.currentBiz) return resolve();
    const start    = Date.now();
    const interval = setInterval(() => {
      if (APP.currentBiz || Date.now() - start > maxMs) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

function showCancelModal(bookingId) {
  document.getElementById('cancel-modal-ux')?.remove();

  const modal = document.createElement('div');
  modal.id    = 'cancel-modal-ux';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-card" style="text-align:center">
      <div style="font-size:52px;margin-bottom:12px">❌</div>
      <h2 class="modal-title">Cancelar turno</h2>
      <p class="modal-sub">¿Confirmás que querés cancelar tu reserva?</p>
      <div class="modal-actions" style="flex-direction:column;gap:10px;margin-top:24px">
        <button class="btn btn-danger btn-lg" id="btn-do-cancel" style="width:100%">
          Sí, cancelar mi turno
        </button>
        <button class="btn btn-ghost" id="btn-keep-booking" style="width:100%">
          No, mantener el turno
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-do-cancel').addEventListener('click', async () => {
    const btn = document.getElementById('btn-do-cancel');
    btn.innerHTML = '<span class="btn-spinner"></span>&nbsp; Cancelando...';
    btn.disabled  = true;

    try {
      await deleteBooking(APP.currentBiz.id, bookingId);
      modal.querySelector('.modal-card').innerHTML = `
        <div style="font-size:52px;margin-bottom:12px">✅</div>
        <h2 class="modal-title">Turno cancelado</h2>
        <p class="modal-sub">Tu reserva fue cancelada exitosamente.</p>
        <button class="btn btn-primary btn-lg"
                style="width:100%;margin-top:24px"
                onclick="window.location.href=window.location.pathname">
          Hacer una nueva reserva
        </button>
      `;
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      showToast('No se pudo cancelar. El turno puede haber expirado.', 'error');
      modal.remove();
      window.history.replaceState({}, '', window.location.pathname);
    }
  });

  document.getElementById('btn-keep-booking').addEventListener('click', () => {
    modal.remove();
    window.history.replaceState({}, '', window.location.pathname);
  });
}


/* ── 2.4 POLLING DE SLOTS (anti-duplicados en tiempo real) ─────── */
// Refresca los horarios disponibles cada 30s mientras el usuario elige
// Evita que dos personas reserven el mismo horario simultáneamente
let _slotPollInterval = null;

function startSlotPolling() {
  stopSlotPolling();
  _slotPollInterval = setInterval(async () => {
    const step = document.getElementById('step-datetime');
    if (step && !step.classList.contains('hidden') && APP.selectedDate && APP.selectedService) {
      await renderSlotsEnhanced(true); // true = silent (sin re-scroll)
    }
  }, 30_000);
}

function stopSlotPolling() {
  if (_slotPollInterval) { clearInterval(_slotPollInterval); _slotPollInterval = null; }
}


/* ================================================================
   SECCIÓN 3 — RENDERS MEJORADOS
   (reemplazan las funciones equivalentes de app.js)
================================================================ */

/* ── 3.1 renderServicesEnhanced ───────────────────────────────── */
function renderServicesEnhanced() {
  const grid     = document.getElementById('services-grid');
  const services = APP.currentBiz?.services?.filter(s => s.active !== false) ?? [];

  // Skeleton mientras carga
  grid.innerHTML = skeletonServices(Math.max(services.length, 3));

  setTimeout(() => {
    if (services.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p class="empty-title">Sin servicios</p>
          <p class="empty-desc">Este negocio no tiene servicios configurados aún.</p>
        </div>`;
      return;
    }

    grid.innerHTML = services.map((s, i) => `
      <div class="service-card ${APP.selectedService?.id === s.id ? 'selected' : ''}"
           data-service-id="${s.id}"
           role="button"
           tabindex="0"
           style="animation-delay:${i * 0.07}s">
        <div class="check-badge">✓</div>
        <span class="service-icon">${s.icon}</span>
        <div class="service-name">${s.name}</div>
        <div class="service-meta">⏱ ${s.duration} min</div>
        <div class="service-price">${formatPrice(s.price)}</div>
      </div>
    `).join('');

    updateProgress(1);
  }, 250);
}


/* ── 3.2 renderSlotsEnhanced ──────────────────────────────────── */
// silent=true evita re-scroll (para polling en background)
async function renderSlotsEnhanced(silent = false) {
  const grid    = document.getElementById('slots-grid');
  const hint    = document.getElementById('slots-hint');
  const { currentBiz, selectedDate, selectedService } = APP;

  if (!selectedService || !selectedDate) {
    hint.textContent = 'Seleccioná una fecha para ver los turnos disponibles.';
    grid.innerHTML   = '';
    return;
  }

  if (!isWorkDay(currentBiz.schedule, selectedDate)) {
    hint.innerHTML = `<span class="slot-warning">⚠️ Ese día no es laborable — elegí otro</span>`;
    grid.innerHTML = `
      <div class="empty-state compact">
        <span class="empty-icon">🚫</span>
        <p class="empty-desc">No trabajamos ese día</p>
      </div>`;
    return;
  }

  if (!silent) {
    hint.textContent = 'Cargando horarios...';
    grid.innerHTML   = skeletonSlots(6);
  }

  try {
    const blocked = await isDateBlocked(currentBiz.id, selectedDate);
    if (blocked) {
      const list  = await getBlockedDates(currentBiz.id);
      const found = list.find(d => {
        const dd = d.date.includes('T') ? d.date.split('T')[0] : d.date;
        return dd === selectedDate;
      });
      hint.innerHTML = `<span class="slot-warning">🚫 ${found?.reason || 'Día no disponible'}</span>`;
      grid.innerHTML = `
        <div class="empty-state compact">
          <span class="empty-icon">📅</span>
          <p class="empty-desc">${found?.reason || 'Día bloqueado'}</p>
        </div>`;
      return;
    }

    const allSlots   = generateSlots(currentBiz.schedule);
    const bookings   = await getBookings(currentBiz.id, selectedDate);
    const takenTimes = bookings
      .filter(b => String(b.service_id) === String(selectedService.id) && b.status !== 'cancelled')
      .map(b => b.time.substring(0, 5));

    const nowMinutes = selectedDate === todayString()
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : -1;

    const availableCount = allSlots.filter(time => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m > nowMinutes && !takenTimes.includes(time);
    }).length;

    if (availableCount === 0) {
      hint.innerHTML = `<span class="slot-warning">😔 No hay horarios disponibles</span>`;
      grid.innerHTML = `
        <div class="empty-state compact">
          <span class="empty-icon">⏰</span>
          <p class="empty-desc">Todos los turnos están ocupados</p>
          <p class="empty-subdesc">Probá con otra fecha</p>
        </div>`;
      return;
    }

    hint.innerHTML = `<span class="slots-count">${availableCount} horario${availableCount !== 1 ? 's' : ''} disponible${availableCount !== 1 ? 's' : ''}</span>`;

    grid.innerHTML = allSlots.map((time, i) => {
      const [h, m]   = time.split(':').map(Number);
      const isPast   = h * 60 + m <= nowMinutes;
      const isTaken  = takenTimes.includes(time);
      const disabled = isTaken || isPast;
      const selected = APP.selectedSlot === time;

      const cls = [
        'slot-btn',
        selected  ? 'selected'   : '',
        isTaken   ? 'slot-taken' : '',
        isPast    ? 'slot-past'  : '',
      ].filter(Boolean).join(' ');

      return `
        <button class="${cls}"
                data-time="${time}"
                ${disabled ? 'disabled' : ''}
                style="animation-delay:${i * 0.025}s"
                title="${isTaken ? 'Ocupado' : isPast ? 'Hora pasada' : ''}">
          ${time}
          ${isTaken ? `<span class="slot-dot"></span>` : ''}
        </button>`;
    }).join('');

  } catch {
    hint.textContent = 'Error cargando horarios. Intentá de nuevo.';
    grid.innerHTML   = `
      <div class="empty-state compact">
        <span class="empty-icon">⚠️</span>
        <p class="empty-desc">Error de conexión</p>
        <button class="btn btn-ghost btn-sm" onclick="renderSlotsEnhanced()">↺ Reintentar</button>
      </div>`;
  }
}


/* ── 3.3 renderConfirmModalEnhanced ───────────────────────────── */
function renderConfirmModalEnhanced(booking) {
  const svc   = APP.currentBiz.services.find(s =>
    String(s.id) === String(booking.service_id || booking.serviceId)
  );
  const phone = APP.currentBiz.phone || WHITE_LABEL.app.whatsappNumber;

  document.getElementById('modal-details').innerHTML = `
    <div class="row"><span class="label">👤 Cliente</span>   <span class="value">${booking.name}</span></div>
    <div class="row"><span class="label">📱 Teléfono</span>  <span class="value">${booking.phone}</span></div>
    ${booking.email ? `<div class="row"><span class="label">✉️ Email</span><span class="value">${booking.email}</span></div>` : ''}
    <div class="row"><span class="label">${svc?.icon || '📋'} Servicio</span> <span class="value">${svc?.name || ''}</span></div>
    <div class="row"><span class="label">📅 Fecha</span>     <span class="value">${formatDate(booking.date, WHITE_LABEL.app.locale)}</span></div>
    <div class="row"><span class="label">🕐 Hora</span>      <span class="value"><strong>${booking.time?.substring(0,5)} hs</strong></span></div>
    ${svc?.price ? `<div class="row"><span class="label">💰 Precio</span><span class="value">${formatPrice(svc.price)}</span></div>` : ''}
    ${booking.notes ? `<div class="row"><span class="label">📝 Nota</span><span class="value">${booking.notes}</span></div>` : ''}
  `;

  const msg = buildWhatsAppMessage(booking, svc, APP.currentBiz.name, phone);
  document.getElementById('btn-whatsapp').href =
    'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);

  const modal = document.getElementById('modal-confirm');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  // 🎉 Confetti!
  setTimeout(launchConfetti, 150);
  
  // Guardar nombre y teléfono para la próxima visita
  saveUserData();
  
  // Detener polling ya no hace falta
  stopSlotPolling();
}


/* ── 3.4 handleConfirmEnhanced ────────────────────────────────── */
async function handleConfirmEnhanced() {
  if (_isConfirming) return; // evitar doble click

  const name  = document.getElementById('inp-name').value.trim();
  const phone = document.getElementById('inp-phone').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const notes = document.getElementById('inp-notes').value.trim();

  let ok = true;
  function check(inputId, errId, invalid) {
    const inp = document.getElementById(inputId);
    if (invalid) { setFieldState(inp, errId, false); ok = false; }
    else           setFieldState(inp, errId, true);
  }
  check('inp-name',  'err-name',  name.length < 2);
  check('inp-phone', 'err-phone', phone.replace(/\D/g,'').length < 7);
  if (!ok) return;

  setButtonLoading('btn-confirm', true);
  try {
    const booking = await addBooking(APP.currentBiz.id, {
      serviceId: APP.selectedService.id,
      date:      APP.selectedDate,
      time:      APP.selectedSlot,
      name, phone, email, notes,
    });
    renderConfirmModalEnhanced(booking);
  } catch (err) {
    if (err.message.includes('ya está reservado')) {
      showToast('⚠️ Ese horario acaba de ser tomado. Elegí otro.', 'error');
      await renderSlotsEnhanced();
      hideSection('step-form');
    } else {
      showToast('Error al confirmar: ' + err.message, 'error');
    }
  } finally {
    setButtonLoading('btn-confirm', false);
  }
}


/* ── 3.5 Handlers de eventos mejorados ────────────────────────── */
function handleServiceClickEnhanced(e) {
  const card = e.target.closest('.service-card');
  if (!card) return;
  const svc = APP.currentBiz.services.find(s => String(s.id) === card.dataset.serviceId);
  if (!svc) return;

  APP.selectedService = svc;
  APP.selectedSlot    = null;

  renderServicesEnhanced();
  revealStep('step-datetime', 2);
  if (APP.selectedDate) renderSlotsEnhanced();
  startSlotPolling();
}

async function handleDateChangeEnhanced(e) {
  APP.selectedDate = e.target.value;
  APP.selectedSlot = null;
  await renderSlotsEnhanced();
  updateProgress(2);
}

async function handleSlotClickEnhanced(e) {
  const btn = e.target.closest('.slot-btn');
  if (!btn || btn.disabled) return;
  APP.selectedSlot = btn.dataset.time;
  await renderSlotsEnhanced();
  revealStep('step-form', 3);
  renderSelectionPills();
  loadUserData(); // auto-fill si el usuario ya reservó antes
}

function handleNewBookingEnhanced() {
  document.getElementById('modal-confirm').classList.add('hidden');
  APP.selectedService = null;
  APP.selectedDate    = null;
  APP.selectedSlot    = null;

  ['inp-name','inp-phone','inp-email','inp-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('valid','error'); }
  });
  document.getElementById('date-input').value = '';
  hideSection('step-datetime');
  hideSection('step-form');
  renderServicesEnhanced();
  updateProgress(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ================================================================
   SECCIÓN 4 — BARRA DE PROGRESO (inyectada en el DOM)
================================================================ */
function injectProgressBar() {
  const hero = document.querySelector('.hero');
  if (!hero || document.getElementById('progress-bar-ux')) return;

  const bar  = document.createElement('div');
  bar.id     = 'progress-bar-ux';
  bar.className = 'progress-bar-wrap';
  bar.innerHTML = `
    <div class="progress-step prog-active" data-step="1">
      <div class="prog-dot"><span>1</span></div>
      <div class="prog-label">Servicio</div>
    </div>
    <div class="progress-connector"></div>
    <div class="progress-step prog-inactive" data-step="2">
      <div class="prog-dot"><span>2</span></div>
      <div class="prog-label">Fecha y hora</div>
    </div>
    <div class="progress-connector"></div>
    <div class="progress-step prog-inactive" data-step="3">
      <div class="prog-dot"><span>3</span></div>
      <div class="prog-label">Tus datos</div>
    </div>
  `;
  hero.insertAdjacentElement('afterend', bar);
}


/* ================================================================
   SECCIÓN 5 — ARRANQUE
   Parchea app.js sin reemplazarlo
================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  
  // Esperar a que init() de app.js termine y luego parchear
  const _origInit = window.init;
  window.init = async function () {
    await _origInit?.();
    _boot();
  };

  // Por si DOMContentLoaded ya pasó y init() ya corrió
  // (cuando ux.js se carga tarde)
  if (document.readyState !== 'loading' && typeof APP !== 'undefined' && APP.currentBiz) {
    _boot();
  }

  function _boot() {
    injectProgressBar();
    _patchHandlers();
    setupLiveValidation();

    // Reemplazar renderServices globalmente
    window.renderServices = renderServicesEnhanced;
    
    // Hacer render inicial con la versión mejorada
    if (APP.currentBiz) renderServicesEnhanced();

    // Manejar link de cancelación (?cancel=ID)
    handleCancelFromUrl();
  }

  function _patchHandlers() {
    // Clonar elementos para quitar los event listeners originales de app.js
    const ids = ['services-grid','date-input','slots-grid','btn-confirm','btn-new-booking'];
    const els = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      els[id] = clone;
    });

    els['services-grid']?.addEventListener('click',   handleServiceClickEnhanced);
    els['services-grid']?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') handleServiceClickEnhanced(e);
    });
    els['date-input']?.addEventListener('change',  handleDateChangeEnhanced);
    els['slots-grid']?.addEventListener('click',   handleSlotClickEnhanced);
    els['btn-confirm']?.addEventListener('click',  handleConfirmEnhanced);
    els['btn-new-booking']?.addEventListener('click', handleNewBookingEnhanced);
  }
});