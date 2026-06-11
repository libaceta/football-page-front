/**
 * Environment de producción. El backend corre en el EC2 detrás de nginx:
 * `https://pampa-net.com/football/` → `football_server/api/`.
 * (CORS habilitado en el server para permitir el origen del frontend.)
 */
export const environment = {
  production: true,
  /** URL base del backend en vivo. Sin slash final. */
  liveBaseUrl: 'https://pampa-net.com/football',
};
