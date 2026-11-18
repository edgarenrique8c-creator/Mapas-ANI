/* Servidor estático mínimo (sin dependencias): public/ y data/. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(RAIZ, 'public');
const DATA = path.join(RAIZ, 'data');
const PUERTO = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '0.0.0.0';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const servidor = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/') url = '/index.html';

  const usaData = url.startsWith('/data/');
  const base = usaData ? DATA : PUBLIC;
  const rel = usaData ? url.slice('/data'.length) : url;
  const archivo = path.join(base, rel);

  if (!archivo.startsWith(DATA) && !archivo.startsWith(PUBLIC)) {
    res.writeHead(403).end('Prohibido');
    return;
  }

  fs.readFile(archivo, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`404 ${url}`);
      return;
    }
    res.writeHead(200, {
      'content-type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*',
    });
    res.end(buf);
  });
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Concesiones ANI · http://${HOST}:${PUERTO}`);
});
