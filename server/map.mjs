// Traduce datos en vivo de football-data.org (v4) a la forma `Edition` que
// consume el frontend, mergeándolos sobre la plantilla estática (estructura de
// grupos, kickoffs, bracket). La plantilla manda en estructura/nombres/banderas;
// el upstream solo aporta marcadores, partidos jugados y puntos.

import { CODE_TO_ID, NAME_TO_ID, NAME_KEYS } from '../scripts/fifa-codes.mjs';

/**
 * Resuelve el id interno (ISO alpha-2 minúscula) de un equipo de la API.
 * Intenta por TLA (código 3 letras), luego por nombre exacto, luego subcadena.
 * @returns {string | null}
 */
export function resolveTeamId(apiTeam) {
  if (!apiTeam) return null;
  const tla = (apiTeam.tla || '').toUpperCase();
  if (tla && CODE_TO_ID[tla]) return CODE_TO_ID[tla];
  const name = (apiTeam.name || '').toLowerCase().trim();
  if (NAME_TO_ID[name]) return NAME_TO_ID[name];
  const short = (apiTeam.shortName || '').toLowerCase().trim();
  if (NAME_TO_ID[short]) return NAME_TO_ID[short];
  for (const key of NAME_KEYS) {
    if (name.includes(key)) return NAME_TO_ID[key];
  }
  return null;
}

/** Clave no ordenada para un par de equipos (sirve de índice de partido). */
function pairKey(idA, idB) {
  return [idA, idB].sort().join('|');
}

/** ¿El partido tiene un marcador utilizable? */
function hasScore(apiMatch) {
  const ft = apiMatch?.score?.fullTime;
  return ft != null && ft.home != null && ft.away != null;
}

/** Un partido se considera "jugado" si terminó o está en curso con marcador. */
function isPlayed(apiMatch) {
  const status = apiMatch?.status;
  if (status === 'FINISHED') return true;
  if ((status === 'IN_PLAY' || status === 'PAUSED') && hasScore(apiMatch)) {
    return true;
  }
  return false;
}

/** Mapea el status de football-data a nuestro `MatchStatus`. */
function mapStatus(status) {
  switch (status) {
    case 'FINISHED':
    case 'AWARDED':
      return 'finished';
    case 'IN_PLAY':
      return 'live';
    case 'PAUSED': // entretiempo
      return 'paused';
    default:
      return 'scheduled'; // TIMED / SCHEDULED / etc.
  }
}

/** Letra de grupo a partir del campo `group` de la API (ej. "GROUP_A" -> "A"). */
function groupLetter(group) {
  if (!group) return null;
  const m = String(group).match(/([A-L])\s*$/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Mergea datos en vivo sobre la edición base.
 * @param {object} base   Edition estática (se clona, no se muta).
 * @param {{ matches?: any[], standings?: any[] }} live  Respuestas de la API.
 * @returns {{ edition: object, stats: object }}
 */
export function buildLiveEdition(base, live = {}) {
  const edition = structuredClone(base);
  const stats = {
    matchedMatches: 0,
    unmatchedApiMatches: [],
    unresolvedTeams: new Set(),
    groupsWithStandings: 0,
  };

  // Índice de partidos por par de equipos: fase de grupos + eliminación +
  // tercer puesto. Los slots de eliminación con equipos placeholder ("1º Grupo
  // A") simplemente no matchean hasta que se resuelven los equipos reales.
  const matchByPair = new Map();
  const indexMatch = (m) => {
    if (m?.home?.team?.id && m?.away?.team?.id) {
      matchByPair.set(pairKey(m.home.team.id, m.away.team.id), m);
    }
  };
  for (const group of edition.groups ?? []) {
    for (const m of group.matches ?? []) indexMatch(m);
  }
  for (const round of edition.knockout?.rounds ?? []) {
    for (const m of round.matches ?? []) indexMatch(m);
  }
  indexMatch(edition.thirdPlace);

  // 1) Marcadores de partidos.
  for (const am of live.matches ?? []) {
    if (!hasScore(am)) continue;
    const homeId = resolveTeamId(am.homeTeam);
    const awayId = resolveTeamId(am.awayTeam);
    if (!homeId) stats.unresolvedTeams.add(am.homeTeam?.name ?? '??');
    if (!awayId) stats.unresolvedTeams.add(am.awayTeam?.name ?? '??');
    if (!homeId || !awayId) continue;

    const match = matchByPair.get(pairKey(homeId, awayId));
    if (!match) {
      stats.unmatchedApiMatches.push(`${am.homeTeam?.name} vs ${am.awayTeam?.name}`);
      continue;
    }

    const ft = am.score.fullTime;
    const pens = am.score.penalties ?? {};
    // Orientar el marcador según el lado real de la plantilla (la API puede
    // tener home/away invertidos respecto a nuestro fixture).
    const apiHomeIsBaseHome = match.home.team.id === homeId;
    match.home = {
      ...match.home,
      score: apiHomeIsBaseHome ? ft.home : ft.away,
      ...(pens.home != null && pens.away != null
        ? { penalties: apiHomeIsBaseHome ? pens.home : pens.away }
        : {}),
    };
    match.away = {
      ...match.away,
      score: apiHomeIsBaseHome ? ft.away : ft.home,
      ...(pens.home != null && pens.away != null
        ? { penalties: apiHomeIsBaseHome ? pens.away : pens.home }
        : {}),
    };
    match.played = isPlayed(am);
    match.status = mapStatus(am.status);
    if (am.minute != null) match.minute = Number(am.minute);
    stats.matchedMatches++;
  }

  // 2) Tabla de posiciones: puntos + orden por posición de la API.
  const groupsById = new Map((edition.groups ?? []).map((g) => [g.id, g]));
  for (const table of live.standings ?? []) {
    // football-data: standings[] con { stage, type, group, table[] }.
    if (table.type && table.type !== 'TOTAL') continue;
    const letter = groupLetter(table.group);
    if (!letter) continue;
    const group = groupsById.get(letter);
    if (!group) continue;

    const byId = new Map(group.standings.map((s) => [s.team.id, s]));
    const reordered = [];
    let position = 1;
    for (const row of table.table ?? []) {
      const teamId = resolveTeamId(row.team);
      if (!teamId) {
        stats.unresolvedTeams.add(row.team?.name ?? '??');
        continue;
      }
      const base = byId.get(teamId);
      if (!base) continue;
      reordered.push({ ...base, position: position++, points: row.points ?? 0 });
      byId.delete(teamId);
    }
    // Equipos no presentes en la tabla de la API conservan su fila original.
    for (const leftover of byId.values()) {
      reordered.push({ ...leftover, position: position++ });
    }
    if (reordered.length) {
      group.standings = reordered;
      stats.groupsWithStandings++;
    }
  }

  return {
    edition,
    stats: { ...stats, unresolvedTeams: [...stats.unresolvedTeams] },
  };
}
