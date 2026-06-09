// Mapa código FIFA (3 letras, como aparece en las plantillas Football box de
// Wikipedia, incluyendo variantes históricas) -> id interno del equipo.
// Varias entradas pueden apuntar al mismo id (ej. FRG y GER -> de).
export const CODE_TO_ID = {
  UAE: 'ae', ANG: 'ao', ARG: 'ar', AUT: 'at', AUS: 'au',
  BEL: 'be', BUL: 'bg', BOL: 'bo', BRA: 'br', CAN: 'ca',
  SUI: 'ch', CIV: 'ci', CHI: 'cl', CMR: 'cm', CHN: 'cn',
  COL: 'co', CRC: 'cr', TCH: 'cs', CUB: 'cu', CPV: 'cv',
  CZE: 'cz', CSK: 'cs', // Checoslovaquia: TCH (arriba) o CSK según edición
  GDR: 'dd',
  GER: 'de', FRG: 'de', // Alemania / Alemania Occidental
  DEI: 'dei', NEI: 'dei', // Indias Orientales Holandesas
  DEN: 'dk', ALG: 'dz', ECU: 'ec', EGY: 'eg', ENG: 'eng',
  ESP: 'es', SPA: 'es', // España (flagg usa SPA en algunas ediciones)
  FRA: 'fr', GHA: 'gh', GRE: 'gr', HON: 'hn',
  CRO: 'hr', HAI: 'ht', HUN: 'hu',
  IRL: 'ie', EIR: 'ie', IFS: 'ie',
  ISR: 'il', IRQ: 'iq', IRN: 'ir', ISL: 'is', ITA: 'it',
  JAM: 'jm', JOR: 'jo', JPN: 'jp', PRK: 'kp', KOR: 'kr',
  KUW: 'kw', MAR: 'ma', MEX: 'mx', NGA: 'ng', NIR: 'ni',
  NED: 'nl', NOR: 'no', NZL: 'nz', PAN: 'pa', PER: 'pe',
  POL: 'pl', POR: 'pt', PAR: 'py', QAT: 'qa',
  ROU: 'ro', ROM: 'ro', // Rumania (código antiguo ROM)
  SRB: 'rs', SCG: 'rs', // Serbia / Serbia y Montenegro (2006)
  BIH: 'ba', FRY: 'yu', // Bosnia / RF Yugoslavia (1998-2002)
  US: 'us', // EE.UU. en plantillas de bandera con variante ({{fb-rt|US|1960}})
  RUS: 'ru', KSA: 'sa', SCO: 'sct', SWE: 'se',
  SVN: 'si', SVK: 'sk', SEN: 'sn', URS: 'su', SLV: 'sv',
  TOG: 'tg', TUN: 'tn', TUR: 'tr', TRI: 'tt', UKR: 'ua',
  USA: 'us', URU: 'uy', WAL: 'wal', YUG: 'yu', RSA: 'za',
  ZAI: 'zr',
};

// Nombres en inglés (como aparecen en plantillas que usan el nombre completo en
// lugar del código, ej. {{fb-rt|FR Yugoslavia}}). Se cotejan en minúsculas y de
// más largo a más corto para evitar falsos positivos (ej. "Northern Ireland"
// antes que "Ireland", "East Germany" antes que "Germany").
export const NAME_TO_ID = {
  'united arab emirates': 'ae', angola: 'ao', argentina: 'ar', austria: 'at',
  australia: 'au', belgium: 'be', bulgaria: 'bg', bolivia: 'bo', brazil: 'br',
  canada: 'ca', switzerland: 'ch', "côte d'ivoire": 'ci', 'ivory coast': 'ci',
  chile: 'cl', cameroon: 'cm', 'china pr': 'cn', china: 'cn', colombia: 'co',
  'costa rica': 'cr', czechoslovakia: 'cs', cuba: 'cu', 'cape verde': 'cv',
  'czech republic': 'cz', czechia: 'cz', 'east germany': 'dd',
  'dutch east indies': 'dei', 'west germany': 'de', germany: 'de',
  denmark: 'dk', algeria: 'dz', ecuador: 'ec', egypt: 'eg', england: 'eng',
  spain: 'es', france: 'fr', ghana: 'gh', greece: 'gr', honduras: 'hn',
  croatia: 'hr', haiti: 'ht', hungary: 'hu', 'republic of ireland': 'ie',
  ireland: 'ie', israel: 'il', iraq: 'iq', 'ir iran': 'ir', iran: 'ir',
  iceland: 'is', italy: 'it', jamaica: 'jm', jordan: 'jo', japan: 'jp',
  'north korea': 'kp', 'korea dpr': 'kp', 'south korea': 'kr',
  'korea republic': 'kr', kuwait: 'kw', morocco: 'ma', mexico: 'mx',
  nigeria: 'ng', 'northern ireland': 'ni', netherlands: 'nl', norway: 'no',
  'new zealand': 'nz', panama: 'pa', peru: 'pe', poland: 'pl', portugal: 'pt',
  paraguay: 'py', qatar: 'qa', romania: 'ro', 'serbia and montenegro': 'rs',
  serbia: 'rs', russia: 'ru', 'saudi arabia': 'sa', scotland: 'sct',
  sweden: 'se', slovenia: 'si', slovakia: 'sk', senegal: 'sn',
  'soviet union': 'su', 'el salvador': 'sv', togo: 'tg', tunisia: 'tn',
  türkiye: 'tr', turkey: 'tr', 'trinidad and tobago': 'tt', ukraine: 'ua',
  'united states': 'us', uruguay: 'uy', wales: 'wal', 'fr yugoslavia': 'yu',
  yugoslavia: 'yu', 'south africa': 'za', zaire: 'zr',
};

// Claves ordenadas de más larga a más corta para coteja por subcadena.
export const NAME_KEYS = Object.keys(NAME_TO_ID).sort((a, b) => b.length - a.length);
