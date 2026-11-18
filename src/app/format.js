/* Paletas y formateo compartido. */

export const PALETAS = {
  gen: {
    '1G': '#4aa8ff',
    '2G': '#7c9cff',
    '3G': '#a78bfa',
    '4G': '#37cfa5',
    '5G': '#f5b942',
    's/g': '#8aa2b8',
  },
  etapa: {
    Operación: '#37cfa5',
    Construcción: '#4aa8ff',
    'Pre-construcción': '#f5b942',
    Estructuración: '#a78bfa',
    'Reversión': '#8aa2b8',
  },
  tipo: {
    Carretero: '#37cfa5',
    Férreo: '#f5b942',
    Fluvial: '#4aa8ff',
  },
};

export function colorDe(p, modo) {
  if (modo === 'etapa') return PALETAS.etapa[p.etapa] || '#8aa2b8';
  if (modo === 'tipo') return PALETAS.tipo[p.tipo] || '#8aa2b8';
  return PALETAS.gen[p.generacion] || PALETAS.gen['s/g'];
}

export function fmtKm(v, dec = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtCop(v) {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)} bill. COP`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)} mil M COP`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)} M COP`;
  return `$${v.toLocaleString('es-CO')}`;
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const ETAPAS_ORDEN = ['Operación', 'Construcción', 'Pre-construcción', 'Estructuración', 'Reversión'];
