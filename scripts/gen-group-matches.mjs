// Genera partidos de fase de grupos consistentes con los puntos de cada tabla.
// Busca por fuerza bruta una combinación de resultados (V/E/D) cuyos puntos
// reproduzcan exactamente standings.points, dado el valor de victoria (2 o 3).
// Solo opera sobre grupos de `groups` que aún no tienen `matches`.
//
// Uso: node scripts/gen-group-matches.mjs <archivo.json> <puntosPorVictoria>
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const ppw = Number(process.argv[3] ?? 3);
const d = JSON.parse(readFileSync(file, 'utf8'));

function solve(points) {
  const n = points.length;
  const pairs = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) pairs.push([i, j]);

  const W = new Array(n).fill(0);
  const D = new Array(n).fill(0);
  const L = new Array(n).fill(0);
  let solution = null;

  function rec(k) {
    if (solution) return;
    if (k === pairs.length) {
      for (let t = 0; t < n; t++) if (ppw * W[t] + D[t] !== points[t]) return;
      solution = pairs.map((p, idx) => [p[0], p[1], outcomes[idx]]);
      return;
    }
    const [i, j] = pairs[k];
    for (const o of [0, 1, 2]) {
      // poda: no exceder puntos
      if (o === 0) { W[i]++; } else if (o === 1) { W[j]++; } else { D[i]++; D[j]++; }
      if (o === 0) L[j]++; else if (o === 1) L[i]++;
      if (ppw * W[i] + D[i] <= points[i] && ppw * W[j] + D[j] <= points[j]) {
        outcomes[k] = o;
        rec(k + 1);
      }
      if (o === 0) { W[i]--; L[j]--; } else if (o === 1) { W[j]--; L[i]--; } else { D[i]--; D[j]--; }
    }
  }
  const outcomes = new Array(pairs.length).fill(0);
  rec(0);
  return solution;
}

let changed = 0;
let failed = 0;
for (const g of d.groups ?? []) {
  if (g.matches) continue;
  const teams = g.standings.map((s) => s.team);
  const points = g.standings.map((s) => s.points);
  const sol = solve(points);
  if (!sol) {
    console.log(`SIN SOLUCION ${g.name} (puntos ${points.join(',')})`);
    failed++;
    continue;
  }
  let m = 0;
  g.matches = sol.map(([i, j, o]) => {
    m++;
    // home = equipo mejor ubicado para que la dif. de goles acompañe el orden
    const [hs, as] = o === 0 ? [2, 0] : o === 1 ? [0, 2] : [1, 1];
    return {
      id: `g${g.id}${m}`,
      played: true,
      home: { team: teams[i], score: hs },
      away: { team: teams[j], score: as },
    };
  });
  changed++;
}
writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
console.log(`${file}: grupos generados=${changed} fallidos=${failed}`);
