import React, { useEffect, useMemo, useState } from 'react';

import { withBase } from '@/lib/base';

// Navigation items with logical grouping for better clarity
const NAV_ITEMS = [
  ['/', 'Inicio'],
  ['/adjudicatarios', 'Adjudicatarios'],
  ['/unidades', 'Unidades'],
  ['/competencia', 'Competencia'],
  ['/importes', 'Importes'],
  ['/patrones', 'Patrones'],
  ['/temas', 'Temas'],
  ['/evolucion', 'Evolución'],
  ['/explorador', 'Explorador'],
  ['/metodologia', 'Metodología'],
] as const;

// Navigation groups for mobile organized menu
const NAV_GROUPS = [
  {
    label: 'Análisis',
    items: [
      ['/', 'Inicio'],
      ['/adjudicatarios', 'Adjudicatarios'],
      ['/unidades', 'Unidades'],
      ['/competencia', 'Competencia'],
      ['/importes', 'Importes'],
    ],
  },
  {
    label: 'Patrones',
    items: [
      ['/patrones', 'Patrones'],
      ['/temas', 'Temas'],
      ['/evolucion', 'Evolución'],
    ],
  },
  {
    label: 'Datos',
    items: [
      ['/explorador', 'Explorador'],
      ['/metodologia', 'Metodología'],
    ],
  },
];

const SIGNALS = [
  {
    title: 'Qué mirar primero',
    copy: 'Volumen, importe, concentración, competencia y patrones en un solo recorrido.',
  },
  {
    title: 'Cómo se usa',
    copy: 'Los filtros viajan en la URL para conectar gráficos, fichas y explorador.',
  },
  {
    title: 'Cómo se publica',
    copy: 'Todo se sirve como estático; el pipeline deja el trabajo pesado hecho antes del despliegue.',
  },
] as const;

export function HeaderNav() {
  const [pathname, setPathname] = useState(withBase('/'));
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // Improved active state detection that handles nested routes
  const isActive = (href: string) => {
    const fullHref = withBase(href);
    if (pathname === fullHref || pathname === `${fullHref}/`) {
      return true;
    }
    // For non-home routes, check if current path starts with the route
    if (href !== '/' && pathname.startsWith(fullHref)) {
      return true;
    }
    return false;
  };

  const links = useMemo(
    () =>
      NAV_ITEMS.map(([href, label]) => {
        const fullHref = withBase(href);
        return { href: `${fullHref}${search}`, label, active: isActive(href) };
      }),
    [pathname, search],
  );

  const navGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        label: group.label,
        items: group.items.map(([href, label]) => {
          const fullHref = withBase(href);
          return { href: `${fullHref}${search}`, label, active: isActive(href) };
        }),
      })),
    [pathname, search],
  );

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="masthead panel">
      {/* Navigation at the top - Mobile menu toggle button */}
      <button
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-label="Abrir menú de navegación"
        aria-expanded={mobileMenuOpen}
      >
        <span className="mobile-menu-toggle__icon">
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </span>
        <span className="mobile-menu-toggle__label">Menú</span>
      </button>

      {/* Desktop navigation - flat list at the top */}
      <nav className="ribbon-nav ribbon-nav--desktop" aria-label={'Navegación principal'}>
        {links.map((link) => (
          <a key={link.href} href={link.href} className={link.active ? 'is-active' : undefined}>
            {link.label}
          </a>
        ))}
      </nav>

      {/* Mobile navigation - grouped with sections */}
      <nav className={`ribbon-nav ribbon-nav--mobile ${mobileMenuOpen ? 'is-open' : ''}`} aria-label={'Navegación principal'}>
        {navGroups.map((group) => (
          <div key={group.label} className="nav-group">
            <div className="nav-group__label">{group.label}</div>
            <div className="nav-group__items">
              {group.items.map((link) => (
                <a key={link.href} href={link.href} className={link.active ? 'is-active' : undefined} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Hero content below navigation */}
      <div className="masthead__grid">
        <div className="masthead__content">
          <div className="hero-eyebrow">Contratos menores / Concello de Vigo</div>
          <p className="masthead__eyeline">Análisis cívico de contratos: qué se contrata, con quién y cómo evoluciona.</p>
          <h1 className="hero-title">Radar público de contratación del Concello de Vigo</h1>
          <p className="hero-copy">
            Navegación sencilla, métricas claras y hallazgos para orientar la lectura sin perder detalle.
          </p>
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
    </header>
  );
}
