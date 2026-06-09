// Construye el mapa de kickoffs (UTC ISO) de una edición a partir de las
// plantillas {{Football box}} de Wikipedia.
//
// Lee una receta en scripts/recipes/<year>.json:
//   {
//     "offset": 3,                       // huso local por defecto (horas, UTC+N)
//     "venueOffsets": { "Manaus": -4 },  // override por subcadena de sede
//     "pages": [
//       { "title": "2022 FIFA World Cup Group A", "bucket": "group" },
//       { "title": "2022 FIFA World Cup knockout stage", "bucket": "knockout" }
//     ]
//   }
// buckets: "group" (d.groups), "final" (d.finalRound), "knockout"
// (d.knockout + thirdPlace).
//
// Descarga y cachea el wikitext en scripts/cache/. Empareja cada fixture con un
// partido del JSON por el par (no ordenado) de ids de equipo dentro del mismo
// bucket. Escribe scripts/kickoffs/<year>.json y reporta no emparejados.
//
// Uso: node scripts/build-kickoffs.mjs <year>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CODE_TO_ID, NAME_TO_ID, NAME_KEYS } from './fifa-codes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const year = process.argv[2];
if (!year) { console.error('uso: build-kickoffs.mjs <year>'); process.exit(1); }

const recipe = JSON.parse(readFileSync(join(here, 'recipes', `${year}.json`), 'utf8'));
const cacheDir = join(here, 'cache');
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

function fetchWiki(title) {
  const safe = title.replace(/[^a-z0-9]+/gi, '_');
  const path = join(cacheDir, `${safe}.wiki`);
  if (existsSync(path)) return readFileSync(path, 'utf8');
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
  const out = execFileSync('curl', ['-s', '-A', 'kickoff-research/1.0', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (!out || out.length < 200) throw new Error(`wikitext vacío para ${title}`);
  writeFileSync(path, out);
  return out;
}

const MONTHS = { january:1, february:2, march:3, april:4, may:5, june:6, july:7, august:8, september:9, october:10, november:11, december:12 };

function parseDate(s) {
  let m = s.match(/\{\{\s*Start date\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
  if (m) return [+m[1], +m[2], +m[3]];
  // "13 July 1930" (posibles [[ ]])
  const clean = s.replace(/[[\]]/g, '');
  m = clean.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return [+m[3], MONTHS[m[2].toLowerCase()], +m[1]];
  return null;
}

// Extrae el offset UTC (en horas decimales) embebido en el campo time de la
// plantilla, ej. "17:00 BRT (UTC−3)" -> -3, "UTC+05:30" -> 5.5. null si no hay.
function parseUtcOffset(timeField) {
  const m = timeField.match(/UTC\s*([+−-])\s*0?(\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return null;
  const sign = m[1] === '+' ? 1 : -1;
  return sign * (+m[2] + (m[3] ? +m[3] / 60 : 0));
}

// Parsea la hora del campo time a [hh, mm] en 24h. Soporta "17:00" y "5:00 p.m.".
function parseClock(timeField) {
  const m = timeField.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)?/i);
  if (!m) return null;
  let hh = +m[1];
  const mm = +m[2];
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'p.m.' && hh !== 12) hh += 12;
  if (ap === 'a.m.' && hh === 12) hh = 0;
  return [hh, mm];
}

// Resuelve el id de equipo de una línea team1/team2: primero por nombre completo
// (algunas plantillas usan el nombre y no el código), luego por código FIFA.
function parseTeamId(line) {
  const low = line.toLowerCase();
  for (const name of NAME_KEYS) {
    if (low.includes(name)) return NAME_TO_ID[name];
  }
  const codes = [...line.matchAll(/\b([A-Z]{2,3})\b/g)].map((x) => x[1]).filter((c) => CODE_TO_ID[c]);
  return codes.length ? CODE_TO_ID[codes[codes.length - 1]] : null;
}

// Divide el wikitext en bloques Football box y parsea cada uno.
function parseFixtures(wiki, bucket) {
  const fixtures = [];
  const re = /\{\{\s*(?:#invoke:\s*)?Football box/gi;
  let m;
  while ((m = re.exec(wiki))) {
    const block = wiki.slice(m.index, m.index + 1600);
    const fields = {};
    for (const line of block.split('\n')) {
      const fm = line.match(/^\s*\|\s*([a-z0-9_]+)\s*=(.*)$/i);
      if (fm) fields[fm[1].toLowerCase()] = fm[2];
    }
    if (!fields.team1 || !fields.team2) continue;
    const date = parseDate(fields.date || '');
    const id1 = parseTeamId(fields.team1), id2 = parseTeamId(fields.team2);
    if (!id1 || !id2) continue;
    fixtures.push({
      bucket,
      date,
      clock: parseClock(fields.time || ''), // [hh,mm] en 24h, o null
      utc: parseUtcOffset(fields.time || ''), // offset embebido en el campo time, si lo hay
      id1, id2,
      location: (fields.stadium || fields.location || '').replace(/[[\]]/g, ''),
    });
  }
  return fixtures;
}

function offsetFor(loc) {
  for (const [key, off] of Object.entries(recipe.venueOffsets || {})) {
    if (loc && loc.includes(key)) return off;
  }
  return recipe.offset;
}

function toUtcIso(fx) {
  if (!fx.date) return null;
  const [y, mo, d] = fx.date;
  const [hh, mm] = fx.clock || [0, 0]; // sin hora -> 00:00 local
  // Prioridad: offset embebido en el box; si no, override por sede; si no, default.
  const off = fx.utc != null ? fx.utc : offsetFor(fx.location);
  const ms = Date.UTC(y, mo - 1, d, hh, mm) - off * 3600000;
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

// --- fixtures ---
const fixtures = [];
for (const p of recipe.pages) fixtures.push(...parseFixtures(fetchWiki(p.title), p.bucket));

// --- partidos del JSON por bucket ---
const edFile = join(root, 'public/mock/tournaments', `world-cup-${year}.json`);
const ed = JSON.parse(readFileSync(edFile, 'utf8'));
const jsonMatches = []; // {id, bucket, a, b}
const add = (bucket, m) => jsonMatches.push({ id: m.id, bucket, a: m.home.team.id, b: m.away.team.id });
(ed.groups || []).forEach((g) => (g.matches || []).forEach((m) => add('group', m)));
(ed.finalRound?.groups || []).forEach((g) => (g.matches || []).forEach((m) => add('final', m)));
(ed.knockout?.rounds || []).forEach((r) => (r.matches || []).forEach((m) => add('knockout', m)));
if (ed.thirdPlace) add('knockout', ed.thirdPlace);

const key = (a, b) => [a, b].sort().join('|');
const fxByKey = new Map(); // bucket+key -> [fixtures]
for (const fx of fixtures) {
  const k = fx.bucket + ':' + key(fx.id1, fx.id2);
  if (!fxByKey.has(k)) fxByKey.set(k, []);
  fxByKey.get(k).push(fx);
}

const map = {};
const unmatched = [];
for (const jm of jsonMatches) {
  const k = jm.bucket + ':' + key(jm.a, jm.b);
  const arr = fxByKey.get(k);
  if (!arr || !arr.length) { unmatched.push(jm); continue; }
  const fx = arr.shift(); // consume (cada par es único por bucket)
  const iso = toUtcIso(fx);
  if (iso) map[jm.id] = iso; else unmatched.push({ ...jm, reason: 'sin fecha' });
}

// Overrides manuales (id de partido -> ISO UTC) para boxes ausentes del wikitext
// (p. ej. transclusiones o partidos con artículo propio).
for (const [id, iso] of Object.entries(recipe.manual || {})) {
  map[id] = iso;
  const idx = unmatched.findIndex((u) => u.id === id);
  if (idx >= 0) unmatched.splice(idx, 1);
}

const leftover = [...fxByKey.values()].flat();
const outPath = join(here, 'kickoffs', `${year}.json`);
writeFileSync(outPath, JSON.stringify(map, null, 2) + '\n');
console.log(`${year}: fixtures parseados=${fixtures.length}, mapeados=${Object.keys(map).length}/${jsonMatches.length}`);
if (unmatched.length) console.log('  SIN MAPEAR:', unmatched.map((u) => `${u.id}(${u.bucket} ${u.a}-${u.b})`).join(', '));
if (leftover.length) console.log('  FIXTURES SOBRANTES:', leftover.map((f) => `${f.bucket} ${f.id1}-${f.id2} ${f.date?.join('-')}`).join(', '));
