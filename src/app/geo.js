/* Utilidades geográficas sin dependencias: punto en polígono, distancia, asignación línea→proyecto. */

const R_TIERRA = 6371008.8;

export function haversine(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const la1 = a[1] * toRad;
  const la2 = b[1] * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function longitudLinea(line) {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) total += haversine(line[i - 1], line[i]);
  return total;
}

/** Distancia punto→segmento en metros (proyección equirectangular local, suficiente <20 km). */
export function distPuntoSegmento(p, a, b) {
  const latRef = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const kx = 111320 * Math.cos(latRef);
  const ky = 110540;
  const px = (p[0] - a[0]) * kx;
  const py = (p[1] - a[1]) * ky;
  const bx = (b[0] - a[0]) * kx;
  const by = (b[1] - a[1]) * ky;
  const len2 = bx * bx + by * by;
  let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - bx * t;
  const dy = py - by * t;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distPuntoLinea(p, line) {
  let min = Infinity;
  let bestIdx = 0;
  for (let i = 1; i < line.length; i += 1) {
    const d = distPuntoSegmento(p, line[i - 1], line[i]);
    if (d < min) {
      min = d;
      bestIdx = i;
    }
  }
  return { dist: min, idx: bestIdx };
}

/* ---------- punto en polígono (ray casting) ---------- */
function enAnillo(pt, ring) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersecta = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersecta) inside = !inside;
  }
  return inside;
}

function enPoligono(pt, poly) {
  if (!enAnillo(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i += 1) if (enAnillo(pt, poly[i])) return false;
  return true;
}

function bbox(g) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      if (c[0] < xmin) xmin = c[0];
      if (c[0] > xmax) xmax = c[0];
      if (c[1] < ymin) ymin = c[1];
      if (c[1] > ymax) ymax = c[1];
      return;
    }
    c.forEach(walk);
  };
  walk(g.coordinates);
  return [xmin, ymin, xmax, ymax];
}

/** Índice de polígonos con bbox para búsqueda rápida. */
export function indexarPoligonos(fc) {
  return fc.features.map((f) => ({
    props: f.properties,
    geom: f.geometry,
    box: bbox(f.geometry),
  }));
}

export function municipioEn(idx, lngLat) {
  const [x, y] = lngLat;
  for (const f of idx) {
    const [x0, y0, x1, y1] = f.box;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const g = f.geom;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) if (enPoligono([x, y], poly)) return f.props;
  }
  return null;
}

/**
 * Asigna cada línea oficial al proyecto del catálogo.
 * Estrategia: muestreo de vértices -> municipio -> emparejamiento por nombre normalizado;
 * y como respaldo, cercanía al punto medio. Devuelve Map<idProyecto, lineas[]>.
 */
export function normalizarTexto(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

const ALIAS = {
  8: ['AUTOPISTA AL RIO MAGDALENA 2', 'RIO MAGDALENA 2', 'MAGDALENA 2'],
  28: ['VIAS DEL NUS', 'NUS', 'VINUS'],
  30: ['GIRARDOT CAJAMARCA', 'GICA'],
  12: ['BUCARAMANGA PAMPLONA'],
  13: ['PAMPLONA CUCUTA'],
  17: ['MALLA VIAL DEL META'],
  24: ['POPAYAN SANTANDER DE QUILICHAO', 'POPAYAN QUILICHAO'],
  27: ['VIA AL PUERTO'],
  46: ['CORDOBA SUCRE'],
  47: ['ACCESOS NORTE A BOGOTA', 'ACCESOS NORTE'],
  50: ['RUTA CARIBE'],
  9: ['CONEXION NORTE'],
  18: ['MULALO LOBOGUERRERO'],
  32: ['ARMENIA PEREIRA MANIZALES'],
  33: ['BOGOTA LA VEGA VILLETA', 'SABANA DE OCCIDENTE'],
  37: ['DEVIMED', 'ORIENTE DE MEDELLIN'],
  41: ['SANTA MARTA RIOHACHA PARAGUACHON'],
  45: ['BRICENO TUNJA SOGAMOSO'],
  52: ['RUTA DEL SOL SECTOR 3'],
  154: ['ALO SUR', 'AVENIDA LONGITUDINAL DE OCCIDENTE'],
  155: ['TRONCAL DEL MAGDALENA C1', 'PUERTO SALGAR BARRANCABERMEJA'],
  156: ['TRONCAL DEL MAGDALENA C2', 'SABANA DE TORRES CURUMANI'],
  157: ['ACCESOS NORTE FASE II'],
  158: ['BUENAVENTURA LOBOGUERRERO BUGA'],
  184: ['AUTOPISTAS DEL CARIBE'],
  128: ['RED FERREA DEL ATLANTICO', 'ATLANTICO'],
  132: ['BOGOTA BELENCITO', 'DORADA CHIRIGUANA'],
  167: ['CANAL DEL DIQUE'],
  196: ['RIO META'],
};

/** Tokeniza el nombre oficial de ANI para emparejar con el catálogo. */
function puntajeNombre(nombreAPI, proyecto) {
  const a = normalizarTexto(nombreAPI);
  const candidatos = [
    normalizarTexto(proyecto.nombre),
    normalizarTexto(proyecto.nombreCorto),
    ...(ALIAS[proyecto.id] || []).map(normalizarTexto),
  ].filter(Boolean);

  let mejor = 0;
  for (const c of candidatos) {
    if (!c) continue;
    if (a === c) mejor = Math.max(mejor, 100);
    else if (a.includes(c) || c.includes(a)) mejor = Math.max(mejor, 80);
    else {
      const tokA = new Set(a.split(' ').filter((t) => t.length > 2));
      const tokC = c.split(' ').filter((t) => t.length > 2);
      if (!tokC.length) continue;
      const comunes = tokC.filter((t) => tokA.has(t)).length;
      mejor = Math.max(mejor, (comunes / tokC.length) * 60);
    }
  }
  return mejor;
}

export function centroideLineas(lineas) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const l of lineas) {
    for (const p of l) {
      sx += p[0];
      sy += p[1];
      n += 1;
    }
  }
  return n ? [sx / n, sy / n] : null;
}

/**
 * @param {Array} features  entradas del FeatureServer: {props:{ID_MT,NOMBRE,GEN,OLA_4G,ESTADO,COD_PR_IRE}, lineas}
 * @param {Array} proyectos catálogo
 */
export function asignarProyectos(features, proyectos) {
  const mapa = new Map();
  const sinAsignar = [];
  const usados = new Set();

  // 1) emparejamiento por identificador oficial (ID_MT / COD_PR_IRE) y luego por nombre
  for (const f of features) {
    const idMt = f.props.ID_MT != null ? String(f.props.ID_MT).trim() : null;
    const cod = f.props.COD_PR_IRE != null ? normalizarTexto(f.props.COD_PR_IRE) : null;
    let elegido = null;
    let mejorPuntaje = 0;

    if (idMt) {
      const porId = proyectos.find(
        (p) => String(p.id) === idMt || normalizarTexto(p.codigo) === normalizarTexto(idMt)
      );
      if (porId) {
        elegido = porId;
        mejorPuntaje = 300;
      }
    }

    if (!elegido && cod) {
      const porCod = proyectos.find((p) => normalizarTexto(p.codigo) === cod);
      if (porCod) {
        elegido = porCod;
        mejorPuntaje = 300;
      }
    }

    if (!elegido && f.props.NOMBRE) {
      for (const p of proyectos) {
        if (p.tipo !== f.tipo) continue;
        const s = puntajeNombre(f.props.NOMBRE, p);
        if (s > mejorPuntaje) {
          mejorPuntaje = s;
          elegido = p;
        }
      }
      if (mejorPuntaje < 45) elegido = null;
    }

    if (!elegido && f.props.CONCESION) {
      for (const p of proyectos) {
        if (p.tipo !== f.tipo) continue;
        const s = Math.max(
          puntajeNombre(f.props.CONCESION, p),
          puntajeNombre(f.props.COD_PR_IRE || '', p)
        );
        if (s > mejorPuntaje) {
          mejorPuntaje = s;
          elegido = p;
        }
      }
      if (mejorPuntaje < 45) elegido = null;
    }

    if (elegido) {
      if (!mapa.has(elegido.id)) mapa.set(elegido.id, []);
      mapa.get(elegido.id).push(...f.lineas);
      usados.add(f.uid);
    } else {
      sinAsignar.push(f);
    }
  }

  // 2) respaldo geográfico: líneas huérfanas se asignan al proyecto ya ubicado más cercano
  const centros = [];
  for (const [id, lineas] of mapa) {
    const c = centroideLineas(lineas);
    const p = proyectos.find((x) => x.id === id);
    if (c && p) centros.push({ id, tipo: p.tipo, c });
  }
  const huerfanas = [];
  for (const f of sinAsignar) {
    const centro = centroideLineas(f.lineas);
    if (!centro) continue;
    let mejor = null;
    let mejorDist = Infinity;
    for (const k of centros) {
      if (k.tipo !== f.tipo) continue;
      const d = haversine(centro, k.c);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = k;
      }
    }
    // solo si está razonablemente cerca (<120 km) para no inventar relaciones
    if (mejor && mejorDist < 120000) {
      mapa.get(mejor.id).push(...f.lineas);
    } else {
      huerfanas.push(f);
    }
  }

  return { mapa, sinAsignar: huerfanas };
}
