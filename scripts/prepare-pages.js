/* Prepara un sitio estático (public/ + data/) listo para GitHub Pages.
   Uso: node scripts/prepare-pages.js [carpeta-salida]   (por defecto: dist) */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const SALIDA = path.resolve(RAIZ, process.argv[2] || 'dist');

function copiarDir(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const entrada of fs.readdirSync(origen, { withFileTypes: true })) {
    const o = path.join(origen, entrada.name);
    const d = path.join(destino, entrada.name);
    if (entrada.isDirectory()) copiarDir(o, d);
    else fs.copyFileSync(o, d);
  }
}

const appJs = path.join(RAIZ, 'public', 'assets', 'app.js');
if (!fs.existsSync(appJs)) {
  console.error('Falta public/assets/app.js. Ejecuta primero: npm run build');
  process.exit(1);
}

fs.rmSync(SALIDA, { recursive: true, force: true });
copiarDir(path.join(RAIZ, 'public'), SALIDA);

const datos = path.join(SALIDA, 'data');
fs.mkdirSync(datos, { recursive: true });
for (const archivo of ['proyectos.json', 'municipios.json', 'departamentos.json']) {
  fs.copyFileSync(path.join(RAIZ, 'data', archivo), path.join(datos, archivo));
}

// evita el procesamiento de Jekyll en Pages
fs.writeFileSync(path.join(SALIDA, '.nojekyll'), '');
// sin archivo de configuración: no hay build de Jekyll ni tema
fs.writeFileSync(path.join(SALIDA, '_config.yml'), '');

const peso = (p) => (fs.statSync(p).size / 1024).toFixed(0) + ' kB';
const requeridos = [
  'index.html',
  'assets/app.js',
  'assets/app.css',
  'assets/leaflet.js',
  'data/proyectos.json',
  'data/municipios.json',
  'data/departamentos.json',
];
const faltantes = requeridos.filter((r) => !fs.existsSync(path.join(SALIDA, r)));
if (faltantes.length) {
  console.error('Artefacto incompleto, faltan:', faltantes.join(', '));
  process.exit(1);
}

console.log(`Sitio estático listo en ${path.relative(RAIZ, SALIDA) || '.'}/`);
for (const r of requeridos) console.log(`  ${r.padEnd(26)} ${peso(path.join(SALIDA, r))}`);
