// Reconstruye public/mock/tournaments/world-cup-2026.json con el sorteo REAL del
// Mundial 2026 (sin jugar): 12 grupos con equipos/fixtures/fechas/horarios reales
// y la llave de eliminatorias con las etiquetas oficiales (1º/2º/3º de grupo,
// ganador de partido N) y la fecha/sede de cada slot. Todo en UTC ISO 8601.
//
// Fuente: plantillas {{Football box}} de las páginas de Wikipedia de cada grupo,
// de "2026 FIFA World Cup knockout stage" y del artículo de la final.
//
// Uso: node scripts/gen-2026.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CODE_TO_ID } from './fifa-codes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const cacheDir = join(here, 'cache');

function fetchWiki(title) {
  const path = join(cacheDir, title.replace(/[^a-z0-9]+/gi, '_') + '.wiki');
  if (existsSync(path)) return readFileSync(path, 'utf8');
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
  const out = execFileSync('curl', ['-s', '-A', 'kickoff-research/1.0', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(path, out);
  return out;
}

// --- metadatos de equipos: nombre (es) + flagCode, tomados de las ediciones ya
// existentes, más los clasificados nuevos de 2026.
const META = {
  cw: { name: 'Curazao', flagCode: 'CW' },
  cd: { name: 'RD Congo', flagCode: 'CD' },
  uz: { name: 'Uzbekistán', flagCode: 'UZ' },
  cv: { name: 'Cabo Verde', flagCode: 'CV' },
  jo: { name: 'Jordania', flagCode: 'JO' },
  cz: { name: 'Chequia', flagCode: 'CZ' }, // nombre moderno (no "Rep. Checa")
};
// De más nuevo a más viejo, primero gana: así se conservan los nombres modernos
// (ej. "Alemania" y "Chequia" en vez de "Alemania Fed." / "Rep. Checa").
const files = readdirSync(join(root, 'public/mock/tournaments'))
  .filter((f) => /^world-cup-\d+\.json$/.test(f) && f !== 'world-cup-2026.json')
  .sort((a, b) => b.localeCompare(a));
for (const f of files) {
  const d = JSON.parse(readFileSync(join(root, 'public/mock/tournaments', f), 'utf8'));
  const grab = (t) => { if (t && t.id && !META[t.id]) META[t.id] = { name: t.name, flagCode: t.flagCode }; };
  for (const g of d.groups ?? []) {
    (g.standings ?? []).forEach((s) => grab(s.team));
    (g.matches ?? []).forEach((m) => { grab(m.home.team); grab(m.away.team); });
  }
}
const team = (id) => {
  if (!META[id]) throw new Error(`sin metadatos para equipo ${id}`);
  return { id, name: META[id].name, flagCode: META[id].flagCode };
};

// --- parsing de Football box -------------------------------------------------
function clockToHM(timeField) {
  const m = timeField.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)?/i);
  if (!m) return [0, 0];
  let hh = +m[1];
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'p.m.' && hh !== 12) hh += 12;
  if (ap === 'a.m.' && hh === 12) hh = 0;
  return [hh, +m[2]];
}
function toIso(date, timeField) {
  const [y, mo, d] = date;
  const [hh, mm] = clockToHM(timeField);
  const off = timeField.match(/UTC[−-](\d{1,2})/);
  const o = off ? -(+off[1]) : 0;
  return new Date(Date.UTC(y, mo - 1, d, hh, mm) - o * 3600000).toISOString().replace('.000Z', 'Z');
}
// Devuelve boxes en orden, con label de sección y campos crudos.
function boxes(wiki) {
  const re = /section begin="?([A-Za-z0-9-]+)"? *\/>\s*\{\{#invoke:football box\|main([\s\S]*?)(?:\|stadium=|\|goals1=)/gi;
  const out = [];
  let m;
  while ((m = re.exec(wiki))) {
    const body = m[2];
    const date = (body.match(/Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/) || []).slice(1).map(Number);
    const time = ((body.match(/\|time=([^\n]*)/) || [])[1] || '').replace(/&nbsp;/g, ' ');
    const t1 = (body.match(/\|team1=([^\n]*)/) || [])[1] || '';
    const t2 = (body.match(/\|team2=([^\n]*)/) || [])[1] || '';
    out.push({ label: m[1], iso: date.length === 3 ? toIso(date, time) : undefined, t1, t2 });
  }
  return out;
}
const codeOf = (s) => { const m = s.match(/\b([A-Z]{2,3})\b/); return m && CODE_TO_ID[m[1]] ? CODE_TO_ID[m[1]] : null; };

// --- grupos ------------------------------------------------------------------
const LETTERS = 'ABCDEFGHIJKL'.split('');
const groups = [];
for (const L of LETTERS) {
  const bs = boxes(fetchWiki(`2026 FIFA World Cup Group ${L}`));
  const seen = [];
  const matches = bs.map((b, i) => {
    const a = codeOf(b.t1), c = codeOf(b.t2);
    if (!seen.includes(a)) seen.push(a);
    if (!seen.includes(c)) seen.push(c);
    return { id: `g${L}${i + 1}`, played: false, home: { team: team(a) }, away: { team: team(c) }, kickoff: b.iso };
  });
  const standings = seen.map((id, i) => ({ position: i + 1, team: team(id), points: 0 }));
  groups.push({ id: L, name: `GRUPO ${L}`, standings, matches });
}

// --- eliminatorias: etiquetas oficiales traducidas ---------------------------
function label(raw) {
  const s = raw.replace(/<!--.*?-->/g, '').trim();
  let m;
  if ((m = s.match(/^Winner Group (\w+)$/i))) return `1º Grupo ${m[1]}`;
  if ((m = s.match(/^Runner-up Group (\w+)$/i))) return `2º Grupo ${m[1]}`;
  if ((m = s.match(/^3rd Group ([\w/]+)$/i))) return `3º ${m[1]}`;
  if ((m = s.match(/^Winner Match (\d+)$/i))) return `Ganador P${m[1]}`;
  if ((m = s.match(/^Loser Match (\d+)$/i))) return `Perdedor P${m[1]}`;
  return s;
}
let slug = 0;
const ph = (raw) => ({ id: `tbd-${++slug}`, name: label(raw), flagCode: '' });

const koBoxes = {};
for (const b of boxes(fetchWiki('2026 FIFA World Cup knockout stage'))) koBoxes[b.label] = b;
const finalBox = boxes(fetchWiki('2026 FIFA World Cup final')).find((b) => b.label === 'Final');

function koMatch(id, box) {
  return { id, played: false, home: { team: ph(box.t1) }, away: { team: ph(box.t2) }, kickoff: box.iso };
}
function round(id, name, side, labels) {
  return { id, name, ...(side ? { side } : {}), matches: labels.map(([mid, b]) => koMatch(mid, koBoxes[b] || finalBox)) };
}
const r32L = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`r32-l${n}`, `R32-${n}`]);
const r32R = [9, 10, 11, 12, 13, 14, 15, 16].map((n, i) => [`r32-r${i + 1}`, `R32-${n}`]);
const r16L = [1, 2, 3, 4].map((n) => [`r16-l${n}`, `R16-${n}`]);
const r16R = [5, 6, 7, 8].map((n, i) => [`r16-r${i + 1}`, `R16-${n}`]);
const knockout = {
  rounds: [
    round('r32-l', 'round-of-32', 'left', r32L),
    round('r32-r', 'round-of-32', 'right', r32R),
    round('r16-l', 'round-of-16', 'left', r16L),
    round('r16-r', 'round-of-16', 'right', r16R),
    round('qf-l', 'quarter', 'left', [['qf-l1', 'QF1'], ['qf-l2', 'QF2']]),
    round('qf-r', 'quarter', 'right', [['qf-r1', 'QF3'], ['qf-r2', 'QF4']]),
    round('sf-l', 'semi', 'left', [['sf-l1', 'SF1']]),
    round('sf-r', 'semi', 'right', [['sf-r1', 'SF2']]),
    round('final', 'final', undefined, [['final-1', 'Final']]),
  ],
};
const thirdPlace = koMatch('third-place', koBoxes['3rd']);

const edition = {
  id: 'world-cup-2026',
  year: 2026,
  format: 'cup',
  championTeamId: '',
  groups,
  knockout,
  thirdPlace,
};
writeFileSync(join(root, 'public/mock/tournaments/world-cup-2026.json'), JSON.stringify(edition, null, 2) + '\n');
const ng = groups.reduce((a, g) => a + g.matches.length, 0);
console.log(`2026 reconstruido: ${groups.length} grupos (${ng} partidos), eliminatoria ${knockout.rounds.reduce((a, r) => a + r.matches.length, 0)} + 3º`);
