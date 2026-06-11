import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Configuración de acceso al backend.
 *
 * En esta primera etapa `baseUrl` apunta a fixtures JSON estáticos servidos
 * desde `public/mock`. Para conectar el backend real basta con cambiar este
 * valor (idealmente desde un environment), sin tocar el resto del código.
 */
export interface ApiConfig {
  /** URL base de fixtures estáticos (ediciones históricas). Sin slash final. */
  readonly baseUrl: string;
  /** URL base del backend en vivo (proxy a football-data.org). Sin slash final. */
  readonly liveBaseUrl: string;
  /** Ids de edición servidos en vivo con polling (resto: estático). */
  readonly liveEditions: readonly string[];
  /** Intervalo de polling en ms para ediciones en vivo. */
  readonly pollIntervalMs: number;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export const defaultApiConfig: ApiConfig = {
  baseUrl: '/mock',
  // Dev: '/api' (proxy a localhost:3000). Prod: backend en EC2 (pampa-net.com/football).
  liveBaseUrl: environment.liveBaseUrl,
  liveEditions: ['world-cup-2026'],
  pollIntervalMs: 45_000,
};
