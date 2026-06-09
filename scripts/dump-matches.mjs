// Vuelca los partidos de una edición: id, ronda, local vs visitante (ids+nombres)
// y kickoff actual. Sirve para mapear fixtures reales a ids al armar el mapa de
// kickoffs.
//
// Uso: node scripts/dump-matches.mjs public/mock/tournaments/world-cup-2022.json
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rows = [];

function push(round, m) {
  rows.push(
    `${m.id}\t${round}\t${m.home.team.id} (${m.home.team.name}) vs ${m.away.team.id} (${m.away.team.name})\t${m.kickoff ?? '-'}`,
  );
}

(d.groups ?? []).forEach((g) =>
  (g.matches ?? []).forEach((m) => push(`G${g.id}`, m)),
);
(d.finalRound?.groups ?? []).forEach((g) =>
  (g.matches ?? []).forEach((m) => push(`F${g.id}`, m)),
);
(d.knockout?.rounds ?? []).forEach((r) =>
  (r.matches ?? []).forEach((m) => push(r.id, m)),
);
if (d.thirdPlace) push('3rd', d.thirdPlace);

console.log(rows.join('\n'));
