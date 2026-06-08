// Asigna fecha y hora (UTC, ISO 8601) a cada partido de la fase de grupos.
// Distribuye los partidos de cada grupo en jornadas a partir de la fecha real
// de apertura del Mundial. Las horas son sintéticas.
//
// Uso: node scripts/gen-kickoffs.mjs <archivo.json>
import { readFileSync, writeFileSync } from 'node:fs';

// Fecha de apertura (UTC) de la fase de grupos por edición.
const OPENING = {
  1930: '1930-07-13', 1934: '1934-05-27', 1938: '1938-06-04',
  1950: '1950-06-24', 1954: '1954-06-16', 1958: '1958-06-08',
  1962: '1962-05-30', 1966: '1966-07-11', 1970: '1970-05-31',
  1974: '1974-06-13', 1978: '1978-06-01', 1982: '1982-06-13',
  1986: '1986-05-31', 1990: '1990-06-08', 1994: '1994-06-17',
  1998: '1998-06-10', 2002: '2002-05-31', 2006: '2006-06-09',
  2010: '2010-06-11', 2014: '2014-06-12', 2018: '2018-06-14',
  2022: '2022-11-20', 2026: '2026-06-11',
};

const file = process.argv[2];
const d = JSON.parse(readFileSync(file, 'utf8'));
const start = OPENING[d.year];
if (!start) {
  console.log(`${file}: sin fecha de apertura para ${d.year}, omitido`);
  process.exit(0);
}
const base = Date.parse(start + 'T00:00:00Z');
const DAY = 86400000;
const HOUR = 3600000;

let count = 0;
function assign(groups, dayOffset) {
  (groups ?? []).forEach((g, gi) => {
    if (!g.matches) return;
    g.matches.forEach((m, mi) => {
      const matchday = Math.floor(mi / 2); // 2 partidos por jornada
      const day = dayOffset + matchday * 4; // jornadas cada 4 días
      const hour = 13 + (mi % 2) * 3 + (gi % 3); // 13..19 UTC
      const ts = base + day * DAY + hour * HOUR;
      m.kickoff = new Date(ts).toISOString();
      count++;
    });
  });
}

// Fase de grupos inicial y, después, la liguilla posterior (2da fase / ronda
// final) con ~16 días de offset.
assign(d.groups, 0);
assign(d.finalRound?.groups, 16);
writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
console.log(`${file}: kickoffs asignados=${count}`);
