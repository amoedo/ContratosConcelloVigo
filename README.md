# Contratos menores do Concello de Vigo / Contratos menores del Concello de Vigo

[English](#english)

Proxecto aberto para facilitar a consulta, a análise e a reutilización dos contratos menores publicados polo Concello de Vigo. Combina un proceso reproducible de preparación de datos con unha web estática pensada para achegar información pública a persoas investigadoras, xornalistas, entidades e cidadanía.

El proyecto analiza las publicaciones anuales de contratos menores del Concello de Vigo y las presenta en una interfaz navegable. Su objetivo es hacer más accesibles los datos públicos, ofrecer contexto para su interpretación y permitir comprobar cada resultado frente a su fuente.

> [!IMPORTANT]
> As análises e sinais deste proxecto **non determinan a legalidade** dunha adxudicación nin proban irregularidades. Serven para identificar información que pode merecer revisión, sempre coa documentación oficial e o contexto administrativo completo.
>
> Los análisis y señales del proyecto **no determinan la legalidad** de una adjudicación ni prueban irregularidades. Identifican información que puede requerir revisión, siempre junto con la documentación oficial y el contexto administrativo completo.

## Contexto e alcance / Contexto y alcance

Os contratos menores son unha modalidade de contratación pública regulada no artigo 118 da Lei 9/2017, de contratos do sector público (LCSP). A norma establece, como referencia, un valor estimado inferior a 40.000 € para obras e a 15.000 € para subministracións ou servizos, sen IVE, e esixe xustificar que non se altera o obxecto do contrato para evitar estes límites.

Los contratos menores son una modalidad de contratación pública regulada por el artículo 118 de la Ley 9/2017, de Contratos del Sector Público (LCSP). La norma fija, como referencia, un valor estimado inferior a 40.000 € para obras y a 15.000 € para suministros o servicios, sin IVA, y exige justificar que no se altera el objeto del contrato para evitar esos límites.

Os datos proceden dos ficheiros JSON anuais de contratos menores publicados polo [portal de datos abertos do Concello de Vigo](https://datos.vigo.org/). A unidade de análise é cada fila publicada pola fonte; non ten por que corresponder cun expediente único. A cobertura comeza en 2019 e depende dos conxuntos de datos dispoñibles no portal municipal.

Los datos proceden de los ficheros JSON anuales de contratos menores publicados por el [portal de datos abiertos del Concello de Vigo](https://datos.vigo.org/). La unidad de análisis es cada fila publicada por la fuente; no tiene por qué corresponder con un expediente único. La cobertura comienza en 2019 y depende de los conjuntos de datos disponibles en el portal municipal.

## Que ofrece / Qué ofrece

- Exploración de adxudicacións, unidades tramitadoras e adxudicatarios.
- Series temporais, importes, indicadores de competencia e clasificación temática.
- Sinais configurables para priorizar casos de revisión, como importes próximos aos limiares legais.
- Fichas e agregados xerados a partir dos datos publicados, cunha metodoloxía e limitacións explícitas.
- Conservación dos valores orixinais e informes de incidencias para facer o tratamento máis auditable.

- Exploración de adjudicaciones, unidades tramitadoras y adjudicatarios.
- Series temporales, importes, indicadores de competencia y clasificación temática.
- Señales configurables para priorizar casos de revisión, como importes próximos a los umbrales legales.
- Fichas y agregados generados a partir de los datos publicados, con metodología y limitaciones explícitas.
- Conservación de los valores originales e informes de incidencias para hacer el tratamiento más auditable.

## Metodoloxía e límites / Metodología y límites

O *pipeline* descarga e conserva os datos de orixe, normaliza campos para facilitar a comparación e xera ficheiros JSON derivados para a web. Os alias seguros aplícanse de forma determinista; as coincidencias difusas ambiguas non se fusionan automaticamente e quedan para revisión. As comparacións anuais utilizan o ano do conxunto de datos e as series mensuais só usan datas de adxudicación válidas.

El *pipeline* descarga y conserva los datos de origen, normaliza campos para facilitar la comparación y genera ficheros JSON derivados para la web. Los alias seguros se aplican de forma determinista; las coincidencias difusas ambiguas no se fusionan automáticamente y quedan para revisión. Las comparativas anuales usan el año del conjunto de datos y las series mensuales solo usan fechas de adjudicación válidas.

A fonte municipal publica un campo de importe, pero o conxunto de datos por si só non permite confirmar que equivalga exactamente ao valor estimado sen IVE definido pola LCSP. Por iso, os limiares legais úsanse unicamente como referencia analítica. A análise tampouco inclúe o expediente completo, ofertas, motivación administrativa nin todo o contexto do mercado.

La fuente municipal publica un campo de importe, pero el conjunto de datos por sí solo no permite confirmar que equivalga exactamente al valor estimado sin IVA definido por la LCSP. Por ello, los umbrales legales se usan únicamente como referencia analítica. El análisis tampoco incluye el expediente completo, ofertas, motivación administrativa ni todo el contexto del mercado.

Antes de tirar ou extraer conclusións, consulta a publicación municipal e a documentación oficial correspondente. O último exercicio pode estar incompleto e as clasificacións temáticas ou normalizacións poden conter erros.

Antes de extraer conclusiones, consulta la publicación municipal y la documentación oficial correspondiente. El último ejercicio puede estar incompleto y las clasificaciones temáticas o normalizaciones pueden contener errores.

## Arquitectura / Arquitectura

| Compoñente / Componente | Descrición / Descripción |
|---|---|
| `pipeline/` | ETL en Python: descarga, normalización, análise e exportación de datos. |
| `pipeline/config/` | Alias, regras temáticas e limiares versionados e configurables. |
| `pipeline/tests/` | *Fixtures* e probas do pipeline con `pytest`. |
| `site/` | Web estática construída con Astro e React. |
| `site/public/data/derived/` | Artefactos JSON derivados que consume a web. |
| `.github/workflows/` | Integración continua, actualización periódica e despregamento en GitHub Pages. |

GitHub Pages serve o resultado como sitio estático: non hai base de datos nin un *backend* que procese consultas de persoas usuarias.

## Uso local / Uso local

### Requisitos

- Python 3.11 ou superior / Python 3.11 o superior.
- Node.js 22 ou superior e npm / Node.js 22 o superior y npm.

### Instalación

```bash
python -m pip install -e pipeline[dev]
npm install --prefix site
```

### Datos de proba / Datos de prueba

Xera datos derivados a partir de *fixtures* locais, sen descargar o portal municipal:

Genera datos derivados a partir de *fixtures* locales, sin descargar el portal municipal:

```bash
npm run data:fixtures
```

### Actualización de datos / Actualización de datos

Procesa todos os anos dispoñibles / Procesa todos los años disponibles:

```bash
npm run data:refresh
```

Para anos concretos / Para años concretos:

```bash
node scripts/run-python.mjs -m contratos_vigo refresh --year 2024 --year 2025
```

### Desenvolvemento e validación / Desarrollo y validación

```bash
npm run dev
npm run build
python -m pytest pipeline/tests -q
npm run test:web
npm run lint
npm run test:e2e
```

O servidor de desenvolvemento adoita estar dispoñible en `http://localhost:4321`.

## Contribuír / Contribuir

As contribucións son benvidas. Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para preparar o contorno, coñecer as convencións e executar as validacións antes de abrir unha proposta de cambio.

Las contribuciones son bienvenidas. Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para preparar el entorno, conocer las convenciones y ejecutar las validaciones antes de abrir una propuesta de cambio.

Ao informar dun problema nos datos, inclúe a ligazón á fonte municipal, o ano, o identificador ou rexistro afectado e unha descrición verificable. Non publiques datos persoais innecesarios.

Al informar de un problema en los datos, incluye el enlace a la fuente municipal, el año, el identificador o registro afectado y una descripción verificable. No publiques datos personales innecesarios.

## Licenza / Licencia

O código publícase baixo a [licenza MIT](LICENSE). Os datos de orixe pertencen á súa fonte e deben reutilizarse de acordo coas condicións do portal de datos abertos do Concello de Vigo.

El código se publica bajo la [licencia MIT](LICENSE). Los datos de origen pertenecen a su fuente y deben reutilizarse conforme a las condiciones del portal de datos abiertos del Concello de Vigo.

---

## English

An open project to make the minor-contract data published by the Concello de Vigo easier to consult, analyse, and reuse. It combines a reproducible data-preparation pipeline with a static website for researchers, journalists, civic organisations, and the public.

> [!IMPORTANT]
> This project’s analyses and signals **do not determine whether an award is lawful** and do not prove irregularities. They identify information that may warrant review, always alongside the official record and complete administrative context.

### Background and scope

Minor contracts are a form of public procurement regulated by article 118 of Spain’s Law 9/2017 on Public-Sector Contracts (LCSP). As a reference, the law sets an estimated value below €40,000 for works and below €15,000 for supplies or services, excluding VAT, and requires justification that the contract’s purpose has not been altered to avoid those limits.

The data comes from the annual minor-contract JSON files published through the [Concello de Vigo open-data portal](https://datos.vigo.org/). Each published row is the unit of analysis; it does not necessarily represent one unique procurement file. Coverage begins in 2019 and is limited to the datasets available from the municipal portal.

### What the project provides

- Browsing of awards, contracting units, and awardees.
- Time series, amounts, competition indicators, and topic classification.
- Configurable signals to prioritise records for review, including amounts near legal thresholds.
- Pages and aggregates generated from the published data, with documented methods and limitations.
- Retention of original values and data-quality reports to support auditability.

### Method and limitations

The Python pipeline downloads and preserves source data, normalises fields for comparison, and produces the JSON files used by the site. Safe aliases are applied deterministically. Ambiguous fuzzy matches are not merged automatically; they are left for review. Annual comparisons use the dataset year, while monthly series only use valid award dates.

The municipal source supplies an amount field, but the dataset alone cannot establish that it is exactly the estimated value excluding VAT defined by the LCSP. Legal thresholds are therefore analytical references only. The analysis does not include the complete procurement file, bids, administrative reasoning, or all relevant market context.

Consult the municipal publication and the relevant official records before drawing conclusions. The latest year may be incomplete, and topic classification or normalisation may contain errors.

### Architecture, local use, and contributing

The repository contains:

- `pipeline/`: Python ETL for downloading, normalising, analysing, and exporting data.
- `pipeline/config/`: versioned, configurable aliases, topic rules, and thresholds.
- `site/`: an Astro and React static site consuming generated JSON files.
- `.github/workflows/`: continuous integration, scheduled refreshes, and GitHub Pages deployment.

Requirements are Python 3.11+ and Node.js 22+ with npm. Install dependencies, generate local fixture data, and run the development site with:

```bash
python -m pip install -e pipeline[dev]
npm install --prefix site
npm run data:fixtures
npm run dev
```

Use `npm run data:refresh` to process all available years, or pass repeated `--year` arguments through `node scripts/run-python.mjs -m contratos_vigo refresh`. Run `python -m pytest pipeline/tests -q`, `npm run test:web`, `npm run lint`, and `npm run test:e2e` before proposing changes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.

### Licence

The code is available under the [MIT License](LICENSE). Source data belongs to its publisher and must be reused under the terms of the Concello de Vigo open-data portal.
