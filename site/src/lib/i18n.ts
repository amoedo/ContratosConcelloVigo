import { useEffect, useState } from 'react';

export type Language = 'es' | 'gl';

export const UI = {
  es: {
    siteName: 'Contratos abiertos de Vigo',
    navHome: 'Inicio', navVendors: 'Adjudicatarios', navUnits: 'Unidades', navCompetition: 'Competencia',
    navAmounts: 'Importes', navPatterns: 'Patrones', navTopics: 'Temas', navTimeline: 'Evolución',
    navExplorer: 'Explorador', navMethod: 'Metodología', menu: 'Menú', search: 'Buscar contratos',
    updated: 'Actualizado', partial: 'Año en curso: datos parciales', source: 'Fuente oficial',
  },
  gl: {
    siteName: 'Contratos abertos de Vigo',
    navHome: 'Inicio', navVendors: 'Adxudicatarios', navUnits: 'Unidades', navCompetition: 'Competencia',
    navAmounts: 'Importes', navPatterns: 'Patróns', navTopics: 'Temas', navTimeline: 'Evolución',
    navExplorer: 'Explorador', navMethod: 'Metodoloxía', menu: 'Menú', search: 'Buscar contratos',
    updated: 'Actualizado', partial: 'Ano en curso: datos parciais', source: 'Fonte oficial',
  },
} as const;

export function languageFromSearch(search: string): Language {
  return new URLSearchParams(search).get('lang') === 'gl' ? 'gl' : 'es';
}

export function setLanguage(language: Language) {
  const url = new URL(window.location.href);
  if (language === 'gl') url.searchParams.set('lang', 'gl');
  else url.searchParams.delete('lang');
  localStorage.setItem('contratos-vigo-language', language);
  window.location.assign(`${url.pathname}${url.search}${url.hash}`);
}

export function useLanguage(): Language {
  const [language, setCurrentLanguage] = useState<Language>('es');
  useEffect(() => {
    const fromUrl = languageFromSearch(window.location.search);
    const stored = localStorage.getItem('contratos-vigo-language');
    const resolved = window.location.search.includes('lang=') ? fromUrl : stored === 'gl' ? 'gl' : 'es';
    setCurrentLanguage(resolved);
    document.documentElement.lang = resolved;
  }, []);
  return language;
}

export function withLanguage(href: string, language: Language) {
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  if (language === 'gl') params.set('lang', 'gl');
  else params.delete('lang');
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}`;
}
