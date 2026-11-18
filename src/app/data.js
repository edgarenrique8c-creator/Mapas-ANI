/* Capa de datos: catálogo local + geometría oficial ANI descargada en vivo (paginada + caché). */

export const ARCGIS = {
  carretero:
    'https://services8.arcgis.com/qXzQm8c8qEBxS81s/arcgis/rest/services/OpenDataAni/FeatureServer/3',
  ferreo:
    'https://services8.arcgis.com/qXzQm8c8qEBxS81s/arcgis/rest/services/Modos_ANI/FeatureServer/2',
  fluvial:
    'https://services8.arcgis.com/qXzQm8c8qEBxS81s/arcgis/rest/services/Modos_ANI/FeatureServer/4',
};

const CACHE_KEY = 'ani-geom-v5';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 días
const PAGINA = 8; // features por petición: la capa completa pesa ~1,2 MB y se pide por lotes

async function fetchJson(url, { timeout = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal, mode: 'cors', credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const BASE_GEO = {
  outSR: '4326',
  f: 'geojson',
  geometryPrecision: '4',
  maxAllowableOffset: '0.02',
};

function qs(params) {
  return new URLSearchParams(params).toString();
}

function metros(a, b) {
  const kx = 111320 * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const dx = (b[0] - a[0]) * kx;
  const dy = (b[1] - a[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Normaliza cualquier geometría a líneas [[lon,lat]] quitando duplicados y micro-segmentos. */
export function aLineas(g) {
  if (!g) return [];
  let grupos = [];
  if (g.type === 'LineString') grupos = [g.coordinates];
  else if (g.type === 'MultiLineString') grupos = g.coordinates;
  else if (g.type === 'Polygon') grupos = g.coordinates;
  else if (g.type === 'MultiPolygon') grupos = g.coordinates.flat();

  const out = [];
  for (const grupo of grupos) {
    const limpio = [];
    let largo = 0;
    for (const c of grupo) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const lon = Number(c[0]);
      const lat = Number(c[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      if (lon < -85 || lon > -66 || lat < -5 || lat > 14.5) continue;
      const p = [lon, lat];
      const prev = limpio[limpio.length - 1];
      if (prev) {
        const d = metros(prev, p);
        if (d < 30) continue;
        largo += d;
      }
      limpio.push(p);
    }
    if (limpio.length > 1 && largo > 200) out.push(limpio);
  }
  return out;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj.ts || Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* sin cuota: seguimos sin caché */
  }
}

async function conReintentos(fn, veces = 3) {
  let ultimo;
  for (let i = 0; i < veces; i += 1) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (i < veces - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw ultimo;
}

/** Atributos del catálogo oficial de concesiones carreteras (una sola petición, ligera). */
async function atributosCarreteros() {
  const url = `${ARCGIS.carretero}/query?${qs({
    where: '1=1',
    outFields: 'ID_MT,NOMBRE,GEN,OLA_4G,ESTADO',
    returnGeometry: 'false',
    orderByFields: 'ID_MT',
    f: 'json',
  })}`;
  const json = await fetchJson(url);
  const map = new Map();
  for (const f of json.features || []) {
    const a = f.attributes || {};
    map.set(String(a.ID_MT), a);
  }
  return map;
}

/** Descarga la geometría de la capa carretera paginada por OBJECTID. */
async function geometriaCarretera(onProgress) {
  const features = [];
  let offset = 0;
  let total = null;

  // primero el conteo, para poder mostrar progreso
  try {
    const c = await fetchJson(
      `${ARCGIS.carretero}/query?${qs({ where: '1=1', returnCountOnly: 'true', f: 'json' })}`
    );
    total = c.count;
  } catch {
    total = 47;
  }

  while (offset < (total ?? 47)) {
    const url = `${ARCGIS.carretero}/query?${qs({
      ...BASE_GEO,
      where: '1=1',
      outFields: 'ID_MT',
      orderByFields: 'OBJECTID',
      resultOffset: String(offset),
      resultRecordCount: String(PAGINA),
    })}`;
    const gj = await conReintentos(() => fetchJson(url));
    const lote = gj.features || [];
    features.push(...lote);
    offset += lote.length || PAGINA;
    if (onProgress) onProgress(Math.min(offset, total || offset), total || offset);
    if (!lote.length) break;
  }
  return features;
}

function featuresDeCapa(gj, tipo) {
  const out = [];
  (gj.features || []).forEach((f, i) => {
    const lineas = aLineas(f.geometry);
    if (!lineas.length) return;
    out.push({ uid: `${tipo}-${i}`, props: f.properties || {}, lineas, tipo });
  });
  return out;
}

/**
 * Descarga la geometría oficial de las concesiones ANI.
 * Devuelve { carretero:[], ferreo:[], fluvial:[], fuente, errores }.
 */
export async function loadGeometrias({ onProgress = () => {}, force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) {
      onProgress({ fase: 'cache' });
      return { ...cached, fuente: 'cache', errores: [] };
    }
  }

  const errores = [];
  let carretero = [];
  let ferreo = [];
  let fluvial = [];

  try {
    const atributos = await conReintentos(atributosCarreteros);
    const geoms = await geometriaCarretera((a, b) =>
      onProgress({ fase: 'carretero', hechos: a, total: b })
    );
    carretero = geoms
      .map((f) => {
        const idMt = String((f.properties || {}).ID_MT || '');
        const a = atributos.get(idMt) || {};
        return {
          uid: `c-${idMt}`,
          props: { ...a, ID_MT: idMt },
          lineas: aLineas(f.geometry),
          tipo: 'Carretero',
        };
      })
      .filter((f) => f.lineas.length);
  } catch (e) {
    errores.push(`carretero: ${e.message}`);
  }

  onProgress({ fase: 'ferreo' });
  try {
    const gj = await conReintentos(() =>
      fetchJson(`${ARCGIS.ferreo}/query?${qs({ ...BASE_GEO, where: '1=1', outFields: '*' })}`)
    );
    ferreo = featuresDeCapa(gj, 'Férreo');
  } catch (e) {
    errores.push(`férreo: ${e.message}`);
  }

  onProgress({ fase: 'fluvial' });
  try {
    const gj = await conReintentos(() =>
      fetchJson(`${ARCGIS.fluvial}/query?${qs({ ...BASE_GEO, where: '1=1', outFields: '*' })}`)
    );
    fluvial = featuresDeCapa(gj, 'Fluvial');
  } catch (e) {
    errores.push(`fluvial: ${e.message}`);
  }

  const datos = { carretero, ferreo, fluvial };

  if (!carretero.length && !ferreo.length && !fluvial.length) {
    const err = new Error(errores.join(' · ') || 'sin datos');
    err.allFailed = true;
    throw err;
  }

  writeCache(datos);
  return { ...datos, fuente: 'red', errores };
}
