import { useEffect, useState } from 'react';

import { withBase, withDataPath } from '@/lib/base';
import { fetchJson } from '@/lib/http';
import { setLanguage, UI, useLanguage, withLanguage } from '@/lib/i18n';
import { EMPTY_META, type MetaData } from '@/lib/types';

const NAV = [
  ['/', 'navHome'], ['/adjudicatarios', 'navVendors'], ['/unidades', 'navUnits'],
  ['/competencia', 'navCompetition'], ['/importes', 'navAmounts'], ['/patrones', 'navPatterns'],
  ['/temas', 'navTopics'], ['/evolucion', 'navTimeline'], ['/explorador', 'navExplorer'],
  ['/metodologia', 'navMethod'],
] as const;

export function HeaderNav() {
  const language = useLanguage();
  const copy = UI[language];
  const [open, setOpen] = useState(false);
  const [pathname, setPathname] = useState(withBase('/'));
  const [meta, setMeta] = useState<MetaData>(EMPTY_META);

  useEffect(() => {
    setPathname(window.location.pathname.replace(/\/$/, '') || '/');
    fetchJson<MetaData>(withDataPath('/derived/meta.json'), EMPTY_META).then(setMeta);
  }, []);

  const latest = meta.available_years.at(-1);
  const refreshed = meta.last_refreshed ? new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(meta.last_refreshed)) : null;

  return (
    <header className="site-header panel">
      <a className="brand" href={withLanguage(withBase('/'), language)} aria-label={copy.siteName}>
        <span className="brand-mark" aria-hidden="true">V</span>
        <span><strong>{copy.siteName}</strong><small>Concello de Vigo · 2019–{latest ?? '…'}</small></span>
      </a>

      <div className="header-actions">
        <a className="header-search" href={withLanguage(withBase('/explorador'), language)}>{copy.search}</a>
        <div className="language-switch" aria-label="Idioma">
          <button className={language === 'es' ? 'is-active' : ''} onClick={() => setLanguage('es')} type="button">ES</button>
          <button className={language === 'gl' ? 'is-active' : ''} onClick={() => setLanguage('gl')} type="button">GL</button>
        </div>
        <button className="menu-button" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen((value) => !value)} type="button">
          {copy.menu}
        </button>
      </div>

      <nav id="main-navigation" className={`main-navigation ${open ? 'is-open' : ''}`} aria-label="Navegación principal">
        {NAV.map(([href, key]) => {
          const target = withBase(href).replace(/\/$/, '') || '/';
          const active = pathname === target;
          return <a className={active ? 'is-active' : ''} href={withLanguage(withBase(href), language)} key={href}>{copy[key]}</a>;
        })}
      </nav>

      <div className="dataset-strip">
        <span className={`status-dot ${meta.refresh_status === 'error' ? 'is-error' : ''}`} aria-hidden="true" />
        <span>{refreshed ? `${copy.updated}: ${refreshed}` : copy.updated}</span>
        {latest && meta.partial_years.includes(latest) && <strong>{copy.partial}</strong>}
        {meta.source_url && <a href={meta.source_url} rel="noreferrer" target="_blank">{copy.source} ↗</a>}
      </div>
    </header>
  );
}
