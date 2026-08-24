import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <article className="panel collapsible-section" style={{ padding: '1rem' }}>
      <button
        className="collapsible-section__header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        type="button"
      >
        <h3 className="card-title">{title}</h3>
        <svg
          className={`collapsible-section__icon ${isOpen ? 'is-open' : ''}`}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`collapsible-section__content ${isOpen ? 'is-open' : ''}`}>
        <div className="stack">{children}</div>
      </div>
    </article>
  );
}
