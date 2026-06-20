/**
 * Proyección de clasificados a la fase de eliminación directa.
 *
 * Mientras la fase de grupos sigue en curso, las llaves traen slots con equipos
 * "placeholder" cuyo nombre describe la plaza y vienen sin bandera (`flagCode`
 * vacío). Acá los resolvemos contra la tabla de posiciones actual para
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

// "1º Grupo C", "2º Grupo A" -> [posición, id de grupo].
const DIRECT_RE = /^([1-4])º Grupo ([A-L])$/;
// "3º A/B/C/D/F" -> grupos candidatos para un mejor tercero.
const THIRD_RE = /^3º ([A-L](?:\/[A-L])+)$/;

/** Tercero (posición 3) de un grupo, si existe. */
function thirdOf(group: Group | undefined): Team | undefined {
  return group?.standings.find((s) => s.position === 3)?.team;
}

/**
 * Asigna a cada slot de "mejor tercero" un equipo concreto, sin repetir grupo.
 * Recorre los slots en orden de llave y, para cada uno, toma el 3.º mejor
 * ubicado (más puntos; a igualdad, orden alfabético de grupo) entre sus grupos
 * candidatos que todavía no haya sido usado. Devuelve un mapa slot -> equipo.
 */
function assignThirds(
  rounds: readonly KnockoutRound[],
  byGroup: Map<string, Group>,
): Map<MatchSlot, Team> {
  const out = new Map<MatchSlot, Team>();
  const used = new Set<string>();

  const rank = (letter: string): number => {
    const pts = byGroup.get(letter)?.standings.find((s) => s.position === 3)
      ?.points;
    return pts ?? -1;
  };

  for (const round of rounds) {
    for (const match of round.matches) {
      for (const slot of [match.home, match.away]) {
        if (slot.team.flagCode) continue;
        const m = THIRD_RE.exec(slot.team.name);
        if (!m) continue;
        const candidate = m[1]
          .split('/')
          .filter((g) => !used.has(g) && thirdOf(byGroup.get(g)))
          .sort((a, b) => rank(b) - rank(a) || a.localeCompare(b))[0];
        const team = thirdOf(byGroup.get(candidate));
        if (candidate && team) {
          used.add(candidate);
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
  byGroup: Map<string, Group>,
  thirds: Map<MatchSlot, Team>,
): MatchSlot {
  // Un slot con bandera ya es un equipo real (la fase ya lo definió).
  if (slot.team.flagCode) return slot;
  const direct = DIRECT_RE.exec(slot.team.name);
  if (direct) {
    const row = byGroup
      .get(direct[2])
      ?.standings.find((s) => s.position === Number(direct[1]));
    return row ? { ...slot, team: row.team } : slot;
  }
  const third = thirds.get(slot);
  return third ? { ...slot, team: third } : slot;
}

/** ¿Hay al menos un slot que esta proyección puede completar? */
export function hasProjectableSlots(
  rounds: readonly KnockoutRound[],
  groups: readonly Group[],
): boolean {
  const byGroup = new Map(groups.map((g) => [g.id, g]));
  const thirds = assignThirds(rounds, byGroup);
  return rounds.some((r) =>
    r.matches.some(
      (m) =>
        projectSlot(m.home, byGroup, thirds) !== m.home ||
        projectSlot(m.away, byGroup, thirds) !== m.away,
    ),
  );
}

/**
 * Devuelve las rondas con los slots de plaza directa y de mejor tercero
 * rellenados con el equipo que hoy los ocuparía. Recibe el cuadro completo para
 * poder asignar los terceros sin repetir grupo. Conserva las referencias de lo
 * que no cambia para no romper la detección OnPush.
 */
export function projectQualifiers(
  rounds: readonly KnockoutRound[],
  groups: readonly Group[],
): KnockoutRound[] {
  const byGroup = new Map(groups.map((g) => [g.id, g]));
  const thirds = assignThirds(rounds, byGroup);
  return rounds.map((round) => {
    const matches = round.matches.map((mt) => {
      const home = projectSlot(mt.home, byGroup, thirds);
      const away = projectSlot(mt.away, byGroup, thirds);
      return home === mt.home && away === mt.away ? mt : { ...mt, home, away };
    });
    return matches.every((m, i) => m === round.matches[i])
      ? round
      : { ...round, matches };
  });
}
