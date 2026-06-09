// Aplica kickoffs reales (UTC, ISO 8601) a una edición a partir de un mapa
// id-de-partido -> ISO UTC ubicado en scripts/kickoffs/<year>.json.
//
// El mapa solo necesita los ids que se quieran fijar; los partidos no listados
// quedan sin tocar. Recorre fase de grupos, liguilla posterior (finalRound),
// llave de eliminatorias (knockout) y partido por el tercer puesto.
//
// Uso: node scripts/apply-kickoffs.mjs public/mock/tournaments/world-cup-2022.json
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file) {
  console.error('falta el archivo de la edición');
  process.exit(1);
}

const d = JSON.parse(readFileSync(file, 'utf8'));
const mapPath = join(here, 'kickoffs', `${d.year}.json`);
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

let applied = 0;
const missing = [];

function setOne(m) {
  if (!m || !m.id) return;
  const iso = map[m.id];
  if (iso === undefined) {
    missing.push(m.id);
    return;
  }
  m.kickoff = iso;
  applied++;
}

function setGroups(groups) {
  (groups ?? []).forEach((g) => (g.matches ?? []).forEach(setOne));
}

setGroups(d.groups);
setGroups(d.finalRound?.groups);
(d.knockout?.rounds ?? []).forEach((r) => (r.matches ?? []).forEach(setOne));
if (d.thirdPlace) setOne(d.thirdPlace);

writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
console.log(`${file}: kickoffs aplicados=${applied}`);
if (missing.length) {
  console.log(`  sin entrada en el mapa (${missing.length}): ${missing.join(', ')}`);
}
