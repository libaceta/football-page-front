import { InjectionToken } from '@angular/core';

/**
 * Configuración de acceso al backend.
 *
 * En esta primera etapa `baseUrl` apunta a fixtures JSON estáticos servidos
 * desde `public/mock`. Para conectar el backend real basta con cambiar este
 * valor (idealmente desde un environment), sin tocar el resto del código.
 */
export interface ApiConfig {
  /** URL base de la API. Sin slash final. */
  readonly baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export const defaultApiConfig: ApiConfig = {
  baseUrl: '/mock',
};
