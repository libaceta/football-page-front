// Verifica que los partidos de cada grupo reproduzcan los puntos de la tabla.
// Uso: node scripts/verify-groups.mjs public/mock/tournaments/world-cup-2018.json
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const d = JSON.parse(readFileSync(file, 'utf8'));
let bad = 0;
let withMatches = 0;
for (const g of d.groups ?? []) {
  if (!g.matches) continue;
  withMatches++;
  const exp = {};
  const pts = {};
  for (const s of g.standings) {
    exp[s.team.id] = s.points;
    pts[s.team.id] = 0;
  }
  for (const m of g.matches) {
    const h = m.home, a = m.away;
    if (h.score > a.score) pts[h.team.id] += 3;
    else if (a.score > h.score) pts[a.team.id] += 3;
    else { pts[h.team.id] += 1; pts[a.team.id] += 1; }
  }
  for (const id in exp) {
    if (exp[id] !== pts[id]) {
      console.log(`MISMATCH ${file} ${g.name} ${id}: tabla=${exp[id]} partidos=${pts[id]}`);
      bad++;
    }
  }
  const n = g.standings.length;
  const expected = (n * (n - 1)) / 2;
  if (g.matches.length !== expected) {
    console.log(`WARN ${file} ${g.name}: partidos=${g.matches.length} esperados=${expected}`);
  }
}
console.log(`${file}: grupos con partidos=${withMatches} ${bad ? 'BAD ' + bad : 'OK'}`);
process.exit(bad ? 1 : 0);
