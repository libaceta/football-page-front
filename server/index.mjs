// Backend mínimo que sirve la edición del Mundial con datos en vivo de
// football-data.org. Cachea las respuestas upstream (free tier ~10 req/min) y
// degrada con elegancia a la plantilla estática si falta la key o la API falla.
//
//   FOOTBALL_DATA_API_KEY=xxxx node server/index.mjs
//
// Endpoints:
//   GET /api/editions/:type/:year  -> Edition (live merge para world-cup 2026)
//   GET /api/health                -> { ok, hasKey }

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';

import { buildLiveEdition } from './map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PORT = Number(process.env.PORT ?? 3000);
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? '';
// Modo dev: sirve datos en vivo desde server/mock-live.json sin pegarle a la API
// (útil para probar el merge/polling sin key). Activar con FOOTBALL_DATA_MOCK=1.
const MOCK = process.env.FOOTBALL_DATA_MOCK === '1';
const UPSTREAM = 'https://api.football-data.org/v4';
const COMPETITION = 'WC'; // FIFA World Cup
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 45_000);

// --- cache simple en memoria con TTL + de-dupe de peticiones en vuelo ---
const cache = new Map(); // key -> { expires, value }
const inflight = new Map(); // key -> Promise

async function cached(key, ttlMs, fetcher) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const value = await fetcher();
      cache.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

async function fetchUpstream(path) {
  const res = await fetch(`${UPSTREAM}${path}`, {
    headers: { 'X-Auth-Token': API_KEY },
  });
  if (!res.ok) {
    throw new Error(`football-data ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function loadBaseEdition(type, year) {
  const file = join(ROOT, 'public', 'mock', 'tournaments', `${type}-${year}.json`);
  return JSON.parse(await readFile(file, 'utf8'));
}

/** Carga el fixture de dev (FOOTBALL_DATA_MOCK=1) como [matchesRes, standingsRes]. */
async function loadMock() {
  const file = join(__dirname, 'mock-live.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  return [{ matches: data.matches ?? [] }, { standings: data.standings ?? [] }];
}

// --- app ---
const app = express();

// CORS abierto (en dev se usa el proxy de Angular; esto cubre acceso directo).
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(API_KEY) });
});

app.get('/api/editions/:type/:year', async (req, res) => {
  const { type } = req.params;
  const year = Number(req.params.year);

  let base;
  try {
    base = await loadBaseEdition(type, year);
  } catch {
    res.status(404).json({ error: `no base edition for ${type}-${year}` });
    return;
  }

  const isLive = type === 'world-cup' && year === 2026 && (Boolean(API_KEY) || MOCK);
  if (!isLive) {
    res.json(base);
    return;
  }

  try {
    const [matchesRes, standingsRes] = MOCK
      ? await loadMock()
      : await Promise.all([
          cached(`${COMPETITION}:matches`, CACHE_TTL_MS, () =>
            fetchUpstream(`/competitions/${COMPETITION}/matches`),
          ),
          cached(`${COMPETITION}:standings`, CACHE_TTL_MS, () =>
            fetchUpstream(`/competitions/${COMPETITION}/standings`),
          ),
        ]);

    const { edition, stats } = buildLiveEdition(base, {
      matches: matchesRes.matches ?? [],
      standings: standingsRes.standings ?? [],
    });

    if (stats.unmatchedApiMatches.length || stats.unresolvedTeams.length) {
      console.warn('[live] mapeo parcial:', {
        matched: stats.matchedMatches,
        unmatched: stats.unmatchedApiMatches,
        unresolved: stats.unresolvedTeams,
      });
    } else {
      console.log(
        `[live] ${stats.matchedMatches} partidos, ${stats.groupsWithStandings} grupos`,
      );
    }
    res.json(edition);
  } catch (err) {
    // Degradación elegante: ante cualquier fallo upstream, servir la plantilla.
    console.error('[live] upstream falló, sirviendo estático:', err.message);
    res.json(base);
  }
});

app.listen(PORT, () => {
  console.log(`football-page API en http://localhost:${PORT}`);
  console.log(`  key football-data: ${API_KEY ? 'presente' : 'AUSENTE (modo estático)'}`);
});
