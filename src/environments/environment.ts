/**
 * Environment de desarrollo. `ng serve` usa el proxy (`proxy.conf.json`) para
 * reenviar `/api` al backend local (localhost:3000).
 */
export const environment = {
  production: false,
  /** URL base del backend en vivo. Sin slash final. */
  liveBaseUrl: '/api',
};
