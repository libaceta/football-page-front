/**
 * Modelo de dominio de torneos.
 *
 * Diseñado para soportar tanto formato copa (grupos + eliminatorias, como el
 * Mundial) como formato liga (tabla de posiciones) a futuro. Esta primera etapa
 * solo usa el formato copa, pero las interfaces ya contemplan la liga para no
 * tener que rediseñar cuando se agreguen Libertadores, Champions o ligas locales.
 */

export type TournamentType =
  | 'world-cup'
  | 'libertadores'
  | 'champions'
  | 'league';

export type TournamentFormat = 'cup' | 'league';

export type KnockoutRoundName =
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter'
  | 'semi'
  | 'final';

export type BracketSide = 'left' | 'right';

/** Equipo / selección participante. */
export interface Team {
  readonly id: string;
  readonly name: string;
  /** Código ISO 3166 (alpha-2 para banderas emoji, ej. "AR", "FR"). */
  readonly flagCode: string;
}

/** Un slot de un partido: equipo más su marcador (si se jugó). */
export interface MatchSlot {
  readonly team: Team;
  readonly score?: number;
  /** Penales convertidos, si el partido se definió desde el punto. */
  readonly penalties?: number;
  /** Tarjetas rojas recibidas por el equipo en este partido. Ausente => 0. */
  readonly redCards?: number;
}

/** Estado de un partido en vivo. Ausente => programado / sin dato. */
export type MatchStatus = 'scheduled' | 'live' | 'paused' | 'finished';

export interface Match {
  readonly id: string;
  readonly home: MatchSlot;
  readonly away: MatchSlot;
  readonly played: boolean;
  /** Fecha y hora de inicio en ISO 8601 UTC (ej. "2026-06-11T19:00:00Z"). */
  readonly kickoff?: string;
  /** Estado en vivo (de la fuente de datos en tiempo real). */
  readonly status?: MatchStatus;
  /** Minuto transcurrido cuando está en vivo (ej. 34). */
  readonly minute?: number;
  /** Reloj en vivo como lo da la fuente (ej. "67'", "45'+3'"). Preferido sobre `minute`. */
  readonly clock?: string;
}

/** Una fila de la tabla de un grupo. */
export interface GroupStanding {
  readonly position: number;
  readonly team: Team;
  readonly points: number;
}

export interface Group {
  readonly id: string;
  /** Nombre visible, ej. "GRUPO A". */
  readonly name: string;
  readonly standings: readonly GroupStanding[];
  /** Partidos de la fase de grupos (round-robin). Opcional. */
  readonly matches?: readonly Match[];
}

/**
 * Fase de liguilla posterior a la fase de grupos inicial. Usada por formatos
 * históricos sin cuadro estándar: ronda final de 1950 (un grupo), segunda fase
 * de grupos de 1974/1978 (dos grupos) y de 1982 (cuatro grupos).
 */
export interface FinalRound {
  /** Etiqueta de la fase, ej. "RONDA FINAL" o "SEGUNDA FASE". */
  readonly name: string;
  readonly groups: readonly Group[];
}

export interface KnockoutRound {
  readonly id: string;
  readonly name: KnockoutRoundName;
  /** Lado del bracket. Ausente para la final. */
  readonly side?: BracketSide;
  readonly matches: readonly Match[];
}

export interface KnockoutBracket {
  readonly rounds: readonly KnockoutRound[];
}

/** Una edición concreta de un torneo (ej. Mundial 2026). */
export interface Edition {
  readonly id: string;
  readonly year: number;
  readonly format: TournamentFormat;
  /** Id del equipo campeón (resuelto contra `teams` por la UI). */
  readonly championTeamId: string;
  readonly groups?: readonly Group[];
  /** Fase de liguilla posterior (1950 ronda final, 2da fase 1974/78/82). */
  readonly finalRound?: FinalRound;
  readonly knockout?: KnockoutBracket;
  /** Partido por el tercer puesto. */
  readonly thirdPlace?: Match;
  /** Tabla de posiciones (formato liga). Aún sin usar. */
  readonly standings?: readonly GroupStanding[];
}

export interface EditionRef {
  readonly id: string;
  readonly year: number;
  /** Nombre del campeón, para mostrar en el selector de ediciones. */
  readonly championName?: string;
}

/** Metadatos de un torneo y sus ediciones disponibles. */
export interface Tournament {
  readonly id: string;
  readonly name: string;
  readonly type: TournamentType;
  readonly editions: readonly EditionRef[];
}
