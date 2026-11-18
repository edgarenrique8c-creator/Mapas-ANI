# Concesiones ANI · Mapa interactivo de vías concesionadas

Visor web que muestra, sobre un mapa de Colombia, **las vías concesionadas por la Agencia Nacional de
Infraestructura (ANI)** y permite responder tres preguntas concretas para un tramo cualquiera:

1. **¿Cuántos kilómetros tiene la concesión?** (longitud contractual y longitud de red a cargo)
2. **¿Quién es el concesionario y quién la interventoría?** (con NIT, contrato y datos de contacto)
3. **¿En qué municipio se debe radicar una petición** y ante quién.

## Verlo publicado (GitHub Pages)

El sitio se publica automáticamente con GitHub Actions en
`https://edgarenrique8c-creator.github.io/Mapas-ANI/` cada vez que se hace push a `main`.

Para habilitarlo una sola vez: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
El workflow `.github/workflows/pages.yml` compila el paquete, arma `dist/` con la app y los datos y
lo publica. Para generar ese artefacto localmente: `npm run pages` (queda en `dist/`).

## Cómo se usa

- `npm install` y luego `npm start` → http://localhost:5173
- `npm run build` regenera el paquete del navegador en `public/assets/app.js`.
- `npm run pages` genera el sitio estático listo para publicar en `dist/`.
- `npm run datos` regenera `data/proyectos.json` a partir del CSV de la ANI y de las tablas
  de atributos (Modos_ANI / SECOP II) incluidas en `scripts/gen_proyectos.js`.

## Funcionalidad

| Función | Detalle |
|---|---|
| Mapa interactivo | Leaflet empaquetado localmente (sin CDN). Cuatro mapas base: oscuro, claro, satélite y OSM, además de un mapa base vectorial propio de departamentos que se dibuja aunque no haya teselas. |
| Trazado en tiempo real | La geometría se descarga del **servicio de datos abiertos de la ANI** al abrir la app (paginada por OBJECTID, `maxAllowableOffset` para reducir peso), con caché local de 72 h y botón *Actualizar geometría*. |
| Longitudes | `LngCnc` (km del contrato de concesión) y `LngCrg` (km de red a cargo) según la ANI. |
| Concesionario | Nombre, NIT, contrato de concesión, domicilio, dirección, teléfono, correo y sitio web (enlaces `tel:` y `mailto:`). |
| Interventoría | Contratista, número y valor del contrato y estado, tomados de **SECOP II**. Cuando el objeto contractual no nombra el corredor, la ficha lo advierte (`verificado: false`). |
| Municipios | Clic en cualquier punto → municipio y departamento (polígonos del MGN/IGAC) + corredor ANI más cercano con su concesionario e interventoría. En la ficha se listan todos los municipios por los que pasa el trazado. |
| Búsqueda y filtros | Búsqueda por corredor, concesionario, interventoría o código; filtros por modo, generación y etapa; color por generación, etapa o modo. |
| Exportación | CSV de los corredores filtrados con longitudes, concesionario, interventoría y municipios cruzados. |

## Datos

| Archivo | Contenido |
|---|---|
| `data/source/Concesiones_ANI_20261118.csv` | Archivo original entregado (150 filas). |
| `data/ani_csv_concesiones.json` | 60 registros únicos del CSV (Carretero, Férreo, Fluvial). |
| `data/proyectos.json` | Catálogo enriquecido: longitudes, generación, ola, etapa, contrato, concesionario e interventoría. |
| `data/municipios.json` / `data/departamentos.json` | Polígonos simplificados de Colombia (1122 municipios, 33 departamentos). |

### Fuentes

- **ANI · datos abiertos (ArcGIS):** `OpenDataAni/FeatureServer/3` (trazados carreteros con
  `ID_MT`, `NOMBRE`, `GEN`, `OLA_4G`, `ESTADO`) y `Modos_ANI/FeatureServer/2·3·4`
  (férreo, atributos carreteros con `LngCnc`/`LngCrg`, fluvial).
- **SECOP II** (`datos.gov.co`, `jbjy-vk9h`): contratos de interventoría de la ANI.
- **Concesiones ANI** (`datos.gov.co`, `b9m8-fgtx`): datos de contacto y contratista.
- **División territorial:** Marco Geoestadístico Nacional vía `geoColombia`.

## Estructura

```
public/            index.html, assets (app.js propio, leaflet, css)
src/app/           main.js (UI + mapa), data.js (descarga ANI), geo.js (geometría), format.js
scripts/           build.js (esbuild), serve.js (servidor estático), gen_proyectos.js (datos)
data/              catálogo y geografía
```

## Advertencia

Los emparejamientos entre corredores y contratos de interventoría marcados como no verificados son
**indicativos**. Antes de usarlos en un derecho de petición, confirme el número de contrato y el
contratista en SECOP II.
