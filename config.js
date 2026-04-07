const WHITE_LABEL = {
  product: {
    name:    'Turnos',
    version: '4.0.0',
  },
  activeBusinessId: null,
  app: {
   whatsappNumber: '5493512002732',
    maxAdvanceDays: 30,
    showPrices:     true,
    showDuration:   true,
    welcomeMessage: 'Reservá tu turno de forma rápida y sencilla',
    locale:         'es-AR',
    adminPassword:  '1234',
  },
};

function getBarberIdFromUrl() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  return parts[0] || null;
}

const BARBER_ID = getBarberIdFromUrl();
if (BARBER_ID) WHITE_LABEL.activeBusinessId = BARBER_ID;