/**
 * Cálculo de la tabla de un grupo a partir de los partidos jugados.
 *
 * Las `standings` que vienen en la edición son solo la siembra (orden inicial,
 * puntos 0): el backend en vivo manda los partidos con marcador pero NO recalcula
 * la tabla. Acá derivamos la tabla real (puntos, diferencia de gol, posición)
 * desde esos resultados, para que tanto el panel de grupo como la proyección de
 * clasificados al cuadro usen la misma fuente de verdad.
 */

import { Group, Team } from '../../core/models/tournament.model';

export interface GroupRow {
  readonly team: Team;
  /** Posición recalculada (1..n) según los partidos jugados. */
  readonly position: number;
  /** Posición de siembra original (desempate estable / grupo sin empezar). */
  readonly seedPosition: number;
  /** Puntos: 3·G + E si hay partidos contados; si no, los de la siembra. */
  readonly points: number;
  /** Partidos jugados. */
  readonly j: number;
  readonly gf: number;
  readonly ga: number;
  /** Diferencia de goles. */
  readonly gd: number;
  readonly w: number;
  readonly d: number;
  readonly l: number;
}

/**
 * Devuelve las filas del grupo ordenadas por la tabla en vivo (puntos, dif. de
 * gol, goles a favor, y siembra como desempate estable). Si todavía no hay
 * ningún partido contado (grupo sin empezar o edición histórica sin marcadores),
 * respeta el orden y los puntos de la siembra.
 */
export function computeGroupRows(group: Group): GroupRow[] {
  const acc = new Map<
    string,
    { j: number; gf: number; ga: number; w: number; d: number; l: number }
  >();
  for (const s of group.standings) {
    acc.set(s.team.id, { j: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 });
  }
  for (const m of group.matches ?? []) {
    if (!m.played || m.home.score == null || m.away.score == null) continue;
    const h = acc.get(m.home.team.id);
    const a = acc.get(m.away.team.id);
    if (!h || !a) continue;
    const hs = m.home.score;
    const as = m.away.score;
    h.j++; a.j++;
    h.gf += hs; h.ga += as;
    a.gf += as; a.ga += hs;
    if (hs > as) { h.w++; a.l++; }
    else if (as > hs) { a.w++; h.l++; }
    else { h.d++; a.d++; }
  }

  const anyPlayed = [...acc.values()].some((t) => t.j > 0);

  const base: GroupRow[] = group.standings.map((s) => {
    const t = acc.get(s.team.id)!;
    return {
      team: s.team,
      position: s.position,
      seedPosition: s.position,
      points: anyPlayed ? 3 * t.w + t.d : s.points,
      j: t.j, gf: t.gf, ga: t.ga, gd: t.gf - t.ga, w: t.w, d: t.d, l: t.l,
    };
  });

  if (!anyPlayed) return base;

  return [...base]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.seedPosition - b.seedPosition,
    )
    .map((row, i) => ({ ...row, position: i + 1 }));
}
