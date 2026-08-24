import { withBase } from '@/lib/base';
import { useLanguage, withLanguage } from '@/lib/i18n';

interface Props {
  items: Array<{ label: string; labelGl?: string; href?: string }>;
}

export default function Breadcrumbs({ items }: Props) {
  const language = useLanguage();
  return (
    <nav aria-label="Breadcrumbs" className="badge-row section">
      {items.map((item) =>
        item.href ? (
          <a className="pill-link" href={withLanguage(withBase(item.href), language)} key={item.href}>
            {language === 'gl' ? item.labelGl ?? item.label : item.label}
          </a>
        ) : (
          <span className="pill-link" key={item.label}>
            {language === 'gl' ? item.labelGl ?? item.label : item.label}
          </span>
        ),
      )}
    </nav>
  );
}
