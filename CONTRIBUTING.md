# Guía de contribución

¡Gracias por tu interés en mejorar este proyecto! A continuación encontrarás las pautas para contribuir.

## Requisitos previos

- **Python 3.11+** para el pipeline de datos.
- **Node.js 22+** y **npm** para el sitio web.

## Preparación del entorno

```bash
# 1. Instalar dependencias del pipeline
python -m pip install -e pipeline[dev]

# 2. Instalar dependencias del frontend
npm install --prefix site

# 3. Generar datos de prueba (sin descargar del portal real)
npm run data:fixtures
```

## Flujo de trabajo

1. Crea una rama a partir de `main` con un nombre descriptivo:
   ```bash
   git checkout -b feature/mi-mejora
   ```
2. Realiza tus cambios y asegúrate de que los tests pasan:
   ```bash
   # Tests del pipeline
   python -m pytest pipeline/tests -q

   # Tests del frontend
   npm run test:web

   # Chequeo de tipos (Astro + TypeScript)
   npm run lint
   ```
3. Abre un *pull request* describiendo los cambios realizados.

## Estructura del proyecto

| Directorio | Descripción |
|---|---|
| `pipeline/` | ETL en Python: descarga, normaliza y analiza datos |
| `pipeline/config/` | Alias, umbrales y reglas configurables |
| `pipeline/tests/` | Tests del pipeline (pytest) |
| `site/` | Web estática con Astro + React |
| `site/src/` | Páginas, componentes y librerías |
| `site/public/data/derived/` | JSON generados por el pipeline |

## Convenciones de código

- **Python**: tipado con *type hints*, formato legible y tests con `pytest`.
- **TypeScript**: modo estricto habilitado, componentes React con extensión `.tsx`.
- Los mensajes de commit deben ser claros y concisos.

## Reportar problemas

Abre un *issue* en GitHub describiendo:
- Qué ocurre y qué esperabas.
- Pasos para reproducir el problema.
- Versión de Python/Node si es relevante.
