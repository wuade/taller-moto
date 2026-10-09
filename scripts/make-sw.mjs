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
const html = readFileSync(indexPath, 'utf8')
  .replace('href="manifest.json"', `href="${base}/manifest.json"`)
  .replace('href="apple-touch-icon.png"', `href="${base}/apple-touch-icon.png"`);
writeFileSync(indexPath, html);
// Con alojamiento estático, los enlaces directos a una pantalla caen en 404.html.
copyFileSync(indexPath, join(dist, '404.html'));

const files = walk(dist)
  .map((path) => relative(dist, path).split(sep).join('/'))
  .filter((path) => path !== 'sw.js' && path !== '404.html' && !path.endsWith('.map'))
  .sort();

// El código de la app que carga este index.html.
const entry = /src="[^"]*?\/(_expo\/static\/js\/web\/entry-[^"]+\.js)"/.exec(html)?.[1];
if (!entry || !files.includes(entry)) throw new Error('No encuentro el código de la app (entry-*.js) en index.html');

const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(join(dist, file)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// Generado por scripts/make-sw.mjs. No editar.
const CACHE = 'taller-moto-${version}';
const ENTRY = ${JSON.stringify(`./${entry}`)};
const FILES = ${JSON.stringify(['./', ...files.map((f) => `./${f}`)], null, 2)};

// Guarda la versión entera o nada. 'reload' salta la caché HTTP del navegador, que puede tener aún el
// index.html de la versión anterior: ese index.html pediría un código que ya no existe y la app saldría en blanco.
async function install() {
  const cache = await caches.open(CACHE);
  try {
    await cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })));
    const page = await cache.match('./index.html');
    if (!page || !(await page.text()).includes(ENTRY.slice(1))) throw new Error('index.html de otra versión');
  } catch (error) {
    await caches.delete(CACHE);
    throw error;
  }
}

// Una caché rota guarda un index.html sin el código que pide. Así se quedaba la app en blanco.
async function isBroken(name) {
  const cache = await caches.open(name);
  const page = await cache.match('./index.html');
  const src = page ? /src="([^"]*entry-[^"]*[.]js)"/.exec(await page.text())?.[1] : undefined;
  return Boolean(src) && !(await cache.match(src));
}

async function activate() {
  const old = (await caches.keys()).filter((key) => key.startsWith('taller-moto-') && key !== CACHE);
  const broken = (await Promise.all(old.map(isBroken))).some(Boolean);
  await Promise.all(old.map((key) => caches.delete(key)));
  await self.clients.claim();
  return broken;
}

function reload(client) {
  if (typeof client.navigate === 'function') client.navigate(client.url).catch(() => {});
}

self.addEventListener('install', (event) => {
  event.waitUntil(install().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    activate().then((broken) => {
      // La app abierta estaba en blanco por la caché rota: se recarga con esta versión. No se espera a
      // la recarga, porque esta necesita que el service worker haya terminado de activarse.
      if (broken) self.clients.matchAll({ type: 'window' }).then((windows) => windows.forEach(reload));
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Las pantallas de la app son todas index.html. Se sirve la copia guardada primero para que abra
  // al momento aunque la cobertura sea mala; las versiones nuevas llegan con un sw.js nuevo.
  if (request.mode === 'navigate') {
    event.respondWith(savedPage().then((page) => page ?? fetch(request)));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)));
});

// La copia guardada de index.html solo sirve si también está su código.
async function savedPage() {
  const cache = await caches.open(CACHE);
  const [page, code] = await Promise.all([cache.match('./index.html'), cache.match(ENTRY)]);
  return page && code ? page : undefined;
}
`;

writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${files.length} archivos en caché (versión ${version}, código ${entry})`);
