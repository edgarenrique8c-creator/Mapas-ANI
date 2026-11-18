/* Prepara el artefacto de GitHub Pages: public/ + los datos del catálogo y la geografía. */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const DIST = path.join(RAIZ, 'dist');

function copiarDir(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const entrada of fs.readdirSync(origen, { withFileTypes: true })) {
    const o = path.join(origen, entrada.name);
    const d = path.join(destino, entrada.name);
    if (entrada.isDirectory()) copiarDir(o, d);
    else fs.copyFileSync(o, d);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
copiarDir(path.join(RAIZ, 'public'), DIST);

const datos = path.join(DIST, 'data');
fs.mkdirSync(datos, { recursive: true });
for (const archivo of ['proyectos.json', 'municipios.json', 'departamentos.json']) {
  fs.copyFileSync(path.join(RAIZ, 'data', archivo), path.join(datos, archivo));
}

// evita el procesamiento de Jekyll en Pages
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

const peso = (p) => (fs.statSync(p).size / 1024).toFixed(0) + ' kB';
console.log('dist/ listo:');
console.log('  index.html   ', peso(path.join(DIST, 'index.html')));
console.log('  assets/app.js', peso(path.join(DIST, 'assets', 'app.js')));
for (const a of ['proyectos.json', 'municipios.json', 'departamentos.json']) {
  console.log(`  data/${a}`, peso(path.join(datos, a)));
}
