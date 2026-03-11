# Contratos menores do Concello de Vigo

Monorepo con dos piezas:

- `pipeline/`: scripts de Python para descargar, normalizar y agregar los datasets anuales publicados por el Concello de Vigo.
- `site/`: web estatica en Astro + React que consume JSON derivados y se publica en GitHub Pages.

## Estructura

- `pipeline/src/contratos_vigo`: logica de ingesta, normalizacion, analitica y exportacion.
- `pipeline/config`: alias, taxonomias y umbrales configurables.
- `pipeline/tests`: fixtures y tests del pipeline.
- `site/src`: layout, paginas, componentes y librerias de cliente.
- `site/public/data/derived`: artefactos JSON servidos por la web.
- `.github/workflows`: CI, refresco de datos y despliegue a GitHub Pages.

## Preparacion local

1. Instalar dependencias Python del pipeline:

```bash
python -m pip install -e pipeline[dev]
```

2. Instalar dependencias del frontend:

```bash
npm install --prefix site
```

## Generar datos

### Opcion rapida: fixtures locales

Genera un conjunto pequeno de JSON derivados para probar la web sin descargar el portal real.

```bash
npm run data:fixtures
```

### Opcion real: descargar y procesar todos los anos disponibles

```bash
npm run data:refresh
```

Tambien puedes lanzar anos concretos directamente:

```bash
node scripts/run-python.mjs -m contratos_vigo refresh --year 2024 --year 2025
```

Si tu ejecutable de Python no se llama `python`, puedes fijarlo asi:

```bash
set PYTHON_BIN=C:\ruta\a\python.exe
npm run data:fixtures
```

## Probar la web

### Desarrollo local

```bash
npm run dev
```

La web queda en `http://localhost:4321` o el puerto que indique Astro.

### Build de produccion

```bash
npm run build
npm run preview
```

## Validaciones

### Tests del pipeline

```bash
python -m pytest pipeline/tests -q
```

### Tests web y chequeos

```bash
npm run test:web
npm --prefix site run check
npm run test:e2e
```

## Notas

- La web usa `award_date` para series mensuales y `source_year` para comparativas anuales.
- El KPI principal de volumen es `adjudicaciones publicadas`, es decir, filas del JSON fuente.
- Los hallazgos se expresan siempre con lenguaje prudente y explican la regla aplicada.
- Las fichas dinamicas de adjudicatarios y unidades se generan a partir de los indices JSON producidos por el pipeline.
