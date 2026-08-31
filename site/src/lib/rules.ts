import type { AlertItem } from '@/lib/types';
import type { Language } from '@/lib/i18n';

export interface RuleDefinition {
  id: string;
  version: string;
  name: Record<Language, string>;
  objective: Record<Language, string>;
  calculation: Record<Language, string>;
  thresholds: Record<Language, string>;
  evidence: Record<Language, string>;
  limitations: Record<Language, string>;
}

export const RULES: RuleDefinition[] = [
  {
    id: 'unit-concentration', version: '2.0',
    name: { es: 'Concentración de adjudicación por unidad', gl: 'Concentración da adxudicación por unidade' },
    objective: { es: 'Identificar unidades cuyo importe anual depende de pocos adjudicatarios.', gl: 'Identificar unidades cuxo importe anual depende de poucos adxudicatarios.' },
    calculation: { es: 'Calcula la cuota del primer adjudicatario y de los tres primeros dentro de cada unidad y año.', gl: 'Calcula a cota do primeiro adxudicatario e dos tres primeiros dentro de cada unidade e ano.' },
    thresholds: { es: 'Al menos 10 adjudicaciones y 10.000 €; primer proveedor ≥90% o tres primeros ≥60%.', gl: 'Polo menos 10 adxudicacións e 10.000 €; primeiro provedor ≥90% ou tres primeiros ≥60%.' },
    evidence: { es: 'Número de adjudicaciones y proveedores, importe total y cuotas top 1/top 3.', gl: 'Número de adxudicacións e provedores, importe total e cotas top 1/top 3.' },
    limitations: { es: 'La especialización de una unidad o un mercado con pocos proveedores puede explicar la concentración.', gl: 'A especialización dunha unidade ou un mercado con poucos provedores pode explicar a concentración.' },
  },
  {
    id: 'low-competition', version: '2.0',
    name: { es: 'Alta proporción de adjudicaciones con un licitador', gl: 'Alta proporción de adxudicacións cun licitador' },
    objective: { es: 'Señalar unidades con baja concurrencia registrada.', gl: 'Sinalar unidades con baixa concorrencia rexistrada.' },
    calculation: { es: 'Divide las adjudicaciones con un licitador entre las que tienen un dato válido de licitadores.', gl: 'Divide as adxudicacións cun licitador entre as que teñen un dato válido de licitadores.' },
    thresholds: { es: 'Al menos 5 registros conocidos y una proporción igual o superior al 75%.', gl: 'Polo menos 5 rexistros coñecidos e unha proporción igual ou superior ao 75%.' },
    evidence: { es: 'Denominador conocido y porcentaje con un licitador.', gl: 'Denominador coñecido e porcentaxe cun licitador.' },
    limitations: { es: 'Los contratos sin dato de licitadores no entran en el denominador.', gl: 'Os contratos sen dato de licitadores non entran no denominador.' },
  },
  {
    id: 'near-threshold-group', version: '2.0',
    name: { es: 'Acumulación de contratos cerca del umbral', gl: 'Acumulación de contratos preto do limiar' },
    objective: { es: 'Localizar unidades con varias adjudicaciones próximas al límite analítico aplicable.', gl: 'Localizar unidades con varias adxudicacións próximas ao límite analítico aplicable.' },
    calculation: { es: 'Marca importes situados entre el 85% y el 100% del umbral configurado según el tipo.', gl: 'Marca importes situados entre o 85% e o 100% do limiar configurado segundo o tipo.' },
    thresholds: { es: 'Al menos 3 registros; 15.000 € para servicios/suministros y 40.000 € para obras.', gl: 'Polo menos 3 rexistros; 15.000 € para servizos/subministracións e 40.000 € para obras.' },
    evidence: { es: 'Unidad, año, número de registros, tipo e importe de cada adjudicación.', gl: 'Unidade, ano, número de rexistros, tipo e importe de cada adxudicación.' },
    limitations: { es: 'El importe publicado puede no coincidir con el valor estimado sin IVA empleado por la ley.', gl: 'O importe publicado pode non coincidir co valor estimado sen IVE empregado pola lei.' },
  },
  {
    id: 'vendor-growth', version: '2.0',
    name: { es: 'Crecimiento interanual de un adjudicatario', gl: 'Crecemento interanual dun adxudicatario' },
    objective: { es: 'Detectar aumentos fuertes del importe recibido por un adjudicatario.', gl: 'Detectar aumentos fortes do importe recibido por un adxudicatario.' },
    calculation: { es: 'Compara exclusivamente dos años consecutivos.', gl: 'Compara exclusivamente dous anos consecutivos.' },
    thresholds: { es: 'Año previo ≥1.000 €, año actual ≥5.000 € y multiplicador ≥2,5.', gl: 'Ano previo ≥1.000 €, ano actual ≥5.000 € e multiplicador ≥2,5.' },
    evidence: { es: 'Importes de ambos ejercicios y multiplicador.', gl: 'Importes de ambos exercicios e multiplicador.' },
    limitations: { es: 'Si el ejercicio actual es parcial, la señal pierde prioridad y no representa una comparación homogénea.', gl: 'Se o exercicio actual é parcial, o sinal perde prioridade e non representa unha comparación homoxénea.' },
  },
  {
    id: 'topic-growth', version: '2.0',
    name: { es: 'Crecimiento interanual de una temática', gl: 'Crecemento interanual dunha temática' },
    objective: { es: 'Detectar cambios fuertes en el gasto asociado a una categoría temática.', gl: 'Detectar cambios fortes no gasto asociado a unha categoría temática.' },
    calculation: { es: 'Compara exclusivamente dos años consecutivos.', gl: 'Compara exclusivamente dous anos consecutivos.' },
    thresholds: { es: 'Año previo ≥1.000 €, año actual ≥5.000 € y multiplicador ≥2,4.', gl: 'Ano previo ≥1.000 €, ano actual ≥5.000 € e multiplicador ≥2,4.' },
    evidence: { es: 'Categoría, importes de ambos ejercicios y porcentaje de crecimiento.', gl: 'Categoría, importes de ambos exercicios e porcentaxe de crecemento.' },
    limitations: { es: 'La clasificación temática es automática y puede contener errores.', gl: 'A clasificación temática é automática e pode conter erros.' },
  },
  {
    id: 'fragmentation-pattern', version: '2.0',
    name: { es: 'Repetición de contratos en una ventana corta', gl: 'Repetición de contratos nunha xanela curta' },
    objective: { es: 'Localizar grupos que merecen revisar por cercanía temporal, unidad, proveedor y tema.', gl: 'Localizar grupos que merecen revisión pola proximidade temporal, unidade, provedor e tema.' },
    calculation: { es: 'Agrupa la misma unidad, adjudicatario y tema dentro de 60 días y suma sus importes.', gl: 'Agrupa a mesma unidade, adxudicatario e tema dentro de 60 días e suma os seus importes.' },
    thresholds: { es: 'Al menos 3 registros y suma igual o superior al menor umbral aplicable del grupo.', gl: 'Polo menos 3 rexistros e suma igual ou superior ao menor limiar aplicable do grupo.' },
    evidence: { es: 'Fechas, registros, unidad, adjudicatario, tema e importe agregado.', gl: 'Datas, rexistros, unidade, adxudicatario, tema e importe agregado.' },
    limitations: { es: 'La similitud temática no demuestra unidad funcional ni fraccionamiento contractual.', gl: 'A similitude temática non demostra unidade funcional nin fraccionamento contractual.' },
  },
  {
    id: 'threshold-splitting', version: '2.0',
    name: { es: 'Posible fraccionamiento junto al umbral', gl: 'Posible fraccionamento xunto ao limiar' },
    objective: { es: 'Identificar contratos del mismo adjudicatario y temática que superan el umbral tras una primera adjudicación cercana al límite.', gl: 'Identificar contratos do mesmo adxudicatario e temática que superan o limiar tras unha primeira adxudicación próxima ao límite.' },
    calculation: { es: 'Parte de una adjudicación entre el 85% y el 100% del umbral y suma las posteriores del mismo tipo, adjudicatario y tema durante 30 días.', gl: 'Parte dunha adxudicación entre o 85% e o 100% do limiar e suma as posteriores do mesmo tipo, adxudicatario e tema durante 30 días.' },
    thresholds: { es: '15.000 € para servicios/suministros y 40.000 € para obras, según la configuración aplicable.', gl: '15.000 € para servizos/subministracións e 40.000 € para obras, segundo a configuración aplicable.' },
    evidence: { es: 'Adjudicatario, tema, tipo, fechas, importe agregado y umbral aplicado.', gl: 'Adxudicatario, tema, tipo, datas, importe agregado e limiar aplicado.' },
    limitations: { es: 'La similitud temática y la proximidad temporal no prueban por sí solas que exista fraccionamiento.', gl: 'A similitude temática e a proximidade temporal non proban por si soas que exista fraccionamento.' },
  },
  {
    id: 'repeated-amounts', version: '2.0',
    name: { es: 'Repetición de importes similares', gl: 'Repetición de importes semellantes' },
    objective: { es: 'Destacar importes recurrentes entre la misma unidad y adjudicatario.', gl: 'Destacar importes recorrentes entre a mesma unidade e adxudicatario.' },
    calculation: { es: 'Agrupa importes redondeados al múltiplo de 50 € más próximo dentro del mismo año.', gl: 'Agrupa importes redondeados ao múltiplo de 50 € máis próximo dentro do mesmo ano.' },
    thresholds: { es: 'Al menos 3 registros y 5.000 € agregados.', gl: 'Polo menos 3 rexistros e 5.000 € agregados.' },
    evidence: { es: 'Año, unidad, adjudicatario, importe aproximado y registros.', gl: 'Ano, unidade, adxudicatario, importe aproximado e rexistros.' },
    limitations: { es: 'Tarifas o prestaciones recurrentes pueden producir importes similares legítimamente.', gl: 'Tarifas ou prestacións recorrentes poden producir importes semellantes lexitimamente.' },
  },
];

export const RULE_BY_ID = Object.fromEntries(RULES.map((rule) => [rule.id, rule])) as Record<string, RuleDefinition>;

export function ruleName(kind: string, language: Language) {
  return RULE_BY_ID[kind]?.name[language] ?? kind;
}

export function severityLabel(severity: string, language: Language) {
  const labels = language === 'gl' ? { alta: 'Alta', media: 'Media', baixa: 'Baixa' } : { alta: 'Alta', media: 'Media', baixa: 'Baja' };
  return labels[severity as keyof typeof labels] ?? severity;
}

export function localizedAlertSummary(alert: AlertItem, language: Language) {
  const count = alert.affected_count ?? alert.related_record_ids.length;
  const period = [alert.observed_from, alert.observed_to].filter(Boolean).join(' – ');
  return language === 'gl'
    ? `Sinal automática baseada en ${count} rexistros${period ? ` observados entre ${period}` : ''}. Revisa a evidencia e o contexto do expediente.`
    : `Señal automática basada en ${count} registros${period ? ` observados entre ${period}` : ''}. Revisa la evidencia y el contexto del expediente.`;
}
