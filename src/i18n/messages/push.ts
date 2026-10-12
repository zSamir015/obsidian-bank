import type { Locale } from '../locales'

// Copy for the browser notifications option (#40). Kept out of the main catalogues because
// only the Notifications screen uses it: the English catalogue ships with the first
// JavaScript, and every byte there counts against the first paint.

const en = {
  title: 'Browser notifications',
  intro: 'Get a notification on this device when a payment is placed under review, even with the app closed.',
  turnOn: 'Turn on browser notifications',
  turnOff: 'Turn off',
  sendTest: 'Send a test notification',
  on: 'On for this device. Notifications show the merchant, the amount and the last four digits of the card, nothing else.',
  turnedOn: 'Browser notifications are on.',
  turnedOff: 'Browser notifications are off.',
  testSent: 'Test notification sent.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser settings to turn them on.',
  unsupported:
    "This browser can't show notifications from the demo. On an iPhone or iPad, add the app to your home screen first.",
  failed: "Couldn't change browser notifications. Check your connection and try again.",
  testFailed: "Couldn't send the test notification. Try again in a moment.",
}

export type PushMessages = { readonly [K in keyof typeof en]: string }

export const pushMessages: Record<Locale, PushMessages> = {
  en,
  es: {
    title: 'Notificaciones del navegador',
    intro: 'Recibe una notificación en este dispositivo cuando un pago quede en revisión, incluso con la app cerrada.',
    turnOn: 'Activar notificaciones del navegador',
    turnOff: 'Desactivar',
    sendTest: 'Enviar una notificación de prueba',
    on: 'Activadas en este dispositivo. Las notificaciones muestran el comercio, el monto y los últimos cuatro dígitos de la tarjeta, nada más.',
    turnedOn: 'Las notificaciones del navegador están activadas.',
    turnedOff: 'Las notificaciones del navegador están desactivadas.',
    testSent: 'Notificación de prueba enviada.',
    blocked:
      'Las notificaciones están bloqueadas para este sitio. Permítelas en los ajustes del navegador para activarlas.',
    unsupported:
      'Este navegador no puede mostrar notificaciones de la demo. En un iPhone o iPad, primero agrega la app a tu pantalla de inicio.',
    failed: 'No se pudieron cambiar las notificaciones del navegador. Revisa tu conexión e inténtalo de nuevo.',
    testFailed: 'No se pudo enviar la notificación de prueba. Inténtalo de nuevo en un momento.',
  },
}
