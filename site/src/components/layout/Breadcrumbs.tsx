import { withBase } from '@/lib/base';

interface Props {
  items: Array<{ label: string; href?: string }>;
}

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumbs" className="badge-row section">
      {items.map((item) =>
        item.href ? (
          <a className="pill-link" href={withBase(item.href)} key={item.href}>
            {item.label}
          </a>
        ) : (
          <span className="pill-link" key={item.label}>
            {item.label}
          </span>
        ),
      )}
    </nav>
  );
}
