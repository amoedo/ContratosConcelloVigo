import React, { useEffect, useMemo, useState } from 'react';

import { withBase } from '@/lib/base';

const NAV_ITEMS = [
  ['/', 'Inicio'],
  ['/adjudicatarios', 'Adjudicatarios'],
  ['/unidades', 'Unidades'],
  ['/competencia', 'Competencia'],
  ['/importes', 'Importes'],
  ['/patrones', 'Patrones'],
  ['/temas', 'Temas'],
  ['/evolucion', 'Evoluci\u00f3n'],
  ['/explorador', 'Explorador'],
  ['/metodologia', 'Metodolog\u00eda'],
] as const;

const SIGNALS = [
  {
    title: 'Qu\u00e9 mirar primero',
    copy: 'Volumen, importe, concentraci\u00f3n, competencia y patrones en un solo recorrido.',
  },
  {
    title: 'C\u00f3mo se usa',
    copy: 'Los filtros viajan en la URL para conectar gr\u00e1ficos, fichas y explorador.',
  },
  {
    title: 'C\u00f3mo se publica',
    copy: 'Todo se sirve como est\u00e1tico; el pipeline deja el trabajo pesado hecho antes del despliegue.',
  },
] as const;

export function HeaderNav() {
  const [pathname, setPathname] = useState(withBase('/'));
  const [search, setSearch] = useState('');

  useEffect(() => {
    const sync = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const links = useMemo(
    () => NAV_ITEMS.map(([href, label]) => {
      const fullHref = withBase(href);
      return { href: `${fullHref}${search}`, label, active: pathname === fullHref || pathname === `${fullHref}/` };
    }),
    [pathname, search],
  );

  return (
    <header className="masthead panel">
      <div className="masthead__grid">
        <div className="masthead__content">
          <div className="hero-eyebrow">{`Contratos menores / Concello de Vigo`}</div>
          <p className="masthead__eyeline">{`An\u00e1lisis c\u00edvico para ver qu\u00e9 se contrata, con qui\u00e9n y c\u00f3mo cambia con el tiempo.`}</p>
          <h1 className="hero-title">{'Radar p\u00fablico para leer qu\u00e9 se contrata, con qui\u00e9n y c\u00f3mo evoluciona.'}</h1>
          <p className="hero-copy">
            {'Navegaci\u00f3n editorial, m\u00e9tricas explicables y una capa de hallazgos prudentes para orientar la lectura sin perder el detalle de cada fila.'}
          </p>
          <div className="badge-row">
            <span className="badge">Dashboard instant\u00e1neo</span>
            <span className="badge">Series y rankings</span>
            <span className="badge">Explorador verificable</span>
          </div>
        </div>

        <aside className="masthead__aside">
          <div className="kicker">Mapa de lectura</div>
          <div className="signal-list">
            {SIGNALS.map((signal) => (
              <article className="signal-card" key={signal.title}>
                <strong>{signal.title}</strong>
                <p>{signal.copy}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <nav className="ribbon-nav" aria-label={'Navegaci\u00f3n principal'}>
        {links.map((link) => (
          <a key={link.href} href={link.href} className={link.active ? 'is-active' : undefined}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
