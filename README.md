# Taller Moto

App para planificar y apuntar el mantenimiento de una Kawasaki Eliminator 500 SE, con el par de apriete al lado de cada paso. Funciona sin cobertura: los datos se guardan en el propio móvil.

## Qué hace

- **Qué toca**: con los kilómetros actuales, ordena las tareas en vencidas, pronto y al día, por kilómetros o por tiempo.
- **Pasos con su par**: cada tarea trae herramientas, pasos y el par de apriete de cada tornillo, con su fuente.
- **Pares de apriete**: la tabla completa. Cada valor lleva etiqueta: *Oficial*, *Cita del manual*, *Probable* o *Sin dato*. Si confirmas un valor (por ejemplo, con el taller), lo guardas con su fuente; sin fuente no se guarda.
- **Avisos en el Calendario**: pasa al Calendario del móvil cuándo toca cada trabajo, con aviso una semana antes y el mismo día. Las fechas por km se estiman con tu media de km al día.
- **Gastos**: apunta lo que cuesta cada trabajo al marcarlo como hecho, o cualquier otro gasto de la moto, y ve el total de cada año.
- **Exportar a Excel**: un `.xlsx` con gastos, trabajos hechos, lo que toca y pares de apriete, para verlo en el PC. Es una foto: no sirve para recuperar datos.
- **Copia de seguridad**: exporta un archivo `.json` y guárdalo en Google Drive. Al importarlo se une con lo que hay en el móvil y no se borra nada.

## Instalar en iPhone

1. En el iPhone, abre https://wuade.github.io/taller-moto/ con Safari.
2. Pulsa el botón de compartir y elige «Añadir a pantalla de inicio».
3. Abre la app desde el icono «Taller». La primera vez necesita internet; después abre también sin cobertura.

Los datos se guardan en el iPhone, dentro de la app. Si borras el icono, se borran con él: haz una copia de seguridad antes.

Las versiones nuevas se ponen solas al abrir la app. Si en ese momento estás usándola, sale un aviso y se pone la próxima vez que vuelvas a ella.

## Instalar en Android

1. En el móvil, abre [la última versión](https://github.com/wuade/taller-moto/releases/latest).
2. Descarga `taller-moto.apk` y ábrelo. Android pedirá permiso para instalar apps desde el navegador; acéptalo para esta instalación.
3. Para actualizar, instala el APK nuevo encima del anterior: se conservan los datos. No desinstales la app antes, porque eso sí borra los datos del móvil.

El APK va firmado con la clave de depuración estándar de React Native. Sirve para uso personal; para publicarla en Google Play habría que firmarla con una clave propia.

## De dónde salen los datos

Todo está en [`src/data/eliminator500.ts`](src/data/eliminator500.ts).

- **Intervalos**: manual de propietario (páginas 101 a 103) y el Excel de mantenimiento. Donde no coinciden, la app lo indica.
- **Pares**: solo tres están comprobados en el manual de propietario (filtro de aceite, tapón de vaciado y eje trasero). El resto viene de fotos o citas del manual de servicio publicadas en foros, o de la Ninja 400, y así se etiqueta.
- **Regla**: ningún par se inventa. Si no hay documento fiable, sale como *Sin dato*: no se aprieta a ojo.

## Desarrollo

```bash
npm ci
npm test            # pruebas
npm run typecheck   # tipos
npm run lint
npx expo start      # desarrollo
npm run build:web   # versión web instalable (PWA) en dist/
```

Cada cambio en `main` publica la versión web en GitHub Pages ([`.github/workflows/web.yml`](.github/workflows/web.yml)).

El APK de Android se compila a mano: Actions > APK Android > Run workflow ([`.github/workflows/android.yml`](.github/workflows/android.yml)). Queda publicado en Releases.
