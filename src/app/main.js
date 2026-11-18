import { loadGeometrias } from './data.js';
import {
  indexarPoligonos,
  municipioEn,
  asignarProyectos,
  distPuntoLinea,
} from './geo.js';
import { PALETAS, colorDe, fmtKm, fmtCop, esc } from './format.js';

const L = window.L;

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */
const state = {
  proyectos: [],
  porId: new Map(),
  capas: new Map(), // id -> { layer, lineas }
  seleccion: null,
  colorPor: 'gen',
  filtros: { q: '', tipo: '', gen: '', etapa: '' },
  muniIdx: null,
  deptIdx: null,
  lineasOficiales: 0,
};

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ */
/* Mapa                                                                */
/* ------------------------------------------------------------------ */
const map = L.map('map', {
  center: [4.6, -74.1],
  zoom: 6,
  zoomControl: false,
  preferCanvas: true,
  worldCopyJump: false,
  minZoom: 4,
  maxZoom: 16,
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

const capasBase = {
  claro: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  }),
  oscuro: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  }),
  satelite: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }
  ),
  osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }),
};
capasBase.oscuro.addTo(map);

const panePais = map.createPane('pais');
panePais.style.zIndex = 150;
const paneDeptos = map.createPane('deptos');
paneDeptos.style.zIndex = 175;
const paneConcesiones = map.createPane('concesiones');
paneConcesiones.style.zIndex = 410;
const paneMunicipio = map.createPane('municipioActivo');
paneMunicipio.style.zIndex = 405;
const paneHalo = map.createPane('halo');
paneHalo.style.zIndex = 409;
paneHalo.style.pointerEvents = 'none';

let capaMunicipioActivo = L.layerGroup().addTo(map);
let capaPunto = L.layerGroup().addTo(map);

let haloRef = null;

/* ------------------------------------------------------------------ */
/* Utilidades UI                                                       */
/* ------------------------------------------------------------------ */
function setStatus(texto, tipo = '') {
  const el = $('status');
  $('status-text').textContent = texto;
  el.className = `map-overlay map-status ${tipo}`;
  el.classList.remove('hidden');
}
function hideStatus() {
  $('status').classList.add('hidden');
}

function toastStatus(texto, tipo = 'ok', ms = 4200) {
  setStatus(texto, tipo);
  if (tipo !== 'err') setTimeout(() => hideStatus(), ms);
}

/* ------------------------------------------------------------------ */
/* Mapa base local (siempre disponible, incluso sin teselas)            */
/* ------------------------------------------------------------------ */
function pintarBasePais(fc) {
  L.geoJSON(fc, {
    pane: 'pais',
    interactive: false,
    style: {
      color: 'rgba(120,170,200,.35)',
      weight: 0.8,
      fillColor: '#0f2a3f',
      fillOpacity: 1,
    },
  }).addTo(map);
  // borde exterior marcado
  L.geoJSON(fc, {
    pane: 'deptos',
    interactive: false,
    style: { color: 'rgba(140,190,215,.55)', weight: 1, fill: false },
  }).addTo(map);
}

/* ------------------------------------------------------------------ */
/* Carga de datos                                                      */
/* ------------------------------------------------------------------ */
async function init() {
  setStatus('Cargando catálogo de concesiones ANI…');

  const [catalogo, municipios, departamentos] = await Promise.all([
    fetch('./data/proyectos.json').then((r) => r.json()),
    fetch('./data/municipios.json').then((r) => r.json()).catch(() => null),
    fetch('./data/departamentos.json').then((r) => r.json()).catch(() => null),
  ]);

  state.proyectos = catalogo.proyectos;
  state.proyectos.forEach((p) => state.porId.set(p.id, p));
  if (municipios) state.muniIdx = indexarPoligonos(municipios);
  if (departamentos) {
    state.deptIdx = indexarPoligonos(departamentos);
    pintarBasePais(departamentos);
  }

  renderStats();
  renderList();
  bindUI();
  renderAbout(catalogo._meta);

  setStatus('Descargando geometría oficial de la ANI…');
  await cargarGeometria();
}

async function cargarGeometria(force = false) {
  try {
    const geo = await loadGeometrias({
      force,
      onProgress: (p) => {
        if (p.fase === 'cache') return;
        if (p.fase === 'carretero' && p.total) {
          setStatus(
            `Descargando trazados oficiales de la ANI… ${p.hechos}/${p.total} corredores`
          );
        } else if (p.fase === 'ferreo') {
          setStatus('Descargando corredores férreos…');
        } else if (p.fase === 'fluvial') {
          setStatus('Descargando corredores fluviales…');
        }
      },
    });

    cargarCapas(geo);
    renderList();
    const fuenteTxt =
      geo.fuente === 'cache' ? 'geometría en caché (red ANI)' : 'geometría oficial ANI';
    const nSin = state.proyectos.filter((p) => !state.capas.has(p.id)).length;
    toastStatus(
      `Listo · ${state.lineasOficiales} trazados · ${fuenteTxt}` +
        (nSin ? ` · ${nSin} sin trazado publicado` : ''),
      'ok'
    );
    document.body.dataset.listo = '1';
  } catch (e) {
    renderList();
    setStatus(
      'No se pudo descargar la geometría oficial de la ANI (sin conexión o servicio bloqueado). La ficha de cada corredor y las longitudes siguen disponibles.',
      'err'
    );
    document.body.dataset.listo = '1';
  }
}

function cargarCapas(geo) {
  state.capas.forEach((c) => map.removeLayer(c.layer));
  state.capas.clear();
  state.lineasOficiales = 0;
  construirCapas(geo.carretero || [], geo.ferreo || [], geo.fluvial || []);
}

/* ------------------------------------------------------------------ */
/* Render de capas a partir de features {props, lineas, tipo}           */
/* ------------------------------------------------------------------ */
function construirCapas(carreteroFeatures, ferreoFeatures, fluvialFeatures) {
  const features = [
    ...carreteroFeatures.map((f) => ({ ...f, tipo: 'Carretero' })),
    ...ferreoFeatures.map((f) => ({ ...f, tipo: 'Férreo' })),
    ...fluvialFeatures.map((f) => ({ ...f, tipo: 'Fluvial' })),
  ];

  const { mapa } = asignarProyectos(features, state.proyectos);

  for (const [id, lineas] of mapa) {
    const p = state.porId.get(id);
    if (!p) continue;
    const layer = L.layerGroup();
    for (const linea of lineas) {
      const latlngs = linea.map((c) => [c[1], c[0]]);
      L.polyline(latlngs, {
        pane: 'concesiones',
        color: colorDe(p, state.colorPor),
        weight: p.tipo === 'Carretero' ? 3.2 : 2.6,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
      })
        .on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          seleccionar(id, { pan: false });
        })
        .on('mouseover', function () {
          this.setStyle({ weight: p.tipo === 'Carretero' ? 5.5 : 4.6, opacity: 1 });
          this.bringToFront();
        })
        .on('mouseout', function () {
          this.setStyle({ weight: p.tipo === 'Carretero' ? 3.2 : 2.6, opacity: 0.92 });
        })
        .bindTooltip(
          `<b>${esc(p.nombreCorto || p.nombre)}</b><br><span style="opacity:.75">${
            p.longitudConcesionKm ? fmtKm(p.longitudConcesionKm) + ' km · ' : ''
          }${esc(p.contratista || 'Concesionario por confirmar')}</span>`,
          { sticky: true, direction: 'top', opacity: 0.96 }
        )
        .addTo(layer);
    }
    layer.addTo(map);
    state.capas.set(id, { layer, lineas });
  }

  state.lineasOficiales = features.reduce((n, f) => n + f.lineas.length, 0);
  return features.length;
}

/* ------------------------------------------------------------------ */
/* Selección y ficha                                                   */
/* ------------------------------------------------------------------ */
function seleccionar(id, { pan = true } = {}) {
  state.seleccion = id;
  const p = state.porId.get(id);
  if (!p) return;

  // halos: resaltar el corredor seleccionado
  if (haloRef) {
    map.removeLayer(haloRef);
    haloRef = null;
  }
  const capa = state.capas.get(id);
  if (capa) {
    const grupo = L.featureGroup().addTo(map);
    capa.lineas.forEach((linea) => {
      L.polyline(linea.map((c) => [c[1], c[0]]), {
        pane: 'halo',
        color: '#ffffff',
        weight: 9,
        opacity: 0.28,
        lineCap: 'round',
      }).addTo(grupo);
      L.polyline(linea.map((c) => [c[1], c[0]]), {
        pane: 'halo',
        color: colorDe(p, state.colorPor),
        weight: 5.5,
        opacity: 1,
        lineCap: 'round',
      }).addTo(grupo);
    });
    haloRef = grupo;
    if (pan) map.fitBounds(grupo.getBounds(), { padding: [60, 60], maxZoom: 12, duration: 0.5 });
  }

  renderDetalle(p);
  marcarItemActivo(id);
  resaltarMunicipios(p);
}

function marcarItemActivo(id) {
  document.querySelectorAll('.item').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.id) === id);
  });
}

function municipiosDe(p) {
  const idx = state.muniIdx;
  const capa = state.capas.get(p.id);
  if (!idx || !capa) return [];
  const encontrados = new Map();
  for (const linea of capa.lineas) {
    // muestreo: cada ~15 vértices o 1 de cada 8, lo que dé más puntos
    const paso = Math.max(1, Math.floor(linea.length / 120));
    for (let i = 0; i < linea.length; i += paso) {
      const m = municipioEn(idx, linea[i]);
      if (!m) continue;
      if (!encontrados.has(m.c)) {
        encontrados.set(m.c, { nombre: m.m, depto: m.d, c: m.c, n: 0 });
      }
      encontrados.get(m.c).n += 1;
    }
  }
  return [...encontrados.values()].sort((a, b) => b.n - a.n);
}

function resaltarMunicipios(p) {
  capaMunicipioActivo.clearLayers();
  const muns = municipiosDe(p);
  if (!muns.length || !state.muniIdx) return;
  const capa = state.capas.get(p.id);
  const color = colorDe(p, state.colorPor);
  for (const m of muns.slice(0, 80)) {
    const f = state.muniIdx.find((x) => x.props.c === m.c);
    if (!f) continue;
    L.geoJSON({ type: 'Feature', geometry: f.geom, properties: {} }, {
      pane: 'municipioActivo',
      interactive: false,
      style: { color, weight: 1, opacity: 0.65, fillColor: color, fillOpacity: 0.1 },
    }).addTo(capaMunicipioActivo);
  }
}

function contactosHTML(p) {
  const out = [];
  if (p.telefono) {
    const tel = String(p.telefono).replace(/[^\d+]/g, '');
    out.push(`<a href="tel:${esc(tel)}">☎ ${esc(p.telefono)}</a>`);
  }
  if (p.correo) out.push(`<a href="mailto:${esc(p.correo)}">✉ ${esc(p.correo)}</a>`);
  if (p.web)
    out.push(
      `<a href="${esc(p.web)}" target="_blank" rel="noopener">↗ Sitio web</a>`
    );
  return out.length ? `<div class="contact-actions">${out.join('')}</div>` : '';
}

function renderDetalle(p) {
  const el = $('detail-body');
  const inter = p.interventoria || {};
  const muns = municipiosDe(p);
  const capa = state.capas.get(p.id);
  const color = colorDe(p, state.colorPor);

  const badges = [];
  if (p.tipo) badges.push(`<span class="badge">${esc(p.tipo)}</span>`);
  if (p.generacion) badges.push(`<span class="badge acc">${esc(p.generacion)}</span>`);
  if (p.ola && p.ola !== 'No aplica') badges.push(`<span class="badge">${esc(p.ola)}</span>`);
  if (p.etapa) badges.push(`<span class="badge amber">${esc(p.etapa)}</span>`);

  const kms = `
    <div class="big-kms">
      <div class="kms">
        <b>${p.longitudConcesionKm != null ? fmtKm(p.longitudConcesionKm) : '—'}</b>
        <span>km del contrato de concesión</span>
      </div>
      <div class="kms">
        <b>${p.longitudCargoKm != null ? fmtKm(p.longitudCargoKm) : '—'}</b>
        <span>km de red a cargo (ANI)</span>
      </div>
    </div>`;

  const interHTML = inter.nombre
    ? `<div class="card-inner">
         <div class="who">${esc(inter.nombre)}</div>
         ${inter.verificado === false ? `<div class="alert" style="margin:8px 0 10px">Emparejamiento indicativo: el objeto del contrato en SECOP II no nombra explícitamente este corredor. <b>Confírmalo en SECOP II</b> antes de citarlo.</div>` : ''}
         <dl class="kv">
           ${inter.contrato ? `<dt>Contrato</dt><dd class="mono">${esc(inter.contrato)}</dd>` : ''}
           ${inter.valorCop ? `<dt>Valor</dt><dd>${esc(fmtCop(inter.valorCop))}</dd>` : ''}
           ${inter.estado ? `<dt>Estado</dt><dd>${esc(inter.estado)}</dd>` : ''}
         </dl>
       </div>`
    : `<div class="card-inner">
         <div class="who">No consolidada en este aplicativo</div>
         <p class="note">El nombre de la interventoría de este corredor debe confirmarse en SECOP II
         (Agencia Nacional de Infraestructura – ANI). Usa el botón de búsqueda para verificar antes
         de radicar cualquier derecho de petición.</p>
       </div>`;

  const concesionarioHTML = p.contratista
    ? `<div class="card-inner">
         <div class="who">${esc(p.contratista)}</div>
         <dl class="kv">
           ${p.nit ? `<dt>NIT</dt><dd class="mono">${esc(p.nit)}</dd>` : ''}
           ${p.contratoConcesion ? `<dt>Contrato</dt><dd>${esc(p.contratoConcesion)}</dd>` : ''}
           ${p.municipioDomicilio ? `<dt>Domicilio</dt><dd>${esc(p.municipioDomicilio)}</dd>` : ''}
           ${p.direccion ? `<dt>Dirección</dt><dd>${esc(p.direccion)}</dd>` : ''}
         </dl>
         ${contactosHTML(p)}
       </div>`
    : `<div class="card-inner"><div class="who">Concesionario no registrado</div>
       <p class="note">Este registro no tiene contratista asociado en el listado de la ANI
       (corredor revertido, en estructuración o contrato de obra).</p></div>`;

  el.innerHTML = `
    <span class="code">${esc(p.codigo || '')} · ID ${esc(p.id)}</span>
    <h2>${esc(p.nombre)}</h2>
    <div class="badges">${badges.join('')}</div>
    ${kms}
    ${!capa ? `<div class="alert">Este corredor no tiene trazado geográfico publicado en el servicio de datos abiertos de la ANI. Los datos contractuales sí están disponibles.</div>` : ''}
    <section>
      <h3>Concesionario a cargo</h3>
      ${concesionarioHTML}
    </section>
    <section>
      <h3>Interventoría</h3>
      ${interHTML}
    </section>
    <section>
      <h3>Municipios por donde pasa ${muns.length ? `(${muns.length})` : ''}</h3>
      ${
        muns.length
          ? `<div class="municipios">${muns
              .map(
                (m) =>
                  `<span class="m" title="${esc(m.depto)}">${esc(m.nombre)} · ${esc(m.depto)}</span>`
              )
              .join('')}</div>
             <p class="note">Calculado intersectando el trazado oficial con la cartografía municipal
             (MGN/IGAC). Útil para saber a qué municipio dirigir la solicitud.</p>`
          : `<p class="note">${
              capa
                ? 'No fue posible determinar municipios para este trazado.'
                : 'Sin trazado geográfico para calcular municipios.'
            }</p>`
      }
    </section>
    <section>
      <h3>¿Cómo radicar tu solicitud?</h3>
      <p class="note">
        1) Identifica el municipio con el mapa. 2) La vía está concesionada por la ANI: el
        <b>concesionario</b> es el responsable directo de la operación y atención al usuario; la
        <b>interventoría</b> vigila el contrato en nombre del Estado. 3) Radica con copia a la ANI
        (canal oficial de PQRS) y al concesionario, citando el
        ${p.contratoConcesion ? `<b>contrato de concesión ${esc(p.contratoConcesion)}</b>` : 'contrato de concesión'} y el
        código <code>${esc(p.codigo || '')}</code>.
      </p>
    </section>
  `;

  $('detail').classList.remove('hidden');
  document.querySelector('.layout').classList.add('with-detail');
}

function cerrarDetalle() {
  $('detail').classList.add('hidden');
  document.querySelector('.layout').classList.remove('with-detail');
  state.seleccion = null;
  capaMunicipioActivo.clearLayers();
  if (haloRef) {
    map.removeLayer(haloRef);
    haloRef = null;
  }
  marcarItemActivo(null);
}

/* ------------------------------------------------------------------ */
/* Clic en el mapa: municipio + corredor más cercano                    */
/* ------------------------------------------------------------------ */
function consultarPunto(latlng) {
  const pt = [latlng.lng, latlng.lat];
  const mun = state.muniIdx ? municipioEn(state.muniIdx, pt) : null;

  $('hint').classList.add('hidden');
  capaPunto.clearLayers();
  L.circleMarker(latlng, {
    radius: 6,
    color: '#ffffff',
    weight: 2,
    fillColor: '#f5b942',
    fillOpacity: 1,
  }).addTo(capaPunto);
  if (mun) {
    const f = state.muniIdx.find((x) => x.props.c === mun.c);
    if (f) {
      L.geoJSON(
        { type: 'Feature', geometry: f.geom, properties: {} },
        {
          pane: 'municipioActivo',
          interactive: false,
          style: {
            color: '#f5b942',
            weight: 2,
            opacity: 0.95,
            fillColor: '#f5b942',
            fillOpacity: 0.14,
          },
        }
      ).addTo(capaPunto);
    }
  }

  let mejor = null;
  let mejorDist = Infinity;
  for (const [id, capa] of state.capas) {
    for (const linea of capa.lineas) {
      const { dist } = distPuntoLinea(pt, linea);
      if (dist < mejorDist) {
        mejorDist = dist;
        mejor = id;
      }
    }
  }
  const p = mejor != null && mejorDist < 25000 ? state.porId.get(mejor) : null;

  const body = $('point-body');
  body.innerHTML = `
    <div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6f8aa3;margin-bottom:6px">Punto consultado</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:2px">
      ${mun ? esc(mun.m) : 'Fuera de Colombia / zona no cartografiada'}
    </div>
    <div style="font-size:11.5px;color:#9bb2c7;margin-bottom:10px">
      ${mun ? esc(mun.d) : ''} · ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}
    </div>
    ${
      p
        ? `<div style="border-top:1px solid rgba(255,255,255,.09);padding-top:10px">
             <div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6f8aa3;margin-bottom:5px">
               Corredor ANI más cercano · ${(mejorDist / 1000).toFixed(1)} km
             </div>
             <div style="font-weight:700;font-size:13px;line-height:1.3">${esc(p.nombreCorto || p.nombre)}</div>
             <div style="font-size:11.5px;color:#9bb2c7;margin-top:5px">
               <b style="color:#e8f1f8">Concesionario:</b> ${esc(p.contratista || 'Por confirmar')}<br>
               <b style="color:#e8f1f8">Interventoría:</b> ${esc(
                 (p.interventoria && p.interventoria.nombre) || 'Por verificar en SECOP II'
               )}
             </div>
             <button class="linkbtn" style="margin-top:9px;color:#37cfa5" data-abrir="${p.id}">
               Ver ficha completa →
             </button>
           </div>`
        : `<div style="border-top:1px solid rgba(255,255,255,.09);padding-top:10px;font-size:11.5px;color:#9bb2c7">
             No se detecta una vía concesionada por la ANI en un radio de 25 km. Podría tratarse de una
             vía a cargo de INVIAS o de un ente territorial.
           </div>`
    }
  `;
  const btn = body.querySelector('[data-abrir]');
  if (btn) btn.addEventListener('click', () => seleccionar(Number(btn.dataset.abrir)));
  $('point-card').classList.remove('hidden');
}

/* ------------------------------------------------------------------ */
/* Lista lateral                                                       */
/* ------------------------------------------------------------------ */
function proyectosFiltrados() {
  const { q, tipo, gen, etapa } = state.filtros;
  const nq = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return state.proyectos.filter((p) => {
    if (tipo && p.tipo !== tipo) return false;
    if (gen && p.generacion !== gen) return false;
    if (etapa) {
      if (etapa === 'Reversión' && !/revers/i.test(p.etapa || '')) return false;
      if (etapa !== 'Reversión' && p.etapa !== etapa) return false;
    }
    if (!nq) return true;
    const blob = [p.nombre, p.nombreCorto, p.contratista, p.interventoria?.nombre, p.codigo, p.municipioDomicilio]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return nq.split(/\s+/).every((t) => blob.includes(t));
  });
}

function renderList() {
  const items = proyectosFiltrados();
  const cont = $('list');
  $('list-count').textContent = items.length;
  $('list-title').textContent =
    state.filtros.q || state.filtros.tipo || state.filtros.gen || state.filtros.etapa
      ? 'Resultados'
      : 'Corredores ANI';

  if (!items.length) {
    cont.innerHTML = `<div class="empty">Sin resultados. Ajusta la búsqueda o los filtros.</div>`;
    return;
  }

  cont.innerHTML = items
    .map((p) => {
      const color = colorDe(p, state.colorPor);
      const km =
        p.longitudConcesionKm != null
          ? `${fmtKm(p.longitudConcesionKm)}<small> km</small>`
          : `<small>s/d</small>`;
      const tieneGeo = state.capas.has(p.id);
      return `<div class="item" data-id="${p.id}" role="option" tabindex="0">
        <span class="swatch" style="background:${color}"></span>
        <span>
          <span class="nm">${esc(p.nombreCorto || p.nombre)}</span>
          <span class="sub">
            <span>${esc(p.codigo || '')}</span>
            <span class="sep">·</span>
            <span>${esc(p.generacion || p.tipo)}</span>
            ${p.etapa ? `<span class="sep">·</span><span>${esc(p.etapa)}</span>` : ''}
            ${!tieneGeo ? '<span class="sep">·</span><span style="color:#f5b942">sin trazado</span>' : ''}
          </span>
        </span>
        <span class="km">${km}</span>
      </div>`;
    })
    .join('');

  cont.querySelectorAll('.item').forEach((el) => {
    const id = Number(el.dataset.id);
    el.addEventListener('click', () => seleccionar(id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        seleccionar(id);
      }
    });
  });
}

function renderStats() {
  const visibles = proyectosFiltrados();
  const km = visibles.reduce((s, p) => s + (p.longitudConcesionKm || 0), 0);
  const inter = visibles.filter((p) => p.interventoria && p.interventoria.nombre).length;
  const conGeo = visibles.filter((p) => state.capas.has(p.id)).length;
  const filtrado = visibles.length !== state.proyectos.length;
  $('stats').innerHTML = `
    <div class="stat accent"><b>${fmtKm(km, 0)}</b><span>km concesionados${filtrado ? ' (filtro)' : ''}</span></div>
    <div class="stat"><b>${visibles.length}</b><span>corredores${filtrado ? ' en el filtro' : ''}</span></div>
    <div class="stat"><b>${inter}</b><span>con interventoría</span></div>
    <div class="stat" style="grid-column:1/-1;display:flex;align-items:center;gap:8px;background:rgba(74,168,255,.07);border-color:rgba(74,168,255,.22)">
      <b style="font-size:12px;color:#9fd0ff">${conGeo}</b>
      <span style="margin:0;text-transform:none;letter-spacing:0;font-size:11px;color:#9bb2c7">
        corredores con trazado en el mapa${state.lineasOficiales ? ` · ${state.lineasOficiales} trazados oficiales` : ''}
      </span>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Leyenda                                                             */
/* ------------------------------------------------------------------ */
function renderLeyenda() {
  const pal = PALETAS[state.colorPor];
  const titulo =
    state.colorPor === 'gen' ? 'Generación' : state.colorPor === 'etapa' ? 'Etapa' : 'Modo';
  $('legend').innerHTML = `
    <h4>${titulo}</h4>
    ${Object.entries(pal)
      .map(
        ([k, v]) =>
          `<div class="row"><i style="background:${v}"></i>${k === 's/g' ? 'Sin dato' : esc(k)}</div>`
      )
      .join('')}
    <div class="row" style="margin-top:8px;border-top:1px solid rgba(255,255,255,.09);padding-top:7px;opacity:.8">
      <i style="background:#fff;opacity:.5"></i>Corredor seleccionado
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Exportación CSV                                                     */
/* ------------------------------------------------------------------ */
function exportarCSV() {
  const rows = proyectosFiltrados();
  const head = [
    'Codigo',
    'ID',
    'Nombre',
    'Modo',
    'Generacion',
    'Ola',
    'Etapa',
    'KmConcesion',
    'KmRedACargo',
    'Concesionario',
    'NIT',
    'ContratoConcesion',
    'Interventoria',
    'ContratoInterventoria',
    'ValorInterventoriaCOP',
    'EstadoInterventoria',
    'CorreoConcesionario',
    'TelefonoConcesionario',
    'WebConcesionario',
    'MunicipiosCruzados',
  ];
  const esc2 = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const p of rows) {
    const muns = municipiosDe(p).map((m) => m.nombre);
    lines.push(
      [
        p.codigo,
        p.id,
        p.nombre,
        p.tipo,
        p.generacion,
        p.ola,
        p.etapa,
        p.longitudConcesionKm,
        p.longitudCargoKm,
        p.contratista,
        p.nit,
        p.contratoConcesion,
        p.interventoria?.nombre,
        p.interventoria?.contrato,
        p.interventoria?.valorCop,
        p.interventoria?.estado,
        p.correo,
        p.telefono,
        p.web,
        muns.join(' | '),
      ]
        .map(esc2)
        .join(',')
    );
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `concesiones-ani-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ------------------------------------------------------------------ */
/* Acerca de / fuentes                                                 */
/* ------------------------------------------------------------------ */
function renderAbout(meta = {}) {
  $('about-body').innerHTML = `
    <p>Este visor reúne, en un solo lugar, <b>las vías concesionadas por la Agencia Nacional de
    Infraestructura (ANI)</b>: trazado sobre el mapa, longitud contractual, concesionario,
    interventoría y los municipios que atraviesa cada corredor. El objetivo es que puedas
    identificar en minutos <b>quién responde</b> por un tramo antes de radicar una petición.</p>

    <h3>Fuentes de información</h3>
    <ul>
      <li><b>Geometría oficial:</b> servicio de datos abiertos de la ANI
        (<code>OpenDataAni · Concesiones Carreteras / Modos_ANI</code>), consultado en tiempo real
        y almacenado en caché local por 72 h.</li>
      <li><b>Datos de contacto y contratista:</b> conjunto <i>Concesiones ANI</i> de datos.gov.co
        (corte del archivo entregado: 2026-11-18).</li>
      <li><b>Longitudes, generación, ola y etapa:</b> capa <code>Modos_ANI · Carretero</code>
        de la ANI (campos <code>LngCnc</code> y <code>LngCrg</code>).</li>
      <li><b>Interventorías:</b> contratos de interventoría de la ANI publicados en
        <b>SECOP II</b> (datos.gov.co, dataset <code>jbjy-vk9h</code>), consultados 2026-11-18.</li>
      <li><b>División municipal:</b> Marco Geoestadístico Nacional (DANE/IGAC) vía
        <code>geoColombia</code>.</li>
    </ul>

    <h3>Qué significa cada cifra</h3>
    <ul>
      <li><b>km del contrato de concesión:</b> longitud total del corredor según el contrato
        (puede incluir tramos en operación y en construcción).</li>
      <li><b>km de red a cargo:</b> longitud de la red que la ANI reporta como administrada por
        ese contrato; puede diferir del valor contractual.</li>
    </ul>

    <h3>Limitaciones que debes conocer</h3>
    <ul>
      <li>Algunos corredores (especialmente 5G en estructuración) <b>aún no publican trazado</b>
        en el servicio de la ANI. Su ficha contractual sí está disponible.</li>
      <li>Algunas interventorías aparecen como <i>“por verificar”</i>: son contratos cuyo objeto
        en SECOP II no nombra explícitamente el corredor. <b>Verifícalas en SECOP II</b> antes de
        usarlas en una actuación formal.</li>
      <li>El visor <b>no reemplaza</b> la respuesta oficial de la ANI ni de la interventoría.
        Es una herramienta de orientación.</li>
    </ul>

    <h3>Para radicar un derecho de petición</h3>
    <p>Identifica el municipio en el mapa, el corredor y el concesionario; radica ante el
    concesionario (responsable de la operación) y con copia a la ANI (concedente), citando el
    número de contrato de concesión y el código del proyecto. La interventoría es la instancia de
    control del Estado sobre ese contrato.</p>

    <p style="margin-top:16px;font-size:11.5px;color:#8fa8bf">
      Datos de referencia: ${esc(meta.fuenteLongitudes || 'ANI – datos abiertos')}.
      Última consulta de interventorías: ${esc(meta.fuenteAdjudicacion || 'SECOP II')}.
    </p>
  `;
}

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */
function bindUI() {
  const q = $('q');
  let deb;
  q.addEventListener('input', () => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      state.filtros.q = q.value.trim();
      renderList();
      renderStats();
    }, 130);
  });

  $('f-tipo').addEventListener('change', (e) => {
    state.filtros.tipo = e.target.value;
    renderList();
    renderStats();
  });
  $('f-gen').addEventListener('change', (e) => {
    state.filtros.gen = e.target.value;
    renderList();
    renderStats();
  });
  $('f-etapa').addEventListener('change', (e) => {
    state.filtros.etapa = e.target.value;
    renderList();
    renderStats();
  });

  document.querySelectorAll('.segmented button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.segmented button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.colorPor = b.dataset.color;
      repintar();
      renderLeyenda();
      renderList();
      if (state.seleccion) seleccionar(state.seleccion, { pan: false });
    });
  });

  $('btn-reset').addEventListener('click', () => {
    cerrarDetalle();
    capaPunto.clearLayers();
    map.fitBounds(
      L.latLngBounds([[-4.3, -79.2], [13.6, -66.8]]),
      { padding: [10, 10] }
    );
  });

  $('detail-close').addEventListener('click', cerrarDetalle);
  $('point-close').addEventListener('click', () => $('point-card').classList.add('hidden'));
  $('btn-export').addEventListener('click', exportarCSV);
  $('btn-about').addEventListener('click', () => $('about').classList.remove('hidden'));
  $('about-close').addEventListener('click', () => $('about').classList.add('hidden'));
  $('about').addEventListener('click', (e) => {
    if (e.target.id === 'about') $('about').classList.add('hidden');
  });

  $('btn-refresh').addEventListener('click', async () => {
    try {
      localStorage.removeItem('ani-geom-v3');
    } catch {}
    state.capas.forEach((c) => map.removeLayer(c.layer));
    state.capas.clear();
    cerrarDetalle();
    setStatus('Actualizando geometría desde la ANI…');
    await cargarGeometria(true);
  });

  map.on('click', (e) => consultarPunto(e.latlng));

  map.on('baselayerchange', () => {});

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) {
      e.preventDefault();
      q.focus();
      q.select();
    }
    if (e.key === 'Escape') {
      if (!$('about').classList.contains('hidden')) $('about').classList.add('hidden');
      else if (!$('point-card').classList.contains('hidden')) $('point-card').classList.add('hidden');
      else cerrarDetalle();
    }
  });

  // selector de mapa base (control nativo de Leaflet)
  L.control
    .layers(
      {
        'Mapa oscuro': capasBase.oscuro,
        'Mapa claro': capasBase.claro,
        Satélite: capasBase.satelite,
        'OpenStreetMap': capasBase.osm,
      },
      {},
      { position: 'bottomright', collapsed: true }
    )
    .addTo(map);
}

function repintar() {
  for (const [id, capa] of state.capas) {
    const p = state.porId.get(id);
    capa.layer.eachLayer((l) =>
      l.setStyle({ color: colorDe(p, state.colorPor) })
    );
  }
}

/* init asíncrono con carga de geometría */
(async function arranque() {
  renderLeyenda();
  await init();
  // acceso para depuración / pruebas automatizadas
  window.__ani = { map, state, seleccionar, consultarPunto, proyectosFiltrados, municipiosDe };
})();

