import { formatNumber } from '@/lib/format';
import { useLanguage } from '@/lib/i18n';
import { RULES } from '@/lib/rules';
import type { MetaData } from '@/lib/types';

const LEGAL_LINK = 'https://boe.es/buscar/act.php?id=BOE-A-2017-12902&p=20230301&tn=0';
const INSTRUCTION_LINK = 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-3281';

const COPY = {
  es: {
    eyebrow: 'Metodología', title: 'Cómo se construye la web y cómo interpretar sus señales', intro: 'Esta página documenta el origen, el tratamiento y los límites del análisis. Permite reproducir los resultados y evita confundir una señal automática con una conclusión jurídica.',
    origin: 'Origen y cobertura', originBody: 'Los datos proceden de los JSON anuales de contratos menores publicados por el Concello de Vigo. La unidad de análisis principal es cada fila publicada, no necesariamente un expediente único.',
    architecture: 'Arquitectura', architectureBody: 'Un pipeline en Python descarga, conserva y normaliza los datos; calcula agregados, temas y señales; y genera archivos JSON por año y sección. Astro construye las páginas estáticas y React carga únicamente los datos necesarios en el navegador. GitHub Pages sirve el resultado sin base de datos ni backend.',
    normalization: 'Normalización', normalizationBody: 'Se conservan siempre los valores originales. En paralelo se limpian espacios, saltos de línea, puntuación y variantes societarias. Los alias seguros se fusionan de forma determinista; las coincidencias difusas ambiguas pasan a un informe de revisión.',
    metrics: 'Métricas', metricsBody: 'Las comparativas anuales utilizan el año del dataset. Las series mensuales utilizan una fecha de adjudicación válida. Los licitadores nulos o menores o iguales a cero se consideran sin dato y quedan fuera de los denominadores de competencia.',
    legal: 'Umbrales legales y referencia analítica', legalBody: 'El artículo 118 de la Ley 9/2017 considera contratos menores los de valor estimado inferior a 40.000 € en obras y a 15.000 € en suministros o servicios. También exige justificar que no se altera el objeto para evitar esos límites.',
    legalCaution: 'La fuente municipal publica un campo importe, pero el dataset por sí solo no permite confirmar que equivalga exactamente al valor estimado sin IVA definido por la ley. La web usa los límites como referencia analítica: no determina la legalidad de una adjudicación.',
    law: 'Ley 9/2017 consolidada, artículo 118', instruction: 'Instrucción OIReScon 1/2019 sobre contratos menores',
    near: 'La señal “cerca del umbral” cubre del 85% al 100%: 12.750–15.000 € para servicios y suministros, y 34.000–40.000 € para obras. Los valores límite exactos se conservan en una configuración versionada.',
    quality: 'Calidad del dato', qualityBody: 'Las incidencias se muestran y no se corrigen silenciosamente. Una fecha fuera del año permanece asociada al dataset fuente; en 2019 se generan claves sintéticas porque no existe expediente; y la ausencia de competencia se conserva como sin dato.',
    outYear: 'Fechas fuera del año', missing: 'Competencia sin dato', synthetic: 'Expedientes sintéticos',
    rules: 'Reglas de patrones', rulesIntro: 'Las ocho reglas reducen un conjunto amplio a casos que merece la pena revisar. No prueban fraccionamiento, favoritismo ni ninguna otra irregularidad.',
    objective: 'Objetivo', calculation: 'Cálculo', thresholds: 'Muestra y umbrales', evidence: 'Evidencia', limitations: 'Limitaciones', version: 'Versión',
    limitationsTitle: 'Límites de interpretación', limitationsBody: 'El análisis no contiene el expediente completo, las ofertas, la motivación administrativa ni todo el contexto de mercado. La clasificación temática y la normalización pueden contener errores. Antes de extraer conclusiones debe consultarse la documentación oficial.',
    source: 'Abrir fuente municipal', coverage: 'Cobertura', refreshed: 'Última actualización', partial: 'El último ejercicio puede ser parcial; las comparaciones que lo incluyen se marcan y pierden prioridad y confianza.',
  },
  gl: {
    eyebrow: 'Metodoloxía', title: 'Como se constrúe a web e como interpretar os seus sinais', intro: 'Esta páxina documenta a orixe, o tratamento e os límites da análise. Permite reproducir os resultados e evita confundir un sinal automático cunha conclusión xurídica.',
    origin: 'Orixe e cobertura', originBody: 'Os datos proceden dos JSON anuais de contratos menores publicados polo Concello de Vigo. A unidade de análise principal é cada fila publicada, non necesariamente un expediente único.',
    architecture: 'Arquitectura', architectureBody: 'Un pipeline en Python descarga, conserva e normaliza os datos; calcula agregados, temas e sinais; e xera ficheiros JSON por ano e sección. Astro constrúe as páxinas estáticas e React carga unicamente os datos necesarios no navegador. GitHub Pages serve o resultado sen base de datos nin backend.',
    normalization: 'Normalización', normalizationBody: 'Consérvanse sempre os valores orixinais. En paralelo límpanse espazos, saltos de liña, puntuación e variantes societarias. Os alias seguros fusiónanse de forma determinista; as coincidencias difusas ambiguas pasan a un informe de revisión.',
    metrics: 'Métricas', metricsBody: 'As comparativas anuais utilizan o ano do conxunto de datos. As series mensuais utilizan unha data de adxudicación válida. Os licitadores nulos ou menores ou iguais a cero considéranse sen dato e quedan fóra dos denominadores de competencia.',
    legal: 'Limiares legais e referencia analítica', legalBody: 'O artigo 118 da Lei 9/2017 considera contratos menores os de valor estimado inferior a 40.000 € en obras e a 15.000 € en subministracións ou servizos. Tamén esixe xustificar que non se altera o obxecto para evitar eses límites.',
    legalCaution: 'A fonte municipal publica un campo importe, pero o conxunto de datos por si só non permite confirmar que equivalga exactamente ao valor estimado sen IVE definido pola lei. A web usa os límites como referencia analítica: non determina a legalidade dunha adxudicación.',
    law: 'Lei 9/2017 consolidada, artigo 118', instruction: 'Instrución OIReScon 1/2019 sobre contratos menores',
    near: 'O sinal “preto do limiar” cobre do 85% ao 100%: 12.750–15.000 € para servizos e subministracións, e 34.000–40.000 € para obras. Os valores límite exactos consérvanse nunha configuración versionada.',
    quality: 'Calidade do dato', qualityBody: 'As incidencias móstranse e non se corrixen silenciosamente. Unha data fóra do ano permanece asociada ao conxunto fonte; en 2019 xéranse claves sintéticas porque non existe expediente; e a ausencia de competencia consérvase como sen dato.',
    outYear: 'Datas fóra do ano', missing: 'Competencia sen dato', synthetic: 'Expedientes sintéticos',
    rules: 'Regras de patróns', rulesIntro: 'As oito regras reducen un conxunto amplo a casos que paga a pena revisar. Non proban fraccionamento, favoritismo nin ningunha outra irregularidade.',
    objective: 'Obxectivo', calculation: 'Cálculo', thresholds: 'Mostra e limiares', evidence: 'Evidencia', limitations: 'Limitacións', version: 'Versión',
    limitationsTitle: 'Límites de interpretación', limitationsBody: 'A análise non contén o expediente completo, as ofertas, a motivación administrativa nin todo o contexto de mercado. A clasificación temática e a normalización poden conter erros. Antes de tirar conclusións debe consultarse a documentación oficial.',
    source: 'Abrir fonte municipal', coverage: 'Cobertura', refreshed: 'Última actualización', partial: 'O último exercicio pode ser parcial; as comparacións que o inclúen márcanse e perden prioridade e confianza.',
  },
} as const;

export function MethodologyPage({ meta }: { meta: MetaData }) {
  const language = useLanguage(); const copy = COPY[language];
  const years = meta.available_years;
  return <>
    <header className="page-hero"><span className="kicker">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    <section className="method-overview section">
      {[['origin', 'originBody'], ['architecture', 'architectureBody'], ['normalization', 'normalizationBody'], ['metrics', 'metricsBody']].map(([title, body]) => <article className="panel" key={title}><h2>{copy[title as keyof typeof copy]}</h2><p>{copy[body as keyof typeof copy]}</p></article>)}
    </section>
    <section className="panel section method-legal"><span className="kicker">LCSP</span><h2>{copy.legal}</h2><p>{copy.legalBody}</p><p className="method-caution">{copy.legalCaution}</p><p>{copy.near}</p><div className="badge-row"><a className="pill-link pill-link--accent" href={LEGAL_LINK} target="_blank" rel="noreferrer">{copy.law} ↗</a><a className="pill-link" href={INSTRUCTION_LINK} target="_blank" rel="noreferrer">{copy.instruction} ↗</a></div></section>
    <section className="quality-panel panel section"><div><span className="kicker">{copy.quality}</span><h2>{copy.quality}</h2><p>{copy.qualityBody}</p><p>{copy.partial}</p></div><dl><div><dt>{copy.outYear}</dt><dd>{formatNumber(meta.quality.out_of_year_rows ?? 0)}</dd></div><div><dt>{copy.missing}</dt><dd>{formatNumber(meta.quality.missing_competition ?? 0)}</dd></div><div><dt>{copy.synthetic}</dt><dd>{formatNumber(meta.quality.synthetic_expediente ?? 0)}</dd></div></dl></section>
    <section className="section"><div className="section-heading"><div><span className="kicker">{RULES.length}</span><h2>{copy.rules}</h2><p>{copy.rulesIntro}</p></div></div><div className="method-rules">{RULES.map((rule, index) => <article className="panel method-rule" key={rule.id}><div className="method-rule__heading"><span>{String(index + 1).padStart(2, '0')}</span><h3>{rule.name[language]}</h3><small>{copy.version} {rule.version}</small></div><dl><div><dt>{copy.objective}</dt><dd>{rule.objective[language]}</dd></div><div><dt>{copy.calculation}</dt><dd>{rule.calculation[language]}</dd></div><div><dt>{copy.thresholds}</dt><dd>{rule.thresholds[language]}</dd></div><div><dt>{copy.evidence}</dt><dd>{rule.evidence[language]}</dd></div><div><dt>{copy.limitations}</dt><dd>{rule.limitations[language]}</dd></div></dl></article>)}</div></section>
    <section className="panel section method-limits"><h2>{copy.limitationsTitle}</h2><p>{copy.limitationsBody}</p><dl><div><dt>{copy.coverage}</dt><dd>{years.length ? `${years[0]}–${years.at(-1)}` : '—'}</dd></div><div><dt>{copy.refreshed}</dt><dd>{meta.last_refreshed ? new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(meta.last_refreshed)) : '—'}</dd></div></dl>{meta.source_url && <a className="pill-link pill-link--accent" href={meta.source_url} target="_blank" rel="noreferrer">{copy.source} ↗</a>}</section>
  </>;
}
