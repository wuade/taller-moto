// Genera dist/sw.js después de `expo export --platform web`.
// El service worker guarda todos los archivos de la app la primera vez que se abre,
// así la versión web se abre después aunque no haya cobertura.
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const base = JSON.parse(readFileSync('app.json', 'utf8')).expo.experiments?.baseUrl ?? '';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Rutas absolutas para el manifiesto y el icono: index.html también se sirve desde rutas profundas.
const indexPath = join(dist, 'index.html');
writeFileSync(
  indexPath,
  readFileSync(indexPath, 'utf8')
    .replace('href="manifest.json"', `href="${base}/manifest.json"`)
    .replace('href="apple-touch-icon.png"', `href="${base}/apple-touch-icon.png"`),
);
// Con alojamiento estático, los enlaces directos a una pantalla caen en 404.html.
copyFileSync(indexPath, join(dist, '404.html'));

const files = walk(dist)
  .map((path) => relative(dist, path).split(sep).join('/'))
  .filter((path) => path !== 'sw.js' && path !== '404.html' && !path.endsWith('.map'))
  .sort();

const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(join(dist, file)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// Generado por scripts/make-sw.mjs. No editar.
const CACHE = 'taller-moto-${version}';
const FILES = ${JSON.stringify(['./', ...files.map((f) => `./${f}`)], null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Las pantallas de la app son todas index.html. Se sirve la copia guardada primero para que abra
  // al momento aunque la cobertura sea mala; las versiones nuevas llegan con un sw.js nuevo.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((hit) => hit ?? fetch(request)));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)));
});
`;

writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${files.length} archivos en caché (versión ${version})`);
