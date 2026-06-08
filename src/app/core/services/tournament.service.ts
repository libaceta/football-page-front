import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { Edition, Tournament, TournamentType } from '../models/tournament.model';

/**
 * Fuente de datos de torneos. La implementación actual lee fixtures JSON
 * mockeados vía HttpClient; al apuntar `API_CONFIG.baseUrl` a un backend real
 * el resto de la app no cambia.
 */
export interface TournamentDataSource {
  /** Metadatos del torneo y sus ediciones disponibles. */
  getTournament(type: TournamentType): Observable<Tournament>;
  getEdition(type: TournamentType, year: number): Observable<Edition>;
}

@Injectable({ providedIn: 'root' })
export class TournamentService implements TournamentDataSource {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getTournament(type: TournamentType): Observable<Tournament> {
    const url = `${this.config.baseUrl}/tournaments/${type}.json`;
    return this.http.get<Tournament>(url);
  }

  getEdition(type: TournamentType, year: number): Observable<Edition> {
    const url = `${this.config.baseUrl}/tournaments/${type}-${year}.json`;
    return this.http.get<Edition>(url);
  }
}
