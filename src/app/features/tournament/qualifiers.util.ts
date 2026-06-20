/**
 * Proyección de clasificados a la fase de eliminación directa.
 *
 * Mientras la fase de grupos sigue en curso, las llaves traen slots con equipos
 * "placeholder" cuyo nombre describe la plaza y vienen sin bandera (`flagCode`
 * vacío). Acá los resolvemos contra la tabla en vivo de cada grupo —calculada
 * desde los partidos que manda el backend, no desde la siembra— para
 * previsualizar quién avanzaría:
 *
 *  - Plaza directa: "1º Grupo C", "2º Grupo A" -> el equipo en esa posición.
 *  - Mejor tercero: "3º A/B/C/D/F" -> uno de los 3.º de esos grupos. La plaza
 *    real depende de una tabla combinatoria de la FIFA que no podemos inferir;
 *    acá hacemos una asignación plausible y *única* (cada 3.º ocupa una sola
 *    llave) eligiendo, por orden de llave, el mejor 3.º disponible entre los
 *    grupos candidatos.
 *
 * Sigue siendo una proyección parcial: las rondas posteriores ("Ganador P73")
 * no se pueden inferir de la tabla y quedan como están.
 */

import {
  Group,
  KnockoutRound,
  MatchSlot,
  Team,
} from '../../core/models/tournament.model';
import { computeGroupRows, GroupRow } from './standings.util';

// "1º Grupo C", "2º Grupo A" -> [posición, id de grupo].
const DIRECT_RE = /^([1-4])º Grupo ([A-L])$/;
// "3º A/B/C/D/F" -> grupos candidatos para un mejor tercero.
const THIRD_RE = /^3º ([A-L](?:\/[A-L])+)$/;

/** Tabla en vivo por grupo, calculada una sola vez por proyección. */
function tablesByGroup(groups: readonly Group[]): Map<string, GroupRow[]> {
  return new Map(groups.map((g) => [g.id, computeGroupRows(g)]));
}

/** Equipo en una posición concreta de la tabla de un grupo. */
function teamAt(rows: GroupRow[] | undefined, position: number): Team | undefined {
  return rows?.find((r) => r.position === position)?.team;
}

/** Fila del tercero de un grupo (para rankear entre grupos candidatos). */
function thirdRow(rows: GroupRow[] | undefined): GroupRow | undefined {
  return rows?.find((r) => r.position === 3);
}

/**
 * Asigna a cada slot de "mejor tercero" un equipo concreto, sin repetir grupo.
 * Recorre los slots en orden de llave y, para cada uno, toma el 3.º mejor
 * ubicado (puntos, dif. de gol) entre sus grupos candidatos que todavía no haya
 * sido usado. Devuelve un mapa slot -> equipo.
 */
function assignThirds(
  rounds: readonly KnockoutRound[],
  tables: Map<string, GroupRow[]>,
): Map<MatchSlot, Team> {
  const out = new Map<MatchSlot, Team>();
  const used = new Set<string>();

  const rankOf = (letter: string): number => {
    const r = thirdRow(tables.get(letter));
    return r ? r.points * 1000 + r.gd : -Infinity;
  };

  for (const round of rounds) {
    for (const match of round.matches) {
      for (const slot of [match.home, match.away]) {
        if (slot.team.flagCode) continue;
        const m = THIRD_RE.exec(slot.team.name);
        if (!m) continue;
        const letter = m[1]
          .split('/')
          .filter((g) => !used.has(g) && thirdRow(tables.get(g)))
          .sort((a, b) => rankOf(b) - rankOf(a) || a.localeCompare(b))[0];
        const team = teamAt(tables.get(letter), 3);
        if (letter && team) {
          used.add(letter);
          out.set(slot, team);
        }
      }
    }
  }
  return out;
}

/** Resuelve un slot placeholder; si no aplica, lo devuelve igual. */
function projectSlot(
  slot: MatchSlot,
  tables: Map<string, GroupRow[]>,
  thirds: Map<MatchSlot, Team>,
): MatchSlot {
  // Un slot con bandera ya es un equipo real (la fase ya lo definió).
  if (slot.team.flagCode) return slot;
  const direct = DIRECT_RE.exec(slot.team.name);
  if (direct) {
    const team = teamAt(tables.get(direct[2]), Number(direct[1]));
    return team ? { ...slot, team } : slot;
  }
  const third = thirds.get(slot);
  return third ? { ...slot, team: third } : slot;
}

/** ¿Hay al menos un slot que esta proyección puede completar? */
export function hasProjectableSlots(
  rounds: readonly KnockoutRound[],
  groups: readonly Group[],
): boolean {
  const tables = tablesByGroup(groups);
  const thirds = assignThirds(rounds, tables);
  return rounds.some((r) =>
    r.matches.some(
      (m) =>
        projectSlot(m.home, tables, thirds) !== m.home ||
        projectSlot(m.away, tables, thirds) !== m.away,
    ),
  );
}

/**
 * Devuelve las rondas con los slots de plaza directa y de mejor tercero
 * rellenados con el equipo que hoy los ocuparía según la tabla en vivo. Recibe
 * el cuadro completo para asignar los terceros sin repetir grupo. Conserva las
 * referencias de lo que no cambia para no romper la detección OnPush.
 */
export function projectQualifiers(
  rounds: readonly KnockoutRound[],
  groups: readonly Group[],
): KnockoutRound[] {
  const tables = tablesByGroup(groups);
  const thirds = assignThirds(rounds, tables);
  return rounds.map((round) => {
    const matches = round.matches.map((mt) => {
      const home = projectSlot(mt.home, tables, thirds);
      const away = projectSlot(mt.away, tables, thirds);
      return home === mt.home && away === mt.away ? mt : { ...mt, home, away };
    });
    return matches.every((m, i) => m === round.matches[i])
      ? round
      : { ...round, matches };
  });
}
