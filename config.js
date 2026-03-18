/* ================================================================
   config.js — CONFIGURACIÓN WHITE LABEL
   
   Este es el ÚNICO archivo que cambiás para adaptar el sistema
   a un nuevo cliente. El resto del código nunca se toca.
   
   PARA VENDER A UN NUEVO CLIENTE:
   1. Duplicás la carpeta del proyecto
   2. Editás solo este archivo
   3. Subís a hosting (Netlify, Vercel, etc. — gratis)
   4. Listo: el cliente tiene su propio sistema con su marca
================================================================ */

const WHITE_LABEL = {
  product: {
    name:    'Turnos',
    version: '3.0.0',
  },
  activeBusinessId: "biz_001", // null = multi-negocio
  app: {
    whatsappNumber: '5493513824513',
    maxAdvanceDays: 30,
    showPrices:     true,
    showDuration:   true,
    welcomeMessage: 'Reservá tu turno de forma rápida y sencilla',
    locale:         'es-AR',
    adminPassword:  '1234',
  },
};